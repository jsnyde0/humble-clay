/**
 * Tests for SimpleOutputField.js
 */

// Import the functions to test
const {
  parseSimpleSyntax,
  generateSchemaFromSyntax,
  extractFieldPathFromSyntax
} = require('../src/SimpleOutputField.js');

describe('SimpleOutputField', () => {
  describe('parseSimpleSyntax', () => {
    it('should parse a simple string field without type', () => {
      // Execute
      const result = parseSimpleSyntax('company_name');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'company_name',
        fieldType: 'str',
        enumValues: null
      });
    });

    it('should parse an integer field', () => {
      // Execute
      const result = parseSimpleSyntax('age: int');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'age',
        fieldType: 'int',
        enumValues: null
      });
    });

    it('should parse a float field', () => {
      // Execute
      const result = parseSimpleSyntax('price: float');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'price',
        fieldType: 'float',
        enumValues: null
      });
    });

    it('should parse a boolean field', () => {
      // Execute
      const result = parseSimpleSyntax('is_active: bool');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'is_active',
        fieldType: 'bool',
        enumValues: null
      });
    });

    it('should parse an enum field', () => {
      // Execute
      const result = parseSimpleSyntax('status: [active, pending, completed]');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'status',
        fieldType: 'enum',
        enumValues: ['active', 'pending', 'completed']
      });
    });

    it('should handle whitespace in the input', () => {
      // Execute
      const result = parseSimpleSyntax('  age:  int  ');
      
      // Verify
      expect(result).toEqual({
        fieldName: 'age',
        fieldType: 'int',
        enumValues: null
      });
    });

    it('should return null for invalid syntax', () => {
      // Execute and verify
      expect(parseSimpleSyntax('')).toBeNull();
      expect(parseSimpleSyntax(null)).toBeNull();
      expect(parseSimpleSyntax(undefined)).toBeNull();
      expect(parseSimpleSyntax('invalid:syntax:')).toBeNull();
    });
  });

  describe('generateSchemaFromSyntax', () => {
    it('should generate schema for a string field', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'company_name',
        fieldType: 'str',
        enumValues: null
      };
      
      // Execute
      const schema = generateSchemaFromSyntax(parsedSyntax);
      
      // Verify
      expect(schema).toEqual({
        type: 'object',
        properties: {
          company_name: {
            type: 'string'
          }
        },
        required: ['company_name']
      });
    });

    it('should generate schema for an integer field', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'age',
        fieldType: 'int',
        enumValues: null
      };
      
      // Execute
      const schema = generateSchemaFromSyntax(parsedSyntax);
      
      // Verify
      expect(schema).toEqual({
        type: 'object',
        properties: {
          age: {
            type: 'integer'
          }
        },
        required: ['age']
      });
    });

    it('should generate schema for a float field', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'price',
        fieldType: 'float',
        enumValues: null
      };
      
      // Execute
      const schema = generateSchemaFromSyntax(parsedSyntax);
      
      // Verify
      expect(schema).toEqual({
        type: 'object',
        properties: {
          price: {
            type: 'number'
          }
        },
        required: ['price']
      });
    });

    it('should generate schema for a boolean field', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'is_active',
        fieldType: 'bool',
        enumValues: null
      };
      
      // Execute
      const schema = generateSchemaFromSyntax(parsedSyntax);
      
      // Verify
      expect(schema).toEqual({
        type: 'object',
        properties: {
          is_active: {
            type: 'boolean'
          }
        },
        required: ['is_active']
      });
    });

    it('should generate schema for an enum field', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'status',
        fieldType: 'enum',
        enumValues: ['active', 'pending', 'completed']
      };
      
      // Execute
      const schema = generateSchemaFromSyntax(parsedSyntax);
      
      // Verify
      expect(schema).toEqual({
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'pending', 'completed']
          }
        },
        required: ['status']
      });
    });

    it('should return null for invalid parsed syntax', () => {
      // Execute and verify
      expect(generateSchemaFromSyntax(null)).toBeNull();
      expect(generateSchemaFromSyntax({})).toBeNull();
      expect(generateSchemaFromSyntax({ fieldName: 'test' })).toBeNull();
    });
  });

  describe('extractFieldPathFromSyntax', () => {
    it('should extract field path from parsed syntax', () => {
      // Setup
      const parsedSyntax = {
        fieldName: 'company_name',
        fieldType: 'str',
        enumValues: null
      };
      
      // Execute
      const fieldPath = extractFieldPathFromSyntax(parsedSyntax);
      
      // Verify
      expect(fieldPath).toBe('company_name');
    });

    it('should return null for invalid parsed syntax', () => {
      // Execute and verify
      expect(extractFieldPathFromSyntax(null)).toBeNull();
      expect(extractFieldPathFromSyntax({})).toBeNull();
    });
  });
}); 