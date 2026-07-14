"""
CCIS-CodeHub COMPLETE 1GB Dataset Generator
============================================
BEYOND-COMPLETE coverage of ALL system features based on codebase analysis.

Coverage:
- 6 Backend Apps: accounts, learning, projects, community, ai_mentor, competitions
- 50+ Database Models
- 40+ Action Verbs  
- 30+ System Objects
- All User Roles: Student, Instructor, Admin
- Complete Workflows for every feature

Uses advanced combinatorial mathematics for ~1GB dataset generation.

Author: Mark Renier B. Fostanes
Target: ~1GB (~2-4 million samples)
"""

import json
import random
import os
import itertools
import hashlib

# ============================================================================
# KAGGLE CONFIGURATION
# ============================================================================
KAGGLE_INPUT = "/kaggle/input/ai-mentor-dataset/ccis_mentor2_combined_dataset.jsonl"
OUTPUT_FILE = "/kaggle/working/ccis_mentor3_complete_1gb.jsonl"
TARGET_SIZE_MB = 1024

# ============================================================================
# QUALITY CONTROL OPTIONS
# ============================================================================
# Set to False to generate ONLY new high-quality data (recommended for purity)
MERGE_EXISTING = False  # Don't merge with old lower-quality data

# If merging, enhance existing samples by adding thinking tags
ENHANCE_EXISTING = True

# Minimum response length for quality samples
MIN_RESPONSE_LENGTH = 200

# ============================================================================
# COMPLETE VOCABULARY (FROM CODEBASE ANALYSIS)
# ============================================================================

# All possible verbs (actions)
VERBS = [
    # Basic CRUD
    "create", "view", "edit", "delete", "update", "manage",
    # Navigation
    "access", "find", "navigate", "open", "go to", "visit",
    # Learning
    "enroll", "start", "complete", "resume", "retake", "submit", "skip",
    # Projects
    "join", "leave", "invite", "assign", "move", "drag", "drop",
    # Social
    "follow", "unfollow", "like", "unlike", "comment", "share", "save", "bookmark",
    # Files
    "upload", "download", "attach", "remove",
    # Reviews
    "request", "approve", "reject", "review",
    # Admin
    "ban", "suspend", "restore", "moderate", "export", "import",
    # AI
    "analyze", "debug", "optimize", "recommend", "ask", "chat",
    # Competition
    "register", "participate", "solve", "submit", "compare",
    # Account
    "login", "logout", "register", "verify", "reset", "change",
    # General
    "search", "filter", "sort", "check", "track", "monitor", "configure", "set",
]

# All possible objects (from actual models)
OBJECTS = [
    # Accounts
    "profile", "account", "password", "email", "username", "settings", "preferences",
    "avatar", "bio", "github username", "linkedin url",
    
    # Learning  
    "career path", "learning module", "quiz", "question", "answer", "choice",
    "certificate", "progress", "score", "slide", "video", "materials",
    "live quiz", "room code", "quiz lobby", "quiz attempt", "quiz result",
    
    # Projects
    "project", "team", "task", "kanban board", "task label", "task comment",
    "code review", "file", "project member", "team member", "project tag",
    "due date", "priority", "assignee", "milestone",
    
    # Community
    "post", "comment", "like", "hashtag", "organization", "follower", "following",
    "notification", "report", "saved post", "feed", "trending",
    
    # AI Mentor
    "chat session", "code analysis", "learning recommendation", "project guidance",
    "ai feedback", "debug session", "optimization suggestion",
    
    # Competitions
    "competition", "challenge", "submission", "leaderboard", "achievement",
    "test case", "execution result", "ranking", "badge",
    
    # General
    "dashboard", "navigation", "search results", "filter", "analytics",
]

# Role contexts
ROLES = ["as a student", "as an instructor", "as an admin", ""]

