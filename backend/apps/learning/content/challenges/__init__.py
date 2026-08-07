"""
Declared coding challenges.

Each entry gives inputs and a reference solution; expected outputs are computed
by running that solution through the real executor at seed time, so they cannot
be wrong by hand.
"""
from .easy import CHALLENGES as EASY

ALL = list(EASY)


def by_difficulty(difficulty):
    return [c for c in ALL if c['difficulty'] == difficulty]
