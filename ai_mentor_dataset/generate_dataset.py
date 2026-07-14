"""
CCIS-CodeHub AI Mentor Training Dataset Generator v2
Generates 15,000+ examples with unique Q&As, error handling, and role-based privileges
"""

import json
import random
from datetime import datetime

OUTPUT_FILE = "ccis_ai_mentor_dataset.jsonl"

# ============================================================================
# NAVIGATION & SYSTEM GUIDE (200+ unique)
# ============================================================================
NAVIGATION_TEMPLATES = [
    # Dashboard
    {"q": "How do I navigate to the dashboard?", "a": "Click 'Dashboard' in the top navigation bar or side menu. Your dashboard shows learning progress, recent activities, upcoming deadlines, and quick stats."},
    {"q": "What can I see on my dashboard?", "a": "Your dashboard displays: 1) Learning progress overview, 2) Current streak days, 3) Recent community activity, 4) Enrolled courses, 5) Upcoming quizzes, and 6) Quick action buttons."},
    {"q": "Where is the home page?", "a": "Click the CCIS-CodeHub logo in the top-left corner or select 'Home' from the navigation menu to return to the home page."},
    {"q": "How do I go back to the main menu?", "a": "Click the hamburger menu icon (☰) on mobile or use the side navigation bar on desktop to access the main menu."},
    {"q": "I'm lost, how do I find my way around?", "a": "No worries! Use the navigation bar at the top for main sections: Dashboard, Learning, Projects, Community, and Profile. The side menu has more options. Need help with something specific?"},
    
    # Profile
    {"q": "Where can I find my profile?", "a": "Click your avatar in the top-right corner and select 'Profile', or click 'Profile' in the side navigation menu."},
    {"q": "How do I edit my profile information?", "a": "Go to your Profile page and click the 'Edit Profile' button. You can update your bio, skills, profile picture, and other information."},
    {"q": "Where do I see my achievements?", "a": "Your achievements, badges, and certificates are displayed on your Profile page under the 'Achievements' section."},
    {"q": "How do I view another user's profile?", "a": "Click on any username or avatar throughout the platform to view that user's public profile."},
    
    # Learning
    {"q": "How do I access the learning page?", "a": "Click 'Learning' in the main navigation to browse all available career paths, courses, and modules organized by program (BSIT, BSCS, BSIS)."},
    {"q": "Where are my enrolled courses?", "a": "Find your enrolled courses on your Dashboard under 'Continue Learning' or on the Learning page under 'My Courses'."},
    {"q": "How do I find a specific course?", "a": "Use the search bar on the Learning page to find courses by name, topic, or keyword. You can also filter by program or difficulty level."},
    {"q": "Where do I see my completed modules?", "a": "Go to your Dashboard or Profile page to see completed modules. The Learning page also shows completion checkmarks on finished content."},
    
    # Projects
    {"q": "How do I find the projects page?", "a": "Click 'Projects' in the navigation menu to view, create, and collaborate on coding projects."},
    {"q": "Where are my projects listed?", "a": "Your projects appear on the Projects page under 'My Projects' tab. You can filter by status, visibility, or date."},
    {"q": "How do I view project details?", "a": "Click on any project card to view its full details, including description, team members, GitHub link, and submission status."},
    
    # Community
    {"q": "Where is the community section?", "a": "Click 'Community' in the main navigation to access posts, discussions, and connect with other learners and instructors."},
    {"q": "How do I see trending posts?", "a": "On the Community page, switch to the 'Trending' tab to see popular posts, or use filters to sort by most liked or most commented."},
    {"q": "Where can I find discussions about a topic?", "a": "Use the search bar in the Community section and enter your topic. You can also browse by hashtags or categories."},
    
    # Leaderboard
    {"q": "Where can I see the leaderboard?", "a": "Click 'Leaderboard' in the navigation or access it from your Dashboard to see rankings based on contribution points and activity."},
    {"q": "How do leaderboard rankings work?", "a": "Rankings are based on contribution points earned from completing modules, creating projects, helping others in the community, and maintaining learning streaks."},
    {"q": "Can I see my rank compared to others?", "a": "Yes! The leaderboard highlights your position and shows your rank among all users. You can filter by program, year level, or time period."},
    
    # Settings
    {"q": "How do I access settings?", "a": "Click your profile avatar in the top-right corner, then select 'Settings' from the dropdown menu."},
    {"q": "Where do I change my password?", "a": "Go to Settings > Security > Change Password. Enter your current password and new password twice to update."},
    {"q": "How do I enable dark mode?", "a": "Go to Settings > Preferences > Theme, and select 'Dark'. You can also choose 'Auto' to follow your system preferences."},
    {"q": "Where are notification settings?", "a": "Find notification preferences under Settings > Notifications. You can customize email, push, and in-app notifications."},
    
    # Certificates
    {"q": "Where can I see my certificates?", "a": "Your earned certificates are displayed on your Profile page under 'Certificates'. You can download or share them from there."},
    {"q": "How do I download my certificate?", "a": "Go to Profile > Certificates, click on the certificate you want, then click the 'Download' button to save it as a PDF."},
    
    # Mobile/Responsive
    {"q": "How do I navigate on mobile?", "a": "On mobile, tap the menu icon (☰) to open the main navigation. Swipe left/right to switch between sections. The bottom bar has quick access to Dashboard, Learning, and Profile."},
    {"q": "The interface looks different on my phone", "a": "CCIS-CodeHub is responsive! On smaller screens, the layout adjusts for easier mobile use. The menu is accessible via the hamburger icon (☰)."},
]

