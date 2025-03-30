/**
 * Image Generation UI Module
 * Handles the user interface for the image generation tab
 */
export class ImageGenUI {
    constructor() {
        this.imageDisplay = document.getElementById('imgGenContent');
        this.activePopup = null;
        this.setupUI();
        this.setupTabListener();
    }

    setupUI() {
        // Create the main container for IMG GEN
        this.imageDisplay.innerHTML = `
            <div id="imgGenModelDisplay" class="img-gen-model-display">
                Model: gemini-2.0-flash-exp-image-generation
            </div>
            <div class="image-display">
                <div class="placeholder-text">Generated images will appear here</div>
            </div>
            <div id="imgGenControlBar" class="control-bar">
                <button id="newImageBtn" class="img-gen-btn" aria-label="New Image Session">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                </button>
                <button id="imgUploadBtn" class="img-gen-btn" aria-label="Upload Image">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </button>
                <button id="imgOptionsBtn" class="img-gen-btn" aria-label="Image Options">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20V10M18.5 18L14 13.5M5.5 18L10 13.5"></path>
                    </svg>
                </button>
                <button id="storyBookBtn" class="img-gen-btn mode-btn" aria-label="Story Book Mode">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>Story</span>
                </button>
                <button id="birthdayCardBtn" class="img-gen-btn mode-btn" aria-label="Birthday Card Mode">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>Card</span>
                </button>
            </div>

            <!-- Hidden file input -->
            <input type="file" id="imageUploadInput" accept="image/*" style="display: none;">

            <!-- Popups -->
            <div id="imgOptionsPopup" class="popup-overlay" role="dialog" aria-modal="true">
                <div class="popup-content">
                    <h3>Image Generation Options</h3>
                    <button class="close-btn" data-popup="imgOptionsPopup" aria-label="Close">&times;</button>
                    <div class="filter-option">
                        <label for="imgGenAmount">Number of Images:</label>
                        <select id="imgGenAmount">
                            <option value="1" selected>1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="imgGenSize">Image Size:</label>
                        <select id="imgGenSize">
                            <option value="512x512" selected>512x512</option>
                            <option value="1024x1024">1024x1024</option>
                            <option value="1024x576">1024x576 (Landscape)</option>
                            <option value="576x1024">576x1024 (Portrait)</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="imgGenWeirdness">Creativity Level:</label>
                        <input type="number" id="imgGenWeirdness" min="1.0" max="2.0" step="0.1" value="1.0">
                    </div>
                    <div class="filter-option">
                        <label for="imgGenFilter">Style Filter:</label>
                        <select id="imgGenFilter">
                            <option value="none" selected>None</option>
                            <option value="anime">Anime</option>
                            <option value="digital">Digital Art</option>
                            <option value="photo">Photographic</option>
                            <option value="cinematic">Cinematic</option>
                            <option value="lowpoly">Low Poly</option>
                        </select>
                    </div>
                    <button id="applyImgOptionsBtn" class="apply-btn">Apply Options</button>
                </div>
            </div>

            <div id="imgUploadPopup" class="popup-overlay" role="dialog" aria-modal="true">
                <div class="popup-content">
                    <h3>Upload Image for Editing</h3>
                    <button class="close-btn" data-popup="imgUploadPopup" aria-label="Close">&times;</button>
                    <div id="imgUploadArea">
                        <span id="imgUploadPlaceholder">Click or drag image here</span>
                        <img id="imgUploadPreview" src="#" alt="Image Preview" style="display: none;"/>
                    </div>
                </div>
            </div>

            <div id="storyBookPopup" class="popup-overlay" role="dialog" aria-modal="true">
                <div class="popup-content">
                    <h3>Story Book Mode</h3>
                    <button class="close-btn" data-popup="storyBookPopup" aria-label="Close">&times;</button>
                    <div class="filter-option">
                        <label for="storyStyle">Story Style:</label>
                        <select id="storyStyle">
                            <option value="children">Children's Book</option>
                            <option value="fantasy">Fantasy</option>
                            <option value="manga">Manga</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="storyPages">Number of Pages:</label>
                        <select id="storyPages">
                            <option value="1">1 Page</option>
                            <option value="2">2 Pages</option>
                            <option value="4">4 Pages</option>
                        </select>
                    </div>
                    <button class="apply-btn">Create Story</button>
                </div>
            </div>

            <div id="birthdayCardPopup" class="popup-overlay" role="dialog" aria-modal="true">
                <div class="popup-content">
                    <h3>Birthday Card Settings</h3>
                    <button class="close-btn" data-popup="birthdayCardPopup" aria-label="Close">&times;</button>
                    <div class="filter-option">
                        <label for="cardStyle">Card Style:</label>
                        <select id="cardStyle">
                            <option value="fun">Fun & Playful</option>
                            <option value="elegant">Elegant</option>
                            <option value="cute">Cute</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="cardText">Custom Message:</label>
                        <input type="text" id="cardText" placeholder="Enter birthday message">
                    </div>
                    <button class="apply-btn">Create Card</button>
                </div>
            </div>`;
    }

    setupTabListener() {
        // Listen for tab changes to handle model display
        const imgGenTab = document.getElementById('imgGenTab');
        const liveTab = document.getElementById('liveTab');
        
        if (imgGenTab && liveTab) {
            imgGenTab.addEventListener('change', () => {
                document.querySelector('.model-selector-container')?.classList.add('hidden');
                document.getElementById('imgGenModelDisplay')?.classList.add('active');
                document.getElementById('imgGenControlBar')?.classList.add('active');
            });

            liveTab.addEventListener('change', () => {
                document.querySelector('.model-selector-container')?.classList.remove('hidden');
                document.getElementById('imgGenModelDisplay')?.classList.remove('active');
                document.getElementById('imgGenControlBar')?.classList.remove('active');
            });
        }
    }
}
