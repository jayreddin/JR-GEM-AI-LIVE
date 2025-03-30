/**
 * IMG GEN Events Handler
 * Manages all event listeners and UI interactions for the IMG GEN tab
 */
export class ImageGenEvents {
    constructor(imageGen) {
        this.imageGen = imageGen;
        this.setupEventListeners();
        this.activePopup = null;
        this.isActive = false;
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
                const popupId = e.target.closest('.popup-overlay').id;
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
        document.getElementById('liveTab')?.addEventListener('change', () => {
            this.isActive = false;
            this.hideAllPopups();
        });
        
        document.getElementById('imgGenTab')?.addEventListener('change', () => {
            this.isActive = true;
        });

        // Handle escape key for popups
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activePopup) {
                this.hidePopup(this.activePopup);
            }
        });

        // Click outside to close popup
        document.addEventListener('click', (e) => {
            if (this.activePopup && e.target.classList.contains('popup-overlay')) {
                this.hidePopup(this.activePopup);
            }
        });

        // Text input handling for image generation
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (messageInput && sendBtn) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && this.isActive) {
                    e.preventDefault();
                    this.handleImageGeneration();
                }
            });

            sendBtn.addEventListener('click', () => {
                if (this.isActive) {
                    this.handleImageGeneration();
                }
            });
        }
    }

    showPopup(popupId) {
        if (!this.isActive) return;

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
            setTimeout(() => {
                if (!popup.classList.contains('active')) {
                    popup.style.display = 'none';
                }
            }, 300);
        }
    }

    hideAllPopups() {
        if (this.activePopup) {
            this.hidePopup(this.activePopup);
        }
        document.querySelectorAll('.popup-overlay').forEach(popup => {
            popup.classList.remove('active');
            popup.style.display = 'none';
        });
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
        if (!this.isActive) return;
        
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
        this.uploadedImage = null;
    }
}
