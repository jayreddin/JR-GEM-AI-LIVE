/**
 * Core application class (GeminiAgent)
 * Orchestrates WebSocket communication, audio processing, media capture (mic, camera, screen),
 * transcription, tool usage, and event handling for the Gemini Live application.
 */
import { GeminiWebsocketClient } from '../ws/client.js';
import { AudioRecorder } from '../audio/recorder.js';
import { AudioStreamer } from '../audio/streamer.js';
import { AudioVisualizer } from '../audio/visualizer.js';
import { DeepgramTranscriber } from '../transcribe/deepgram.js';
import { CameraManager } from '../camera/camera.js';
import { ScreenManager } from '../screen/screen.js';
import { MODEL_SAMPLE_RATE, getConfig, getDeepgramApiKey, getWebsocketUrl } from '../config/config.js'; // Assuming config functions are available

export class GeminiAgent {
    constructor({
        name = 'GeminiAgent',
        // url, // URL now fetched internally
        // config, // Config now fetched internally
        // deepgramApiKey = null, // Fetched internally
        transcribeModelsSpeech = true, // Option to transcribe model's output
        transcribeUsersSpeech = false, // Option to transcribe user's input (via Deepgram)
        // modelSampleRate = 24000, // Fetched internally from config
        toolManager = null // Tool manager instance passed in
    } = {}) {

        this.name = name;
        this.toolManager = toolManager;

        // State flags
        this.initialized = false; // Has initialize() been successfully called?
        this.connected = false; // Is the WebSocket connected?
        this.isInitializing = false; // Prevent concurrent initialization
        this.isDisconnecting = false; // Prevent concurrent disconnection

        // Core components (initialized later)
        this.client = null; // GeminiWebsocketClient instance
        this.audioContext = null;
        this.audioRecorder = null;
        this.audioStreamer = null;
        this.visualizer = null;
        this.modelTranscriber = null; // Deepgram transcriber for model speech
        this.userTranscriber = null; // Deepgram transcriber for user speech
        this.cameraManager = null;
        this.screenManager = null;

        // Configuration (fetched dynamically)
        this.config = null;
        this.url = null;
        this.deepgramApiKey = null;
        this.modelSampleRate = MODEL_SAMPLE_RATE; // Initial value from config import

        // Transcription options
        this.transcribeModelsSpeech = transcribeModelsSpeech;
        this.transcribeUsersSpeech = transcribeUsersSpeech;

        // Media capture settings (read initially, potentially updated via settings)
        this._updateMediaSettings();

        // Intervals (managed carefully)
        this.cameraInterval = null;
        this.screenInterval = null;
        this.modelsKeepAliveInterval = null;
        this.userKeepAliveInterval = null;

        // Event listeners map
        this._eventListeners = new Map();

        console.info(`${this.name}: Instance created.`);
    }

