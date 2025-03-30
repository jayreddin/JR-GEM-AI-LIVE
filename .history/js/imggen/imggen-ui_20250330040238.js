
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
            <div class="img-gen-controls">
                <button id="filtersBtn" class="img-gen-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    Filters
                </button>
                <button id="uploadImageBtn" class="img-gen-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload Image
                </button>
                <button id="newImageBtn" class="img-gen-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    New Image
                </button>
                <button id="storyBookBtn" class="img-gen-btn mode-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    Story Book
                </button>
                <button id="birthdayCardBtn" class="img-gen-btn mode-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M16 2v4"></path>
                        <path d="M8 2v4"></path>
                        <path d="M12 11v4"></path>
                    </svg>
                    Birthday Card
                </button>
            </div>
            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
            <div id="filtersPopup" class="popup-overlay">
                <div class="popup-content">
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
