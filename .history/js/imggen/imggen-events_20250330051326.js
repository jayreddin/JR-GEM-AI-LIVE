import { ImageGenerator } from './imggen.js';

/**
 * Handles event listeners and UI interactions for the Image Generation tab.
 */
export class ImageGenEvents {
    constructor(agent, imgGenContentElement, messageInputElement, sendButtonElement) {
        if (!agent || !imgGenContentElement || !messageInputElement || !sendButtonElement) {
            console.error("ImageGenEvents requires agent, imgGenContent, messageInput, and sendButton elements.");
            return;
        }
        this.agent = agent; // The GeminiAgent instance
        this.imgGenContent = imgGenContentElement;
        this.messageInput = messageInputElement;
        this.sendButton = sendButtonElement;

        // State for IMG GEN mode
        this.storyBookMode = false;
        this.birthdayCardMode = false;
        this.uploadedImage = null; // To store { data: base64, file: File }

        // Instantiate the core logic handler
        this.imageGenerator = new ImageGenerator(agent);

        // Store original handlers to restore them when switching tabs
        this.originalSendClickHandler = this.sendButton.onclick;
        this.originalInputKeydownHandler = this.messageInput.onkeydown;

        this.initialize();
    }

    initialize() {
        console.log("Initializing ImageGenEvents...");
        // Wait for the specific elements within the imgGenContent to be potentially added by ImageGenUI
        // Using a MutationObserver or a slight delay might be more robust,
        // but for now, assuming elements exist shortly after instantiation.
        // A better approach would be to have ImageGenUI return the created elements or IDs.
        requestAnimationFrame(() => {
            this.setupImgGenEventHandlers();
            this.overrideSendButtonForImgGen();
        });
    }

