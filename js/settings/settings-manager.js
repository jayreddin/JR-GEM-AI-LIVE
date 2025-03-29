
import { settingsTemplate } from './settings-template.js';

export class SettingsManager {
    constructor() {
        this.dialog = null;
        this.overlay = null;
        this.elements = {};
        this.createSettingsDialog();
        this.bindEvents();
    }

    createSettingsDialog() {
        // Create dialog and overlay
        this.dialog = document.createElement('div');
        this.dialog.className = 'settings-dialog';
        this.dialog.innerHTML = settingsTemplate;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay';
        
        document.body.appendChild(this.dialog);
        document.body.appendChild(this.overlay);
        
        // Cache all the elements
        this.cacheElements();
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
            
            // System tab
            systemInstructionsInput: this.dialog.querySelector('#systemInstructions'),
            
            // Media tab
            voiceSelect: this.dialog.querySelector('#voice'),
            sampleRateInput: this.dialog.querySelector('#sampleRate'),
            sampleRateValue: this.dialog.querySelector('#sampleRateValue'),
            fpsInput: this.dialog.querySelector('#fps'),
            fpsValue: this.dialog.querySelector('#fpsValue'),
            resizeWidthInput: this.dialog.querySelector('#resizeWidth'),
            resizeWidthValue: this.dialog.querySelector('#resizeWidthValue'),
            qualityInput: this.dialog.querySelector('#quality'),
            qualityValue: this.dialog.querySelector('#qualityValue'),
            
            // Advanced tab
            temperatureInput: this.dialog.querySelector('#temperature'),
            temperatureValue: this.dialog.querySelector('#temperatureValue'),
            topPInput: this.dialog.querySelector('#topP'),
            topPValue: this.dialog.querySelector('#topPValue'),
            topKInput: this.dialog.querySelector('#topK'),
            topKValue: this.dialog.querySelector('#topKValue'),
            
            // Safety tab
            harassmentInput: this.dialog.querySelector('#harassmentThreshold'),
            harassmentValue: this.dialog.querySelector('#harassmentValue'),
            dangerousInput: this.dialog.querySelector('#dangerousContentThreshold'),
            dangerousValue: this.dialog.querySelector('#dangerousValue'),
            sexualInput: this.dialog.querySelector('#sexuallyExplicitThreshold'),
            sexualValue: this.dialog.querySelector('#sexualValue'),
            civicInput: this.dialog.querySelector('#civicIntegrityThreshold'),
            civicValue: this.dialog.querySelector('#civicValue'),
            
            // Save button
            saveBtn: this.dialog.querySelector('#settingsSaveBtn')
        };
    }
    
    bindEvents() {
        // Tab switching
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and content
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                this.elements.tabContents.forEach(c => c.classList.remove('active'));
                
                // Activate the clicked tab and its content
                tab.classList.add('active');
                const tabName = tab.getAttribute('data-tab');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
        
        // Text size slider
        this.elements.textSizeInput.addEventListener('input', () => {
            const size = this.elements.textSizeInput.value;
            this.elements.textSizeValue.textContent = `${size}px`;
            document.documentElement.style.setProperty('--chat-font-size', `${size}px`);
        });
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('change', () => {
            if (this.elements.themeToggle.checked) {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        });
        
        // Add input listeners for all range inputs
        const inputElements = [
            'sampleRateInput', 'temperatureInput', 'topPInput', 'topKInput',
            'fpsInput', 'resizeWidthInput', 'qualityInput', 'harassmentInput',
            'dangerousInput', 'sexualInput', 'civicInput', 'textSizeInput'
        ];

        inputElements.forEach(elementName => {
            this.elements[elementName].addEventListener('input', () => this.updateDisplayValues());
        });
        
        // Save button
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveSettings();
            this.hideDialog();
        });
    }
    
    updateDisplayValues() {
        this.elements.sampleRateValue.textContent = this.elements.sampleRateInput.value + ' Hz';
        this.elements.temperatureValue.textContent = this.elements.temperatureInput.value;
        this.elements.topPValue.textContent = this.elements.topPInput.value;
        this.elements.topKValue.textContent = this.elements.topKInput.value;
        this.elements.fpsValue.textContent = this.elements.fpsInput.value + ' FPS';
        this.elements.resizeWidthValue.textContent = this.elements.resizeWidthInput.value + 'px';
        this.elements.qualityValue.textContent = this.elements.qualityInput.value;
        this.elements.harassmentValue.textContent = this.getThresholdLabel(this.elements.harassmentInput.value);
        this.elements.dangerousValue.textContent = this.getThresholdLabel(this.elements.dangerousInput.value);
        this.elements.sexualValue.textContent = this.getThresholdLabel(this.elements.sexualInput.value);
        this.elements.civicValue.textContent = this.getThresholdLabel(this.elements.civicInput.value);
        this.elements.textSizeValue.textContent = this.elements.textSizeInput.value + 'px';
    }

    getThresholdLabel(value) {
        const labels = {
            '0': 'None',
            '1': 'Low',
            '2': 'Medium',
            '3': 'High'
        };
        return labels[value] || value;
    }
    
    loadSettings() {
        // Load values from localStorage
        this.elements.apiKeyInput.value = localStorage.getItem('apiKey') || '';
        this.elements.deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';
        this.elements.voiceSelect.value = localStorage.getItem('voiceName') || 'Aoede';
        this.elements.sampleRateInput.value = localStorage.getItem('sampleRate') || '27000';
        this.elements.systemInstructionsInput.value = localStorage.getItem('systemInstructions') || 'You are a helpful assistant';
        this.elements.temperatureInput.value = localStorage.getItem('temperature') || '1.8';
        this.elements.topPInput.value = localStorage.getItem('top_p') || '0.95';
        this.elements.topKInput.value = localStorage.getItem('top_k') || '65';
        this.elements.fpsInput.value = localStorage.getItem('fps') || '1';
        this.elements.resizeWidthInput.value = localStorage.getItem('resizeWidth') || '640';
        this.elements.qualityInput.value = localStorage.getItem('quality') || '0.3';
        this.elements.harassmentInput.value = localStorage.getItem('harassmentThreshold') || '3';
        this.elements.dangerousInput.value = localStorage.getItem('dangerousThreshold') || '3';
        this.elements.sexualInput.value = localStorage.getItem('sexualThreshold') || '3';
        this.elements.civicInput.value = localStorage.getItem('civicThreshold') || '3';
        this.elements.textSizeInput.value = localStorage.getItem('textSize') || '16';
        this.elements.themeToggle.checked = localStorage.getItem('theme') === 'light';
        this.elements.timestampToggle.checked = localStorage.getItem('showTimestamps') !== 'false';
        
        // Update display values
        this.updateDisplayValues();
        
        // Apply theme if needed
        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Apply text size
        const textSize = localStorage.getItem('textSize') || '16';
        document.documentElement.style.setProperty('--chat-font-size', `${textSize}px`);
    }
    
    saveSettings() {
        // Save all settings to localStorage
        localStorage.setItem('apiKey', this.elements.apiKeyInput.value);
        localStorage.setItem('deepgramApiKey', this.elements.deepgramApiKeyInput.value);
        localStorage.setItem('voiceName', this.elements.voiceSelect.value);
        localStorage.setItem('sampleRate', this.elements.sampleRateInput.value);
        localStorage.setItem('systemInstructions', this.elements.systemInstructionsInput.value);
        localStorage.setItem('temperature', this.elements.temperatureInput.value);
        localStorage.setItem('top_p', this.elements.topPInput.value);
        localStorage.setItem('top_k', this.elements.topKInput.value);
        localStorage.setItem('fps', this.elements.fpsInput.value);
        localStorage.setItem('resizeWidth', this.elements.resizeWidthInput.value);
        localStorage.setItem('quality', this.elements.qualityInput.value);
        localStorage.setItem('harassmentThreshold', this.elements.harassmentInput.value);
        localStorage.setItem('dangerousThreshold', this.elements.dangerousInput.value);
        localStorage.setItem('sexualThreshold', this.elements.sexualInput.value);
        localStorage.setItem('civicThreshold', this.elements.civicInput.value);
        localStorage.setItem('textSize', this.elements.textSizeInput.value);
        localStorage.setItem('theme', this.elements.themeToggle.checked ? 'light' : 'dark');
        localStorage.setItem('showTimestamps', this.elements.timestampToggle.checked);
        
        // Dispatch a custom event for other parts of the app to react to settings changes
        const event = new CustomEvent('settingsUpdated');
        document.dispatchEvent(event);
    }
    
    showDialog() {
        this.dialog.classList.add('active');
        this.overlay.classList.add('active');
        this.loadSettings();
    }
    
    hideDialog() {
        this.dialog.classList.remove('active');
        this.overlay.classList.remove('active');
    }
    
    toggleDialog() {
        if (this.dialog.classList.contains('active')) {
            this.hideDialog();
        } else {
            this.showDialog();
        }
    }
}

