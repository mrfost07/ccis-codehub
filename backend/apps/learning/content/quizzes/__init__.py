"""
Quizzes for paths whose modules already exist.

Five paths were authored before this system and have real teaching content but
no quizzes at all — they teach and cannot assess. Declaring them as full path
manifests would mean transcribing fourteen modules of existing HTML into slide
dictionaries, which risks losing or altering content nobody asked to change.

So a quiz pack declares only the quizzes, matched to modules by title. Module
content is never touched. New paths should still be declared whole, in
`content/paths/`; this is for the ones that came first.
"""
from .aws_ec2 import QUIZZES as AWS_EC2
from .cloud_computing import QUIZZES as CLOUD_COMPUTING
from .data_structures import QUIZZES as DATA_STRUCTURES
from .sql_fundamentals import QUIZZES as SQL_FUNDAMENTALS
from .web_development import QUIZZES as WEB_DEVELOPMENT

# Path slug -> the quizzes to attach to its modules.
REGISTRY = {
    'cloud-computing-fundamentals-a-practical-guide-2r6': CLOUD_COMPUTING,
    'comprehensive-data-structures-for-college-stude-ag': DATA_STRUCTURES,
    'comprehensive-web-development-course-vgn': WEB_DEVELOPMENT,
    'fundamentals-of-sql-ikn': SQL_FUNDAMENTALS,
    'hosting-a-website-on-aws-ec2-qkv': AWS_EC2,
}


def get(slug):
    return REGISTRY.get(slug)


def slugs():
    return sorted(REGISTRY)
