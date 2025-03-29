/**
 * Establishes a WebSocket connection to the Deepgram API
 * for real-time audio transcription using their Streaming Speech-to-Text service.
 */
export class DeepgramTranscriber {
    /**
     * Creates a DeepgramTranscriber instance.
     * @param {string} apiKey - Your Deepgram API key.
     * @param {number} sampleRate - The sample rate of the audio being sent (e.g., 16000, 24000).
     */
    constructor(apiKey, sampleRate) {
        if (!apiKey) {
            throw new Error("DeepgramTranscriber: API Key is required.");
        }
        if (!sampleRate || typeof sampleRate !== 'number' || sampleRate <= 0) {
            throw new Error(`DeepgramTranscriber: Invalid sample rate provided (${sampleRate}). Must be a positive number.`);
        }

        this.apiKey = apiKey;
        this.sampleRate = sampleRate;
        this.ws = null; // WebSocket instance
        this.isConnected = false; // Connection state flag
        this.eventListeners = new Map(); // For emitting events like 'transcription', 'error', etc.

        console.info(`DeepgramTranscriber initialized for sample rate ${this.sampleRate} Hz.`);
    }

    /**
     * Establishes the WebSocket connection to Deepgram and sends initial configuration.
     * @returns {Promise<void>} Resolves when the connection is open and configured, rejects on failure.
     */
    async connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.warn("DeepgramTranscriber.connect called but already connected or connecting.");
            // If connecting, return a promise that resolves when connected? For simplicity, just return resolved.
            return Promise.resolve();
        }

        // Ensure any previous connection is fully closed before starting a new one
        if (this.ws) {
            await this.disconnect(); // Ensure cleanup before reconnecting
        }


        // Construct the Deepgram WebSocket URL with parameters
        // See Deepgram docs for available models, features, encodings etc.
        // URL Example: wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&model=nova-2&language=en-US
        const baseUrl = 'wss://api.deepgram.com/v1/listen';
        const params = new URLSearchParams({
            encoding: 'linear16', // PCM16 encoding expected
            sample_rate: this.sampleRate.toString(),
            model: 'nova-2', // Specify desired model (e.g., 'nova-2', 'base', 'enhanced')
            language: 'en-US', // Specify language
            // Optional features:
            punctuate: 'true',
            interim_results: 'false', // Set true to get results more frequently but possibly less accurate/stable
            endpointing: '800', // Milliseconds of silence to detect end of speech (e.g., '800') or 'false'
            channels: '1', // Mono audio
            // Add other features as needed: diarize, smart_format, tagging, etc.
        });
        const url = `${baseUrl}?${params.toString()}`;

        console.info(`DeepgramTranscriber: Attempting to connect to WebSocket: ${baseUrl}?${params.toString().replace(/&/g, ' ')}...`); // Log params cleanly

        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket using the 'token' subprotocol for authentication
                this.ws = new WebSocket(url, ['token', this.apiKey]);
                this.ws.binaryType = 'arraybuffer'; // We'll send ArrayBuffer audio data

                // --- WebSocket Event Handlers ---

                this.ws.onopen = () => {
                    console.info("DeepgramTranscriber: WebSocket connection established.");
                    this.isConnected = true;
                    // Note: Deepgram doesn't require an explicit 'Configure' message if parameters are in the URL.
                    // If using specific features not available via URL params, send config here:
                    /*
                    const config = {
                        type: 'Configure',
                        features: { ... }
                    };
                    this.ws.send(JSON.stringify(config));
                    console.debug("DeepgramTranscriber: Sent configuration message:", config);
                    */
                    this.emit('connected'); // Emit connected event
                    resolve(); // Resolve the connection promise
                };

                this.ws.onmessage = (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        // console.debug('DeepgramTranscriber: Received message:', response); // Verbose log

                        if (response.type === 'Results') {
                            // Extract the best transcript from the first channel/alternative
                            const transcript = response.channel?.alternatives?.[0]?.transcript;
                            const confidence = response.channel?.alternatives?.[0]?.confidence; // Optional confidence score
                            const isFinal = response.is_final; // Indicates if this is a final result for an utterance

                            if (transcript && transcript.trim() !== '') {
                                // console.debug(`DeepgramTranscriber: Received transcript (Confidence: ${confidence?.toFixed(3)}, Final: ${isFinal}): "${transcript}"`);
                                this.emit('transcription', { transcript, confidence, isFinal });
                            } else if (response.speech_final) {
                                // Indicates end of speech segment detected by endpointing
                                console.debug("DeepgramTranscriber: Received speech_final=true");
                                this.emit('speech_final');
                            }

                        } else if (response.type === 'Metadata') {
                            console.debug('DeepgramTranscriber: Received Metadata:', response);
                            this.emit('metadata', response);
                        } else if (response.type === 'SpeechStarted') {
                            console.debug('DeepgramTranscriber: Received SpeechStarted');
                            this.emit('speech_started');
                        } else if (response.type === 'UtteranceEnd') {
                            console.debug('DeepgramTranscriber: Received UtteranceEnd:', response);
                            this.emit('utterance_end');
                        } else if (response.type === 'Error') {
                            console.error('DeepgramTranscriber: Received Error message from server:', response);
                            this.emit('error', new Error(`Deepgram API Error: ${response.description || response.message || 'Unknown error'}`));
                            // Consider closing connection on severe errors?
                            // this.disconnect();
                        } else {
                            // Handle other potential message types
                            // console.debug('DeepgramTranscriber: Received unhandled message type:', response.type, response);
                        }

                    } catch (error) {
                        console.error('DeepgramTranscriber: Error processing WebSocket message:', error, 'Raw data:', event.data);
                        this.emit('error', new Error(`Error parsing Deepgram message: ${error.message}`));
                    }
                };

                this.ws.onerror = (errorEvent) => {
                    console.error("DeepgramTranscriber: WebSocket error occurred:", errorEvent);
                    this.isConnected = false; // Update state on error
                    // The 'close' event usually follows with more details
                    this.emit('error', new Error('Deepgram WebSocket connection error. Check console for details.'));
                    // Reject the connection promise if it's still pending
                    reject(new Error('WebSocket connection error.'));
                    // Clean up ws reference? Maybe wait for onclose.
                };

                this.ws.onclose = (closeEvent) => {
                    console.warn(`DeepgramTranscriber: WebSocket connection closed. Code: ${closeEvent.code}, Reason: "${closeEvent.reason || 'No reason provided'}"`, `Clean close: ${closeEvent.wasClean}`);
                    const wasConnected = this.isConnected;
                    this.isConnected = false;
                    this.ws = null; // Clear reference
                    this.emit('disconnected', { code: closeEvent.code, reason: closeEvent.reason, wasClean: closeEvent.wasClean });
                    // Reject the connection promise *only* if it was pending (i.e., closed before open)
                    if (!wasConnected) { // Check if it was ever connected
                        reject(new Error(`WebSocket closed before connection established. Code: ${closeEvent.code}`));
                    }
                };

            } catch (error) {
                console.error("DeepgramTranscriber: Failed to create WebSocket:", error);
                this.ws = null; // Ensure ws is null on creation error
                reject(error); // Reject the promise
            }
        });
    }

    /**
     * Sends audio data (as ArrayBuffer or similar binary type) over the WebSocket.
     * @param {ArrayBuffer|Blob|TypedArray} audioData - The raw audio data chunk.
     * @throws {Error} If WebSocket is not connected or send fails.
     */
    sendAudio(audioData) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Avoid throwing an error here as audio might arrive slightly after disconnect
            console.warn('DeepgramTranscriber.sendAudio: Cannot send audio, WebSocket is not connected or open.');
            return;
        }
        if (!audioData || audioData.byteLength === 0) {
            console.warn('DeepgramTranscriber.sendAudio: Attempted to send empty audio data.');
            return;
        }

        try {
            // console.debug(`DeepgramTranscriber: Sending audio data chunk (${audioData.byteLength} bytes)...`); // Verbose log
            this.ws.send(audioData);
        } catch (error) {
            console.error('DeepgramTranscriber: Error sending audio data:', error);
            this.emit('error', new Error(`Failed to send audio data: ${error.message}`));
            // Consider disconnecting if send fails repeatedly?
            // this.disconnect();
            throw error; // Re-throw for caller awareness
        }
    }

    /**
     * Sends a 'CloseStream' message (if supported by Deepgram for graceful closure)
     * and closes the WebSocket connection.
     * @returns {Promise<void>} Resolves when disconnection attempt is complete.
     */
    async disconnect() {
        if (!this.ws) {
            // console.debug("DeepgramTranscriber.disconnect: Already disconnected or not initialized.");
            this.isConnected = false; // Ensure state is correct
            return;
        }
        console.info("DeepgramTranscriber: Disconnecting WebSocket...");

        // 1. Clear Event Handlers to prevent them firing after explicit disconnect
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null; // Prevent our onclose handler from running again here

        // 2. Send CloseStream message (optional, check Deepgram docs if needed/supported)
        if (this.ws.readyState === WebSocket.OPEN) {
            try {
                // console.debug("DeepgramTranscriber: Sending CloseStream message...");
                this.ws.send(JSON.stringify({ type: 'CloseStream' }));
            } catch (sendError) {
                console.warn("DeepgramTranscriber: Error sending CloseStream message:", sendError);
            }
        }

        // 3. Close the WebSocket connection
        try {
            if (this.ws.readyState !== WebSocket.CLOSED) {
                this.ws.close(1000, "Client requested disconnect"); // Normal closure
            }
        } catch (closeError) {
            console.error("DeepgramTranscriber: Error closing WebSocket:", closeError);
        } finally {
            this.ws = null; // Clear reference
            this.isConnected = false; // Ensure state is updated
            console.info("DeepgramTranscriber: Disconnect process complete.");
            // Note: 'disconnected' event is emitted by the original onclose handler if connection drops,
            // or could be emitted here explicitly if needed after manual close.
            // this.emit('disconnected', { code: 1000, reason: "Client requested disconnect", wasClean: true });
        }
    }

    // --- Event Emitter Implementation ---

    /** Registers an event listener */
    on(eventName, callback) {
        if (typeof eventName !== 'string' || !eventName) {
            console.error("DeepgramTranscriber.on: Invalid event name provided.");
            return;
        }
        if (typeof callback !== 'function') {
            console.error(`DeepgramTranscriber.on: Invalid callback function provided for event "${eventName}".`);
            return;
        }
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /** Removes an event listener */
    off(eventName, callback) {
        if (typeof eventName !== 'string' || !eventName || !this.eventListeners.has(eventName)) {
            return; // No listeners for this event or invalid name
        }
        const listeners = this.eventListeners.get(eventName);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
            if (listeners.length === 0) {
                this.eventListeners.delete(eventName);
            }
        }
    }

    /** Emits an event to all registered listeners */
    emit(eventName, data) {
        if (!this.eventListeners.has(eventName)) {
            return; // No listeners for this event
        }
        // Iterate over a copy in case listeners modify the array during execution
        const listeners = [...this.eventListeners.get(eventName)];
        for (const callback of listeners) {
            try {
                callback(data);
            } catch (error) {
                console.error(`DeepgramTranscriber: Error in listener for event "${eventName}":`, error);
            }
        }
    }
}