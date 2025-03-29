import { settingsTemplate } from './settings-template.js';

class SettingsManager {
    constructor() {
        this.dialog = null;
        this.overlay = null;
        this.isOpen = false;
        this.elements = {};
    }

    initialize() {
        // Create the dialog element if it doesn't exist
        if (!this.dialog) {
            // Create the overlay element
            this.overlay = document.createElement('div');
            this.overlay.className = 'settings-overlay';
            this.overlay.addEventListener('click', () => this.hide());

            // Create the dialog element
            this.dialog = document.createElement('div');
            this.dialog.className = 'settings-dialog';
            this.dialog.innerHTML = settingsTemplate;

            // Add close button event listener
            const closeBtn = this.dialog.querySelector('.settings-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Add the dialog to the overlay
            this.overlay.appendChild(this.dialog);

            // Cache all the elements (from original code)
            this.cacheElements();
            this.bindEvents();

        }
    }

    cacheElements() {
        this.elements = {
            // Tabs
            tabs: this.dialog.querySelectorAll('.settings-tab'),
            tabContents: this.dialog.querySelectorAll('.tab-content'),

            // API tab
            apiKeyInput: this.dialog.querySelector('#apiKey'),
            deepgramApiKeyInput: this.dialog.querySelector('#deepgramApiKey'),

            // UI tab
            themeToggle: this.dialog.querySelector('#themeToggle'),
            textSizeInput: this.dialog.querySelector('#textSize'),
            textSizeValue: this.dialog.querySelector('#textSizeValue'),
            timestampToggle: this.dialog.querySelector('#timestampToggle'),

            // Other UI elements
            dialog: this.dialog,
            overlay: this.overlay,
            voiceSelect: this.dialog.querySelector('#voice'),
            sampleRateInput: this.dialog.querySelector('#sampleRate'),
            sampleRateValue: this.dialog.querySelector('#sampleRateValue'),
            systemInstructionsInput: this.dialog.querySelector('#systemInstructions'),
            fpsInput: this.dialog.querySelector('#fps'),
            fpsValue: this.dialog.querySelector('#fpsValue'),
            resizeWidthInput: this.dialog.querySelector('#resizeWidth'),
            resizeWidthValue: this.dialog.querySelector('#resizeWidthValue'),
            qualityInput: this.dialog.querySelector('#quality'),
            qualityValue: this.dialog.querySelector('#qualityValue'),
            temperatureInput: this.dialog.querySelector('#temperature'),
            temperatureValue: this.dialog.querySelector('#temperatureValue'),
            topPInput: this.dialog.querySelector('#topP'),
            topPValue: this.dialog.querySelector('#topPValue'),
            topKInput: this.dialog.querySelector('#topK'),
            topKValue: this.dialog.querySelector('#topKValue'),
            harassmentInput: this.dialog.querySelector('#harassmentThreshold'),
            harassmentValue: this.dialog.querySelector('#harassmentValue'),
            dangerousInput: this.dialog.querySelector('#dangerousContentThreshold'),
            dangerousValue: this.dialog.querySelector('#dangerousValue'),
            sexualInput: this.dialog.querySelector('#sexuallyExplicitThreshold'),
            sexualValue: this.dialog.querySelector('#sexualValue'),
            civicInput: this.dialog.querySelector('#civicIntegrityThreshold'),
            civicValue: this.dialog.querySelector('#civicValue'),
            saveBtn: this.dialog.querySelector('#settingsSaveBtn')
        };
    }

    bindEvents() {
        // Save settings (from original code)
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.hide();
                const event = new CustomEvent('settingsUpdated');
                document.dispatchEvent(event);
            });
        }
        // Tab switching (from original code)
        if (this.elements.tabs) {
            this.elements.tabs.forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
        }

        // Add input listeners for real-time value updates (from original code)
        const inputElements = [
            'sampleRateInput', 'temperatureInput', 'topPInput', 'topKInput',
            'fpsInput', 'resizeWidthInput', 'qualityInput', 'harassmentInput',
            'dangerousInput', 'sexualInput', 'civicInput', 'textSizeInput'
        ];

        inputElements.forEach(elementName => {
            if (this.elements[elementName]) {
                this.elements[elementName].addEventListener('input', () => this.updateDisplayValues());
            }
        });
    }

    switchTab(tabId) {
        // Hide all tab contents (from original code)
        this.elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Show the selected tab content (from original code)
        const selectedContent = this.dialog.querySelector(`#${tabId}-tab`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }

        // Update tab state (from original code)
        this.elements.tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            }
        });
    }

    loadSettings() { //from original code
        // Load values from localStorage
        if (this.elements.apiKeyInput) this.elements.apiKeyInput.value = localStorage.getItem('apiKey') || '';
        if (this.elements.deepgramApiKeyInput) this.elements.deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';
        if (this.elements.themeToggle) this.elements.themeToggle.checked = localStorage.getItem('darkMode') === 'true';
        if (this.elements.textSizeInput) this.elements.textSizeInput.value = localStorage.getItem('textSize') || '16';
        if (this.elements.timestampToggle) this.elements.timestampToggle.checked = localStorage.getItem('showTimestamps') === 'true';
        if (this.elements.voiceSelect) this.elements.voiceSelect.value = localStorage.getItem('voiceName') || 'Aoede';
        if (this.elements.sampleRateInput) this.elements.sampleRateInput.value = localStorage.getItem('sampleRate') || '27000';
        if (this.elements.systemInstructionsInput) this.elements.systemInstructionsInput.value = localStorage.getItem('systemInstructions') || 'You are a helpful assistant';
        if (this.elements.temperatureInput) this.elements.temperatureInput.value = localStorage.getItem('temperature') || '1.8';
        if (this.elements.topPInput) this.elements.topPInput.value = localStorage.getItem('top_p') || '0.95';
        if (this.elements.topKInput) this.elements.topKInput.value = localStorage.getItem('top_k') || '65';

        // Initialize screen & camera settings
        if (this.elements.fpsInput) this.elements.fpsInput.value = localStorage.getItem('fps') || '1';
        if (this.elements.resizeWidthInput) this.elements.resizeWidthInput.value = localStorage.getItem('resizeWidth') || '640';
        if (this.elements.qualityInput) this.elements.qualityInput.value = localStorage.getItem('quality') || '0.3';

        // Initialize safety settings
        if (this.elements.harassmentInput) this.elements.harassmentInput.value = localStorage.getItem('harassmentThreshold') || '3';
        if (this.elements.dangerousInput) this.elements.dangerousInput.value = localStorage.getItem('dangerousContentThreshold') || '3';
        if (this.elements.sexualInput) this.elements.sexualInput.value = localStorage.getItem('sexuallyExplicitThreshold') || '3';
        if (this.elements.civicInput) this.elements.civicInput.value = localStorage.getItem('civicIntegrityThreshold') || '3';

        this.updateDisplayValues();
    }

    saveSettings() { //from original code
        if (this.elements.apiKeyInput) localStorage.setItem('apiKey', this.elements.apiKeyInput.value);
        if (this.elements.deepgramApiKeyInput) localStorage.setItem('deepgramApiKey', this.elements.deepgramApiKeyInput.value);
        if (this.elements.themeToggle) localStorage.setItem('darkMode', this.elements.themeToggle.checked);
        if (this.elements.textSizeInput) localStorage.setItem('textSize', this.elements.textSizeInput.value);
        if (this.elements.timestampToggle) localStorage.setItem('showTimestamps', this.elements.timestampToggle.checked);
        if (this.elements.voiceSelect) localStorage.setItem('voiceName', this.elements.voiceSelect.value);
        if (this.elements.sampleRateInput) localStorage.setItem('sampleRate', this.elements.sampleRateInput.value);
        if (this.elements.systemInstructionsInput) localStorage.setItem('systemInstructions', this.elements.systemInstructionsInput.value);
        if (this.elements.temperatureInput) localStorage.setItem('temperature', this.elements.temperatureInput.value);
        if (this.elements.topPInput) localStorage.setItem('top_p', this.elements.topPInput.value);
        if (this.elements.topKInput) localStorage.setItem('top_k', this.elements.topKInput.value);

        // Save screen & camera settings
        if (this.elements.fpsInput) localStorage.setItem('fps', this.elements.fpsInput.value);
        if (this.elements.resizeWidthInput) localStorage.setItem('resizeWidth', this.elements.resizeWidthInput.value);
        if (this.elements.qualityInput) localStorage.setItem('quality', this.elements.qualityInput.value);

        // Save safety settings
        if (this.elements.harassmentInput) localStorage.setItem('harassmentThreshold', this.elements.harassmentInput.value);
        if (this.elements.dangerousInput) localStorage.setItem('dangerousContentThreshold', this.elements.dangerousInput.value);
        if (this.elements.sexualInput) localStorage.setItem('sexuallyExplicitThreshold', this.elements.sexualInput.value);
        if (this.elements.civicInput) localStorage.setItem('civicIntegrityThreshold', this.elements.civicInput.value);
    }

    updateDisplayValues() { //from original code
        if (this.elements.textSizeValue) this.elements.textSizeValue.textContent = this.elements.textSizeInput.value + 'px';
        if (this.elements.sampleRateValue) this.elements.sampleRateValue.textContent = this.elements.sampleRateInput.value + ' Hz';
        if (this.elements.temperatureValue) this.elements.temperatureValue.textContent = this.elements.temperatureInput.value;
        if (this.elements.topPValue) this.elements.topPValue.textContent = this.elements.topPInput.value;
        if (this.elements.topKValue) this.elements.topKValue.textContent = this.elements.topKInput.value;
        if (this.elements.fpsValue) this.elements.fpsValue.textContent = this.elements.fpsInput.value + ' FPS';
        if (this.elements.resizeWidthValue) this.elements.resizeWidthValue.textContent = this.elements.resizeWidthInput.value + 'px';
        if (this.elements.qualityValue) this.elements.qualityValue.textContent = this.elements.qualityInput.value;
        if (this.elements.harassmentValue) this.elements.harassmentValue.textContent = this.getThresholdLabel(this.elements.harassmentInput.value);
        if (this.elements.dangerousValue) this.elements.dangerousValue.textContent = this.getThresholdLabel(this.elements.dangerousInput.value);
        if (this.elements.sexualValue) this.elements.sexualValue.textContent = this.getThresholdLabel(this.elements.sexualInput.value);
        if (this.elements.civicValue) this.elements.civicValue.textContent = this.getThresholdLabel(this.elements.civicInput.value);
    }

    getThresholdLabel(value) { //from original code
        const labels = {
            '0': 'None',
            '1': 'Low',
            '2': 'Medium',
            '3': 'High'
        };
        return labels[value] || value;
    }

    show() {
        this.initialize();
        if (!this.isOpen && this.overlay) {
            document.body.appendChild(this.overlay);
            this.isOpen = true;
            this.loadSettings();
        }
    }

    hide() {
        if (this.isOpen && this.overlay) {
            document.body.removeChild(this.overlay);
            this.isOpen = false;
        }
    }

    toggleDialog() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Export a single instance
export default new SettingsManager();