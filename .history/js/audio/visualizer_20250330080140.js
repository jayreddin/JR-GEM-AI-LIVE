/**
 * AudioVisualizer creates waveform visualizations for user and AI audio streams
 * using the Web Audio API's AnalyserNode and rendering onto HTML elements.
 */
export class AudioVisualizer {
    constructor(audioContext) {
        if (!audioContext || !(audioContext instanceof AudioContext) || audioContext.state !== 'running') {
            throw new Error(`AudioVisualizer: Invalid or non-running AudioContext provided. State: ${audioContext?.state}`);
        }
        this.audioContext = audioContext;

        // Get Wave Bar Elements
        this.userWaveBar = document.querySelector('.wave-bar.user');
        this.aiWaveBar = document.querySelector('.wave-bar.ai');
        if (!this.userWaveBar || !this.aiWaveBar) {
            console.warn("AudioVisualizer: Could not find one or both wave bar elements (.wave-bar.user, .wave-bar.ai).");
        }

        // Web Audio Analyser Setup
        try {
            this.userAnalyser = this.audioContext.createAnalyser();
            this.aiAnalyser = this.audioContext.createAnalyser();
            this.setupAnalysers();
        } catch (error) {
            console.error("AudioVisualizer: Error creating AnalyserNode:", error);
            throw new Error(`Failed to create AnalyserNode: ${error.message}`);
        }

        // Animation State
        this.isAnimating = false;
        this.animationId = null;
        this.draw = this.draw.bind(this);

        console.info(`AudioVisualizer initialized.`);
    }

    setupAnalysers() {
        [this.userAnalyser, this.aiAnalyser].forEach(analyser => {
            if (analyser) {
                analyser.fftSize = 512; // Smaller FFT size for performance
                analyser.smoothingTimeConstant = 0.8; // Slightly less smoothing
                analyser.minDecibels = -90;
                analyser.maxDecibels = -10;
                // Create data arrays
                if (analyser === this.userAnalyser) {
                    this.userDataArray = new Uint8Array(analyser.frequencyBinCount);
                } else {
                    this.aiDataArray = new Uint8Array(analyser.frequencyBinCount);
                }
            }
        });
    }

    /**
     * Connects an audio source node to the specified analyser.
     * @param {AudioNode} sourceNode - The Web Audio API node providing the audio data.
     * @param {'user' | 'ai'} type - Specifies which analyser and wave bar to use.
     */
    connectSource(sourceNode, type = 'user') {
        const analyser = type === 'ai' ? this.aiAnalyser : this.userAnalyser;
        const waveBar = type === 'ai' ? this.aiWaveBar : this.userWaveBar;

        if (!analyser || !waveBar) {
            console.error(`AudioVisualizer.connectSource Error: Analyser or wave bar for type "${type}" not found.`);
            return;
        }
        if (!sourceNode || typeof sourceNode.connect !== 'function') {
            console.error(`AudioVisualizer.connectSource Error: Invalid sourceNode provided for type "${type}".`, sourceNode);
            return;
        }

        try {
            sourceNode.connect(analyser);
            waveBar.classList.add('active'); // Show the wave bar
            console.info(`AudioVisualizer: Source node connected to ${type} AnalyserNode.`);

            // Start animation loop if it's not already running
            if (!this.isAnimating) {
                this.start();
            }
        } catch (error) {
            console.error(`AudioVisualizer: Error connecting ${type} source node:`, error);
        }
    }

