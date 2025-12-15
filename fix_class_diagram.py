"""Fix class diagram syntax error in UML viewer"""
import re

# Read the file
with open('docs/UML_Diagrams_Viewer.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix the problematic lines (233-237)
# The issue is that all relationships are on one line

old_pattern = r'User <\|-- Student User <\|-- Instructor User <\|-- Administrator.*?LearningModule : creates'

new_relationships = '''User <|-- Student
            User <|-- Instructor
            User <|-- Administrator

            CareerPath "1" *-- "0..*" LearningModule
            LearningModule "1" *-- "0..*" Quiz
            Quiz "1" *-- "1..*" Question

            Student "0..*" --> "0..*" CareerPath
            Enrollment --> Student
            Enrollment --> CareerPath

            User "1" --> "0..*" Project
            User "1" --> "0..*" Post
            User "1" --> "0..*" AIMentorSession

            Instructor "1" --> "0..*" LearningModule'''

# Replace using regex with DOTALL flag
content = re.sub(old_pattern, new_relationships, content, flags=re.DOTALL)

# Write back
with open('docs/UML_Diagrams_Viewer.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Class diagram syntax fixed!")
print("📝 Corrected relationship declarations")
print("🔄 Please refresh the browser to see the updated diagram")
