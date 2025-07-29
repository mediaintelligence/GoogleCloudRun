from __future__ import annotations

import hashlib
import logging
from typing import Dict, Tuple, List, Optional

logger = logging.getLogger(__name__)


class SemanticCache:
    """A very naive semantic + exact-match cache backed by an in-memory dict.
    For production use, plug in real vector DB (e.g., Qdrant, Pinecone) and
    embedding model. The cache key is SHA256(content) for exact match; semantic
    similarity search is a brute-force cosine check over stored embeddings.
    """

    def __init__(self):
        self._exact: Dict[str, str] = {}
        self._vectors: List[Tuple[List[float], str]] = []  # (embedding, response)

    @staticmethod
    def _hash(content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()

    async def embed(self, text: str) -> List[float]:  # noqa: D401
        """Return a dummy embedding (hash to float list) until real model exists."""
        h = self._hash(text)[:32]
        return [int(h[i : i + 8], 16) / 2**32 for i in range(0, 32, 8)]

    async def get(self, content: str) -> Optional[str]:
        key = self._hash(content)
        if key in self._exact:
            logger.debug("Cache hit (exact)")
            return self._exact[key]

        # Semantic lookup (brute-force)
        query_vec = await self.embed(content)
        best_sim = 0.0
        best_resp: Optional[str] = None
        for vec, resp in self._vectors:
            sim = self._cosine(query_vec, vec)
            if sim > 0.95 and sim > best_sim:
                best_sim = sim
                best_resp = resp
        if best_resp:
            logger.debug("Cache hit (semantic) sim=%.3f", best_sim)
        return best_resp

    async def set(self, content: str, response: str):
        key = self._hash(content)
        self._exact[key] = response
        emb = await self.embed(content)
        self._vectors.append((emb, response))

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:  # pragma: no cover
        dot = sum(x * y for x, y in zip(a, b))
        norm = (sum(x * x for x in a) ** 0.5) * (sum(y * y for y in b) ** 0.5)
        return dot / norm if norm else 0.0