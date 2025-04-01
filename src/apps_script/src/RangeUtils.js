// RangeUtils.js - Utility functions for range manipulation

/**
 * Validates a range string in A1 notation
 * @param {string} range - The range to validate (e.g., 'A1:A10')
 * @throws {Error} If the range format is invalid
 */
function validateRange(range) {
  if (!range || typeof range !== 'string') {
    throw new Error('Range must be a string');
  }

  const rangePattern = /^[A-Z]{1,2}\d+:[A-Z]{1,2}\d+$/;
  if (!rangePattern.test(range)) {
    throw new Error('Invalid range format');
  }
}

/**
 * Validates an output column letter
 * @param {string} column - The column letter to validate (e.g., 'C')
 * @throws {Error} If the column format is invalid
 */
function validateOutputColumn(column) {
  if (!column || typeof column !== 'string') {
    throw new Error('Column must be a string');
  }

  const columnPattern = /^[A-Z]{1,2}$/;
  if (!columnPattern.test(column)) {
    throw new Error('Invalid column format');
  }
}

/**
 * Maps an input range to an output range using the specified column
 * @param {string} inputRange - The input range in A1 notation (e.g., 'A1:A10')
 * @param {string} outputColumn - The output column letter (e.g., 'C')
 * @returns {string} The output range in A1 notation
 */
function mapInputRangeToOutput(inputRange, outputColumn) {
  // Validate inputs
  validateRange(inputRange);
  validateOutputColumn(outputColumn);

  // Extract row numbers from input range
  const [start, end] = inputRange.split(':');
  const startRow = start.match(/\d+/)[0];
  const endRow = end.match(/\d+/)[0];

  // Create output range
  return `${outputColumn}${startRow}:${outputColumn}${endRow}`;
}

// Only export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateRange,
    validateOutputColumn,
    mapInputRangeToOutput
  };
} 