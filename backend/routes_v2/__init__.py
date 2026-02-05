# DealLinked CRM V2 - Clean Routes
from .auth import router as auth_router
from .deals import router as deals_router
from .contacts import router as contacts_router
from .pipelines import router as pipelines_router
from .teams import router as teams_router
from .calendar import router as calendar_router
from .dashboard import router as dashboard_router

__all__ = [
    'auth_router',
    'deals_router', 
    'contacts_router',
    'pipelines_router',
    'teams_router',
    'calendar_router',
    'dashboard_router'
]
