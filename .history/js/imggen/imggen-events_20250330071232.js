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

                }
            });
        });

        // Apply Image Options Button
        if (applyImgOptionsBtn && imgOptionsPopup) {
            applyImgOptionsBtn.addEventListener('click', () => {
                const amount = imgOptionsPopup.querySelector('#imgGenAmount')?.value || this.imgOptions.amount;
                const size = imgOptionsPopup.querySelector('#imgGenSize')?.value || this.imgOptions.size;
                const weirdness = imgOptionsPopup.querySelector('#imgGenWeirdness')?.value || this.imgOptions.weirdness;
                const filter = imgOptionsPopup.querySelector('#imgGenFilter')?.value || this.imgOptions.filter;

                // Validate weirdness
                let validWeirdness = parseFloat(weirdness);
                if (isNaN(validWeirdness) || validWeirdness < 1.0) validWeirdness = 1.0;
                if (validWeirdness > 2.0) validWeirdness = 2.0;

                this.imgOptions = { amount, size, weirdness: validWeirdness.toFixed(2), filter };
                console.log("Image Options Applied:", this.imgOptions);
                closePopup(imgOptionsPopup);
            });
        } else {
             console.warn("Apply Image Options button or popup not found.");
        }

        // Placeholder Apply Buttons for Mode Popups
        storyBookPopup?.querySelector('.apply-btn')?.addEventListener('click', () => {
            console.log("Apply Story Book options (placeholder)");
            // TODO: Set storyBookMode state, potentially update UI
            this.storyBookMode = true; // Example state change
            this.birthdayCardMode = false;
            closePopup(storyBookPopup);
        });
        birthdayCardPopup?.querySelector('.apply-btn')?.addEventListener('click', () => {
            console.log("Apply Birthday Card options (placeholder)");
            // TODO: Set birthdayCardMode state, potentially update UI
            this.birthdayCardMode = true; // Example state change
            this.storyBookMode = false;
            closePopup(birthdayCardPopup);
        });

        // --- Image Upload Handler ---
        // Trigger hidden file input when the upload area is clicked
        if (imgUploadArea && imageUploadInput) {
            imgUploadArea.addEventListener('click', () => {
                imageUploadInput.click();
            });
            // TODO: Add drag and drop listeners to imgUploadArea if desired
        } else {
            console.warn("Upload area or hidden input not found.");
        }

        // Handle file selection from the hidden input
        if (imageUploadInput && imageDisplay && imgUploadBtn && imgUploadPreview && imgUploadPlaceholder && imgUploadPopup) {
            imageUploadInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    // Basic validation (optional)
                    if (!file.type.startsWith('image/')){
                        alert('Please select an image file.');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imageDataUrl = event.target.result;

                        // Show preview in the popup
                        if (imgUploadPreview) {
                            imgUploadPreview.src = imageDataUrl;
                            imgUploadPreview.style.display = 'block';
                        }
                        if (imgUploadPlaceholder) {
                            imgUploadPlaceholder.style.display = 'none'; // Hide placeholder text
                        }

                        // Store the image data
                        this.uploadedImage = {
                            data: imageDataUrl, // Base64 data URL
                            file: file
                        };
                        console.log("Image selected and stored for editing.");

                        // Add visual indicator to the main upload button
                        if (imgUploadBtn) {
                            imgUploadBtn.classList.add('upload-active');
                        }

                        // Display the image in the main display area immediately
                        if (imageDisplay) {
                            imageDisplay.innerHTML = ''; // Clear placeholder/previous
                            const mainImg = document.createElement('img');
                            mainImg.src = imageDataUrl;
                            mainImg.classList.add('generated-image');
                            mainImg.alt = 'Uploaded image for editing';
                            imageDisplay.appendChild(mainImg);
                        }

                        // Close the upload popup after selection
                        closePopup(imgUploadPopup);
                    };
                    reader.onerror = (error) => {
                        console.error("Error reading file:", error);
                        alert("Failed to read the selected image.");
                         // Reset popup state
                        if (imgUploadPreview) imgUploadPreview.style.display = 'none';
                        if (imgUploadPlaceholder) imgUploadPlaceholder.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
                 // Reset the input value so the 'change' event fires even if the same file is selected again
                e.target.value = null;
            });
        } else {
             console.warn("Required elements for image upload handling not found.");
        }

        // --- New Image Button Handler ---
        if (newImageBtn && imageDisplay && imgUploadBtn) {
            newImageBtn.addEventListener('click', () => {
                if (imageDisplay) {
                    imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
                }
                if (imgUploadBtn) {
                    imgUploadBtn.classList.remove('upload-active'); // Remove indicator from upload button
                }
                this.uploadedImage = null; // Clear stored image data
                console.log("New image context started.");
                // Also reset preview in upload popup
                if (imgUploadPreview) imgUploadPreview.style.display = 'none';
                if (imgUploadPlaceholder) imgUploadPlaceholder.style.display = 'block';
                if (imageUploadInput) imageUploadInput.value = null; // Clear file input selection
            });
        } else {
             console.warn("Required elements for New Image button handler not found.");
        }

    } // End of setupImgGenEventHandlers

    // Method to be called when switching TO the IMG GEN tab
    activate() {
        console.log("Activating ImageGenEvents: Overriding send button and setting placeholder.");
        this.overrideSendButtonForImgGen();
        this.messageInput.placeholder = "Describe the image you want..."; // Set IMG GEN placeholder
    }

    // Method to be called when switching AWAY FROM the IMG GEN tab
    deactivate() {
        console.log("Deactivating ImageGenEvents: Restoring original send button handlers and placeholder.");
        this.sendButton.onclick = this.originalSendClickHandler;
        this.messageInput.onkeydown = this.originalInputKeydownHandler;
        this.messageInput.placeholder = this.originalPlaceholder; // Restore original placeholder
    }

    // Override send button and Enter key for IMG GEN mode
    overrideSendButtonForImgGen() {
        this.sendButton.onclick = (event) => {
            // Check if the IMG GEN tab is active
             if (!this.imgGenContent.classList.contains('active')) {
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

                // Get filter settings from stored state
                const { amount, size, weirdness, filter } = this.imgOptions;

                // Determine generation mode based on internal state (set by popup apply buttons)
                let generationMode = 'standard';
                if (this.storyBookMode) generationMode = 'storybook';
                if (this.birthdayCardMode) generationMode = 'birthday';

                const isEditing = !!this.uploadedImage;

                const requestDetails = {
                    prompt,
                    mode: generationMode,
                    isEditing,
                    uploadedImage: this.uploadedImage, // Pass stored image data { data: base64, file: File }
                    filters: {
                        amount: amount,
                        size: size,
                        weirdness: weirdness,
                        filter: filter
                    }
                };

                console.log(`Image ${isEditing ? 'editing' : 'generation'} request:`, requestDetails);

                // Clear input
                this.messageInput.value = '';

                // Call the core processing function in ImageGenerator
                if (this.imageGenerator) {
                    this.imageGenerator.processRequest(requestDetails)
                        .catch(error => {
                            console.error("Error processing image request:", error);
                            if(this.imageGenerator.displayError) {
                                this.imageGenerator.displayError("An error occurred during the request.");
                            }
                        });
                } else {
                    console.error("ImageGenerator instance not available.");
                    // Display error in UI?
                     if (imageDisplay) {
                         imageDisplay.innerHTML = '<div class="error-text">Image Generator not available.</div>';
                     }
                }
            }
        };

        this.messageInput.onkeydown = (event) => {
            // Check if IMG GEN tab is active
             if (!this.imgGenContent.classList.contains('active')) {
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
        };
    }

    // TODO: Add methods to display generated images, show errors, etc.
    // These would likely be called by the core imggen.js module after API calls.
}
