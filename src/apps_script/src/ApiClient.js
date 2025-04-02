/**
 * ApiClient.js - Handles communication with the Humble Clay API
 */

/**
 * Default configuration for API requests
 */
const API_CONFIG = {
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxBatchSize: 10, // Maximum items to process in parallel
  endpoints: {
    single: '/api/v1/prompt',
    batch: '/api/v1/prompts'
  }
};

/**
 * Gets the API base URL from script properties
 * @returns {string} The API base URL
 * @throws {Error} If the API URL is not configured
 */
function getApiBaseUrl() {
  const baseUrl = PropertiesService.getScriptProperties().getProperty('HUMBLE_CLAY_API_URL');
  if (!baseUrl) {
    throw new Error('API URL not configured. Please set up your API URL in the configuration.');
  }
  return baseUrl;
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
 * Gets API key from script properties
 * @returns {string|null} The API key or null if not set
 */
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('HUMBLE_CLAY_API_KEY');
}

/**
 * Sets API key in script properties
 * @param {string} apiKey - The API key to store
 */
function setApiKey(apiKey) {
  if (!validateApiKey(apiKey)) {
    throw new Error('Invalid API key format');
  }
  PropertiesService.getScriptProperties().setProperty('HUMBLE_CLAY_API_KEY', apiKey);
}

/**
 * Loads API configuration from script properties
 * @returns {Object} API configuration object
 */
function loadApiConfig() {
  return {
    apiKey: getApiKey(),
    apiUrl: getApiBaseUrl()
  };
}

/**
 * Formats and validates the request payload
 * @param {string} inputText - The text to process
 * @param {Object} options - Additional options for the API call
 * @returns {Object} Formatted payload
 * @throws {Error} If payload validation fails
 */
function formatRequestPayload(inputText, options = {}) {
  if (!inputText || typeof inputText !== 'string') {
    throw new Error('Input text is required and must be a string');
  }

  const payload = {
    input: inputText.trim(),
    ...options
  };

  // Validate optional fields
  if (options.systemPrompt && typeof options.systemPrompt !== 'string') {
    throw new Error('System prompt must be a string');
  }
  if (options.outputStructure && typeof options.outputStructure !== 'string') {
    throw new Error('Output structure must be a string');
  }
  if (options.extractField && typeof options.extractField !== 'string') {
    throw new Error('Extract field must be a string');
  }

  return payload;
}

/**
 * Handles API response parsing and validation
 * @param {HTTPResponse} response - The response from UrlFetchApp
 * @returns {Object} Parsed response data
 * @throws {Error} If response is invalid
 */
function handleApiResponse(response) {
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  // Handle different response codes
  switch (responseCode) {
    case 200:
      try {
        const data = JSON.parse(responseText);
        
        // Handle BATCH response format: { responses: [...] }
        if (data && Array.isArray(data.responses)) {
          return data; // Return the full object with the responses array
        }
        
        // Handle SINGLE response format: { response: "..." }
        if (data && typeof data.response === 'string') {
          // Transform to a consistent structure for internal use if needed, 
          // although makeApiRequest might not use this structure directly anymore.
          // Let's return the raw single response object for now.
          return data; 
        }
        
        // If neither format matches, it's invalid
        Logger.log(`[handleApiResponse] Error: Unexpected 200 OK format: ${responseText}`);
        throw new Error('Invalid response format received from API');
      } catch (e) {
        Logger.log(`[handleApiResponse] Error parsing JSON: ${e.message}. Response Text: ${responseText}`);
        throw new Error(`Failed to parse API response: ${e.message}`);
      }
    case 400:
      throw new Error(`Bad request: ${responseText}`);
    case 401:
      throw new Error('Invalid API key. Please check your configuration.');
    case 429:
      throw new Error('Rate limit exceeded. Please try again later.');
    case 500:
      throw new Error('Internal server error. Please try again later.');
    default:
      throw new Error(`API request failed with status ${responseCode}: ${responseText}`);
  }
}

/**
 * Implements exponential backoff for retrying failed requests
 * @param {function} operation - The operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>} The operation result
 */
function retryWithBackoff(operation, options = {}) {
  const maxRetries = options.maxRetries || API_CONFIG.maxRetries;
  const initialDelay = options.initialRetryDelay || API_CONFIG.initialRetryDelay;
  
  let attempt = 1;
  
  const execute = () => {
    try {
      return operation();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);
      Utilities.sleep(delay);
      
      attempt++;
      return execute();
    }
  };
  
  return execute();
}

/**
 * Determines if an error should trigger a retry
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function shouldRetry(error) {
  const retryableErrors = [
    'Rate limit exceeded',
    'Internal server error',
    'network error',
    'timeout'
  ];
  
  return retryableErrors.some(msg => error.message.toLowerCase().includes(msg.toLowerCase()));
}

/**
 * Makes a request to the Humble Clay API
 * @param {string} inputText - The text to process
 * @param {Object} options - Additional options for the API call
 * @returns {Object} The API response
 * @throws {Error} If the API call fails
 */
