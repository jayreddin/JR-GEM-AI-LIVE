/**
 * Manages camera and screen sharing preview windows
 * Handles minimization and positioning
 */
export class PreviewManager {
    constructor() {
        this.cameraPreview = document.getElementById('cameraPreview');
        this.screenPreview = document.getElementById('screenPreview');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Camera preview minimize button
        const cameraMinBtn = this.cameraPreview?.querySelector('.minimize-btn');
        if (cameraMinBtn) {
            cameraMinBtn.addEventListener('click', () => this.toggleMinimize(this.cameraPreview));
        }

        // Screen preview minimize button
        const screenMinBtn = this.screenPreview?.querySelector('.minimize-btn');
        if (screenMinBtn) {
            screenMinBtn.addEventListener('click', () => this.toggleMinimize(this.screenPreview));
        }

        // Double click to maximize
        [this.cameraPreview, this.screenPreview].forEach(preview => {
            if (preview) {
                preview.addEventListener('dblclick', (e) => {
                    if (e.target !== preview.querySelector('.minimize-btn')) {
                        this.toggleMinimize(preview);
                    }
                });
            }
        });
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
        preview.style.display = 'block';
        
        // Reset to non-minimized state when showing
        preview.classList.remove('minimized');
        
        // Update minimize button text
        const minBtn = preview.querySelector('.minimize-btn');
        if (minBtn) {
            minBtn.textContent = '−';
            minBtn.setAttribute('aria-label', `Minimize ${type} preview`);
        }
    }

    /**
     * Hides a preview window
     * @param {'camera' | 'screen'} type - Type of preview to hide
     */
    hidePreview(type) {
        const preview = type === 'camera' ? this.cameraPreview : this.screenPreview;
        if (!preview) return;

        const video = preview.querySelector('video');
        if (video) {
            video.srcObject = null;
        }

        preview.setAttribute('aria-hidden', 'true');
        preview.style.display = 'none';
        preview.classList.remove('minimized');
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
     * Updates the video track in a preview
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
        }
    }

    /**
     * Ensures previews are properly positioned
     * Called when previews are shown/hidden
     */
    updateLayout() {
        const container = document.querySelector('.preview-container');
        if (!container) return;

        // Adjust container width based on visible previews
        const visiblePreviews = [...container.children].filter(
            preview => preview.style.display !== 'none'
        );

        if (visiblePreviews.length === 0) {
            container.style.display = 'none';
        } else {
            container.style.display = 'flex';
        }
    }
}

// Export singleton instance
export default new PreviewManager();
