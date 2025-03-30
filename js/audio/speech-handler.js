/**
 * Manages speech recognition and synthesis functionality
 * Integrates Deepgram for real-time transcription and Web Speech API for text-to-speech
 */
import { DeepgramTranscriber } from '../transcribe/deepgram.js';
import StatusManager from '../dom/status-manager.js';

export class SpeechHandler extends EventTarget {
    constructor() {
        super();
        this.transcriber = null;
        this.isTranscribing = false;
        this.synthesis = window.speechSynthesis;
        this.selectedVoice = null;
        this.isSpeaking = false;
        this.audioContext = null;
        this.apiKey = localStorage.getItem('deepgramApiKey');
        
        // Initialize speech synthesis
        this.initializeSynthesis();
    }

    /**
     * Initializes the speech synthesis and loads available voices
     */
    async initializeSynthesis() {
        // Wait for voices to be loaded
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.updateVoices();
            };
        }
        this.updateVoices();
    }

    /**
     * Updates the list of available voices and selects the preferred voice
     */
    updateVoices() {
        const voices = this.synthesis.getVoices();
        const preferredVoice = localStorage.getItem('voiceName') || 'Google US English';
        this.selectedVoice = voices.find(voice => voice.name === preferredVoice) || voices[0];
    }

    /**
     * Starts the speech recognition process
     * @param {AudioBuffer} audioData - Audio data to process
     */
    async startRecognition(sampleRate = 16000) {
        if (!this.apiKey) {
            StatusManager.addStatus('Deepgram API key not set. Please configure in settings.', 5000);
            return;
        }

        try {
            this.transcriber = new DeepgramTranscriber(this.apiKey, sampleRate);
            
            this.transcriber.on('transcription', ({ transcript, confidence, isFinal }) => {
                if (isFinal) {
                    this.dispatchEvent(new CustomEvent('transcription', {
                        detail: { text: transcript, confidence }
                    }));
                }
            });

            this.transcriber.on('error', (error) => {
                console.error('Transcription error:', error);
                StatusManager.addStatus(`Transcription error: ${error.message}`, 5000);
            });

            await this.transcriber.connect();
            this.isTranscribing = true;
            StatusManager.addStatus('Speech recognition active', 3000);

        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            StatusManager.addStatus('Failed to start speech recognition', 5000);
            this.isTranscribing = false;
        }
    }

    /**
     * Stops the speech recognition process
     */
    async stopRecognition() {
        if (this.transcriber) {
            await this.transcriber.disconnect();
            this.transcriber = null;
            this.isTranscribing = false;
            StatusManager.addStatus('Speech recognition stopped', 3000);
        }
    }

    /**
     * Processes audio data for speech recognition
     * @param {ArrayBuffer} audioData - Raw audio data to process
     */
    processAudio(audioData) {
        if (this.isTranscribing && this.transcriber) {
            try {
                this.transcriber.sendAudio(audioData);
            } catch (error) {
                console.error('Error processing audio:', error);
                StatusManager.addStatus('Error processing audio', 5000);
            }
        }
    }

    /**
     * Speaks the provided text using text-to-speech
     * @param {string} text - Text to speak
     * @returns {Promise} Resolves when speech is complete
     */
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.selectedVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                this.isSpeaking = true;
                this.dispatchEvent(new Event('speechstart'));
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this.dispatchEvent(new Event('speechend'));
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                this.dispatchEvent(new Event('speechend'));
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            this.synthesis.speak(utterance);
        });
    }

    /**
     * Stops any ongoing text-to-speech
     */
    stopSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.dispatchEvent(new Event('speechend'));
        }
    }

    /**
     * Updates the speech synthesis voice
     * @param {string} voiceName - Name of the voice to use
     */
    setVoice(voiceName) {
        const voices = this.synthesis.getVoices();
        const newVoice = voices.find(voice => voice.name === voiceName);
        if (newVoice) {
            this.selectedVoice = newVoice;
            localStorage.setItem('voiceName', voiceName);
        }
    }

    /**
     * Checks if speech synthesis is currently active
     * @returns {boolean} True if speaking, false otherwise
     */
    isCurrentlySpeaking() {
        return this.isSpeaking;
    }

    /**
     * Checks if speech recognition is currently active
     * @returns {boolean} True if transcribing, false otherwise
     */
    isCurrentlyTranscribing() {
        return this.isTranscribing;
    }
}

// Export singleton instance
export default new SpeechHandler();
