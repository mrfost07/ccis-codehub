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
from .capstones import frontend_engineer as _cap_frontend_engineer
from .capstones import full_stack_engineer as _cap_full_stack_engineer
from .core import automated_testing as _automated_testing
from .core import frontend_foundations as _frontend_foundations
from .core import http_and_apis as _http_and_apis
from .core import relational_data as _relational_data
from .core import version_control as _version_control

REGISTRY = {
    'core.version_control': _version_control.MODULE,
    'core.http_and_apis': _http_and_apis.MODULE,
    'core.relational_data': _relational_data.MODULE,
    'core.automated_testing': _automated_testing.MODULE,
    'core.frontend_foundations': _frontend_foundations.MODULE,
    'capstones.backend_engineer': _cap_backend_engineer.MODULE,
    'capstones.frontend_engineer': _cap_frontend_engineer.MODULE,
    'capstones.full_stack_engineer': _cap_full_stack_engineer.MODULE,
}


def get(key):
    """The module definition for `key`, or None."""
    return REGISTRY.get(key)


def keys():
    return sorted(REGISTRY)
