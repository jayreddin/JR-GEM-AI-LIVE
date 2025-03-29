/**
 * AudioRecorder manages capturing audio from the user's microphone using the Web Audio API.
 * It utilizes an AudioWorklet for efficient background processing (converting Float32 to Int16 PCM)
 * and provides the processed audio data via a callback.
 */
import { arrayBufferToBase64 } from '../utils/utils.js'; // Utility for base64 conversion

export class AudioRecorder extends EventTarget { // Inherit from EventTarget if needed, otherwise remove
    /**
     * Creates an AudioRecorder instance.
     */
    constructor() {
        // super(); // Call super() if inheriting from EventTarget

        // Audio Configuration
        this.targetSampleRate = 16000; // Standard sample rate for many STT services like Deepgram

        // Web Audio API Objects (initialized in start())
        this.stream = null;             // MediaStream from getUserMedia
        this.audioContext = null;       // AudioContext for processing
        this.source = null;             // MediaStreamAudioSourceNode (the mic input)
        this.processor = null;          // AudioWorkletNode instance

        // Callback and State
        this.onAudioData = null;        // Callback function to handle processed audio chunks
        this.isRecording = false;       // Flag: Is the recording process active?
        this.isSuspended = false;       // Flag: Is the mic input currently suspended?

        console.info("AudioRecorder instance created.");
    }

    /**
     * Initializes the audio capture pipeline: requests microphone access,
     * sets up the AudioContext and AudioWorklet, and starts processing.
     * @param {Function} onAudioDataCallback - Callback function that receives processed audio data chunks.
     * Currently receives base64 encoded Int16 PCM data.
     * TODO: Consider refactoring to provide ArrayBuffer directly for efficiency.
     * @throws {Error} If setup fails (e.g., no mic access, browser incompatibility).
     */
    async start(onAudioDataCallback) {
        if (this.isRecording) {
            console.warn("AudioRecorder.start called but already recording.");
            return;
        }
        if (typeof onAudioDataCallback !== 'function') {
            throw new Error("AudioRecorder.start requires a valid callback function.");
        }
        this.onAudioData = onAudioDataCallback;
        console.info("AudioRecorder: Starting initialization and recording...");

        // 1. Check for necessary browser APIs
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("AudioRecorder Error: getUserMedia API not supported in this browser.");
            throw new Error("Microphone access (getUserMedia) is not supported by your browser.");
        }
        if (!window.AudioContext || !window.AudioWorklet) {
            console.error("AudioRecorder Error: Web Audio API or AudioWorklet not supported.");
            throw new Error("Web Audio API (AudioContext/AudioWorklet) is not supported by your browser.");
        }


