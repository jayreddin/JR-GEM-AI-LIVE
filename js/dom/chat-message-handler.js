
export function createModelMessage(text, modelName = 'Gemini 2.0 Flash') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'model-message');
    
    // Add title with timestamp
    const titleElement = document.createElement('div');
    titleElement.classList.add('chat-title');
    titleElement.textContent = `Gemini ${modelName} - ${getTimestamp()}`;
    messageElement.appendChild(titleElement);
    
    const textElement = document.createElement('div');
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
    titleElement.textContent = `User: You - ${getTimestamp()}`;
    messageElement.appendChild(titleElement);
    
    const textElement = document.createElement('div');
    textElement.textContent = text;
    messageElement.appendChild(textElement);
    
    return messageElement;
}

export function addStatusMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'status-message');
    messageElement.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
    messageElement.style.color = '#cccccc';
    messageElement.style.alignSelf = 'center';
    messageElement.style.maxWidth = '90%';
    messageElement.style.fontSize = '0.85em';
    messageElement.style.padding = '5px 10px';
    messageElement.textContent = text;
    document.getElementById('chatHistory').appendChild(messageElement);
    
    // Scroll to bottom
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