    setupImgGenEventHandlers() {
        // Get references to elements dynamically added by ImageGenUI
        const filtersBtn = document.getElementById('filtersBtn');
        const filtersPopup = document.getElementById('filtersPopup');
        const closeFiltersBtn = document.getElementById('closeFiltersBtn');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const uploadImageBtn = document.getElementById('uploadImageBtn');
        const imageUpload = document.getElementById('imageUpload');
        const newImageBtn = document.getElementById('newImageBtn');
        const storyBookBtn = document.getElementById('storyBookBtn');
        const birthdayCardBtn = document.getElementById('birthdayCardBtn');
        const imageDisplay = this.imgGenContent.querySelector('.image-display'); // More specific query

        // Filters popup handlers
        if (filtersBtn && filtersPopup && closeFiltersBtn) {
            filtersBtn.addEventListener('click', () => {
                filtersPopup.style.display = 'flex';
            });

            closeFiltersBtn.addEventListener('click', () => {
                filtersPopup.style.display = 'none';
            });

            filtersPopup.addEventListener('click', (e) => {
                if (e.target === filtersPopup) {
                    filtersPopup.style.display = 'none';
                }
            });

            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    // Logic to actually apply filters will be in imggen.js
                    const imageAmount = document.getElementById('imageAmount')?.value;
                    const imageSize = document.getElementById('imageSize')?.value;
                    const imageFilter = document.getElementById('imageFilter')?.value;
                    console.log(`Filters applied: Amount=${imageAmount}, Size=${imageSize}, Filter=${imageFilter}`);
                    filtersPopup.style.display = 'none';
                    // TODO: Communicate filter changes to imggen.js state
                });
            }
        } else {
            console.warn("Filter elements not found for event setup.");
        }

        // Image upload handler
        if (uploadImageBtn && imageUpload) {
            uploadImageBtn.addEventListener('click', () => {
                imageUpload.click();
            });

            imageUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (imageDisplay) {
                            imageDisplay.innerHTML = ''; // Clear placeholder/previous
                            const img = document.createElement('img');
                            img.src = event.target.result;
                            img.classList.add('generated-image'); // Re-use class
                            img.alt = 'Uploaded image';
                            imageDisplay.appendChild(img);

                            // Store the image data
                            this.uploadedImage = {
                                data: event.target.result,
                                file: e.target.files[0]
                            };
                            console.log("Image uploaded and stored for editing.");

                            // Add visual indicator
                            uploadImageBtn.classList.add('upload-active');
                        }
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        } else {
             console.warn("Upload elements not found for event setup.");
        }

        // New Image generation button
        if (newImageBtn) {
            newImageBtn.addEventListener('click', () => {
                if (imageDisplay) {
                    imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
                }
                if (uploadImageBtn) {
                    uploadImageBtn.classList.remove('upload-active');
                }
                this.uploadedImage = null; // Clear stored image
                console.log("New image context started.");
            });
        } else {
             console.warn("New Image button not found for event setup.");
        }

        // Story Book mode toggle
        if (storyBookBtn) {
            storyBookBtn.addEventListener('click', () => {
                storyBookBtn.classList.toggle('active');
                this.storyBookMode = storyBookBtn.classList.contains('active');
                if (this.storyBookMode && birthdayCardBtn) {
                    birthdayCardBtn.classList.remove('active');
                    this.birthdayCardMode = false;
                }
                console.log(`Story Book mode ${this.storyBookMode ? 'activated' : 'deactivated'}`);
                // TODO: Communicate mode change to imggen.js state
            });
        } else {
             console.warn("Story Book button not found for event setup.");
        }

        // Birthday Card mode toggle
        if (birthdayCardBtn) {
            birthdayCardBtn.addEventListener('click', () => {
                birthdayCardBtn.classList.toggle('active');
                this.birthdayCardMode = birthdayCardBtn.classList.contains('active');
                if (this.birthdayCardMode && storyBookBtn) {
                    storyBookBtn.classList.remove('active');
                    this.storyBookMode = false;
                }
                console.log(`Birthday Card mode ${this.birthdayCardMode ? 'activated' : 'deactivated'}`);
                // TODO: Communicate mode change to imggen.js state
            });
        } else {
             console.warn("Birthday Card button not found for event setup.");
        }
    }

    // Method to be called when switching TO the IMG GEN tab
    activate() {
        console.log("Activating ImageGenEvents: Overriding send button.");
        this.overrideSendButtonForImgGen();
    }

    // Method to be called when switching AWAY FROM the IMG GEN tab
    deactivate() {
        console.log("Deactivating ImageGenEvents: Restoring original send button handlers.");
        this.sendButton.onclick = this.originalSendClickHandler;
        this.messageInput.onkeydown = this.originalInputKeydownHandler;
    }

    // Override send button and Enter key for IMG GEN mode
    overrideSendButtonForImgGen() {
        this.sendButton.onclick = (event) => {
            // Check if the IMG GEN tab is active (redundant if activate/deactivate used properly)
             if (!this.imgGenContent.classList.contains('active')) {
                 // Fallback to original handler if somehow called when tab not active
                 if (typeof this.originalSendClickHandler === 'function') {
                    this.originalSendClickHandler.call(this.sendButton, event);
                 }
                 return;
             }

            // --- IMG GEN Send Logic ---
            const prompt = this.messageInput.value.trim();
            if (prompt) {
                const imageDisplay = this.imgGenContent.querySelector('.image-display');
                if (imageDisplay) {
                    imageDisplay.innerHTML = '<div class="placeholder-text">Generating image...</div>';
                }

                // Get filter settings (use defaults if elements not found)
                const imageAmount = document.getElementById('imageAmount')?.value || '1';
                const imageSize = document.getElementById('imageSize')?.value || '512x512';
                const imageFilter = document.getElementById('imageFilter')?.value || 'none';

                // Determine generation mode
                let generationMode = 'standard';
                if (this.storyBookMode) generationMode = 'storybook';
                if (this.birthdayCardMode) generationMode = 'birthday';

                const isEditing = !!this.uploadedImage;

                const requestDetails = {
                    prompt,
                    mode: generationMode,
                    isEditing,
                    uploadedImage: this.uploadedImage, // Pass stored image data
                    filters: {
                        amount: imageAmount,
                        size: imageSize,
                        filter: imageFilter
                    }
                };

                console.log(`Image ${isEditing ? 'editing' : 'generation'} request:`, requestDetails);

                // Clear input
                this.messageInput.value = '';

                // TODO: Replace simulation with call to actual generation function in imggen.js
                // Call the core processing function in ImageGenerator
                if (this.imageGenerator) {
                    this.imageGenerator.processRequest(requestDetails)
                        .catch(error => {
                            console.error("Error processing image request:", error);
                            // Optionally display error via imageGenerator's displayError or a dedicated UI method
                            if(this.imageGenerator.displayError) {
                                this.imageGenerator.displayError("An error occurred during the request.");
                            }
                        });
                } else {
                    console.error("ImageGenerator instance not available.");
                    // Display error in UI?
                }
            }
        };

        this.messageInput.onkeydown = (event) => {
            // Check if IMG GEN tab is active
             if (!this.imgGenContent.classList.contains('active')) {
                 // Fallback to original handler
                 if (typeof this.originalInputKeydownHandler === 'function') {
                    this.originalInputKeydownHandler.call(this.messageInput, event);
                 }
                 return;
             }

            // --- IMG GEN Enter Key Logic ---
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendButton.click(); // Trigger the overridden click handler
            }
            // Note: We are not calling the original keydown handler here for Enter in IMG GEN mode.
            // If other keys needed handling by the original, this would need adjustment.
        };
    }

    // TODO: Add methods to display generated images, show errors, etc.
    // These would likely be called by the core imggen.js module after API calls.
}
