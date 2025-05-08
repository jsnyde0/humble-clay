/**
 * Tests for RangeUtils.js
 */

// Import the module to test
const RangeUtils = require('../src/RangeUtils');

describe('RangeUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetAllMocks();
  });

  describe('validateRange', () => {
    it('accepts valid A1 notation ranges', () => {
      const validRanges = [
        'A1:A10',
        'B5:B15',
        'AA1:AA100',
        'A7:A17'
      ];

      validRanges.forEach(range => {
        expect(() => RangeUtils.validateRange(range)).not.toThrow();
      });
    });

    it('rejects invalid A1 notation ranges', () => {
      const invalidRanges = [
        'invalid',            // Not A1 notation
        'A1A:B2',            // Invalid format
        '1A:2B',             // Wrong order
        'A:B',               // Missing row numbers
        'A1:B',              // Incomplete range
      ];

      invalidRanges.forEach(range => {
        expect(() => RangeUtils.validateRange(range)).toThrow('Invalid range format');
      });
    });

    it('rejects non-string inputs', () => {
      const nonStringInputs = [
        '',                    // Empty string
        null,                 // null
        undefined,            // undefined
        123,                  // number
        {}                    // object
      ];

      nonStringInputs.forEach(input => {
        expect(() => RangeUtils.validateRange(input)).toThrow('Range must be a string');
      });
    });
  });

  describe('validateOutputColumn', () => {
    it('accepts valid column letters', () => {
      const validColumns = ['A', 'B', 'Z', 'AA', 'ZZ'];

      validColumns.forEach(column => {
        expect(() => RangeUtils.validateOutputColumn(column)).not.toThrow();
      });
    });

    it('rejects invalid column specifications', () => {
      const invalidColumns = [
        'A1',         // Contains row
        'AAA',        // Too long
        'invalid'     // Not a column letter
      ];

      invalidColumns.forEach(column => {
        expect(() => RangeUtils.validateOutputColumn(column)).toThrow('Invalid column format');
      });
    });

    it('rejects non-string inputs', () => {
      const nonStringInputs = [
        '',           // Empty string
        null,         // null
        undefined,    // undefined
        123,          // number
        {}            // object
      ];

      nonStringInputs.forEach(input => {
        expect(() => RangeUtils.validateOutputColumn(input)).toThrow('Column must be a string');
      });
    });
  });

  describe('mapInputRangeToOutput', () => {
    it('correctly maps input range to output column', () => {
      const testCases = [
        {
          input: 'A7:A17',
          outputColumn: 'C',
          expected: 'C7:C17'
        },
        {
          input: 'B1:B10',
          outputColumn: 'D',
          expected: 'D1:D10'
        },
        {
          input: 'AA5:AA15',
          outputColumn: 'BB',
          expected: 'BB5:BB15'
        }
      ];

      testCases.forEach(({ input, outputColumn, expected }) => {
        expect(RangeUtils.mapInputRangeToOutput(input, outputColumn)).toBe(expected);
      });
    });

    it('preserves row numbers when mapping', () => {
      const result = RangeUtils.mapInputRangeToOutput('A7:A17', 'C');
      expect(result).toBe('C7:C17');
      
      // Extract row numbers and verify they match
      const [start, end] = result.split(':').map(ref => 
        parseInt(ref.match(/\d+/)[0], 10)
      );
      expect(start).toBe(7);
      expect(end).toBe(17);
    });

    it('throws error for invalid input', () => {
      expect(() => 
        RangeUtils.mapInputRangeToOutput('invalid', 'C')
      ).toThrow('Invalid range format');

      expect(() => 
        RangeUtils.mapInputRangeToOutput('A1:A10', 'invalid')
      ).toThrow('Invalid column format');
    });
  });
}); 