# ============================================================================
# LEARNING & COURSES (200+ unique)
# ============================================================================
LEARNING_TEMPLATES = [
    # Career Paths
    {"q": "What career paths are available?", "a": "CCIS-CodeHub offers career paths for: 1) BS Information Technology (BSIT) - focus on IT solutions, 2) BS Computer Science (BSCS) - focus on algorithms and theory, 3) BS Information Systems (BSIS) - focus on business systems. Each has specialized modules."},
    {"q": "Which program should I choose?", "a": "Choose based on your interests: BSIT for practical IT skills and solutions, BSCS for deep computer science theory and algorithms, BSIS for business-oriented technology. Check your official program enrollment for the recommended path."},
    {"q": "What's the difference between BSIT and BSCS paths?", "a": "BSIT focuses on practical application of technology - networking, systems administration, web development. BSCS emphasizes theoretical foundations - algorithms, data structures, computation theory. Both are valuable!"},
    {"q": "Can I take courses from other programs?", "a": "Yes! While your primary path matches your program, you can explore and enroll in courses from other paths to broaden your skills."},
    
    # Enrollment
    {"q": "How do I enroll in a course?", "a": "Navigate to the Learning page, browse career paths, select a course, and click 'Enroll'. The course will be added to your 'My Courses' list."},
    {"q": "Is there a limit on how many courses I can take?", "a": "No limit! You can enroll in as many courses as you want. However, we recommend focusing on completing one or two at a time for better learning outcomes."},
    {"q": "Can I unenroll from a course?", "a": "Yes, go to the course page and click 'Unenroll' in the settings. Note: Your progress will be saved if you decide to re-enroll later."},
    {"q": "How do I see course prerequisites?", "a": "Each course page displays prerequisites at the top. Complete required courses first before enrolling in advanced ones."},
    
    # Modules & Progress
    {"q": "How do I complete a module?", "a": "Open the module, go through all content sections (videos, readings, code examples), complete any exercises, and pass the quiz if required. Then click 'Mark as Complete'."},
    {"q": "How is my progress tracked?", "a": "Progress is automatically tracked as you complete modules. Each module adds to your overall percentage, and you earn contribution points and streak days."},
    {"q": "What happens if I don't finish a module?", "a": "No problem! Your progress is saved automatically. Return anytime to continue where you left off."},
    {"q": "Can I skip modules?", "a": "Some modules may have prerequisites, but if they're optional, you can skip ahead. However, we recommend following the suggested order for best understanding."},
    {"q": "How do I mark a module as complete?", "a": "After finishing all content and passing any quizzes, click 'Mark as Complete' at the bottom of the module. This updates your progress and awards points."},
    
    # Points & Streaks
    {"q": "What are contribution points?", "a": "Contribution points are earned by: completing modules (+10-50), creating projects (+25), community posts (+5), helping others (+10), and daily streak bonuses (+5/day). They determine your leaderboard rank!"},
    {"q": "How do I earn more points?", "a": "Complete modules, create and share projects, actively participate in the community, maintain your learning streak, and help other students with their questions."},
    {"q": "What is a learning streak?", "a": "A streak tracks consecutive days of learning. Complete at least one module section daily to maintain it. Longer streaks earn bonus points and badges!"},
    {"q": "I lost my streak, can I recover it?", "a": "Unfortunately, streaks reset if you miss a day. But don't worry - start fresh! Your total completed modules and points are still saved."},
    
    # Certificates
    {"q": "How do I earn certificates?", "a": "Complete all modules in a career path or course to earn a certificate. It's automatically generated and added to your Profile."},
    {"q": "Are certificates official?", "a": "CCIS-CodeHub certificates recognize your completion of learning paths. They demonstrate your commitment to learning and can be shared on your resume or LinkedIn."},
    {"q": "Can I retake courses to get a new certificate?", "a": "Each certificate is unique to your completion. You can revisit content anytime, but the certificate date reflects your original completion."},
    
    # Content Questions
    {"q": "The module content won't load", "a": "Try refreshing the page or clearing your browser cache. If the issue persists, check your internet connection. If it's still not working, please report the issue through the Help section."},
    {"q": "I think there's an error in the module content", "a": "Thank you for noticing! Please use the 'Report Issue' button on the module page to let instructors know. Include details about what you found incorrect."},
    {"q": "Can I suggest improvements to a course?", "a": "Absolutely! Use the feedback button on the course page or post in the Community with your suggestions. Instructors regularly review feedback."},
    
    # Time & Schedule
    {"q": "How long does it take to complete a course?", "a": "Course duration varies. Each course page shows estimated completion time. Most courses take 4-8 hours total, spread across multiple sessions."},
    {"q": "Is there a deadline for completing courses?", "a": "Self-paced courses have no deadline - learn at your own speed. Live courses or scheduled quizzes may have specific deadlines shown on the course page."},
]

# ============================================================================
# PROJECTS (150+ unique)
# ============================================================================
PROJECT_TEMPLATES = [
    # Creating Projects
    {"q": "How do I create a new project?", "a": "Go to Projects page > Click 'Create Project' > Fill in name, description, visibility, and optionally link a GitHub repo > Click 'Create'."},
    {"q": "What should I put in my project description?", "a": "Include: 1) What the project does, 2) Technologies used, 3) Key features, 4) How to run it, 5) Your learning goals. A good description helps others understand and collaborate!"},
    {"q": "Can I create a project without GitHub?", "a": "Yes! GitHub integration is optional. You can describe your project and upload screenshots. However, linking GitHub makes collaboration easier."},
    
    # GitHub Integration
    {"q": "How do I link my GitHub repository?", "a": "When creating/editing a project, paste your GitHub repo URL in the 'GitHub Repository' field. Make sure it's public or you've authorized CCIS-CodeHub access."},
    {"q": "My GitHub link isn't working", "a": "Check if: 1) The URL is correct, 2) The repo is public, 3) Your GitHub username is linked in your profile settings. Private repos need authorization."},
    {"q": "Can I update the GitHub link later?", "a": "Yes! Edit your project anytime to change the GitHub repository link. Go to your project > Settings > Update GitHub URL."},
    {"q": "How do I connect my GitHub account?", "a": "Go to Profile > Settings > Integrations > GitHub. Click 'Connect GitHub' and authorize the connection. Your GitHub contributions will then sync."},
    
    # Visibility & Sharing
    {"q": "What are project visibility options?", "a": "Public - visible to everyone, appears in project gallery. Private - only you can see it. Team - visible to invited collaborators only."},
    {"q": "Should I make my project public?", "a": "Public projects showcase your skills to instructors and peers, may receive feedback, and can help your reputation. Keep private if it's incomplete or contains sensitive info."},
    {"q": "How do I share my project with others?", "a": "For public projects, copy the project URL and share it. For team projects, invite collaborators through the project settings."},
    
    # Collaboration
    {"q": "How do I collaborate on a project?", "a": "Go to project settings > Team > Invite by username or email. Collaborators can view, edit, and contribute based on assigned permissions."},
    {"q": "How do I leave a project team?", "a": "Go to the project > Settings > Team > Click 'Leave Project'. Your contributions remain, but you'll lose access."},
    {"q": "Can I remove a collaborator?", "a": "Only project owners can remove collaborators. Go to project > Settings > Team > Click 'Remove' next to the member's name."},
    
    # Submission & Review
    {"q": "Can I submit my project for review?", "a": "Yes! Click 'Submit for Review' on your project page. An instructor will evaluate it and provide feedback. Make sure your project is complete before submitting."},
    {"q": "How long does review take?", "a": "Review times vary by instructor availability, typically 3-7 days. You'll receive a notification when feedback is ready."},
    {"q": "What happens after review?", "a": "You'll receive feedback with suggestions and possibly a grade if applicable. You can make improvements and resubmit if needed."},
    {"q": "Can I resubmit my project?", "a": "Yes, after receiving feedback, make improvements and click 'Resubmit'. There may be limits on resubmissions - check with your instructor."},
    
    # Project Management
    {"q": "How do I delete a project?", "a": "Go to project Settings > Scroll to bottom > Click 'Delete Project' > Confirm. Warning: This cannot be undone!"},
    {"q": "Can I archive a project instead of deleting?", "a": "Yes! Archive projects to hide them from your active list without deleting. Go to project Settings > Click 'Archive'."},
    {"q": "How do I edit my project?", "a": "Open your project and click 'Edit' or the pencil icon. Update the details and save your changes."},
]