function makeApiRequest(inputText, options = {}) {
  // Get API key and base URL from script properties
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set up your API key in the configuration.');
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, ''); // Remove trailing slash if present

  // Format request payload to match FastAPI PromptRequest model
  const payload = {
    prompt: inputText.trim() // Match FastAPI PromptRequest model
  };

  // Prepare request options
  const requestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-API-Key': apiKey, // Use X-API-Key header
      'Accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  return retryWithBackoff(() => {
    const response = UrlFetchApp.fetch(`${baseUrl}${API_CONFIG.endpoints.single}`, requestOptions);
    return handleApiResponse(response);
  }, options);
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
  const apiKeyPattern = /^hc_[a-zA-Z0-9]{32}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * Processes a batch of values in parallel
 * @param {string[]} batch - Array of values to process
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Processed values
 */
function processBatch(batch, options = {}) {
  if (!Array.isArray(batch) || batch.length === 0) {
    throw new Error('Batch cannot be empty');
  }

  if (batch.length > API_CONFIG.maxBatchSize) {
    throw new Error(`Batch size cannot exceed ${API_CONFIG.maxBatchSize} items`);
  }

  // Get API key and base URL from script properties
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set up your API key in the configuration.');
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, ''); // Remove trailing slash if present

  // Format batch request to match FastAPI MultiplePromptsRequest model
  const payload = {
    prompts: batch.map(value => ({
      prompt: value.toString().trim()
    }))
  };

  // Prepare request options
  const requestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-API-Key': apiKey, // Use X-API-Key header
      'Accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  return retryWithBackoff(() => {
    const fullUrl = `${baseUrl}${API_CONFIG.endpoints.batch}`;
    Logger.log(`[processBatch] Fetching URL: ${fullUrl}`);
    Logger.log(`[processBatch] Request Options: ${JSON.stringify(requestOptions, null, 2)}`);
    
    const response = UrlFetchApp.fetch(fullUrl, requestOptions);
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log(`[processBatch] Response Code: ${responseCode}`);
    Logger.log(`[processBatch] Response Text: ${responseText}`);

    // Original handleApiResponse logic expects the raw response object
    const result = handleApiResponse(response); 
    
    // Extract responses from the result
    if (!result.responses) {
      Logger.log('[processBatch] Error: Invalid batch response format received.');
      throw new Error('Invalid batch response format');
    }
    
    // Map responses to either successful results or error messages
    return result.responses.map(r => {
      if (r.status === 'success' && r.response) return r.response;
      return `Error: ${r.error || 'Unknown error'}`;
    });
  }, options);
}

/**
 * Processes a range of values using the API
 * @param {Array<Array<string>>} values - 2D array of values from the range
 * @param {Object} options - Processing options
 * @returns {Array<Array<string>>} Processed values
 */
function processRangeWithApi(values, options = {}) {
  // Validate input is a 2D array
  if (!Array.isArray(values)) {
    throw new Error('Values array cannot be empty');
  }
  
  // Ensure all rows are arrays
  if (!values.every(row => Array.isArray(row))) {
    throw new Error('Values array cannot be empty');
  }
  
  // Check for empty array
  if (values.length === 0 || values.every(row => row.length === 0)) {
    throw new Error('Values array cannot be empty');
  }

  // Flatten 2D array and filter out empty cells
  const flatValues = values.flat().filter(value => value && value.toString().trim());
  
  if (flatValues.length === 0) {
    return values; // Return original array if no non-empty values
  }

  // Process in batches
  const results = [];
  for (let i = 0; i < flatValues.length; i += API_CONFIG.maxBatchSize) {
    const batch = flatValues.slice(i, i + API_CONFIG.maxBatchSize);
    try {
      const batchResults = processBatch(batch, options);
      results.push(...batchResults);
    } catch (error) {
      // On error, add error messages for each value in the batch
      results.push(...batch.map(() => `Error: ${error.message}`));
    }
  }

  // Map results back to original 2D structure
  let resultIndex = 0;
  return values.map(row => 
    row.map(cell => {
      if (!cell || !cell.toString().trim()) return cell;
      return results[resultIndex++] || 'Error: Processing failed';
    })
  );
}

// Only export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_CONFIG,
    getApiBaseUrl,
    setApiBaseUrl,
    getApiKey,
    setApiKey,
    loadApiConfig,
    formatRequestPayload,
    handleApiResponse,
    retryWithBackoff,
    shouldRetry,
    makeApiRequest,
    validateApiKey,
    processBatch,
    processRangeWithApi
  };
} 