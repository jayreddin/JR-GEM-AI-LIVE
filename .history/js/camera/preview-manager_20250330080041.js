/**
 * Manages camera and screen sharing preview windows
 * Handles minimization, positioning, and visibility
 */
export class PreviewManager {
    constructor() {
        this.cameraPreview = document.getElementById('cameraPreview');
        this.screenPreview = document.getElementById('screenPreview');
        this.previewContainer = document.querySelector('.preview-container');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Minimize/Maximize buttons
        this.cameraPreview?.querySelector('.minimize-btn')?.addEventListener('click', () => this.toggleMinimize(this.cameraPreview));
        this.screenPreview?.querySelector('.minimize-btn')?.addEventListener('click', () => this.toggleMinimize(this.screenPreview));

        // Double click to toggle minimize
        [this.cameraPreview, this.screenPreview].forEach(preview => {
            if (preview) {
                preview.addEventListener('dblclick', (e) => {
                    // Avoid toggling if clicking on a button inside the header
                    if (!e.target.closest('.preview-btn')) {
                        this.toggleMinimize(preview);
                    }
                });
            }
        });

        // Flip camera button (event listener added in MediaManager)
    }

    /**
     * Shows a preview window
     * @param {'camera' | 'screen'} type - Type of preview to show
     * @param {MediaStream} stream - The media stream to display
     */
    showPreview(type, stream) {
        const preview = type === 'camera' ? this.cameraPreview : this.screenPreview;
        if (!preview) return;

        const video = preview.querySelector('video');
        if (video) {
            video.srcObject = stream;
            video.play().catch(console.error);
        }

        preview.setAttribute('aria-hidden', 'false');
        preview.style.display = 'block'; // Ensure it's visible
        preview.classList.remove('minimized'); // Start maximized

        // Update minimize button
        const minBtn = preview.querySelector('.minimize-btn');
        if (minBtn) {
            minBtn.textContent = '−';
            minBtn.setAttribute('aria-label', `Minimize ${type} preview`);
        }

        this.updateLayout(); // Adjust container visibility
    }

    /**
     * Hides a preview window
     * @param {'camera' | 'screen'} type - Type of preview to hide
     */
    hidePreview(type) {
        const preview = type === 'camera' ? this.cameraPreview : this.screenPreview;
        if (!preview) return;

        const video = preview.querySelector('video');
        if (video && video.srcObject) {
            // Stop tracks before setting srcObject to null
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }

        preview.setAttribute('aria-hidden', 'true');
        preview.style.display = 'none'; // Hide the element
        preview.classList.remove('minimized'); // Reset state

        this.updateLayout(); // Adjust container visibility
    }

    /**
     * Toggles the minimized state of a preview window
     * @param {HTMLElement} preview - The preview element to toggle
     */
    toggleMinimize(preview) {
        if (!preview) return;

        const isMinimizing = !preview.classList.contains('minimized');
        preview.classList.toggle('minimized');

        // Update button text and aria-label
        const minBtn = preview.querySelector('.minimize-btn');
        if (minBtn) {
            minBtn.textContent = isMinimizing ? '□' : '−';
            const type = preview.id.includes('camera') ? 'camera' : 'screen';
            minBtn.setAttribute(
                'aria-label',
                `${isMinimizing ? 'Maximize' : 'Minimize'} ${type} preview`
            );
        }
    }

    /**
     * Updates the video track in a preview (e.g., after flipping camera)
     * @param {'camera' | 'screen'} type - Type of preview to update
     * @param {MediaStreamTrack} track - New video track
     */
    updateTrack(type, track) {
        const preview = type === 'camera' ? this.cameraPreview : this.screenPreview;
        if (!preview) return;

        const video = preview.querySelector('video');
        if (video && video.srcObject) {
            const stream = video.srcObject;
            const oldTrack = stream.getVideoTracks()[0];
            if (oldTrack) {
                stream.removeTrack(oldTrack);
            }
            stream.addTrack(track);
        } else if (video) {
            // If no stream exists yet, create one
            const newStream = new MediaStream([track]);
            video.srcObject = newStream;
            video.play().catch(console.error);
        }
    }

    /**
     * Updates the visibility of the preview container based on whether any previews are active.
     */
    updateLayout() {
        if (!this.previewContainer) return;

        const cameraVisible = this.cameraPreview?.style.display !== 'none';
        const screenVisible = this.screenPreview?.style.display !== 'none';

        if (cameraVisible || screenVisible) {
            this.previewContainer.style.display = 'flex';
        } else {
            this.previewContainer.style.display = 'none';
        }
    }
}

// Export singleton instance
export default new PreviewManager();
