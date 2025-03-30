/**
 * Main application script
 * Handles initialization and core functionality
 */
import { ImageGenUI } from './imggen/imggen-ui.js';
import { ImageGenEvents } from './imggen/imggen-events.js';
import { ImageGenerator } from './imggen/imggen.js'; // Corrected import name
import MediaManager from './dom/media-manager.js';
import StatusManager from './dom/status-manager.js';
import SettingsManager from './settings/settings-manager.js';
// Assuming Agent might be needed later, import it
// import { GeminiAgent } from './main/agent.js'; 

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready. Initializing components...");

    // Initialize managers first as other components might depend on them
    window.mediaManager = MediaManager; // Assuming MediaManager is self-initializing or has static methods initially
    const imgGenUI = new ImageGenUI();
    const imgGen = new ImageGenerator(); // Use correct class name
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
        // TODO: Implement connect/disconnect logic using Agent
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
            // TODO: Update agent model configuration
        });
    }

    // Initialize with default tab
    setupTabSwitching();
    // Trigger initial switch to ensure correct state
    const initialTab = document.querySelector('input[name="tab-select"]:checked')?.value || 'live';
    switchTab(initialTab); 
});

/**
 * Sets up tab switching functionality
 */
function setupTabSwitching() {
    const liveContent = document.getElementById('liveContent');
    const imgGenContent = document.getElementById('imgGenContent');
    const modelSelector = document.querySelector('.model-selector-container');
    const imgGenModelDisplay = document.getElementById('imgGenModelDisplay');
    const liveControlBar = document.getElementById('liveControlBar');
    const imgGenControlBar = document.getElementById('imgGenControlBar');

    // Tab radio buttons
    const liveTab = document.getElementById('liveTab');
    const imgGenTab = document.getElementById('imgGenTab');

    window.switchTab = function(tab) { // Make switchTab globally accessible if needed
        if (tab === 'live') {
            liveContent?.classList.add('active');
            imgGenContent?.classList.remove('active');
            modelSelector?.classList.remove('hidden');
            imgGenModelDisplay?.classList.remove('active');
            liveControlBar?.classList.add('active');
            imgGenControlBar?.classList.remove('active');
            
            // Hide any open IMG GEN popups
            window.imgGenEvents?.hideAllPopups(); // Use the instance method
        } else {
            liveContent?.classList.remove('active');
            imgGenContent?.classList.add('active');
            modelSelector?.classList.add('hidden');
            imgGenModelDisplay?.classList.add('active');
            liveControlBar?.classList.remove('active');
            imgGenControlBar?.classList.add('active');
        }
    }

    // Tab change handlers
    liveTab?.addEventListener('change', () => switchTab('live'));
    imgGenTab?.addEventListener('change', () => switchTab('imggen'));
}
