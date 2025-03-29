/**
 * Configuration settings for the Gemini Live application.
 * Reads settings from localStorage where applicable, providing defaults.
 */

// --- Model Configuration ---

// List of available Gemini models for the selector
export const AVAILABLE_MODELS = [
    // NOTE: Ensure these model names are valid for the API endpoint being used.
    // Names might vary based on API version or available model families.
    "models/gemini-1.5-flash", // Often a good default
    'models/gemini-2.0-flash-exp',
    "models/gemini-2.0-flash-001",
    "models/gemini-2.5-pro-exp-03-25",
    "models/gemini-2.0-flash-exp-image-generation",
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-2.0-flash-thinking-exp-1219",
    // Add the non-prefixed name as well, API might accept it
    "gemini-1.5-flash",
    'gemini-2.0-flash-exp',
    "gemini-2.0-flash-001",
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-thinking-exp-01-21"
];

// Default model if none is selected or found in localStorage
export const DEFAULT_MODEL = 'models/gemini-2.0-flash-exp';


// --- API Key and Endpoint Configuration ---

export const getWebsocketUrl = () => {
    const apiKey = localStorage.getItem('apiKey');
    // Basic check if API key exists
    if (!apiKey) {
        console.error("Gemini API Key not found in localStorage. Please add it in settings.");
        // Throwing an error here might be better to prevent connection attempts
        // throw new Error("Missing Gemini API key in settings.");
    }
    // Note: The base URL might differ for different models or API versions.
    // Ensure this endpoint is compatible with the selected models.
    const baseUrl = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
    return `${baseUrl}?key=${apiKey}`;
};

export const getDeepgramApiKey = () => {
    return localStorage.getItem('deepgramApiKey') || '';
};

// --- Helper Functions for Reading localStorage ---

const getLocalStorageNumber = (key, defaultValue, isFloat = false, min = -Infinity, max = Infinity) => {
    const storedValue = localStorage.getItem(key);
    let value = isFloat ? parseFloat(storedValue) : parseInt(storedValue, 10);
    if (isNaN(value) || value < min || value > max) {
        // console.warn(`Invalid or out-of-range value for ${key} in localStorage ("${storedValue}"). Using default: ${defaultValue}`);
        value = defaultValue;
    }
    return value;
};

const getLocalStorageItem = (key, defaultValue = '') => {
    // Return defaultValue if item is null or undefined
    return localStorage.getItem(key) ?? defaultValue;
};

// Mapping for safety thresholds
const thresholds = {
    "0": "BLOCK_NONE", // Note: Keys should be strings as localStorage stores strings
    "1": "BLOCK_ONLY_HIGH",
    "2": "BLOCK_MEDIUM_AND_ABOVE",
    "3": "BLOCK_LOW_AND_ABOVE",
    // Default fallback if value from localStorage is invalid
    "default": "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
};

// Helper to get threshold safely
const getSafetyThreshold = (key) => {
    const value = localStorage.getItem(key); // e.g., "3"
    return thresholds[value] || thresholds["default"]; // Access mapping using string key
};


// --- Main Configuration Object Getter ---

// Audio Configurations - Read from localStorage via helpers
export const MODEL_SAMPLE_RATE = getLocalStorageNumber('sampleRate', 24000, false, 8000, 48000); // Default 24kHz

/**
 * Generates the configuration object required by the GeminiAgent.
 * Reads settings dynamically from localStorage where appropriate.
 * @returns {object} The configuration object.
 */
export const getConfig = () => {
    // Get the currently selected model from localStorage, or use the default
    const selectedModel = getLocalStorageItem('selectedModel', DEFAULT_MODEL);

    // Ensure the selected model is actually in our available list? Optional validation.
    if (!AVAILABLE_MODELS.includes(selectedModel)) {
        console.warn(`Selected model "${selectedModel}" not in AVAILABLE_MODELS list. Using default: ${DEFAULT_MODEL}`);
        // Force default if invalid selection stored
        // selectedModel = DEFAULT_MODEL; // Uncomment to enforce selection from list
    }


    return {
        // Use the dynamically retrieved model name
        model: selectedModel,

        generationConfig: {
            // Using validated getters
            temperature: getLocalStorageNumber('temperature', 1.0, true, 0.0, 2.0),
            top_p: getLocalStorageNumber('top_p', 0.95, true, 0.0, 1.0),
            top_k: getLocalStorageNumber('top_k', 40, false, 1), // Min top_k is usually 1
            responseModalities: "text", // Assuming only text for now, could be dynamic
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: getLocalStorageItem('voiceName', 'Aoede') // Using validated getter
                    }
                }
            }
        },
        systemInstruction: {
            parts: [{
                text: getLocalStorageItem('systemInstructions', "You are a helpful assistant.") // Using validated getter
            }]
        },
        tools: {
            // Tool declarations are added dynamically by the Agent using ToolManager
            functionDeclarations: [],
        },
        // Ensure all relevant categories are included
        safetySettings: [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": getSafetyThreshold('harassmentThreshold')
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": getSafetyThreshold('hateSpeechThreshold')
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": getSafetyThreshold('sexuallyExplicitThreshold')
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": getSafetyThreshold('dangerousContentThreshold')
            },
            // Civic Integrity might not be supported by all models/versions,
            // but include if needed and supported. Check API documentation.
            {
                "category": "HARM_CATEGORY_CIVIC_INTEGRITY",
                "threshold": getSafetyThreshold('civicIntegrityThreshold')
            }
        ]
    };
};