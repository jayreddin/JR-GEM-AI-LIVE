/**
 * Centralized object mapping commonly used DOM element IDs to variables.
 * Note: This seems outdated as some IDs (disconnectBtn, connectBtn) are not
 * in the current index.html, and other modules often query elements directly.
 * Consider removing this file if it's not actively used and kept up-to-date.
 */

// DOM elements object
const elements = {
    // Button elements
    disconnectBtn: document.getElementById('disconnectBtn'), // ID not in current index.html
    connectBtn: document.getElementById('connectBtn'), // ID not in current index.html
    powerBtn: document.getElementById('powerBtn'), // Use this instead of connect/disconnect
    micBtn: document.getElementById('micBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    screenBtn: document.getElementById('screenBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    newChatBtn: document.getElementById('newChatBtn'), // Added based on index.html

    // Preview elements
    cameraPreview: document.getElementById('cameraPreview'),
    screenPreview: document.getElementById('screenPreview'),

    // Text input elements
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),

    // Visualizer canvas
    visualizerCanvas: document.getElementById('visualizer'),

    // Chat history container
    chatHistory: document.getElementById('chatHistory') // Added based on index.html
};

// Log missing elements (optional debug step)
// for (const key in elements) {
//     if (elements[key] === null) {
//         console.warn(`elements.js: Element with ID "<span class="math-inline">\{key\}" corresponding to ID "</span>{elements[key]?.id || 'unknown'}" not found in DOM.`);
//     }
// }


export default elements;