        try {
            // 2. Request Microphone Access
            console.debug("AudioRecorder: Requesting microphone access...");
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1, // Mono audio
                    sampleRate: this.targetSampleRate, // Request desired sample rate
                    // Optional constraints (support varies by browser)
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true // Often beneficial for STT
                }
            });
            console.debug("AudioRecorder: Microphone access granted.");

            // Get actual sample rate from the track (browser might not grant exact request)
            const audioTracks = this.stream.getAudioTracks();
            let actualSampleRate = this.targetSampleRate;
            if (audioTracks.length > 0 && audioTracks[0].getSettings) {
                actualSampleRate = audioTracks[0].getSettings().sampleRate || actualSampleRate;
                console.info(`AudioRecorder: Actual microphone sample rate: ${actualSampleRate} Hz`);
                // If STT *requires* 16kHz, resampling might be needed in worklet or elsewhere.
                // Current worklet assumes input matches its processing rate.
                // For simplicity, we'll use the actual rate for the context.
            }


            // 3. Initialize Audio Context
            // Create or reuse existing context if compatible? For now, create new one.
            if (this.audioContext && this.audioContext.state !== 'closed') {
                console.warn("AudioRecorder: Closing existing AudioContext before creating new one.");
                await this.audioContext.close();
            }
            // Use the actual sample rate obtained from the track if possible
            this.audioContext = new AudioContext({ sampleRate: actualSampleRate });
            if (this.audioContext.state === 'suspended') {
                console.warn("AudioRecorder: AudioContext is suspended, attempting resume...");
                await this.audioContext.resume();
            }
            if (this.audioContext.state !== 'running') {
                throw new Error(`AudioContext failed to start or resume. State: ${this.audioContext.state}`);
            }
            console.debug("AudioRecorder: AudioContext created and running.");


            // 4. Create Audio Source Node
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            console.debug("AudioRecorder: MediaStreamAudioSourceNode created.");


            // 5. Load and Initialize AudioWorklet Processor
            const workletPath = 'js/audio/worklets/audio-processor.js'; // Path relative to HTML
            try {
                console.debug(`AudioRecorder: Adding AudioWorklet module from ${workletPath}...`);
                await this.audioContext.audioWorklet.addModule(workletPath);
                console.debug("AudioRecorder: AudioWorklet module added.");
            } catch (moduleError) {
                console.error(`AudioRecorder: Failed to load AudioWorklet module from ${workletPath}:`, moduleError);
                throw new Error(`Failed to load audio processor module: ${moduleError.message}`);
            }

            // Create the AudioWorkletNode
            try {
                console.debug("AudioRecorder: Creating AudioWorkletNode 'audio-recorder-worklet'...");
                // Pass target sample rate needed for conversion (e.g., 16000) if worklet needs it
                // const workletOptions = { processorOptions: { targetSampleRate: this.targetSampleRate } };
                this.processor = new AudioWorkletNode(this.audioContext, 'audio-recorder-worklet' /*, workletOptions */);
                console.debug("AudioRecorder: AudioWorkletNode created.");
            } catch (nodeError) {
                console.error("AudioRecorder: Failed to create AudioWorkletNode:", nodeError);
                throw new Error(`Failed to create audio processor node: ${nodeError.message}`);
            }


            // 6. Setup Communication with Worklet (Listen for messages)
            this.processor.port.onmessage = (event) => {
                // Handle messages from the worklet
                if (event.data?.event === 'chunk' && event.data?.data?.int16arrayBuffer) {
                    // Received processed audio chunk (Int16 PCM as ArrayBuffer)
                    if (this.isRecording && this.onAudioData) {
                        // --- Refactoring Opportunity ---
                        // Currently converting to base64 for GeminiAgent.sendAudio.
                        // Could modify this to call onAudioData(event.data.data.int16arrayBuffer)
                        // and have GeminiAgent handle base64 conversion *only* when sending to Gemini,
                        // while sending the raw buffer to Deepgram directly.
                        try {
                            const base64Data = arrayBufferToBase64(event.data.data.int16arrayBuffer);
                            this.onAudioData(base64Data); // Pass base64 encoded data
                        } catch (base64Error) {
                            console.error("AudioRecorder: Error converting worklet buffer to base64:", base64Error);
                        }
                    }
                } else if (event.data?.event === 'error') {
                    // Handle errors reported by the worklet
                    console.error("AudioRecorder: Error message received from AudioWorklet:", event.data.error);
                    // Optionally stop recording or notify user
                    // this.stop();
                    this.dispatchEvent(new CustomEvent('error', { detail: event.data.error })); // If using EventTarget
                } else {
                    // Handle other potential message types from worklet
                    console.debug("AudioRecorder: Received message from worklet:", event.data);
                }
            };
            this.processor.port.onmessageerror = (error) => {
                // Handle cases where message couldn't be deserialized
                console.error("AudioRecorder: Error deserializing message from AudioWorklet:", error);
            };
            // Handle processor errors (e.g., uncaught exception in worklet's process method)
            this.processor.onprocessorerror = (event) => {
                console.error("AudioRecorder: AudioWorkletProcessor internal error:", event);
                // This is often critical, consider stopping recording
                this.stop();
                this.dispatchEvent(new CustomEvent('error', { detail: 'Critical worklet processor error' }));
            };
            console.debug("AudioRecorder: Worklet message listener configured.");


            // 7. Connect Audio Graph: source -> processor -> destination (optional: can skip destination if not needed)
            this.source.connect(this.processor);
            // Connecting to destination is useful for debugging (hearing the raw mic input)
            // but usually not desired in production if only sending data.
            // this.processor.connect(this.audioContext.destination);
            console.debug("AudioRecorder: Audio graph connected (source -> processor).");

            // 8. Update State
            this.isRecording = true;
            this.isSuspended = false; // Ensure not suspended initially
            console.info("AudioRecorder: Started recording successfully.");
            this.dispatchEvent(new CustomEvent('start')); // If using EventTarget

        } catch (error) {
            console.error("AudioRecorder: Failed to start recording:", error);
            // Attempt cleanup of partially initialized resources
            await this.stop(); // stop() should handle partial cleanup
            throw error; // Re-throw the error for the caller
        }
    }

    /**
     * Stops audio recording, releases microphone access, and cleans up Web Audio resources.
     */
    async stop() {
        // Avoid redundant stops
        if (!this.isRecording && !this.stream) {
            console.debug("AudioRecorder.stop called but not recording or stream already released.");
            return;
        }
        console.info("AudioRecorder: Stopping recording...");

        // 1. Stop MediaStream Tracks (releases microphone)
        if (this.stream) {
            try {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                    // console.debug(`AudioRecorder: Stopped track ${track.id} (${track.kind})`);
                });
            } catch (trackError) {
                console.error("AudioRecorder: Error stopping media stream tracks:", trackError);
            } finally {
                this.stream = null; // Release reference
            }
        }

        // 2. Disconnect Web Audio Nodes
        // It's good practice to disconnect nodes, though closing the context handles this implicitly.
        try {
            if (this.source) this.source.disconnect();
            if (this.processor) this.processor.disconnect();
            // console.debug("AudioRecorder: Disconnected audio nodes.");
        } catch (disconnectError) {
            console.warn("AudioRecorder: Error disconnecting audio nodes:", disconnectError);
        } finally {
            this.source = null;
            this.processor = null; // Release references
        }


        // 3. Close Audio Context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                await this.audioContext.close();
                console.debug("AudioRecorder: AudioContext closed.");
            } catch (contextError) {
                console.error("AudioRecorder: Error closing AudioContext:", contextError);
            } finally {
                this.audioContext = null; // Release reference
            }
        }

        // 4. Reset State Flags
        this.isRecording = false;
        this.isSuspended = false; // Can't be suspended if not recording
        this.onAudioData = null; // Clear callback reference

        console.info("AudioRecorder: Recording stopped and resources cleaned up.");
        this.dispatchEvent(new CustomEvent('stop')); // If using EventTarget
    }

    /**
     * Suspends audio processing without releasing the microphone.
     * Pauses sending data via the callback.
     */
    async suspendMic() {
        if (!this.isRecording) {
            console.warn("AudioRecorder: Cannot suspend, not recording.");
            return;
        }
        if (this.isSuspended) {
            // console.debug("AudioRecorder: Microphone already suspended.");
            return;
        }
        if (!this.audioContext || this.audioContext.state !== 'running') {
            console.error("AudioRecorder: Cannot suspend, AudioContext not running.");
            return; // Or throw?
        }

        try {
            await this.audioContext.suspend(); // Suspend the context clock
            // Optionally disable tracks as well (belt and suspenders)
            // this.stream?.getTracks().forEach(track => track.enabled = false);
            this.isSuspended = true;
            console.info('AudioRecorder: Microphone processing suspended.');
            this.dispatchEvent(new CustomEvent('suspend'));
        } catch (error) {
            console.error('AudioRecorder: Failed to suspend microphone processing:', error);
            // State might be inconsistent, maybe stop fully?
            // await this.stop();
            throw error;
        }
    }

    /**
     * Resumes audio processing if previously suspended.
     */
    async resumeMic() {
        if (!this.isRecording) {
            console.warn("AudioRecorder: Cannot resume, not recording.");
            return;
        }
        if (!this.isSuspended) {
            // console.debug("AudioRecorder: Microphone already resumed.");
            return;
        }
        if (!this.audioContext || this.audioContext.state === 'closed') {
            console.error("AudioRecorder: Cannot resume, AudioContext is closed.");
            return; // Or throw?
        }

        try {
            // Ensure tracks are enabled (if they were disabled during suspend)
            // this.stream?.getTracks().forEach(track => track.enabled = true);
            // Resume the context clock
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            // Check if resume was successful
            if (this.audioContext.state !== 'running') {
                throw new Error(`AudioContext failed to resume. State: ${this.audioContext.state}`);
            }
            this.isSuspended = false;
            console.info('AudioRecorder: Microphone processing resumed.');
            this.dispatchEvent(new CustomEvent('resume'));
        } catch (error) {
            console.error('AudioRecorder: Failed to resume microphone processing:', error);
            // State might be inconsistent, maybe stop fully?
            // await this.stop();
            throw error;
        }
    }

    /**
     * Toggles the microphone processing state between suspended and active (resumed).
     * Requires recording to be active.
     */
    async toggleMic() {
        if (!this.isRecording) {
            console.warn("AudioRecorder: Cannot toggle mic state, not recording.");
            // Maybe start recording if not already started? Depends on desired UX.
            // await this.start(this.onAudioData); // Be careful with callback reference
            return;
        }
        // Delegate to suspend or resume based on current state
        if (this.isSuspended) {
            await this.resumeMic();
        } else {
            await this.suspendMic();
        }
    }
}