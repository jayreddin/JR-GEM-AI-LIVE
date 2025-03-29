// Function to get current timestamp (used by functions below)
function getTimestamp() {
    const now = new Date();
    // Using only time for consistency with original chat-manager usage
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function createModelMessage(text, modelName = 'Gemini 2.0 Flash') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'model-message');

    // Add title with timestamp
    const titleElement = document.createElement('div');
    titleElement.classList.add('chat-title');
    // Use the centralized getTimestamp function
    titleElement.textContent = `Gemini ${modelName} - ${getTimestamp()}`;
    messageElement.appendChild(titleElement);

    // Add chat-content class to the text container
    const textElement = document.createElement('div');
    textElement.classList.add('chat-content'); // <<< Added class
    textElement.textContent = text;
    messageElement.appendChild(textElement);

    return messageElement;
}

export function createUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'user-message');

    // Add title with timestamp
    const titleElement = document.createElement('div');
    titleElement.classList.add('chat-title');
    // Use the centralized getTimestamp function and format
    titleElement.textContent = `You - ${getTimestamp()}`; // <<< Modified text format slightly for consistency
    messageElement.appendChild(titleElement);

    // Add chat-content class to the text container
    const textElement = document.createElement('div');
    textElement.classList.add('chat-content'); // <<< Added class
    textElement.textContent = text;
    messageElement.appendChild(textElement);

    return messageElement;
}

// This is now the standard function for adding status messages
export function addStatusMessage(text) {
    const messageElement = document.createElement('div');
    // Ensure both classes are added
    messageElement.classList.add('chat-message', 'status-message');

    // Apply specific styling for status messages
    messageElement.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
    messageElement.style.color = '#cccccc';
    messageElement.style.alignSelf = 'center';
    messageElement.style.maxWidth = '90%';
    messageElement.style.fontSize = '0.85em';
    messageElement.style.padding = '5px 10px';
    messageElement.textContent = text; // Status messages often don't need title/content structure

    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) {
        chatHistory.appendChild(messageElement);
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } else {
        console.error("Chat history element not found for status message.");
    }
}

// Export getTimestamp if it needs to be used directly elsewhere,
// though often it's just used internally by message creation functions.
export { getTimestamp };