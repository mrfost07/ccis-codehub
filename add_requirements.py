"""Add missing functional requirements to documentation"""

# Read the file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new community features section
old_community = """**Community Features**

• FR-19: The system shall allow users to create and share posts with rich content

• FR-20: The system shall implement a commenting system for posts

• FR-21: The system shall provide user following and follower functionality

• FR-22: The system shall support image uploads for posts and profiles

• FR-23: The system shall implement a notification system for community interactions

• FR-24: The system shall provide real-time chat between users using WebSocket technology"""

new_community = """**Community Features**

• FR-19: The system shall allow users to create and manage personalized user profiles with bio, skills, and achievements

• FR-20: The system shall enable users to create and share posts with rich content including text, code snippets, and images

• FR-21: The system shall implement a commenting system for posts with threading support

• FR-22: The system shall provide user following functionality to subscribe to other users' activities

• FR-23: The system shall allow users to unfollow other users and manage their following list

• FR-24: The system shall support image uploads for posts and profile pictures

• FR-25: The system shall implement a notification system for community interactions including follows, comments, and mentions

• FR-26: The system shall provide real-time private chat between users using WebSocket technology

• FR-27: The system shall enable creation and management of study groups for collaborative learning

• FR-28: The system shall provide global chat rooms for program-specific discussions (BSIT, BSCS, BSIS)

• FR-29: The system shall support group messaging and file sharing within study groups"""

# Replace community section
content = content.replace(old_community, new_community)

# Update Project Management section (FR numbers shift)
content = content.replace('• FR-25: The system shall enable project creation', '• FR-30: The system shall enable project creation')
content = content.replace('• FR-26: The system shall provide task management', '• FR-31: The system shall provide task management')
content = content.replace('• FR-27: The system shall support file sharing', '• FR-32: The system shall support file sharing')
content = content.replace('• FR-28: The system shall implement project timeline', '• FR-33: The system shall implement project timeline')
content = content.replace('• FR-29: The system shall provide project activity', '• FR-34: The system shall provide project activity')
content = content.replace('• FR-30: The system shall support project branching', '• FR-35: The system shall support project branching')

# Update Administrative section (FR numbers shift)
content = content.replace('• FR-31: The system shall provide comprehensive admin', '• FR-36: The system shall provide comprehensive admin')
content = content.replace('• FR-32: The system shall allow user management', '• FR-37: The system shall allow user management')
content = content.replace('• FR-33: The system shall enable content moderation', '• FR-38: The system shall enable content moderation')
content = content.replace('• FR-34: The system shall provide system health', '• FR-39: The system shall provide system health')
content = content.replace('• FR-35: The system shall support bulk data', '• FR-40: The system shall support bulk data')

# Add new administrative requirements
old_admin_end = '• FR-40: The system shall support bulk data import and export functionality'
new_admin_end = '''• FR-40: The system shall support bulk data import and export functionality

• FR-41: The system shall allow administrators to manage study groups and global chat rooms

• FR-42: The system shall provide user activity reports and engagement metrics'''

content = content.replace(old_admin_end, new_admin_end)

# Update references to total requirements (35 -> 42)
content = content.replace('35 functional requirements', '42 functional requirements')
content = content.replace('(FR-01 to FR-35)', '(FR-01 to FR-42)')
content = content.replace('FR-01 to FR-35', 'FR-01 to FR-42')

# Write back
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully added missing functional requirements!")
print("\n📝 Changes made:")
print("   • Community Features: FR-19 to FR-29 (11 requirements)")
print("   • Added: User profiles, follow/unfollow, study groups, global chat")
print("   • Project Management: FR-30 to FR-35 (renumbered)")
print("   • Administrative: FR-36 to FR-42 (renumbered + 2 new)")
print("\n📊 Total functional requirements: 42 (was 35)")
print("\n🎯 New features documented:")
print("   ✅ User profile management")
print("   ✅ Follow/Unfollow functionality")
print("   ✅ Study groups")
print("   ✅ Global chat rooms (BSIT, BSCS, BSIS)")
print("   ✅ Group messaging")
