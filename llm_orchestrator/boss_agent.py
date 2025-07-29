from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Sequence, Any

from .types import Request, Response, LLMResponse
from .adapters import get_adapter_registry, LLMAdapter
from .cache import SemanticCache
from .telemetry import span

logger = logging.getLogger(__name__)

DEFAULT_POLICY = {
    # Simplified routing policy for MVP
    "rules": [
        {"if": "request.requires_vision", "use": "gemini"},
        {"if": "request.requires_tools", "use": "openai"},
    ],
    "primary": "anthropic",
    "fallbacks": ["openai", "gemini"],
}


class BossAgent:
    """Central orchestration layer handling routing, fallbacks, and response
    validation. It is intentionally lightweight; heavier intelligence can be
    plugged in later via PolicyEngine, CostOptimizer, etc."""

    def __init__(self, policy: Dict[str, Any] | None = None):
        self.policy = policy or DEFAULT_POLICY
        # Instantiate adapters lazily on first use
        self._adapters: Dict[str, LLMAdapter] = {}
        self._cache = SemanticCache()

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------

    async def route_and_execute(self, request: Request) -> Response:
        # Check cache first
        cached = await self._cache.get(request.messages[-1]["content"])
        if cached:
            return Response(content=cached)

        adapter_names = self._select_adapters(request)
        logger.debug("Candidate adapters: %s", adapter_names)

        for provider_name in adapter_names:
            adapter = await self._get_adapter(provider_name)
            try:
                logger.debug("Calling provider %s", provider_name)
                with span("llm.generate", {"provider": provider_name}):
                    llm_response = await adapter.generate(
                        request.messages,
                        model_hint=request.model_hint or provider_name,
                        tools=request.tools,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                    )
                await self._cache.set(request.messages[-1]["content"], llm_response.content)
                return Response(content=llm_response.content, raw_response=llm_response)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Provider %s failed: %s", provider_name, exc, exc_info=True)
                # continue to next fallback

        return Response(content="All providers failed", success=False)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_adapter(self, name: str) -> LLMAdapter:
        if name not in self._adapters:
            cls = get_adapter_registry()[name]
            self._adapters[name] = cls()  # type: ignore[call-arg]
        return self._adapters[name]

    def _select_adapters(self, request: Request) -> Sequence[str]:
        # Very naive rule evaluation: iterate over policy rules, return first match
        for rule in self.policy.get("rules", []):
            condition = rule["if"]
            if self._evaluate_condition(condition, request):
                return [rule["use"]] + self.policy.get("fallbacks", [])

        # Default to primary + fallbacks
        return [self.policy.get("primary")] + self.policy.get("fallbacks", [])

    @staticmethod
    def _evaluate_condition(condition: str, request: Request) -> bool:  # noqa: C901
        try:
            # WARNING: Using eval is unsafe; replace with proper DSL in prod
            return bool(eval(condition, {"request": request}))  # noqa: S307
        except Exception:  # noqa: BLE001
            logger.error("Failed to evaluate condition: %s", condition, exc_info=True)
            return False


# -----------------------------------------------------------------------------
# Quick CLI test (async)
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio

    async def _demo():
        req = Request(
            messages=[{"role": "user", "content": "Hello boss agent!"}],
            requires_tools=False,
            requires_vision=False,
        )
        agent = BossAgent()
        res = await agent.route_and_execute(req)
        print(res.content)

    asyncio.run(_demo())