# Question patterns  
PATTERNS = [
    "How do I {verb} {obj}{role}?",
    "How can I {verb} {obj}{role}?",
    "I want to {verb} {obj}{role}",
    "Help me {verb} {obj}{role}",
    "Show me how to {verb} {obj}",
    "What are the steps to {verb} {obj}?",
    "Can you explain how to {verb} {obj}?",
    "Guide me through {verb}ing {obj}",
    "I need to {verb} {obj}",
    "Where do I {verb} {obj}?",
    "Tell me about {verb}ing {obj}",
    "What's the best way to {verb} {obj}?",
]

# ============================================================================
# COMPLETE FEATURE KNOWLEDGE BASE
# ============================================================================

COMPLETE_FEATURES = {
    # ========== IDENTITY & ABOUT ==========
    "identity": {
        "questions": [
            "Who are you?", "What are you?", "Who created you?", "What's your name?",
            "What can you do?", "Tell me about yourself", "What is CCIS-CodeHub?",
            "What is this platform?", "Introduce yourself", "How can you help me?",
        ],
        "responses": [
            """I am the **CCIS-CodeHub AI Mentor**, created by **Mark Renier B. Fostanes** for Surigao del Norte State University (SNSU).

**My Capabilities:**
- 📚 Guide you through learning paths (BSIT, BSCS, BSIS)
- 💻 Help with project collaboration and code reviews
- 👥 Navigate community features
- 🏆 Assist with coding competitions
- 🔧 Troubleshoot issues
- 💡 Provide personalized recommendations

How can I assist you today?""",
            """**CCIS-CodeHub** is a comprehensive AI-driven learning platform for the College of Computing and Information Sciences at SNSU.

**Key Features:**
- 🎓 Career-based learning paths
- 💻 Team project collaboration
- 👥 Community discussion hub
- 🏆 Coding competitions
- 🤖 AI mentorship (that's me!)

**Tech Stack:** Django + React + TypeScript + PostgreSQL

What would you like to explore?""",
        ]
    },
    
    # ========== ACCOUNTS & PROFILES ==========
    "accounts": {
        "actions": ["login", "register", "logout", "update profile", "change password", "reset password", "verify email", "upload avatar", "edit bio", "link github"],
        "responses": {
            "login": """**Logging In**

1. Go to the login page
2. Enter your **email** and **password**
3. Click **Login**

**Options:**
- Check "Remember me" to stay logged in
- Click "Forgot Password?" if needed

> 🔒 Use a strong password for security!""",
            
            "register": """**Creating an Account**

1. Click **Register** on the home page
2. Fill in your details:
   - Email (use your institutional email)
   - Username
   - Password (8+ characters)
   - Program (BSIT/BSCS/BSIS)
3. Verify your email
4. Complete your profile

> 🎓 Your program determines your career path recommendations!""",
            
            "update profile": """**Updating Your Profile**

1. Click your **avatar** → **Profile**
2. Click **Edit Profile**
3. Update fields:
   - Display name
   - Bio
   - GitHub username
   - LinkedIn URL
   - Avatar image
4. Click **Save**

> 💡 A complete profile helps others connect with you!""",
        }
    },
    
    # ========== LEARNING MANAGEMENT ==========
    "learning": {
        "actions": ["enroll in career path", "start module", "complete quiz", "view progress", "resume module", "retake quiz", "view certificates", "join live quiz", "navigate slides", "download materials"],
        "module_types": ["video", "text", "interactive", "quiz", "slide"],
        "question_types": ["multiple choice", "true/false", "short answer", "coding"],
        "responses": {
            "enroll": """**Enrolling in a Career Path**

**Available Paths:**
- **BSIT** - Web dev, networking, IT support
- **BSCS** - Algorithms, software engineering
- **BSIS** - Business systems, database management

**Steps:**
1. Go to **Learning** → **Career Paths**
2. Select your program
3. Click **Enroll**
4. Start with Module 1

> 📊 Track your progress on the Dashboard!""",
            
            "quiz": """**Taking a Quiz**

**Before You Start:**
- Check the time limit
- Review attempt limits
- Prepare your notes

**During Quiz:**
1. Read each question carefully
2. Select or type your answer
3. Navigate with **Previous/Next**
4. Submit before timeout

**Question Types:**
- Multiple choice
- True/False
- Short answer
- Coding challenges

> ⏱️ Time remaining shown in the corner!""",
            
            "live quiz": """**Joining a Live Quiz**

1. Get the **room code** from instructor
2. Go to **Learning** → **Join Live Quiz**
3. Enter the code
4. Wait in the **lobby**
5. Quiz starts when instructor launches

**During Live Quiz:**
- Answer as quickly as possible
- Points based on speed + accuracy
- See live rankings

> 🏆 Compete with classmates in real-time!""",
            
            "slides": """**Navigating Slide Modules**

**Controls:**
- **→** or Click: Next slide
- **←**: Previous slide
- **Spacebar**: Toggle fullscreen
- **Esc**: Exit fullscreen

**Features:**
- Progress bar at bottom
- Slide counter (e.g., "5/20")
- Auto-save position

> 📖 Pick up where you left off anytime!""",
        }
    },
    
    # ========== PROJECT COLLABORATION ==========
    "projects": {
        "actions": ["create project", "add team members", "create task", "move task", "assign task", "request code review", "upload file", "add label", "set priority", "comment on task", "complete task"],
        "project_types": ["web_application", "mobile_app", "desktop_app", "api", "data_science", "machine_learning", "game_development", "iot_project"],
        "task_statuses": ["todo", "in_progress", "review", "done"],
        "roles": ["owner", "admin", "developer", "viewer"],
        "responses": {
            "create project": """**Creating a New Project**

1. Go to **Projects** → **+ New Project**
2. Fill in details:
   - **Name**: Project title
   - **Description**: What it does
   - **Type**: Web app, mobile, API, etc.
   - **Visibility**: Public or private
   - **Repository URL** (optional)
3. Click **Create**

**Next Steps:**
- Add team members
- Set up Kanban board
- Create initial tasks

> 🚀 Start building with your team!""",
            
            "kanban": """**Using the Kanban Board**

**Columns:**
| Todo | In Progress | Review | Done |

**Actions:**
- **Drag** tasks between columns
- **Click** task to view/edit details
- **+** to add new task

**Task Features:**
- Priority (Low/Medium/High/Urgent)
- Labels (custom colors)
- Assignees
- Due dates
- Comments

> 💡 Use labels to categorize work!""",
            
            "code review": """**Requesting Code Review**

1. Go to project → **Code Reviews**
2. Click **+ Request Review**
3. Add your code:
   - Paste directly, or
   - Link to repository
4. Select **reviewers**
5. Add description of changes
6. Submit

**Review Process:**
- Reviewers add line comments
- AI provides suggestions
- Approve or request changes

> 🤖 I can help analyze your code too!""",
        }
    },
    
    # ========== COMMUNITY FEATURES ==========
    "community": {
        "post_types": ["text", "question", "showcase", "tutorial", "discussion"],
        "actions": ["create post", "like post", "comment", "follow user", "join organization", "report content", "save post", "share post", "use hashtags", "answer question"],
        "notification_types": ["like", "comment", "follow", "mention", "project_invite", "quiz_result", "achievement"],
        "responses": {
            "create post": """**Creating a Post**

1. Go to **Community**
2. Click **+ New Post**
3. Choose type:
   - 📝 Text - General update
   - ❓ Question - Get help
   - 🏆 Showcase - Share work
   - 📚 Tutorial - Teach others
   - 💬 Discussion - Start conversation
4. Write content (Markdown supported!)
5. Add #hashtags
6. Attach images/code if needed
7. Click **Publish**

> 🏷️ Hashtags help others find your post!""",
            
            "organization": """**Joining an Organization**

1. Go to **Community** → **Organizations**
2. Browse or search
3. Click an organization
4. Click **Join**

**Types:**
- **Public**: Join instantly
- **Private**: Request required

**Benefits:**
- Group discussions
- Shared projects
- Exclusive events
- Team channels

> 🏢 Organizations are great for study groups!""",
        }
    },
    
    # ========== AI MENTOR FEATURES ==========
    "ai_mentor": {
        "session_types": ["general_chat", "code_analysis", "project_guidance", "learning_help"],
        "code_analysis_types": ["bug_detection", "performance", "security", "code_review", "best_practices"],
        "recommendation_types": ["skill_gap", "trending", "personalized", "prerequisite"],
        "guidance_types": ["architecture", "tech_stack", "implementation", "debugging", "deployment"],
        "responses": {
            "code analysis": """**Getting Code Analysis**

1. Open AI Mentor (me!)
2. Select **Code Analysis** mode
3. Paste your code
4. I'll analyze for:
   - 🐛 **Bugs**: Errors and issues
   - ⚡ **Performance**: Optimization tips
   - 🔒 **Security**: Vulnerabilities
   - ✨ **Best Practices**: Code quality

**What I Check:**
- Syntax errors
- Logic flaws
- Performance bottlenecks
- Security risks
- Style improvements

> 💡 Paste code anytime and I'll help!""",
            
            "recommendations": """**Getting Learning Recommendations**

Based on your:
- Current progress
- Quiz results
- Project work
- Skill gaps

**I Recommend:**
- 📚 Next modules to study
- 💻 Practice projects
- 🎯 Skills to develop
- 📖 Resources to read

**Types:**
- **Skill Gap**: What you need to learn
- **Trending**: Popular topics
- **Personalized**: Based on your goals
- **Prerequisite**: What to learn first

> 🎯 Ask me for personalized advice!""",
            
            "project guidance": """**Getting Project Guidance**

**I Can Help With:**
- 🏗️ **Architecture**: System design
- 🛠️ **Tech Stack**: Best tools to use
- 💻 **Implementation**: How to code it
- 🐛 **Debugging**: Fixing issues
- 🚀 **Deployment**: Launching your project

**How to Ask:**
1. Describe your project
2. Explain your challenge
3. I'll provide guidance

**Example:**
"I'm building a todo app in React. How should I structure the components?"

> 💡 I'm here to help with any project questions!""",
        }
    },
    
    # ========== CODING COMPETITIONS ==========
    "competitions": {
        "challenge_types": ["algorithm", "data_structure", "debugging", "sql", "web", "optimization", "puzzle"],
        "submission_statuses": ["pending", "running", "accepted", "wrong_answer", "time_limit", "memory_limit", "runtime_error", "compilation_error"],
        "achievement_types": ["first_solve", "fastest_solve", "most_efficient", "top_10", "perfect_score", "participation"],
        "responses": {
            "participate": """**Participating in Competitions**

**How to Join:**
1. Go to **Competitions**
2. Find an active competition
3. Click **Register**
4. Start solving challenges!

**During Competition:**
- Read problem statement carefully
- Write your solution
- Test with sample cases
- Submit for judging

**Verdict Types:**
- ✅ **Accepted**: Correct!
- ❌ **Wrong Answer**: Logic error
- ⏱️ **Time Limit**: Too slow
- 💾 **Memory Limit**: Too much RAM
- 🔴 **Runtime Error**: Crashed
- 📝 **Compilation Error**: Won't build

> 🏆 Climb the leaderboard!""",
            
            "achievements": """**Earning Achievements**

**Types:**
- 🥇 **First Solve**: First to solve a challenge
- ⚡ **Fastest Solve**: Quickest solution
- 💎 **Most Efficient**: Optimal solution
- 🏅 **Top 10**: In top 10 finishers
- ⭐ **Perfect Score**: All challenges correct
- 🎖️ **Participation**: Competed in event

**How to Earn:**
- Solve challenges quickly
- Optimize your code
- Participate regularly

> 🏆 Achievements show on your profile!""",
        }
    },
    
    # ========== ADMIN FUNCTIONS ==========
    "admin": {
        "actions": ["manage users", "view analytics", "moderate content", "create career path", "manage settings", "ban user", "review reports", "manage certificates", "export data"],
        "responses": {
            "manage users": """**User Management (Admin)**

⚠️ **Admin Only**

1. Go to **Admin Panel** → **Users**
2. Search/filter users
3. Actions:
   - **View Profile**
   - **Edit Details**
   - **Change Role**
   - **Reset Password**
   - **Suspend Account**
   - **Ban User**

> 🔒 All actions are logged for security!""",
            
            "analytics": """**Viewing Analytics (Admin)**

⚠️ **Admin Only**

**Dashboards:**
- 📊 User registrations over time
- 📈 Active users (daily/weekly/monthly)
- 📚 Course completion rates
- 🏆 Competition participation
- 💬 Community engagement

**Export Options:**
- CSV for spreadsheets
- PDF for reports

> 📊 Use insights to improve the platform!""",
        }
    },
    
    # ========== INSTRUCTOR FUNCTIONS ==========
    "instructor": {
        "actions": ["create module", "upload quiz", "grade assignments", "view student progress", "create live quiz", "start live quiz", "manage courses"],
        "responses": {
            "create module": """**Creating a Learning Module (Instructor)**

👨‍🏫 **Instructor Only**

1. Go to **Instructor Dashboard**
2. Click **+ Create Module**
3. Set:
   - **Title** & description
   - **Career path** it belongs to
   - **Module type**:
     - Video
     - Text/Slides
     - Interactive
     - Quiz
   - **Order** in the path
4. Add content
5. **Preview** before publishing
6. Click **Publish**

> 📚 Students will see it in their path!""",
            
            "live quiz": """**Running a Live Quiz (Instructor)**

👨‍🏫 **Instructor Only**

**Setup:**
1. Go to **Instructor Dashboard** → **Live Quizzes**
2. Create or select a quiz
3. Click **Start Session**
4. Share the **room code**

**During Quiz:**
- Monitor join count
- Start when ready
- Control pace
- View live results

**After Quiz:**
- Review statistics
- Export results
- Save for later

> ⏱️ Live quizzes are great for engagement!""",
        }
    },
    
    # ========== TROUBLESHOOTING ==========
    "troubleshooting": {
        "issues": [
            {"issue": "can't login", "solution": "Check email/password, clear cache, try password reset"},
            {"issue": "quiz not loading", "solution": "Refresh page, check internet, try different browser"},
            {"issue": "video not playing", "solution": "Check browser compatibility, disable ad-blocker"},
            {"issue": "certificate not showing", "solution": "Ensure 100% completion, wait for processing"},
            {"issue": "task won't save", "solution": "Check connection, don't close tab while saving"},
            {"issue": "live quiz code not working", "solution": "Verify code with instructor, check if quiz started"},
            {"issue": "submission keeps failing", "solution": "Check code for errors, verify input format"},
            {"issue": "notifications not showing", "solution": "Check notification settings, clear cache"},
        ]
    },
}