    /** Fetches latest configuration and API keys */
    _loadConfiguration() {
        try {
            this.config = getConfig(); // Fetch dynamic config based on localStorage
            this.url = getWebsocketUrl(); // Fetch URL with API key
            this.deepgramApiKey = getDeepgramApiKey();
            this.modelSampleRate = MODEL_SAMPLE_RATE; // Re-fetch in case it changed

            // Update tool declarations in config (if toolManager exists)
            if (this.toolManager && this.config?.tools) {
                this.config.tools.functionDeclarations = this.toolManager.getToolDeclarations() || [];
            }

            // Basic validation
            if (!this.url || !this.url.includes('key=')) {
                console.error(`${this.name}: Configuration Error: Missing or invalid API key in WebSocket URL.`);
                throw new Error("Missing or invalid Gemini API key. Please check settings.");
            }

            console.debug(`${this.name}: Configuration loaded/reloaded.`);

        } catch (error) {
            console.error(`${this.name}: Failed to load configuration:`, error);
            // Propagate error to prevent connection/initialization with bad config
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }

    /** Updates media settings from localStorage */
    _updateMediaSettings() {
        this.fps = parseInt(localStorage.getItem('fps') || '5', 10);
        // Ensure FPS is within a reasonable range (e.g., 1-10)
        this.fps = Math.max(1, Math.min(10, this.fps));
        this.captureInterval = 1000 / this.fps;
        this.resizeWidth = parseInt(localStorage.getItem('resizeWidth') || '640', 10);
        this.quality = parseFloat(localStorage.getItem('quality') || '0.4');
        console.debug(`${this.name}: Media settings updated - FPS: ${this.fps}, Interval: ${this.captureInterval}ms, Width: ${this.resizeWidth}, Quality: ${this.quality}`);
    }


    /** Sets up listeners for events from the WebSocket client */
    _setupClientEventListeners() {
        if (!this.client) return;

        // Clear existing listeners before adding new ones (important on reconnect)
        this.client.off('text');
        this.client.off('audio');
        this.client.off('interrupted');
        this.client.off('turn_complete');
        this.client.off('tool_call');
        this.client.off('error'); // Handle client errors
        this.client.off('disconnected'); // Handle unexpected disconnects

        // --- Add new listeners ---

        this.client.on('text', (text) => {
            this.emit('text', text);
        });

        this.client.on('audio', async (data) => {
            // Ensure audio components are ready
            if (!this.audioStreamer || !this.audioContext || this.audioContext.state !== 'running') {
                console.warn(`${this.name}: Received audio but audio system not ready. State: ${this.audioContext?.state}`);
                return;
            }
            if (!this.audioStreamer.isInitialized) {
                try {
                    await this.audioStreamer.initialize();
                } catch (initError) {
                    console.error(`${this.name}: Failed to initialize audio streamer on demand:`, initError);
                    return; // Don't proceed if streamer init fails
                }
            }
            try {
                this.audioStreamer.streamAudio(new Uint8Array(data));
                // Send to model transcriber if enabled and connected
                if (this.modelTranscriber?.isConnected) {
                    this.modelTranscriber.sendAudio(data);
                }
            } catch (error) {
                console.error(`${this.name}: Error processing/streaming received audio:`, error);
                // Optionally stop streamer on error?
                // this.audioStreamer?.stop();
            }
        });

        this.client.on('interrupted', () => {
            console.debug(`${this.name}: Received interruption signal.`);
            // Ensure streamer exists before trying to stop
            if (this.audioStreamer) {
                this.audioStreamer.stop();
                this.audioStreamer.isInitialized = false; // Needs re-initialization
            }
            this.emit('interrupted');
        });

        this.client.on('turn_complete', () => {
            console.info(`${this.name}: Model turn complete.`);
            // Finalize streaming message in UI if necessary
            // This emit should be handled by ChatManager or similar UI controller
            this.emit('turn_complete');
        });

        this.client.on('tool_call', async (toolCall) => {
            await this._handleToolCall(toolCall);
        });

        this.client.on('error', (error) => {
            console.error(`${this.name}: WebSocket client reported an error:`, error);
            // Potentially trigger disconnect or UI notification
            this.emit('error', { type: 'websocket', details: error });
            // Consider disconnecting on critical client errors
            // this.disconnect().catch(e => console.error("Error during disconnect after client error:", e));
        });

        this.client.on('disconnected', (details) => {
            console.warn(`${this.name}: WebSocket client disconnected unexpectedly. Code: ${details?.code}, Reason: ${details?.reason}`);
            // Update state and potentially trigger UI changes/reconnect logic
            this.connected = false;
            this.emit('disconnected', details); // Forward the event
            // Note: Do not call this.disconnect() here, as the client is already disconnected.
            // Need to decide on automatic reconnect strategy elsewhere.
        });
    }

    /** Handles incoming tool calls from the model */
    async _handleToolCall(toolCall) {
        // Basic validation
        if (!this.toolManager || !toolCall?.functionCalls?.length) {
            console.error(`${this.name}: Cannot handle tool call - ToolManager missing or invalid toolCall structure.`, toolCall);
            // Send back an error response? Requires careful handling of response IDs.
            // For simplicity, we might just log and ignore here, but sending an error is better.
            // Example: If you can get the ID:
            // const callId = toolCall?.functionCalls?.[0]?.id;
            // if (callId && this.client) {
            //     await this.client.sendToolResponse({ id: callId, error: "Invalid tool call structure received." });
            // }
            return;
        }

        // TODO: Handle multiple function calls if the API supports it in the future.
        // For now, process only the first one.
        const functionCall = toolCall.functionCalls[0];
        console.info(`${this.name}: Handling tool call: ${functionCall.name} (ID: ${functionCall.id})`, { args: functionCall.args });

        let response;
        try {
            // Delegate execution to ToolManager
            const result = await this.toolManager.handleToolCall(functionCall); // ToolManager now returns {output, id, error} structure
            response = result; // Use the structure directly
            console.info(`${this.name}: Tool ${functionCall.name} executed successfully. Result:`, result.output);
        } catch (error) {
            console.error(`${this.name}: Error executing tool ${functionCall.name}:`, error);
            // Structure the error response for sendToolResponse
            response = {
                id: functionCall.id, // Use the ID from the original call
                error: error.message || "Tool execution failed with an unknown error."
            };
        }

        // Send the response back to the model
        if (this.client && this.connected) {
            try {
                await this.client.sendToolResponse(response);
            } catch (sendError) {
                console.error(`${this.name}: Failed to send tool response:`, sendError);
                // Handle failure to send response (e.g., WebSocket closed)
            }
        } else {
            console.error(`${this.name}: Cannot send tool response, client not connected.`);
        }
    }

    /** Connects to the Gemini API WebSocket */
    async connect() {
        if (this.connected || this.isConnecting) {
            console.warn(`${this.name}: Connect called but already connected or connecting.`);
            return this.client?.connectionPromise || Promise.resolve(); // Return existing promise or resolve if already connected
        }

        this.isConnecting = true;
        console.info(`${this.name}: Attempting to connect...`);

        try {
            // Load latest config before connecting
            this._loadConfiguration();

            // Create and connect client
            this.client = new GeminiWebsocketClient(this.name, this.url, this.config);
            await this.client.connect(); // This now returns a promise handled by the client

            this._setupClientEventListeners();
            this.connected = true;
            this.isConnecting = false;
            console.info(`${this.name}: Connection successful.`);
            this.emit('connected'); // Emit event on successful connection *and* setup
            return Promise.resolve(); // Explicitly resolve on success

        } catch (error) {
            console.error(`${this.name}: Connection failed:`, error);
            this.isConnecting = false;
            // Ensure client is cleaned up if connection failed partway
            if (this.client) {
                this.client.disconnect(); // Use client's disconnect logic
                this.client = null;
            }
            this.connected = false;
            this.emit('error', { type: 'connection', details: error }); // Emit specific error type
            throw error; // Re-throw error for caller (e.g., UI) to handle
        } finally {
            // Ensure isConnecting is always reset
            this.isConnecting = false;
        }
    }

    /** Sends a text message to the model */
    async sendText(text) {
        if (!this.client || !this.connected) {
            console.error(`${this.name}: Cannot send text, not connected.`);
            // Optionally throw an error or queue the message?
            throw new Error("Cannot send text: Not connected.");
        }
        try {
            await this.client.sendText(text); // Assuming client handles emitting 'text_sent'
            // If client doesn't emit 'text_sent', emit it here:
            // this.emit('text_sent', text);
        } catch (error) {
            console.error(`${this.name}: Failed to send text:`, error);
            this.emit('error', { type: 'send_text', details: error });
            throw error; // Re-throw
        }
    }

    // --- Media Capture Methods ---

    /** Starts camera capture */
    async startCameraCapture() {
        if (this.cameraInterval) {
            console.warn(`${this.name}: Camera capture already active.`);
            return;
        }
        if (!this.connected) {
            console.error(`${this.name}: Cannot start camera capture, not connected.`);
            throw new Error("Cannot start camera: Not connected.");
        }
        // Re-fetch media settings in case they changed
        this._updateMediaSettings();

        // Initialize CameraManager if not already done
        if (!this.cameraManager) {
            this.cameraManager = new CameraManager({
                width: this.resizeWidth,
                quality: this.quality,
                facingMode: localStorage.getItem('facingMode') || 'environment' // Use stored preference
            });
        }

        console.info(`${this.name}: Starting camera capture...`);
        try {
            await this.cameraManager.initialize(); // Initialize video stream etc.

            // Set up interval to capture and send frames
            this.cameraInterval = setInterval(async () => {
                // Ensure still connected and manager is initialized before capturing
                if (this.connected && this.cameraManager?.isInitialized && this.client) {
                    try {
                        const imageBase64 = await this.cameraManager.capture();
                        await this.client.sendImage(imageBase64);
                    } catch (captureSendError) {
                        console.error(`${this.name}: Error during camera capture/send interval:`, captureSendError);
                        // Consider stopping capture on repeated errors
                        // await this.stopCameraCapture();
                        // this.emit('error', { type: 'camera_capture', details: captureSendError });
                    }
                } else {
                    // If disconnected or manager gone while interval is running, stop it
                    console.warn(`${this.name}: Stopping camera interval due to disconnect or uninitialized manager.`);
                    await this.stopCameraCapture();
                }
            }, this.captureInterval);

            console.info(`${this.name}: Camera capture started successfully.`);
            this.emit('camera_started');

        } catch (error) {
            console.error(`${this.name}: Failed to start camera capture:`, error);
            await this.stopCameraCapture(); // Attempt cleanup on failure
            this.emit('error', { type: 'camera_start', details: error });
            throw error; // Re-throw for UI
        }
    }

    /** Stops camera capture */
    async stopCameraCapture() {
        if (!this.cameraInterval && !this.cameraManager?.isInitialized) {
            console.debug(`${this.name}: Camera capture already stopped or not initialized.`);
            return; // Nothing to do
        }
        console.info(`${this.name}: Stopping camera capture...`);
        // Clear interval first
        if (this.cameraInterval) {
            clearInterval(this.cameraInterval);
            this.cameraInterval = null;
        }
        // Dispose manager resources (stops stream, removes elements)
        if (this.cameraManager) {
            try {
                this.cameraManager.dispose();
                // Optionally nullify manager: this.cameraManager = null;
                // Or keep it to potentially re-initialize later without full reconstruction
            } catch (disposeError) {
                console.error(`${this.name}: Error disposing camera manager:`, disposeError);
                // Continue cleanup despite error
            }
        }
        console.info(`${this.name}: Camera capture stopped.`);
        this.emit('camera_stopped');
    }

    /** Toggles camera capture */
    async toggleCamera() {
        if (this.cameraInterval) {
            await this.stopCameraCapture();
        } else {
            // Ensure connected before starting
            if (!this.connected) {
                console.error(`${this.name}: Cannot toggle camera on, not connected.`);
                throw new Error("Cannot toggle camera: Not connected.");
            }
            await this.startCameraCapture();
        }
    }

    /** Starts screen sharing */
    async startScreenShare() {
        if (this.screenInterval) {
            console.warn(`${this.name}: Screen sharing already active.`);
            return;
        }
        if (!this.connected) {
            console.error(`${this.name}: Cannot start screen share, not connected.`);
            throw new Error("Cannot start screen share: Not connected.");
        }
        // Re-fetch media settings
        this._updateMediaSettings();

        // Define the onStop callback here to ensure correct 'this' context
        const handleScreenShareStop = () => {
            console.info(`${this.name}: Screen sharing stopped callback triggered.`);
            // Clear interval if it's still running (e.g., user stopped via browser UI)
            if (this.screenInterval) {
                clearInterval(this.screenInterval);
                this.screenInterval = null;
            }
            // Ensure manager is disposed if it wasn't already
            if (this.screenManager?.isInitialized) {
                this.screenManager.dispose();
            }
            this.emit('screenshare_stopped'); // Notify listeners
        };

        // Initialize ScreenManager
        if (!this.screenManager) {
            this.screenManager = new ScreenManager({
                width: this.resizeWidth,
                quality: this.quality,
                onStop: handleScreenShareStop // Pass bound callback
            });
        } else {
            // Ensure previous instance is disposed if somehow left over
            if (this.screenManager.isInitialized) this.screenManager.dispose();
            // Re-assign callback to existing instance
            this.screenManager.config.onStop = handleScreenShareStop;
        }


        console.info(`${this.name}: Starting screen share...`);
        try {
            await this.screenManager.initialize(); // Prompts user for screen choice

            // Set up interval to capture and send screenshots
            this.screenInterval = setInterval(async () => {
                if (this.connected && this.screenManager?.isInitialized && this.client) {
                    try {
                        const imageBase64 = await this.screenManager.capture();
                        await this.client.sendImage(imageBase64);
                    } catch (captureSendError) {
                        console.error(`${this.name}: Error during screen capture/send interval:`, captureSendError);
                        // Consider stopping on error
                        // await this.stopScreenShare();
                        // this.emit('error', { type: 'screen_capture', details: captureSendError });
                    }
                } else {
                    console.warn(`${this.name}: Stopping screen interval due to disconnect or uninitialized manager.`);
                    await this.stopScreenShare(); // Cleanup interval and manager
                }
            }, this.captureInterval);

            console.info(`${this.name}: Screen sharing started successfully.`);
            this.emit('screenshare_started');

        } catch (error) {
            console.error(`${this.name}: Failed to start screen sharing:`, error);
            // User denying permission is common (error.name === 'NotAllowedError')
            // Don't necessarily treat denial as a critical app error.
            await this.stopScreenShare(); // Ensure cleanup on failure/denial
            this.emit('error', { type: 'screen_start', details: error });
            // Re-throw only if it's not a simple denial? Depends on desired UX.
            if (error.name !== 'NotAllowedError') {
                throw error;
            } else {
                // Silently handle denial or emit a specific 'screenshare_denied' event
                this.emit('screenshare_denied');
            }
        }
    }

    /** Stops screen sharing */
    async stopScreenShare() {
        if (!this.screenInterval && !this.screenManager?.isInitialized) {
            console.debug(`${this.name}: Screen sharing already stopped or not initialized.`);
            return; // Nothing to do
        }
        console.info(`${this.name}: Stopping screen sharing...`);
        // Clear interval first
        if (this.screenInterval) {
            clearInterval(this.screenInterval);
            this.screenInterval = null;
        }
        // Dispose manager resources (stops stream, removes elements)
        if (this.screenManager) {
            try {
                // Important: Disposing the manager might trigger the 'onStop' callback
                // if the stream track hasn't already ended.
                this.screenManager.dispose();
                // this.screenManager = null; // Optional: Nullify or keep instance
            } catch (disposeError) {
                console.error(`${this.name}: Error disposing screen manager:`, disposeError);
            }
        }
        // Ensure event is emitted even if dispose fails
        // Note: 'screenshare_stopped' might also be emitted by the onStop callback.
        // Consider adding logic to prevent double emission if needed.
        // this.emit('screenshare_stopped'); // Maybe redundant if onStop handles it
        console.info(`${this.name}: Screen sharing stopped.`);

    }

    /** Toggles screen sharing */
    async toggleScreenShare() {
        if (this.screenInterval) {
            await this.stopScreenShare();
        } else {
            if (!this.connected) {
                console.error(`${this.name}: Cannot toggle screen share on, not connected.`);
                throw new Error("Cannot toggle screen share: Not connected.");
            }
            await this.startScreenShare();
        }
    }


    // --- Audio Initialization and Control ---

    /** Initializes audio components (Context, Streamer, Visualizer, Recorder, Transcribers) */
    async initialize() {
        if (this.initialized || this.isInitializing) {
            console.warn(`${this.name}: Initialize called but already initialized or initializing.`);
            return;
        }
        if (!this.connected) {
            console.error(`${this.name}: Cannot initialize audio, not connected.`);
            throw new Error("Cannot initialize audio: Not connected.");
        }

        this.isInitializing = true;
        console.info(`${this.name}: Initializing audio components...`);

        try {
            // 1. Create Audio Context
            if (this.audioContext && this.audioContext.state !== 'closed') {
                console.warn(`${this.name}: Existing audio context found. Closing before recreating.`);
                await this.audioContext.close();
            }
            this.audioContext = new AudioContext();
            // Resume context if suspended (e.g., due to browser policy)
            if (this.audioContext.state === 'suspended') {
                console.info(`${this.name}: Audio context is suspended, attempting to resume...`);
                await this.audioContext.resume();
            }
            if (this.audioContext.state !== 'running') {
                throw new Error(`Audio context failed to start. State: ${this.audioContext.state}`);
            }
            console.debug(`${this.name}: Audio context created and running. Sample Rate: ${this.audioContext.sampleRate}`);


            // 2. Initialize Audio Streamer (for playback)
            // Re-fetch model sample rate from config in case it changed
            this._loadConfiguration();
            this.audioStreamer = new AudioStreamer(this.audioContext);
            this.audioStreamer.sampleRate = this.modelSampleRate; // Set correct rate
            await this.audioStreamer.initialize(); // Ensure context is running, set gain
            console.debug(`${this.name}: Audio streamer initialized for playback.`);


            // 3. Initialize Visualizer (optional, connects to streamer output)
            const visualizerCanvas = document.getElementById('visualizer');
            if (visualizerCanvas) {
                this.visualizer = new AudioVisualizer(this.audioContext, 'visualizer');
                // Connect streamer's gain node to visualizer's analyser
                if (this.audioStreamer.gainNode && this.visualizer.analyser) {
                    this.audioStreamer.gainNode.connect(this.visualizer.analyser);
                    this.visualizer.start();
                    console.debug(`${this.name}: Audio visualizer initialized and started.`);
                } else {
                    console.warn(`${this.name}: Could not connect visualizer.`);
                }
            } else {
                console.debug(`${this.name}: Visualizer canvas not found, skipping initialization.`);
            }


            // 4. Initialize Audio Recorder (for mic input) - Don't start stream yet
            this.audioRecorder = new AudioRecorder(); // Recorder creates its own context on start if needed
            console.debug(`${this.name}: Audio recorder instance created.`);

            // 5. Initialize Transcribers (if API key provided)
            if (this.deepgramApiKey) {
                if (this.transcribeModelsSpeech) {
                    this.modelTranscriber = new DeepgramTranscriber(this.deepgramApiKey, this.modelSampleRate);
                    await this._initializeDeepgramTranscriber(this.modelTranscriber, 'Model');
                }
                if (this.transcribeUsersSpeech) {
                    // User speech typically uses 16000 Hz for Deepgram, recorder handles resampling if needed
                    this.userTranscriber = new DeepgramTranscriber(this.deepgramApiKey, 16000);
                    await this._initializeDeepgramTranscriber(this.userTranscriber, 'User');
                }
            } else {
                console.warn(`${this.name}: No Deepgram API key provided, transcription disabled.`);
            }

            // 6. Trigger initial model message (optional)
            // Consider moving this logic outside initialize, maybe triggered by UI after init.
            // await this.client.sendText('.'); // Trigger model to speak first


            this.initialized = true;
            console.info(`${this.name}: Initialization complete.`);
            this.emit('initialized');

        } catch (error) {
            console.error(`${this.name}: Initialization failed:`, error);
            // Attempt partial cleanup on initialization failure
            await this._cleanupAudioComponents();
            // Don't call full disconnect here, as connection might still be valid
            this.initialized = false; // Ensure state reflects failure
            this.emit('error', { type: 'initialization', details: error });
            throw error; // Re-throw
        } finally {
            this.isInitializing = false;
        }
    }

    /** Helper to initialize and connect a Deepgram transcriber instance */
    async _initializeDeepgramTranscriber(transcriber, type) {
        if (!transcriber) return;
        console.info(`${this.name}: Initializing Deepgram ${type} speech transcriber...`);

        // Handle transcriptions
        transcriber.on('transcription', (transcript) => {
            const eventName = (type === 'Model') ? 'transcription' : 'user_transcription';
            this.emit(eventName, transcript);
            // console.debug(`${this.name}: ${type} speech transcription:`, transcript);
        });

        // Handle errors
        transcriber.on('error', (error) => {
            console.error(`${this.name}: Deepgram ${type} transcriber error:`, error);
            this.emit('error', { type: `transcriber_${type.toLowerCase()}`, details: error });
            // Consider attempting reconnect or notifying user
        });

        // Handle disconnects
        transcriber.on('disconnected', () => {
            console.warn(`${this.name}: Deepgram ${type} transcriber disconnected.`);
            // Clear keep-alive interval if it exists
            const intervalKey = (type === 'Model') ? 'modelsKeepAliveInterval' : 'userKeepAliveInterval';
            if (this[intervalKey]) {
                clearInterval(this[intervalKey]);
                this[intervalKey] = null;
            }
            // Consider attempting reconnect
        });

        try {
            await transcriber.connect(); // Connect to Deepgram WebSocket
            console.info(`${this.name}: Deepgram ${type} transcriber connection sequence started.`);

            // Setup keep-alive after connection (Deepgram requires this)
            const intervalKey = (type === 'Model') ? 'modelsKeepAliveInterval' : 'userKeepAliveInterval';
            // Clear any previous interval just in case
            if (this[intervalKey]) clearInterval(this[intervalKey]);

            this[intervalKey] = setInterval(() => {
                if (transcriber?.isConnected) {
                    try {
                        transcriber.ws.send(JSON.stringify({ type: 'KeepAlive' }));
                        // console.debug(`${this.name}: Sent keep-alive to ${type} transcriber.`);
                    } catch (keepAliveError) {
                        console.error(`${this.name}: Error sending keep-alive to ${type} transcriber:`, keepAliveError);
                        // Consider stopping interval or attempting reconnect
                    }
                } else {
                    // If no longer connected, clear interval
                    console.warn(`${this.name}: ${type} transcriber not connected, clearing keep-alive interval.`);
                    clearInterval(this[intervalKey]);
                    this[intervalKey] = null;
                }
            }, 10000); // Send every 10 seconds

        } catch (error) {
            console.error(`${this.name}: Failed to initialize Deepgram ${type} transcriber:`, error);
            this.emit('error', { type: `transcriber_init_${type.toLowerCase()}`, details: error });
            // Don't re-throw here, allow agent initialization to continue if possible
        }
    }


    /** Starts microphone recording and streaming */
    async startRecording() {
        // Ensure initialized and recorder exists
        if (!this.initialized || !this.audioRecorder) {
            console.error(`${this.name}: Cannot start recording, agent not initialized or recorder missing.`);
            throw new Error("Cannot start recording: Not initialized.");
        }
        if (this.audioRecorder.isRecording) {
            console.warn(`${this.name}: Recording is already active.`);
            return;
        }

        console.info(`${this.name}: Starting microphone recording...`);
        try {
            // Start recording with a callback to handle audio data
            await this.audioRecorder.start(async (base64AudioData) => {
                // Ensure still connected before sending
                if (this.client?.connected) {
                    try {
                        // Send audio to Gemini
                        await this.client.sendAudio(base64AudioData);

                        // Send to user transcriber if enabled and connected
                        if (this.userTranscriber?.isConnected) {
                            // Deepgram expects ArrayBuffer or similar, not base64
                            // Need to decode - consider modifying recorder to provide ArrayBuffer directly?
                            // For now, let's assume recorder WORKLET provides ArrayBuffer in its event
                            // And the base64 conversion happens JUST before sending to Gemini.
                            // ---> This requires modifying the recorder's message format or this callback logic.

                            // **Assumption:** Let's modify the recorder logic slightly.
                            // Assume recorder's `onmessage` provides event.data.arrayBuffer
                            // The callback here should receive that buffer.
                            // **Modification needed in AudioRecorder and its Worklet.**
                            // **Temporary Workaround (less efficient): Decode here**
                            // const audioBuffer = base64ToArrayBuffer(base64AudioData); // If needed
                            // this.userTranscriber.sendAudio(new Uint8Array(audioBuffer));

                            // **Better:** Modify AudioRecorder to have callback(arrayBuffer)
                            // Assuming callback now receives arrayBuffer:
                            // this.userTranscriber.sendAudio(new Uint8Array(arrayBuffer));

                            // **Current State:** Callback receives base64. Let's skip sending to userTranscriber for now.
                            console.warn("Need to refactor AudioRecorder callback to provide ArrayBuffer for efficient Deepgram user transcription.");


                        }
                    } catch (sendError) {
                        console.error(`${this.name}: Error sending recorded audio:`, sendError);
                        // Consider stopping recording on send errors?
                        // await this.audioRecorder.stop();
                        // this.emit('error', { type: 'audio_send', details: sendError });
                    }
                } else {
                    console.warn(`${this.name}: Not connected, stopping audio recording.`);
                    await this.audioRecorder.stop(); // Stop recorder if WS disconnects
                }
            });
            console.info(`${this.name}: Microphone recording started.`);
            this.emit('recording_started');

        } catch (error) {
            console.error(`${this.name}: Failed to start microphone recording:`, error);
            this.emit('error', { type: 'recording_start', details: error });
            throw error; // Re-throw for UI
        }
    }

    /** Stops microphone recording */
    async stopRecording() {
        if (!this.audioRecorder || !this.audioRecorder.isRecording) {
            console.debug(`${this.name}: Recording already stopped or recorder not initialized.`);
            return;
        }
        console.info(`${this.name}: Stopping microphone recording...`);
        try {
            await this.audioRecorder.stop(); // Handles stream tracks and context
            console.info(`${this.name}: Microphone recording stopped.`);
            this.emit('recording_stopped');
        } catch (error) {
            console.error(`${this.name}: Error stopping recording:`, error);
            this.emit('error', { type: 'recording_stop', details: error });
            // Don't re-throw, usually safe to ignore stop errors?
        }
    }

    /** Toggles microphone recording (start/stop) */
    async toggleMic() {
        if (!this.initialized) {
            console.error(`${this.name}: Cannot toggle mic, agent not initialized.`);
            throw new Error("Cannot toggle mic: Not initialized.");
        }
        if (!this.audioRecorder) {
            console.error(`${this.name}: Cannot toggle mic, audio recorder not available.`);
            throw new Error("Cannot toggle mic: Recorder not found.");
        }

        // If stream doesn't exist yet, start it. Otherwise, toggle suspend/resume.
        if (!this.audioRecorder.stream) {
            // Start recording for the first time
            await this.startRecording();
        } else {
            // Toggle suspend/resume using recorder's method
            try {
                await this.audioRecorder.toggleMic(); // Handles suspend/resume/state tracking
                const suspended = this.audioRecorder.isSuspended;
                console.info(`${this.name}: Microphone ${suspended ? 'suspended' : 'resumed'}.`);
                this.emit(suspended ? 'mic_suspended' : 'mic_resumed');
            } catch (error) {
                console.error(`${this.name}: Error toggling mic suspend/resume:`, error);
                this.emit('error', { type: 'mic_toggle', details: error });
                throw error;
            }
        }
    }

    // --- Cleanup ---

    /** Cleans up a specific interval timer */
    _clearInterval(intervalKey) {
        if (this[intervalKey]) {
            clearInterval(this[intervalKey]);
            this[intervalKey] = null;
            // console.debug(`${this.name}: Cleared interval: ${intervalKey}`);
        }
    }

    /** Stops and cleans up audio components */
    async _cleanupAudioComponents() {
        console.debug(`${this.name}: Cleaning up audio components...`);
        let hadError = false;

        // Stop recorder first
        try {
            if (this.audioRecorder?.isRecording) {
                await this.audioRecorder.stop();
            }
            // Nullify recorder instance? Or keep it? Keeping it for now.
        } catch (e) { console.error(`${this.name}: Error stopping audio recorder:`, e); hadError = true; }

        // Stop visualizer
        try {
            if (this.visualizer) {
                this.visualizer.stop();
                this.visualizer.cleanup(); // Disconnects analyser
                this.visualizer = null;
            }
        } catch (e) { console.error(`${this.name}: Error cleaning up visualizer:`, e); hadError = true; }

        // Stop audio streamer
        try {
            if (this.audioStreamer) {
                this.audioStreamer.stop();
                // Nullify streamer instance? Or keep it? Keeping it.
            }
        } catch (e) { console.error(`${this.name}: Error stopping audio streamer:`, e); hadError = true; }

        // Disconnect transcribers and clear keep-alives
        try {
            if (this.modelTranscriber?.isConnected) this.modelTranscriber.disconnect();
            this._clearInterval('modelsKeepAliveInterval');
            // this.modelTranscriber = null; // Keep instance?
        } catch (e) { console.error(`${this.name}: Error disconnecting model transcriber:`, e); hadError = true; }
        try {
            if (this.userTranscriber?.isConnected) this.userTranscriber.disconnect();
            this._clearInterval('userKeepAliveInterval');
            // this.userTranscriber = null; // Keep instance?
        } catch (e) { console.error(`${this.name}: Error disconnecting user transcriber:`, e); hadError = true; }


        // Close audio context last
        try {
            if (this.audioContext && this.audioContext.state !== 'closed') {
                await this.audioContext.close();
                this.audioContext = null;
            }
        } catch (e) { console.error(`${this.name}: Error closing audio context:`, e); hadError = true; }

        console.debug(`${this.name}: Audio components cleanup ${hadError ? 'finished with errors' : 'complete'}.`);
    }

    /** Gracefully disconnects WebSocket, stops media, and cleans up all resources */
    async disconnect() {
        if (this.isDisconnecting) {
            console.warn(`${this.name}: Disconnect already in progress.`);
            return;
        }
        if (!this.connected && !this.initialized && !this.client) {
            console.info(`${this.name}: Already disconnected and cleaned up.`);
            return; // Nothing to do
        }

        this.isDisconnecting = true;
        console.info(`${this.name}: Disconnecting and cleaning up resources...`);

        try {
            // 1. Stop media capture (these handle their own intervals and managers)
            await this.stopCameraCapture();
            await this.stopScreenShare();

            // 2. Stop WebSocket client communication first to prevent further incoming/outgoing messages
            if (this.client) {
                this.client.disconnect(); // Use client's disconnect logic
                this.client = null; // Nullify the client instance
            }

            // 3. Clean up audio components (recorder, streamer, visualizer, transcribers, context)
            await this._cleanupAudioComponents();

            // 4. Reset state flags
            this.initialized = false;
            this.connected = false;

            console.info(`${this.name}: Disconnect and cleanup complete.`);
            // Emit disconnected event *after* cleanup if not already emitted by client
            this.emit('disconnected', { code: 1000, reason: "Client initiated disconnect" });

        } catch (error) {
            console.error(`${this.name}: Error during disconnect process:`, error);
            this.emit('error', { type: 'disconnect', details: error });
            // Still attempt to set state flags to disconnected/uninitialized
            this.initialized = false;
            this.connected = false;
        } finally {
            this.isDisconnecting = false; // Ensure flag is reset
        }
    }


    // --- Event Emitter ---

    /** Registers an event listener */
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error(`${this.name}: Attempted to register non-function listener for event "${eventName}"`);
            return;
        }
        // Initialize map if it doesn't exist
        if (!this._eventListeners) {
            this._eventListeners = new Map();
        }
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, []);
        }
        this._eventListeners.get(eventName).push(callback);
        // console.debug(`${this.name}: Listener registered for event "${eventName}"`);
    }

    /** Removes an event listener */
    off(eventName, callback) {
        if (!this._eventListeners || !this._eventListeners.has(eventName)) {
            return; // No listeners for this event
        }
        const listeners = this._eventListeners.get(eventName);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
            // console.debug(`${this.name}: Listener removed for event "${eventName}"`);
            // Optionally remove the event entry if no listeners remain
            if (listeners.length === 0) {
                this._eventListeners.delete(eventName);
            }
        }
    }


    /** Emits an event to all registered listeners */
    emit(eventName, data) {
        if (!this._eventListeners || !this._eventListeners.has(eventName)) {
            // console.debug(`${this.name}: Emitted event "${eventName}" but no listeners registered.`);
            return; // No listeners for this event
        }
        // Create copy of listeners array in case a listener modifies the original array during execution
        const listeners = [...this._eventListeners.get(eventName)];
        // console.debug(`${this.name}: Emitting event "${eventName}" to ${listeners.length} listener(s). Data:`, data);
        for (const callback of listeners) {
            try {
                callback(data);
            } catch (error) {
                console.error(`${this.name}: Error in listener for event "${eventName}":`, error);
                // Continue notifying other listeners
            }
        }
    }
    /** Toggles text-to-speech for model responses */
    async toggleTTS() {
        this.ttsMuted = !this.ttsMuted;

        // Ensure audio context is resumed when enabling TTS
        if (!this.ttsMuted && this.audioContext && this.audioContext.state !== 'running') {
            try {
                await this.audioContext.resume();
                console.info(`${this.name}: Audio context resumed for TTS.`);
            } catch (error) {
                console.error(`${this.name}: Failed to resume audio context for TTS:`, error);
            }
        }

        // The next model response will use the updated value
        console.info(`${this.name}: Text-to-speech ${this.ttsMuted ? 'disabled' : 'enabled'}.`);
        return this.ttsMuted;
    }
}