/**
 * Image Generation UI Module
 */
export class ImageGenUI {
    constructor() {
        this.imageDisplay = document.getElementById('imgGenContent');
        this.activePopup = null;
        this.setupUI();
    }

    setupUI() {
        this.imageDisplay.innerHTML = `
            <div id="imgGenModelDisplay" class="img-gen-model-display">
                Gemini 2.0 lash-exp-image-generation
            </div>
            <div class="image-display">
                <div class="placeholder-text">Generated images will appear here</div>
            </div>
            <div id="imgGenControlBar" class="control-bar">
                <button id="newImageBtn" class="control-btn" aria-label="New Image Session">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
                </button>
                <button id="imgUploadBtn" class="control-btn" aria-label="Upload Image">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                </button>
                <button id="imgOptionsBtn" class="control-btn" aria-label="Image Options">
                    <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                </button>
                <button id="storyBookBtn" class="control-btn" aria-label="Story Book Mode">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                </button>
                <button id="birthdayCardBtn" class="control-btn" aria-label="Birthday Card Mode">
                    <svg width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M12 10v6M9 13h6" stroke="currentColor" stroke-width="2" fill="none"/></svg>
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
                        <img id="imgUploadPreview" src="#" alt="Image Preview" style="display: none;">
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
}
