from __future__ import annotations

import random
from typing import Dict

from .types import Request


class CostOptimizer:
    """Heuristic module to decide whether to route to cheaper model based on
    historical performance metrics (stubbed)."""

    def __init__(self):
        self._metrics: Dict[str, Dict[str, float]] = {}

    async def get_task_performance(self, task_type: str):
        # Placeholder: return fake performance delta
        return {
            "quality_delta": random.uniform(0.0, 0.1),
            "avg_cost_saved": random.uniform(0.001, 0.02),
        }

    async def should_route_to_cheaper(self, request: Request) -> bool:
        tp = request.metadata.get("type", "generic")
        perf = await self.get_task_performance(tp)
        return perf["quality_delta"] < 0.05