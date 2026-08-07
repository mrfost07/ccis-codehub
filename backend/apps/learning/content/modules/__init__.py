"""
The shared module library.

A path manifest names modules by key rather than declaring them inline, so a
module is authored once and composed into every path that needs it. Most of the
eighty-one roles overlap heavily — every engineering role needs version control,
every web role needs HTTP — and without sharing, eighty-one paths would mean
four hundred modules instead of about a hundred and thirty.

Keys are `area.name`:

    core.*       shared across many paths, regardless of track
    tracks.*     shared within one family of roles
    capstones.*  specific to one role, and the only per-role authoring
"""
from .capstones import backend_engineer as _cap_backend_engineer
from .capstones import business_analyst as _cap_business_analyst
from .capstones import data_analyst as _cap_data_analyst
from .capstones import frontend_engineer as _cap_frontend_engineer
from .capstones import full_stack_engineer as _cap_full_stack_engineer
from .capstones import it_support_engineer as _cap_it_support_engineer
from .capstones import network_administrator as _cap_network_administrator
from .core import automated_testing as _automated_testing
from .core import data_analysis_reporting as _data_analysis_reporting
from .core import frontend_foundations as _frontend_foundations
from .core import http_and_apis as _http_and_apis
from .core import linux_and_systems as _linux_and_systems
from .core import networking as _networking
from .core import relational_data as _relational_data
from .core import requirements_analysis as _requirements_analysis
from .core import security_fundamentals as _security_fundamentals
from .core import version_control as _version_control

REGISTRY = {
    'core.version_control': _version_control.MODULE,
    'core.http_and_apis': _http_and_apis.MODULE,
    'core.relational_data': _relational_data.MODULE,
    'core.automated_testing': _automated_testing.MODULE,
    'core.frontend_foundations': _frontend_foundations.MODULE,
    'core.networking': _networking.MODULE,
    'core.linux_and_systems': _linux_and_systems.MODULE,
    'core.security_fundamentals': _security_fundamentals.MODULE,
    'core.requirements_analysis': _requirements_analysis.MODULE,
    'core.data_analysis_reporting': _data_analysis_reporting.MODULE,
    'capstones.backend_engineer': _cap_backend_engineer.MODULE,
    'capstones.frontend_engineer': _cap_frontend_engineer.MODULE,
    'capstones.full_stack_engineer': _cap_full_stack_engineer.MODULE,
    'capstones.network_administrator': _cap_network_administrator.MODULE,
    'capstones.it_support_engineer': _cap_it_support_engineer.MODULE,
    'capstones.business_analyst': _cap_business_analyst.MODULE,
    'capstones.data_analyst': _cap_data_analyst.MODULE,
}


def get(key):
    """The module definition for `key`, or None."""
    return REGISTRY.get(key)


def keys():
    return sorted(REGISTRY)
