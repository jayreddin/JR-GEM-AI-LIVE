/**
 * AudioStreamer manages real-time audio playback from a stream of PCM audio chunks.
 * It uses Web Audio API for precise scheduling and buffering to handle network jitter
 * while aiming for low latency playback.
 */
import { MODEL_SAMPLE_RATE } from '../config/config.js'; // Assuming config provides the expected sample rate

export class AudioStreamer {
    /**
     * Creates an AudioStreamer instance.
     * @param {AudioContext} context - The Web Audio API context to use for playback. Must be running.
     */
    constructor(context) {
        if (!context || !(context instanceof AudioContext)) {
            throw new Error('AudioStreamer: Invalid or missing AudioContext provided.');
        }
        // Ensure context is running (or capable of running)
        if (context.state === 'closed') {
            throw new Error('AudioStreamer: Cannot use a closed AudioContext.');
        }
        this.context = context;

        // Audio data queue and state
        this.audioQueue = [];             // Holds Float32Array chunks ready for playback
        this.processingBuffer = new Float32Array(0); // Accumulates partial chunks
        this.isPlaying = false;           // Is audio currently being scheduled/played?
        this.isInitialized = false;       // Has initialize() been successfully called?
        this.isStreamComplete = false;    // Flagged when stop() is called, indicating no more data will arrive

        // Configuration
        this._sampleRate = MODEL_SAMPLE_RATE; // Default from config, can be overridden
        // Buffer size determines chunk length for scheduling (e.g., 320ms)
        this.bufferSize = Math.floor(this._sampleRate * 0.32);
        this.initialBufferTime = 0.05;    // Delay before starting playback (50ms) to buffer initial data
        this.SCHEDULE_AHEAD_TIME = 0.2;   // How far ahead to schedule audio (200ms)

        // Timing and scheduling
        this.scheduledTime = 0;           // Time when the next buffer should ideally start playing
        this.scheduledSources = new Set(); // Tracks active AudioBufferSourceNodes

        // Web Audio Nodes
        this.gainNode = null;             // Gain node for volume control (created in initialize)

        // Internal check interval (used during buffer underruns)
        this.checkInterval = null;

        // Bind methods to ensure correct 'this' context
        this.streamAudio = this.streamAudio.bind(this);
        this.scheduleNextBuffer = this.scheduleNextBuffer.bind(this);
        this.initialize = this.initialize.bind(this);
        this.stop = this.stop.bind(this);

        console.info(`AudioStreamer created. Target Sample Rate: ${this._sampleRate}, Buffer Size: ${this.bufferSize}`);
    }

    /** Gets the current sample rate. */
    get sampleRate() {
        return this._sampleRate;
    }

    /**
     * Sets the sample rate. Adjusts buffer size accordingly.
     * Should ideally be called before initialize() or after stop().
     * @param {number} value - The new sample rate in Hz.
     */
    set sampleRate(value) {
        if (!Number.isFinite(value) || value <= 0 || value > 192000) { // Added stricter validation
            console.warn(`AudioStreamer: Attempt to set invalid sample rate: ${value}. Must be a positive number (e.g., 8000-192000). Keeping current rate: ${this._sampleRate}`);
            return;
        }
        if (value !== this._sampleRate) {
            this._sampleRate = value;
            // Recalculate buffer size based on new sample rate
            this.bufferSize = Math.floor(this._sampleRate * 0.32); // 320ms buffer
            console.info(`AudioStreamer: Sample rate updated to ${value} Hz. New buffer size: ${this.bufferSize}`);
        }
    }