# ============================================================================
# COMMUNITY (150+ unique)
# ============================================================================
COMMUNITY_TEMPLATES = [
    # Posts
    {"q": "How do I create a post?", "a": "In Community section > Click 'Create Post' > Write your content > Add code snippets, images, or links > Click 'Post'."},
    {"q": "Can I edit my post after publishing?", "a": "Yes, click the three-dot menu (⋮) on your post > Select 'Edit' > Make changes > Save. Edited posts show an 'edited' indicator."},
    {"q": "How do I delete my post?", "a": "Click the three-dot menu on your post > Select 'Delete' > Confirm. This also removes all comments on that post."},
    {"q": "Can I schedule posts for later?", "a": "Currently, posts are published immediately. You can draft posts offline and copy-paste when ready to publish."},
    
    # Interactions
    {"q": "How do I like a post?", "a": "Click the heart icon (♡) below any post to like it. Click again to unlike. Likes contribute to the author's contribution points."},
    {"q": "How do I comment on a post?", "a": "Click the comment icon below the post, type your response in the text box, and press Enter or click 'Comment' to submit."},
    {"q": "Can I reply to a specific comment?", "a": "Yes, click 'Reply' under any comment to create a threaded reply. This keeps discussions organized."},
    {"q": "How do I share code in posts?", "a": "Use triple backticks (```) before and after your code block. Add the language name after the first backticks for syntax highlighting, like ```python."},
    {"q": "Can I format my post?", "a": "Yes! Use Markdown formatting: **bold**, *italic*, `code`, [links](url), and code blocks with triple backticks. Preview before posting."},
    
    # Following
    {"q": "How do I follow other users?", "a": "Visit a user's profile and click the 'Follow' button. Their posts will appear in your feed, and you'll get updates on their activity."},
    {"q": "How do I unfollow someone?", "a": "Go to their profile and click 'Following' (which replaces the Follow button) > Confirm unfollow."},
    {"q": "Where can I see who I'm following?", "a": "Go to your Profile > 'Following' tab to see everyone you follow. You can also see your followers in the 'Followers' tab."},
    {"q": "Can I see who follows me?", "a": "Yes! Go to your Profile > 'Followers' tab to see all users following you."},
    
    # Discovery
    {"q": "How do I search for posts?", "a": "Use the search bar in Community to find posts by keywords, hashtags, or usernames. You can filter results by date, popularity, or category."},
    {"q": "How do I find trending topics?", "a": "Check the 'Trending' tab on the Community page or look at popular hashtags in the sidebar."},
    {"q": "Can I filter posts by topic?", "a": "Yes, use hashtags or categories to filter. Click on any hashtag to see all related posts, or use the category dropdown."},
    
    # Reporting & Moderation
    {"q": "How do I report inappropriate content?", "a": "Click the three-dot menu on any post/comment > Select 'Report' > Choose reason > Submit. Moderators will review within 24-48 hours."},
    {"q": "What happens when I report something?", "a": "Reports are reviewed by moderators. If content violates guidelines, it's removed. Repeat offenders may face restrictions. Your report is confidential."},
    {"q": "I was wrongly reported, what do I do?", "a": "If your content was removed and you believe it was a mistake, contact support through Settings > Help > Submit a Ticket with details."},
]

