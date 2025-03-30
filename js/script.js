/**
 * Main application entry point.
 * Initializes core components like the Agent, ToolManager, and ChatManager,
 * sets up global references, handles agent events for chat updates,
 * and initiates the connection to the backend service.
 */

// Core application components
import { GeminiAgent } from './main/agent.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import { ImageGenUI } from './imgGen.js'; // Import the new ImageGenUI class

// Tool implementations
import { GoogleSearchTool } from './tools/google-search.js';
import './dom/events.js';

// --- Initialization ---

console.info("Initializing application...");

// 1. Initialize Tool Manager and register tools
const toolManager = new ToolManager();
try {
    toolManager.registerTool('googleSearch', new GoogleSearchTool());
    // Register other tools here if needed
    console.info("ToolManager initialized and tools registered.");
} catch (error) {
    console.error("Error initializing ToolManager or registering tools:", error);
    // Potentially halt initialization or notify user
}

// 2. Initialize Chat Manager (for UI updates)
let chatManager;
try {
    chatManager = new ChatManager();
    // Make chatManager globally accessible (required by current dom/events.js structure)
    // TODO: Refactor dom/events.js to avoid relying on globals if possible.
    window.chatManager = chatManager;
    console.info("ChatManager initialized.");

    // Initialize Image Generation UI
    try {
        new ImageGenUI();
        console.info("ImageGenUI initialized.");
    } catch (error) {
        console.error("Error initializing ImageGenUI:", error);
    }
} catch (error) {
    console.error("Error initializing ChatManager:", error);
    // Application might be unusable without chat UI, notify user
    alert("Critical error: Failed to initialize chat interface."); // Basic user feedback
}


// 3. Initialize Gemini Agent
let geminiAgent;
try {
    geminiAgent = new GeminiAgent({
        name: 'GeminiAgentInstance', // Optional name for logging
        toolManager: toolManager, // Pass the initialized tool manager
        // Configuration (URL, API keys, model settings) is now loaded internally by the Agent
        // Transcription options can still be passed if needed, otherwise defaults are used:
        // transcribeModelsSpeech: true,
        // transcribeUsersSpeech: false,
    });
    // Expose agent globally (required by current dom/events.js structure)
    // TODO: Refactor dom/events.js to avoid relying on globals if possible.
    window.agent = geminiAgent;
    console.info("GeminiAgent instance created.");

} catch (error) {
    console.error("Error creating GeminiAgent instance:", error);
    // Critical error, likely configuration related. Notify user.
    alert(`Critical error: Failed to create agent - ${error.message}`); // Basic user feedback
    // Halt further execution as the agent is essential
    throw error; // Stop script execution
}


// 4. Setup Agent Event Listeners (for Chat UI updates)
// These listeners connect agent events to chat manager actions.
if (geminiAgent && chatManager) {
    geminiAgent.on('transcription', (transcript) => {
        // console.debug('Agent emitted transcription:', transcript); // Optional debug log
        chatManager.updateStreamingMessage(transcript);
    });

    geminiAgent.on('text_sent', (data) => { // Assuming client emits object { text, endOfTurn }
        console.debug('Agent emitted text_sent:', data.text);
        // Finalize any previous streaming message *before* adding the user's message
        chatManager.finalizeStreamingMessage();
        // Add the user message (handled by dom/events.js now)
        // chatManager.addUserMessage(data.text); // Duplicates logic in dom/events.js
    });

    geminiAgent.on('interrupted', () => {
        console.debug('Agent emitted interrupted.');
        chatManager.finalizeStreamingMessage(); // Stop displaying streaming indicator
        // User message display is handled by ChatManager logic based on lastUserMessageType
        // if (!chatManager.lastUserMessageType) {
        //     chatManager.addUserAudioMessage(); // Might be redundant if turn_complete also finalizes
        // }
    });

    geminiAgent.on('turn_complete', () => {
        console.debug('Agent emitted turn_complete.');
        chatManager.finalizeStreamingMessage(); // Ensure message is finalized
    });

    geminiAgent.on('text', (text) => {

        // console.debug('Agent emitted text chunk:', text); // Optional debug log
        // Handle streaming text from the model
        chatManager.updateStreamingMessage(text);
    });

    geminiAgent.on('error', (errorInfo) => {
        // Generic handler for errors emitted by the agent (connection, init, etc.)
        console.error(`Agent emitted error (${errorInfo?.type || 'general'}):`, errorInfo?.details || errorInfo);
        // Optionally display a generic error message in the UI via chatManager
        if (chatManager.addStatusMessage) { // Check if function exists
            chatManager.addStatusMessage(`Agent error: ${errorInfo?.details?.message || 'An unspecified error occurred.'}`);
        }
    });

    geminiAgent.on('disconnected', (details) => {
        // Handle unexpected disconnects if needed (e.g., update UI beyond button state)
        console.warn(`Agent emitted disconnected. Code: ${details?.code}, Reason: ${details?.reason}`);
        if (chatManager.addStatusMessage) {
            chatManager.addStatusMessage(`Connection lost. Code: ${details?.code}`);
        }
    });


    console.info("Agent event listeners configured for ChatManager.");

} else {
    console.error("Cannot setup agent event listeners: Agent or ChatManager instance is missing.");
}


// 5. Initial Connection Attempt (using the agent instance)
// The connection logic is now encapsulated within agent.connect()
// Event listeners in dom/events.js handle the visual feedback (button states, status messages)
(async () => {
    if (geminiAgent) {
        console.info("Attempting initial connection via agent...");
        // No need to explicitly call ensureAgentReady here,
        // let the user initiate connection via the power button in the UI.
        // The power button click handler in dom/events.js will call agent.connect().

        // If automatic connection on load is desired, uncomment the following:
        /*
        try {
            await geminiAgent.connect();
            console.log('Initial connection successful.');
            // The 'connected' event emitted by the agent can trigger further UI updates if needed.
            // The power button state should ideally be updated by the event listener in dom/events.js
            // based on the agent.connected state or emitted events.

            // Optional: Trigger initial model interaction after connection
            // await geminiAgent.initialize(); // Initialize audio etc. if needed immediately
            // await geminiAgent.sendText("."); // Send initial prompt
        } catch (error) {
            console.error('Initial connection failed:', error);
            // Error message should be shown via the 'error' event listener setup above
            // or handled by the connect method itself. UI should reflect disconnected state.
        }
        */
    } else {
        console.error("Cannot initiate connection: GeminiAgent instance not available.");
    }
})();

console.info("Application script initialization finished.");

// Note: All UI event listeners (button clicks, input handling) are now managed
// within js/dom/events.js, which runs after DOMContentLoaded.