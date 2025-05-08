/**
 * Fetches the HTML content of a given URL.
 *
 * @param {string} url The URL of the web page to fetch.
 * @return {string} The HTML content of the page, or null if an error occurs.
 * @customfunction
 */
function fetchWebPageContent(url) {
  if (!url) {
    Logger.log('URL parameter is required.');
    return null;
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true // Prevents script failure on HTTP errors (like 404)
    });
    
    const responseCode = response.getResponseCode();
    const content = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Successfully fetched content from ${url}`);
      return content;
    } else {
      Logger.log(`Failed to fetch ${url}. Response code: ${responseCode}. Content: ${content}`);
      return null; // Or perhaps return an error object/message
    }
  } catch (error) {
    Logger.log(`Error fetching URL ${url}: ${error}`);
    return null; // Indicate failure
  }
}

/**
 * Converts basic HTML tags to Markdown after cleaning non-essential tags.
 * WARNING: This is a very simplistic converter and will not handle
 * complex HTML structures, nested tags improperly, or many common tags.
 *
 * @param {string} html The HTML content string.
 * @return {string} The converted Markdown string.
 */
function convertHtmlToBasicMarkdown(html) {
  if (!html) {
    return '';
  }

  let cleanHtml = html;

  // 1. Attempt to isolate body content (case-insensitive)
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    cleanHtml = bodyMatch[1];
    Logger.log('Extracted content within <body> tags.');
  } else {
    Logger.log('Could not find specific <body> tags, processing whole input.');
    // If no body tag found, proceed with the whole HTML, but still strip script/style
  }

  // 2. Strip <script> blocks (including content) - crucial to do early
  cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 3. Strip <style> blocks (including content) - crucial to do early
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 4. Strip HTML comments
  cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');

  // --- Now perform the Markdown conversion on the cleaned HTML ---
  let markdown = cleanHtml;

  // Basic replacements - order can matter
  
  // Block elements (with newlines)
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1'); // List items
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n'); // Remove <ul> tags but add newline
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n'); // Remove <ol> tags but add newline
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n'); // Line breaks

  // Inline elements
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Strip remaining HTML tags AFTER specific conversions
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace/newlines
  markdown = markdown.replace(/(\n\s*){3,}/g, '\n\n'); // Replace 3+ newlines with 2
  markdown = markdown.trim(); // Remove leading/trailing whitespace

  return markdown;
}


/**
 * Fetches the content of a given URL and attempts to convert it to basic Markdown.
 *
 * @param {string} url The URL of the web page to fetch.
 * @return {string} The converted Markdown content, or null if fetching fails.
 * @customfunction
 */
function fetchWebPageAsMarkdown(url) {
  const htmlContent = fetchWebPageContent(url);
  
  if (htmlContent) {
    Logger.log(`Converting HTML from ${url} to Markdown.`);
    const markdownContent = convertHtmlToBasicMarkdown(htmlContent);
    Logger.log(`Conversion complete for ${url}.`);
    return markdownContent;
  } else {
    Logger.log(`Could not fetch content from ${url} to convert to Markdown.`);
    return null; // Fetching failed
  }
}

/**
 * Fetches the Markdown content of a given URL using the Jina Reader API.
 * See: https://jina.ai/reader/
 *
 * @param {string} targetUrl The original URL of the web page to fetch and convert.
 * @return {string} The Markdown content from Jina Reader, or null if an error occurs.
 * @customfunction
 */
function fetchWebPageAsMarkdownJina(targetUrl) {
  if (!targetUrl) {
    Logger.log('Target URL parameter is required for Jina Reader.');
    return null;
  }

  // Construct the Jina Reader API URL
  const jinaReaderUrl = `https://r.jina.ai/${targetUrl}`;
  Logger.log(`Using Jina Reader API: ${jinaReaderUrl}`);

  try {
    // Retrieve Jina API Key using Config module
    const jinaApiKey = getJinaApiKey(); // Use the function from Config.js
    Logger.log(jinaApiKey ? 'Jina API Key found.' : 'Jina API Key not found.');

    const options = {
      muteHttpExceptions: true, 
      method: 'get',
      headers: {
        // Conditionally add the API key header if it exists
        ...(jinaApiKey && { 'X-API-Key': jinaApiKey }) 
      }
    };
    
    const response = UrlFetchApp.fetch(jinaReaderUrl, options);
    const responseCode = response.getResponseCode();
    const content = response.getContentText(); // Jina Reader returns Markdown/text directly

    if (responseCode === 200) {
      Logger.log(`Successfully fetched and converted content from ${targetUrl} via Jina Reader.`);
      // The content *should* already be Markdown, but check for the character limit
      // If using as a custom function, truncation might still be needed
      const LIMIT = 49900; // Stay safely below 50k for custom functions
      if (content && content.length > LIMIT) {
         Logger.log(`Jina Reader content exceeded limit (${content.length} chars). Truncating.`);
         const lastSpace = content.lastIndexOf(' ', LIMIT);
         const truncatedContent = (lastSpace > 0) ? content.substring(0, lastSpace) + '...' : content.substring(0, LIMIT) + '...';
         return truncatedContent;
      }
      return content; 
    } else {
      Logger.log(`Jina Reader failed for ${targetUrl}. Response code: ${responseCode}. Content: ${content}`);
      return null; // Indicate failure
    }
  } catch (error) {
    Logger.log(`Error calling Jina Reader for URL ${targetUrl}: ${error}`);
    Logger.log(`Failed URL: ${jinaReaderUrl}`);
    return null; // Indicate failure
  }
}

