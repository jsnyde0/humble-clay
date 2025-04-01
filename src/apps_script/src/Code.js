// Code.js - Main entry point for the Google Sheets Range Processor Add-on

/**
 * Runs when the add-on is installed or the document is opened
 * Creates the add-on menu in the Google Sheets UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Range Processor')
    .addItem('Open Sidebar', 'showSidebar')
    .addToUi();
}

/**
 * Shows the sidebar UI
 * This function is called from the add-on menu
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Range Processor')
    .setWidth(300);
  
  SpreadsheetApp.getUi().showSidebar(html);
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