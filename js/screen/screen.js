/**
 * Manages screen capture using getDisplayMedia, displays a preview,
 * captures frames, resizes them on a canvas, and provides base64 encoded images.
 * Includes handling for when the user stops sharing via browser controls.
 */
export class ScreenManager {
    /**
     * Creates a ScreenManager instance.
     * @param {Object} config - Configuration options.
     * @param {number} [config.width=1280] - Target width for the captured image canvas. Height is calculated by aspect ratio.
     * @param {number} [config.quality=0.8] - JPEG quality for the output image (0.0 to 1.0).
     * @param {Function} [config.onStop] - Optional callback function executed when screen sharing stops (either via dispose() or browser controls).
     */
    constructor(config = {}) {
        // Default configuration merged with provided config
        this.config = {
            width: parseInt(config.width, 10) || 1280,
            quality: parseFloat(config.quality) || 0.8,
            onStop: typeof config.onStop === 'function' ? config.onStop : null
        };
        // Validate config values
        if (isNaN(this.config.width) || this.config.width <= 0) this.config.width = 1280;
        if (isNaN(this.config.quality) || this.config.quality < 0 || this.config.quality > 1) this.config.quality = 0.8;


        // DOM Elements (initialized later)
        this.stream = null;         // MediaStream from getDisplayMedia
        this.videoElement = null;   // <video> element for preview
        this.canvas = null;         // <canvas> element for processing frames
        this.ctx = null;            // 2D rendering context for the canvas
        this.previewContainer = null; // Container div for the video preview

        // State
        this.isInitialized = false; // Flag: Has initialize() successfully completed?
        this.isInitializing = false; // Flag: Is initialize() currently running?
        this.aspectRatio = null;    // Aspect ratio of the screen share video stream

        // Internal flag to prevent double calling onStop
        this._onStopCalled = false;

        console.info(`ScreenManager created. Config:`, this.config);
    }

    /**
     * Initializes screen capture: prompts the user to select a screen/window,
     * gets the media stream, creates video and canvas elements, and sets up the preview.
     * @returns {Promise<void>} Resolves when initialization is complete.
     * @throws {Error} If initialization fails (e.g., permission denied, browser incompatibility).
     */
    async initialize() {
        if (this.isInitialized || this.isInitializing) {
            console.warn("ScreenManager: Initialize called but already initialized or initializing.");
            return;
        }
        // Check for necessary browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            console.error("ScreenManager Error: getDisplayMedia API not supported.");
            throw new Error("Screen sharing (getDisplayMedia) is not supported by your browser.");
        }

        this.isInitializing = true;
        this._onStopCalled = false; // Reset flag on new initialization attempt
        console.info("ScreenManager: Initializing...");