import { settingsTemplate } from './settings-template.js';

class SettingsManager {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        // Create settings dialog and overlay
        this.dialog = document.createElement('div');
        this.dialog.className = 'settings-dialog';
        this.dialog.innerHTML = settingsTemplate;

        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay';

        // Add to document
        document.body.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // Cache DOM elements
        this.elements = {
            dialog: this.dialog,
            overlay: this.overlay,
            apiKeyInput: this.dialog.querySelector('#apiKey'),
            deepgramApiKeyInput: this.dialog.querySelector('#deepgramApiKey'),
            voiceSelect: this.dialog.querySelector('#voice'),
            sampleRateInput: this.dialog.querySelector('#sampleRate'),
            sampleRateValue: this.dialog.querySelector('#sampleRateValue'),
            systemInstructionsToggle: this.dialog.querySelector('#systemInstructionsToggle'),
            systemInstructionsContent: this.dialog.querySelector('#systemInstructions').parentElement,
            systemInstructionsInput: this.dialog.querySelector('#systemInstructions'),
            screenCameraToggle: this.dialog.querySelector('#screenCameraToggle'),
            screenCameraContent: this.dialog.querySelector('#screenCameraToggle + .collapsible-content'),
            fpsInput: this.dialog.querySelector('#fps'),
            fpsValue: this.dialog.querySelector('#fpsValue'),
            resizeWidthInput: this.dialog.querySelector('#resizeWidth'),
            resizeWidthValue: this.dialog.querySelector('#resizeWidthValue'),
            qualityInput: this.dialog.querySelector('#quality'),
            qualityValue: this.dialog.querySelector('#qualityValue'),
            advancedToggle: this.dialog.querySelector('#advancedToggle'),
            advancedContent: this.dialog.querySelector('#advancedToggle + .collapsible-content'),
            temperatureInput: this.dialog.querySelector('#temperature'),
            temperatureValue: this.dialog.querySelector('#temperatureValue'),
            topPInput: this.dialog.querySelector('#topP'),
            topPValue: this.dialog.querySelector('#topPValue'),
            topKInput: this.dialog.querySelector('#topK'),
            topKValue: this.dialog.querySelector('#topKValue'),
            safetyToggle: this.dialog.querySelector('#safetyToggle'),
            safetyContent: this.dialog.querySelector('#safetyToggle + .collapsible-content'),
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

    setupEventListeners() {
        // Close settings when clicking overlay
        this.overlay.addEventListener('click', () => this.hide());

        // Prevent dialog close when clicking inside dialog
        this.dialog.addEventListener('click', (e) => e.stopPropagation());

        // Save settings
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveSettings();
            this.hide();
            window.location.reload();
        });

