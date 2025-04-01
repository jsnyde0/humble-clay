/**
 * ApiClient.js - Handles communication with the Humble Clay API
 */

/**
 * Makes a request to the Humble Clay API
 * @param {string} inputText - The text to process
 * @param {Object} options - Additional options for the API call
 * @param {string} [options.systemPrompt] - Optional system prompt
 * @param {string} [options.outputStructure] - Optional output structure
 * @param {string} [options.extractField] - Optional field to extract
 * @returns {Promise<Object>} The API response
 * @throws {Error} If the API call fails
 */
function makeApiRequest(inputText, options = {}) {
  // Get API key from script properties
  const apiKey = PropertiesService.getScriptProperties().getProperty('HUMBLE_CLAY_API_KEY');
  if (!apiKey) {
    throw new Error('API key not configured. Please set up your API key in the configuration.');
  }

  // Prepare request payload
  const payload = {
    input: inputText,
    ...options
  };

  // Prepare request options
  const requestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Handle HTTP errors ourselves
  };

  try {
    // Make the API request
    const response = UrlFetchApp.fetch('https://api.humbleclay.com/v1/process', requestOptions);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // Handle different response codes
    switch (responseCode) {
      case 200:
        return JSON.parse(responseText);
      case 401:
        throw new Error('Invalid API key. Please check your configuration.');
      case 429:
        throw new Error('Rate limit exceeded. Please try again later.');
      default:
        throw new Error(`API request failed with status ${responseCode}: ${responseText}`);
    }
  } catch (error) {
    // Pass through specific error messages
    if (error.message.includes('Invalid API key') || 
        error.message.includes('Rate limit exceeded')) {
      throw error;
    }
    throw new Error(`API request failed: ${error.message}`);
  }
}

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
 * Processes a range of cells using the Humble Clay API
 * @param {string[][]} values - The values from the input range
 * @param {Object} options - Processing options
 * @returns {Promise<string[][]>} Processed values
 */
function processRangeWithApi(values, options = {}) {
  // Process each cell value through the API
  const processedValues = values.map(row => {
    return row.map(cell => {
      if (!cell || cell.toString().trim() === '') {
        return ['']; // Keep empty cells empty
      }

      try {
        const response = makeApiRequest(cell.toString(), options);
        return [response.output || '']; // Assuming API returns { output: string }
      } catch (error) {
        // Log error but continue processing
        console.error(`Error processing cell: ${error.message}`);
        return [`Error: ${error.message}`];
      }
    });
  });

  return processedValues;
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeApiRequest,
    validateApiKey,
    processRangeWithApi
  };
} 