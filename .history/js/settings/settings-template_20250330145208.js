/**
 * HTML template literal for the settings dialog content.
 * Includes tabs, input fields, sliders, and toggles for various application settings.
 */

export const settingsTemplate = `
<button class="settings-close-btn" aria-label="Close Settings">&times;</button>

<div class="settings-tabs">
    <div class="settings-tab active" data-tab="api" role="tab" aria-selected="true" aria-controls="api-tab">API Keys</div>
    <div class="settings-tab" data-tab="ui" role="tab" aria-selected="false" aria-controls="ui-tab">Interface</div>
    <div class="settings-tab" data-tab="system" role="tab" aria-selected="false" aria-controls="system-tab">Instructions</div>
    <div class="settings-tab" data-tab="media" role="tab" aria-selected="false" aria-controls="media-tab">Media</div>
    <div class="settings-tab" data-tab="advanced" role="tab" aria-selected="false" aria-controls="advanced-tab">Model</div>
    <div class="settings-tab" data-tab="safety" role="tab" aria-selected="false" aria-controls="safety-tab">Safety</div>
    <div class="settings-tab" data-tab="misc" role="tab" aria-selected="false" aria-controls="misc-tab">Misc</div>
    <div class="settings-tab" data-tab="about" role="tab" aria-selected="false" aria-controls="about-tab">About</div>
</div>

<div class="tab-content active" id="api-tab" role="tabpanel" aria-labelledby="api-tab-button">
    <div class="settings-group">
        <label for="apiKey">Gemini API Key</label>
        <input type="password" id="apiKey" placeholder="Enter your Gemini API key" autocomplete="off">
    </div>
    <div class="settings-group">
        <label for="deepgramApiKey">Deepgram API Key (Optional)</label>
        <input type="password" id="deepgramApiKey" placeholder="Enter your Deepgram API key (for transcription)" autocomplete="off">
        <small>Used for real-time transcription if enabled.</small>
    </div>
</div>

<div class="tab-content" id="ui-tab" role="tabpanel" aria-labelledby="ui-tab-button">
    <div class="settings-group">
        <label for="themeToggle">Dark Mode</label>
        <label class="switch">
            <input type="checkbox" id="themeToggle" aria-label="Toggle Dark Mode">
            <span class="slider round"></span>
        </label>
    </div>
    <div class="settings-group">
        <label for="textSize">Chat Text Size</label>
        <div class="slider-container">
            <input type="range" min="12" max="24" value="16" step="1" id="textSize" aria-labelledby="textSizeLabel">
            <span id="textSizeValue" aria-live="polite">16px</span>
        </div>
         <span id="textSizeLabel" class="visually-hidden">Chat text size control</span>
    </div>
    <div class="settings-group">
        <label for="timestampToggle">Show Timestamps</label>
        <label class="switch">
            <input type="checkbox" id="timestampToggle" aria-label="Toggle Timestamps">
            <span class="slider round"></span>
        </label>
    </div>
    <div class="settings-group">
        <label for="speakToggle">Enable Speech Output (TTS)</label>
        <label class="switch">
            <input type="checkbox" id="speakToggle" aria-label="Toggle Text to Speech">
            <span class="slider round"></span>
        </label>
    </div>
</div>

<div class="tab-content" id="system-tab" role="tabpanel" aria-labelledby="system-tab-button">
    <div class="settings-group">
        <label for="systemInstructions">System Instructions</label>
        <textarea id="systemInstructions" rows="8" placeholder="Enter instructions for the AI model (e.g., 'You are a helpful assistant specializing in coding.')">You are a helpful assistant.</textarea>
        <small>Provides context or persona for the AI model.</small>
    </div>
</div>

<div class="tab-content" id="media-tab" role="tabpanel" aria-labelledby="media-tab-button">
    <div class="settings-group">
        <label for="voice">TTS Voice</label>
        <select id="voice" aria-label="Select Text-to-Speech Voice">
            <option value="Puch">Puch</option>
            <option value="Charon">Charon</option>
            <option value="Kenrir">Kenrir</option>
            <option value="Kore">Kore</option>
            <option value="Aoede" selected>Aoede</option>
             </select>
    </div>
    <div class="settings-group">
        <label for="sampleRate">TTS Sample Rate</label>
        <div class="slider-container">
            <input type="range" min="8000" max="48000" step="1000" value="24000" id="sampleRate" aria-labelledby="sampleRateLabel">
            <span id="sampleRateValue" aria-live="polite">24000 Hz</span>
        </div>
         <span id="sampleRateLabel" class="visually-hidden">Text-to-Speech sample rate control</span>
         <small>Sample rate for the generated audio from the model (e.g., 16000, 24000 Hz).</small>
    </div>
     <hr style="border-color: var(--button-hover); margin: 20px 0;">
     <h4 style="margin-bottom: 15px;">Camera & Screen Capture</h4>
    <div class="settings-group">
        <label for="fps">Capture FPS (Frames Per Second)</label>
        <div class="slider-container">
            <input type="range" min="1" max="10" value="5" step="1" id="fps" aria-labelledby="fpsLabel">
            <span id="fpsValue" aria-live="polite">5 FPS</span>
        </div>
         <span id="fpsLabel" class="visually-hidden">Camera and screen capture frames per second control</span>
         <small>How many frames per second to capture from camera/screen (1-10).</small>
    </div>
    <div class="settings-group">
        <label for="resizeWidth">Capture Resize Width</label>
        <div class="slider-container">
            <input type="range" min="320" max="1920" value="640" step="10" id="resizeWidth" aria-labelledby="resizeWidthLabel">
            <span id="resizeWidthValue" aria-live="polite">640px</span>
        </div>
         <span id="resizeWidthLabel" class="visually-hidden">Width to resize captured frames to</span>
         <small>Width (pixels) to resize captured frames before sending (aspect ratio maintained).</small>
    </div>
    <div class="settings-group">
        <label for="quality">Capture JPEG Quality</label>
        <div class="slider-container">
            <input type="range" min="0.1" max="1.0" step="0.1" value="0.4" id="quality" aria-labelledby="qualityLabel">
            <span id="qualityValue" aria-live="polite">0.4</span>
        </div>
         <span id="qualityLabel" class="visually-hidden">JPEG quality for captured frames</span>
         <small>Quality for captured JPEG images (0.1 lowest - 1.0 highest).</small>
    </div>
</div>

<div class="tab-content" id="advanced-tab" role="tabpanel" aria-labelledby="advanced-tab-button">
    <div class="settings-group">
        <label for="temperature">Temperature</label>
        <div class="slider-container">
            <input type="range" min="0.0" max="2.0" step="0.1" value="1.0" id="temperature" aria-labelledby="temperatureLabel">
            <span id="temperatureValue" aria-live="polite">1.0</span>
        </div>
         <span id="temperatureLabel" class="visually-hidden">Model temperature control</span>
         <small>Controls randomness (0.0 = deterministic, 2.0 = max random).</small>
    </div>
    <div class="settings-group">
        <label for="topP">Top P</label>
        <div class="slider-container">
            <input type="range" min="0.0" max="1.0" step="0.05" value="0.95" id="topP" aria-labelledby="topPLabel">
            <span id="topPValue" aria-live="polite">0.95</span>
        </div>
         <span id="topPLabel" class="visually-hidden">Model Top P control</span>
         <small>Nucleus sampling parameter (e.g., 0.95 considers tokens comprising 95% probability mass).</small>
    </div>
    <div class="settings-group">
        <label for="topK">Top K</label>
        <div class="slider-container">
            <input type="range" min="1" max="100" value="40" step="1" id="topK" aria-labelledby="topKLabel">
            <span id="topKValue" aria-live="polite">40</span>
        </div>
         <span id="topKLabel" class="visually-hidden">Model Top K control</span>
         <small>Considers only the top K most likely tokens at each step.</small>
    </div>
</div>

<div class="tab-content" id="safety-tab" role="tabpanel" aria-labelledby="safety-tab-button">
    <small style="display:block; margin-bottom: 15px;">Configure content blocking thresholds (Lower value = Block Less).</small>
    <div class="settings-group">
        <label for="harassmentThreshold">Harassment</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" step="1" id="harassmentThreshold" aria-labelledby="harassmentLabel">
            <span id="harassmentValue" aria-live="polite">Block Low+</span>
        </div>
        <span id="harassmentLabel" class="visually-hidden">Harassment safety threshold control</span>
    </div>
    <div class="settings-group">
        <label for="hateSpeechThreshold">Hate Speech</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" step="1" id="hateSpeechThreshold" aria-labelledby="hateSpeechLabel">
            <span id="hateSpeechValue" aria-live="polite">Block Low+</span>
        </div>
        <span id="hateSpeechLabel" class="visually-hidden">Hate speech safety threshold control</span>
    </div>
    <div class="settings-group">
        <label for="dangerousContentThreshold">Dangerous Content</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" step="1" id="dangerousContentThreshold" aria-labelledby="dangerousLabel">
            <span id="dangerousValue" aria-live="polite">Block Low+</span>
        </div>
         <span id="dangerousLabel" class="visually-hidden">Dangerous content safety threshold control</span>
    </div>
    <div class="settings-group">
        <label for="sexuallyExplicitThreshold">Sexually Explicit</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" step="1" id="sexuallyExplicitThreshold" aria-labelledby="sexualLabel">
            <span id="sexualValue" aria-live="polite">Block Low+</span>
        </div>
         <span id="sexualLabel" class="visually-hidden">Sexually explicit safety threshold control</span>
    </div>
    <div class="settings-group">
        <label for="civicIntegrityThreshold">Civic Integrity</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" step="1" id="civicIntegrityThreshold" aria-labelledby="civicLabel">
            <span id="civicValue" aria-live="polite">Block Low+</span>
        </div>
        <span id="civicLabel" class="visually-hidden">Civic integrity safety threshold control</span>
        <small>(May not be supported by all models)</small>
    </div>
     <small>0: Block None, 1: Block High Only, 2: Block Medium+, 3: Block Low+</small>
</div>

<div class="tab-content" id="misc-tab" role="tabpanel" aria-labelledby="misc-tab-button">
    <div class="settings-group">
        <h3>Miscellaneous Options</h3>
        <p>Placeholder for future settings.</p>
        </div>
</div>

<div class="tab-content" id="about-tab" role="tabpanel" aria-labelledby="about-tab-button">
    <div class="settings-group">
        <h3>Gemini Live Client</h3>
         <p>Version 1.1.0 (Modified)</p>
         <p>Created by Jamie Reddin</p>
         </div>
</div>

<button id="settingsSaveBtn" class="settings-save-btn">Save Settings</button>

 <style>
     .visually-hidden {
         position: absolute;
         left: -10000px;
         top: auto;
         width: 1px;
         height: 1px;
         overflow: hidden;
     }
 </style>
`;