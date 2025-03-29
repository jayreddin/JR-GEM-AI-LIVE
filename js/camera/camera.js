/**
 * Manages camera access using getUserMedia, displays a preview,
 * captures frames, resizes them on a canvas, and provides base64 encoded images.
 * Includes logic for switching cameras on mobile devices.
 */
export class CameraManager {
    /**
     * Creates a CameraManager instance.
     * @param {Object} config - Configuration options.
     * @param {number} [config.width=640] - Target width for the captured image canvas. Height is calculated by aspect ratio.
     * @param {number} [config.quality=0.8] - JPEG quality for the output image (0.0 to 1.0).
     * @param {string} [config.facingMode='environment'] - Preferred camera facing mode ('user' or 'environment'). Defaults to 'environment'.
     */
    constructor(config = {}) {
        // Default configuration merged with provided config
        this.config = {
            width: parseInt(config.width, 10) || 640,
            quality: parseFloat(config.quality) || 0.8,
            // Use provided facingMode, default to environment (usually back camera)
            facingMode: config.facingMode || 'environment'
        };
        // Validate config values
        if (isNaN(this.config.width) || this.config.width <= 0) this.config.width = 640;
        if (isNaN(this.config.quality) || this.config.quality < 0 || this.config.quality > 1) this.config.quality = 0.8;
        if (!['user', 'environment'].includes(this.config.facingMode)) this.config.facingMode = 'environment';


        // DOM Elements (initialized later)
        this.stream = null;         // MediaStream from getUserMedia
        this.videoElement = null;   // <video> element for preview
        this.canvas = null;         // <canvas> element for processing frames
        this.ctx = null;            // 2D rendering context for the canvas
        this.previewContainer = null; // Container div for the video preview
        this.switchButton = null;   // Button to switch cameras (mobile only)

        // State
        this.isInitialized = false; // Flag: Has initialize() successfully completed?
        this.isInitializing = false; // Flag: Is initialize() currently running?
        this.aspectRatio = null;    // Aspect ratio of the video stream

        console.info(`CameraManager created. Config:`, this.config);
    }

    /**
     * Initializes the camera: requests permission, gets the media stream,
     * creates video and canvas elements, and sets up the preview.
     * @returns {Promise<void>} Resolves when initialization is complete.
     * @throws {Error} If initialization fails (e.g., permission denied, no camera found).
     */
    async initialize() {
        if (this.isInitialized || this.isInitializing) {
            console.warn("CameraManager: Initialize called but already initialized or initializing.");
            return;
        }
        // Check for necessary browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("CameraManager Error: getUserMedia API not supported.");
            throw new Error("Camera access (getUserMedia) is not supported by your browser.");
        }

        this.isInitializing = true;
        console.info("CameraManager: Initializing...");

