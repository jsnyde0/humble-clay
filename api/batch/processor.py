"""Batch processing logic for handling multiple prompts."""

import asyncio
import logging
import time
from typing import List, Optional, Tuple, Type

import logfire
from openai import AsyncOpenAI
from pydantic import BaseModel

from ..llm.processor import process_with_llm
from ..logging.setup import (
    log_batch_item_error,
    log_batch_metrics,
    log_batch_summary,
)
from ..models import (
    MultiplePromptsRequest,
    MultiplePromptsResponse,
    PromptRequest,
    PromptResponse,
)
from ..response.handlers import prepare_prompt_response
from ..schema.dynamic import create_dynamic_model_from_schema

# Configure logging
logger = logging.getLogger(__name__)

# Default batch size
DEFAULT_BATCH_SIZE = 100


async def prepare_prompt_request(
    prompt_request: PromptRequest,
) -> Tuple[str, Optional[Type[BaseModel]], bool]:
    """
    Prepare a prompt request for processing.

    Args:
        prompt_request: The prompt request to prepare

    Returns:
        Tuple containing:
        - The prompt text
        - Response model (if schema provided)
        - Boolean indicating if the request has a schema
    """
    response_model = None
    has_schema = False

    # Check if we need a structured schema
    if (
        prompt_request.response_format
        and prompt_request.response_format.get("type") == "json_schema"
    ):
        has_schema = True
        json_schema = prompt_request.response_format.get("json_schema", {})
        if json_schema and "schema" in json_schema:
            # Create a dynamic Pydantic model from provided schema
            schema_name = json_schema.get("name", "DynamicSchema")
            schema_obj = json_schema["schema"]

            # Create a model with proper enum handling
            response_model = create_dynamic_model_from_schema(schema_name, schema_obj)

    return prompt_request.prompt, response_model, has_schema


async def process_batch(
    llm_client: AsyncOpenAI,
    batch: List[PromptRequest],
    batch_number: int,
    total_batches: int,
    batch_start_time: float,
    total_prompts: int,
    completed: int,
    failed: int,
    first_result_time: Optional[float],
) -> Tuple[List[PromptResponse], int, int, Optional[float]]:
    """
    Process a batch of prompts.

    Args:
        batch: List of prompt requests to process
        batch_number: The current batch number
        total_batches: The total number of batches
        batch_start_time: The start time of the batch processing
        total_prompts: The total number of prompts across all batches
        completed: Number of prompts already completed
        failed: Number of prompts already failed
        first_result_time: Timestamp of the first result (if any)

    Returns:
        Tuple containing:
        - List of processed responses
        - Number of successfully completed prompts in this batch
        - Number of failed prompts in this batch
        - First result timestamp (if first prompt in entire process)
    """
    batch_size = len(batch)
    batch_start = time.time()

    # PHASE 1: Prepare all requests (sequential)
    prepared_requests = []
    for i, prompt_request in enumerate(batch):
        try:
            prompt, response_model, has_schema = await prepare_prompt_request(
                prompt_request
            )
            prepared_requests.append(
                (i, prompt_request, prompt, response_model, has_schema)
            )
        except Exception as e:
            # Handle preparation errors
            logger.error(f"Error preparing request: {e}")
            prepared_requests.append((i, prompt_request, None, None, False))

    # PHASE 2: Execute LLM calls (concurrent)
    llm_tasks = []
    for _, _, prompt, response_model, _ in prepared_requests:
        if prompt is None:  # Skip failed preparations
            llm_tasks.append(None)
            continue

        # Create task for LLM processing
        task = process_with_llm(llm_client, prompt, response_model=response_model)
        llm_tasks.append(task)

    # Wait for all LLM tasks to complete
    llm_responses = await asyncio.gather(
        *[task for task in llm_tasks if task is not None], return_exceptions=True
    )

    # Reconstruct the response list with correct ordering
    ordered_responses = [None] * len(prepared_requests)
    response_idx = 0
    for i, (req_idx, _, _, _, _) in enumerate(prepared_requests):
        if llm_tasks[i] is not None:
            ordered_responses[req_idx] = llm_responses[response_idx]
            response_idx += 1

    # PHASE 3: Process responses (sequential)
    batch_responses = []
    batch_completed = 0
    batch_failed = 0
    new_first_result_time = first_result_time

    for i, (req_idx, prompt_request, _, _, has_schema) in enumerate(prepared_requests):
        item_start = time.time()
        try:
            if llm_tasks[i] is None:
                # Request preparation failed
                raise ValueError("Failed to prepare request")

            response_data = ordered_responses[req_idx]

            # Check if the response is an exception
            if isinstance(response_data, Exception):
                raise response_data

            # Use the response handler to prepare the response
            response = prepare_prompt_response(
                response_data,
                extract_field_path=prompt_request.extract_field_path,
                has_schema=has_schema,
            )

            # Add the response to batch responses
            batch_responses.append(response)

            # Update completion status based on response
            if response.status == "error":
                batch_failed += 1
            else:
                batch_completed += 1

                # Record first result time if it's first completion in entire process
                if new_first_result_time is None and completed + batch_completed == 1:
                    new_first_result_time = time.time()

        except ValueError as e:
            # Handle validation errors
            item_duration = time.time() - item_start
            log_batch_item_error(
                e, prompt_request.prompt, item_duration, error_type="validation"
            )
            batch_responses.append(PromptResponse(status="error", error=str(e)))
            batch_failed += 1

        except Exception as e:
            # Handle other errors
            item_duration = time.time() - item_start
            log_batch_item_error(e, prompt_request.prompt, item_duration)
            batch_responses.append(PromptResponse(status="error", error=str(e)))
            batch_failed += 1

    # Calculate batch duration and update span with performance metrics
    batch_duration = time.time() - batch_start
    log_batch_metrics(
        batch_number,
        batch_size,
        batch_completed,
        batch_failed,
        batch_duration,
    )

    # Log performance metrics to standard logger for debugging
    avg_time_per_request = batch_duration / batch_size if batch_size > 0 else 0
    logger.info(
        f"Batch {batch_number} performance: total={batch_duration:.2f}s, "
        f"avg={avg_time_per_request:.2f}s/request, concurrent_requests={batch_size}"
    )

    return batch_responses, batch_completed, batch_failed, new_first_result_time


