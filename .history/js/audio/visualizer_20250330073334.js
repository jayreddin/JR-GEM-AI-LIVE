/**
 * AudioVisualizer creates waveform visualizations for user and AI audio streams
 */
export class AudioVisualizer {
    constructor(audioContext, canvasId) {
        this.audioContext = audioContext;
        this.userWaveBar = document.querySelector('.wave-bar.user');
        this.aiWaveBar = document.querySelector('.wave-bar.ai');
        
        // Web Audio Analyser Setup
        this.userAnalyser = this.audioContext.createAnalyser();
        this.aiAnalyser = this.audioContext.createAnalyser();
        this.setupAnalysers();

        // Animation State
        this.isAnimating = false;
        this.animationId = null;
        this.draw = this.draw.bind(this);
    }

    setupAnalysers() {
        // Configure both analysers
        [this.userAnalyser, this.aiAnalyser].forEach(analyser => {
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.85;
        });

        // Create data arrays
        this.userDataArray = new Uint8Array(this.userAnalyser.frequencyBinCount);
        this.aiDataArray = new Uint8Array(this.aiAnalyser.frequencyBinCount);
    }

    /**
     * Connects an audio source to either user or AI analyser
     * @param {AudioNode} sourceNode - The audio source to connect
     * @param {'user' | 'ai'} type - Whether this is user or AI audio
     */
    connectSource(sourceNode, type = 'user') {
        if (!sourceNode || typeof sourceNode.connect !== 'function') {
            console.error("Invalid audio source node provided");
            return;
        }

        try {
            const analyser = type === 'ai' ? this.aiAnalyser : this.userAnalyser;
            sourceNode.connect(analyser);
            console.log(`Connected ${type} audio source to analyser`);
            
            // Start visualization if not already running
            if (!this.isAnimating) {
                this.start();
            }

            // Show the appropriate wave bar
            const waveBar = type === 'ai' ? this.aiWaveBar : this.userWaveBar;
            waveBar?.classList.add('active');

        } catch (error) {
            console.error(`Failed to connect ${type} audio source:`, error);
        }
    }

    /**
     * Disconnects audio source and hides wave bar
     * @param {'user' | 'ai'} type - Whether this is user or AI audio
     */
    disconnectSource(type = 'user') {
        try {
            const analyser = type === 'ai' ? this.aiAnalyser : this.userAnalyser;
            analyser.disconnect();
            
            // Hide the wave bar
            const waveBar = type === 'ai' ? this.aiWaveBar : this.userWaveBar;
            waveBar?.classList.remove('active');

            // If both sources are disconnected, stop animation
            if (!this.userAnalyser.numberOfInputs && !this.aiAnalyser.numberOfInputs) {
                this.stop();
            }

        } catch (error) {
            console.error(`Failed to disconnect ${type} audio source:`, error);
        }
    }

    /**
     * Calculates the average amplitude from time domain data
     * @param {Uint8Array} dataArray - The time domain data array
     * @returns {number} Average amplitude (0-1)
     */
    getAverageAmplitude(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs((dataArray[i] / 128.0) - 1);
        }
        return sum / dataArray.length;
    }

    /** Starts the visualization animation */
    start() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.draw();
    }

    /** Stops the visualization animation */
    stop() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Hide both wave bars
        this.userWaveBar?.classList.remove('active');
        this.aiWaveBar?.classList.remove('active');
    }

    /** Draws the waveform visualizations */
    draw() {
        if (!this.isAnimating) return;

        // Get user audio data
        this.userAnalyser.getByteTimeDomainData(this.userDataArray);
        const userAmplitude = this.getAverageAmplitude(this.userDataArray);

        // Get AI audio data
        this.aiAnalyser.getByteTimeDomainData(this.aiDataArray);
        const aiAmplitude = this.getAverageAmplitude(this.aiDataArray);

        // Update wave bar heights based on amplitude
        if (this.userWaveBar) {
            const userHeight = Math.max(4, userAmplitude * 60); // Min height 4px
            this.userWaveBar.style.height = `${userHeight}px`;
        }

        if (this.aiWaveBar) {
            const aiHeight = Math.max(4, aiAmplitude * 60); // Min height 4px
            this.aiWaveBar.style.height = `${aiHeight}px`;
        }

        // Request next frame
        this.animationId = requestAnimationFrame(this.draw);
    }

    /** Clean up resources */
    cleanup() {
        this.stop();
        
        // Disconnect analysers
        this.userAnalyser?.disconnect();
        this.aiAnalyser?.disconnect();
        
        // Clear references
        this.userWaveBar = null;
        this.aiWaveBar = null;
        this.userAnalyser = null;
        this.aiAnalyser = null;
        this.audioContext = null;
    }
}
