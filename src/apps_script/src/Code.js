// Code.js - Main entry point for the Google Sheets Range Processor Add-on

// Import dependencies
const { validateRange, validateOutputColumn, mapInputRangeToOutput } = require('./RangeUtils');
const UI = require('./UI');
const Config = require('./Config');
const ApiClient = require('./ApiClient');

/**
 * Runs when the add-on is installed or the document is opened
 * Creates the add-on menu in the Google Sheets UI
 */
function onOpen() {
  UI.createMenu();
}

/**
 * Shows the sidebar UI
 * This function is called from the add-on menu
 */
function showSidebar() {
  UI.showSidebar();
}

/**
 * Shows the API configuration dialog
 * This function is called from the add-on menu
 */
function showApiConfig() {
  try {
    // Get current configuration
    const apiKey = Config.getApiKey() || '';
    const apiUrl = ApiClient.getApiBaseUrl() || '';

    // Show configuration dialog
    const result = UI.showApiConfigDialog(apiKey, apiUrl);
    
    if (result && result.buttonClicked === 'OK') {
      // Update configuration if OK was clicked
      if (result.apiKey) {
        Config.setApiKey(result.apiKey);
      }
      if (result.apiUrl) {
        ApiClient.setApiBaseUrl(result.apiUrl);
      }
      UI.showMessage('API configuration updated successfully');
    }
  } catch (error) {
    console.error('Error configuring API:', error);
    UI.showError(error.message || 'Failed to update API configuration');
  }
}

/**
 * Validates the current API configuration
 * This function is called from the add-on menu
 */
function validateApiConfig() {
  try {
    // Check API key
    const apiKey = Config.getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    Config.validateApiKey(apiKey);

    // Check API URL
    const apiUrl = ApiClient.getApiBaseUrl();
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }
    
    // Test API connection
    const testResult = ApiClient.makeApiRequest('test', { systemPrompt: 'test' });
    if (!testResult || !testResult.output) {
      throw new Error('API test request failed');
    }

    UI.showMessage('API configuration is valid');
  } catch (error) {
    console.error('API validation failed:', error);
    UI.showError(error.message || 'API configuration is invalid');
  }
}

/**
 * Processes a range by copying values from input range to output column
 * @param {string} inputRange - The input range in A1 notation (e.g., 'A1:A10')
 * @param {string} outputColumn - The output column letter (e.g., 'C')
 * @returns {Object} Result object with success status and any error message
 */
function processRange(inputRange, outputColumn) {
  try {
    // Validate inputs
    validateRange(inputRange);
    validateOutputColumn(outputColumn);

    // Get the active sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    if (!sheet) {
      throw new Error('No active sheet found');
    }

    // Get the input range
    const range = sheet.getRange(inputRange);
    if (!range) {
      throw new Error('Could not find the specified range');
    }

    // Get values from input range
    const values = range.getValues();
    if (!values || values.length === 0) {
      throw new Error('No values found in the input range');
    }

    // --- Stage 1: Echo Transformation ---
    // In future stages, this is where the API call and processing will happen.
    // For now, we just echo the input values.
    const transformedValues = values; // Simple echo
    // -----------------------------------

    // Map input range to output range
    const outputRange = mapInputRangeToOutput(inputRange, outputColumn);
    
    // Get the output range
    const targetRange = sheet.getRange(outputRange);
    if (!targetRange) {
      throw new Error('Could not create output range');
    }

    // Set the transformed values in the output range
    targetRange.setValues(transformedValues);

    // Return success
    return {
      success: true,
      message: 'Range processed successfully'
    };

  } catch (error) {
    // Log the error for debugging
    console.error('Error processing range:', error);

    // Return error information
    return {
      success: false,
      message: error.message || 'An unknown error occurred'
    };
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    onOpen,
    showSidebar,
    processRange,
    showApiConfig,
    validateApiConfig
  };
} 