async def process_multiple_prompts(
    llm_client: AsyncOpenAI,
    request: MultiplePromptsRequest,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> MultiplePromptsResponse:
    """
    Process multiple prompts in batches.

    Args:
        request: The MultiplePromptsRequest containing prompts to process
        batch_size: The maximum number of prompts to process (concurrently) in a batch

    Returns:
        MultiplePromptsResponse with all processed responses
    """
    total_prompts = len(request.prompts)

    # Start batch processing span
    with logfire.span(
        "batch_processing",
        attributes={
            "total_prompts": total_prompts,
            "batch_size": batch_size,
        },
    ):
        # Initialize counters and timing
        batch_start_time = time.time()
        all_responses = []
        completed = 0
        failed = 0
        first_result_time = None

        # Process prompts in batches
        for i in range(0, total_prompts, batch_size):
            batch = request.prompts[i : i + batch_size]
            batch_number = i // batch_size + 1
            total_batches = (total_prompts + batch_size - 1) // batch_size

            # Process batch with its own span
            with logfire.span(
                f"batch_{batch_number}",
                attributes={
                    "batch_number": batch_number,
                    "total_batches": total_batches,
                    "batch_size": len(batch),
                    "offset": i,
                },
            ):
                # Process this batch
                (
                    batch_responses,
                    batch_completed,
                    batch_failed,
                    new_first_result_time,
                ) = await process_batch(
                    llm_client,
                    batch,
                    batch_number,
                    total_batches,
                    batch_start_time,
                    total_prompts,
                    completed,
                    failed,
                    first_result_time,
                )

                # Update tracking variables
                all_responses.extend(batch_responses)
                completed += batch_completed
                failed += batch_failed

                # Update first result time if this batch produced the first result
                if first_result_time is None and new_first_result_time is not None:
                    first_result_time = new_first_result_time

        # Calculate total duration and update span with summary metrics
        total_duration = time.time() - batch_start_time
        log_batch_summary(
            total_prompts,
            completed,
            failed,
            total_duration,
            first_result_time,
            batch_start_time,
        )

        return MultiplePromptsResponse(responses=all_responses)
