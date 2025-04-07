"""Batch processing logic for handling multiple prompts."""

import logging
import time
from typing import List, Optional, Tuple

import logfire

from ..llm import process_with_llm
from ..logging.setup import (
    log_batch_completion,
    log_batch_item_error,
    log_batch_process_completion,
    log_batch_progress,
    log_batch_start,
    log_first_result,
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


async def process_prompt_batch(
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

    # Log batch progress
    log_batch_progress(
        batch_number, total_batches, batch_size, completed, total_prompts
    )

    # Process each prompt in the batch
    batch_responses = []
    batch_completed = 0
    batch_failed = 0

    # Process each prompt in the batch
    for prompt_request in batch:
        item_start = time.time()
        try:
            # Determine if we need a structured schema
            response_model = None
            has_schema = False

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
                    response_model = create_dynamic_model_from_schema(
                        schema_name, schema_obj
                    )

            # Process the prompt with or without a schema
            with logfire.span("llm_processing"):
                response_data = await process_with_llm(
                    prompt_request.prompt,
                    response_model=response_model if response_model else None,
                )

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

                # Record first result time if it's the first completion in entire process
                if first_result_time is None and completed + batch_completed == 1:
                    first_result_time = time.time()
                    log_first_result(first_result_time, batch_start_time)

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

    # Calculate batch duration and log completion
    batch_duration = time.time() - batch_start
    log_batch_completion(
        batch_number,
        total_batches,
        batch_completed,
        batch_failed,
        completed + batch_completed,
        failed + batch_failed,
        total_prompts,
        batch_duration,
        batch_size,
    )

    return batch_responses, batch_completed, batch_failed, first_result_time


async def process_multiple_prompts(
    request: MultiplePromptsRequest, batch_size: int = DEFAULT_BATCH_SIZE
) -> MultiplePromptsResponse:
    """
    Process multiple prompts in batches.

    Args:
        request: The MultiplePromptsRequest containing prompts to process
        batch_size: The maximum number of prompts to process in a batch

    Returns:
        MultiplePromptsResponse with all processed responses
    """
    total_prompts = len(request.prompts)

    # Start batch processing span
    with logfire.span(
        "batch_processing",
        attributes={
            "total_prompts": total_prompts,
        },
    ):
        # Log batch start and initialize counters
        batch_start_time = log_batch_start(total_prompts)
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
                    "batch_size": len(batch),
                    "batch_start_index": i,
                },
            ):
                # Process this batch
                (
                    batch_responses,
                    batch_completed,
                    batch_failed,
                    new_first_result_time,
                ) = await process_prompt_batch(
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

        # Calculate total duration and log completion
        total_duration = time.time() - batch_start_time
        log_batch_process_completion(
            total_prompts,
            completed,
            failed,
            total_duration,
            first_result_time,
            batch_start_time,
        )

        return MultiplePromptsResponse(responses=all_responses)
