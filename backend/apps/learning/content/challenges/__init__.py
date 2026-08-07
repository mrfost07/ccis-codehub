"""
Declared coding challenges.

Each entry gives inputs and a reference solution; expected outputs are computed
by running that solution through the real executor at seed time, so they cannot
be wrong by hand.
"""
from .easy import CHALLENGES as EASY
from .easy_2 import CHALLENGES as EASY_2
from .medium import CHALLENGES as MEDIUM
from .medium_2 import CHALLENGES as MEDIUM_2
from .hard import CHALLENGES as HARD

ALL = list(EASY) + list(EASY_2) + list(MEDIUM) + list(MEDIUM_2) + list(HARD)


def by_difficulty(difficulty):
    return [c for c in ALL if c['difficulty'] == difficulty]
