## Google Sheets Add-on Interface:

### 1. Sidebar Panel (like the formatting panel)
- Clean, Google Sheets-style UI
- Opens from Add-ons menu
- Stays open while working
- Collapsible sections

### 2. Panel Features:
- Input range selector
- Output range selector
- Configuration sections:
- System prompts
- Model selection
- Output structure
- Field extraction
- Status/progress indicators
- Save/load configurations

## Backend Architecture:
### 1. FastAPI Backend
- RESTful endpoints
- Authentication handling
- Request validation

### 2. Prefect Orchestration
- Queue management
- Rate limiting for LLM APIs
- Batch processing
- Error handling
- Request tracking

## Data Flow:
1. User selects ranges in sidebar
2. Configuration saved in sheet properties
3. Requests queued through API
4. Prefect manages processing
5. Results populated back to sheet
6. Status updated in sidebar