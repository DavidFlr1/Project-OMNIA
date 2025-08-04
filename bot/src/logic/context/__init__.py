"""
Context module for shared state across logic components
"""

from .event_context import EventContext

# Global event context instance
eventContext = EventContext()

__all__ = ['eventContext', 'EventContext']