/**
 * Fetches a website's sitemap (assumed to be at /sitemap.xml) 
 * and parses it to extract the URLs listed within <loc> tags.
 *
 * @param {string} baseUrl The base URL of the website (e.g., "https://www.example.com"). Do not include trailing slash.
 * @return {string} A single string containing the extracted URLs separated by newlines, 
 *                  or an error/info message string if fetching/parsing fails or an index is detected. Returns empty string if no URLs found.
 * @customfunction
 */
function fetchAndParseSitemapUrls(baseUrl) {
  if (!baseUrl || typeof baseUrl !== 'string') {
    Logger.log('Base URL parameter is required and must be a string.');
    return '#ERROR: Base URL required'; // Return string
  }

  // Remove trailing slash if present
  if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
  }

  const sitemapUrl = baseUrl + '/sitemap.xml';
  Logger.log(`Attempting to fetch sitemap from: ${sitemapUrl}`);
  let xmlContent;

  try {
    const response = UrlFetchApp.fetch(sitemapUrl, {
      muteHttpExceptions: true,
      validateHttpsCertificates: true, // Good practice
      followRedirects: true // Follow redirects if sitemap moved
    });

    const responseCode = response.getResponseCode();
    xmlContent = response.getContentText();

    if (responseCode !== 200) {
      Logger.log(`Failed to fetch sitemap from ${sitemapUrl}. Response code: ${responseCode}. Content: ${xmlContent}`);
      // Check robots.txt as a fallback? (Future enhancement)
      return `#ERROR: Failed to fetch sitemap (Code: ${responseCode})`; // Return string
    }
    Logger.log(`Successfully fetched sitemap content from ${sitemapUrl}. Length: ${xmlContent.length}`);

  } catch (error) {
    Logger.log(`Error fetching sitemap URL ${sitemapUrl}: ${error}`);
    return `#ERROR: Fetch error: ${error.message}`; // Return string
  }

  // --- Parse the XML ---
  const urls = [];
  try {
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    // Define the standard sitemap namespace
    const namespace = XmlService.getNamespace('http://www.sitemaps.org/schemas/sitemap/0.9');
    
    // Check if it's a sitemap index file first
    const sitemapIndexElements = root.getChildren('sitemap', namespace);
    if (sitemapIndexElements && sitemapIndexElements.length > 0) {
        Logger.log('Detected a sitemap index file. This function currently only parses URLs from standard sitemaps, not index files.');
        // Future enhancement: Recursively fetch and parse indexed sitemaps
        return '#INFO: Sitemap index detected, URLs not extracted'; // Return string
    }

    // Assuming it's a standard urlset
    const urlElements = root.getChildren('url', namespace);
    
    if (!urlElements || urlElements.length === 0) {
         Logger.log('No <url> elements found in the sitemap.');
         return ''; // Return empty string
    }

    Logger.log(`Found ${urlElements.length} <url> elements.`);

    urlElements.forEach(urlElement => {
      const locElement = urlElement.getChild('loc', namespace);
      if (locElement) {
        const urlText = locElement.getText();
        if (urlText) {
          urls.push([urlText]); // Push as a single-element array for 2D structure
        }
      }
    });
    
    Logger.log(`Extracted ${urls.length} URLs.`);
    // --- MODIFICATION: Join the array into a single string ---
    return urls.map(row => row[0]).join('\n'); 

  } catch (error) {
    Logger.log(`Error parsing XML from ${sitemapUrl}: ${error}`);
    Logger.log(`XML Content (first 500 chars): ${xmlContent.substring(0, 500)}`);
    return `#ERROR: XML Parse error: ${error.message}`; // Return string
  }
}

