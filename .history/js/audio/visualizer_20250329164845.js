/**
 * AudioVisualizer creates a waveform visualization for an audio stream
 * using the Web Audio API's AnalyserNode and rendering onto an HTML Canvas.
 */
export class AudioVisualizer {
    /**
     * Creates an AudioVisualizer instance.
     * @param {AudioContext} audioContext - The Web Audio API context. Must be running.
     * @param {string} canvasId - The ID attribute of the HTML <canvas> element to draw on.
     * @throws {Error} If AudioContext is invalid, canvas element is not found, or 2D context cannot be obtained.
     */
    constructor(audioContext, canvasId) {
        if (!audioContext || !(audioContext instanceof AudioContext) || audioContext.state !== 'running') {
            throw new Error(`AudioVisualizer: Invalid or non-running AudioContext provided. State: ${audioContext?.state}`);
        }
        this.audioContext = audioContext;

        // Get Canvas and Context
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas || !(this.canvas instanceof HTMLCanvasElement)) {
            throw new Error(`AudioVisualizer: Canvas element with ID "${canvasId}" not found or is not a canvas.`);
        }
        try {
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error("Failed to get 2D rendering context from canvas.");
            }
        } catch (error) {
            console.error("AudioVisualizer: Error getting 2D context:", error);
            throw new Error(`Failed to get 2D context: ${error.message}`);
        }


        // Web Audio Analyser Node Setup
        try {
            this.analyser = this.audioContext.createAnalyser();
            // FFT size determines frequency resolution (power of 2)
            this.analyser.fftSize = 1024; // Lower value might improve performance slightly
            // Smoothing averages frames for visual stability (0=none, 1=max)
            this.analyser.smoothingTimeConstant = 0.85;
            // Number of data points available from the analyser (half FFT size)
            this.bufferLength = this.analyser.frequencyBinCount;
            // Uint8Array to hold time-domain (waveform) data (values 0-255)
            this.dataArray = new Uint8Array(this.bufferLength);
            // Store previous frame's data for smoothing interpolation
            this.prevDataArray = new Uint8Array(this.bufferLength);
            console.debug(`AudioVisualizer: AnalyserNode created. Buffer length: ${this.bufferLength}`);
        } catch (error) {
            console.error("AudioVisualizer: Error creating AnalyserNode:", error);
            throw new Error(`Failed to create AnalyserNode: ${error.message}`);
        }


        // Visualization Settings
        this.gradientColors = ['#4CAF50', '#81C784', '#A5D6A7']; // Green shades for gradient
        this.lineWidth = 3; // Line thickness
        this.padding = 20; // Padding around the visualization within the canvas
        this.smoothingFactor = 0.4; // Interpolation factor (0=use previous, 1=use current)

        // Animation State
        this.isAnimating = false; // Flag: Is the draw loop currently running?
        this.animationId = null; // ID returned by requestAnimationFrame, used for cancellation

        // Bind methods for consistent 'this' context, especially for event listeners/callbacks
        this.draw = this.draw.bind(this);
        this.resize = this.resize.bind(this);

        // Initial Setup
        this._createGradient(); // Create the initial gradient based on canvas size
        this.resize(); // Perform initial resize to fit container
        window.addEventListener('resize', this.resize); // Add listener for window resize events

        console.info(`AudioVisualizer initialized for canvas "#${canvasId}".`);
    }

    /**
     * Checks if the visualizer is properly initialized (context, canvas, analyser).
     * @returns {boolean} True if initialized, false otherwise.
     */
    isInitialized() {
        return !!(this.audioContext && this.canvas && this.ctx && this.analyser);
    }

    /**
     * Connects an audio source node (like a GainNode or MediaElementAudioSourceNode)
     * to the visualizer's AnalyserNode.
     * @param {AudioNode} sourceNode - The Web Audio API node providing the audio data.
     * @throws {Error} If connection fails.
     */
    connectSource(sourceNode) {
        if (!this.isInitialized()) {
            console.error("AudioVisualizer.connectSource Error: Not initialized.");
            return;
        }
        if (!sourceNode || typeof sourceNode.connect !== 'function') {
            console.error("AudioVisualizer.connectSource Error: Invalid sourceNode provided.", sourceNode);
            throw new Error("Invalid audio source node provided for connection.");
        }
        try {
            // Disconnect previous source if any? Or allow multiple connections? Assuming single source for now.
            // If analyser was previously connected, disconnect first? Depends on use case.
            // this.analyser.disconnect(); // Uncomment if needed

            sourceNode.connect(this.analyser);
            console.info(`AudioVisualizer: Source node connected to AnalyserNode.`);
        } catch (error) {
            console.error("AudioVisualizer: Error connecting source node to analyser:", error);
            throw new Error(`Failed to connect audio source: ${error.message}`);
        }
    }

    /** Starts the visualization animation loop. */
    start() {
        if (!this.isInitialized()) {
            console.error("AudioVisualizer.start Error: Cannot start, not initialized.");
            return;
        }
        if (this.isAnimating) {
            // console.debug("AudioVisualizer.start: Animation already running.");
            return;
        }
        this.isAnimating = true;
        console.info("AudioVisualizer: Starting animation loop...");
        this.draw(); // Start the recursive draw loop
    }

    /** Stops the visualization animation loop and clears the canvas. */
    stop() {
        if (!this.isAnimating) {
            // console.debug("AudioVisualizer.stop: Animation already stopped.");
            return;
        }
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId); // Stop the animation loop
            this.animationId = null;
        }
        // Clear the canvas when stopped
        if (this.ctx && this.canvas) {
            try {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            } catch (_error) { console.warn("Error clearing canvas on stop:", _error); } // Use _error
        }
        console.info("AudioVisualizer: Stopped animation loop.");
    }

    /** Creates (or re-creates) the linear gradient used for styling the waveform. */
    _createGradient() {
        if (!this.ctx || !this.canvas) return;
        try {
            this.gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
            this.gradientColors.forEach((color, index) => {
                // Calculate position for each color stop (0.0 to 1.0)
                const position = this.gradientColors.length <= 1 ? 0.5 : index / (this.gradientColors.length - 1);
                this.gradient.addColorStop(position, color);
            });
        } catch (error) {
            console.error("AudioVisualizer: Error creating gradient:", error);
            this.gradient = this.gradientColors[0] || '#00FF00'; // Fallback to solid color
        }
    }

    /** Handles resizing of the canvas to fit its parent container. */
    resize() {
        if (!this.canvas || !this.ctx) {
            console.error("AudioVisualizer.resize Error: Canvas or context not available.");
            return;
        }
        const container = this.canvas.parentElement;
        if (!container) {
            console.warn("AudioVisualizer.resize: Canvas parent element not found.");
            return; // Cannot determine size without parent
        }

        try {
            // Set canvas drawing buffer size based on container's client size
            this.canvas.width = container.offsetWidth;
            this.canvas.height = container.offsetHeight;

            // Re-create the gradient based on the new width
            this._createGradient();

            // Optional: Redraw immediately after resize if animating?
            // if (this.isAnimating) { this.draw(); }
            // console.debug(`AudioVisualizer: Resized canvas to ${this.canvas.width}x${this.canvas.height}`);
        } catch (error) {
            console.error("AudioVisualizer: Error during resize:", error);
        }
    }

    /**
     * Interpolates between two values (Linear Interpolation).
     * Used for smoothing the transition between audio frames.
     * @param {number} start - The starting value.
     * @param {number} end - The ending value.
     * @param {number} amt - The interpolation amount (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    _lerp(start, end, amt) {
        // Clamp amount to prevent over/undershooting if needed: amt = Math.max(0, Math.min(1, amt));
        return (1 - amt) * start + amt * end;
    }

    /** The core drawing function, called recursively via requestAnimationFrame. */
    draw() {
        // Stop drawing if animation flag is turned off
        if (!this.isAnimating) return;

        // Ensure analyser and context are still valid
        if (!this.analyser || !this.ctx || !this.canvas) {
            console.error("AudioVisualizer.draw Error: Missing analyser, context, or canvas.");
            this.stop(); // Stop animation if essentials are missing
            return;
        }

        try {
            // 1. Get Current Audio Data
            // Store previous frame's data before getting new data
            this.prevDataArray.set(this.dataArray);
            // Get time-domain data (waveform shape) into dataArray
            this.analyser.getByteTimeDomainData(this.dataArray);

            // 2. Clear Canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 3. Setup Drawing Style
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.strokeStyle = this.gradient || this.gradientColors[0] || '#00FF00'; // Use gradient or fallback
            this.ctx.lineCap = 'round'; // Style for line endings
            this.ctx.lineJoin = 'round'; // Style for line connections

            // 4. Calculate Drawing Dimensions
            const width = this.canvas.width - (this.padding * 2);
            const height = this.canvas.height - (this.padding * 2);
            const centerY = this.canvas.height / 2; // Vertical center of the canvas

            if (width <= 0 || height <= 0) return; // Skip drawing if canvas is too small

            // 5. Draw the Waveform Path
            const sliceWidth = width / (this.bufferLength - 1); // Width of each segment
            let x = this.padding; // Starting X position (includes left padding)

            this.ctx.beginPath(); // Start a new drawing path

            // Move to the starting point
            const startY = centerY + ((this.dataArray[0] / 128.0) - 1) * (height / 2); // Y based on first data point
            this.ctx.moveTo(x, startY);

            // Loop through data points to draw the waveform line
            for (let i = 1; i < this.bufferLength; i++) {
                // Normalize current data point (0-255) to a vertical scale (-1 to 1)
                const currentValue = (this.dataArray[i] / 128.0) - 1.0;
                // Normalize previous data point
                const prevValue = (this.prevDataArray[i] / 128.0) - 1.0;

                // Interpolate between previous and current value for smoothness
                const v = this._lerp(prevValue, currentValue, this.smoothingFactor);

                // Calculate Y position based on normalized value and canvas height
                const y = centerY + v * (height / 2);

                // Use quadratic curves for smoother lines between points
                // Calculate control point X (midway between previous and current X)
                const prevX = x; // Current x is the previous point for the next iteration
                // Get the Y position of the *previous* point for the curve calculation
                const prevYValue = (this.dataArray[i - 1] / 128.0) - 1.0;
                const prevPrevYValue = (this.prevDataArray[i - 1] / 128.0) - 1.0;
                const prevV = this._lerp(prevPrevYValue, prevYValue, this.smoothingFactor);
                const prevY = centerY + prevV * (height / 2);

                x = this.padding + i * sliceWidth; // Calculate current X

                // Draw the curve from previous point (cpX, prevY) to current point (x, y)
                // Using the previous point as the control point often works well for waveforms
                // this.ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2); // Curve to midpoint
                this.ctx.quadraticCurveTo(prevX, prevY, x, y); // Curve using prev point as control - simpler


                // Alternative: Simple lineTo (less smooth)
                // this.ctx.lineTo(x, y);
            }

            // Optional: Add visual effects like glow
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = this.gradientColors[0] || '#4CAF50'; // Use first gradient color for glow

            // 6. Render the Path
            this.ctx.stroke(); // Draw the line defined by the path

            // Reset shadow for other potential drawing on canvas
            this.ctx.shadowBlur = 0;

        } catch (error) {
            console.error("AudioVisualizer: Error during draw loop:", error);
            // Optionally stop animation on drawing errors?
            // this.stop();
        }


        // 7. Request Next Frame
        // Schedule the next call to draw() for the next screen refresh
        this.animationId = requestAnimationFrame(this.draw);
    }

    /** Cleans up resources: stops animation, removes event listeners, disconnects analyser. */
    cleanup() {
        console.info("AudioVisualizer: Cleaning up...");
        this.stop(); // Ensure animation is stopped

        // Remove resize listener
        window.removeEventListener('resize', this.resize);

        // Disconnect analyser node if it's connected
        if (this.analyser) {
            try {
                this.analyser.disconnect();
                // console.debug("AudioVisualizer: AnalyserNode disconnected.");
            } catch (error) {
                console.warn("AudioVisualizer: Error disconnecting AnalyserNode:", error);
            }
            this.analyser = null;
        }

        // Nullify references
        this.ctx = null;
        this.canvas = null;
        this.audioContext = null; // Release reference, but don't close context here (owned by creator)
        this.dataArray = null;
        this.prevDataArray = null;
        console.info("AudioVisualizer: Cleanup complete.");
    }
}