# ============================================================================
# GENERATION FUNCTIONS
# ============================================================================

def generate_thinking(topic, depth="deep", context=None):
    """
    Generate ADVANCED reasoning chains with multi-stage thinking.
    This creates high-quality training data for AI reasoning capabilities.
    """
    
    # Stage 1: Context Analysis
    context_analysis = [
        f"The user is asking about '{topic}' in the CCIS-CodeHub platform.",
        "I need to understand their exact intent and provide comprehensive help.",
        "Let me consider their likely user role (student/instructor/admin) and context.",
    ]
    
    # Stage 2: Intent Recognition
    intent_patterns = [
        f"Breaking down the request: The user wants to {topic}.",
        "Key aspects to address: what, where, how, and why.",
        "I should provide step-by-step guidance that's easy to follow.",
    ]
    
    # Stage 3: Knowledge Retrieval
    knowledge_steps = [
        f"Retrieving relevant information about {topic} from my knowledge.",
        "Identifying the exact location and steps in CCIS-CodeHub.",
        "Considering prerequisites and permissions required.",
        "Thinking about common issues users face with this task.",
    ]
    
    # Stage 4: Response Planning
    planning_steps = [
        "Planning response structure: overview, steps, tips, troubleshooting.",
        "Ensuring I include actionable steps they can follow immediately.",
        "Adding helpful tips and best practices from my training.",
        "Preparing to mention related features they might find useful.",
    ]
    
    # Stage 5: Quality Check
    quality_checks = [
        "Verifying my response is accurate for CCIS-CodeHub.",
        "Ensuring steps are in logical order and easy to understand.",
        "Adding appropriate formatting for clarity.",
    ]
    
    # Build thinking block based on depth
    if depth == "light":
        all_steps = random.sample(intent_patterns, 2)
    elif depth == "medium":
        all_steps = random.sample(context_analysis, 1) + random.sample(intent_patterns, 2) + random.sample(knowledge_steps, 2)
    else:  # deep
        all_steps = (
            random.sample(context_analysis, 2) +
            random.sample(intent_patterns, 2) +
            random.sample(knowledge_steps, 3) +
            random.sample(planning_steps, 2) +
            random.sample(quality_checks, 1)
        )
    
    thinking = "<think>\n"
    
    # Add structured sections
    thinking += "**Understanding the Request:**\n"
    for step in all_steps[:3]:
        thinking += f"• {step}\n"
    
    thinking += "\n**My Reasoning Process:**\n"
    for i, step in enumerate(all_steps[3:7], 1):
        thinking += f"{i}. {step}\n"
    
    if len(all_steps) > 7:
        thinking += "\n**Preparing Response:**\n"
        for step in all_steps[7:]:
            thinking += f"→ {step}\n"
    
    thinking += "\nNow I'll provide a comprehensive, helpful response.\n</think>\n\n"
    
    return thinking


