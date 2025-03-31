/**
 * Utility functions for handling Google Sheets range operations
 */
class RangeUtils {
  /**
   * Validates if a string is a properly formatted A1 notation range
   * @param {string} range - The range to validate (e.g., 'A1:A10')
   * @throws {Error} If the range format is invalid
   */
  static validateRange(range) {
    if (!range || typeof range !== 'string') {
      throw new Error('Invalid range format');
    }

    // A1 notation range pattern: one or two letters followed by numbers, then colon, then same pattern
    const rangePattern = /^[A-Z]{1,2}\d+:[A-Z]{1,2}\d+$/;
    if (!rangePattern.test(range)) {
      throw new Error('Invalid range format');
    }

    // Split range into start and end references
    const [start, end] = range.split(':');
    
    // Ensure both parts use the same column
    const startColumn = start.match(/^[A-Z]+/)[0];
    const endColumn = end.match(/^[A-Z]+/)[0];
    
    if (startColumn !== endColumn) {
      throw new Error('Invalid range format');
    }
  }

  /**
   * Validates if a string is a valid column letter (A-Z, AA-ZZ)
   * @param {string} column - The column letter to validate
   * @throws {Error} If the column format is invalid
   */
  static validateOutputColumn(column) {
    if (!column || typeof column !== 'string') {
      throw new Error('Invalid column format');
    }

    // Column pattern: one or two uppercase letters
    const columnPattern = /^[A-Z]{1,2}$/;
    if (!columnPattern.test(column)) {
      throw new Error('Invalid column format');
    }
  }

  /**
   * Maps an input range to a new range in the specified output column
   * @param {string} inputRange - The input range in A1 notation (e.g., 'A1:A10')
   * @param {string} outputColumn - The output column letter (e.g., 'C')
   * @returns {string} The mapped range in A1 notation
   * @throws {Error} If either input is invalid
   */
  static mapInputRangeToOutput(inputRange, outputColumn) {
    // Validate both inputs
    this.validateRange(inputRange);
    this.validateOutputColumn(outputColumn);

    // Extract row numbers from input range
    const [start, end] = inputRange.split(':');
    const startRow = start.match(/\d+/)[0];
    const endRow = end.match(/\d+/)[0];

    // Create new range with output column
    return `${outputColumn}${startRow}:${outputColumn}${endRow}`;
  }
}

// Export for use in Google Apps Script
if (typeof module !== 'undefined') {
  module.exports = RangeUtils;
} 