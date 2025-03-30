
// Image Generation UI Module
export class ImageGenUI {
    constructor() {
        this.imageDisplay = document.getElementById('imgGenContent');
        this.setupUI();
    }

    setupUI() {
        // Create the main container for IMG GEN
        this.imageDisplay.innerHTML = `
            <div class="image-display">
                <div class="placeholder-text">Generated images will appear here</div>
            </div>
            <div class="img-gen-controls control-bar active"> <!-- Reuse control-bar class for consistency -->
                <!-- New Chat Button (Reuse existing ID if functionality is the same) -->
                <button id="newImageBtn" class="img-gen-btn" aria-label="New Image Session">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <!-- New -->
                </button>
                 <!-- Image Upload Button -->
                <button id="imgUploadBtn" class="img-gen-btn" aria-label="Upload Image">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <!-- Upload -->
                </button>
                 <!-- Image Options Button -->
                <button id="imgOptionsBtn" class="img-gen-btn" aria-label="Image Options">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                    <!-- Options -->
                </button>
                 <!-- Story Book Button -->
                <button id="storyBookBtn" class="img-gen-btn mode-btn" aria-label="Story Book Mode">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <!-- Story -->
                </button>
                 <!-- Birthday Card Button -->
                <button id="birthdayCardBtn" class="img-gen-btn mode-btn" aria-label="Birthday Card Mode">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>
                         <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
                         <path d="M14 7h.01"></path>
                         <path d="M10 7h.01"></path>
                         <path d="M12 15c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"></path>
                    </svg>
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
                <!-- Upload Popup Content (Added in next step) -->
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