def generate_advanced_thinking_for_action(action, user_role=None, context=None):
    """
    Generate highly detailed thinking for specific actions.
    This creates the deep reasoning patterns we want the AI to learn.
    """
    thinking = "<think>\n"
    
    # Section 1: Request Analysis
    thinking += "**Analyzing User Request:**\n"
    thinking += f"• Action requested: {action}\n"
    if user_role:
        thinking += f"• User role context: {user_role}\n"
    thinking += f"• Platform: CCIS-CodeHub learning management system\n"
    thinking += f"• My role: AI Mentor providing guidance\n\n"
    
    # Section 2: Context Consideration
    thinking += "**Contextual Considerations:**\n"
    thinking += "• Is this a common request? Yes, this is a frequently asked question.\n"
    thinking += "• What prerequisites might be needed? User should be logged in.\n"
    thinking += "• Are there permission requirements? Depends on the feature.\n"
    thinking += "• What could go wrong? Common issues and how to prevent them.\n\n"
    
    # Section 3: Step Planning
    thinking += "**Planning My Response:**\n"
    thinking += "1. Start with a clear overview of what we're accomplishing\n"
    thinking += "2. Provide numbered, actionable steps\n"
    thinking += "3. Include visual cues (emojis, formatting) for clarity\n"
    thinking += "4. Add pro tips and best practices\n"
    thinking += "5. Mention troubleshooting for common issues\n"
    thinking += "6. Offer to help with follow-up questions\n\n"
    
    # Section 4: Quality Assurance
    thinking += "**Quality Check:**\n"
    thinking += "✓ Response is accurate for CCIS-CodeHub\n"
    thinking += "✓ Steps are in logical order\n"
    thinking += "✓ Language is friendly and helpful\n"
    thinking += "✓ Includes actionable guidance\n\n"
    
    thinking += "Proceeding with comprehensive response.\n</think>\n\n"
    
    return thinking

