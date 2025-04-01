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
  
  // Add specific validation rules based on Humble Clay API key format
  // This is a placeholder - update with actual API key format requirements
  const apiKeyPattern = /^hc_[a-zA-Z0-9]{32}$/;
  return apiKeyPattern.test(apiKey);
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
 * Shows the API configuration dialog
 */
function showConfigDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .form-group { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; }
      input[type="text"] { width: 100%; padding: 8px; margin-bottom: 10px; }
      .error { color: red; margin-top: 5px; display: none; }
      .success { color: green; margin-top: 5px; display: none; }
    </style>
    <form id="apiKeyForm">
      <div class="form-group">
        <label for="apiKey">Humble Clay API Key:</label>
        <input type="text" id="apiKey" name="apiKey" required 
               placeholder="Enter your API key (format: hc_...)">
        <div id="error" class="error"></div>
        <div id="success" class="success"></div>
      </div>
      <button type="submit">Save API Key</button>
    </form>
    <script>
      // Handle form submission
      document.getElementById('apiKeyForm').onsubmit = function(e) {
        e.preventDefault();
        const apiKey = document.getElementById('apiKey').value;
        const errorDiv = document.getElementById('error');
        const successDiv = document.getElementById('success');
        
        // Reset messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        // Call the server-side function
        google.script.run
          .withSuccessHandler(function() {
            successDiv.textContent = 'API key saved successfully!';
            successDiv.style.display = 'block';
            // Close the dialog after a short delay
            setTimeout(function() {
              google.script.host.close();
            }, 2000);
          })
          .withFailureHandler(function(error) {
            errorDiv.textContent = error.message || 'Failed to save API key';
            errorDiv.style.display = 'block';
          })
          .setApiKey(apiKey);
      };
    </script>
  `)
  .setWidth(400)
  .setHeight(250)
  .setTitle('Configure API Key');

  SpreadsheetApp.getUi().showModalDialog(html, 'Configure API Key');
}

/**
 * Checks if the API key is configured
 * @returns {boolean} True if the API key is configured
 */
function isConfigured() {
  const apiKey = getApiKey();
  return apiKey !== null && apiKey !== '';
}

/**
 * Validates the current configuration
 * @returns {Object} Validation result with status and message
 */
function validateConfig() {
  const apiKey = getApiKey();
  
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

  return {
    isValid: true,
    message: 'Configuration is valid'
  };
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiKey,
    setApiKey,
    showConfigDialog,
    isConfigured,
    validateConfig,
    validateApiKey
  };
} 