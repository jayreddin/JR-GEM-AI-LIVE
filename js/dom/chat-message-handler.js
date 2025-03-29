/**
 * Helper functions for creating different types of chat message DOM elements.
 * Note: This seems redundant with methods now implemented in ChatManager.
 */

/**
 * Creates a DOM element for a message from the model.
 * @param {string} text - The message text.
 * @param {string} [modelName='Gemini 2.0 Flash'] - The name of the model.
 * @returns {HTMLDivElement} The created message element.
 */
export function createModelMessage(text, modelName = 'Gemini 2.0 Flash') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'model-message');

    // Add title with timestamp
    const titleElement = document.createElement('div');
    titleElement.classList.add('chat-title');
    // Use internal getTimestamp from this file (could be consolidated)
    titleElement.textContent = `${modelName} - ${getTimestamp()}`;
    messageElement.appendChild(titleElement);

    const textElement = document.createElement('div');
    textElement.classList.add('chat-content'); // Added class for consistency
    textElement.textContent = text;
    messageElement.appendChild(textElement);

    return messageElement;
}

/**
 * Creates a DOM element for a message from the user.
 * @param {string} text - The message text.
 * @returns {HTMLDivElement} The created message element.
 */
export function createUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'user-message');

    // Add title with timestamp
    const titleElement = document.createElement('div');
    titleElement.classList.add('chat-title');
    // Use internal getTimestamp from this file
    titleElement.textContent = `You - ${getTimestamp()}`;
    messageElement.appendChild(titleElement);

    const textElement = document.createElement('div');
    textElement.classList.add('chat-content'); // Added class for consistency
    textElement.textContent = text;
    messageElement.appendChild(textElement);

    return messageElement;
}

/**
 * Adds a status message (non-conversational) to the chat history.
 * Note: ChatManager now has its own addStatusMessage method.
 * @param {string} text - The status message text.
 */
export function addStatusMessage(text) {
    const chatHistory = document.getElementById('chatHistory');
    if (!chatHistory) {
        console.error("addStatusMessage (handler): chatHistory element not found.");
        return;
    }

    const messageElement = document.createElement('div');
    // Using status-message class is preferred over inline styles below
    messageElement.classList.add('chat-message', 'status-message');
    // These inline styles override the class and might not be necessary if .status-message is styled well in CSS
    messageElement.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
    messageElement.style.color = '#cccccc'; // Might conflict with theme text color
    messageElement.style.alignSelf = 'center';
    messageElement.style.maxWidth = '90%';
    messageElement.style.fontSize = '0.85em';
    messageElement.style.padding = '5px 10px';
    messageElement.textContent = `${getTimestamp()} - ${text}`; // Add timestamp here too?
    chatHistory.appendChild(messageElement);

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Gets the current time formatted for display.
 * Note: Duplicates logic in ChatManager.
 * @returns {string} Formatted time string (HH:MM).
 */
function getTimestamp() {
    const now = new Date();
    // Ensure consistent formatting (e.g., with leading zeros if needed)
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}