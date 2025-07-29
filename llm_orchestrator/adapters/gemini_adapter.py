from __future__ import annotations

import os
from typing import List, Dict, Any

from .base import AbstractAdapter
from ..types import LLMResponse, Message, Role
from . import _register


@_register("gemini")
class GeminiAdapter(AbstractAdapter):
    """Stub adapter for Google Gemini models."""

    MODEL_NAME = "gemini-2.5-pro"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    async def generate(
        self,
        messages: List[Message],
        *,
        model_hint: str | None = None,
        tools: List[Dict[str, Any]] | None = None,
        **kw: Any,
    ) -> LLMResponse:
        user_msg = next((m for m in reversed(messages) if m["role"] == Role.USER), None)
        content = f"[GeminiAdapter stub] Echo vision support coming soon: {user_msg['content'] if user_msg else 'Hello'}"
        return LLMResponse(content=content, model_name=self.MODEL_NAME)