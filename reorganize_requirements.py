"""Reorganize functional requirements to separate User Profile features"""

# Read the file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new structure with User Profile as separate section
old_section = """**Community Features**

• FR-19: The system shall allow users to create and manage personalized user profiles with bio, skills, and achievements

• FR-20: The system shall enable users to create and share posts with rich content including text, code snippets, and images"""

new_section = """**User Profile Features**

• FR-19: The system shall allow users to create and manage personalized user profiles with bio, skills, and achievements

• FR-20: The system shall enable users to upload and update profile pictures

• FR-21: The system shall allow users to showcase their technical skills and programming languages

• FR-22: The system shall display user achievements, badges, and certificates earned

• FR-23: The system shall provide user activity timeline showing recent posts, projects, and contributions

• FR-24: The system shall allow users to set profile visibility (public, CCIS only, private)

• FR-25: The system shall enable users to link social media and GitHub profiles

**Community Features**

• FR-26: The system shall enable users to create and share posts with rich content including text, code snippets, and images"""

content = content.replace(old_section, new_section)

# Now update all subsequent FR numbers (+6 shift for community onwards)
replacements = [
    # Community Features (shift by 6)
    ('• FR-21: The system shall implement a commenting', '• FR-27: The system shall implement a commenting'),
    ('• FR-22: The system shall provide user following', '• FR-28: The system shall provide user following'),
    ('• FR-23: The system shall allow users to unfollow', '• FR-29: The system shall allow users to unfollow'),
    ('• FR-24: The system shall support image uploads', '• FR-30: The system shall support image uploads'),
    ('• FR-25: The system shall implement a notification system', '• FR-31: The system shall implement a notification system'),
    ('• FR-26: The system shall provide real-time private chat', '• FR-32: The system shall provide real-time private chat'),
    ('• FR-27: The system shall enable creation and management of study', '• FR-33: The system shall enable creation and management of study'),
    ('• FR-28: The system shall provide global chat rooms', '• FR-34: The system shall provide global chat rooms'),
    ('• FR-29: The system shall support group messaging', '• FR-35: The system shall support group messaging'),
    
    # Project Management (shift by 6)
    ('• FR-30: The system shall enable project creation', '• FR-36: The system shall enable project creation'),
    ('• FR-31: The system shall provide task management', '• FR-37: The system shall provide task management'),
    ('• FR-32: The system shall support file sharing within project', '• FR-38: The system shall support file sharing within project'),
    ('• FR-33: The system shall implement project timeline', '• FR-39: The system shall implement project timeline'),
    ('• FR-34: The system shall provide project activity', '• FR-40: The system shall provide project activity'),
    ('• FR-35: The system shall support project branching', '• FR-41: The system shall support project branching'),
    
    # Administrative (shift by 6)
    ('• FR-36: The system shall provide comprehensive admin', '• FR-42: The system shall provide comprehensive admin'),
    ('• FR-37: The system shall allow user management', '• FR-43: The system shall allow user management'),
    ('• FR-38: The system shall enable content moderation', '• FR-44: The system shall enable content moderation'),
    ('• FR-39: The system shall provide system health', '• FR-45: The system shall provide system health'),
    ('• FR-40: The system shall support bulk data', '• FR-46: The system shall support bulk data'),
    ('• FR-41: The system shall allow administrators to manage study', '• FR-47: The system shall allow administrators to manage study'),
    ('• FR-42: The system shall provide user activity reports', '• FR-48: The system shall provide user activity reports'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Update total count references (42 -> 48)
content = content.replace('42 functional requirements', '48 functional requirements')
content = content.replace('(FR-01 to FR-42)', '(FR-01 to FR-48)')
content = content.replace('FR-01 to FR-42', 'FR-01 to FR-48')

# Write back
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully reorganized functional requirements!")
print("\n📝 New Structure:")
print("   📋 User Authentication: FR-01 to FR-05 (5)")
print("   📚 Learning Management: FR-06 to FR-12 (7)")
print("   🤖 AI Mentor System: FR-13 to FR-18 (6)")
print("   👤 User Profile Features: FR-19 to FR-25 (7) ⭐ NEW SECTION")
print("   💬 Community Features: FR-26 to FR-35 (10)")
print("   📁 Project Management: FR-36 to FR-41 (6)")
print("   ⚙️  Administrative: FR-42 to FR-48 (7)")
print("\n📊 Total: 48 functional requirements (was 42)")
print("\n🎯 User Profile now has its own section with 7 requirements:")
print("   ✅ FR-19: Create & manage profiles")
print("   ✅ FR-20: Upload profile pictures")
print("   ✅ FR-21: Showcase technical skills")
print("   ✅ FR-22: Display achievements & badges")
print("   ✅ FR-23: User activity timeline")
print("   ✅ FR-24: Profile visibility settings")
print("   ✅ FR-25: Link social media & GitHub")
