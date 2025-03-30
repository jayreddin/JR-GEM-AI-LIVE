/**
 * Manages media device interactions (camera, screen, mic)
 */
import PreviewManager from '../camera/preview-manager.js';
import { AudioVisualizer } from '../audio/visualizer.js';
import StatusManager from './status-manager.js';

export class MediaManager {
    constructor() {
        // Media streams
        this.cameraStream = null;
        this.screenStream = null;
        this.micStream = null;

        // Audio context and visualizer
        this.audioContext = null;
        this.visualizer = null;

        // Media state
        this.isCameraActive = false;
        this.isScreenActive = false;
        this.isMicActive = false;
        this.isSpeakerActive = false;

        // Button elements
        this.cameraBtn = document.getElementById('cameraBtn');
        this.screenBtn = document.getElementById('screenBtn');
        this.micBtn = document.getElementById('micBtn');
        this.speakBtn = document.getElementById('speakBtn');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Camera toggle
        this.cameraBtn?.addEventListener('click', () => this.toggleCamera());
        
        // Screen share toggle
        this.screenBtn?.addEventListener('click', () => this.toggleScreen());
        
        // Microphone toggle
        this.micBtn?.addEventListener('click', () => this.toggleMic());
        
        // Speaker toggle
        this.speakBtn?.addEventListener('click', () => this.toggleSpeaker());
    }

    async toggleCamera() {
        try {
            if (!this.isCameraActive) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                this.cameraStream = stream;
                PreviewManager.showPreview('camera', stream);
                this.cameraBtn?.classList.add('active');
                this.isCameraActive = true;
                StatusManager.addStatus('Camera activated', 3000);
            } else {
                this.cameraStream?.getTracks().forEach(track => track.stop());
                PreviewManager.hidePreview('camera');
                this.cameraBtn?.classList.remove('active');
                this.isCameraActive = false;
                this.cameraStream = null;
                StatusManager.addStatus('Camera deactivated', 3000);
            }
        } catch (error) {
            console.error('Camera toggle error:', error);
            StatusManager.addStatus(`Camera error: ${error.message}`, 5000);
            this.isCameraActive = false;
            this.cameraBtn?.classList.remove('active');
        }
    }

    async toggleScreen() {
        try {
            if (!this.isScreenActive) {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });
                
                // Handle stream ending (user stops sharing)
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    this.screenBtn?.classList.remove('active');
                    PreviewManager.hidePreview('screen');
                    this.isScreenActive = false;
                    this.screenStream = null;
                    StatusManager.addStatus('Screen sharing ended', 3000);
                });

                this.screenStream = stream;
                PreviewManager.showPreview('screen', stream);
                this.screenBtn?.classList.add('active');
                this.isScreenActive = true;
                StatusManager.addStatus('Screen sharing started', 3000);
            } else {
                this.screenStream?.getTracks().forEach(track => track.stop());
                PreviewManager.hidePreview('screen');
                this.screenBtn?.classList.remove('active');
                this.isScreenActive = false;
                this.screenStream = null;
                StatusManager.addStatus('Screen sharing stopped', 3000);
            }
        } catch (error) {
            console.error('Screen share error:', error);
            StatusManager.addStatus(`Screen share error: ${error.message}`, 5000);
            this.isScreenActive = false;
            this.screenBtn?.classList.remove('active');
        }
    }

    async toggleMic() {
        try {
            if (!this.isMicActive) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Initialize audio context if needed
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.visualizer = new AudioVisualizer(this.audioContext, 'visualizer');
                }

                this.micStream = stream;
                const source = this.audioContext.createMediaStreamSource(stream);
                this.visualizer?.connectSource(source, 'user');
                
                this.micBtn?.classList.add('active');
                this.isMicActive = true;
                StatusManager.addStatus('Microphone activated', 3000);
            } else {
                this.micStream?.getTracks().forEach(track => track.stop());
                this.visualizer?.disconnectSource('user');
                this.micBtn?.classList.remove('active');
                this.isMicActive = false;
                this.micStream = null;
                StatusManager.addStatus('Microphone deactivated', 3000);
            }
        } catch (error) {
            console.error('Microphone toggle error:', error);
            StatusManager.addStatus(`Microphone error: ${error.message}`, 5000);
            this.isMicActive = false;
            this.micBtn?.classList.remove('active');
        }
    }

    toggleSpeaker() {
        this.isSpeakerActive = !this.isSpeakerActive;
        this.speakBtn?.classList.toggle('active', this.isSpeakerActive);
        
        // Update global speech flag used by ChatManager
        window.speechEnabled = this.isSpeakerActive;
        
        StatusManager.addStatus(
            this.isSpeakerActive ? 'Text-to-speech enabled' : 'Text-to-speech disabled',
            3000
        );
    }

    cleanup() {
        // Stop all media streams
        [this.cameraStream, this.screenStream, this.micStream].forEach(stream => {
            stream?.getTracks().forEach(track => track.stop());
        });

        // Clear streams
        this.cameraStream = null;
        this.screenStream = null;
        this.micStream = null;

        // Clean up audio context
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close();
        }
        this.audioContext = null;

        // Clean up visualizer
        this.visualizer?.cleanup();
        this.visualizer = null;

        // Reset state
        this.isCameraActive = false;
        this.isScreenActive = false;
        this.isMicActive = false;
        this.isSpeakerActive = false;

        // Update UI
        this.cameraBtn?.classList.remove('active');
        this.screenBtn?.classList.remove('active');
        this.micBtn?.classList.remove('active');
        this.speakBtn?.classList.remove('active');

        // Hide previews
        PreviewManager.hidePreview('camera');
        PreviewManager.hidePreview('screen');
    }
}

// Export singleton instance
export default new MediaManager();
