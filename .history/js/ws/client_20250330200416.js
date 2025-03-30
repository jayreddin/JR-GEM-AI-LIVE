/**
 * Client for interacting with the Gemini 2.0 Flash Multimodal Live API via WebSockets.
 * This class handles the connection, sending and receiving messages, and processing responses.
 *
 * @extends EventEmitter
 */
// Import EventEmitter - THIS LINE IS ADDED/UNCOMMENTED
import { EventEmitter } from 'https://cdn.skypack.dev/eventemitter3';
import { blobToJSON, base64ToArrayBuffer } from '../utils/utils.js';

export class GeminiWebsocketClient extends EventEmitter { // Now EventEmitter should be defined
    /**
     * Creates a new GeminiWebsocketClient with the given configuration.
     * @param {string} name - Name for the websocket client.
     * @param {string} url - URL for the Gemini API that contains the API key at the end.
     * @param {Object} config - Configuration object for the Gemini API.
     */
    constructor(name, url, config) {
        super(); // Call EventEmitter constructor
        this.name = name || 'WebSocketClient';
        this.url = url; // URL is now mandatory and provided by agent.js which reads from config.js
        this.ws = null;
        this.config = config; // Config object provided by agent.js
        this.isConnecting = false;
        this.connectionPromise = null;

        if (!this.url) {
            throw new Error("WebSocket URL is required.");
        }
        if (!this.config) {
            throw new Error("Configuration object is required.");
        }
    }

    /**
     * Establishes a WebSocket connection and initializes the session with a configuration.
     * Handles concurrent connection attempts.
     * @returns {Promise<void>} Resolves when the connection is established and setup is complete
     */
    async connect() {
        // If already connected, return the existing promise/resolve immediately
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.debug(`${this.name}: Already connected.`);
            return Promise.resolve();
        }

        // If connection is already in progress, return the pending promise
        if (this.isConnecting && this.connectionPromise) {
            console.debug(`${this.name}: Connection attempt in progress, returning existing promise.`);
            return this.connectionPromise;
        }

        console.info(`${this.name}: Establishing WebSocket connection to ${this.url}...`);
        this.isConnecting = true;

        // Create a new promise for this connection attempt
        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                // Ensure URL is valid before creating WebSocket
                if (!this.url || typeof this.url !== 'string' || !this.url.startsWith('wss://')) {
                    throw new Error(`Invalid WebSocket URL: ${this.url}`);
                }
                
                // Create WebSocket with appropriate timeouts
                const ws = new WebSocket(this.url);
                this.ws = ws; // Assign early to allow potential immediate disconnect calls
                
