from importlib import import_module
from typing import Dict, Type

from .base import LLMAdapter

__all__: list[str] = [
    'LLMAdapter',
    'get_adapter_registry',
]


_adapter_registry: Dict[str, type[LLMAdapter]] = {}


def _register(name: str):
    def decorator(cls: Type[LLMAdapter]):
        _adapter_registry[name] = cls
        return cls

    return decorator


# Dynamically import known adapters so they self-register
# Add new adapters here
for _mod in [
    'openai_adapter',
    'anthropic_adapter',
    'gemini_adapter',
]:
    try:
        import_module(f'.{_mod}', package=__name__)
    except ModuleNotFoundError:
        # Adapter dependency not installed yet – ignore
        pass


def get_adapter_registry() -> Dict[str, type[LLMAdapter]]:
    return _adapter_registry