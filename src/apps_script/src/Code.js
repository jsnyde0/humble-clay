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
    
    // Test API connection with a simple test prompt
    const testResult = makeApiRequest('test');
    if (!testResult || testResult.status === 'error' || testResult.response === undefined) {
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
 * @param {Object} schema - Optional JSON schema for output validation
 * @param {string} fieldPath - Optional field path to extract from the response
 * @returns {Object} Result object with success status and any error message
 */
function processRange(inputRange, outputColumn, schema = null, fieldPath = '') {
  try {
    // Debug logging for inputs
    Logger.log(`[processRange] Called with: inputRange=${inputRange}, outputColumn=${outputColumn}`);
    Logger.log(`[processRange] Schema: ${JSON.stringify(schema)}`);
    Logger.log(`[processRange] Field path: ${fieldPath}`);
    
    // Validate inputs
    validateRange(inputRange);
    validateOutputColumn(outputColumn);

    // Validate schema (if provided)
    if (schema !== null && typeof schema !== 'object') {
      throw new Error('Schema must be a valid JSON object');
    }

    // Validate field path (only allowed if schema is provided)
    if (fieldPath && !schema) {
      throw new Error('Field path can only be used with a schema');
    }
    if (fieldPath && typeof fieldPath !== 'string') {
      throw new Error('Field path must be a string');
    }

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

    // Create options object for API processing
    const options = {};
    if (schema) {
      options.responseFormat = schema;
    }
    if (fieldPath) {
      options.extractFieldPath = fieldPath;
    }
    
    // Debug log for options
    Logger.log(`[processRange] Created options: ${JSON.stringify(options)}`);

    // Process the values using the API
    const processedValues = processRangeWithApi(values, options);

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

/**
 * Processes rows using a prompt template with column references
 * @param {string} outputColumn - The output column letter (e.g., 'C')
 * @param {string} promptTemplate - The prompt template with column references (e.g., "Analyze {A}")
 * @param {number|null} startRow - Optional start row number (1-based)
 * @param {number|null} endRow - Optional end row number (1-based)
 * @param {Object|null} schema - Optional JSON schema for output validation
 * @param {string} fieldPath - Optional field path to extract from the response
 * @returns {Object} Result object with success status and any error message
 */
function processPrompt(outputColumn, promptTemplate, startRow = null, endRow = null, schema = null, fieldPath = '') {
  const startTime = new Date().getTime(); // Record start time
  try {
    // Debug logging
    Logger.log(`[processPrompt] Called with: outputColumn=${outputColumn}, template="${promptTemplate}"`);
    Logger.log(`[processPrompt] Rows: start=${startRow}, end=${endRow}`);
    Logger.log(`[processPrompt] Schema: ${JSON.stringify(schema)}`);
    Logger.log(`[processPrompt] Field path: ${fieldPath}`);

    // Validate inputs
    validateOutputColumn(outputColumn);
    if (!promptTemplate || typeof promptTemplate !== 'string') {
      throw new Error('Prompt template is required and must be a string');
    }

    // Get the active sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    if (!sheet) {
      throw new Error('No active sheet found');
    }

    // Get the last row with data
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
      throw new Error('Sheet is empty');
    }

    // Determine row range
    const effectiveStartRow = startRow || 1;
    const effectiveEndRow = endRow || lastRow;

    // Validate row range
    if (effectiveStartRow > effectiveEndRow) {
      throw new Error('Start row cannot be greater than end row');
    }
    if (effectiveStartRow < 1) {
      throw new Error('Start row must be at least 1');
    }
    if (effectiveEndRow > lastRow) {
      throw new Error(`End row cannot exceed last data row (${lastRow})`);
    }

    // Extract column references from prompt template
    const columnRefs = extractColumnReferences(promptTemplate);
    if (columnRefs.length === 0) {
      throw new Error('No column references found in prompt template');
    }

    // Get data for all referenced columns
    const columnData = {};
    for (const col of columnRefs) {
      const range = sheet.getRange(`${col}${effectiveStartRow}:${col}${effectiveEndRow}`);
      columnData[col] = range.getValues().map(row => row[0]);
    }

    // Create options object for API processing
    const options = {};
    if (schema) {
      options.responseFormat = schema;
    }
    if (fieldPath) {
      options.extractFieldPath = fieldPath;
    }

    // Prepare all prompts for batch processing
    const numRows = columnData[columnRefs[0]].length;
    const prompts = [];
    
    // Generate all prompts first
    for (let i = 0; i < numRows; i++) {
      // Replace column references with actual values
      let prompt = promptTemplate;
      for (const col of columnRefs) {
        const value = columnData[col][i];
        prompt = prompt.replace(new RegExp(`\\{${col}\\}`, 'g'), value || '');
      }
      
      Logger.log(`[processPrompt] Prepared prompt for row ${i + effectiveStartRow}: ${prompt}`);
      prompts.push(prompt);
    }
    
    // Log the batch size
    Logger.log(`[processPrompt] Prepared batch of ${prompts.length} prompts`);
    
    // Process all prompts in a single batch call
    let results = [];
    try {
      // MODIFIED: Process all prompts in a single call to the API
      // No more batching loop - send all prompts at once
      Logger.log(`[processPrompt] Processing all ${prompts.length} prompts in a single API call`);
      
      // Call processBatch with all prompts
      const batchResults = processBatch(prompts, options);
      
      // Format results for output
      results = batchResults.map(result => [result]);
      
    } catch (error) {
      Logger.log(`[processPrompt] Batch processing error: ${error.message}`);
      // If batch processing fails, create error messages for all rows
      results = prompts.map(() => [`Error: ${error.message}`]);
    }

    // Write results to output column
    const outputRange = sheet.getRange(
      effectiveStartRow,
      columnToIndex(outputColumn),
      results.length,
      1
    );
    outputRange.setValues(results);

    const endTime = new Date().getTime(); // Record end time
    const durationMs = endTime - startTime;
    const durationSec = (durationMs / 1000).toFixed(1); // Calculate duration in seconds

    return {
      success: true,
      message: `Processed ${results.length} rows successfully in ${durationSec}s`
    };

  } catch (error) {
    console.error('Error processing prompt:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred'
    };
  }
}

/**
 * Extracts unique column references from a prompt template
 * @param {string} template - The prompt template
 * @returns {string[]} Array of column letters
 */
function extractColumnReferences(template) {
  const matches = template.match(/\{[A-Z]+\}/g) || [];
  return [...new Set(matches.map(match => match.slice(1, -1)))];
}

/**
 * Converts a column letter to a 1-based index
 * @param {string} column - The column letter (e.g., 'A', 'B', 'AA')
 * @returns {number} The 1-based column index
 */
function columnToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result *= 26;
    result += column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return result;
}

// Update exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    onOpen,
    showSidebar,
    processRange,
    processPrompt,
    showConfigDialog,
    validateApiConfig
  };
} 