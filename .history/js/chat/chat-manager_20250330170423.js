/**
 * Manages the chat interface, including adding messages,
 * handling streaming responses, and scrolling.
 */
export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null; // 'text' or 'audio'
        this.currentTranscript = ''; // Store accumulated transcript for the current message
        this.speechEnabled = localStorage.getItem('speakEnabled') === 'true'; // Load initial state
    }

    /**
     * Adds a user message to the chat.
     * @param {string} text - The message text.
     */
    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        // Create content div for text
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();
    }

    /**
     * Adds a placeholder for a user audio message.
     */
    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        // Create content div for placeholder
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = 'User sent audio'; // Placeholder text
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    /**
     * Starts a new streaming message from the model.
     */
    startModelMessage() {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown yet (e.g., model starts speaking first), add placeholder
        // This logic might need adjustment based on desired behavior when model initiates
        if (!this.lastUserMessageType) {
             this.addUserAudioMessage(); // Add placeholder as per Context/chat-manager.js
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming'; // Add streaming class

        // Add content div inside message div
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv; // Store the parent message div
        this.currentTranscript = ''; // Reset transcript for the new message
        this.scrollToBottom();
    }

    /**
     * Updates the content of the current streaming model message.
     * @param {string} text - The new text chunk to append.
     */
    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        // Append text smoothly to the transcript
        // Use direct concatenation as per Context/chat-manager.js (no extra space needed if stream is chunked correctly)
        this.currentTranscript += text;
        // Update the text content of the inner contentDiv
        const contentDiv = this.currentStreamingMessage.querySelector('.chat-content');
        if (contentDiv) {
            contentDiv.textContent = this.currentTranscript;
        }
        this.scrollToBottom();
    }

    /**
     * Finalizes the current streaming message, removing the streaming indicator.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null; // Reset for the next turn
            this.currentTranscript = ''; // Clear transcript
        }
    }

    /**
     * Adds a complete model message (non-streaming).
     * @param {string} text - The full message text.
     */
    addModelMessage(text) {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage(); // Finalize any ongoing stream first
        }
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message';

        // Add content div
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = null; // Reset for the next turn
        this.scrollToBottom();
    }

    /**
     * Scrolls the chat container to the bottom.
     */
    scrollToBottom() {
        // Use setTimeout to ensure scrolling happens after DOM update
        setTimeout(() => {
            if (this.chatContainer) {
                this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            }
        }, 0);
    }

    /**
     * Clears all messages from the chat container.
     */
    clear() {
        if (!this.chatContainer) return;
        this.chatContainer.innerHTML = ''; // Clear content

        // Re-add essential containers if they were inside chatHistory
        const statusContainer = document.createElement('div');
        statusContainer.className = 'status-container';
        this.chatContainer.appendChild(statusContainer);

        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-container';
        waveContainer.innerHTML = `
            <canvas class="wave-bar ai"></canvas>
            <canvas class="wave-bar user"></canvas>
        `;
        this.chatContainer.appendChild(waveContainer);

        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    /**
     * Updates the speech enabled status.
     * @param {boolean} isEnabled - Whether speech output is enabled.
     */
    updateSpeechStatus(isEnabled) {
        this.speechEnabled = isEnabled;
        console.log(`ChatManager: Speech output ${isEnabled ? 'enabled' : 'disabled'}`);
    }
}
