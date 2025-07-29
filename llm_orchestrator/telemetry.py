from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict

try:
    from opentelemetry import trace
except ModuleNotFoundError:  # pragma: no cover
    trace = None  # type: ignore

logger = logging.getLogger(__name__)


@contextmanager
def span(name: str, attrs: Dict[str, Any] | None = None):
    """Simple context manager to record a tracing span using OpenTelemetry when
    available, otherwise no-op while capturing basic timing info."""

    start = time.time()
    span_cm = (
        trace.get_tracer(__name__).start_as_current_span(name) if trace else None
    )
    if span_cm:
        if attrs:
            for k, v in attrs.items():
                span_cm.__enter__().set_attribute(k, v)  # type: ignore[attr-defined]
        _span = span_cm.__enter__()
    else:
        _span = None
    try:
        yield _span
    finally:
        duration = (time.time() - start) * 1000
        logger.debug("Span %s took %.1fms", name, duration)
        if span_cm:
            span_cm.__exit__(None, None, None)