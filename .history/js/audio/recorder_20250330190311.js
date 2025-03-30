import { arrayBufferToBase64 } from '../utils/utils.js';
import SpeechHandler from './speech-handler.js';

/**
 * AudioRecorder manages the capture and processing of audio input from the user's microphone.
 * It uses the Web Audio API and AudioWorklet to process audio in real-time with minimal latency.
 * The processed audio is converted to base64-encoded Int16 format suitable for transmission.
 * Also handles speech recognition integration through SpeechHandler.
 */
export class AudioRecorder extends EventTarget {
    /**
     * Creates an AudioRecorder instance
     */
    constructor() {
        super();
        // Core audio configuration
        this.sampleRate = 16000;         // Sample rate in Hz   
        this.stream = null;              // MediaStream from getUserMedia
        this.audioContext = null;        // AudioContext for Web Audio API
        this.source = null;              // MediaStreamAudioSourceNode
        this.processor = null;           // AudioWorkletNode for processing
        this.onAudioData = null;         // Callback for processed audio chunks
        this.isRecording = false;        // Recording state flag
        this.isSuspended = false;        // Mic suspension state
        this.enableTranscription = false; // Speech recognition flag
        this.silenceTimeout = null;      // Timeout for detecting silence
        this.lastAudioTime = 0;          // Last time audio was detected
        this.silenceThreshold = 3000;    // Time in ms to consider silence (3 seconds)
        this.autoEndSpeech = false;      // Whether to auto-end speech on silence
    }

    /**
     * Initializes and starts audio capture pipeline
     * Sets up audio context, worklet processor, and media stream
     * @param {Function} onAudioData - Callback receiving base64-encoded audio chunks
     * @param {boolean} enableTranscription - Whether to enable speech recognition
     * @param {boolean} autoEndSpeech - Whether to automatically end speech on silence
     */
    async start(onAudioData, enableTranscription = false, autoEndSpeech = false) {
        this.onAudioData = onAudioData;
        this.enableTranscription = enableTranscription;
        this.autoEndSpeech = autoEndSpeech;
        
        try {
            // Request microphone access with specific echo cancelation and noise reduction
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: this.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Initialize Web Audio API context and nodes
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Load and initialize audio processing worklet
            await this.audioContext.audioWorklet.addModule('js/audio/worklets/audio-processor.js');
            this.processor = new AudioWorkletNode(this.audioContext, 'audio-recorder-worklet');
            
            // Start speech recognition if enabled
            if (this.enableTranscription) {
                await SpeechHandler.startRecognition(this.sampleRate);
                SpeechHandler.addEventListener('transcription', (event) => {
                    this.dispatchEvent(new CustomEvent('transcription', {
                        detail: event.detail
                    }));

                    // If a final transcript is received and auto-end is enabled, stop recording
                    if (this.autoEndSpeech && event.detail.isFinal) {
                        this.resetSilenceDetection();
                    }
                });
            }

            // Handle processed audio chunks from worklet
            this.processor.port.onmessage = (event) => {
                if (!this.isRecording) return;
                
                if (event.data.event === 'chunk') {
                    const audioData = event.data.data.int16arrayBuffer;
                    
                    // Check if the audio chunk contains non-silence
                    const hasAudio = this.hasAudioSignal(new Int16Array(audioData));
                    if (hasAudio) {
                        this.lastAudioTime = Date.now();
                        
                        // Send to speech recognition if enabled
                        if (this.enableTranscription) {
                            SpeechHandler.processAudio(audioData);
                        }
                        
                        // Send to callback if provided
                        if (this.onAudioData) {
                            const base64Data = arrayBufferToBase64(audioData);
                            this.onAudioData(base64Data);
                        }
                    } else if (this.autoEndSpeech) {
                        // If no audio signal for a while, emit silence event
                        this.detectSilence();
                    }
                }
            };

            // Connect audio processing pipeline
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            this.isRecording = true;
            this.lastAudioTime = Date.now();
        } catch (error) {
            throw new Error('Failed to start audio recording:' + error);
        }
    }

    /**
     * Determines if an audio buffer contains a significant audio signal
     * @param {Int16Array} buffer - Audio buffer to analyze
     * @returns {boolean} - True if significant audio detected
     */
    hasAudioSignal(buffer) {
        // Simple energy-based algorithm to detect if there's meaningful audio
        const threshold = 500; // Adjust based on testing for sensitivity
        let sum = 0;
        
        // Take a sample of the buffer for efficiency
        const stride = Math.max(1, Math.floor(buffer.length / 100));
        let count = 0;
        
        for (let i = 0; i < buffer.length; i += stride) {
            sum += Math.abs(buffer[i]);
            count++;
        }
        
        const average = sum / count;
        return average > threshold;
    }

    /**
     * Detects silence based on time since last audio
     */
    detectSilence() {
        if (!this.isRecording || this.isSuspended || !this.autoEndSpeech) return;
        
        // Clear existing timeout
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
        }
        
        // Set new timeout to check for silence
        this.silenceTimeout = setTimeout(() => {
            const timeSinceLastAudio = Date.now() - this.lastAudioTime;
            if (timeSinceLastAudio > this.silenceThreshold) {
                // Emit a silence detected event
                this.dispatchEvent(new CustomEvent('silence_detected'));
                console.log('Silence detected, auto-stopping recording');
                // Could auto-stop here, but let the app decide what to do
            }
        }, this.silenceThreshold);
    }

    /**
     * Resets the silence detection timeout
     */
    resetSilenceDetection() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
        this.lastAudioTime = Date.now();
    }

    /**
     * Gracefully stops audio recording and cleans up resources
     * Stops media tracks and logs the operation completion
     */
    async stop() {
        try {
            if (!this.isRecording) {
                return;
            }

            this.resetSilenceDetection();

            // Stop all active media tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            this.isRecording = false;
            console.info('Audio recording stopped');

            // Stop speech recognition if enabled
            if (this.enableTranscription) {
                await SpeechHandler.stopRecognition();
            }

            if (this.audioContext) {
                this.audioContext.close();
            }
        } catch (error) {
            throw new Error('Failed to stop audio recording:' + error);
        }
    }

    /**
     * Suspends microphone input without destroying the audio context
     */
    async suspendMic() {
        if (!this.isRecording || this.isSuspended) return;
        
        try {
            await this.audioContext.suspend();
            this.stream.getTracks().forEach(track => track.enabled = false);
            this.isSuspended = true;
            
            // Pause speech recognition if enabled
            if (this.enableTranscription) {
                await SpeechHandler.stopRecognition();
            }
            
            console.info('Microphone suspended');
        } catch (error) {
            throw new Error('Failed to suspend microphone:' + error);
        }
    }

    /**
     * Resumes microphone input if previously suspended
     */
    async resumeMic() {
        if (!this.isRecording || !this.isSuspended) return;
        
        try {
            await this.audioContext.resume();
            this.stream.getTracks().forEach(track => track.enabled = true);
            this.isSuspended = false;
            
            // Resume speech recognition if enabled
            if (this.enableTranscription) {
                await SpeechHandler.startRecognition(this.sampleRate);
            }
            
            console.info('Microphone resumed');
        } catch (error) {
            throw new Error('Failed to resume microphone:' + error);
        }
    }

    /**
     * Toggles microphone state between suspended and active
     */
    async toggleMic() {
        if (this.isSuspended) {
            await this.resumeMic();
        } else {
            await this.suspendMic();
        }
    }
}
