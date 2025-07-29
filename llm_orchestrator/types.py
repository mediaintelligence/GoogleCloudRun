from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

__all__ = [
    "Role",
    "Message",
    "LLMResponse",
    "Request",
    "Response",
]


class Role(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


Message = Dict[str, Any]


@dataclass
class LLMResponse:
    content: str
    role: Role = Role.ASSISTANT
    usage: Dict[str, Any] | None = None
    model_name: str | None = None
    raw: Any | None = None  # The raw provider response


@dataclass
class Request:
    messages: List[Message]
    model_hint: str | None = None
    tools: Optional[List[Dict[str, Any]]] = None
    max_tokens: int | None = None
    temperature: float = 0.8
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Augmented features used by routing
    requires_vision: bool = False
    requires_tools: bool = False
    estimated_tokens: int | None = None
    complexity_score: float | None = None


@dataclass
class Response:
    content: str
    success: bool = True
    raw_response: LLMResponse | None = None
    error: str | None = None