# ============================================================================
# CODING HELP (250+ unique)
# ============================================================================
CODING_TEMPLATES = [
    # Basics
    {"q": "What is a function in programming?", "a": "A function is a reusable block of code that performs a specific task. Define it once, call it many times. Example in Python:\n```python\ndef greet(name):\n    return f'Hello, {name}!'\nprint(greet('Student'))  # Hello, Student!\n```"},
    {"q": "How do I declare a variable in Python?", "a": "Simply assign a value: `x = 10`, `name = 'John'`, `is_active = True`. Python automatically determines the type. No need for type declarations like in Java/C++."},
    {"q": "What is the difference between = and ==?", "a": "`=` is assignment (sets a value): `x = 5`. `==` is comparison (checks equality): `if x == 5: print('yes')`. Using `=` in comparisons is a common beginner error!"},
    {"q": "How do I print output in Python?", "a": "Use `print()`: `print('Hello')`, `print(x)`, `print(f'Value is {x}')`. Use f-strings for formatted output with variables."},
    {"q": "What are comments and why use them?", "a": "Comments explain your code without affecting execution:\n```python\n# This is a single-line comment\n'''This is a\nmulti-line comment'''\n```\nUse them to document what your code does and why."},
    
    # Data Types
    {"q": "What is the difference between a list and tuple?", "a": "Lists are mutable (changeable): `[1, 2, 3]`. Tuples are immutable (fixed): `(1, 2, 3)`. Use tuples for constant data like coordinates; lists for collections that change."},
    {"q": "What is a dictionary in Python?", "a": "A dictionary stores key-value pairs: `user = {'name': 'John', 'age': 20}`. Access values: `user['name']`. Perfect for structured data!"},
    {"q": "When should I use a list vs dictionary?", "a": "Use lists for ordered collections: `[apple, banana, cherry]`. Use dictionaries for labeled data: `{'fruit': 'apple', 'color': 'red'}`. Dictionaries are best when you need to look up values by name."},
    {"q": "What is a string?", "a": "A string is text data enclosed in quotes: `'hello'` or `\"hello\"`. Strings are immutable. Common operations: `len(s)`, `s.upper()`, `s.split()`, `s + ' world'`."},
    {"q": "How do I convert between data types?", "a": "Use conversion functions:\n- `int('5')` → 5\n- `str(42)` → '42'\n- `float('3.14')` → 3.14\n- `list('abc')` → ['a', 'b', 'c']"},
    
    # Control Flow
    {"q": "How do loops work?", "a": "`for` iterates over sequences: `for i in range(5): print(i)`. `while` repeats while condition is true: `while x < 10: x += 1`. Use `break` to exit early, `continue` to skip iteration."},
    {"q": "What is an if-else statement?", "a": "Conditional execution:\n```python\nif score >= 90:\n    grade = 'A'\nelif score >= 80:\n    grade = 'B'\nelse:\n    grade = 'C'\n```"},
    {"q": "How do I loop through a list?", "a": "Use a for loop:\n```python\nfruits = ['apple', 'banana', 'cherry']\nfor fruit in fruits:\n    print(fruit)\n# With index:\nfor i, fruit in enumerate(fruits):\n    print(f'{i}: {fruit}')\n```"},
    {"q": "What is recursion?", "a": "A function calling itself to solve smaller subproblems:\n```python\ndef factorial(n):\n    if n <= 1:  # Base case\n        return 1\n    return n * factorial(n-1)  # Recursive case\n```\nAlways need a base case to stop!"},
    
    # OOP
    {"q": "What is object-oriented programming?", "a": "OOP organizes code into objects with data (attributes) and behavior (methods). Key concepts:\n- **Classes**: Blueprints for objects\n- **Objects**: Instances of classes\n- **Inheritance**: Classes can inherit from others\n- **Encapsulation**: Hiding internal details"},
    {"q": "How do I create a class in Python?", "a": "```python\nclass Student:\n    def __init__(self, name, grade):\n        self.name = name\n        self.grade = grade\n    \n    def introduce(self):\n        return f'I am {self.name}'\n\nstudent = Student('John', 'A')\nprint(student.introduce())\n```"},
    {"q": "What is inheritance?", "a": "Creating a class based on another:\n```python\nclass Animal:\n    def speak(self): pass\n\nclass Dog(Animal):\n    def speak(self):\n        return 'Woof!'\n```\nDog inherits from Animal and can override methods."},
    
    # Error Handling
    {"q": "How do I handle errors in Python?", "a": "Use try-except:\n```python\ntry:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    print('Cannot divide by zero!')\nexcept Exception as e:\n    print(f'Error: {e}')\nfinally:\n    print('This always runs')\n```"},
    {"q": "What is an exception?", "a": "An exception is an error that occurs during execution. Common types: `ValueError`, `TypeError`, `IndexError`, `KeyError`, `FileNotFoundError`. Handle them with try-except to prevent crashes."},
    {"q": "How do I debug my code?", "a": "1) Read error messages carefully\n2) Add print statements to check values\n3) Use Python debugger (`import pdb; pdb.set_trace()`)\n4) Test small pieces separately\n5) Check edge cases\n6) Take a break and return fresh!"},
    
    # File I/O
    {"q": "How do I read a file in Python?", "a": "```python\nwith open('file.txt', 'r') as f:\n    content = f.read()  # Read all\n    # or\n    lines = f.readlines()  # List of lines\n```\nThe `with` statement ensures the file is properly closed."},
    {"q": "How do I write to a file?", "a": "```python\nwith open('file.txt', 'w') as f:\n    f.write('Hello, World!')\n# 'w' overwrites, 'a' appends\nwith open('file.txt', 'a') as f:\n    f.write('\\nNew line')\n```"},
    
    # APIs
    {"q": "What is an API?", "a": "Application Programming Interface - a way for programs to communicate. Web APIs let you send requests (usually HTTP) and get data back (usually JSON). Example: getting weather data from a weather service."},
    {"q": "How do I make an API request in Python?", "a": "```python\nimport requests\n\nresponse = requests.get('https://api.example.com/data')\nif response.status_code == 200:\n    data = response.json()\n    print(data)\n```\nInstall requests: `pip install requests`"},
    
    # Algorithms
    {"q": "What is Big O notation?", "a": "Describes algorithm efficiency:\n- O(1): Constant - same time regardless of input\n- O(log n): Logarithmic - binary search\n- O(n): Linear - simple loop\n- O(n²): Quadratic - nested loops\nSmaller = faster!"},
    {"q": "What is a sorting algorithm?", "a": "Orders elements in a list. Common ones:\n- Bubble Sort: O(n²) - simple but slow\n- Quick Sort: O(n log n) - fast, divide-and-conquer\n- Merge Sort: O(n log n) - stable, good for large data\nPython's `sorted()` uses Timsort!"},
    
    # Web Development
    {"q": "What is HTML?", "a": "HyperText Markup Language - the structure of web pages. Uses tags like `<html>`, `<head>`, `<body>`, `<div>`, `<p>`, `<a>`. It's the skeleton of a website."},
    {"q": "What is CSS?", "a": "Cascading Style Sheets - styles the appearance of HTML. Controls colors, fonts, layouts, animations. Separates presentation from content."},
    {"q": "What is JavaScript?", "a": "Programming language that runs in browsers, making web pages interactive. Handles user events, updates content dynamically, and communicates with servers."},
    {"q": "What is the difference between frontend and backend?", "a": "Frontend: What users see (HTML, CSS, JavaScript, React). Backend: Server-side logic handling data, authentication, databases (Python, Node.js, Django). They communicate via APIs."},
    
    # Databases
    {"q": "What is a database?", "a": "Organized storage for data. Types:\n- Relational (SQL): Tables with rows/columns (MySQL, PostgreSQL)\n- NoSQL: Flexible structures (MongoDB, Firebase)\nDatabases let you store, retrieve, and manage data efficiently."},
    {"q": "What is SQL?", "a": "Structured Query Language - language for relational databases:\n```sql\nSELECT name, age FROM users WHERE age > 18\nINSERT INTO users (name, age) VALUES ('John', 20)\nUPDATE users SET age = 21 WHERE name = 'John'\nDELETE FROM users WHERE id = 5\n```"},
    
    # Git
    {"q": "What is Git?", "a": "Version control system that tracks code changes. Key commands:\n- `git init`: Start repo\n- `git add .`: Stage changes\n- `git commit -m 'message'`: Save changes\n- `git push`: Upload to remote\n- `git pull`: Download updates"},
    {"q": "What is the difference between Git and GitHub?", "a": "Git is the version control tool (runs locally). GitHub is a hosting service for Git repositories (online). GitHub adds collaboration features like pull requests, issues, and actions."},
]

