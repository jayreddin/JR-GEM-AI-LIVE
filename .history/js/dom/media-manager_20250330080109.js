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
        this.currentFacingMode = 'user'; // 'user' or 'environment'

        // Button elements
        this.cameraBtn = document.getElementById('cameraBtn');
        this.screenBtn = document.getElementById('screenBtn');
        this.micBtn = document.getElementById('micBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.flipCameraBtn = document.querySelector('.flip-camera-btn'); // Get flip button

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.cameraBtn?.addEventListener('click', () => this.toggleCamera());
        this.screenBtn?.addEventListener('click', () => this.toggleScreen());
        this.micBtn?.addEventListener('click', () => this.toggleMic());
        this.speakBtn?.addEventListener('click', () => this.toggleSpeaker());
        this.flipCameraBtn?.addEventListener('click', () => this.flipCamera()); // Add listener for flip
    }

    async getCameraStream(facingMode = 'user') {
        // Stop existing stream first
        this.cameraStream?.getTracks().forEach(track => track.stop());

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.currentFacingMode = facingMode; // Update current mode
        return this.cameraStream;
    }

    async toggleCamera() {
        try {
            if (!this.isCameraActive) {
                const stream = await this.getCameraStream(this.currentFacingMode);
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
            PreviewManager.hidePreview('camera'); // Ensure preview is hidden on error
        }
    }

    async flipCamera() {
        if (!this.isCameraActive) {
            StatusManager.addStatus('Activate camera first to flip.', 3000);
            return;
        }
        try {
            const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            StatusManager.addStatus(`Flipping camera to ${newFacingMode}...`, 2000);
            const newStream = await this.getCameraStream(newFacingMode);
            
            // Update the track in the preview manager
            const newVideoTrack = newStream.getVideoTracks()[0];
            PreviewManager.updateTrack('camera', newVideoTrack);

            StatusManager.addStatus(`Camera flipped to ${newFacingMode}`, 3000);
        } catch (error) {
            console.error('Flip camera error:', error);
            StatusManager.addStatus(`Flip camera failed: ${error.message}`, 5000);
            // Optionally try to revert to the previous stream or stop the camera
            await this.toggleCamera(); // Attempt to stop camera on flip failure
        }
    }

    async toggleScreen() {
        try {
            if (!this.isScreenActive) {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
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
            PreviewManager.hidePreview('screen'); // Ensure preview hidden on error
        }
    }

    async toggleMic() {
        try {
            if (!this.isMicActive) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (!this.audioContext || this.audioContext.state === 'closed') {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    // Assuming visualizer canvas ID is 'visualizer' - adjust if needed
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
            this.visualizer?.disconnectSource('user'); // Ensure disconnected on error
        }
    }

    toggleSpeaker() {
        this.isSpeakerActive = !this.isSpeakerActive;
        this.speakBtn?.classList.toggle('active', this.isSpeakerActive);
        window.speechEnabled = this.isSpeakerActive; // Update global flag
        StatusManager.addStatus(
            this.isSpeakerActive ? 'Text-to-speech enabled' : 'Text-to-speech disabled',
            3000
        );
        // TODO: Connect/disconnect AI audio source to visualizer here
        // if (this.isSpeakerActive) { this.visualizer?.connectSource(aiAudioSourceNode, 'ai'); }
        // else { this.visualizer?.disconnectSource('ai'); }
    }

    cleanup() {
        [this.cameraStream, this.screenStream, this.micStream].forEach(stream => {
            stream?.getTracks().forEach(track => track.stop());
        });
        this.cameraStream = null;
        this.screenStream = null;
        this.micStream = null;

        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close().catch(console.error);
        }
        this.audioContext = null;
        this.visualizer?.cleanup();
        this.visualizer = null;

        this.isCameraActive = false;
        this.isScreenActive = false;
        this.isMicActive = false;
        this.isSpeakerActive = false;

        this.cameraBtn?.classList.remove('active');
        this.screenBtn?.classList.remove('active');
        this.micBtn?.classList.remove('active');
        this.speakBtn?.classList.remove('active');

        PreviewManager.hidePreview('camera');
        PreviewManager.hidePreview('screen');
    }
}

// Export singleton instance
export default new MediaManager();
