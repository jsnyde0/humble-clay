# Multiple Prompts Processing

## Implementation Stages

### Stage 1: Basic Concurrent Processing
Core functionality:
- [ ] POST /api/v1/prompts endpoint
- [ ] Accept array of prompts
- [ ] Validate array size (max 1000)
- [ ] Process concurrently using asyncio.gather
- [ ] Return array of responses in same format as single prompt

Example Request:
```json
{
    "prompts": [
        "What is the capital of France?",
        "What is the capital of Italy?"
    ]
}
```

Example Response:
```json
{
    "responses": [
        {
            "response": "The capital of France is Paris.",
            "status": "success"
        },
        {
            "response": "The capital of Italy is Rome.",
            "status": "success"
        }
    ]
}
```

### Stage 2: Batch Processing

### System Behavior
The system must process large arrays of prompts efficiently by:
- Breaking requests into smaller batches
- Processing batches concurrently while managing resources
- Maintaining original prompt order in responses
- Continuing processing when individual prompts fail

### Configuration
Batch processing must be configurable to allow optimization:
- Adjustable batch sizes
- Default size: 10 prompts per batch
- Runtime configuration without service restart

### API Contracts

#### Process Multiple Prompts
```json
POST /api/v1/prompts
Request:
{
    "prompts": [
        {"prompt": "string"},
        ...  // Up to 1000 prompts
    ]
}

Response:
{
    "responses": [
        {
            "status": "success|error",
            "response": "string",
            "error": "string"  // Only present for errors
        },
        ...  // Matches prompts array length
    ]
}
```

#### Configure Batch Size
```json
POST /api/v1/config/batch-size
Request:
{
    "size": integer  // Must be positive
}

Response:
{
    "message": "string",
    "batch_size": integer
}
```

### Error Handling
- Individual prompt failures don't affect other prompts
- Batch failures are reported while continuing with remaining batches
- Error responses maintain consistent format with single prompt endpoint

### Stage 3: Rate Limiting
Add rate limiting:
- [ ] Add BATCH_DELAY variable (default: 100ms)
- [ ] Implement delay between batches
- [ ] Add configuration endpoint for delay
- [ ] Add basic monitoring (time per batch) 