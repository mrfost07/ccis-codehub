# CCIS-CodeHub AI Mentor Dataset

A comprehensive training dataset for fine-tuning LLMs to serve as an AI mentor for the CCIS-CodeHub learning platform.

## Dataset Statistics
- **Total Examples**: 11,000+
- **Format**: JSONL (JSON Lines)
- **Fields**: instruction, input, output

## Categories Covered
1. Navigation & System Guide
2. Learning Paths & Courses
3. Projects & GitHub Integration
4. Community Interactions
5. Coding Concepts & Tutorials
6. Quiz & Competitions
7. Profile Management
8. Admin Features (role-restricted)
9. Instructor Features (role-restricted)
10. Role-Based Access Denial
11. Error Handling & Apologies
12. Document Parsing & Content Generation
13. Research & Information Search

## Usage with Unsloth
```python
from datasets import load_dataset
dataset = load_dataset('json', data_files='ccis_ai_mentor_dataset.jsonl')
```

## Role-Based Responses
The dataset includes role-specific responses:
- `student` - Basic access, learning-focused
- `instructor` - Course management, quiz hosting
- `admin` - Full system access

Created for CCIS-CodeHub AI Mentor fine-tuning.
