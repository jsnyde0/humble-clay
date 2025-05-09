/**
 * SimpleOutputField.js - Provides functions for parsing simplified field syntax
 * and converting it to JSON schema
 * This module works in both Google Apps Script and Node.js testing environments
 */

/**
 * Parses a simple syntax string into a structured object
 * @param {string} syntax - The simple syntax string (e.g., "age: int", "status: [active, pending]")
 * @returns {Object|null} Parsed syntax object or null if invalid
 */
function parseSimpleSyntax(syntax) {
  // Handle invalid input
  if (!syntax || typeof syntax !== 'string') {
    return null;
  }

  // Trim whitespace
  syntax = syntax.trim();
  
  if (syntax === '') {
    return null;
  }
  
  // Check for enum syntax with square brackets
  const enumRegex = /^([a-zA-Z0-9_]+)\s*:\s*\[(.*?)\]$/;
  const enumMatch = syntax.match(enumRegex);
  
  if (enumMatch) {
    // This is an enum field
    const fieldName = enumMatch[1].trim();
    const enumString = enumMatch[2].trim();
    const enumValues = enumString.split(',').map(value => value.trim()).filter(val => val !== '');
    
    if (enumValues.length === 0) {
      return null;
    }
    
    return {
      fieldName: fieldName,
      fieldType: 'enum',
      enumValues: enumValues
    };
  }
  
  // Check for field with explicit type
  const typedRegex = /^([a-zA-Z0-9_]+)\s*:\s*(str|int|float|bool)$/;
  const typedMatch = syntax.match(typedRegex);
  
  if (typedMatch) {
    // This is a field with explicit type
    return {
      fieldName: typedMatch[1].trim(),
      fieldType: typedMatch[2].trim(),
      enumValues: null
    };
  }
  
  // Check for field name only (implicit string type)
  const nameOnlyRegex = /^([a-zA-Z0-9_]+)$/;
  const nameOnlyMatch = syntax.match(nameOnlyRegex);
  
  if (nameOnlyMatch) {
    // This is a field with implicit string type
    return {
      fieldName: nameOnlyMatch[1],
      fieldType: 'str',
      enumValues: null
    };
  }
  
  // If we reach here, the syntax is invalid
  return null;
}

/**
 * Generates a JSON schema from the parsed syntax
 * @param {Object} parsedSyntax - The parsed syntax object from parseSimpleSyntax
 * @returns {Object|null} JSON schema object or null if invalid
 */
function generateSchemaFromSyntax(parsedSyntax) {
  // Handle invalid input
  if (!parsedSyntax || !parsedSyntax.fieldName || !parsedSyntax.fieldType) {
    return null;
  }

  // Create the base schema
  const schema = {
    type: 'object',
    properties: {},
    required: [parsedSyntax.fieldName]
  };

  // Handle different field types
  switch (parsedSyntax.fieldType) {
    case 'str':
      schema.properties[parsedSyntax.fieldName] = {
        type: 'string'
      };
      break;
    case 'int':
      schema.properties[parsedSyntax.fieldName] = {
        type: 'integer'
      };
      break;
    case 'float':
      schema.properties[parsedSyntax.fieldName] = {
        type: 'number'
      };
      break;
    case 'bool':
      schema.properties[parsedSyntax.fieldName] = {
        type: 'boolean'
      };
      break;
    case 'enum':
      if (Array.isArray(parsedSyntax.enumValues) && parsedSyntax.enumValues.length > 0) {
        // Enhanced enum handling with description to guide the LLM
        schema.properties[parsedSyntax.fieldName] = {
          type: 'string',
          enum: parsedSyntax.enumValues,
          description: `Must be one of the following values: ${parsedSyntax.enumValues.join(', ')}. Extract just the single value that best matches from the text.`
        };
        
        // Add a oneOf constraint to make the enum restriction more explicit
        schema.properties[parsedSyntax.fieldName].oneOf = parsedSyntax.enumValues.map(value => ({
          const: value,
          title: value
        }));
      } else {
        return null; // Invalid enum values
      }
      break;
    default:
      return null; // Unknown field type
  }

  return schema;
}

/**
 * Extracts the field path from the parsed syntax
 * @param {Object} parsedSyntax - The parsed syntax object from parseSimpleSyntax
 * @returns {string|null} Field path string or null if invalid
 */
function extractFieldPathFromSyntax(parsedSyntax) {
  if (!parsedSyntax || !parsedSyntax.fieldName) {
    return null;
  }
  
  return parsedSyntax.fieldName;
}

// Make functions available in the global scope for Google Apps Script
// This is necessary because Apps Script doesn't support module imports

// Conditional export for testing with Node.js
// Only export if we're in a Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSimpleSyntax,
    generateSchemaFromSyntax,
    extractFieldPathFromSyntax
  };
} 