                // Set a connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        console.error(`${this.name}: WebSocket connection timed out`);
                        ws.close();
                        this.isConnecting = false;
                        reject(new Error("WebSocket connection timed out"));
                    }
                }, 15000); // 15 second timeout

                ws.addEventListener('open', () => {
                    clearTimeout(connectionTimeout);
                    console.info(`${this.name}: Successfully connected to WebSocket.`);
                    
                    // Send the configuration setup message
                    this.sendJSON({ setup: this.config })
                        .then(() => {
                            console.debug(`${this.name}: Setup message sent with configuration:`, this.config);
                            this.isConnecting = false;
                            resolve(); // Resolve the promise *after* setup is sent
                        })
                        .catch((setupError) => {
                            console.error(`${this.name}: Error sending setup message:`, setupError);
                            this.disconnect(); // Disconnect if setup fails
                            this.isConnecting = false;
                            reject(setupError); // Reject the connection promise
                        });
                });

                ws.addEventListener('error', (errorEvent) => {
                    clearTimeout(connectionTimeout);
                    console.error(`${this.name}: WebSocket error occurred.`, errorEvent);
                    // Attempt to disconnect and clean up state
                    this.disconnect(); // Ensure cleanup happens
                    this.isConnecting = false;
                    // Reject the promise if it hasn't been resolved yet
                    reject(new Error(`${this.name}: WebSocket connection error. Check console for details.`));
                });

                ws.addEventListener('close', (closeEvent) => {
                    clearTimeout(connectionTimeout);
                    console.warn(`${this.name}: WebSocket connection closed. Code: ${closeEvent.code}, Reason: "${closeEvent.reason || 'No reason provided'}"`);
                    this.isConnecting = false;
                    this.ws = null; // Ensure ws is nullified
                    // If the connection promise is still pending (i.e., connection failed before 'open'), reject it.
                    if (closeEvent.target.readyState !== WebSocket.OPEN && this.connectionPromise) {
                        reject(new Error(`${this.name}: WebSocket closed before connection was fully established. Code: ${closeEvent.code}`));
                    }
                    // Emit a disconnected event for other parts of the app
                    this.emit('disconnected', { code: closeEvent.code, reason: closeEvent.reason });
                });

                // Listen for incoming messages (expecting Blob data)
                ws.addEventListener('message', async (event) => {
                    try {
                        if (event.data instanceof Blob) {
                            await this.receive(event.data);
                        } else if (typeof event.data === 'string') {
                            // Try to parse as JSON for better error handling
                            try {
                                const jsonData = JSON.parse(event.data);
                                console.debug(`${this.name}: Received text message:`, jsonData);
                                // Handle potential setup confirmation or error messages
                                this.handleJsonMessage(jsonData);
                            } catch (parseError) {
                                console.warn(`${this.name}: Received unparseable text message:`, event.data);
                            }
                        } else {
                            console.warn(`${this.name}: Received message of unknown type:`, event.data);
                        }
                    } catch (receiveError) {
                        console.error(`${this.name}: Error processing received message:`, receiveError);
                        this.emit('error', receiveError);
                    }
                });

            } catch (error) {
                // Catch synchronous errors (e.g., invalid URL)
                console.error(`${this.name}: Failed to create WebSocket:`, error);
                this.isConnecting = false;
                this.ws = null;
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    /**
     * Closes the WebSocket connection if open.
     */
    disconnect() {
        if (this.ws) {
            console.info(`${this.name}: Disconnecting WebSocket...`);
            // Remove listeners to prevent errors after explicit close
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            try {
                // Check state before closing
                if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close(1000, "Client initiated disconnect"); // 1000 indicates normal closure
                }
            } catch (closeError) {
                console.error(`${this.name}: Error during WebSocket close:`, closeError);
            } finally {
                this.ws = null; // Nullify regardless of close success/failure
                this.isConnecting = false;
                // Reset connection promise? Depends on desired reconnect behavior.
                // Setting to null allows a fresh promise on next connect() call.
                this.connectionPromise = null;
                console.info(`${this.name}: WebSocket disconnected.`);
                this.emit('disconnected', { code: 1000, reason: "Client initiated disconnect" });
            }
        } else {
            console.debug(`${this.name}: WebSocket already disconnected or not initialized.`);
            // Ensure state is consistent
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }

    /**
     * Processes incoming WebSocket Blob messages.
     * Converts Blob to JSON and emits corresponding events based on the response structure.
     * @param {Blob} blob - The received Blob data.
     */
    async receive(blob) {
        let response;
        try {
            response = await blobToJSON(blob);
        } catch (error) {
            console.error(`${this.name}: Failed to parse received blob to JSON:`, error);
            this.emit('error', new Error("Failed to parse server message"));
            return;
        }

        // --- Handle Specific Response Types ---

        // Handle setup confirmation (Added)
        if (response.setupComplete) {
            console.debug(`${this.name}: Received setup complete confirmation.`, response.setupComplete);
            this.emit('setup_complete', response.setupComplete);
            return; // Explicitly handled
        }

        // Handle tool call requests
        if (response.toolCall) {
            console.debug(`${this.name}: Received tool call`, response);
            // Basic validation
            if (response.toolCall.functionCalls && Array.isArray(response.toolCall.functionCalls)) {
                this.emit('tool_call', response.toolCall);
            } else {
                console.warn(`${this.name}: Received malformed tool call:`, response);
                this.emit('error', new Error("Received malformed tool call from server"));
            }
            return;
        }

        // Handle tool call cancellation (if applicable API feature)
        if (response.toolCallCancellation) {
            console.debug(`${this.name}: Received tool call cancellation`, response);
            this.emit('tool_call_cancellation', response.toolCallCancellation);
            return;
        }

        // Process server content (text/audio/interruptions/turn completion)
        if (response.serverContent) {
            const { serverContent } = response;

            if (serverContent.interrupted) {
                console.debug(`${this.name}: Model turn interrupted.`);
                this.emit('interrupted');
                // Interruption might or might not be followed by turnComplete, depends on API
            }

            if (serverContent.turnComplete) {
                console.debug(`${this.name}: Model turn complete.`);
                this.emit('turn_complete');
                // Turn complete often signifies the end of a logical response block
            }

            if (serverContent.modelTurn && serverContent.modelTurn.parts) {
                // Process parts: text, audio, potentially others
                const parts = serverContent.modelTurn.parts;

                parts.forEach(part => {
                    if (part.text) {
                        // Emit raw text
                        this.emit('text', part.text);
                    } else if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                        if (part.inlineData.data) {
                            try {
                                const audioData = base64ToArrayBuffer(part.inlineData.data);
                                this.emit('audio', audioData);
                            } catch (audioError) {
                                console.error(`${this.name}: Failed to decode audio data:`, audioError);
                                this.emit('error', new Error("Failed to decode server audio"));
                            }
                        } else {
                            console.warn(`${this.name}: Received audio part without data.`);
                        }
                    } else {
                        // Handle other potential part types if necessary
                        console.debug(`${this.name}: Received unhandled model turn part:`, part);
                        this.emit('unhandled_part', part); // Emit for potential external handling
                    }
                });
            } else if (!serverContent.interrupted && !serverContent.turnComplete) {
                // Received serverContent without modelTurn, interrupted, or turnComplete
                console.debug(`${this.name}: Received serverContent without actionable data:`, response);
            }
            return; // Handled serverContent
        }

        // --- Fallback for Unmatched Messages ---
        console.warn(`${this.name}: Received unhandled message type:`, response);
        this.emit('unhandled_message', response);
    }

    /**
     * Handles JSON messages that aren't Blob-encoded
     * @param {Object} jsonData - The parsed JSON data
     */
    handleJsonMessage(jsonData) {
        // Handle setup confirmation
        if (jsonData.setupComplete) {
            console.debug(`${this.name}: Received setup complete confirmation.`, jsonData.setupComplete);
            this.emit('setup_complete', jsonData.setupComplete);
            return;
        }
        
        // Handle potential error messages
        if (jsonData.error) {
            console.error(`${this.name}: Server error:`, jsonData.error);
            this.emit('error', new Error(jsonData.error.message || "Server error"));
            return;
        }
        
        // Handle other message types as needed
        console.debug(`${this.name}: Unhandled JSON message type:`, jsonData);
        this.emit('unhandled_message', jsonData);
    }

    /**
     * Sends a JSON object over the WebSocket. Ensures connection is open.
     * @param {Object} json - The JSON object to send.
     * @returns {Promise<void>} Resolves when sent, rejects on error or if not connected.
     */
    async sendJSON(json) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error(`${this.name}: Cannot send JSON, WebSocket is not open. State: ${this.ws?.readyState}`);
            // Option 1: Throw error
            throw new Error("WebSocket is not open.");
            // Option 2: Try to connect first? (Can lead to complex state)
            // await this.connect(); // Be careful with re-entrancy and timing
            // if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("WebSocket connection failed.");
        }

        try {
            const jsonString = JSON.stringify(json);
            this.ws.send(jsonString);
            // Avoid logging large data chunks like audio/images by default in production
            // console.debug(`${this.name}: Sent JSON:`, json); // Use conditional logging
        } catch (error) {
            console.error(`${this.name}: Failed to send JSON:`, error);
            // Consider disconnecting or emitting an error
            this.emit('error', new Error(`Failed to send message: ${error.message}`));
            throw error; // Re-throw for caller to handle
        }
    }


    /**
     * Sends encoded audio chunk to the Gemini API.
     * @param {string} base64audio - The base64 encoded audio string.
     */
    async sendAudio(base64audio) {
        const data = { realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm', data: base64audio }] } };
        await this.sendJSON(data);
        // console.debug(`${this.name}: Sent audio chunk.`); // Keep logs concise
    }

    /**
     * Sends encoded image to the Gemini API.
     * @param {string} base64image - The base64 encoded image string (data only, no prefix).
     */
    async sendImage(base64image) {
        const data = { realtimeInput: { mediaChunks: [{ mimeType: 'image/jpeg', data: base64image }] } };
        await this.sendJSON(data);
        // console.debug(`<span class="math-inline">\{this\.name\}\: Sent image chunk \(</span>{Math.round(base64image.length / 1024)} KB).`);
    }

    /**
     * Sends a text message to the Gemini API.
     * @param {string} text - The text to send to Gemini.
     * @param {boolean} [endOfTurn=true] - If false, the model may wait for more input.
     */
    async sendText(text, endOfTurn = true) {
        // Basic validation
        if (typeof text !== 'string') {
            console.error(`${this.name}: Invalid text input for sendText.`);
            return; // Or throw error
        }
        const formattedMessage = {
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text: text }]
                }],
                // Only include turnComplete if it's true, some APIs might prefer omission if false
                ...(endOfTurn && { turnComplete: true })
            }
        };
        await this.sendJSON(formattedMessage);
        console.debug(`<span class="math-inline">\{this\.name\}\: Sent text\: "</span>{text}" (EndOfTurn: ${endOfTurn})`);
        // Emit text_sent event AFTER successful sending
        this.emit('text_sent', { text, endOfTurn });
    }

    /**
     * Sends the result of a tool call back to Gemini.
     * @param {Object} toolResponse - The response object.
     * @param {string} toolResponse.id - The identifier of the tool call (from toolCall.functionCalls[0].id).
     * @param {*} [toolResponse.output] - The output of the tool execution (required if no error).
     * @param {string} [toolResponse.error] - Error message if the tool call failed (output should be omitted/null).
     */
    async sendToolResponse(toolResponse) {
        if (!toolResponse || typeof toolResponse.id !== 'string') {
            console.error(`${this.name}: Invalid toolResponse object for sendToolResponse. Missing or invalid 'id'.`, toolResponse);
            throw new Error("Tool response must include a valid string 'id'.");
        }

        const { id, output, error } = toolResponse;
        let functionResponsePayload;

        if (error !== undefined && error !== null) {
            // Send error response
            functionResponsePayload = {
                response: { error: String(error) }, // Ensure error is a string
                id: id
            };
            console.warn(`${this.name}: Sending tool error response for ID ${id}:`, error);
        } else if (output !== undefined) {
            // Send successful output response
            functionResponsePayload = {
                response: { output: output }, // Output can be any JSON-serializable type expected by the agent
                id: id
            };
            // console.debug(`${this.name}: Sending tool success response for ID ${id}:`, output);
        } else {
            console.error(`${this.name}: Invalid toolResponse for sendToolResponse. Must include 'output' or 'error'.`, toolResponse);
            throw new Error("Tool response must include 'output' or 'error'.");
        }

        await this.sendJSON({ toolResponse: { functionResponses: [functionResponsePayload] } });
        console.debug(`${this.name}: Tool response sent for ID ${id}.`);
    }
}