        // Toggle collapsible sections
        this.elements.systemInstructionsToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.systemInstructionsToggle, this.elements.systemInstructionsContent);
        });

        this.elements.advancedToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.advancedToggle, this.elements.advancedContent);
        });

        this.elements.screenCameraToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.screenCameraToggle, this.elements.screenCameraContent);
        });

        this.elements.safetyToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.safetyToggle, this.elements.safetyContent);
        });

        // Add input listeners for real-time value updates
        const inputElements = [
            'sampleRateInput', 'temperatureInput', 'topPInput', 'topKInput',
            'fpsInput', 'resizeWidthInput', 'qualityInput', 'harassmentInput',
            'dangerousInput', 'sexualInput', 'civicInput'
        ];

        inputElements.forEach(elementName => {
            this.elements[elementName].addEventListener('input', () => this.updateDisplayValues());
        });
    }

    loadSettings() {
        // Load values from localStorage
        this.elements.apiKeyInput.value = localStorage.getItem('apiKey') || '';
        this.elements.deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';
        this.elements.voiceSelect.value = localStorage.getItem('voiceName') || 'Aoede';
        this.elements.sampleRateInput.value = localStorage.getItem('sampleRate') || '27000';
        this.elements.systemInstructionsInput.value = localStorage.getItem('systemInstructions') || 'You are a helpful assistant';
        this.elements.temperatureInput.value = localStorage.getItem('temperature') || '1.8';
        this.elements.topPInput.value = localStorage.getItem('top_p') || '0.95';
        this.elements.topKInput.value = localStorage.getItem('top_k') || '65';

        // Initialize screen & camera settings
        this.elements.fpsInput.value = localStorage.getItem('fps') || '1';
        this.elements.resizeWidthInput.value = localStorage.getItem('resizeWidth') || '640';
        this.elements.qualityInput.value = localStorage.getItem('quality') || '0.3';

        // Initialize safety settings
        this.elements.harassmentInput.value = localStorage.getItem('harassmentThreshold') || '3';
        this.elements.dangerousInput.value = localStorage.getItem('dangerousContentThreshold') || '3';
        this.elements.sexualInput.value = localStorage.getItem('sexuallyExplicitThreshold') || '3';
        this.elements.civicInput.value = localStorage.getItem('civicIntegrityThreshold') || '3';

        this.updateDisplayValues();
    }

    saveSettings() {
        localStorage.setItem('apiKey', this.elements.apiKeyInput.value);
        localStorage.setItem('deepgramApiKey', this.elements.deepgramApiKeyInput.value);
        localStorage.setItem('voiceName', this.elements.voiceSelect.value);
        localStorage.setItem('sampleRate', this.elements.sampleRateInput.value);
        localStorage.setItem('systemInstructions', this.elements.systemInstructionsInput.value);
        localStorage.setItem('temperature', this.elements.temperatureInput.value);
        localStorage.setItem('top_p', this.elements.topPInput.value);
        localStorage.setItem('top_k', this.elements.topKInput.value);
        
        // Save screen & camera settings
        localStorage.setItem('fps', this.elements.fpsInput.value);
        localStorage.setItem('resizeWidth', this.elements.resizeWidthInput.value);
        localStorage.setItem('quality', this.elements.qualityInput.value);

        // Save safety settings
        localStorage.setItem('harassmentThreshold', this.elements.harassmentInput.value);
        localStorage.setItem('dangerousContentThreshold', this.elements.dangerousInput.value);
        localStorage.setItem('sexuallyExplicitThreshold', this.elements.sexualInput.value);
        localStorage.setItem('civicIntegrityThreshold', this.elements.civicInput.value);
    }

    updateDisplayValues() {
        this.elements.sampleRateValue.textContent = this.elements.sampleRateInput.value + ' Hz';
        this.elements.temperatureValue.textContent = this.elements.temperatureInput.value;
        this.elements.topPValue.textContent = this.elements.topPInput.value;
        this.elements.topKValue.textContent = this.elements.topKInput.value;
        this.elements.fpsValue.textContent = this.elements.fpsInput.value + ' FPS';
        this.elements.resizeWidthValue.textContent = this.elements.resizeWidthInput.value + 'px';
        this.elements.qualityValue.textContent = this.elements.qualityInput.value;
        this.elements.harassmentValue.textContent = this.getThresholdLabel(this.elements.harassmentInput.value);
        this.elements.dangerousValue.textContent = this.getThresholdLabel(this.elements.dangerousInput.value);
        this.elements.sexualValue.textContent = this.getThresholdLabel(this.elements.sexualInput.value);
        this.elements.civicValue.textContent = this.getThresholdLabel(this.elements.civicInput.value);
    }

    getThresholdLabel(value) {
        const labels = {
            '0': 'None',
            '1': 'Low',
            '2': 'Medium',
            '3': 'High'
        };
        return labels[value] || value;
    }

    toggleCollapsible(toggle, content) {
        const isActive = content.classList.contains('active');
        content.classList.toggle('active');
        toggle.textContent = toggle.textContent.replace(isActive ? '▼' : '▲', isActive ? '▲' : '▼');
    }

    show() {
        this.dialog.classList.add('active');
        this.overlay.classList.add('active');
    }

    hide() {
        this.dialog.classList.remove('active');
        this.overlay.classList.remove('active');
    }
}

export default new SettingsManager(); 