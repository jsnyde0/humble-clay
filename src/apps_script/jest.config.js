/**
 * Jest configuration for Google Apps Script
 */

module.exports = {
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // The test environment that will be used for testing
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "<rootDir>/tests/**/*.test.js"
  ],

  // Setup files to run before each test
  setupFiles: ["<rootDir>/tests/setup.js"],

  // A map from regular expressions to paths to transformers
  transform: {},

  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
}; 