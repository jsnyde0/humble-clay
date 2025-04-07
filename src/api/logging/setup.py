"""Logfire configuration and logging helpers."""

import logging
import time
from typing import Optional

import logfire
from fastapi import FastAPI

# Configure logging
logger = logging.getLogger(__name__)


def configure_logfire(
    service_name: str = "humble-clay-api",
    service_version: str = "0.1.0",
    environment: str = "development",
) -> None:
    """
    Configure Logfire for the application.

    Args:
        service_name: The name of the service
        service_version: The version of the service
        environment: The deployment environment (development, production, etc.)
    """
    logfire.configure(
        service_name=service_name,
        service_version=service_version,
        environment=environment,  # Change to "production" in production environment
    )
    logfire.info("Logfire configured")


def setup_api_logging(app: FastAPI) -> None:
    """
    Set up logging for a FastAPI application.

    Args:
        app: The FastAPI application
    """
    # Apply Logfire instrumentation to FastAPI
    logfire.instrument_fastapi(app)

    # Configure basic logging
    logging.basicConfig(level=logging.INFO)


def log_batch_start(total_prompts: int) -> float:
    """
    Log the start of batch processing.

    Args:
        total_prompts: The total number of prompts in the batch

    Returns:
        The start time timestamp
    """
    batch_start_time = time.time()
    logfire.info(
        "Starting batch processing",
        total_prompts=total_prompts,
    )
    return batch_start_time


def log_batch_progress(
    batch_number: int,
    total_batches: int,
    batch_size: int,
    completed: int,
    total_prompts: int,
) -> None:
    """
    Log batch processing progress.

    Args:
        batch_number: The current batch number
        total_batches: The total number of batches
        batch_size: The size of the current batch
        completed: The number of completed prompts
        total_prompts: The total number of prompts
    """
    progress_percentage = (
        round((completed / total_prompts) * 100, 2) if total_prompts > 0 else 0
    )

    logfire.info(
        f"Processing batch {batch_number}/{total_batches}",
        batch_number=batch_number,
        total_batches=total_batches,
        batch_size=batch_size,
        progress_percentage=progress_percentage,
    )


def log_batch_completion(
    batch_number: int,
    total_batches: int,
    batch_completed: int,
    batch_failed: int,
    total_completed: int,
    total_failed: int,
    total_prompts: int,
    batch_duration: float,
    batch_size: int,
) -> None:
    """
    Log the completion of a batch.

    Args:
        batch_number: The current batch number
        total_batches: The total number of batches
        batch_completed: The number of completed prompts in this batch
        batch_failed: The number of failed prompts in this batch
        total_completed: The total number of completed prompts
        total_failed: The total number of failed prompts
        total_prompts: The total number of prompts
        batch_duration: The duration of the batch in seconds
        batch_size: The size of the batch
    """
    progress_percentage = (
        round((total_completed / total_prompts) * 100, 2) if total_prompts > 0 else 0
    )

    logfire.info(
        f"Completed batch {batch_number}/{total_batches}",
        batch_number=batch_number,
        batch_completed=batch_completed,
        batch_failed=batch_failed,
        total_completed=total_completed,
        total_failed=total_failed,
        progress_percentage=progress_percentage,
        batch_duration=round(batch_duration, 2),
        avg_item_time=round(batch_duration / batch_size, 2) if batch_size > 0 else 0,
    )


def log_batch_process_completion(
    total_prompts: int,
    completed: int,
    failed: int,
    total_duration: float,
    first_result_time: Optional[float] = None,
    batch_start_time: Optional[float] = None,
) -> None:
    """
    Log the completion of the entire batch processing.

    Args:
        total_prompts: The total number of prompts
        completed: The number of completed prompts
        failed: The number of failed prompts
        total_duration: The total duration in seconds
        first_result_time: The timestamp of the first result
        batch_start_time: The timestamp when batch processing started
    """
    first_result_metric = None
    if first_result_time and batch_start_time:
        first_result_metric = round(first_result_time - batch_start_time, 2)

    logfire.info(
        "Completed batch processing",
        total_prompts=total_prompts,
        completed=completed,
        failed=failed,
        total_duration=round(total_duration, 2),
        time_to_first_result=first_result_metric,
        average_time_per_item=round(total_duration / total_prompts, 2)
        if total_prompts > 0
        else 0,
    )


def log_first_result(first_result_time: float, batch_start_time: float) -> None:
    """
    Log the first result completion.

    Args:
        first_result_time: The timestamp of the first result
        batch_start_time: The timestamp when batch processing started
    """
    time_to_first = first_result_time - batch_start_time
    logfire.info(
        "First result completed",
        time_to_first_result=round(time_to_first, 2),
    )


def log_batch_item_error(
    error: Exception, prompt: str, item_duration: float, error_type: str = "processing"
) -> None:
    """
    Log a batch item error.

    Args:
        error: The error that occurred
        prompt: The prompt that caused the error
        item_duration: The duration spent processing the item
        error_type: The type of error (validation or processing)
    """
    error_message = str(error)

    logfire.error(
        f"Batch item {error_type} error",
        error=error_message,
        prompt=prompt[:100],  # First 100 chars
        item_duration=round(item_duration, 2),
    )

    logger.error(f"Batch item {error_type} error: {error_message}")
