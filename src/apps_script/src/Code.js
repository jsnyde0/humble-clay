// Import dependencies
const UI = require('./UI');
const RangeUtils = require('./RangeUtils');

/**
 * Main entry point for the Google Sheets Range Processor Add-on
 */

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
 * Processes a range by copying values from input range to output column
 * @param {string} inputRange - The input range in A1 notation (e.g., 'A1:A10')
 * @param {string} outputColumn - The output column letter (e.g., 'C')
 * @returns {Object} Result object with success status and any error message
 */
function processRange(inputRange, outputColumn) {
  try {
    // Validate inputs
    RangeUtils.validateRange(inputRange);
    RangeUtils.validateOutputColumn(outputColumn);

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

    // Map input range to output range
    const outputRange = RangeUtils.mapInputRangeToOutput(inputRange, outputColumn);
    
    // Get the output range
    const targetRange = sheet.getRange(outputRange);
    if (!targetRange) {
      throw new Error('Could not create output range');
    }

    // For Stage 1, we'll implement a simple echo transformation
    // Just copy the values as-is to the target range
    targetRange.setValues(values);

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

// Make functions available to the UI
if (typeof module !== 'undefined') {
  module.exports = {
    onOpen,
    showSidebar,
    processRange
  };
} 