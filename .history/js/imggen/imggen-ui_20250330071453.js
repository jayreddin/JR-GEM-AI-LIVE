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
                    <!-- Card -->
                </button>
            </div>
            <!-- Hidden file input for upload popup -->
            <input type="file" id="imageUploadInput" accept="image/*" style="display: none;">

            <!-- Popups (defined below) -->
            <div id="imgOptionsPopup" class="popup-overlay">
                 <div class="popup-content">
                    <h3>Image Generation Options</h3>
                    <button class="close-btn" data-popup="imgOptionsPopup">&times;</button>
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
                        <label for="imgGenWeirdness">Weirdness (Temperature):</label>
                        <input type="number" id="imgGenWeirdness" name="weirdness" min="1.0" max="2.0" step="0.01" value="1.00">
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
             <div id="imgUploadPopup" class="popup-overlay">
                 <div class="popup-content">
                    <h3>Upload Image for Editing</h3>
                    <button class="close-btn" data-popup="imgUploadPopup">&times;</button>
                    <!-- Area to click for file selection -->
                    <div id="imgUploadArea" style="border: 2px dashed var(--accent-color); padding: 20px; text-align: center; cursor: pointer; margin-bottom: 15px; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                        <span id="imgUploadPlaceholder">Click or drag image here</span>
                        <img id="imgUploadPreview" src="#" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;"/>
                    </div>
                    <!-- Optional: Add a confirm/cancel button if needed, or just close on selection -->
                 </div>
            </div>
             <div id="storyBookPopup" class="popup-overlay">
                 <div class="popup-content">
                    <h3>Story Book Mode Options</h3>
                    <button class="close-btn" data-popup="storyBookPopup">&times;</button>
                    <p>Story Book options placeholder...</p>
                    <button class="apply-btn">Apply</button>
                 </div>
            </div>
             <div id="birthdayCardPopup" class="popup-overlay">
                 <div class="popup-content">
                    <h3>Birthday Card Mode Options</h3>
                    <button class="close-btn" data-popup="birthdayCardPopup">&times;</button>
                    <p>Birthday Card options placeholder...</p>
                    <button class="apply-btn">Apply</button>
                 </div>
            </div>

            <!-- Old Filters Popup (to be replaced by imgOptionsPopup) -->
            <!-- <div id="filtersPopup" class="popup-overlay"> -->
                <!-- <div class="popup-content"> -->
                    <h3>Image Generation Settings</h3>
                    <button id="closeFiltersBtn" class="close-btn">&times;</button>
                    <div class="filter-option">
                        <label for="imageAmount">Number of Images:</label>
                        <select id="imageAmount">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="imageSize">Image Size:</label>
                        <select id="imageSize">
                            <option value="256x256">256x256</option>
                            <option value="512x512">512x512</option>
                            <option value="1024x1024">1024x1024</option>
                        </select>
                    </div>
                    <div class="filter-option">
                        <label for="imageFilter">Style Filter:</label>
                        <select id="imageFilter">
                            <option value="none">None</option>
                            <option value="anime">Anime</option>
                            <option value="digital">Digital Art</option>
                            <option value="photo">Photographic</option>
                        </select>
                    </div>
                    <button id="applyFiltersBtn" class="apply-btn">Apply Settings</button>
                </div>
            </div>`;
    }
}
