/**
 * Manages the settings dialog UI, including creating the dialog,
 * handling tab switching, loading/saving settings from localStorage,
 * and interacting with various settings controls.
 */
import { settingsTemplate } from './settings-template.js'; // HTML template for the dialog

class SettingsManager {
    constructor() {
        this.dialog = null;
        this.overlay = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.elements = {};

        console.info("SettingsManager instance created.");
    }

    /**
     * Creates and initializes the settings dialog DOM structure if it hasn't been already.
     */
    initialize() {
        if (this.isInitialized) return;
        console.info("Initializing SettingsManager DOM...");

        try {
            // Create Overlay
            this.overlay = document.createElement('div');
            this.overlay.id = 'settingsOverlay'; // Match ID in index.html
            this.overlay.className = 'settings-overlay';
            this.overlay.setAttribute('aria-hidden', 'true');
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) this.hide();
            });

            // Create Dialog
            this.dialog = document.createElement('div');
            this.dialog.id = 'settingsDialog'; // Match ID in index.html
            this.dialog.className = 'settings-dialog';
            this.dialog.setAttribute('role', 'dialog');
            this.dialog.setAttribute('aria-modal', 'true');
            this.dialog.setAttribute('aria-labelledby', 'settings-dialog-title');

            // Populate dialog content
            this.dialog.innerHTML = settingsTemplate;

            // Add title for accessibility
            const titleElement = document.createElement('h2');
            titleElement.id = 'settings-dialog-title';
            titleElement.textContent = 'Application Settings';
            titleElement.style.position = 'absolute';
            titleElement.style.left = '-9999px';
            this.dialog.insertBefore(titleElement, this.dialog.firstChild);

            // Prevent clicks inside dialog from closing it
            this.dialog.addEventListener('click', (event) => event.stopPropagation());

            // Assemble and Append
            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);

            // Cache Elements and Bind Events
            this._cacheElements();
            this._bindEvents();

            this.isInitialized = true;
            console.info("SettingsManager DOM initialized successfully.");

        } catch (error) {
            console.error("Failed to initialize SettingsManager DOM:", error);
            if (this.overlay && this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }
            this.dialog = null;
            this.overlay = null;
            this.isInitialized = false;
        }
    }

    /** Caches references to important DOM elements within the dialog. */
    _cacheElements() {
        if (!this.dialog) return;

        const query = (selector) => this.dialog.querySelector(selector);
        const queryAll = (selector) => this.dialog.querySelectorAll(selector);

        this.elements = {
            dialog: this.dialog,
            overlay: this.overlay,
            tabs: queryAll('.settings-tab'),
            tabContents: queryAll('.settings-tab-content'), // Updated class name
            apiKeyInput: query('#apiKey'),
            deepgramApiKeyInput: query('#deepgramApiKey'),
            themeToggle: query('#themeToggle'),
            textSizeInput: query('#textSize'),
            textSizeValue: query('#textSizeValue'),
            timestampToggle: query('#timestampToggle'),
            speakToggle: query('#speakToggle'),
            systemInstructionsInput: query('#systemInstructions'),
            fpsInput: query('#fps'),
            fpsValue: query('#fpsValue'),
            resizeWidthInput: query('#resizeWidth'),
            resizeWidthValue: query('#resizeWidthValue'),
            qualityInput: query('#quality'),
            qualityValue: query('#qualityValue'),
            voiceSelect: query('#voice'),
            sampleRateInput: query('#sampleRate'),
            sampleRateValue: query('#sampleRateValue'),
            temperatureInput: query('#temperature'),
            temperatureValue: query('#temperatureValue'),
            topPInput: query('#topP'),
            topPValue: query('#topPValue'),
            topKInput: query('#topK'),
            topKValue: query('#topKValue'),
            harassmentInput: query('#harassmentThreshold'),
            harassmentValue: query('#harassmentValue'),
            hateSpeechInput: query('#hateSpeechThreshold'),
            hateSpeechValue: query('#hateSpeechValue'),
            dangerousInput: query('#dangerousContentThreshold'),
            dangerousValue: query('#dangerousValue'),
            sexualInput: query('#sexuallyExplicitThreshold'),
            sexualValue: query('#sexualValue'),
            civicInput: query('#civicIntegrityThreshold'),
            civicValue: query('#civicValue'),
            saveBtn: query('#settingsSaveBtn'),
            closeBtn: query('.settings-close-btn')
        };
    }

    /** Binds event listeners to the cached elements within the dialog. */
    _bindEvents() {
        // Close Button
        this.elements.closeBtn?.addEventListener('click', () => this.hide());

        // Save Button
        this.elements.saveBtn?.addEventListener('click', () => {
            this._saveSettings();
            this.hide();
            const event = new CustomEvent('settingsUpdated');
            document.dispatchEvent(event);
            console.info("Settings saved and 'settingsUpdated' event dispatched.");
        });

        // Tab Switching
        this.elements.tabs?.forEach(tab => {
            const tabId = tab.dataset.tab;
            if (tabId) {
                tab.addEventListener('click', () => this._switchTab(tabId));
            }
        });

        // Real-time Value Updates for Sliders/Inputs
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
            textSizeInput: 'textSizeValue'
        };

        Object.entries(valueUpdateMappings).forEach(([inputId, valueId]) => {
            const inputElement = this.elements[inputId];
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    this._updateDisplayValues();
                    if (inputId === 'textSizeInput') this._applyTextSize();
                });
            }
        });

        // Theme toggle - Apply immediately
        this.elements.themeToggle?.addEventListener('change', (event) => {
            const isDarkMode = event.target.checked;
            document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
            // Save immediately or wait for main save? Currently waits.
        });

        // Speak toggle - Update global state immediately
        this.elements.speakToggle?.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            window.speechEnabled = isEnabled;
            if (window.chatManager?.updateSpeechStatus) {
                window.chatManager.updateSpeechStatus(isEnabled);
            }
            // Save immediately or wait for main save? Currently waits.
        });
    }

    /** Switches the visible tab content. */
    _switchTab(tabId) {
        if (!this.elements.tabs || !this.elements.tabContents) return;

        this.elements.tabContents.forEach(content => content.classList.remove('active'));
        this.elements.tabs.forEach(tab => tab.classList.remove('active'));

        const selectedContent = this.dialog.querySelector(`#${tabId}-tab`);
        if (selectedContent) selectedContent.classList.add('active');

        const selectedTab = this.dialog.querySelector(`.settings-tab[data-tab="${tabId}"]`);
        if (selectedTab) selectedTab.classList.add('active');
    }

    /** Loads settings from localStorage and populates the dialog fields. */
    _loadSettings() {
        console.info("Loading settings from localStorage...");
        const load = (key, defaultValue = '') => localStorage.getItem(key) || defaultValue;
        const loadBool = (key, defaultValue = false) => load(key, defaultValue.toString()) === 'true';

        try {
            // API
            if (this.elements.apiKeyInput) this.elements.apiKeyInput.value = load('apiKey');
            if (this.elements.deepgramApiKeyInput) this.elements.deepgramApiKeyInput.value = load('deepgramApiKey');

            // UI
            const isDarkMode = loadBool('darkMode', true); // Default to dark mode
            if (this.elements.themeToggle) this.elements.themeToggle.checked = isDarkMode;
            document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light'); // Apply theme on load
            if (this.elements.textSizeInput) this.elements.textSizeInput.value = load('textSize', '16');
            if (this.elements.timestampToggle) this.elements.timestampToggle.checked = loadBool('showTimestamps');
            const speakEnabled = loadBool('speakEnabled');
            if (this.elements.speakToggle) this.elements.speakToggle.checked = speakEnabled;
            window.speechEnabled = speakEnabled; // Update global flag

            // System
            if (this.elements.systemInstructionsInput) this.elements.systemInstructionsInput.value = load('systemInstructions', 'You are a helpful assistant.');

            // Media
            if (this.elements.fpsInput) this.elements.fpsInput.value = load('fps', '5');
            if (this.elements.resizeWidthInput) this.elements.resizeWidthInput.value = load('resizeWidth', '640');
            if (this.elements.qualityInput) this.elements.qualityInput.value = load('quality', '0.4');
            if (this.elements.voiceSelect) this.elements.voiceSelect.value = load('voiceName', 'Aoede');
            if (this.elements.sampleRateInput) this.elements.sampleRateInput.value = load('sampleRate', '24000');

            // Advanced
            if (this.elements.temperatureInput) this.elements.temperatureInput.value = load('temperature', '1.0');
            if (this.elements.topPInput) this.elements.topPInput.value = load('top_p', '0.95');
            if (this.elements.topKInput) this.elements.topKInput.value = load('top_k', '40');

            // Safety
            if (this.elements.harassmentInput) this.elements.harassmentInput.value = load('harassmentThreshold', '3');
            if (this.elements.hateSpeechInput) this.elements.hateSpeechInput.value = load('hateSpeechThreshold', '3');
            if (this.elements.dangerousInput) this.elements.dangerousInput.value = load('dangerousContentThreshold', '3');
            if (this.elements.sexualInput) this.elements.sexualInput.value = load('sexuallyExplicitThreshold', '3');
            if (this.elements.civicInput) this.elements.civicInput.value = load('civicIntegrityThreshold', '3');

            this._updateDisplayValues();
            this._applyTextSize();

            console.info("Settings loaded successfully.");
        } catch (error) {
            console.error("Error occurred during settings load:", error);
        }
    }

    /** Applies the current text size setting to the document root. */
    _applyTextSize() {
        if (this.elements.textSizeInput) {
            const size = this.elements.textSizeInput.value || '16';
            document.documentElement.style.setProperty('--text-size', `${size}px`);
        }
    }

    /** Saves the current values from the dialog fields to localStorage. */
    _saveSettings() {
        console.info("Saving settings to localStorage...");
        const save = (key, value) => localStorage.setItem(key, value);
        const saveBool = (key, checked) => save(key, checked ? 'true' : 'false');

        try {
            // API
            if (this.elements.apiKeyInput) save('apiKey', this.elements.apiKeyInput.value);
            if (this.elements.deepgramApiKeyInput) save('deepgramApiKey', this.elements.deepgramApiKeyInput.value);

            // UI
            if (this.elements.themeToggle) saveBool('darkMode', this.elements.themeToggle.checked);
            if (this.elements.textSizeInput) save('textSize', this.elements.textSizeInput.value);
            if (this.elements.timestampToggle) saveBool('showTimestamps', this.elements.timestampToggle.checked);
            if (this.elements.speakToggle) saveBool('speakEnabled', this.elements.speakToggle.checked);

            // System
            if (this.elements.systemInstructionsInput) save('systemInstructions', this.elements.systemInstructionsInput.value);

            // Media
            if (this.elements.fpsInput) save('fps', this.elements.fpsInput.value);
            if (this.elements.resizeWidthInput) save('resizeWidth', this.elements.resizeWidthInput.value);
            if (this.elements.qualityInput) save('quality', this.elements.qualityInput.value);
            if (this.elements.voiceSelect) save('voiceName', this.elements.voiceSelect.value);
            if (this.elements.sampleRateInput) save('sampleRate', this.elements.sampleRateInput.value);

            // Advanced
            if (this.elements.temperatureInput) save('temperature', this.elements.temperatureInput.value);
            if (this.elements.topPInput) save('top_p', this.elements.topPInput.value);
            if (this.elements.topKInput) save('top_k', this.elements.topKInput.value);

            // Safety
            if (this.elements.harassmentInput) save('harassmentThreshold', this.elements.harassmentInput.value);
            if (this.elements.hateSpeechInput) save('hateSpeechThreshold', this.elements.hateSpeechInput.value);
            if (this.elements.dangerousInput) save('dangerousContentThreshold', this.elements.dangerousInput.value);
            if (this.elements.sexualInput) save('sexuallyExplicitThreshold', this.elements.sexualInput.value);
            if (this.elements.civicInput) save('civicIntegrityThreshold', this.elements.civicInput.value);

            console.info("Settings saved successfully.");
        } catch (error) {
            console.error("Error occurred during settings save:", error);
        }
    }

    /** Updates the text content of display elements based on current input values. */
    _updateDisplayValues() {
        const updateText = (element, text) => { if (element) element.textContent = text; };

        // UI
        if (this.elements.textSizeInput) updateText(this.elements.textSizeValue, `${this.elements.textSizeInput.value}px`);

        // Media
        if (this.elements.sampleRateInput) updateText(this.elements.sampleRateValue, `${this.elements.sampleRateInput.value} Hz`);
        if (this.elements.fpsInput) updateText(this.elements.fpsValue, `${this.elements.fpsInput.value} FPS`);
        if (this.elements.resizeWidthInput) updateText(this.elements.resizeWidthValue, `${this.elements.resizeWidthInput.value}px`);
        if (this.elements.qualityInput) updateText(this.elements.qualityValue, this.elements.qualityInput.value);

        // Advanced
        if (this.elements.temperatureInput) updateText(this.elements.temperatureValue, this.elements.temperatureInput.value);
        if (this.elements.topPInput) updateText(this.elements.topPValue, this.elements.topPInput.value);
        if (this.elements.topKInput) updateText(this.elements.topKValue, this.elements.topKInput.value);

        // Safety
        const getLabel = (value) => this._getThresholdLabel(value);
        if (this.elements.harassmentInput) updateText(this.elements.harassmentValue, getLabel(this.elements.harassmentInput.value));
        if (this.elements.hateSpeechInput) updateText(this.elements.hateSpeechValue, getLabel(this.elements.hateSpeechInput.value));
        if (this.elements.dangerousInput) updateText(this.elements.dangerousValue, getLabel(this.elements.dangerousInput.value));
        if (this.elements.sexualInput) updateText(this.elements.sexualValue, getLabel(this.elements.sexualInput.value));
        if (this.elements.civicInput) updateText(this.elements.civicValue, getLabel(this.elements.civicInput.value));
    }

    /** Converts a numeric safety threshold value to a label. */
    _getThresholdLabel(value) {
        const labels = { '0': 'Block None', '1': 'Block High Only', '2': 'Block Medium+', '3': 'Block Low+' };
        return labels[value] || 'Unknown';
    }

    /** Shows the settings dialog. */
    show() {
        this.initialize(); // Ensure initialized
        if (!this.isInitialized || !this.overlay || !this.dialog) return;

        if (!this.isOpen) {
            this._loadSettings();
            this.overlay.classList.add('active');
            this.overlay.setAttribute('aria-hidden', 'false');
            this.isOpen = true;
            console.info("Settings dialog shown.");
            this.elements.tabs?.[0]?.focus();
        }
    }

    /** Hides the settings dialog. */
    hide() {
        if (!this.isInitialized || !this.overlay || !this.dialog) return;

        if (this.isOpen) {
            this.overlay.classList.remove('active');
            this.overlay.setAttribute('aria-hidden', 'true');
            this.isOpen = false;
            console.info("Settings dialog hidden.");
        }
    }

    /** Toggles the visibility of the settings dialog. */
    toggleDialog() {
        if (this.isOpen) this.hide();
        else this.show();
    }
}

// Export a single instance
export default new SettingsManager();