    /**
     * Initializes the streamer. Creates gain node and ensures audio context is running.
     * Must be called before streaming audio.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async initialize() {
        if (this.isInitialized) {
            // console.debug("AudioStreamer already initialized.");
            return;
        }
        console.info("AudioStreamer initializing...");

        // Ensure context is valid and running
        if (!this.context || this.context.state === 'closed') {
            throw new Error("AudioStreamer initialization failed: AudioContext is closed or invalid.");
        }
        if (this.context.state === 'suspended') {
            console.warn("AudioStreamer: AudioContext was suspended, attempting to resume...");
            try {
                await this.context.resume();
                if (this.context.state !== 'running') {
                    throw new Error(`AudioContext failed to resume. State: ${this.context.state}`);
                }
                console.info("AudioStreamer: AudioContext resumed successfully.");
            } catch (error) {
                console.error("AudioStreamer: Error resuming AudioContext:", error);
                throw new Error(`AudioContext resume failed: ${error.message}`);
            }
        }

        try {
            // Create GainNode for volume control
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination); // Connect output
            this.gainNode.gain.setValueAtTime(1, this.context.currentTime); // Set initial volume to 1 (max)
            console.debug("AudioStreamer: GainNode created and connected.");

            // Reset state flags relevant to playback
            this.isStreamComplete = false;
            this.isPlaying = false;
            this.audioQueue = [];
            this.processingBuffer = new Float32Array(0);
            this.scheduledTime = 0; // Reset schedule time
            this.scheduledSources.clear(); // Clear any lingering sources

            this.isInitialized = true;
            console.info("AudioStreamer initialized successfully.");

        } catch (error) {
            console.error("AudioStreamer initialization error:", error);
            // Clean up partially created nodes if necessary
            if (this.gainNode) {
                try { this.gainNode.disconnect(); } catch (e) { /* ignore */ }
                this.gainNode = null;
            }
            this.isInitialized = false;
            throw error; // Re-throw initialization error
        }
    }


    /**
     * Processes an incoming chunk of audio data (PCM16 as Int16Array or Uint8Array).
     * Converts data to Float32, buffers it, and triggers scheduling.
     * @param {Int16Array|Uint8Array} chunk - Raw PCM16 audio data buffer.
     */
    streamAudio(chunk) {
        if (!this.isInitialized) {
            console.warn('AudioStreamer.streamAudio called before initialize(). Ignoring chunk.');
            return;
        }
        if (this.isStreamComplete) {
            console.warn('AudioStreamer.streamAudio called after stop(). Ignoring chunk.');
            return;
        }
        // Validate chunk type (more specific than original)
        if (!chunk || !(chunk.buffer instanceof ArrayBuffer) || !(chunk.BYTES_PER_ELEMENT === 1 || chunk.BYTES_PER_ELEMENT === 2)) {
            console.warn('AudioStreamer: Invalid audio chunk provided. Expected Int16Array or Uint8Array.', { chunkType: chunk?.constructor?.name });
            return;
        }
        // Ensure context is still running
        if (this.context.state !== 'running') {
            console.error("AudioStreamer: Cannot process audio chunk, AudioContext is not running.");
            this.stop(); // Stop streaming if context fails
            return;
        }

        try {
            const numSamples = chunk.byteLength / 2; // Assuming 16-bit PCM
            const float32Array = new Float32Array(numSamples);
            const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);

            // Convert Int16 PCM to Float32 range [-1.0, 1.0]
            for (let i = 0; i < numSamples; i++) {
                // Read Int16 little-endian, divide by max value (32768)
                float32Array[i] = dataView.getInt16(i * 2, true) / 32768.0;
            }

            // --- Buffering Logic ---
            // Prevent excessive memory usage if consumer is too slow or data rate is too high
            const maxProcessingBufferSize = this.bufferSize * 10; // Allow up to ~3 seconds of buffer
            if (this.processingBuffer.length > maxProcessingBufferSize) {
                console.warn(`AudioStreamer: Processing buffer exceeded limit (${maxProcessingBufferSize} samples). Resetting buffer to prevent memory issues.`);
                this.processingBuffer = new Float32Array(0);
                // Consider stopping playback or emitting an error if this happens frequently
                // this.stop();
                // this.emit('error', { type: 'buffer_overflow' });
            }

            // Append new samples to the processing buffer
            const newBuffer = new Float32Array(this.processingBuffer.length + float32Array.length);
            newBuffer.set(this.processingBuffer, 0);
            newBuffer.set(float32Array, this.processingBuffer.length);
            this.processingBuffer = newBuffer;

            // Extract full buffer chunks from the processing buffer
            while (this.processingBuffer.length >= this.bufferSize) {
                const bufferToQueue = this.processingBuffer.slice(0, this.bufferSize);
                this.audioQueue.push(bufferToQueue);
                this.processingBuffer = this.processingBuffer.slice(this.bufferSize);
            }

            // --- Trigger Playback Scheduling ---
            // If not currently playing and we have queued buffers, start the scheduling process
            if (!this.isPlaying && this.audioQueue.length > 0) {
                this.isPlaying = true;
                // Set the initial scheduled time slightly ahead to allow buffering
                this.scheduledTime = this.context.currentTime + this.initialBufferTime;
                console.debug(`AudioStreamer: Starting playback scheduling. Initial scheduled time: ${this.scheduledTime}`);
                this.scheduleNextBuffer(); // Start the scheduling loop
            }

        } catch (error) {
            console.error('AudioStreamer: Error processing audio chunk:', error);
            // Consider stopping playback on processing errors
            this.stop();
            this.emit('error', { type: 'audio_processing', details: error });
        }
    }

    /**
     * Creates a Web Audio API AudioBuffer from Float32 audio data.
     * @param {Float32Array} audioData - The audio samples.
     * @returns {AudioBuffer} The created AudioBuffer.
     * @throws {Error} If buffer creation fails.
     */
    _createAudioBuffer(audioData) {
        if (!this.context || this.context.state !== 'running') {
            throw new Error("Cannot create AudioBuffer: AudioContext is not running.");
        }
        try {
            // Create buffer with 1 channel, specified length, and sample rate
            const audioBuffer = this.context.createBuffer(1, audioData.length, this.sampleRate);
            // Copy the Float32 data into the buffer's channel
            audioBuffer.getChannelData(0).set(audioData);
            return audioBuffer;
        } catch (error) {
            console.error(`AudioStreamer: Failed to create AudioBuffer (Length: ${audioData.length}, SampleRate: ${this.sampleRate}):`, error);
            throw error; // Re-throw for scheduleNextBuffer to handle
        }
    }

    /**
     * Schedules the next available audio buffer(s) from the queue for playback.
     * This function schedules itself recursively using setTimeout for efficient timing.
     */
    scheduleNextBuffer() {
        // Stop scheduling if playback was stopped externally or context closed
        if (!this.isPlaying || !this.context || this.context.state !== 'running') {
            console.debug("AudioStreamer: Stopping scheduleNextBuffer loop (isPlaying=false or context not running).");
            // Ensure interval is cleared if stopping here
            this._clearCheckInterval();
            return;
        }

        try {
            // Schedule buffers that should start within the SCHEDULE_AHEAD_TIME window
            while (this.audioQueue.length > 0 && this.scheduledTime < this.context.currentTime + this.SCHEDULE_AHEAD_TIME) {
                const audioData = this.audioQueue.shift(); // Get next chunk from queue
                const audioBuffer = this._createAudioBuffer(audioData); // Create Web Audio buffer

                const source = this.context.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.gainNode); // Connect to volume control

                // Track the source node so we can stop it later if needed
                this.scheduledSources.add(source);
                source.onended = () => {
                    // console.debug("AudioBufferSourceNode ended."); // Optional log
                    // Clean up ended source from our tracking set
                    this.scheduledSources.delete(source);
                    // If this was the very last source and the stream is complete, emit 'playback_complete'?
                    if (this.isStreamComplete && this.scheduledSources.size === 0 && this.audioQueue.length === 0) {
                        console.info("AudioStreamer: Playback appears complete after stream stop.");
                        this.emit('playback_complete'); // Notify that playback finished after stop()
                        this.isPlaying = false; // Ensure state reflects completion
                    }
                };

                // Calculate precise start time, ensuring it's not in the past
                const startTime = Math.max(this.scheduledTime, this.context.currentTime);
                source.start(startTime);

                // Update the scheduled time for the *next* buffer
                this.scheduledTime = startTime + audioBuffer.duration;

                // We successfully scheduled a buffer, clear any underrun check interval
                this._clearCheckInterval();
            }

            // --- Handle Buffer Underrun or End of Stream ---
            if (this.audioQueue.length === 0) {
                // Queue is empty, check if more data might arrive or if stream stopped
                if (this.isStreamComplete) {
                    console.debug("AudioStreamer: Queue empty and stream complete. Waiting for last scheduled buffer to finish.");
                    // Playback will stop naturally when the last buffer ends (handled by onended)
                    // We don't set isPlaying=false here yet, wait for last buffer.
                } else {
                    // Queue is empty, but stream might still be active (potential buffer underrun)
                    // Start polling interval if not already running
                    if (!this.checkInterval) {
                        console.warn("AudioStreamer: Buffer underrun, queue is empty. Starting check interval.");
                        this.checkInterval = window.setInterval(() => {
                            // Check if new audio arrived or if stream completed in the meantime
                            if (!this.isPlaying || this.isStreamComplete) {
                                this._clearCheckInterval(); // Stop checking if playback stopped
                                return;
                            }
                            if (this.audioQueue.length > 0 || this.processingBuffer.length >= this.bufferSize) {
                                // Data arrived! Clear interval and resume scheduling immediately
                                this._clearCheckInterval();
                                console.info("AudioStreamer: Data arrived, resuming scheduling.");
                                this.scheduleNextBuffer();
                            }
                            // else: Still empty, interval continues...
                        }, 50); // Check every 50ms for new data
                    }
                }
            } else {
                // Queue still has items, schedule the next check based on when the last scheduled buffer ends
                const timeUntilNextSchedule = (this.scheduledTime - this.context.currentTime - 0.05) * 1000; // Schedule check slightly before next buffer needed
                const delay = Math.max(10, timeUntilNextSchedule); // Minimum 10ms delay
                // console.debug(`AudioStreamer: Scheduling next check in ${delay.toFixed(0)} ms`); // Optional log
                setTimeout(this.scheduleNextBuffer, delay);
            }

        } catch (error) {
            console.error('AudioStreamer: Error during scheduleNextBuffer:', error);
            this.stop(); // Stop playback on scheduling errors
            this.emit('error', { type: 'scheduling', details: error });
        }
    }

    /** Clears the check interval used for buffer underruns. */
    _clearCheckInterval() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            // console.debug("AudioStreamer: Cleared check interval."); // Optional log
        }
    }

    /**
     * Stops audio playback immediately, clears queues, and cleans up resources.
     * Sets the `isStreamComplete` flag.
     */
    stop() {
        // Avoid redundant stops or stopping if not initialized
        if (!this.isInitialized || (!this.isPlaying && this.audioQueue.length === 0 && this.scheduledSources.size === 0)) {
            // console.debug("AudioStreamer: Stop called but already stopped or inactive.");
            this.isStreamComplete = true; // Ensure flag is set even if nothing else done
            return;
        }
        console.info('AudioStreamer: Stopping playback...');
        this.isPlaying = false; // Prevent further scheduling
        this.isStreamComplete = true; // Mark stream as ended
        this._clearCheckInterval(); // Stop polling for data

        // Stop all currently scheduled audio sources immediately
        console.debug(`AudioStreamer: Stopping ${this.scheduledSources.size} active sources.`);
        this.scheduledSources.forEach(source => {
            try {
                source.onended = null; // Remove onended handler before stopping
                source.stop();
                source.disconnect(); // Disconnect from gain node
            } catch (e) {
                // Errors can happen if context is closed or source already stopped
                console.debug(`AudioStreamer: Error stopping/disconnecting audio source: ${e.message}`);
            }
        });
        this.scheduledSources.clear(); // Clear the tracking set

        // Clear internal queues
        this.audioQueue = [];
        this.processingBuffer = new Float32Array(0);

        // Reset scheduling time
        this.scheduledTime = this.context?.currentTime ?? 0; // Reset based on current time if context available

        // Optionally fade out volume quickly to prevent clicks (if gain node exists)
        if (this.gainNode && this.context?.state === 'running') {
            try {
                const fadeTime = 0.05; // Quick 50ms fade
                this.gainNode.gain.cancelScheduledValues(this.context.currentTime); // Cancel previous ramps
                this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.context.currentTime); // Start fade from current value
                this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeTime);
                // Restore volume after fade for next playback? Or do it in initialize()? Doing in initialize().
                // setTimeout(() => {
                //     if (this.gainNode) this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
                // }, fadeTime * 1000 + 50);
            } catch (error) {
                console.warn('AudioStreamer: Error during gain fade-out:', error);
                // Attempt to set gain to 0 directly if ramp fails
                try { if (this.gainNode) this.gainNode.gain.value = 0; } catch (e) { /* ignore */ }
            }
        }
        console.info("AudioStreamer: Playback stopped.");
        // Note: 'playback_complete' event might be emitted later by the last source's 'onended' handler
        // if it was already scheduled before stop() was called.
    }
}