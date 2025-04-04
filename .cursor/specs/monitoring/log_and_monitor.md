# Logging and Monitoring MVP Specification

## Overview
This specification outlines the implementation of a minimal viable product (MVP) for logging and monitoring in the Humble Clay API, with a specific focus on tracking batch processing in the `/api/v1/prompts` endpoint. We'll leverage Logfire's built-in FastAPI integration to minimize custom code while providing robust visibility.

## Requirements

### Core Logging Requirements
- [ ] Set up Logfire integration for automatic request/response logging
- [ ] Add detailed progress tracking for batch processing in the `/prompts` endpoint
- [ ] Log timing information for different stages of batch processing
- [ ] Track first-result and last-result timing for batch operations
- [ ] Create visibility into long-running batch operations

### Monitoring Requirements
- [ ] Configure Logfire dashboards to monitor request durations
- [ ] Set up visibility into batch processing progress
- [ ] Monitor error rates and failure points
- [ ] Track overall system health via basic metrics

## Implementation Details

### 1. Logfire Setup and Integration
1. **Install and Configure Logfire**
   - Install Logfire with FastAPI support
   - Configure with appropriate environment and API key
   - Set up basic Logfire configuration

2. **FastAPI Integration**
   - Leverage Logfire's built-in FastAPI instrumentation
   - Configure to capture appropriate level of request/response detail
   - Exclude sensitive data if needed

### 2. Batch Processing Progress Tracking
1. **Progress Tracking Model**
   - Track total items, completed items, and progress percentage
   - Monitor failures and error rates
   - Measure overall batch duration and time per item

2. **Timing Metrics**
   - Track time-to-first-result for batch processing
   - Track time-to-completion for the entire batch
   - Calculate processing time per item

3. **Logging Progress Points**
   - Log at batch start/end
   - Log progress after each sub-batch completion
   - Track individual item processing when relevant

### 3. Dashboard and Alerting Setup
1. **Logfire Dashboard Configuration**
   - Set up views for overall request metrics
   - Configure batch processing progress visualization
   - Create error rate monitoring dashboards

## Technical Approach

### FastAPI-Logfire Integration
- Use Logfire's built-in FastAPI instrumentation
- Configure service name, environment, and version
- Apply instrumentation to the FastAPI application instance

### Batch Progress Tracking
- Use Logfire spans to track the entire batch process and each sub-batch
- Implement metrics for batch progress percentage, completion rate, and timing
- Record first item completion time as a key performance indicator
- Log sub-batch completion to show incremental progress

## Implementation Steps

1. **Set Up Logfire Integration**
   - Install Logfire package with FastAPI support
   - Configure Logfire in the application

2. **Enhance Batch Endpoint**
   - Add progress tracking to the `/prompts` endpoint
   - Implement detailed logging of batch progress
   - Add timing metrics for first and last results
   - Track timing information for sub-batches

3. **Configure Dashboards**
   - Set up Logfire dashboards for request monitoring
   - Configure batch processing progress visualization
   - Create error rate monitoring dashboards

4. **Test and Validate**
   - Test with various batch sizes
   - Validate dashboard functionality
   - Ensure all progress is properly tracked

## Acceptance Criteria
- [ ] Logfire successfully captures all API requests
- [ ] Batch processing progress is visible in logs
- [ ] First result timing and total processing time are logged
- [ ] Logfire dashboards show request metrics and batch progress
- [ ] Long-running batch operations can be monitored in real-time
- [ ] Error handling and failure tracking is properly implemented 