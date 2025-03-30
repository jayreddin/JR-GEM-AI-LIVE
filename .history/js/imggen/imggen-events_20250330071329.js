/**
 * IMG GEN Events Handler
 * Manages all event listeners and UI interactions for the IMG GEN tab
 */
export class ImageGenEvents {
    constructor(imageGen) {
        this.imageGen = imageGen;
        this.setupEventListeners();
        this.activePopup = null;
    }

    setupEventListeners() {
        // Control bar buttons
        document.getElementById('newImageBtn')?.addEventListener('click', () => this.handleNewImage());
        document.getElementById('imgUploadBtn')?.addEventListener('click', () => this.showPopup('imgUploadPopup'));
        document.getElementById('imgOptionsBtn')?.addEventListener('click', () => this.showPopup('imgOptionsPopup'));
        document.getElementById('storyBookBtn')?.addEventListener('click', () => this.showPopup('storyBookPopup'));
        document.getElementById('birthdayCardBtn')?.addEventListener('click', () => this.showPopup('birthdayCardPopup'));

        // Close buttons for all popups
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const popupId = e.target.dataset.popup;
                if (popupId) this.hidePopup(popupId);
            });
        });

        // Apply buttons for filters
        document.getElementById('applyImgOptionsBtn')?.addEventListener('click', () => {
            this.applyImageOptions();
            this.hidePopup('imgOptionsPopup');
        });

        // Image upload handling
        this.setupImageUpload();

        // Tab switching
        document.getElementById('liveTab')?.addEventListener('change', () => this.handleTabSwitch('live'));
        document.getElementById('imgGenTab')?.addEventListener('change', () => this.handleTabSwitch('imggen'));

        // Handle escape key for popups
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activePopup) {
                this.hidePopup(this.activePopup);
            }
        });

        // Text input handling for image generation
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (messageInput && sendBtn) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleImageGeneration();
                }
            });

            sendBtn.addEventListener('click', () => this.handleImageGeneration());
        }
    }

    handleTabSwitch(tab) {
        const modelSelector = document.querySelector('.model-selector-container');
        const modelDisplay = document.getElementById('imgGenModelDisplay');
        const controlBar = document.getElementById('imgGenControlBar');

        if (tab === 'imggen') {
            modelSelector?.classList.add('hidden');
            modelDisplay?.classList.add('active');
            controlBar?.classList.add('active');
        } else {
            modelSelector?.classList.remove('hidden');
            modelDisplay?.classList.remove('active');
            controlBar?.classList.remove('active');
        }
    }

    showPopup(popupId) {
        // Hide any currently active popup
        if (this.activePopup) {
            this.hidePopup(this.activePopup);
        }

        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('active');
            this.activePopup = popupId;
            popup.style.display = 'flex';
            setTimeout(() => popup.classList.add('active'), 10);
        }
    }

    hidePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.remove('active');
            this.activePopup = null;
            setTimeout(() => popup.style.display = 'none', 300);
        }
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('imgUploadArea');
        const uploadInput = document.getElementById('imageUploadInput');
        const preview = document.getElementById('imgUploadPreview');

        if (uploadArea && uploadInput) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                if (e.dataTransfer.files.length) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });

            uploadArea.addEventListener('click', () => uploadInput.click());

            uploadInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }
    }

    handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imgUploadPreview');
            const placeholder = document.getElementById('imgUploadPlaceholder');
            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                // Store the image data for processing
                this.uploadedImage = {
                    data: e.target.result,
                    file: file
                };
            }
        };
        reader.readAsDataURL(file);
    }

    handleNewImage() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
            messageInput.focus();
        }
    }

    applyImageOptions() {
        const amount = document.getElementById('imgGenAmount')?.value;
        const size = document.getElementById('imgGenSize')?.value;
        const weirdness = document.getElementById('imgGenWeirdness')?.value;
        const filter = document.getElementById('imgGenFilter')?.value;

        this.currentFilters = {
            amount: amount || '1',
            size: size || '512x512',
            weirdness: weirdness || '1.0',
            filter: filter || 'none'
        };
    }

    async handleImageGeneration() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput?.value.trim()) return;

        const requestDetails = {
            prompt: messageInput.value,
            filters: this.currentFilters || {
                amount: '1',
                size: '512x512',
                weirdness: '1.0',
                filter: 'none'
            },
            isEditing: !!this.uploadedImage,
            uploadedImage: this.uploadedImage
        };

        await this.imageGen.processRequest(requestDetails);
        messageInput.value = '';
        this.uploadedImage = null; // Clear uploaded image after processing
    }
}
