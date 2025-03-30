/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGen } from './imggen/imggen.js';
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.mediaManager = MediaManager;
    window.statusManager = StatusManager;
    window.settingsManager = SettingsManager;

    // Initialize IMG GEN components
    const imgGenUI = new ImageGenUI();
    const imgGen = new ImageGen();
    const imgGenEvents = new ImageGenEvents(imgGen);

    // Store references
    window.imgGen = imgGen;
    window.imgGenUI = imgGenUI;
    window.imgGenEvents = imgGenEvents;

    // Settings button handler
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        window.settingsManager.show();
    });

    // Power button handler
    document.getElementById('powerBtn')?.addEventListener('click', () => {
        console.log('Power button clicked');
    });

    // Model selector handler
    const modelSelector = document.getElementById('modelSelector');
    if (modelSelector) {
        // Populate model options
        const models = [
            'gemini-pro',
            'gemini-pro-vision',
            'gemini-ultra',
            'gemini-ultra-vision'
        ];
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelector.appendChild(option);
        });

        modelSelector.addEventListener('change', (e) => {
            console.log('Selected model:', e.target.value);
        });
    }

    // Initialize with default tab
    setupTabSwitching();
    document.getElementById('liveTab')?.click();
});

/**
 * Sets up tab switching functionality
 */
function setupTabSwitching() {
    const liveContent = document.getElementById('liveContent');
    const imgGenContent = document.getElementById('imgGenContent');
    const modelSelector = document.querySelector('.model-selector-container');
    const imgGenModelDisplay = document.getElementById('imgGenModelDisplay');

    // Tab radio buttons
    const liveTab = document.getElementById('liveTab');
    const imgGenTab = document.getElementById('imgGenTab');

    function switchTab(tab) {
        if (tab === 'live') {
            liveContent?.classList.add('active');
            imgGenContent?.classList.remove('active');
            modelSelector?.classList.remove('hidden');
            imgGenModelDisplay?.classList.remove('active');
            
            // Hide IMG GEN control bar
            document.getElementById('imgGenControlBar')?.classList.remove('active');
            
            // Show LIVE control bar
            document.getElementById('liveControlBar')?.classList.add('active');
            
            // Hide any open IMG GEN popups
            document.querySelectorAll('.popup-overlay').forEach(popup => {
                popup.classList.remove('active');
            });
        } else {
            liveContent?.classList.remove('active');
            imgGenContent?.classList.add('active');
            modelSelector?.classList.add('hidden');
            imgGenModelDisplay?.classList.add('active');
            
            // Show IMG GEN control bar
            document.getElementById('imgGenControlBar')?.classList.add('active');
            
            // Hide LIVE control bar
            document.getElementById('liveControlBar')?.classList.remove('active');
        }
    }

    // Tab change handlers
    liveTab?.addEventListener('change', () => switchTab('live'));
    imgGenTab?.addEventListener('change', () => switchTab('imggen'));
}
