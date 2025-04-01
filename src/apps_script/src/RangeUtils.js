// RangeUtils.js - Utility functions for range manipulation

/**
 * Validates an input range in A1 notation
 * @param {string} range - The range to validate (e.g., 'A1:A10')
 * @throws {Error} If the range is invalid
 */
function validateRange(range) {
  if (!range || typeof range !== 'string') {
    throw new Error('Invalid range format');
  }
  
  // Basic A1 notation validation
  const rangeRegex = /^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/;
  if (!rangeRegex.test(range)) {
    throw new Error('Invalid range format');
  }
}

/**
 * Validates an output column letter
 * @param {string} column - The column letter to validate (e.g., 'C')
 * @throws {Error} If the column is invalid
 */
function validateOutputColumn(column) {
  if (!column || typeof column !== 'string') {
    throw new Error('Invalid column format');
  }
  
  // Column letter validation - only allow 1-2 uppercase letters
  const columnRegex = /^[A-Z]{1,2}$/;
  if (!columnRegex.test(column)) {
    throw new Error('Invalid column format');
  }
}

/**
 * Maps an input range to an output range using the specified output column
 * @param {string} inputRange - The input range in A1 notation (e.g., 'A1:A10')
 * @param {string} outputColumn - The output column letter (e.g., 'C')
 * @returns {string} The output range in A1 notation
 * @throws {Error} If the input range or output column is invalid
 */
function mapInputRangeToOutput(inputRange, outputColumn) {
  // Validate inputs
  validateRange(inputRange);
  validateOutputColumn(outputColumn);
  
  // Extract row numbers from input range
  const [start, end] = inputRange.split(':');
  const startRow = start.match(/\d+/)[0];
  const endRow = end.match(/\d+/)[0];
  
  // Create output range using same rows but new column
  return `${outputColumn}${startRow}:${outputColumn}${endRow}`;
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateRange,
    validateOutputColumn,
    mapInputRangeToOutput
  };
} 