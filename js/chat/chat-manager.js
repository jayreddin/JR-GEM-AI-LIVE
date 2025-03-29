export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        // Ensure chat container is available
        if (!this.chatContainer) {
            console.error('Chat container not found, creating a fallback');
            this.chatContainer = document.createElement('div');
            this.chatContainer.id = 'chatHistory';
            this.chatContainer.className = 'chat-history';
            document.body.appendChild(this.chatContainer);
        }
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';

        // Add timestamp if enabled
        const timestamp = this.getTimestamp();
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = timestamp ? `You - ${timestamp}` : 'You';
        messageDiv.appendChild(titleDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();
    }

    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';

        // Add timestamp if enabled
        const timestamp = this.getTimestamp();
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = timestamp ? `You - ${timestamp}` : 'You';
        messageDiv.appendChild(titleDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        contentDiv.textContent = 'Voice input';
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    startModelMessage() {
        // If there's already a streaming message, finalize it first
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown yet, show audio message
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';

        // Add model name and timestamp
        const timestamp = this.getTimestamp();
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = timestamp ? `Gemini 2.0 Flash - ${timestamp}` : 'Gemini 2.0 Flash';
        messageDiv.appendChild(titleDiv);

        // Add content div
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-content';
        messageDiv.appendChild(contentDiv);

        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = ''; // Reset transcript when starting new message
        this.scrollToBottom();
    }

    getTimestamp() {
        if (localStorage.getItem('showTimestamps') === 'true') {
            const now = new Date();
            return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return null;
    }
    
    toggleTimestamps() {
        const currentSetting = localStorage.getItem('showTimestamps') === 'true';
        localStorage.setItem('showTimestamps', !currentSetting);
        console.log('Timestamps toggled:', !currentSetting);
    }

    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        const contentDiv = this.currentStreamingMessage.querySelector('.chat-content');
        if (contentDiv) {
            this.currentTranscript += text;
            contentDiv.textContent = this.currentTranscript;
        }

        // Update just the content div
        const contentDiv = this.currentStreamingMessage.querySelector('.chat-content');
        if (contentDiv) {
            contentDiv.textContent = this.currentTranscript;
        }

        this.scrollToBottom();

        // If speech is enabled, send to speech synthesis
        if (window.speechEnabled && text.trim() !== '') {
            this.speakText(text);
        }
    }

    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = ''; // Reset transcript when finalizing
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window && window.speechEnabled) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    clear() {
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }
}