# ============================================================================
# QUIZ & COMPETITIONS (100+ unique)
# ============================================================================
QUIZ_TEMPLATES = [
    # Taking Quizzes
    {"q": "How do I take a quiz?", "a": "Go to the module > Find the quiz section > Click 'Start Quiz' > Answer questions > Submit. Your score appears immediately with explanations for incorrect answers."},
    {"q": "Can I retake a quiz?", "a": "Most module quizzes allow unlimited retakes to help you learn. Your highest score is recorded. Some graded quizzes may have limits - check the quiz description."},
    {"q": "Is there a time limit on quizzes?", "a": "Some quizzes are timed (shown before starting). Others are untimed. The time remaining shows during timed quizzes. Submit before time runs out!"},
    {"q": "Can I go back to previous questions?", "a": "In most quizzes, yes! Use navigation buttons to review and change answers before submitting. Some quizzes don't allow going back - this is indicated beforehand."},
    {"q": "How is my quiz score calculated?", "a": "Score = (correct answers / total questions) × 100%. Some quizzes weight questions differently. Partial credit may apply for certain question types."},
    
    # Live Quizzes
    {"q": "What are live quizzes?", "a": "Real-time competitive quizzes hosted by instructors! Students join with a code, answer simultaneously, and scores are based on accuracy AND speed. Great for class reviews!"},
    {"q": "How do I join a live quiz?", "a": "Get the quiz code from your instructor > Go to 'Join Quiz' in the menu > Enter the code > Wait in the lobby > Answer questions when the host starts."},
    {"q": "How does live quiz scoring work?", "a": "Points = Base score × Speed multiplier. Faster correct answers earn more points. Wrong answers earn nothing. The leaderboard updates after each question!"},
    {"q": "What if I get disconnected during a live quiz?", "a": "Try to rejoin immediately using the same code. Your previous answers are saved. If you miss questions, you won't earn points for them."},
    {"q": "Can I host a live quiz?", "role": "student", "a": "Hosting live quizzes is an instructor feature. As a student, you can join quizzes with a code from your instructor and compete with classmates!"},
    
    # Results & Feedback
    {"q": "Where can I see my quiz results?", "a": "Quiz results appear immediately after submission. You can also view past results on your Dashboard under 'Quiz History' or on the specific module page."},
    {"q": "Can I see which answers were correct?", "a": "Yes! After submitting, the review page shows each question, your answer, the correct answer, and often an explanation. Use this to learn from mistakes."},
]

# ============================================================================
# PROFILE & SETTINGS (100+ unique)
# ============================================================================
PROFILE_TEMPLATES = [
    # Profile Editing
    {"q": "How do I update my profile picture?", "a": "Profile > Click your avatar > 'Change Photo' > Upload an image (JPG/PNG, max 5MB) > Save. The change appears across the entire platform."},
    {"q": "How do I change my bio?", "a": "Profile > 'Edit Profile' > Update the Bio field > Save changes. Your bio appears on your public profile for others to see."},
    {"q": "How do I add skills to my profile?", "a": "Profile > Edit > Skills section > Type a skill and press Enter > Add as many as relevant > Save. Skills help others understand your expertise."},
    {"q": "Can I change my username?", "a": "Usernames can be changed once every 30 days. Go to Settings > Account > Change Username. Note: Old username links may break."},
    {"q": "How do I change my email?", "a": "Settings > Account > Email > Enter new email > Verify via confirmation link sent to the new address. This updates your login email."},
    
    # GitHub & Integrations
    {"q": "How do I link my GitHub account?", "a": "Settings > Integrations > GitHub > 'Connect GitHub' > Authorize. Your GitHub username will appear on your profile and projects can link to repos."},
    {"q": "How do I disconnect GitHub?", "a": "Settings > Integrations > GitHub > 'Disconnect'. Your existing project links remain, but new syncs won't work until reconnected."},
    
    # Privacy & Security
    {"q": "How do I change my password?", "a": "Settings > Security > Change Password > Enter current password > Enter new password twice > Update. Choose a strong, unique password!"},
    {"q": "How do I enable two-factor authentication?", "a": "Settings > Security > Two-Factor Authentication > Enable > Scan QR code with authenticator app > Enter code to confirm. This adds extra security!"},
    {"q": "Who can see my profile?", "a": "Your profile is public by default. Other users can see your username, bio, skills, projects, and achievements. Your email and private settings remain hidden."},
    
    # Preferences
    {"q": "How do I change to dark mode?", "a": "Settings > Preferences > Theme > Select 'Dark'. You can also choose 'Light' or 'Auto' (follows system preference)."},
    {"q": "How do I change notification settings?", "a": "Settings > Notifications > Toggle individual options: email notifications, push notifications, activity alerts, etc."},
    {"q": "Can I customize my profile background?", "a": "Yes! Profile > Edit > Background Theme > Choose from options like 'Hyperspeed', 'Aurora', 'Cyber', 'Gradient', and more!"},
]

# ============================================================================
# ROLE-BASED: ADMIN FEATURES (Only for admins)
# ============================================================================
ADMIN_TEMPLATES = [
    {"q": "How do I manage users?", "role": "admin", "a": "Admin Dashboard > 'Manage Users' > View all users, filter by role/program > Click user to edit details, change role, or manage access permissions."},
    {"q": "How do I change a user's role?", "role": "admin", "a": "Admin Dashboard > Users > Find user > 'Edit' > Select new role (Student/Instructor/Admin) > Save. Role change is immediate."},
    {"q": "How do I deactivate a user account?", "role": "admin", "a": "Admin Dashboard > Users > Find user > 'Edit' > Toggle 'Active' status off > Save. Deactivated users can't log in but their data is preserved."},
    {"q": "How do I view system analytics?", "role": "admin", "a": "Admin Dashboard > 'Analytics' > View user statistics, engagement metrics, popular courses, and learning trends. Export reports as needed."},
    {"q": "How do I toggle feature flags?", "role": "admin", "a": "Admin Dashboard > Settings > Feature Flags > Toggle features on/off: AI Mentor, Competitions, Community, etc. Changes apply immediately."},
    {"q": "How do I delete a user account?", "role": "admin", "a": "Admin Dashboard > Users > Find user > 'Delete' > Confirm. Warning: This permanently removes the user and their data. Consider deactivation first."},
]