        try {
            // --- Request Camera Access ---
            const constraints = {
                video: {
                    // Request preferred dimensions, browser might adjust
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    // Use configured facing mode
                    facingMode: this.config.facingMode
                },
                audio: false // No audio needed for camera capture
            };
            console.debug("CameraManager: Requesting getUserMedia with constraints:", constraints);
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.info("CameraManager: getUserMedia access granted.");

            // --- Create Video Element for Preview ---
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            this.videoElement.muted = true; // Mute to prevent feedback loops if audio was accidentally requested
            this.videoElement.playsInline = true; // Important for mobile playback without fullscreen

            // --- Setup Preview Container ---
            this.previewContainer = document.getElementById('cameraPreview'); // Get container from HTML
            if (this.previewContainer) {
                this.previewContainer.innerHTML = ''; // Clear previous content
                this.previewContainer.appendChild(this.videoElement);
                this._createSwitchButton(); // Add switch button if applicable
                this.showPreview(); // Make container visible
            } else {
                console.warn("CameraManager: Preview container (#cameraPreview) not found in DOM. Preview will not be displayed.");
            }

            // --- Play Video and Get Dimensions ---
            // Wait for video metadata to load to get correct dimensions
            await new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    console.debug("CameraManager: Video metadata loaded.");
                    resolve();
                };
                this.videoElement.onerror = (e) => {
                    console.error("CameraManager: Video element error:", e);
                    reject(new Error("Failed to load video metadata."));
                };
                // Start playing the video stream
                this.videoElement.play().catch(playError => {
                    console.error("CameraManager: Video play() failed:", playError);
                    reject(new Error(`Failed to play video stream: ${playError.message}`));
                });
            });


            // Get actual dimensions after metadata is loaded
            const videoWidth = this.videoElement.videoWidth;
            const videoHeight = this.videoElement.videoHeight;
            if (!videoWidth || !videoHeight) {
                throw new Error("Failed to get video dimensions after playback started.");
            }
            this.aspectRatio = videoHeight / videoWidth;
            console.debug(`CameraManager: Video dimensions: ${videoWidth}x${videoHeight}, Aspect Ratio: ${this.aspectRatio.toFixed(2)}`);

            // --- Create Canvas for Frame Processing ---
            // Calculate canvas size maintaining aspect ratio based on configured width
            const canvasWidth = this.config.width;
            const canvasHeight = Math.round(canvasWidth * this.aspectRatio);
            this.canvas = document.createElement('canvas');
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error("Failed to get 2D context from canvas.");
            }
            console.debug(`CameraManager: Processing canvas created (${canvasWidth}x${canvasHeight}).`);

            // --- Finalize Initialization ---
            this.isInitialized = true;
            console.info("CameraManager: Initialization successful.");

        } catch (error) {
            console.error("CameraManager: Initialization failed:", error);
            // Attempt cleanup of any partially created resources
            await this.dispose(); // Dispose should handle partial states
            this.isInitialized = false; // Ensure state reflects failure
            // Re-throw the specific error for the caller (e.g., agent) to handle
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                throw new Error(`Camera permission denied. Please grant access in browser settings. (${error.message})`);
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                throw new Error(`No suitable camera found or camera is unavailable. (${error.message})`);
            } else {
                throw new Error(`Failed to initialize camera: ${error.message}`);
            }
        } finally {
            this.isInitializing = false; // Ensure flag is reset
        }
    }

    /**
     * Captures the current video frame, draws it to the canvas (resizing),
     * and returns it as a base64 encoded JPEG string (without the data: prefix).
     * @returns {Promise<string>} Base64 encoded JPEG image data.
     * @throws {Error} If not initialized or capture fails.
     */
    async capture() {
        if (!this.isInitialized || !this.ctx || !this.videoElement) {
            console.error("CameraManager.capture Error: Not initialized or required elements missing.");
            throw new Error('Camera capture failed: Manager is not initialized.');
        }
        // Check if video is paused or ended unexpectedly
        if (this.videoElement.paused || this.videoElement.ended) {
            console.warn("CameraManager.capture Warning: Video stream seems paused or ended.");
            // Optionally try to play again? Or just return error?
            // await this.videoElement.play().catch(e => console.error("Failed to replay video on capture:", e));
            throw new Error('Camera capture failed: Video stream not active.');
        }

        try {
            // Draw the current frame from the video element onto the canvas
            this.ctx.drawImage(
                this.videoElement,
                0, 0, // Start drawing at top-left corner of canvas
                this.canvas.width, // Draw width (scaled width)
                this.canvas.height // Draw height (scaled height)
            );

            // Convert the canvas content to a base64 encoded JPEG image
            const dataUrl = this.canvas.toDataURL('image/jpeg', this.config.quality);
            // Remove the "data:image/jpeg;base64," prefix
            const base64Data = dataUrl.split(',')[1];
            if (!base64Data) {
                throw new Error("Failed to generate base64 data from canvas.");
            }
            return base64Data;

        } catch (error) {
            console.error("CameraManager: Error during frame capture/encoding:", error);
            throw new Error(`Frame capture failed: ${error.message}`);
        }
    }

    /** Stops the camera stream and cleans up all associated resources (video, canvas, listeners). */
    async dispose() {
        console.info("CameraManager: Disposing resources...");
        // Stop the media stream tracks first
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                // console.debug(`CameraManager: Stopped track ${track.id}`);
            });
            this.stream = null; // Release reference
        }

        // Clean up video element
        if (this.videoElement) {
            try {
                this.videoElement.pause(); // Pause video
                this.videoElement.srcObject = null; // Remove stream reference
                if (this.videoElement.parentNode) {
                    this.videoElement.parentNode.removeChild(this.videoElement); // Remove from DOM
                }
            } catch (e) { console.warn("Error cleaning up video element:", e); }
            this.videoElement = null;
        }

        // Clean up preview container content and hide
        if (this.previewContainer) {
            try {
                this.hidePreview(); // Hide container if visible
                this.previewContainer.innerHTML = ''; // Clear content (removes switch button too)
            } catch (e) { console.warn("Error cleaning up preview container:", e); }
            // Keep reference to container itself? Maybe not needed if re-created on init.
            // this.previewContainer = null;
        }
        // Explicitly nullify button reference
        this.switchButton = null;


        // Clean up canvas and context
        this.canvas = null;
        this.ctx = null;

        // Reset state flags
        this.isInitialized = false;
        this.isInitializing = false; // Ensure reset if dispose called during init failure
        this.aspectRatio = null;
        console.info("CameraManager: Dispose complete.");
    }

    /** Shows the camera preview container. */
    showPreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'block'; // Or 'flex', 'grid' depending on layout
            this.previewContainer.setAttribute('aria-hidden', 'false');
        }
    }

    /** Hides the camera preview container. */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
            this.previewContainer.setAttribute('aria-hidden', 'true');
        }
    }

    /** Creates and appends the camera switch button (for mobile). */
    _createSwitchButton() {
        // Only create button on likely mobile devices (basic check)
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            // console.debug("CameraManager: Not creating switch button on non-mobile device.");
            return;
        }
        // Ensure container exists and button doesn't already exist
        if (!this.previewContainer || this.switchButton) {
            return;
        }

        try {
            this.switchButton = document.createElement('button');
            this.switchButton.className = 'camera-switch-btn'; // For CSS styling
            this.switchButton.innerHTML = '⟲'; // Cycle icon
            this.switchButton.setAttribute('aria-label', 'Switch Camera');
            this.switchButton.addEventListener('click', () => this.switchCamera()); // Use arrow function for correct 'this'
            this.previewContainer.appendChild(this.switchButton);
            console.debug("CameraManager: Switch camera button created.");
        } catch (error) {
            console.error("CameraManager: Error creating switch button:", error);
            this.switchButton = null; // Ensure reference is null on failure
        }
    }

    /**
     * Attempts to switch between front ('user') and back ('environment') cameras.
     * This typically only works on mobile devices. Re-initializes the stream.
     */
    async switchCamera() {
        if (!this.isInitialized) {
            console.warn("CameraManager: Cannot switch camera, not initialized.");
            return;
        }
        // Check if switching is likely supported (mobile)
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            console.warn("CameraManager: Camera switching is generally only supported on mobile devices.");
            return;
        }


        const oldFacingMode = this.config.facingMode;
        const newFacingMode = oldFacingMode === 'user' ? 'environment' : 'user';
        console.info(`CameraManager: Attempting to switch camera from ${oldFacingMode} to ${newFacingMode}...`);

        // Store new preference immediately
        localStorage.setItem('facingMode', newFacingMode);
        this.config.facingMode = newFacingMode;

        // We need to stop the current stream and re-initialize with the new constraint.
        // Temporarily set flags to allow re-initialization.
        const wasInitialized = this.isInitialized;
        this.isInitialized = false; // Allow initialize() to run again
        if (this.isInitializing) {
            console.warn("CameraManager: switchCamera called while already initializing.");
            return; // Avoid conflict
        }

        // Dispose current resources *before* trying to get new stream
        await this.dispose();

        try {
            // Re-initialize with the new facing mode stored in this.config
            await this.initialize();
            console.info(`CameraManager: Camera switched successfully to ${newFacingMode}.`);
        } catch (error) {
            console.error(`CameraManager: Failed to switch camera to ${newFacingMode}:`, error);
            // Revert facing mode config on failure
            this.config.facingMode = oldFacingMode;
            localStorage.setItem('facingMode', oldFacingMode);
            // Attempt to re-initialize with the *old* settings if possible
            console.info(`CameraManager: Attempting to revert to ${oldFacingMode} camera...`);
            this.isInitialized = false; // Ensure we can init again
            try {
                if (wasInitialized) await this.initialize(); // Only try if it was working before
            } catch (revertError) {
                console.error(`CameraManager: Failed to revert to previous camera (${oldFacingMode}):`, revertError);
            }
            // Notify user of failure?
            alert(`Failed to switch camera. Please ensure permissions are granted and the camera is available.`);
        }
    }


    /**
     * Gets the current canvas dimensions used for processing.
     * @returns {{width: number, height: number} | null} Dimensions object or null if not initialized.
     */
    getDimensions() {
        if (!this.isInitialized || !this.canvas) {
            // console.warn('CameraManager.getDimensions called before initialization.');
            return null;
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}