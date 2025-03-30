/**
 * Manages the settings dialog UI, including creating the dialog,
 * handling tab switching, loading/saving settings from localStorage,
 * and interacting with various settings controls.
 */
import { settingsTemplate } from './settings-template.js'; // HTML template for the dialog

class SettingsManager {
    constructor() {
        this.dialog = null;      // Reference to the main dialog DOM element
        this.overlay = null;     // Reference to the background overlay DOM element
        this.isOpen = false;     // Flag indicating if the dialog is currently visible
        this.isInitialized = false; // Flag indicating if the dialog has been created in the DOM
        this.elements = {};      // Cache for frequently accessed DOM elements within the dialog

        console.info("SettingsManager instance created.");
    }

    /**
     * Creates and initializes the settings dialog DOM structure if it hasn't been already.
     * Adds the dialog and overlay to the document body.
     */
    initialize() {
        if (this.isInitialized) {
            // console.debug("SettingsManager already initialized.");
            return;
        }
        console.info("Initializing SettingsManager DOM...");

        try {
            // --- Create Overlay ---
            this.overlay = document.createElement('div');
            this.overlay.className = 'settings-overlay'; // CSS class for styling (e.g., background dim)
            this.overlay.setAttribute('aria-hidden', 'true'); // Initially hidden for accessibility
            // Add event listener to close dialog when clicking outside of it (on the overlay)
            this.overlay.addEventListener('click', (event) => {
                // Only close if the click target is the overlay itself, not a child element (like the dialog)
                if (event.target === this.overlay) {
                    this.hide();
                }
            });

            // --- Create Dialog ---
            this.dialog = document.createElement('div');
            this.dialog.className = 'settings-dialog';
            this.dialog.setAttribute('role', 'dialog'); // Accessibility role
            this.dialog.setAttribute('aria-modal', 'true'); // Indicates it's a modal dialog
            this.dialog.setAttribute('aria-labelledby', 'settings-dialog-title'); // Requires an element with this ID for title

            // Populate dialog content from the imported template
            this.dialog.innerHTML = settingsTemplate;

            // Add a title element for accessibility (referenced by aria-labelledby)
            const titleElement = document.createElement('h2');
            titleElement.id = 'settings-dialog-title';
            titleElement.textContent = 'Application Settings';
            titleElement.style.position = 'absolute'; // Visually hide the title, but keep for screen readers
            titleElement.style.left = '-9999px';
            this.dialog.insertBefore(titleElement, this.dialog.firstChild);


            // Prevent clicks inside the dialog from bubbling up and closing it via the overlay listener
            this.dialog.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            // --- Add Close Button Listener ---
            const closeBtn = this.dialog.querySelector('.settings-close-btn'); // Assuming template has a close button
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            } else {
                console.warn("Settings dialog template might be missing a '.settings-close-btn'.");
                // As a fallback, maybe allow Esc key to close?
                // Note: This would need careful implementation to avoid conflicts.
            }

            // --- Assemble and Append ---
            this.overlay.appendChild(this.dialog); // Add dialog inside the overlay
            document.body.appendChild(this.overlay); // Add overlay (and dialog) to the main document

            // --- Cache Elements and Bind Events ---
            this._cacheElements(); // Find and store references to internal elements
            this._bindEvents(); // Set up listeners for tabs, inputs, save button etc.

            this.isInitialized = true;
            console.info("SettingsManager DOM initialized successfully.");

        } catch (error) {
            console.error("Failed to initialize SettingsManager DOM:", error);
            // Clean up potentially partially created elements
            if (this.overlay && this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }
            this.dialog = null;
            this.overlay = null;
            this.isInitialized = false;
            // Notify user? Depends on how critical settings are.
        }
    }

    /** Caches references to important DOM elements within the dialog for faster access. */
    _cacheElements() {
        if (!this.dialog) return; // Should not happen if initialized correctly

        // Helper to query and warn if element not found
        const query = (selector) => {
            const element = this.dialog.querySelector(selector);
            // if (!element) console.warn(`SettingsManager: Element not found for selector "${selector}"`);
            return element;
        };
        const queryAll = (selector) => {
            const elements = this.dialog.querySelectorAll(selector);
            // if (elements.length === 0) console.warn(`SettingsManager: No elements found for selector "${selector}"`);
            return elements;
        };


        this.elements = {
            // Keep direct references to dialog and overlay
            dialog: this.dialog,
            overlay: this.overlay,

            // Tabs & Content Panes
            tabs: queryAll('.settings-tab'),
            tabContents: queryAll('.settings-tab-content'),

            // API Tab
            apiKeyInput: query('#apiKey'),
            deepgramApiKeyInput: query('#deepgramApiKey'),

            // UI Tab
            themeToggle: query('#themeToggle'),
            textSizeInput: query('#textSize'),
            textSizeValue: query('#textSizeValue'),
            timestampToggle: query('#timestampToggle'),
            speakToggle: query('#speakToggle'),

            // System Tab
            systemInstructionsInput: query('#systemInstructions'),

            // Media Tab
            fpsInput: query('#fps'),
            fpsValue: query('#fpsValue'),
            resizeWidthInput: query('#resizeWidth'),
            resizeWidthValue: query('#resizeWidthValue'),
            qualityInput: query('#quality'),
            qualityValue: query('#qualityValue'),
            voiceSelect: query('#voice'),
            sampleRateInput: query('#sampleRate'),
            sampleRateValue: query('#sampleRateValue'),

            // Advanced Tab
            temperatureInput: query('#temperature'),
            temperatureValue: query('#temperatureValue'),
            topPInput: query('#topP'),
            topPValue: query('#topPValue'),
            topKInput: query('#topK'),
            topKValue: query('#topKValue'),

            // Safety Tab
            harassmentInput: query('#harassmentThreshold'),
            harassmentValue: query('#harassmentValue'),
            hateSpeechInput: query('#hateSpeechThreshold'), // Assuming ID exists in template
            hateSpeechValue: query('#hateSpeechValue'),   // Assuming ID exists in template
            dangerousInput: query('#dangerousContentThreshold'),
            dangerousValue: query('#dangerousValue'),
            sexualInput: query('#sexuallyExplicitThreshold'),
            sexualValue: query('#sexualValue'),
            civicInput: query('#civicIntegrityThreshold'),
            civicValue: query('#civicValue'),

            // Buttons
            saveBtn: query('#settingsSaveBtn'),
            closeBtn: query('.settings-close-btn') // Also cache close button if needed elsewhere
        };
        // console.debug("SettingsManager elements cached:", this.elements);
    }

    /** Binds event listeners to the cached elements within the dialog. */
    _bindEvents() {
        // --- Save Button ---
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => {
                this._saveSettings();
                this.hide();
                // Dispatch a custom event to notify other parts of the app that settings might have changed
                // Example: Agent might need to reload config, ThemeManager might update theme
                const event = new CustomEvent('settingsUpdated');
                document.dispatchEvent(event);
                console.info("Settings saved and 'settingsUpdated' event dispatched.");
            });
        }

        // --- Tab Switching ---
        if (this.elements.tabs && this.elements.tabs.length > 0) {
            this.elements.tabs.forEach(tab => {
                // Use dataset.tab to link tab button to content pane ID
                const tabId = tab.dataset.tab;
                if (tabId) {
                    tab.addEventListener('click', () => this._switchTab(tabId));
                } else {
                    console.warn("Settings tab found without 'data-tab' attribute:", tab);
                }
            });
        }

        // --- Real-time Value Updates for Sliders/Inputs ---
        // List of input elements and their corresponding display value elements
        const valueUpdateMappings = {
            sampleRateInput: 'sampleRateValue',
            temperatureInput: 'temperatureValue',
            topPInput: 'topPValue',
            topKInput: 'topKValue',
            fpsInput: 'fpsValue',
            resizeWidthInput: 'resizeWidthValue',
            qualityInput: 'qualityValue',
            harassmentInput: 'harassmentValue',
            hateSpeechInput: 'hateSpeechValue',
            dangerousInput: 'dangerousValue',
            sexualInput: 'sexualValue',
            civicInput: 'civicValue',
            textSizeInput: 'textSizeValue' // Include text size here as well
        };

        Object.entries(valueUpdateMappings).forEach(([inputId, valueId]) => {
            const inputElement = this.elements[inputId];
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    this._updateDisplayValues(); // Update all display values on any input change
                    // Special handling for text size to apply style immediately
                    if (inputId === 'textSizeInput') {
                        // Debouncing this could improve performance slightly on rapid sliding, but likely negligible
                        this._applyTextSize();
                    }
                });
            }
        });

        // --- Specific Toggle Handlers (if needed beyond saving) ---
        // Example: Theme toggle might apply theme instantly via ThemeManager
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('change', () => {
                // This assumes a ThemeManager exists and handles the logic
                // You might need to import or access it differently.
                // For now, saving handles the persistence, and theme applies on load/save event.
                console.debug("Theme toggle changed. Theme will apply on save/reload via settingsUpdated event.");
            });
        }

        // Example: Speak toggle updates global state or ChatManager immediately
        if (this.elements.speakToggle) {
            this.elements.speakToggle.addEventListener('change', (event) => {
                const isEnabled = event.target.checked;
                window.speechEnabled = isEnabled; // Update global flag (used by dom/events.js)
                // Notify ChatManager immediately
                if (window.chatManager && window.chatManager.updateSpeechStatus) {
                    window.chatManager.updateSpeechStatus(isEnabled);
                }
                // Persist immediately? Or wait for Save button? Currently waits for save.
            });
        }

    }

    /** Switches the visible tab content based on the clicked tab's data attribute. */
    _switchTab(tabId) {
        if (!this.elements.tabs || !this.elements.tabContents) return;

        // Hide all content panes
        this.elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Deactivate all tabs
        this.elements.tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // Show the selected content pane
        const selectedContent = this.dialog.querySelector(`#${tabId}-tab`); // Content panes have IDs like "api-tab"
        if (selectedContent) {
            selectedContent.classList.add('active');
        } else {
            console.warn(`No tab content found for ID: #${tabId}-tab`);
        }

        // Activate the clicked tab
        const selectedTab = this.dialog.querySelector(`.settings-tab[data-tab="${tabId}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
    }

    /** Loads settings from localStorage and populates the dialog fields. */
    _loadSettings() {
        console.info("Loading settings from localStorage...");
        // Helper to load item safely
        const load = (key, defaultValue = '') => {
            try {
                return localStorage.getItem(key) || defaultValue;
            } catch (error) {
                console.error(`Error reading localStorage key "${key}":`, error);
                return defaultValue;
            }
        };
        // Helper to load boolean toggle state
        const loadBool = (key, defaultValue = false) => load(key, defaultValue.toString()) === 'true';

        try {
            // API Tab
            if (this.elements.apiKeyInput) this.elements.apiKeyInput.value = load('apiKey');
            if (this.elements.deepgramApiKeyInput) this.elements.deepgramApiKeyInput.value = load('deepgramApiKey');

            // UI Tab
            if (this.elements.themeToggle) this.elements.themeToggle.checked = loadBool('darkMode');
            if (this.elements.textSizeInput) this.elements.textSizeInput.value = load('textSize', '16');
            if (this.elements.timestampToggle) this.elements.timestampToggle.checked = loadBool('showTimestamps');
            if (this.elements.speakToggle) this.elements.speakToggle.checked = loadBool('speakEnabled');

            // System Tab
            if (this.elements.systemInstructionsInput) this.elements.systemInstructionsInput.value = load('systemInstructions', 'You are a helpful assistant.');

            // Media Tab
            if (this.elements.fpsInput) this.elements.fpsInput.value = load('fps', '5');
            if (this.elements.resizeWidthInput) this.elements.resizeWidthInput.value = load('resizeWidth', '640');
            if (this.elements.qualityInput) this.elements.qualityInput.value = load('quality', '0.4');
            if (this.elements.voiceSelect) this.elements.voiceSelect.value = load('voiceName', 'Aoede');
            if (this.elements.sampleRateInput) this.elements.sampleRateInput.value = load('sampleRate', '24000'); // Default often 24k for Gemini models

            // Advanced Tab
            if (this.elements.temperatureInput) this.elements.temperatureInput.value = load('temperature', '1.0'); // Adjusted default
            if (this.elements.topPInput) this.elements.topPInput.value = load('top_p', '0.95');
            if (this.elements.topKInput) this.elements.topKInput.value = load('top_k', '40'); // Adjusted default

            // Safety Tab
            if (this.elements.harassmentInput) this.elements.harassmentInput.value = load('harassmentThreshold', '3');
            if (this.elements.hateSpeechInput) this.elements.hateSpeechInput.value = load('hateSpeechThreshold', '3'); // Load hate speech
            if (this.elements.dangerousInput) this.elements.dangerousInput.value = load('dangerousContentThreshold', '3');
            if (this.elements.sexualInput) this.elements.sexualInput.value = load('sexuallyExplicitThreshold', '3');
            if (this.elements.civicInput) this.elements.civicInput.value = load('civicIntegrityThreshold', '3');

            // Update displayed values (like "16px", "High", etc.)
            this._updateDisplayValues();
            // Apply text size immediately on load
            this._applyTextSize();

            console.info("Settings loaded successfully.");
        } catch (error) {
            console.error("Error occurred during settings load:", error);
        }
    }

    /** Applies the current text size setting to the document root. */
    _applyTextSize() {
        if (this.elements.textSizeInput) {
            const size = this.elements.textSizeInput.value || '16'; // Default to 16 if value missing
            // Apply as CSS variable - assumes :root { font-size: var(--text-size); } or similar in CSS
            document.documentElement.style.setProperty('--text-size', `${size}px`);
            // console.debug(`Applied text size: ${size}px`);
        }
    }

    /** Saves the current values from the dialog fields to localStorage. */
    _saveSettings() {
        console.info("Saving settings to localStorage...");
        // Helper to save item safely
        const save = (key, value) => {
            try {
                if (value !== undefined && value !== null) {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.removeItem(key); // Remove item if value is null/undefined
                }
            } catch (error) {
                console.error(`Error writing localStorage key "${key}":`, error);
                // Potentially notify user (e.g., if storage quota exceeded)
            }
        };
        // Helper to save boolean toggle state
        const saveBool = (key, checked) => save(key, checked ? 'true' : 'false');

        try {
            // API Tab
            if (this.elements.apiKeyInput) save('apiKey', this.elements.apiKeyInput.value);
            if (this.elements.deepgramApiKeyInput) save('deepgramApiKey', this.elements.deepgramApiKeyInput.value);

            // UI Tab
            if (this.elements.themeToggle) saveBool('darkMode', this.elements.themeToggle.checked);
            if (this.elements.textSizeInput) save('textSize', this.elements.textSizeInput.value);
            if (this.elements.timestampToggle) saveBool('showTimestamps', this.elements.timestampToggle.checked);
            if (this.elements.speakToggle) saveBool('speakEnabled', this.elements.speakToggle.checked);

            // System Tab
            if (this.elements.systemInstructionsInput) save('systemInstructions', this.elements.systemInstructionsInput.value);

            // Media Tab
            if (this.elements.fpsInput) save('fps', this.elements.fpsInput.value);
            if (this.elements.resizeWidthInput) save('resizeWidth', this.elements.resizeWidthInput.value);
            if (this.elements.qualityInput) save('quality', this.elements.qualityInput.value);
            if (this.elements.voiceSelect) save('voiceName', this.elements.voiceSelect.value);
            if (this.elements.sampleRateInput) save('sampleRate', this.elements.sampleRateInput.value);

            // Advanced Tab
            if (this.elements.temperatureInput) save('temperature', this.elements.temperatureInput.value);
            if (this.elements.topPInput) save('top_p', this.elements.topPInput.value);
            if (this.elements.topKInput) save('top_k', this.elements.topKInput.value);

            // Safety Tab
            if (this.elements.harassmentInput) save('harassmentThreshold', this.elements.harassmentInput.value);
            if (this.elements.hateSpeechInput) save('hateSpeechThreshold', this.elements.hateSpeechInput.value); // Save hate speech
            if (this.elements.dangerousInput) save('dangerousContentThreshold', this.elements.dangerousInput.value);
            if (this.elements.sexualInput) save('sexuallyExplicitThreshold', this.elements.sexualInput.value);
            if (this.elements.civicInput) save('civicIntegrityThreshold', this.elements.civicInput.value);

            console.info("Settings saved successfully.");
        } catch (error) {
            console.error("Error occurred during settings save:", error);
        }
    }

    /** Updates the text content of display elements (spans next to sliders) based on current input values. */
    _updateDisplayValues() {
        // Helper to update text content safely
        const updateText = (element, text) => {
            if (element) {
                element.textContent = text;
            }
        };

        // UI Tab
        if (this.elements.textSizeInput) updateText(this.elements.textSizeValue, `${this.elements.textSizeInput.value}px`);

        // Media Tab
        if (this.elements.sampleRateInput) updateText(this.elements.sampleRateValue, `${this.elements.sampleRateInput.value} Hz`);
        if (this.elements.fpsInput) updateText(this.elements.fpsValue, `${this.elements.fpsInput.value} FPS`);
        if (this.elements.resizeWidthInput) updateText(this.elements.resizeWidthValue, `${this.elements.resizeWidthInput.value}px`);
        if (this.elements.qualityInput) updateText(this.elements.qualityValue, this.elements.qualityInput.value);

        // Advanced Tab
        if (this.elements.temperatureInput) updateText(this.elements.temperatureValue, this.elements.temperatureInput.value);
        if (this.elements.topPInput) updateText(this.elements.topPValue, this.elements.topPInput.value);
        if (this.elements.topKInput) updateText(this.elements.topKValue, this.elements.topKInput.value);

        // Safety Tab - Use label mapping
        const getLabel = (value) => this._getThresholdLabel(value);
        if (this.elements.harassmentInput) updateText(this.elements.harassmentValue, getLabel(this.elements.harassmentInput.value));
        if (this.elements.hateSpeechInput) updateText(this.elements.hateSpeechValue, getLabel(this.elements.hateSpeechInput.value));
        if (this.elements.dangerousInput) updateText(this.elements.dangerousValue, getLabel(this.elements.dangerousInput.value));
        if (this.elements.sexualInput) updateText(this.elements.sexualValue, getLabel(this.elements.sexualInput.value));
        if (this.elements.civicInput) updateText(this.elements.civicValue, getLabel(this.elements.civicInput.value));
    }

    /** Converts a numeric safety threshold value (0-3) to a human-readable label. */
    _getThresholdLabel(value) {
        const labels = {
            '0': 'Block None', // Use string keys
            '1': 'Block High Only',
            '2': 'Block Medium+',
            '3': 'Block Low+'
        };
        return labels[value] || 'Unknown'; // Default fallback
    }

    /** Shows the settings dialog. Initializes if needed. */
    show() {
        // Ensure dialog DOM is created first
        this.initialize();

        // Check if initialization was successful and elements exist
        if (!this.isInitialized || !this.overlay || !this.dialog) {
            console.error("Cannot show settings: Initialization failed or elements missing.");
            return;
        }

        if (!this.isOpen) {
            this._loadSettings(); // Load latest settings when opening
            this.overlay.classList.add('active');
            this.dialog.classList.add('active');
            this.overlay.setAttribute('aria-hidden', 'false'); // Make visible to accessibility tree
            this.isOpen = true;
            console.info("Settings dialog shown.");
            // Set initial focus, e.g., on the first tab or input
            this.elements.tabs?.[0]?.focus(); // Focus first tab if available
        } else {
            // console.debug("Settings dialog already open.");
        }
    }

    /** Hides the settings dialog. */
    hide() {
        // Check if elements exist before trying to hide
        if (!this.isInitialized || !this.overlay || !this.dialog) {
            // console.debug("Cannot hide settings: Elements missing or not initialized.");
            return;
        }

        if (this.isOpen) {
            this.overlay.classList.remove('active');
            this.dialog.classList.remove('active');
            this.overlay.setAttribute('aria-hidden', 'true'); // Hide from accessibility tree

            // Consider removing the dialog from DOM after transition, or keep it for performance
            // Using setTimeout can be brittle. If CSS transitions are used, listen for 'transitionend'.
            // For simplicity, we'll keep the elements in the DOM for now.
            /*
            const transitionDuration = 300; // Match CSS transition duration
            setTimeout(() => {
                // Check if still hidden before removing (might have been re-opened)
                if (!this.isOpen && this.overlay && this.overlay.parentNode && !this.overlay.classList.contains('active')) {
                   // Only remove if truly hidden and not re-opened during timeout
                   // document.body.removeChild(this.overlay);
                   // this.isInitialized = false; // Reset if removing from DOM
                }
            }, transitionDuration);
            */

            this.isOpen = false;
            console.info("Settings dialog hidden.");
            // Optionally return focus to the element that opened the dialog
            // (Requires storing the trigger element)
        } else {
            // console.debug("Settings dialog already hidden.");
        }
    }

    /** Toggles the visibility of the settings dialog. */
    toggleDialog() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Export a single instance (Singleton pattern)
export default new SettingsManager();