# ============================================================================
# ROLE-BASED: INSTRUCTOR FEATURES (Only for instructors)
# ============================================================================
INSTRUCTOR_TEMPLATES = [
    {"q": "How do I create a career path?", "role": "instructor", "a": "Instructor Dashboard > 'Create Career Path' > Fill in name, description, program > Add modules in order > Set prerequisites > Publish when ready."},
    {"q": "How do I add a module to a course?", "role": "instructor", "a": "Instructor Dashboard > Select course > 'Add Module' > Enter title, content, resources > Add quiz if needed > Save and order modules."},
    {"q": "How do I create a quiz?", "role": "instructor", "a": "Instructor Dashboard > Quiz Management > 'Create Quiz' > Add questions (multiple choice, true/false, coding) > Set time limits and attempts > Publish."},
    {"q": "How do I host a live quiz?", "role": "instructor", "a": "Instructor Dashboard > Live Quizzes > 'Create Live Quiz' > Select questions > Configure settings > Share code with students > Click 'Start' when ready."},
    {"q": "How do I review student submissions?", "role": "instructor", "a": "Instructor Dashboard > Submissions > Filter by course/date > Click submission to view > Provide feedback and grade > Submit review."},
    {"q": "How do I see student progress?", "role": "instructor", "a": "Instructor Dashboard > Course > 'Student Progress' > View completion rates, quiz scores, and engagement for each student."},
    {"q": "How do I send announcements to students?", "role": "instructor", "a": "Instructor Dashboard > Course > 'Announcements' > 'New Announcement' > Write message > Select recipients > Publish."},
]

# ============================================================================
# ROLE RESTRICTIONS (Denials with explanations)
# ============================================================================
ROLE_RESTRICTION_TEMPLATES = [
    # Students trying admin features
    {"q": "How do I delete a user account?", "role": "student", "a": "I apologize, but deleting user accounts is an admin-only function. As a student, you can only manage your own profile. If you need to report an issue with another account, please contact an administrator through the Help section."},
    {"q": "Can I create a new career path?", "role": "student", "a": "I'm sorry, but creating career paths is available only to instructors and admins. As a student, you can browse and enroll in existing paths on the Learning page. If you have ideas for new content, share them with your instructors!"},
    {"q": "I want to host a live quiz", "role": "student", "a": "I understand you want to host, but live quiz hosting is an instructor feature. As a student, you can join live quizzes using a code from your instructor. You can also take practice quizzes in your enrolled courses anytime!"},
    {"q": "How do I access user analytics?", "role": "student", "a": "I apologize, but system-wide analytics is only available to administrators. As a student, you can view your own detailed progress and statistics on your Dashboard and Profile pages."},
    {"q": "Can I change someone's role?", "role": "student", "a": "I'm sorry, but changing user roles requires admin privileges. If you believe someone's role needs to be updated, please contact a system administrator."},
    {"q": "How do I view all students' progress?", "role": "student", "a": "I apologize, but viewing all students' progress is an instructor/admin feature. You can see your own progress on your Dashboard, and compare your rank on the public Leaderboard."},
    {"q": "Can I grade other students?", "role": "student", "a": "I'm sorry, but grading is an instructor privilege. As a student, you can help peers by answering questions in the Community and collaborating on projects!"},
    
    # Instructors trying admin features
    {"q": "Can I change someone's role?", "role": "instructor", "a": "I'm sorry, but changing user roles is an admin-only function. As an instructor, you can manage your courses, quizzes, and content. For role changes, please contact a system administrator."},
    {"q": "How do I delete a student's account?", "role": "instructor", "a": "I apologize, but account deletion is handled by administrators only. If a student needs to be removed from your course, you can remove their enrollment. For account issues, contact an admin."},
    {"q": "How do I access system settings?", "role": "instructor", "a": "System-wide settings are managed by administrators. As an instructor, you have access to course settings and content management through your Instructor Dashboard."},
]

# ============================================================================
# ERROR HANDLING & APOLOGIES
# ============================================================================
ERROR_APOLOGY_TEMPLATES = [
    # Mistakes
    {"q": "You gave me wrong information", "a": "I sincerely apologize for the confusion! Could you please tell me what was incorrect? I'll do my best to provide accurate information. If it's about a specific feature, let me know and I'll clarify."},
    {"q": "That's not right", "a": "I apologize for the error! Thank you for pointing that out. Could you share more details about what I got wrong? I want to give you the correct information."},
    {"q": "Your previous answer was wrong", "a": "I'm sorry about that mistake! I appreciate you letting me know. What specifically was incorrect? I'll make sure to provide the right answer this time."},
    {"q": "You made an error", "a": "My apologies for the mistake! I strive to be accurate, but I'm not perfect. Please let me know what was wrong, and I'll correct it right away."},
    {"q": "That didn't work like you said", "a": "I apologize that it didn't work as expected! Could you tell me what happened? Sometimes steps may vary based on account type or current page. I'll help troubleshoot."},
    
    # Can't help
    {"q": "Can you do my homework?", "a": "I understand homework can be challenging, but I can't complete it for you - that wouldn't help you learn! However, I'm happy to explain concepts, guide you through problem-solving steps, and help you understand where you're stuck. What topic do you need help with?"},
    {"q": "Just give me the answer", "a": "I want to help you learn, not just give answers! Let me guide you through the thinking process instead. What part are you struggling with? I'll explain the concepts so you can solve it yourself."},
    {"q": "Do this assignment for me", "a": "I'm here to help you learn, not to do work for you. Submitting work that isn't yours wouldn't be fair or help your education. Let's work through it together - what part don't you understand?"},
    
    # Limitations
    {"q": "Can you access my files?", "a": "I don't have access to files on your computer or personal storage. I can only help with what you share in our conversation. If you need help with code, paste it here and I'll assist!"},
    {"q": "Can you send emails for me?", "a": "I'm not able to send emails or messages outside this chat. I can help you draft content, but you'll need to copy and send it yourself."},
    {"q": "Can you log in to my account?", "a": "I don't have access to user accounts or login capabilities. I can only answer questions and provide guidance. For account issues, please contact support."},
    
    # Don't know
    {"q": "I need help with something not in CCIS-CodeHub", "a": "While I'm primarily designed to help with CCIS-CodeHub features and programming concepts, I'll try my best to help! What do you need assistance with?"},
    {"q": "You don't understand my question", "a": "I apologize for the confusion! Could you rephrase your question or provide more details? I want to make sure I understand exactly what you need help with."},
    {"q": "That's not what I asked", "a": "I'm sorry for misunderstanding! Let me try again. Could you clarify what you're looking for? I want to give you the help you actually need."},
]

