# Humble Clay

A FastAPI service for processing prompts through LLM models.

## Setup

### 1. Environment Setup
Create a `.env` file in the project root:
```bash
# OpenRouter API Key for LLM access
OPENROUTER_API_KEY=your_openrouter_key

# API Key for securing endpoints (generate using command below)
HUMBLE_CLAY_API_KEY=your_api_key
```

### 2. Generate API Key
Run this Python command to generate a secure API key:
```bash
python -c "import secrets; print(f'HUMBLE_CLAY_API_KEY={secrets.token_urlsafe(32)}')"
```
Add the generated key to your `.env` file.

### 3. Install Dependencies
```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### 4. Run the Server

For local development, load environment variables from your `.env` file:
```bash
uv run uvicorn api.main:app --reload --env-file .env
```

Alternatively, export variables manually before running:
```bash
export $(cat .env | xargs)
uv run uvicorn api.main:app --reload
```

## API Usage

### Authentication
All endpoints require an API key in the `X-API-Key` header:
```bash
X-API-Key: your_api_key
```

### Single Prompt
```bash
curl -X POST "http://localhost:8000/api/v1/prompt" \
     -H "X-API-Key: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, how are you?"}'
```

### Multiple Prompts
```bash
curl -X POST "http://localhost:8000/api/v1/prompt" \
     -H "X-API-Key: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{
       "prompts": [
         {"prompt": "Hello"},
         {"prompt": "How are you?"}
       ]
     }'
```

### Google Apps Script Usage
```javascript
function callHumbleClay(prompt) {
  const HUMBLE_CLAY_API_KEY = 'your_api_key';  // Store in Script Properties
  const API_URL = 'http://your-api-url/api/v1/prompt';
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': HUMBLE_CLAY_API_KEY
    },
    payload: JSON.stringify({
      prompt: prompt
    })
  };
  
  const response = UrlFetchApp.fetch(API_URL, options);
  return JSON.parse(response.getContentText());
}
```

### Output Field Simplification

The Google Sheets add-on now supports simplified syntax for output field definition:

```
// Simple field without type (defaults to string)
field_name

// Field with explicit type
age: int
price: float
is_active: bool

// Enum field with allowed values
status: [active, pending, completed]
```

This simplified syntax automatically generates the appropriate JSON schema and field extraction path, making it easier to extract structured data without writing complex schemas manually.

## Development

### Running Tests
```bash
# Run all tests
uv run pytest -v

# Run LLM integration tests
uv run pytest -v -m llm
```