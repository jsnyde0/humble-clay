"""Test Logfire integration with pytest."""

import os
import time
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)


def test_logfire_token_exists():
    """Test that LOGFIRE_TOKEN is set in the environment."""
    assert "LOGFIRE_TOKEN" in os.environ, "LOGFIRE_TOKEN must be set in environment"


def test_logfire_basic_integration():
    """Test basic Logfire integration."""
    import logfire

    # Configure Logfire
    logfire.configure(
        service_name="humble-clay-api-test",
        service_version="0.1.0",
        environment="testing",
    )

    # Test basic logging
    logfire.info("Starting test logging", test_name="test_logfire_basic_integration")

    # This test passes if no exceptions are raised
    assert True


def test_batch_processing_monitoring():
    """Test batch processing monitoring with spans."""
    import logfire

    # Configure Logfire if not already configured
    try:
        logfire.configure(
            service_name="humble-clay-api-test",
            service_version="0.1.0",
            environment="testing",
        )
    except:
        # Already configured, continue
        pass

    # Track timing for verification
    times = {
        "batch_start": None,
        "first_result": None,
        "batch_end": None,
    }

    # Simulate batch processing with spans
    with logfire.span("batch_processing", attributes={"total_prompts": 10}):
        times["batch_start"] = time.time()

        # Log batch start
        logfire.info("Starting batch processing", total_prompts=10)

        # Process two sub-batches
        for batch_number in range(1, 3):
            with logfire.span(
                f"batch_{batch_number}", attributes={"batch_number": batch_number}
            ):
                batch_start = time.time()
                logfire.info(
                    f"Processing batch {batch_number}/2",
                    batch_number=batch_number,
                    total_batches=2,
                    batch_size=5,
                    progress_percentage=((batch_number - 1) * 50),
                )

                # Simulate processing 5 items (reduced time for faster tests)
                for i in range(5):
                    # Simulate some work (reduced for testing)
                    time.sleep(0.02)

                    # If this is the first item of the first batch, record first result
                    if batch_number == 1 and i == 0:
                        times["first_result"] = time.time()
                        time_to_first = times["first_result"] - times["batch_start"]
                        logfire.info(
                            "First result completed",
                            time_to_first_result=round(time_to_first, 2),
                        )

                # Batch completed
                batch_duration = time.time() - batch_start
                logfire.info(
                    f"Completed batch {batch_number}/2",
                    batch_number=batch_number,
                    batch_completed=5,
                    batch_failed=0,
                    total_completed=batch_number * 5,
                    total_failed=0,
                    progress_percentage=batch_number * 50,
                    batch_duration=round(batch_duration, 2),
                    avg_item_time=round(batch_duration / 5, 2),
                )

        # Record end time
        times["batch_end"] = time.time()

        # Log batch completion with timing metrics
        logfire.info(
            "Completed batch processing",
            total_prompts=10,
            completed=10,
            failed=0,
            total_duration=round(times["batch_end"] - times["batch_start"], 2),
            time_to_first_result=round(times["first_result"] - times["batch_start"], 2),
            average_time_per_item=round(
                (times["batch_end"] - times["batch_start"]) / 10, 2
            ),
        )

    # Verify timing information
    assert times["first_result"] > times["batch_start"], (
        "First result time should be after batch start"
    )
    assert times["batch_end"] > times["first_result"], (
        "Batch end time should be after first result"
    )

    # Calculate expected metrics
    total_duration = times["batch_end"] - times["batch_start"]
    time_to_first = times["first_result"] - times["batch_start"]
    avg_per_item = total_duration / 10

    # Verify all metrics are reasonable
    assert 0 < time_to_first < total_duration, (
        "Time to first result should be positive and less than total duration"
    )
    assert avg_per_item > 0, "Average time per item should be positive"
