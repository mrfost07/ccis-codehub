"""
Every path the platform knows how to seed, keyed by slug.

Adding a path means adding a module here and one line to REGISTRY. The seed
command reads nothing else, so a path that is not registered cannot be seeded by
accident, and one that is registered is always seedable.
"""
from .backend_engineer import MANIFEST as BACKEND_ENGINEER
from .data_science import MANIFEST as DATA_SCIENCE

REGISTRY = {
    BACKEND_ENGINEER['slug']: BACKEND_ENGINEER,
    DATA_SCIENCE['slug']: DATA_SCIENCE,
}


def get(slug):
    """The manifest for `slug`, or None."""
    return REGISTRY.get(slug)


def slugs():
    return sorted(REGISTRY)
