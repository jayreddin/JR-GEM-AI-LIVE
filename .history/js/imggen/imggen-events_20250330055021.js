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
        // Using a MutationObserver or a slight delay might be more robust,
        // but for now, assuming elements exist shortly after instantiation.
        // A better approach would be to have ImageGenUI return the created elements or IDs.
        requestAnimationFrame(() => {
            this.setupImgGenEventHandlers();
            this.overrideSendButtonForImgGen();
        });
    }

    setupImgGenEventHandlers() {
        // --- Get Element References ---
        // Declare all variables used in this function scope once.
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

                this.imgOptions = { amount, size, weirdness, filter };
                console.log("Image Options Applied:", this.imgOptions);
                closePopup(imgOptionsPopup);
            });
        } else {
             console.warn("Apply Image Options button or popup not found.");
        }

        // Placeholder Apply Buttons for Mode Popups
        storyBookPopup?.querySelector('.apply-btn')?.addEventListener('click', () => {
            console.log("Apply Story Book options (placeholder)");
            closePopup(storyBookPopup);
        });
        birthdayCardPopup?.querySelector('.apply-btn')?.addEventListener('click', () => {
            console.log("Apply Birthday Card options (placeholder)");
            closePopup(birthdayCardPopup);
        });


        // --- Old Filter Logic (Commented Out) ---
        /*
        const filtersBtn = document.getElementById('filtersBtn');
        const filtersPopup = document.getElementById('filtersPopup');
        const closeFiltersBtn = document.getElementById('closeFiltersBtn');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (filtersBtn && filtersPopup && closeFiltersBtn) { ... }
        */

        // --- Image Upload Handler (Revised for Popup) ---
        const imgUploadArea = document.getElementById('imgUploadArea');
        const imgUploadPreview = document.getElementById('imgUploadPreview');
        const imgUploadPlaceholder = document.getElementById('imgUploadPlaceholder');

        // Trigger hidden file input when the upload area is clicked
        if (imgUploadArea && imageUploadInput) {
            imgUploadArea.addEventListener('click', () => {
                imageUploadInput.click();
            });
            // TODO: Add drag and drop listeners to imgUploadArea if desired
        }

        // Handle file selection from the hidden input
        if (imageUploadInput && imageDisplay && imgUploadBtn && imgUploadPreview && imgUploadPlaceholder) {
            imageUploadInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // Show preview in the popup
                        imgUploadPreview.src = event.target.result;
                        imgUploadPreview.style.display = 'block';
                        imgUploadPlaceholder.style.display = 'none'; // Hide placeholder text

                        // Store the image data (for sending to backend/displaying outside popup)
                        this.uploadedImage = {
                            data: event.target.result,
                            file: e.target.files[0]
                        };
                        console.log("Image selected and stored for editing.");

                        // Add visual indicator to the main upload button
                        imgUploadBtn.classList.add('upload-active');

                        // Optionally display the image in the main display area immediately
                        if (imageDisplay) {
                            imageDisplay.innerHTML = ''; // Clear placeholder/previous
                            const mainImg = document.createElement('img');
                            mainImg.src = event.target.result;
                            mainImg.classList.add('generated-image');
                            mainImg.alt = 'Uploaded image for editing';
                            imageDisplay.appendChild(mainImg);
                        }

                        // Close the upload popup after selection
                        closePopup(imgUploadPopup); // Ensure imgUploadPopup is accessible here
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        } else {
             console.warn("Upload elements (input, display, button, preview, or placeholder) not found for event setup.");
        }


        // --- New Image Button Handler ---
                            this.uploadedImage = {
                                data: event.target.result,
                                file: e.target.files[0]
                            };
                            console.log("Image uploaded and stored for editing.");

                            // Add visual indicator to the button that opened the popup
                            imgUploadBtn.classList.add('upload-active');
                        }
                        // Close the upload popup after selection
                        closePopup(imgUploadPopup);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        } else {
             console.warn("Upload elements (input, display, or button) not found for event setup.");
        }


        // --- New Image Button Handler ---
        if (newImageBtn && imageDisplay && imgUploadBtn) { // Added imgUploadBtn check
            newImageBtn.addEventListener('click', () => {
                imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
                imgUploadBtn.classList.remove('upload-active'); // Remove indicator from upload button
                this.uploadedImage = null;
                console.log("New image context started.");
            });
        } else {
             console.warn("New Image button, display, or upload button not found for event setup.");
        }


        // --- Mode Button Logic (Now just opens popups) ---
        // The openPopup listeners are already attached above.
        // The .active class toggling might be handled differently now,
        // perhaps based on applying options within the popups later.
        // For now, remove the direct toggle logic.

        // if (storyBookBtn) { ... } // Removed direct toggle
        // if (birthdayCardBtn) { ... } // Removed direct toggle

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

                // Get filter settings from stored state
                const { amount, size, weirdness, filter } = this.imgOptions;

                // Determine generation mode (TODO: Refine based on popup interactions later)
                let generationMode = 'standard';
                // if (this.storyBookMode) generationMode = 'storybook'; // Placeholder logic
                // if (this.birthdayCardMode) generationMode = 'birthday'; // Placeholder logic

                const isEditing = !!this.uploadedImage;

                const requestDetails = {
                    prompt,
                    mode: generationMode,
                    isEditing,
                    uploadedImage: this.uploadedImage, // Pass stored image data
                    filters: {
                        amount: amount,
                        size: size,
                        weirdness: weirdness, // Add weirdness
                        filter: filter
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
