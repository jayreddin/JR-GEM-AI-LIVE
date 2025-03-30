/**
 * IMG GEN Events Handler
 * Manages all event listeners and UI interactions for the IMG GEN tab
 */
export class ImageGenEvents {
    constructor(imageGen) {
        this.imageGen = imageGen;
        this.activePopup = null;
        this.isActive = false; // Track if IMG GEN tab is active
        this.uploadedImage = null;
        this.currentFilters = { amount: '1', size: '512x512', weirdness: '1.0', filter: 'none' };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Control bar buttons - only add listeners if elements exist
        document.getElementById('newImageBtn')?.addEventListener('click', () => this.handleNewImage());
        document.getElementById('imgUploadBtn')?.addEventListener('click', () => this.showPopup('imgUploadPopup'));
        document.getElementById('imgOptionsBtn')?.addEventListener('click', () => this.showPopup('imgOptionsPopup'));
        document.getElementById('storyBookBtn')?.addEventListener('click', () => this.showPopup('storyBookPopup'));
        document.getElementById('birthdayCardBtn')?.addEventListener('click', () => this.showPopup('birthdayCardPopup'));

        // Close buttons for all popups
        document.querySelectorAll('.popup-overlay .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const popupId = e.target.closest('.popup-overlay')?.id;
                if (popupId) this.hidePopup(popupId);
            });
        });

        // Apply buttons for filters
        document.getElementById('applyImgOptionsBtn')?.addEventListener('click', () => {
            this.applyImageOptions();
            this.hidePopup('imgOptionsPopup');
        });
        // Placeholder apply buttons for other modes
        document.querySelector('#storyBookPopup .apply-btn')?.addEventListener('click', () => this.hidePopup('storyBookPopup'));
        document.querySelector('#birthdayCardPopup .apply-btn')?.addEventListener('click', () => this.hidePopup('birthdayCardPopup'));


        // Image upload handling
        this.setupImageUpload();

        // Tab switching listeners (managed by script.js now, but we track state)
        document.getElementById('liveTab')?.addEventListener('change', () => {
            this.isActive = false;
            this.hideAllPopups(); // Ensure popups close when switching away
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
        document.querySelectorAll('.popup-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) { // Only if clicking the overlay itself
                    this.hidePopup(overlay.id);
                }
            });
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
                if (this.isActive) { // Only trigger generation if IMG GEN tab is active
                    this.handleImageGeneration();
                }
            });
        }
    }

    showPopup(popupId) {
        // Only show if the IMG GEN tab is currently active
        if (!this.isActive) {
            console.log("Attempted to show popup while IMG GEN tab is inactive.");
            return;
        }

        // Hide any currently active popup first
        if (this.activePopup && this.activePopup !== popupId) {
            this.hidePopup(this.activePopup);
        }

        const popup = document.getElementById(popupId);
        if (popup && !popup.classList.contains('active')) {
            popup.style.display = 'flex'; // Set display before adding class for transition
            // Use requestAnimationFrame to ensure display:flex is applied before transition starts
            requestAnimationFrame(() => {
                popup.classList.add('active');
                this.activePopup = popupId;
            });
        }
    }

    hidePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup && popup.classList.contains('active')) {
            popup.classList.remove('active');
            if (this.activePopup === popupId) {
                this.activePopup = null;
            }
            // Wait for opacity transition before setting display:none
            setTimeout(() => {
                // Double check it wasn't immediately re-opened
                if (!popup.classList.contains('active')) {
                    popup.style.display = 'none';
                }
            }, 300); // Match CSS transition duration
        }
    }

    hideAllPopups() {
        document.querySelectorAll('.popup-overlay.active').forEach(popup => {
            this.hidePopup(popup.id);
        });
        this.activePopup = null;
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('imgUploadArea');
        const uploadInput = document.getElementById('imageUploadInput');

        if (uploadArea && uploadInput) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
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
        if (!file || !file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
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
                this.uploadedImage = { data: e.target.result, file: file };
                document.getElementById('imgUploadBtn')?.classList.add('upload-active'); // Add visual cue
                this.hidePopup('imgUploadPopup'); // Close popup after successful upload
            }
        };
        reader.readAsDataURL(file);
    }

    handleNewImage() {
        const messageInput = document.getElementById('messageInput');
        const imageDisplay = document.querySelector('#imgGenContent .image-display');
        const uploadBtn = document.getElementById('imgUploadBtn');
        const uploadPreview = document.getElementById('imgUploadPreview');
        const uploadPlaceholder = document.getElementById('imgUploadPlaceholder');

        if (messageInput) messageInput.value = '';
        if (imageDisplay) imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
        this.uploadedImage = null;
        uploadBtn?.classList.remove('upload-active');
        if(uploadPreview) uploadPreview.style.display = 'none';
        if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        document.getElementById('imageUploadInput').value = ''; // Reset file input

        messageInput?.focus();
        console.log("New image context started.");
    }

    applyImageOptions() {
        const amount = document.getElementById('imgGenAmount')?.value || '1';
        const size = document.getElementById('imgGenSize')?.value || '512x512';
        const weirdness = document.getElementById('imgGenWeirdness')?.value || '1.0';
        const filter = document.getElementById('imgGenFilter')?.value || 'none';
        this.currentFilters = { amount, size, weirdness, filter };
        console.log("Image Options Applied:", this.currentFilters);
    }

    async handleImageGeneration() {
        if (!this.isActive) return; // Double check tab is active

        const messageInput = document.getElementById('messageInput');
        const prompt = messageInput?.value.trim();
        if (!prompt) {
            alert("Please enter a prompt to generate an image.");
            return;
        }

        // Ensure filters are applied if the options popup was never opened
        if (!this.currentFilters) {
            this.applyImageOptions();
        }

        const requestDetails = {
            prompt: prompt,
            filters: this.currentFilters,
            isEditing: !!this.uploadedImage,
            uploadedImage: this.uploadedImage
        };

        await this.imageGen.processRequest(requestDetails);

        // Reset after generation attempt
        messageInput.value = '';
        this.uploadedImage = null;
        document.getElementById('imgUploadBtn')?.classList.remove('upload-active');
        const uploadPreview = document.getElementById('imgUploadPreview');
        const uploadPlaceholder = document.getElementById('imgUploadPlaceholder');
        if(uploadPreview) uploadPreview.style.display = 'none';
        if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        document.getElementById('imageUploadInput').value = '';
    }
}
