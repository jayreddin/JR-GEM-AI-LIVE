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

        // State for IMG GEN mode (placeholders, actual state might be managed differently later)
        this.storyBookMode = false;
        this.birthdayCardMode = false;
        this.uploadedImage = null; // To store { data: base64, file: File }

        // State for Image Options
        this.imgOptions = {
            amount: '1',
            size: '512x512',
            weirdness: '1.00',
            filter: 'none'
        };

        // Instantiate the core logic handler
        this.imageGenerator = new ImageGenerator(agent);

        // Store original handlers and placeholder to restore them when switching tabs
        this.originalSendClickHandler = this.sendButton.onclick;
        this.originalInputKeydownHandler = this.messageInput.onkeydown;
        this.originalPlaceholder = this.messageInput.placeholder; // Store original placeholder

        this.initialize();
    }

    initialize() {
        console.log("Initializing ImageGenEvents...");
        // Wait for the specific elements within the imgGenContent to be potentially added by ImageGenUI
        requestAnimationFrame(() => {
            this.setupImgGenEventHandlers();
            // Don't override send button immediately, wait for tab activation
            // this.overrideSendButtonForImgGen();
        });
    }

    setupImgGenEventHandlers() {
        // --- Get Element References ---
        const newImageBtn = document.getElementById('newImageBtn');
        const imgUploadBtn = document.getElementById('imgUploadBtn');
        const imgOptionsBtn = document.getElementById('imgOptionsBtn');
        const storyBookBtn = document.getElementById('storyBookBtn');
        const birthdayCardBtn = document.getElementById('birthdayCardBtn');
        const imageDisplay = this.imgGenContent.querySelector('.image-display');

        const imgOptionsPopup = document.getElementById('imgOptionsPopup');
        const applyImgOptionsBtn = document.getElementById('applyImgOptionsBtn');
        const imgUploadPopup = document.getElementById('imgUploadPopup');
        const storyBookPopup = document.getElementById('storyBookPopup');
        const birthdayCardPopup = document.getElementById('birthdayCardPopup');
        const imageUploadInput = document.getElementById('imageUploadInput'); // Hidden input
        const imgUploadArea = document.getElementById('imgUploadArea'); // Upload area in popup
        const imgUploadPreview = document.getElementById('imgUploadPreview'); // Preview img in popup
        const imgUploadPlaceholder = document.getElementById('imgUploadPlaceholder'); // Placeholder text in popup

        // --- Generic Popup Logic ---
        const openPopup = (popupElement) => {
            if (popupElement) popupElement.style.display = 'flex';
        };
        const closePopup = (popupElement) => {
            if (popupElement) popupElement.style.display = 'none';
        };

        // --- Attach Listeners ---

        // Open Buttons
        if (imgOptionsBtn) imgOptionsBtn.addEventListener('click', () => openPopup(imgOptionsPopup));
        if (imgUploadBtn) imgUploadBtn.addEventListener('click', () => openPopup(imgUploadPopup));
        if (storyBookBtn) storyBookBtn.addEventListener('click', () => openPopup(storyBookPopup));
        if (birthdayCardBtn) birthdayCardBtn.addEventListener('click', () => openPopup(birthdayCardPopup));

        // Close Buttons & Overlays (for all popups)
        document.querySelectorAll('.popup-overlay').forEach(popup => {
            const closeBtn = popup.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closePopup(popup));
            }
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    closePopup(popup);
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