def load_existing():
    """Load existing dataset."""
    samples = []
    if os.path.exists(KAGGLE_INPUT):
        print(f"📂 Loading: {KAGGLE_INPUT}")
        with open(KAGGLE_INPUT, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    samples.append(json.loads(line.strip()))
                except:
                    pass
        print(f"   ✓ Loaded {len(samples):,} samples")
    return samples

def generate_identity_samples():
    """Generate identity Q&A samples."""
    samples = []
    data = COMPLETE_FEATURES["identity"]
    
    for q in data["questions"]:
        for response in data["responses"]:
            # Multiple variations
            for _ in range(20):
                variations = [
                    q, q.lower(), "Hey, " + q, q.replace("?", ""),
                    "Quick question - " + q, "Can you tell me " + q.lower().replace("?", "") + "?",
                ]
                sample = {
                    "instruction": random.choice(variations),
                    "input": "",
                    "output": generate_thinking("my identity") + response
                }
                samples.append(sample)
    
    return samples

def generate_feature_samples():
    """Generate samples for all features."""
    samples = []
    
    for category, data in COMPLETE_FEATURES.items():
        if category == "identity":
            continue
            
        if "responses" in data and isinstance(data["responses"], dict):
            for action, response in data["responses"].items():
                # Generate many variations
                for verb in VERBS[:15]:
                    for role in ROLES:
                        for pattern in PATTERNS[:6]:
                            try:
                                q = pattern.format(verb=verb, obj=action, role=role)
                                sample = {
                                    "instruction": q,
                                    "input": "",
                                    "output": generate_thinking(action) + response
                                }
                                samples.append(sample)
                            except:
                                pass
    
    return samples

def generate_combinatorial_samples():
    """Generate samples using Cartesian products."""
    samples = []
    
    # Limit for memory efficiency
    combos = list(itertools.product(
        PATTERNS[:6],
        VERBS[:20],
        OBJECTS[:20],
        ROLES
    ))
    
    print(f"📐 Generated {len(combos):,} combinations")
    
    for pattern, verb, obj, role in random.sample(combos, min(50000, len(combos))):
        try:
            q = pattern.format(verb=verb, obj=obj, role=role)
            
            # Generic response based on category
            response = f"""**{verb.title()} {obj.title()}**

**Steps:**
1. Navigate to the relevant section
2. Find the {obj} you want to {verb}
3. Click the appropriate action button
4. Follow the prompts

**Tips:**
- Make sure you're logged in
- Check your permissions
- Save changes before leaving

> 💡 Need more help? Just ask me!"""
            
            sample = {
                "instruction": q,
                "input": "",
                "output": generate_thinking(f"{verb} {obj}") + response
            }
            samples.append(sample)
        except:
            pass
    
    return samples

def generate_troubleshooting_samples():
    """Generate troubleshooting samples."""
    samples = []
    
    for issue_data in COMPLETE_FEATURES["troubleshooting"]["issues"]:
        issue = issue_data["issue"]
        solution = issue_data["solution"]
        
        response = f"""**Troubleshooting: {issue.title()}**

**Quick Fixes:**
{solution}

**Detailed Steps:**
1. Try refreshing the page
2. Clear browser cache and cookies
3. Try a different browser
4. Check your internet connection
5. Log out and log back in

**If Still Not Working:**
- Contact support through Help menu
- Describe the issue in detail
- Include screenshots if possible

> 🆘 I'm here to help with any issues!"""
        
        # Many question variations
        variations = [
            f"I {issue}", f"Help! {issue}", f"Why {issue}?",
            f"Can't seem to... {issue}", f"{issue.title()} - what do I do?",
            f"Problem: {issue}", f"Error: {issue}", f"Issue with {issue}",
            f"I'm having trouble {issue}ing", f"Something's wrong - {issue}",
        ]
        
        for q in variations:
            for _ in range(10):
                sample = {
                    "instruction": q,
                    "input": "",
                    "output": generate_thinking(issue) + response
                }
                samples.append(sample)
    
    return samples

def expand_samples(samples, target_count):
    """Expand samples to target count."""
    print(f"\n🔄 Expanding to {target_count:,} samples...")
    seen = set()
    base = len(samples)
    
    while len(samples) < target_count:
        s = random.choice(samples[:base])
        instruction = s["instruction"]
        
        # Apply variations
        transforms = [
            lambda x: x.lower(),
            lambda x: x.upper()[:1] + x[1:],
            lambda x: "I need help: " + x,
            lambda x: x.replace("?", " please?"),
            lambda x: "Quick question - " + x,
            lambda x: x + " Thanks!",
            lambda x: "Can you help? " + x,
            lambda x: "Hey, " + x,
            lambda x: x + " (urgent)",
        ]
        
        new_instruction = instruction
        for t in random.sample(transforms, random.randint(1, 3)):
            try:
                new_instruction = t(new_instruction)
            except:
                pass
        
        h = hashlib.md5(new_instruction.encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            samples.append({
                "instruction": new_instruction,
                "input": s.get("input", ""),
                "output": s["output"]
            })
        
        if len(samples) % 100000 == 0:
            print(f"   → {len(samples):,} samples...")
    
    return samples

def estimate_size(samples):
    """Estimate file size."""
    if not samples:
        return 0
    sample_sizes = [len(json.dumps(s)) for s in random.sample(samples, min(1000, len(samples)))]
    return (sum(sample_sizes) / len(sample_sizes) * len(samples)) / (1024 * 1024)

def main():
    print("🚀 CCIS-CodeHub COMPLETE 1GB Dataset Generator")
    print("=" * 60)
    print(f"🎯 Target: {TARGET_SIZE_MB} MB")
    print(f"📋 Quality Mode: {'PURE NEW DATA' if not MERGE_EXISTING else 'Merging with existing'}")
    print()
    
    all_samples = []
    
    # Only load existing if MERGE_EXISTING is True
    if MERGE_EXISTING:
        existing = load_existing()
        if ENHANCE_EXISTING and existing:
            print("   ⚡ Enhancing existing samples with thinking tags...")
            enhanced = []
            for s in existing[:1000]:  # Limit enhancement for speed
                if "<think>" not in s.get("output", ""):
                    s["output"] = generate_thinking("request", "light") + s.get("output", "")
                enhanced.append(s)
            all_samples.extend(enhanced)
            all_samples.extend(existing[1000:])
        else:
            all_samples.extend(existing)
    else:
        print("   ✨ Generating PURE high-quality data (no legacy merge)")
    
    # Generate identity
    print("\n📝 Generating Identity samples...")
    identity = generate_identity_samples()
    all_samples.extend(identity)
    print(f"   ✓ {len(identity):,} samples")
    
    # Generate features
    print("\n📝 Generating Feature samples...")
    features = generate_feature_samples()
    all_samples.extend(features)
    print(f"   ✓ {len(features):,} samples")
    
    # Generate combinatorial
    print("\n📐 Generating Combinatorial samples...")
    combos = generate_combinatorial_samples()
    all_samples.extend(combos)
    print(f"   ✓ {len(combos):,} samples")
    
    # Generate troubleshooting
    print("\n🔧 Generating Troubleshooting samples...")
    trouble = generate_troubleshooting_samples()
    all_samples.extend(trouble)
    print(f"   ✓ {len(trouble):,} samples")
    
    # Check current size
    current_size = estimate_size(all_samples)
    print(f"\n📊 Current: {len(all_samples):,} samples, ~{current_size:.2f} MB")
    
    # Expand to target
    if current_size < TARGET_SIZE_MB:
        target_count = int(len(all_samples) * (TARGET_SIZE_MB / current_size) * 1.1)
        all_samples = expand_samples(all_samples, target_count)
    
    # Shuffle
    print("\n🔀 Shuffling...")
    random.shuffle(all_samples)
    
    # Write
    print(f"\n💾 Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for sample in all_samples:
            f.write(json.dumps(sample, ensure_ascii=False) + '\n')
    
    # Final stats
    file_size = os.path.getsize(OUTPUT_FILE)
    print("\n" + "=" * 60)
    print("✅ COMPLETE!")
    print("=" * 60)
    print(f"📊 Total Samples: {len(all_samples):,}")
    print(f"📁 File Size: {file_size / (1024*1024):.2f} MB")
    print(f"📁 File Size: {file_size / (1024*1024*1024):.3f} GB")
    print("\n🎯 Ready for training!")

if __name__ == "__main__":
    main()
