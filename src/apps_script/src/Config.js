/**
 * Config.js - Handles configuration management for the add-on
 */

/**
 * Validates an API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key format is valid
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Basic validation: just ensure it's a non-empty string with reasonable length
  // and contains only valid characters
  return apiKey.length >= 32 && /^[a-zA-Z0-9_\-*#()]+$/.test(apiKey);
}

/**
 * Gets the stored API key
 * @returns {string|null} The API key or null if not set
 */
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('HUMBLE_CLAY_API_KEY');
}

/**
 * Sets the API key in script properties
 * @param {string} apiKey - The API key to store
 * @throws {Error} If the API key is invalid
 */
function setApiKey(apiKey) {
  // Validate API key format
  if (!validateApiKey(apiKey)) {
    throw new Error('Invalid API key format');
  }

  // Store the API key
  PropertiesService.getScriptProperties().setProperty('HUMBLE_CLAY_API_KEY', apiKey);
}

/**
 * Gets the API base URL from script properties
 * @returns {string} The API base URL
 */
function getApiBaseUrl() {
  return PropertiesService.getScriptProperties().getProperty('HUMBLE_CLAY_API_URL');
}

/**
 * Sets the API base URL in script properties
 * @param {string} url - The API base URL to store
 */
function setApiBaseUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid API URL format');
  }
  PropertiesService.getScriptProperties().setProperty('HUMBLE_CLAY_API_URL', url);
}

/**
 * Shows the API configuration dialog
 */
function showConfigDialog() {
  // Get current values
  const currentApiKey = getApiKey() || '';
  const currentApiUrl = getApiBaseUrl() || '';

  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .form-group { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; }
      input { width: 100%; padding: 8px; margin-bottom: 10px; }
      .hint { font-size: 0.8em; color: #666; margin-top: 3px; }
      .error { color: red; margin-top: 5px; display: none; }
      .success { color: green; margin-top: 5px; display: none; }
    </style>
    <form id="configForm">
      <div class="form-group">
        <label for="apiKey">Humble Clay API Key:</label>
        <input type="password" id="apiKey" name="apiKey" required 
               value="${currentApiKey}"
               placeholder="Enter your API key">
        <div class="hint">Your Humble Clay API key</div>
      </div>
      <div class="form-group">
        <label for="apiUrl">API URL:</label>
        <input type="text" id="apiUrl" name="apiUrl" required 
               value="${currentApiUrl}"
               placeholder="e.g., http://localhost:8000">
        <div class="hint">The base URL of your Humble Clay API</div>
      </div>
      <div id="error" class="error"></div>
      <div id="success" class="success"></div>
      <button type="submit">Save Configuration</button>
    </form>
    <script>
      // Handle form submission
      document.getElementById('configForm').onsubmit = function(e) {
        e.preventDefault();
        const apiKey = document.getElementById('apiKey').value;
        const apiUrl = document.getElementById('apiUrl').value;
        const errorDiv = document.getElementById('error');
        const successDiv = document.getElementById('success');
        
        // Reset messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        // Call the server-side function
        google.script.run
          .withSuccessHandler(function() {
            successDiv.textContent = 'Configuration saved successfully!';
            successDiv.style.display = 'block';
            // Close the dialog after a short delay
            setTimeout(function() {
              google.script.host.close();
            }, 2000);
          })
          .withFailureHandler(function(error) {
            errorDiv.textContent = error.message || 'Failed to save configuration';
            errorDiv.style.display = 'block';
          })
          .saveConfiguration(apiKey, apiUrl);
      };
    </script>
  `)
  .setWidth(400)
  .setHeight(300)
  .setTitle('Configure Humble Clay API');

  SpreadsheetApp.getUi().showModalDialog(html, 'Configure API');
}

/**
 * Saves both API key and URL configuration
 * @param {string} apiKey - The API key to save
 * @param {string} apiUrl - The API URL to save
 */
function saveConfiguration(apiKey, apiUrl) {
  // Validate and save API key
  setApiKey(apiKey);
  
  // Validate and save API URL
  setApiBaseUrl(apiUrl);
}

/**
 * Checks if the configuration is complete
 * @returns {boolean} True if both API key and URL are configured
 */
function isConfigured() {
  const apiKey = getApiKey();
  const apiUrl = getApiBaseUrl();
  return apiKey !== null && apiKey !== '' && apiUrl !== null && apiUrl !== '';
}

/**
 * Validates the current configuration
 * @returns {Object} Validation result with status and message
 */
function validateConfig() {
  const apiKey = getApiKey();
  const apiUrl = getApiBaseUrl();
  
  if (!apiKey) {
    return {
      isValid: false,
      message: 'API key not configured'
    };
  }

  if (!validateApiKey(apiKey)) {
    return {
      isValid: false,
      message: 'Invalid API key format'
    };
  }

  if (!apiUrl) {
    return {
      isValid: false,
      message: 'API URL not configured'
    };
  }

  return {
    isValid: true,
    message: 'Configuration is valid'
  };
}

// Only export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiKey,
    setApiKey,
    getApiBaseUrl,
    setApiBaseUrl,
    showConfigDialog,
    saveConfiguration,
    isConfigured,
    validateConfig,
    validateApiKey
  };
} 