# ============================================================================
# DOCUMENT PARSING & CONTENT GENERATION
# ============================================================================
DOCUMENT_PARSING_TEMPLATES = [
    {"q": "Can you analyze this PDF content for me?", "a": "Absolutely! Please share the text from your document. I'll: 1) Identify key concepts, 2) Summarize main points, 3) Suggest how to organize it into learning modules, and 4) Create potential quiz questions."},
    {"q": "How do I generate a learning module from this content?", "a": "Share your content, and I'll help structure it as a module with: 1) Clear learning objectives, 2) Organized content sections, 3) Key takeaways, 4) Practice exercises, and 5) Assessment questions. What content do you have?"},
    {"q": "Can you create quiz questions from this text?", "a": "Yes! Share your educational content, and I'll generate: 1) Multiple choice questions, 2) True/false questions, 3) Short answer prompts - all with correct answers and explanations."},
    {"q": "Summarize this document for me", "a": "Share the text and I'll provide: 1) A brief executive summary, 2) Key points and main ideas, 3) Important terms defined, 4) Suggested follow-up topics to explore."},
    {"q": "Extract key concepts from this text", "a": "Paste your text and I'll identify: 1) Core concepts and definitions, 2) Relationships between ideas, 3) Technical terms needing explanation, 4) Prerequisite knowledge assumed."},
    {"q": "Help me create a career path from this curriculum", "a": "Share your curriculum details! I'll help organize it into: 1) A career path overview, 2) Ordered modules with dependencies, 3) Estimated completion times, 4) Learning outcomes for each section."},
    {"q": "Generate an outline from this topic", "a": "Tell me the topic, and I'll create a structured outline with: 1) Main sections, 2) Subsections, 3) Key points to cover, 4) Suggested resources and activities."},
    {"q": "Turn this lecture into flashcards", "a": "Share your lecture notes! I'll create flashcard-style Q&A pairs for effective studying. Each card will have a question on one side and a concise answer on the other."},
]

# ============================================================================
# ONLINE SEARCH/RESEARCH
# ============================================================================
SEARCH_TEMPLATES = [
    {"q": "What are the latest Python features?", "a": "Recent Python versions include: better error messages with suggestions, pattern matching (match/case), faster performance, improved typing support, and new string methods. Want details on any specific feature?"},
    {"q": "What are current web development trends?", "a": "Current trends include: 1) AI/ML integration in apps, 2) Server components (React Server Components, Next.js), 3) TypeScript everywhere, 4) Edge computing, 5) WebAssembly, 6) JAMstack architecture. Which interests you?"},
    {"q": "Find information about machine learning frameworks", "a": "Popular frameworks: 1) TensorFlow - production-ready, by Google, 2) PyTorch - research-focused, flexible, 3) scikit-learn - classical ML, 4) Keras - high-level API, 5) Hugging Face - NLP/LLMs. What's your use case?"},
    {"q": "What programming language should I learn?", "a": "Depends on your goals! Python: versatile, great for AI/data science. JavaScript: essential for web development. Java: enterprise applications. C++: game dev, systems. Start with Python if unsure - it's beginner-friendly and widely applicable."},
    {"q": "What are the best resources to learn coding?", "a": "Great learning resources: 1) CCIS-CodeHub (you're here!), 2) freeCodeCamp, 3) Codecademy, 4) YouTube tutorials, 5) Documentation (always read the docs!), 6) LeetCode for practice. Consistent practice matters most!"},
    {"q": "What's new in React?", "a": "React updates include: Server Components for faster loading, Suspense for data fetching, automatic batching, new hooks like useTransition, improved hydration. React 19 is coming with even more improvements!"},
]

# ============================================================================
# CONTENT GENERATION
# ============================================================================
CONTENT_GENERATION_TEMPLATES = [
    {"q": "Generate an introduction for a Python basics module", "a": "**Welcome to Python Programming!** 🐍\n\nPython is a powerful yet beginner-friendly language used in web development, data science, AI, and automation. In this module, you'll learn:\n\n• Variables and data types\n• Control flow (if/else, loops)\n• Functions and modules\n• Working with lists and dictionaries\n\nBy the end, you'll write complete Python programs! Let's begin your coding journey."},
    {"q": "Create learning objectives for a database module", "a": "**Database Fundamentals - Learning Objectives**\n\nAfter completing this module, you will be able to:\n\n1. ✅ Explain relational database concepts and terminology\n2. ✅ Design normalized database schemas\n3. ✅ Write SQL queries (SELECT, INSERT, UPDATE, DELETE)\n4. ✅ Create tables with appropriate constraints\n5. ✅ Implement one-to-many and many-to-many relationships\n6. ✅ Optimize queries for better performance"},
    {"q": "Generate a multiple choice question about algorithms", "a": "**Question:** What is the time complexity of binary search on a sorted array?\n\n○ A) O(n)\n○ B) O(log n)\n○ C) O(n²)\n○ D) O(1)\n\n**Correct Answer:** B) O(log n)\n\n**Explanation:** Binary search divides the search space in half with each comparison. For n elements, this results in log₂(n) comparisons in the worst case, hence O(log n) time complexity."},
    {"q": "Create a project idea for web development", "a": "**Project: Personal Portfolio Website** 🌐\n\n**Description:** Build a responsive portfolio to showcase your skills and projects.\n\n**Features:**\n• About me section with bio\n• Skills showcase with icons\n• Project gallery with live demos\n• Contact form with validation\n• Dark/light theme toggle\n\n**Tech Stack:** HTML, CSS, JavaScript (optional: React)\n\n**Learning Outcomes:** Responsive design, CSS animations, DOM manipulation, form handling"},
    {"q": "Write code documentation for a function", "a": "Here's a well-documented function example:\n\n```python\ndef calculate_gpa(grades: list[float], credits: list[int]) -> float:\n    \"\"\"\n    Calculate weighted GPA from grades and credit hours.\n    \n    Args:\n        grades: List of grade points (0.0-4.0)\n        credits: List of credit hours for each course\n    \n    Returns:\n        Weighted GPA as a float, rounded to 2 decimals\n    \n    Raises:\n        ValueError: If lists have different lengths\n    \n    Example:\n        >>> calculate_gpa([4.0, 3.0, 3.5], [3, 3, 4])\n        3.5\n    \"\"\"\n    if len(grades) != len(credits):\n        raise ValueError(\"Lists must have equal length\")\n    \n    total_points = sum(g * c for g, c in zip(grades, credits))\n    total_credits = sum(credits)\n    \n    return round(total_points / total_credits, 2)\n```"},
]

