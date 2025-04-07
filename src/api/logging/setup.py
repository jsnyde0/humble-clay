"""Logfire configuration and logging helpers."""

import logging
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


def update_batch_span_attributes(
    batch_number: int,
    batch_size: int,
    batch_completed: int,
    batch_failed: int,
    batch_duration: float,
) -> None:
    """
    Update the current batch span with performance attributes.

    Args:
        batch_number: The current batch number
        batch_size: The size of the batch
        batch_completed: Number of successfully completed prompts
        batch_failed: Number of failed prompts
        batch_duration: The duration of processing in seconds
    """
    # Calculate average processing time per item
    avg_time = batch_duration / batch_size if batch_size > 0 else 0

    # Update the current span with these attributes
    logfire.update_current_span(
        attributes={
            "completed": batch_completed,
            "failed": batch_failed,
            "success_rate": f"{batch_completed / batch_size * 100:.1f}%"
            if batch_size > 0
            else "0%",
            "duration_seconds": round(batch_duration, 2),
            "avg_time_per_item": round(avg_time, 3),
        }
    )


def update_batch_processing_span(
    total_prompts: int,
    completed: int,
    failed: int,
    total_duration: float,
    first_result_time: Optional[float] = None,
    batch_start_time: Optional[float] = None,
) -> None:
    """
    Update the main batch processing span with summary attributes.

    Args:
        total_prompts: The total number of prompts processed
        completed: Number of successfully completed prompts
        failed: Number of failed prompts
        total_duration: Total processing time in seconds
        first_result_time: Time when first result was completed (optional)
        batch_start_time: Time when batch processing started (optional)
    """
    # Calculate time to first result if available
    time_to_first_result = None
    if first_result_time and batch_start_time:
        time_to_first_result = round(first_result_time - batch_start_time, 2)

    # Update the batch processing span
    logfire.update_current_span(
        attributes={
            "total_prompts": total_prompts,
            "completed": completed,
            "failed": failed,
            "success_rate": f"{completed / total_prompts * 100:.1f}%"
            if total_prompts > 0
            else "0%",
            "total_duration_seconds": round(total_duration, 2),
            "time_to_first_result": time_to_first_result,
            "avg_time_per_item": round(total_duration / total_prompts, 3)
            if total_prompts > 0
            else 0,
        }
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
