// Code.js - Main entry point for the Google Sheets Add-on

/**
 * Runs when the add-on is installed or the document is opened
 * Creates the add-on menu in the Google Sheets UI
 */
function onOpen() {
  createMenu();
}

/**
 * Shows the sidebar UI
 * This function is called from the add-on menu
 */
function showSidebar() {
  showSidebarUI();
}

/**
 * Shows the API configuration dialog
 * This function is called from the add-on menu
 */
function showConfigDialog() {
  try {
    // Get current configuration
    const apiKey = getApiKey() || '';
    const apiUrl = getApiBaseUrl() || '';

    // Show configuration dialog
    const result = showApiConfigDialog(apiKey, apiUrl);
    
    if (result && result.buttonClicked === 'OK') {
      // Update configuration if OK was clicked
      if (result.apiKey) {
        setApiKey(result.apiKey);
      }
      if (result.apiUrl) {
        setApiBaseUrl(result.apiUrl);
      }
      showMessage('API configuration updated successfully');
    }
  } catch (error) {
    console.error('Error configuring API:', error);
    showError(error.message || 'Failed to update API configuration');
  }
}

/**
 * Validates the current API configuration
 * This function is called from the add-on menu
 */
function validateApiConfig() {
  try {
    // Check API key
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    validateApiKey(apiKey);

    // Check API URL
    const apiUrl = getApiBaseUrl();
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }
    
    // Test API connection
    const testResult = makeApiRequest('test', { systemPrompt: 'test' });
    if (!testResult || !testResult.output) {
      throw new Error('API test request failed');
    }

    showMessage('API configuration is valid');
  } catch (error) {
    console.error('API validation failed:', error);
    showError(error.message || 'API configuration is invalid');
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

    // Process the values using the API
    const processedValues = processRangeWithApi(values);

    // Map input range to output range
    const outputRange = mapInputRangeToOutput(inputRange, outputColumn);
    
    // Get the output range
    const targetRange = sheet.getRange(outputRange);
    if (!targetRange) {
      throw new Error('Could not create output range');
    }

    // Set the transformed values in the output range
    targetRange.setValues(processedValues);

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

// Only export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    onOpen,
    showSidebar,
    processRange,
    showConfigDialog,
    validateApiConfig
  };
} 