"""API route modules for DealLinked CRM.

Extracted routes that will be modified for Marketplace features.
Other routes remain in server.py until needed.
"""
from .auth_routes import router as auth_router
from .deal_routes import router as deal_router
from .dashboard_routes import router as dashboard_router
from .marketplace_routes import router as marketplace_router
from .messaging_routes import router as messaging_router

__all__ = [
    "auth_router",
    "deal_router",
    "dashboard_router",
    "marketplace_router",
    "messaging_router",
]
