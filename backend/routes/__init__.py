"""API route modules for DealLinked CRM."""
from .auth_routes import router as auth_router
from .deal_routes import router as deal_router
from .contact_routes import router as contact_router
from .team_routes import router as team_router
from .email_routes import router as email_router
from .campaign_routes import router as campaign_router
from .map_routes import router as map_router
from .dashboard_routes import router as dashboard_router
from .chat_routes import router as chat_router
from .pipeline_routes import router as pipeline_router

__all__ = [
    "auth_router",
    "deal_router",
    "contact_router",
    "team_router",
    "email_router",
    "campaign_router",
    "map_router",
    "dashboard_router",
    "chat_router",
    "pipeline_router",
]