        try {
            // --- Request Screen Share Access ---
            const constraints = {
                video: {
                    // Common options for screen sharing
                    cursor: "always", // Show cursor in the captured video
                    // width: { max: 1920 }, // Optional: Limit resolution if needed
                    // height: { max: 1080 }
                },
                audio: false // Typically no audio needed/requested for screen share itself
            };
            console.debug("ScreenManager: Requesting getDisplayMedia with constraints:", constraints);
            this.stream = await navigator.mediaDevices.getDisplayMedia(constraints);
            console.info("ScreenManager: getDisplayMedia access granted.");

            // --- Setup Video Element ---
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            // Video element should be muted for screen share, playsInline is good practice
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;

            // --- Setup Preview Container ---
            this.previewContainer = document.getElementById('screenPreview'); // Get container from HTML
            if (this.previewContainer) {
                this.previewContainer.innerHTML = ''; // Clear previous content
                this.previewContainer.appendChild(this.videoElement);
                this.showPreview(); // Make container visible
            } else {
                console.warn("ScreenManager: Preview container (#screenPreview) not found in DOM. Preview will not be displayed.");
            }

            // --- Play Video and Get Dimensions ---
            // Wait for video metadata
            await new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = resolve;
                this.videoElement.onerror = (_error) => reject(new Error("Failed to load screen share video metadata.")); // Use _error
                this.videoElement.play().catch(playError => {
                    console.error("ScreenManager: Video play() failed:", playError);
                    reject(new Error(`Failed to play screen share stream: ${playError.message}`));
                });
            });
            console.debug("ScreenManager: Video metadata loaded and playback started.");


            // Get actual dimensions
            const videoWidth = this.videoElement.videoWidth;
            const videoHeight = this.videoElement.videoHeight;
            if (!videoWidth || !videoHeight) {
                throw new Error("Failed to get screen share video dimensions.");
            }
            this.aspectRatio = videoHeight / videoWidth;
            console.debug(`ScreenManager: Video dimensions: ${videoWidth}x${videoHeight}, Aspect Ratio: ${this.aspectRatio.toFixed(2)}`);

            // --- Create Canvas ---
            const canvasWidth = this.config.width;
            const canvasHeight = Math.round(canvasWidth * this.aspectRatio);
            this.canvas = document.createElement('canvas');
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error("Failed to get 2D context from canvas.");
            }
            console.debug(`ScreenManager: Processing canvas created (${canvasWidth}x${canvasHeight}).`);

            // --- Listen for User Stopping Share via Browser UI ---
            // The 'ended' event fires on the MediaStreamTrack when sharing stops
            const videoTracks = this.stream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks[0].addEventListener('ended', () => {
                    console.info("ScreenManager: Screen share track ended (likely stopped by user via browser UI).");
                    // Call dispose to ensure full cleanup and trigger onStop callback
                    this.dispose();
                });
                console.debug("ScreenManager: 'ended' event listener added to video track.");
            } else {
                console.warn("ScreenManager: No video track found in the stream to attach 'ended' listener.");
            }


            // --- Finalize Initialization ---
            this.isInitialized = true;
            console.info("ScreenManager: Initialization successful.");

        } catch (error) {
            console.error("ScreenManager: Initialization failed:", error);
            await this.dispose(); // Attempt cleanup
            this.isInitialized = false;
            // Handle specific errors, especially user denial
            if (error.name === 'NotAllowedError' || error.message === 'Permission denied') {
                // User likely clicked "Cancel" or denied permission
                throw new Error(`Screen sharing permission denied or cancelled by user. (${error.message})`);
            } else {
                throw new Error(`Failed to initialize screen sharing: ${error.message}`);
            }
        } finally {
            this.isInitializing = false; // Reset flag
        }
    }

    /**
     * Captures the current screen share frame, draws it to the canvas (resizing),
     * and returns it as a base64 encoded JPEG string (without the data: prefix).
     * @returns {Promise<string>} Base64 encoded JPEG image data.
     * @throws {Error} If not initialized or capture fails.
     */
    async capture() {
        if (!this.isInitialized || !this.ctx || !this.videoElement) {
            console.error("ScreenManager.capture Error: Not initialized or required elements missing.");
            throw new Error('Screen capture failed: Manager is not initialized.');
        }
        // Check if video stream is still active
        if (this.videoElement.paused || this.videoElement.ended || !this.stream?.active) {
            console.warn("ScreenManager.capture Warning: Screen share stream seems inactive or ended.");
            // Attempt cleanup as the stream is likely dead
            await this.dispose();
            throw new Error('Screen capture failed: Stream is not active.');
        }

        try {
            // Draw the current frame
            this.ctx.drawImage(
                this.videoElement,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );

            // Convert to base64
            const dataUrl = this.canvas.toDataURL('image/jpeg', this.config.quality);
            const base64Data = dataUrl.split(',')[1];
            if (!base64Data) {
                throw new Error("Failed to generate base64 data from screen capture canvas.");
            }
            return base64Data;

        } catch (error) {
            console.error("ScreenManager: Error during frame capture/encoding:", error);
            throw new Error(`Screen frame capture failed: ${error.message}`);
        }
    }

    /**
     * Stops the screen sharing stream and cleans up all associated resources.
     * Calls the `onStop` callback if provided and if not already called by the 'ended' event.
     */
    async dispose() {
        // Check if already disposed to prevent redundant calls
        if (!this.isInitialized && !this.stream) {
            // console.debug("ScreenManager: Dispose called but already disposed or not initialized.");
            return;
        }
        console.info("ScreenManager: Disposing resources...");

        // 1. Stop MediaStream Tracks
        if (this.stream) {
            // Remove 'ended' listener before stopping tracks to avoid potential race condition with onStop call
            const videoTracks = this.stream.getVideoTracks();
            if (videoTracks.length > 0) {
                // Note: Removing the listener might be complex if the reference isn't stored.
                // Instead, we use the _onStopCalled flag to prevent double execution.
                // videoTracks[0].removeEventListener('ended', ???); // Difficult without stored reference
            }

            this.stream.getTracks().forEach(track => {
                track.stop();
                // console.debug(`ScreenManager: Stopped track ${track.id}`);
            });
            this.stream = null;
        }

        // 2. Clean up Video Element
        if (this.videoElement) {
            try {
                this.videoElement.pause();
                this.videoElement.srcObject = null;
                if (this.videoElement.parentNode) {
                    this.videoElement.parentNode.removeChild(this.videoElement);
                }
            } catch (_error) { console.warn("Error cleaning up screen share video element:", _error); } // Use _error
            this.videoElement = null;
        }

        // 3. Clean up Preview Container
        if (this.previewContainer) {
            try {
                this.hidePreview();
                this.previewContainer.innerHTML = '';
            } catch (_error) { console.warn("Error cleaning up screen preview container:", _error); } // Use _error
            // this.previewContainer = null; // Keep or nullify? Keep for now.
        }

        // 4. Clean up Canvas
        this.canvas = null;
        this.ctx = null;

        // 5. Reset State Flags
        this.isInitialized = false;
        this.isInitializing = false;
        this.aspectRatio = null;

        // 6. Call onStop Callback (if provided and not already called by 'ended' listener)
        if (this.config.onStop && !this._onStopCalled) {
            console.info("ScreenManager: Calling onStop callback via dispose().");
            try {
                this.config.onStop();
            } catch (callbackError) {
                console.error("ScreenManager: Error executing onStop callback:", callbackError);
            }
            this._onStopCalled = true; // Mark as called
        } else if (this.config.onStop && this._onStopCalled) {
            console.debug("ScreenManager: onStop callback already called (likely by track 'ended' event).");
        }


        console.info("ScreenManager: Dispose complete.");
    }

    /** Shows the screen preview container. */
    showPreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'block'; // Or other appropriate display value
            this.previewContainer.setAttribute('aria-hidden', 'false');
        }
    }

    /** Hides the screen preview container. */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
            this.previewContainer.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Gets the current canvas dimensions used for processing.
     * @returns {{width: number, height: number} | null} Dimensions object or null if not initialized.
     */
    getDimensions() {
        if (!this.isInitialized || !this.canvas) {
            return null;
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}