    /**
     * Disconnects all sources from the specified analyser and hides the wave bar.
     * @param {'user' | 'ai'} type - Specifies which analyser and wave bar to affect.
     */
    disconnectSource(type = 'user') {
        const analyser = type === 'ai' ? this.aiAnalyser : this.userAnalyser;
        const waveBar = type === 'ai' ? this.aiWaveBar : this.userWaveBar;

        if (!analyser || !waveBar) {
            console.warn(`AudioVisualizer.disconnectSource: Analyser or wave bar for type "${type}" not found.`);
            return;
        }

        try {
            // AnalyserNode doesn't have a direct way to disconnect *all* inputs easily.
            // We rely on the source nodes being disconnected elsewhere or stopped.
            // We just hide the visual representation.
            waveBar.classList.remove('active');
            console.info(`AudioVisualizer: Hiding ${type} wave bar.`);

            // Check if *both* analysers seem inactive (no inputs connected)
            // Note: numberOfInputs might not be reliable immediately after disconnect.
            // A more robust check might involve tracking connection state externally.
            const userInputs = this.userAnalyser?.numberOfInputs ?? 0;
            const aiInputs = this.aiAnalyser?.numberOfInputs ?? 0;

            // If potentially no sources are connected anymore, stop the animation loop.
            // This is a heuristic.
            if (userInputs === 0 && aiInputs === 0 && !waveBar.classList.contains('active') && !(type === 'user' ? this.aiWaveBar?.classList.contains('active') : this.userWaveBar?.classList.contains('active'))) {
                 setTimeout(() => { // Delay check slightly
                     if (!this.userWaveBar?.classList.contains('active') && !this.aiWaveBar?.classList.contains('active')) {
                        this.stop();
                     }
                 }, 100);
            }

        } catch (error) {
            console.error(`AudioVisualizer: Error during ${type} source disconnection visual update:`, error);
        }
    }

    /**
     * Calculates the average amplitude from frequency data (more visually representative).
     * @param {AnalyserNode} analyser - The analyser node.
     * @param {Uint8Array} dataArray - The array to store frequency data.
     * @returns {number} Average amplitude (0-1).
     */
    getAverageAmplitude(analyser, dataArray) {
        if (!analyser || !dataArray) return 0;
        analyser.getByteFrequencyData(dataArray); // Get frequency data

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        // Normalize based on the max possible value (255) and buffer length
        return (sum / dataArray.length) / 255.0;
    }

    /** Starts the visualization animation loop. */
    start() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        console.info("AudioVisualizer: Starting animation loop...");
        this.draw();
    }

    /** Stops the visualization animation loop. */
    stop() {
        if (!this.isAnimating) return;
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Ensure bars are visually reset when stopping explicitly
        if(this.userWaveBar) this.userWaveBar.style.height = '0px';
        if(this.aiWaveBar) this.aiWaveBar.style.height = '0px';
        console.info("AudioVisualizer: Stopped animation loop.");
    }

    /** The core drawing function, called recursively via requestAnimationFrame. */
    draw() {
        if (!this.isAnimating) return;

        try {
            // Update User Wave Bar
            if (this.userAnalyser && this.userWaveBar?.classList.contains('active')) {
                const userAmplitude = this.getAverageAmplitude(this.userAnalyser, this.userDataArray);
                const userHeight = Math.max(2, Math.min(30, userAmplitude * 60)); // Clamp height
                this.userWaveBar.style.height = `${userHeight}px`;
            } else if (this.userWaveBar) {
                 this.userWaveBar.style.height = `0px`; // Reset if inactive
            }

            // Update AI Wave Bar
            if (this.aiAnalyser && this.aiWaveBar?.classList.contains('active')) {
                const aiAmplitude = this.getAverageAmplitude(this.aiAnalyser, this.aiDataArray);
                const aiHeight = Math.max(2, Math.min(30, aiAmplitude * 60)); // Clamp height
                this.aiWaveBar.style.height = `${aiHeight}px`;
            } else if (this.aiWaveBar) {
                 this.aiWaveBar.style.height = `0px`; // Reset if inactive
            }

        } catch (error) {
            console.error("AudioVisualizer: Error during draw loop:", error);
            // Optionally stop animation on drawing errors?
            // this.stop();
        }

        // Request Next Frame
        this.animationId = requestAnimationFrame(this.draw);
    }

    /** Cleans up resources: stops animation, disconnects analysers. */
    cleanup() {
        console.info("AudioVisualizer: Cleaning up...");
        this.stop();

        // Disconnect analyser nodes (best effort)
        try { this.userAnalyser?.disconnect(); } catch (e) { console.warn("Error disconnecting user analyser", e); }
        try { this.aiAnalyser?.disconnect(); } catch (e) { console.warn("Error disconnecting AI analyser", e); }

        // Nullify references
        this.userWaveBar = null;
        this.aiWaveBar = null;
        this.userAnalyser = null;
        this.aiAnalyser = null;
        this.userDataArray = null;
        this.aiDataArray = null;
        this.audioContext = null; // Release reference
        console.info("AudioVisualizer: Cleanup complete.");
    }
}
