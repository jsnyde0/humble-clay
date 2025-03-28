# Basic Prompt Processing Specification

## Overview
Create an endpoint that processes a single prompt through Gemini Flash 2.0 Lite via OpenRouter API and returns the response.

## Requirements

### 1. Endpoint Structure
- [x] POST /api/v1/prompt endpoint
- [x] Use OpenRouter API
- [x] Default to Gemini Flash 2.0 Lite model
- [x] Environment variable for OpenRouter API key

### 2. Input Validation
- [x] Ensure prompt is not empty (using Pydantic validation)
- [ ] Enforce 1,000 token limit for prompts (deferred - not critical for initial implementation)
- [x] Return validation errors (using FastAPI's 422 status code)

### 3. Response Structure
- [x] Success: Return AI response text
- [x] Error: Return error details using FastAPI's standard error format
- [x] Use appropriate HTTP status codes (200, 422, 500)

## API Contract

### Request Format
```json
{
    "prompt": "What is the capital of France?"
}
```

### Success Response (200 OK)
```json
{
    "response": "The capital of France is Paris."
}
```

### Error Response (422/500)
```json
{
    "detail": "Error description"
}
```

## Error Handling
1. Validation Errors (422)
   - [x] Empty prompt
   - [x] Missing prompt field

2. Service Errors (500)
   - [x] OpenRouter API unavailable
   - [x] Invalid API key
   - [x] Invalid responses from AI service

## Implementation Steps
1. [x] Create Pydantic models for request/response
2. [x] Implement basic endpoint structure
3. [x] Add input validation
4. [x] Integrate OpenRouter API
5. [x] Add error handling
6. [x] Write tests

## Testing Requirements
- [x] Test input validation
- [x] Test successful prompt processing
- [x] Test error handling
- [ ] Test rate limiting handling (deferred) 