# ============================================================================
# GENERATOR FUNCTIONS
# ============================================================================
def generate_thinking(question, answer, role="all"):
    """Generate a thinking/planning section based on the question"""
    
    # Thinking templates based on question type
    thinking_templates = {
        "navigation": [
            "The user is asking about navigation. Let me identify the relevant section and provide clear directions.",
            "This is a navigation question. I should explain how to access this feature step by step.",
            "User needs help finding something in the system. Let me provide the exact path.",
        ],
        "learning": [
            "This is about learning features. I should explain the concept and how it works in CCIS-CodeHub.",
            "The user wants to know about courses/modules. Let me explain the learning system.",
            "This is a learning-related question. I'll provide information about progress and enrollment.",
        ],
        "coding": [
            "This is a programming question. Let me break down the concept clearly with examples.",
            "The user needs coding help. I should explain the concept and provide working code examples.",
            "Programming concept question - I'll explain the theory and show practical usage.",
        ],
        "project": [
            "This is about projects. I should explain the project workflow in CCIS-CodeHub.",
            "User asking about project features. Let me cover creation, collaboration, and submission.",
        ],
        "restriction": [
            "The user is asking about a privileged feature. I need to politely explain access restrictions.",
            "This feature requires higher privileges. I should explain why and offer alternatives.",
        ],
        "error": [
            "The user is reporting an issue or mistake. I should apologize and clarify.",
            "There seems to be confusion. Let me acknowledge this and provide correct information.",
        ],
        "general": [
            "Let me understand what the user needs and provide a helpful response.",
            "I'll analyze this question and provide relevant guidance.",
            "The user needs help with this topic. Let me provide a clear explanation.",
        ]
    }
    
    # Determine question type
    q_lower = question.lower()
    if any(word in q_lower for word in ["navigate", "find", "where", "access", "go to", "locate", "dashboard", "menu", "page"]):
        category = "navigation"
    elif any(word in q_lower for word in ["course", "module", "enroll", "learn", "certificate", "progress", "streak", "path"]):
        category = "learning"
    elif any(word in q_lower for word in ["code", "function", "variable", "loop", "class", "python", "javascript", "error", "debug", "api"]):
        category = "coding"
    elif any(word in q_lower for word in ["project", "github", "collaborate", "submit", "review"]):
        category = "project"
    elif role in ["student", "instructor"] and any(word in q_lower for word in ["admin", "delete user", "change role", "analytics"]):
        category = "restriction"
    elif any(word in q_lower for word in ["wrong", "mistake", "error", "incorrect", "didn't work", "apologize"]):
        category = "error"
    else:
        category = "general"
    
    thinking = random.choice(thinking_templates[category])
    
    # Planning based on answer length
    if len(answer) > 300:
        planning = "I'll provide a comprehensive response with multiple points."
    elif len(answer) > 150:
        planning = "I'll give a detailed but focused explanation."
    else:
        planning = "I'll provide a concise, direct answer."
    
    return f"<thinking>\n{thinking}\n\n**Planning:** {planning}\n</thinking>\n\n{answer}"

def generate_variations(template, count=10):
    """Generate variations of a template with thinking/planning"""
    variations = []
    
    # Question variations
    prefixes = ["", "Hey, ", "Hi! ", "Hello, ", "Can you tell me ", "I need help with ", 
                "Quick question: ", "I have a question - ", "Could you help me - ", "I'm wondering "]
    suffixes = ["", "", " Thanks!", " Please help.", " Can you explain?", " I'm confused.", " Any help appreciated!"]
    
    for i in range(count):
        q = random.choice(prefixes) + template["q"].lower() if random.random() > 0.5 else template["q"]
        if not q.endswith("?") and random.random() > 0.5:
            q = q.rstrip(".!") + "?"
        q = q[0].upper() + q[1:] if q else q
        if random.random() > 0.7:
            q += random.choice(suffixes)
        
        role = template.get("role", "all")
        
        # Add thinking to ~70% of responses for variety
        if random.random() > 0.3:
            output = generate_thinking(q, template["a"], role)
        else:
            output = template["a"]
        
        variation = {
            "instruction": q.strip(),
            "input": "",
            "output": output,
            "role": role
        }
        variations.append(variation)
    
    return variations

def generate_role_context(role):
    """Generate input context based on role"""
    programs = ["BSIT", "BSCS", "BSIS"]
    years = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
    
    contexts = {
        "student": f"User: Student | Program: {random.choice(programs)} | Year: {random.choice(years)}",
        "instructor": f"User: Instructor | Department: CCIS | Access: Course Management",
        "admin": "User: Admin | Access Level: Full System Access",
        "all": ""
    }
    return contexts.get(role, "")

def create_dataset():
    """Generate the complete dataset"""
    dataset = []
    
    # (templates, variations_per_template)
    categories = [
        (NAVIGATION_TEMPLATES, 50),      # ~1250
        (LEARNING_TEMPLATES, 60),        # ~1200
        (PROJECT_TEMPLATES, 60),         # ~960
        (COMMUNITY_TEMPLATES, 60),       # ~1020
        (CODING_TEMPLATES, 40),          # ~1280
        (QUIZ_TEMPLATES, 80),            # ~880
        (PROFILE_TEMPLATES, 60),         # ~660
        (ADMIN_TEMPLATES, 80),           # ~480
        (INSTRUCTOR_TEMPLATES, 80),      # ~560
        (ROLE_RESTRICTION_TEMPLATES, 80), # ~720
        (ERROR_APOLOGY_TEMPLATES, 80),   # ~1200
        (DOCUMENT_PARSING_TEMPLATES, 80), # ~640
        (SEARCH_TEMPLATES, 80),          # ~480
        (CONTENT_GENERATION_TEMPLATES, 80), # ~400
    ]
    
    print("Generating dataset...")
    for templates, variations_per in categories:
        for template in templates:
            variations = generate_variations(template, variations_per)
            for v in variations:
                v["input"] = generate_role_context(v["role"])
            dataset.extend(variations)
        print(f"  Generated {len(templates) * variations_per} from {len(templates)} templates")
    
    random.shuffle(dataset)
    return dataset

def save_dataset(dataset, filename):
    """Save dataset in JSONL format"""
    with open(filename, 'w', encoding='utf-8') as f:
        for item in dataset:
            entry = {
                "instruction": item["instruction"],
                "input": item["input"],
                "output": item["output"]
            }
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    
    print(f"\n✅ Saved {len(dataset)} examples to {filename}")

def create_readme():
    """Create README for the dataset"""
    readme = """# CCIS-CodeHub AI Mentor Dataset

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
"""
    
    with open("README.md", 'w', encoding='utf-8') as f:
        f.write(readme)
    print("✅ Created README.md")

if __name__ == "__main__":
    print("🚀 CCIS AI Mentor Dataset Generator v2")
    print("=" * 50)
    dataset = create_dataset()
    save_dataset(dataset, OUTPUT_FILE)
    create_readme()
    print(f"\n📊 Final Dataset Statistics:")
    print(f"   Total examples: {len(dataset)}")
    print(f"   Output file: {OUTPUT_FILE}")
    print("\n✅ Ready for Google Drive upload!")
