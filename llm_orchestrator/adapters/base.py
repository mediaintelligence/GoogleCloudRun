from __future__ import annotations

import abc
from typing import Protocol, List, Dict, Any

from ..types import LLMResponse, Message


class LLMAdapter(Protocol):
    """Adapter interface each LLM provider must implement."""

    async def generate(
        self,
        messages: List[Message],
        *,
        model_hint: str,
        tools: List[Dict[str, Any]] | None = None,
        **kw: Any,
    ) -> LLMResponse:  # pragma: no cover
        ...


class AbstractAdapter(abc.ABC):
    """Base class implementing helper utilities for concrete adapters."""

    MODEL_NAME: str = "abstract"

    async def generate(
        self,
        messages: List[Message],
        *,
        model_hint: str | None = None,
        tools: List[Dict[str, Any]] | None = None,
        **kw: Any,
    ) -> LLMResponse:  # pragma: no cover
        raise NotImplementedError

    # Common helper for token counting (rough estimate)
    @staticmethod
    def estimate_tokens(messages: List[Message]) -> int:
        return sum(len(m.get("content", "").split()) for m in messages) // 0.75  # naive estimate