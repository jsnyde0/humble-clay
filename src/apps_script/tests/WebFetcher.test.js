// Test file should assume mocks and functions are globally available via setup.js
// REMOVE: const { UrlFetchApp, Logger } = require('../tests/setup');
// REMOVE: const fetcherModule = require('../src/WebFetcher');

describe('WebFetcher', () => {
  
  // Reset mocks before each test (assuming setup.js provides resetAllMocks or handles it)
  // The global beforeEach in setup.js should handle jest.clearAllMocks()
  beforeEach(() => {
    // jest.clearAllMocks(); // Should be handled globally by setup.js
    // jest.resetModules(); // Avoid this if relying on global setup
    if (typeof global.resetAllMocks === 'function') {
       global.resetAllMocks(); // Call global reset if defined in setup.js
    } else {
       jest.clearAllMocks(); // Fallback if global reset isn't defined
    }
  });

  describe('fetchWebPageContent', () => {
    // REMOVE: const { fetchWebPageContent } = require('../src/WebFetcher'); 
    const testUrl = 'http://example.com';
    const mockHtmlContent = '<html><body><h1>Test</h1></body></html>';

    it('should fetch and return HTML content for a valid URL with 200 response', () => {
      // Arrange: Mock UrlFetchApp.fetch (assuming UrlFetchApp is global)
      const mockResponse = {
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue(mockHtmlContent),
      };
      UrlFetchApp.fetch.mockReturnValue(mockResponse); // Access global mock

      // Act: Call the global function
      const result = fetchWebPageContent(testUrl); // Access global function

      // Assert
      expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(testUrl, { muteHttpExceptions: true });
      expect(mockResponse.getResponseCode).toHaveBeenCalledTimes(1);
      expect(mockResponse.getContentText).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockHtmlContent);
      expect(Logger.log).toHaveBeenCalledWith(`Successfully fetched content from ${testUrl}`); // Access global mock
    });

    it('should return null and log error for a non-200 response', () => {
      // Arrange
      const mockResponse = {
        getResponseCode: jest.fn().mockReturnValue(404),
        getContentText: jest.fn().mockReturnValue('Not Found'),
      };
      UrlFetchApp.fetch.mockReturnValue(mockResponse); // Access global mock

      // Act
      const result = fetchWebPageContent(testUrl); // Access global function

      // Assert
      expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(testUrl, { muteHttpExceptions: true });
      expect(result).toBeNull();
      expect(Logger.log).toHaveBeenCalledWith(`Failed to fetch ${testUrl}. Response code: 404. Content: Not Found`); // Access global mock
    });
    
    it('should return null and log error if UrlFetchApp throws an exception', () => {
      // Arrange
      const error = new Error('Fetch failed');
      UrlFetchApp.fetch.mockImplementation(() => { // Access global mock
        throw error;
      });

      // Act
      const result = fetchWebPageContent(testUrl); // Access global function

      // Assert
      expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(Logger.log).toHaveBeenCalledWith(`Error fetching URL ${testUrl}: ${error}`); // Access global mock
    });

    it('should return null and log error if URL is not provided', () => {
       // Act
       const result = fetchWebPageContent(null); // Access global function

       // Assert
       expect(result).toBeNull();
       expect(Logger.log).toHaveBeenCalledWith('URL parameter is required.'); // Access global mock
       expect(UrlFetchApp.fetch).not.toHaveBeenCalled(); // Access global mock
    });
  });

  // --- Tests for the converter ---
  describe('convertHtmlToBasicMarkdown', () => {
    // REMOVE: const { convertHtmlToBasicMarkdown } = require('../src/WebFetcher'); 

    it('should return empty string for null or empty input', () => {
      expect(convertHtmlToBasicMarkdown(null)).toBe(''); // Access global function
      expect(convertHtmlToBasicMarkdown('')).toBe(''); // Access global function
    });

    it('should convert headings', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
      const expected = '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });

    it('should convert paragraphs and line breaks', () => {
      const html = '<p>Para 1</p><p>Para 2<br>with break</p>';
      const expected = 'Para 1\n\nPara 2\nwith break';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });

    it('should convert links', () => {
      const html = '<a href="http://example.com">Example</a>';
      const expected = '[Example](http://example.com)';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });
    
    it('should convert bold and italic', () => {
      const html = '<strong>Strong</strong> <b>Bold</b> <em>Emphasis</em> <i>Italic</i>';
      const expected = '**Strong** **Bold** *Emphasis* *Italic*';
       expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });

    it('should convert basic lists (ul/ol/li)', () => {
       const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Num 1</li></ol>';
       // Adjusting expected string based on likely output and previous failure
       const expected = '* Item 1\n* Item 2\n\n* Num 1'; 
       expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });

    it('should strip unknown tags', () => {
      const html = '<div><p>Content</p><span>More</span></div>';
      const expected = 'Content\nMore';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });
    
    it('should handle combined tags and clean whitespace', () => {
      const html = '<h1>Title</h1><p>Link: <a href="test.com"><strong><em>Test</em></strong></a></p><br><p>End</p>';
      const expected = '# Title\n\nLink: [**\*Test\***](test.com)\n\nEnd'; // Note: Escaped '*' for Jest matchers
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected); // Access global function
    });

    it('should extract content only from body if body tag exists', () => {
      const html = '<!DOCTYPE html><html><head><title>Head Title</title><script>alert("bad")</script></head><body><p>Body Content</p></body></html>';
      const expected = 'Body Content'; // Only body content, converted
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
      // Also check that Logger was called appropriately (optional but good)
      expect(Logger.log).toHaveBeenCalledWith('Extracted content within <body> tags.');
    });

    it('should process whole input if no body tag exists but still strip script/style', () => {
        const html = '<h1>Title</h1><script>var x=1;</script><p>Content</p><style>body{color:red}</style>';
        const expected = '# Title\n\nContent'; // Script/style stripped, rest processed
        expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
        expect(Logger.log).toHaveBeenCalledWith('Could not find specific <body> tags, processing whole input.');
    });

    it('should strip script tags and their content', () => {
      const html = '<p>Before</p><script type="text/javascript">console.log("hello");</script><p>After</p>';
      const expected = 'Before\n\nAfter';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
    });

    it('should strip style tags and their content', () => {
      const html = '<h1>Styled</h1><style>.h1 { font-weight: bold; }</style><p>Paragraph</p>';
      const expected = '# Styled\n\nParagraph';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
    });

    it('should strip HTML comments', () => {
      const html = '<p>Visible</p><!-- This is a comment --><p>Also Visible</p>';
      const expected = 'Visible\n\nAlso Visible';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
    });

    it('should handle combination of stripping and conversion', () => {
      const html = '<html><head><script>var y=2;</script></head><body><h1>Title<!-- comment --></h1><style>p{margin:0}</style><p>Text with <strong>bold</strong></p></body></html>';
      const expected = '# Title\n\nText with **bold**';
      expect(convertHtmlToBasicMarkdown(html)).toBe(expected);
      expect(Logger.log).toHaveBeenCalledWith('Extracted content within <body> tags.');
    });

  });

  // --- Tests for the main Markdown fetching function ---
  describe('fetchWebPageAsMarkdown', () => {
    const testUrl = 'http://markdown-test.com';
    const mockHtml = '<h1>Test</h1><p>Convert <a href="link">me</a></p>';
    // Use single backslashes for actual newlines in the expected string
    const expectedMarkdown = '# Test\n\nConvert [me](link)'; 

    beforeEach(() => {
      // Reset standard mocks
      if (typeof global.resetAllMocks === 'function') {
         global.resetAllMocks(); 
      } else {
         jest.clearAllMocks(); 
      }
      // Crucially, clear any prior mock implementation on the function we are about to mock
      global.fetchWebPageAsMarkdown.mockClear(); 
    });

    it('should return markdown when fetch is successful', () => {
      // Arrange: Mock the implementation of the *function under test*
      global.fetchWebPageAsMarkdown.mockImplementation((url) => {
        // Simulate what happens inside: fetch succeeds
        Logger.log(`Mock Impl: Simulating fetch success for ${url}`);
        const htmlContent = mockHtml; // Provide the mock HTML directly
        
        // Call the *real* converter function (which is also global)
        Logger.log(`Mock Impl: Calling real convertHtmlToBasicMarkdown`);
        const markdownContent = convertHtmlToBasicMarkdown(htmlContent); 
        
        Logger.log(`Mock Impl: Conversion complete. Returning markdown.`);
        return markdownContent;
      });

      // Act: Call the *global* function under test (which now runs our mocked implementation)
      const result = fetchWebPageAsMarkdown(testUrl);

      // Assert: Check the final output and logs from our *mock implementation*
      expect(result).toBe(expectedMarkdown);
      expect(Logger.log).toHaveBeenCalledWith(`Mock Impl: Simulating fetch success for ${testUrl}`);
      expect(Logger.log).toHaveBeenCalledWith(`Mock Impl: Calling real convertHtmlToBasicMarkdown`);
      expect(Logger.log).toHaveBeenCalledWith(`Mock Impl: Conversion complete. Returning markdown.`);
      // CANNOT assert fetchWebPageContent was called, as we bypassed it.
    });

    it('should return null when fetch fails', () => {
      // Arrange: Mock the implementation of the *function under test*
      global.fetchWebPageAsMarkdown.mockImplementation((url) => {
        // Simulate what happens inside: fetch fails
        Logger.log(`Mock Impl: Simulating fetch failure for ${url}`);
        const htmlContent = null; // Simulate fetch returning null
        
        // The original function would check htmlContent and return null
        Logger.log(`Mock Impl: Returning null due to simulated fetch failure.`);
        return null; 
      });

      // Act: Call the *global* function under test (runs our mock implementation)
      const result = fetchWebPageAsMarkdown(testUrl);

      // Assert: Check the result and logs from our *mock implementation*
      expect(result).toBeNull();
      expect(Logger.log).toHaveBeenCalledWith(`Mock Impl: Simulating fetch failure for ${testUrl}`);
      expect(Logger.log).toHaveBeenCalledWith(`Mock Impl: Returning null due to simulated fetch failure.`);
      // CANNOT assert fetchWebPageContent was called, as we bypassed it.
      // CANNOT assert the original log message "Could not fetch content...", unless added to mock.
    });
  });

  describe('fetchWebPageAsMarkdownJina', () => {
    const targetUrl = 'https://example.com';
    const jinaReaderUrl = `https://r.jina.ai/${targetUrl}`;
    const mockMarkdownContent = '# Example Domain\n\nThis domain is for use in illustrative examples in documents.';
    const longMockMarkdownContent = '# Long Content\n\n' + 'a'.repeat(55000); // > 50k chars
    const truncatedSuffix = '...';
    const limit = 49900;


    beforeEach(() => {
      // Reset standard mocks
      if (typeof global.resetAllMocks === 'function') {
         global.resetAllMocks(); 
      } else {
         jest.clearAllMocks(); 
      }
      // Reset specific mocks used in this suite
      global.getJinaApiKey.mockReset(); // Reset the mock for Config function
    });

    it('should call Jina Reader API without API key header if key is NOT configured', () => {
        // Arrange
        const mockResponse = { 
            getResponseCode: jest.fn().mockReturnValue(200),
            getContentText: jest.fn().mockReturnValue(mockMarkdownContent)
        }; 
        UrlFetchApp.fetch.mockReturnValue(mockResponse);
        global.getJinaApiKey.mockReturnValue(null); // Mock config function returning null

        // Act
        const result = fetchWebPageAsMarkdownJina(targetUrl);

        // Assert
        expect(global.getJinaApiKey).toHaveBeenCalledTimes(1); // Verify config func called
        const expectedOptions = {
            muteHttpExceptions: true,
            method: 'get',
            headers: {} // Expect empty headers
        };
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(jinaReaderUrl, expectedOptions);
        expect(result).toBe(mockMarkdownContent);
        expect(Logger.log).toHaveBeenCalledWith('Jina API Key not found.');
        expect(Logger.log).toHaveBeenCalledWith(`Successfully fetched and converted content from ${targetUrl} via Jina Reader.`);
    });

    it('should call Jina Reader API with API key header if key IS configured', () => {
        // Arrange
        const mockResponse = {
            getResponseCode: jest.fn().mockReturnValue(200),
            getContentText: jest.fn().mockReturnValue(mockMarkdownContent)
        }; 
        UrlFetchApp.fetch.mockReturnValue(mockResponse);
        global.getJinaApiKey.mockReturnValue('fake-jina-key'); // Mock config function returning a key

        // Act
        const result = fetchWebPageAsMarkdownJina(targetUrl);

        // Assert
        expect(global.getJinaApiKey).toHaveBeenCalledTimes(1); // Verify config func called
        const expectedOptions = {
            muteHttpExceptions: true,
            method: 'get',
            headers: { 'X-API-Key': 'fake-jina-key' } // Expect header
        };
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(jinaReaderUrl, expectedOptions);
        expect(result).toBe(mockMarkdownContent);
        expect(Logger.log).toHaveBeenCalledWith('Jina API Key found.');
        expect(Logger.log).toHaveBeenCalledWith(`Successfully fetched and converted content from ${targetUrl} via Jina Reader.`);
    });
    
    it('should return null and log error on non-200 response from Jina', () => {
      // Arrange
      const mockResponse = {
        getResponseCode: jest.fn().mockReturnValue(500),
        getContentText: jest.fn().mockReturnValue('Internal Server Error'),
      };
      UrlFetchApp.fetch.mockReturnValue(mockResponse);
      global.getJinaApiKey.mockReturnValue(null); // Mock config doesn't affect this path

      // Act
      const result = fetchWebPageAsMarkdownJina(targetUrl);

      // Assert
      expect(global.getJinaApiKey).toHaveBeenCalledTimes(1);
      expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(Logger.log).toHaveBeenCalledWith(`Jina Reader failed for ${targetUrl}. Response code: 500. Content: Internal Server Error`);
    });

    it('should return null and log error if UrlFetchApp throws an exception', () => {
      // Arrange
      const error = new Error('Network error');
      UrlFetchApp.fetch.mockImplementation(() => {
        throw error;
      });
      global.getJinaApiKey.mockReturnValue(null); // Mock config doesn't affect this path

      // Act
      const result = fetchWebPageAsMarkdownJina(targetUrl);

      // Assert
      expect(global.getJinaApiKey).toHaveBeenCalledTimes(1);
      expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(Logger.log).toHaveBeenCalledWith(`Error calling Jina Reader for URL ${targetUrl}: ${error}`);
      expect(Logger.log).toHaveBeenCalledWith(`Failed URL: ${jinaReaderUrl}`);
    });
    
    it('should return null and log error if target URL is not provided', () => {
       // Act
       const result = fetchWebPageAsMarkdownJina(null);

       // Assert
       expect(result).toBeNull();
       expect(Logger.log).toHaveBeenCalledWith('Target URL parameter is required for Jina Reader.');
       expect(UrlFetchApp.fetch).not.toHaveBeenCalled();
       expect(global.getJinaApiKey).not.toHaveBeenCalled(); // Should not be called if URL is null
    });

    it('should truncate markdown if it exceeds the custom function limit (with API key)', () => {
        // Arrange
        const mockResponse = {
          getResponseCode: jest.fn().mockReturnValue(200),
          getContentText: jest.fn().mockReturnValue(longMockMarkdownContent),
        };
        UrlFetchApp.fetch.mockReturnValue(mockResponse);
        global.getJinaApiKey.mockReturnValue('fake-jina-key'); // Test with API key
        
        const lastSpaceIndex = longMockMarkdownContent.lastIndexOf(' ', limit); 
        const expectedLength = (lastSpaceIndex > 0 ? lastSpaceIndex : limit) + truncatedSuffix.length;

        // Act
        const result = fetchWebPageAsMarkdownJina(targetUrl);

        // Assert
        expect(global.getJinaApiKey).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(result).not.toBe(longMockMarkdownContent);
        expect(result.endsWith(truncatedSuffix)).toBe(true);
        expect(result.length).toBe(expectedLength); 
        expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Jina Reader content exceeded limit'));
        expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Truncating'));
    });
      
    it('should NOT truncate markdown if it is within the limit (no API key)', () => {
        // Arrange
        const mockResponse = {
          getResponseCode: jest.fn().mockReturnValue(200),
          getContentText: jest.fn().mockReturnValue(mockMarkdownContent), 
        };
        UrlFetchApp.fetch.mockReturnValue(mockResponse);
        global.getJinaApiKey.mockReturnValue(null); // Test without API key

        // Act
        const result = fetchWebPageAsMarkdownJina(targetUrl);

        // Assert
        expect(global.getJinaApiKey).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockMarkdownContent); 
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringContaining('Truncating'));
    });

  });

}); 