/**
 * Performs a Google Search using the Serper.dev API and returns the first result.
 *
 * @param {string} searchQuery The query string or URL (for 'webpage' type) to search for.
 * @param {string} [searchType='search'] The type of search: 'search', 'news', 'images', 'maps', 'scholar', 'webpage'. Defaults to 'search'.
 * @return {string} The raw JSON response string from the Serper API, or an error message.
 * @customfunction
 */
function SEARCH_SERPER(searchQuery, searchType = 'search') {
  searchType = searchType ? String(searchType).toLowerCase() : 'search'; // Normalize and default

  if (!searchQuery || typeof searchQuery !== 'string') {
    return '#ERROR: Search query/URL must be a non-empty string';
  }

  try {
    const apiKey = getSerperApiKey(); // Assumes this function exists in Config.js
    if (!apiKey) {
      return '#ERROR: Serper API key not configured';
    }

    let serperUrl;
    let payload;

    // Determine URL and Payload based on searchType
    switch (searchType) {
      case 'webpage':
        serperUrl = 'https://scrape.serper.dev/'; // Note the different base URL
        payload = JSON.stringify({ url: searchQuery });
        break;
      case 'news':
        serperUrl = 'https://google.serper.dev/news';
        payload = JSON.stringify({ q: searchQuery });
        break;
      case 'images':
        serperUrl = 'https://google.serper.dev/images';
        payload = JSON.stringify({ q: searchQuery });
        break;
      case 'maps':
        serperUrl = 'https://google.serper.dev/maps';
        payload = JSON.stringify({ q: searchQuery });
        break;
       case 'scholar':
         serperUrl = 'https://google.serper.dev/scholar';
         payload = JSON.stringify({ q: searchQuery });
         break;
      case 'search':
      default: // Default to standard web search
        serperUrl = 'https://google.serper.dev/search';
        payload = JSON.stringify({ q: searchQuery });
        searchType = 'search'; // Ensure type is set for logging
        break;
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      payload: payload,
      muteHttpExceptions: true
    };

    Logger.log(`[SEARCH_SERPER] Calling Serper API (${searchType}) for query: "${searchQuery}"`);
    const response = UrlFetchApp.fetch(serperUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) { // Accept 2xx status codes
      Logger.log(`[SEARCH_SERPER] Serper API call successful (Code: ${responseCode}). Response length: ${responseText.length}`);
      // Return the raw JSON string as requested
      return responseText; 
    } else {
      Logger.log(`[SEARCH_SERPER] Serper API error. Code: ${responseCode}. Response: ${responseText}`);
      // Try to parse error message from Serper response if possible
      let apiError = `API Error Code: ${responseCode}`;
      try {
         const errorJson = JSON.parse(responseText);
         apiError = errorJson.message || apiError;
      } catch (e) { /* Ignore parsing error, use code */ }
      return `#ERROR: ${apiError}`;
    }
  } catch (error) {
    Logger.log(`[SEARCH_SERPER] Unexpected error: ${error}`);
    console.error('Error in SEARCH_SERPER custom function:', error);
    return `#ERROR: ${error.message || 'Function execution failed'}`;
  }
}

// Export functions if using modules with clasp
// Add appropriate export syntax if needed based on your project setup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    fetchWebPageContent, 
    fetchWebPageAsMarkdown, 
    convertHtmlToBasicMarkdown,
    fetchWebPageAsMarkdownJina,
    fetchAndParseSitemapUrls,
    SEARCH_SERPER
  };
} 