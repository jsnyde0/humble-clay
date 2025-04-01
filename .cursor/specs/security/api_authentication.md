# API Authentication Specification

## Overview
Implement minimal, secure API authentication using HTTPS and API key verification via request headers.

## Requirements

### 1. API Key Management
- [ ] Generate secure random API key (32+ bytes)
- [ ] Store API key in environment variable (HUMBLE_CLAY_API_KEY)
- [ ] Provide script/command to generate new secure key
- [ ] Document key generation and setup process

### 2. Request Authentication
- [ ] Accept API key in X-API-Key header
- [ ] Require API key for all endpoints
- [ ] Require HTTPS for all requests
- [ ] Validate key before processing request

### 3. Error Handling
- [ ] Return 403 for missing/invalid key
- [ ] Use consistent error format
```json
{
    "detail": "error message"
}
```
- [ ] Clear error messages without exposing sensitive data
- [ ] Log authentication failures (without logging keys)

### 4. Documentation
- [ ] Document API key requirement in OpenAPI spec
- [ ] Provide setup instructions for environment variables
- [ ] Include example requests (curl, Apps Script)
- [ ] Add security warnings about HTTPS requirement

## API Contract

### Request Format 