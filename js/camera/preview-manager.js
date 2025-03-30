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

                // Touch events for pinch-to-zoom
                let initialDistance = 0;
                let initialWidth = 0;
                let initialHeight = 0;

                preview.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();
                        initialDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        initialWidth = preview.offsetWidth;
                        initialHeight = preview.offsetHeight;
                    }
                });

                preview.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();
                        const currentDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        const scale = currentDistance / initialDistance;
                        const newWidth = Math.min(Math.max(initialWidth * scale, 120), window.innerWidth * 0.8);
                        const aspectRatio = initialHeight / initialWidth;
                        preview.style.width = `${newWidth}px`;
                        preview.style.height = `${newWidth * aspectRatio}px`;
                    }
                });

                // Mouse events for resize handle
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                preview.appendChild(resizeHandle);

                let isResizing = false;
                let startX, startY, startWidth, startHeight;

                resizeHandle.addEventListener('mousedown', (e) => {
                    if (preview.classList.contains('minimized')) return;
                    isResizing = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startWidth = preview.offsetWidth;
                    startHeight = preview.offsetHeight;
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });

                const handleMouseMove = (e) => {
                    if (!isResizing) return;
                    e.preventDefault();
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    const aspectRatio = startHeight / startWidth;
                    const newWidth = Math.min(Math.max(startWidth + deltaX, 120), window.innerWidth * 0.8);
                    preview.style.width = `${newWidth}px`;
                    preview.style.height = `${newWidth * aspectRatio}px`;
                };

                const handleMouseUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };
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
