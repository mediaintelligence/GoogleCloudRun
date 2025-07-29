from __future__ import annotations

import os
from typing import List, Dict, Any

from .base import AbstractAdapter
from ..types import LLMResponse, Message, Role
from . import _register


@_register("openai")
class OpenAIAdapter(AbstractAdapter):
    """Adapter for OpenAI ChatCompletion API. This is a thin wrapper that can be
    swapped out when `openai` package is available. The current implementation is
    a stub that returns a placeholder response to keep development moving without
    external dependencies."""

    MODEL_NAME = "gpt-4o-mini"

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        # TODO: integrate openai library when available

    async def generate(
        self,
        messages: List[Message],
        *,
        model_hint: str | None = None,
        tools: List[Dict[str, Any]] | None = None,
        **kw: Any,
    ) -> LLMResponse:
        # For now, just echo the last user message as a placeholder
        user_msg = next((m for m in reversed(messages) if m["role"] == Role.USER), None)
        content = f"[OpenAIAdapter stub] Echo: {user_msg['content'] if user_msg else 'Hello'}"
        return LLMResponse(content=content, model_name=self.MODEL_NAME)