"""
Every path the platform knows how to seed, keyed by slug.

Adding a path means adding a module here and one line to REGISTRY. The seed
command reads nothing else, so a path that is not registered cannot be seeded by
accident, and one that is registered is always seedable.
"""
from .backend_engineer import MANIFEST as BACKEND_ENGINEER
from .business_analyst import MANIFEST as BUSINESS_ANALYST
from .data_analyst import MANIFEST as DATA_ANALYST
from .qa_automation_engineer import MANIFEST as QA_AUTOMATION_ENGINEER
from .systems_administrator import MANIFEST as SYSTEMS_ADMINISTRATOR
from .soc_analyst import MANIFEST as SOC_ANALYST
from .database_administrator import MANIFEST as DATABASE_ADMINISTRATOR
from .it_auditor import MANIFEST as IT_AUDITOR
from .data_science import MANIFEST as DATA_SCIENCE
from .frontend_engineer import MANIFEST as FRONTEND_ENGINEER
from .full_stack_engineer import MANIFEST as FULL_STACK_ENGINEER
from .it_support_engineer import MANIFEST as IT_SUPPORT_ENGINEER
from .network_administrator import MANIFEST as NETWORK_ADMINISTRATOR
from .cloud_engineer import MANIFEST as CLOUD_ENGINEER

REGISTRY = {
    BACKEND_ENGINEER['slug']: BACKEND_ENGINEER,
    DATA_SCIENCE['slug']: DATA_SCIENCE,
    FRONTEND_ENGINEER['slug']: FRONTEND_ENGINEER,
    FULL_STACK_ENGINEER['slug']: FULL_STACK_ENGINEER,
    NETWORK_ADMINISTRATOR['slug']: NETWORK_ADMINISTRATOR,
    CLOUD_ENGINEER['slug']: CLOUD_ENGINEER,
    IT_SUPPORT_ENGINEER['slug']: IT_SUPPORT_ENGINEER,
    BUSINESS_ANALYST['slug']: BUSINESS_ANALYST,
    DATA_ANALYST['slug']: DATA_ANALYST,
    QA_AUTOMATION_ENGINEER['slug']: QA_AUTOMATION_ENGINEER,
    SYSTEMS_ADMINISTRATOR['slug']: SYSTEMS_ADMINISTRATOR,
    SOC_ANALYST['slug']: SOC_ANALYST,
    DATABASE_ADMINISTRATOR['slug']: DATABASE_ADMINISTRATOR,
    IT_AUDITOR['slug']: IT_AUDITOR,
}


def get(slug):
    """The manifest for `slug`, or None."""
    return REGISTRY.get(slug)


def slugs():
    return sorted(REGISTRY)
