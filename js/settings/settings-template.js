
export const settingsTemplate = `
<div class="settings-tabs">
    <div class="settings-tab active" data-tab="api">API</div>
    <div class="settings-tab" data-tab="ui">UI</div>
    <div class="settings-tab" data-tab="system">System Instructions</div>
    <div class="settings-tab" data-tab="media">Mic, Screen & Camera</div>
    <div class="settings-tab" data-tab="advanced">Advanced</div>
    <div class="settings-tab" data-tab="safety">Safety Settings</div>
    <div class="settings-tab" data-tab="misc">Misc</div>
    <div class="settings-tab" data-tab="about">About</div>
</div>

<div class="tab-content active" id="api-tab">
    <div class="settings-group">
        <label for="apiKey">Gemini API Key</label>
        <input type="password" id="apiKey" placeholder="Enter your API key">
    </div>
    <div class="settings-group">
        <label for="deepgramApiKey">Deepgram API Key (Optional)</label>
        <input type="password" id="deepgramApiKey" placeholder="Enter your Deepgram API key">
    </div>
</div>

<div class="tab-content" id="ui-tab">
    <div class="settings-group">
        <label for="themeToggle">Dark Mode</label>
        <label class="switch">
            <input type="checkbox" id="themeToggle">
            <span class="slider round"></span>
        </label>
    </div>
    <div class="settings-group">
        <label for="textSize">Text Size</label>
        <div class="slider-container">
            <input type="range" min="12" max="24" value="16" id="textSize">
            <span id="textSizeValue">16px</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="timestampToggle">Show Timestamps</label>
        <label class="switch">
            <input type="checkbox" id="timestampToggle">
            <span class="slider round"></span>
        </label>
    </div>
    <div class="settings-group">
        <label for="speakToggle">Enable Speech</label>
        <label class="switch">
            <input type="checkbox" id="speakToggle">
            <span class="slider round"></span>
        </label>
    </div>
</div>

<div class="tab-content" id="system-tab">
    <div class="settings-group">
        <label for="systemInstructions">System Instructions</label>
        <textarea id="systemInstructions" rows="8" placeholder="Enter system instructions">You are a helpful assistant</textarea>
    </div>
</div>

<div class="tab-content" id="media-tab">
    <div class="settings-group">
        <label for="fps">FPS (1-10)</label>
        <div class="slider-container">
            <input type="range" min="1" max="10" value="1" id="fps">
            <span id="fpsValue">1 FPS</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="resizeWidth">Resize Width (640-1920)</label>
        <div class="slider-container">
            <input type="range" min="640" max="1920" value="640" id="resizeWidth">
            <span id="resizeWidthValue">640px</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="quality">Quality (0.1-1)</label>
        <div class="slider-container">
            <input type="range" min="0.1" max="1" step="0.1" value="0.3" id="quality">
            <span id="qualityValue">0.3</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="voice">Voice</label>
        <select id="voice">
            <option value="Puch">Puch</option>
            <option value="Charon">Charon</option>
            <option value="Kenrir">Kenrir</option>
            <option value="Kore">Kore</option>
            <option value="Aoede" selected>Aoede</option>
        </select>
    </div>
    <div class="settings-group">
        <label for="sampleRate">Sample Rate</label>
        <div class="slider-container">
            <input type="range" min="16000" max="48000" step="1000" value="27000" id="sampleRate">
            <span id="sampleRateValue">27000 Hz</span>
        </div>
    </div>
</div>

<div class="tab-content" id="advanced-tab">
    <div class="settings-group">
        <label for="temperature">Temperature (0-2)</label>
        <div class="slider-container">
            <input type="range" min="0" max="2" step="0.1" value="1.8" id="temperature">
            <span id="temperatureValue">1.8</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="topP">Top P (0-1)</label>
        <div class="slider-container">
            <input type="range" min="0" max="1" step="0.05" value="0.95" id="topP">
            <span id="topPValue">0.95</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="topK">Top K (1-100)</label>
        <div class="slider-container">
            <input type="range" min="1" max="100" value="65" id="topK">
            <span id="topKValue">65</span>
        </div>
    </div>
</div>

<div class="tab-content" id="safety-tab">
    <div class="settings-group">
        <label for="harassmentThreshold">Harassment (0-3)</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" id="harassmentThreshold">
            <span id="harassmentValue">High</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="dangerousContentThreshold">Dangerous Content (0-3)</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" id="dangerousContentThreshold">
            <span id="dangerousValue">High</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="sexuallyExplicitThreshold">Sexually Explicit (0-3)</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" id="sexuallyExplicitThreshold">
            <span id="sexualValue">High</span>
        </div>
    </div>
    <div class="settings-group">
        <label for="civicIntegrityThreshold">Civic Integrity (0-3)</label>
        <div class="slider-container">
            <input type="range" min="0" max="3" value="3" id="civicIntegrityThreshold">
            <span id="civicValue">High</span>
        </div>
    </div>
</div>

<div class="tab-content" id="misc-tab">
    <div class="settings-group">
        <h3>Miscellaneous Options</h3>
        <p>Additional options will appear here in future updates.</p>
    </div>
</div>

<div class="tab-content" id="about-tab">
    <div class="settings-group">
        <h3>Created by Jamie Reddin</h3>
        <p>Version 1.0.0</p>
    </div>
</div>

<button id="settingsSaveBtn" class="settings-save-btn">Save Settings</button>
`;
