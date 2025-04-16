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
  const currentJinaKey = getJinaApiKey() || '';
  const currentSerperKey = getSerperApiKey() || '';

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
      <div class="form-group">
        <label for="jinaApiKey">Jina Reader API Key (Optional):</label>
        <input type="password" id="jinaApiKey" name="jinaApiKey" 
               value="${currentJinaKey}"
               placeholder="Enter your Jina Reader API key">
        <div class="hint">Optional. For improved web page conversion via Jina Reader.</div>
      </div>
      <div class="form-group">
        <label for="serperApiKey">Serper API Key (Optional):</label>
        <input type="password" id="serperApiKey" name="serperApiKey" 
               value="${currentSerperKey}"
               placeholder="Enter your Serper.dev API key">
        <div class="hint">Optional. For using the SEARCH_SERPER function.</div>
      </div>
      <div id="error" class="error"></div>
      <div id="success" class="success"></div>
      <button type="submit">Save Configuration</button>
    </form>
    <script>
      document.getElementById('configForm').onsubmit = function(e) {
        e.preventDefault();
        const apiKey = document.getElementById('apiKey').value;
        const apiUrl = document.getElementById('apiUrl').value;
        const jinaApiKey = document.getElementById('jinaApiKey').value;
        const serperApiKey = document.getElementById('serperApiKey').value;
        const errorDiv = document.getElementById('error');
        const successDiv = document.getElementById('success');
        
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        google.script.run
          .withSuccessHandler(function() {
            successDiv.textContent = 'Configuration saved successfully!';
            successDiv.style.display = 'block';
            setTimeout(function() {
              google.script.host.close();
            }, 2000);
          })
          .withFailureHandler(function(error) {
            errorDiv.textContent = error.message || 'Failed to save configuration';
            errorDiv.style.display = 'block';
          })
          .saveConfiguration(apiKey, apiUrl, jinaApiKey, serperApiKey);
      };
    </script>
  `)
  .setWidth(400)
  .setHeight(380);

  SpreadsheetApp.getUi().showModalDialog(html, 'Configure API');
}

/**
 * Saves API key, URL, and Jina key configuration.
 * Only updates a property if a non-empty value is provided for it from the UI.
 * Empty fields in the UI will leave existing stored values unchanged.
 * @param {string} apiKeyFromUi - The Humble Clay API key from the UI
 * @param {string} apiUrlFromUi - The API URL from the UI
 * @param {string} jinaApiKeyFromUi - The Jina API key from the UI
 * @param {string} serperApiKeyFromUi - The Serper API key from the UI
 */
function saveConfiguration(apiKeyFromUi, apiUrlFromUi, jinaApiKeyFromUi, serperApiKeyFromUi) {
  
  // Handle Humble Clay API Key
  const trimmedApiKey = apiKeyFromUi ? apiKeyFromUi.trim() : '';
  if (trimmedApiKey) {
      Logger.log("Attempting to save Humble Clay API Key...");
      setApiKey(trimmedApiKey); // Let setApiKey handle validation
      Logger.log("Humble Clay API Key processed.");
  } else {
      Logger.log("Humble Clay API Key field was empty in UI, preserving existing value.");
  }

  // Handle Humble Clay API URL
  const trimmedApiUrl = apiUrlFromUi ? apiUrlFromUi.trim() : '';
   if (trimmedApiUrl) {
      Logger.log("Attempting to save API URL...");
      setApiBaseUrl(trimmedApiUrl); // Let setApiBaseUrl handle validation
      Logger.log("API URL processed.");
  } else {
       Logger.log("API URL field was empty in UI, preserving existing value.");
  }

  // Handle Jina API Key (Optional - only set if provided)
  const trimmedJinaKey = jinaApiKeyFromUi ? jinaApiKeyFromUi.trim() : '';
  if (trimmedJinaKey) {
      Logger.log("Attempting to save Jina API Key...");
      setJinaApiKey(trimmedJinaKey); // Let setJinaApiKey handle validation
      Logger.log('Jina API Key processed.');
  } else {
      // If UI field was empty, do nothing, preserving the existing key.
      Logger.log("Jina API Key field was empty in UI, preserving existing value.");
  }

  // Handle Serper API Key (Optional)
  const trimmedSerperKey = serperApiKeyFromUi ? serperApiKeyFromUi.trim() : '';
  if (trimmedSerperKey) {
      Logger.log("Attempting to save Serper API Key...");
      try {
        setSerperApiKey(trimmedSerperKey); // Let setSerperApiKey handle validation
        Logger.log('Serper API Key processed.');
      } catch (e) {
        Logger.log(`Error saving Serper API Key: ${e.message}`);
        // Re-throw validation errors to be caught by the UI handler
        throw new Error(`Invalid Serper API Key: ${e.message}`); 
      }
  } else {
      Logger.log("Serper API Key field was empty in UI, preserving existing value.");
  }
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

/**
 * Validates a Jina API key format (basic check)
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key format seems plausible
 */
function validateJinaApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  // Jina keys seem to be shorter, alphanumeric often
  return apiKey.length > 10 && /^[a-zA-Z0-9]+$/.test(apiKey); 
}

/**
 * Gets the stored Jina API key
 * @returns {string|null} The Jina API key or null if not set
 */
function getJinaApiKey() {
  return PropertiesService.getScriptProperties().getProperty('JINA_API_KEY');
}

/**
 * Sets the Jina API key in script properties
 * @param {string} apiKey - The Jina API key to store
 * @throws {Error} If the API key is invalid (basic check)
 */
function setJinaApiKey(apiKey) {
  // Validate API key format (optional but good practice)
  if (!validateJinaApiKey(apiKey)) {
    throw new Error('Invalid Jina API key format');
  }
  PropertiesService.getScriptProperties().setProperty('JINA_API_KEY', apiKey);
}

/**
 * Validates a Serper API key format (basic check)
 * Serper keys are typically 64 hex characters.
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key format seems plausible
 */
function validateSerperApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  // Basic check for 64 hex characters
  return apiKey.length === 64 && /^[a-f0-9]+$/i.test(apiKey);
}

/**
 * Gets the stored Serper API key
 * @returns {string|null} The Serper API key or null if not set
 */
function getSerperApiKey() {
  return PropertiesService.getScriptProperties().getProperty('SERPER_API_KEY');
}

/**
 * Sets the Serper API key in script properties
 * @param {string} apiKey - The Serper API key to store
 */
function setSerperApiKey(apiKey) {
  if (!validateSerperApiKey(apiKey)) {
    throw new Error('Invalid Serper API key format');
  }
  PropertiesService.getScriptProperties().setProperty('SERPER_API_KEY', apiKey);
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
    validateApiKey,
    validateJinaApiKey,
    getJinaApiKey,
    setJinaApiKey,
    validateSerperApiKey,
    getSerperApiKey,
    setSerperApiKey
  };
} 