/**
 * Manages media device interactions (camera, screen, mic)
 */
import PreviewManager from '../camera/preview-manager.js';
import { AudioVisualizer } from '../audio/visualizer.js';
import StatusManager from './status-manager.js';
import SpeechHandler from '../audio/speech-handler.js';
import { AudioRecorder } from '../audio/recorder.js';

export class MediaManager {
    constructor() {
        // Media streams
        this.cameraStream = null;
        this.screenStream = null;
        this.micStream = null;

        // Audio context and visualizer
        this.audioContext = null;
        this.visualizer = null;
        this.audioRecorder = null;

        // Media state
        this.isCameraActive = false;
        this.isScreenActive = false;
        this.isMicActive = false;
        this.isSpeakerActive = false;
        this.isAudioChatMode = false;
        this.currentFacingMode = 'user'; // 'user' or 'environment'

        // Button elements
        this.cameraBtn = document.getElementById('cameraBtn');
        this.screenBtn = document.getElementById('screenBtn');
        this.micBtn = document.getElementById('micBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.audioChatBtn = document.getElementById('audioChatBtn');
        this.flipCameraBtn = document.querySelector('.flip-camera-btn');

        this.setupEventListeners();
        
        // Load initial audio chat mode state from localStorage
        this.isAudioChatMode = localStorage.getItem('audioChatMode') === 'true';
        if (this.isAudioChatMode) {
            this.audioChatBtn?.classList.add('active');
        }
    }

    setupEventListeners() {
        this.cameraBtn?.addEventListener('click', () => this.toggleCamera());
        this.screenBtn?.addEventListener('click', () => this.toggleScreen());
        this.micBtn?.addEventListener('click', () => this.toggleMic());
        this.speakBtn?.addEventListener('click', () => this.toggleSpeaker());
        this.flipCameraBtn?.addEventListener('click', () => this.flipCamera());

        // Listen for transcription events
        document.addEventListener('transcription', (event) => {
            if (event.detail && event.detail.text) {
                // Dispatch transcribed text to the chat interface
                const transcriptionEvent = new CustomEvent('userSpeech', {
                    detail: { text: event.detail.text }
                });
                document.dispatchEvent(transcriptionEvent);
            }
        });
    }

    async getCameraStream(facingMode = 'user') {
        this.cameraStream?.getTracks().forEach(track => track.stop());

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.currentFacingMode = facingMode;
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
            PreviewManager.hidePreview('camera');
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
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            PreviewManager.updateTrack('camera', newVideoTrack);

            StatusManager.addStatus(`Camera flipped to ${newFacingMode}`, 3000);
        } catch (error) {
            console.error('Flip camera error:', error);
            StatusManager.addStatus(`Flip camera failed: ${error.message}`, 5000);
            await this.toggleCamera();
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
            PreviewManager.hidePreview('screen');
        }
    }

    async toggleMic() {
        try {
            if (!this.isMicActive) {
                // Initialize audio recorder if not exists
                if (!this.audioRecorder) {
                    this.audioRecorder = new AudioRecorder();
                }

                // Start recording with speech recognition enabled
                await this.audioRecorder.start(null, true);
                
                // Set up audio visualizer
                if (!this.audioContext || this.audioContext.state === 'closed') {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.visualizer = new AudioVisualizer(this.audioContext, 'visualizer');
                }

                this.micBtn?.classList.add('active');
                this.isMicActive = true;
                StatusManager.addStatus('Microphone activated', 3000);
            } else {
                await this.audioRecorder?.stop();
                this.visualizer?.disconnectSource('user');
                this.micBtn?.classList.remove('active');
                this.isMicActive = false;
                StatusManager.addStatus('Microphone deactivated', 3000);
            }
        } catch (error) {
            console.error('Microphone toggle error:', error);
            StatusManager.addStatus(`Microphone error: ${error.message}`, 5000);
            this.isMicActive = false;
            this.micBtn?.classList.remove('active');
            this.visualizer?.disconnectSource('user');
        }
    }

    async toggleSpeaker() {
        this.isSpeakerActive = !this.isSpeakerActive;
        this.speakBtn?.classList.toggle('active', this.isSpeakerActive);
        window.speechEnabled = this.isSpeakerActive;

        try {
            if (this.isSpeakerActive) {
                await SpeechHandler.initializeSynthesis();
                const voiceName = localStorage.getItem('voiceName');
                if (voiceName) {
                    SpeechHandler.setVoice(voiceName);
                }
                StatusManager.addStatus('Text-to-speech enabled', 3000);
            } else {
                SpeechHandler.stopSpeaking();
                StatusManager.addStatus('Text-to-speech disabled', 3000);
            }
        } catch (error) {
            console.error('Speaker toggle error:', error);
            StatusManager.addStatus(`Speaker error: ${error.message}`, 5000);
            this.isSpeakerActive = false;
            this.speakBtn?.classList.remove('active');
        }
    }

    cleanup() {
        [this.cameraStream, this.screenStream].forEach(stream => {
            stream?.getTracks().forEach(track => track.stop());
        });
        this.cameraStream = null;
        this.screenStream = null;

        if (this.audioRecorder) {
            this.audioRecorder.stop();
            this.audioRecorder = null;
        }

        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close().catch(console.error);
        }
        this.audioContext = null;
        this.visualizer?.cleanup();
        this.visualizer = null;

        SpeechHandler.stopSpeaking();
        
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
