/**
 * AudioProcessingWorklet is an AudioWorkletProcessor designed to run in a separate thread
 * for efficient audio processing. It receives Float32 audio samples from the microphone input,
 * converts them into Int16 PCM format, buffers them, and sends the Int16 chunks
 * back to the main thread via message passing.
 *
 * This processor assumes mono audio input.
 */
class AudioProcessingWorklet extends AudioWorkletProcessor {
    /**
     * Initializes the worklet processor.
     * Sets up a buffer to hold Int16 samples before sending them to the main thread.
     * The buffer size balances latency (smaller buffer = lower latency) against
     * message passing overhead (larger buffer = fewer messages).
     */
    constructor() {
        super(); // Call the parent constructor

        // Buffer to store Int16 samples. Size 2048 is a common choice,
        // representing 128ms of audio at 16kHz sample rate.
        this.bufferSize = 2048;
        this.buffer = new Int16Array(this.bufferSize);
        // Index to track the next position to write into the buffer.
        this.bufferWriteIndex = 0;

        // Note: The 'sampleRate' variable from the global scope (AudioWorkletGlobalScope)
        // reflects the sample rate of the AudioContext where this worklet node lives.
        // It's useful for debugging or sample rate dependent logic if needed.
        // console.log(`AudioProcessingWorklet created. Context Sample Rate: ${sampleRate} Hz. Buffer size: ${this.bufferSize}`);

        // Handle termination signal from main thread (optional)
        this.port.onmessage = (event) => {
            if (event.data === 'close') {
                // console.log("AudioProcessingWorklet: Received close signal.");
                // Perform any final cleanup if needed before the worklet terminates.
                // No explicit close needed here, process() returning false would stop it,
                // but we keep it alive via 'return true'. Termination happens when the node is stopped/disconnected.
            }
        };
    }

    /**
     * Required method called by the audio rendering engine.
     * Processes incoming audio blocks (Float32 samples).
     * @param {Array<Array<Float32Array>>} inputs - An array of inputs, each input is an array of channels, each channel is a Float32Array of samples.
     * @param {Array<Array<Float32Array>>} _outputs - An array of outputs (unused parameter, prefixed with _).
     * @param {Record<string, Float32Array>} _parameters - AudioParam data (unused parameter, prefixed with _).
     * @returns {boolean} - Return true to keep the processor alive, false to terminate it.
     */
    process(inputs, _outputs, _parameters) { // Prefixed unused parameters
        // We typically expect one input, with one channel (mono).
        // Validate the input structure defensively.
        if (!inputs || inputs.length === 0 || !inputs[0] || inputs[0].length === 0 || !inputs[0][0]) {
            // No input data provided for this block, nothing to process.
            return true; // Keep processor alive
        }

        // Get the Float32Array for the first channel of the first input.
        const channelData = inputs[0][0];

        // Process the chunk of Float32 samples.
        try {
            this._processChunk(channelData);
        } catch (error) {
            // Log the error within the worklet context
            console.error("AudioProcessingWorklet Error in process:", error);
            // Attempt to notify the main thread about the error
            try {
                this.port.postMessage({
                    event: 'error',
                    error: {
                        message: `Worklet processing error: ${error.message}`,
                        stack: error.stack // Include stack trace if available
                    }
                });
            } catch (postError) {
                console.error("AudioProcessingWorklet: Failed to post error message back to main thread:", postError);
            }
            // Should we terminate on error? Returning true keeps it alive,
            // allowing potential recovery or further error reporting.
            // return false; // Uncomment to terminate worklet on error
        }

        // Always return true to keep the processor node alive and processing subsequent blocks.
        return true;
    }

    /**
     * Sends the current Int16 buffer content to the main thread and resets the buffer index.
     * Uses postMessage with transferable objects (ArrayBuffer) for efficiency (zero-copy).
     */
    _sendBuffer() {
        if (this.bufferWriteIndex === 0) {
            return; // Nothing to send
        }

        // Create a copy or slice of the buffer containing only the valid data.
        // Send the underlying ArrayBuffer as a transferable object.
        const bufferToSend = this.buffer.slice(0, this.bufferWriteIndex);
        try {
            this.port.postMessage(
                {
                    event: 'chunk',
                    // Pass the Int16 ArrayBuffer
                    data: { int16arrayBuffer: bufferToSend.buffer }
                },
                [bufferToSend.buffer] // Mark the ArrayBuffer as transferable
            );
        } catch (postError) {
            console.error("AudioProcessingWorklet: Failed to post buffer chunk to main thread:", postError);
            // Handle error - e.g., buffer might be lost.
            // If errors persist, the main thread might need to stop/restart the recorder.
        }

        // Reset the buffer index for the next chunk.
        this.bufferWriteIndex = 0;
    }

    /**
     * Converts a chunk of Float32 samples to Int16, accumulates them in the buffer,
     * and sends the buffer when full.
     * @param {Float32Array} float32Array - Input audio samples in Float32 format (range -1.0 to 1.0).
     */
    _processChunk(float32Array) {
        // Iterate through the incoming Float32 samples.
        for (let i = 0; i < float32Array.length; i++) {
            // Convert Float32 sample to Int16 range [-32768, 32767].
            // Multiply by 32768 (max Int16 value + 1), then floor/clamp.
            const floatSample = float32Array[i];
            const int16Value = Math.max(-32768, Math.min(32767, Math.floor(floatSample * 32768)));

            // Store the Int16 value in the buffer.
            this.buffer[this.bufferWriteIndex] = int16Value;
            this.bufferWriteIndex++;

            // If the buffer is full, send it to the main thread.
            if (this.bufferWriteIndex >= this.bufferSize) {
                this._sendBuffer();
            }
        }
        // Note: Any remaining samples (if float32Array.length doesn't perfectly fill the buffer)
        // will stay in the buffer until the next call to process() fills it up,
        // or until the worklet node is stopped/disconnected. The main thread logic
        // might need to request any final partial buffer upon stopping if required.
    }
}

// Register the processor with the name 'audio-recorder-worklet'.
// This name must match the name used when creating the AudioWorkletNode in the main thread.
try {
    registerProcessor('audio-recorder-worklet', AudioProcessingWorklet);
} catch (registerError) {
    console.error("Failed to register AudioWorklet processor 'audio-recorder-worklet':", registerError);
    // This error often indicates the script is not being loaded correctly as a worklet.
}