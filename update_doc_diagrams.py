"""Update documentation diagrams to match HTML viewer"""

import re

# Read the documentation file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    doc_content = f.read()

# 1. NEW CLASS DIAGRAM (User Management from HTML)
new_class_diagram = """#### 4.2.1 User Management Class Diagram

```mermaid
classDiagram
    class User {
        +UUID id
        +String firebase_uid
        +String email
        +String username
        +String first_name
        +String last_name
        +String role
        +String program
        +String year_level
        +ImageField profile_picture
        +Text bio
        +JSON skills
        +JSON career_interests
        +Integer followers_count
        +Integer following_count
        +Boolean is_active
        +DateTime created_at
        +DateTime updated_at
        +login()
        +logout()
        +resetPassword()
        +updateProfile()
    }
    
    class UserProfile {
        +UUID id
        +String github_username
        +String linkedin_url
        +String website_url
        +String location
        +Integer total_courses_completed
        +Integer total_modules_completed
        +Integer total_projects
        +Integer total_posts
        +Integer total_likes_received
        +Integer total_comments
        +Integer contribution_points
        +Integer current_streak
        +Integer longest_streak
        +DateTime last_activity
        +updateStats()
        +calculateStreak()
    }
    
    User "1" -- "1" UserProfile : has
```

**Discussion:**

The User Management class diagram shows the core authentication and profile structure of the CCIS-CodeHub system. The User class contains Firebase authentication (firebase_uid), role-based access control (admin/instructor/student), program information (BSIT/BSCS/BSIS), and basic profile data. The one-to-one relationship with UserProfile separates authentication concerns from extended profile statistics and social features.

The UserProfile class tracks user engagement metrics including courses completed, projects created, community participation (posts, likes, comments), and gamification elements (contribution points, activity streaks). This separation follows the Single Responsibility Principle, allowing the User model to focus on authentication while UserProfile handles statistics and achievements. The system uses role-based fields rather than inheritance for flexibility in Django's ORM implementation.

**Note on Complete System Architecture:** The actual CCIS-CodeHub implementation includes 35+ models across 5 feature-specific domains:

1. **User Management:** User, UserProfile models with Firebase authentication and social statistics  
2. **Learning System:** 9 models (CareerPath, LearningModule, Quiz, Question, QuestionChoice, Enrollment, ModuleProgress, QuizAttempt, Certificate)  
3. **Project Collaboration:** 8 models (Team, TeamMembership, Project, ProjectMembership, ProjectTask, ProjectFile, CodeReview, ReviewComment)  
4. **Community:** 9 models (Post, Comment, PostLike, CommentLike, UserFollow, Organization, OrganizationMembership, ChatRoom, ChatMessage)  
5. **AI Mentor:** 7 models (AIMentorProfile, ProjectMentorSession, AIMessage, CodeAnalysis, LearningRecommendation, ProjectGuidance, AIFeedback)

See `docs/UML_Diagrams_Viewer.html` (Diagrams 7-13) for complete class diagrams with full attributes and relationships."""

# 2. NEW ACTIVITY DIAGRAM (Learning System with swimlanes from HTML)
new_activity_diagram = """#### 4.3.1 Activity Diagram - Learning System

```mermaid
flowchart TD
    subgraph Student["👤 Student"]
        S1([Start Learning])
        S2[Browse Career Paths]
        S3[Select Career Path]
        S4[Click Enroll]
        S5[View Module List]
        S6[Select Module]
        S7[Read Content]
        S8[Download Materials]
        S9[Ask AI Question]
        S10[Take Quiz]
        S11[Submit Answers]
        S12[View Certificate]
        S13([End])
    end
    
    subgraph System["⚙️ Learning System"]
        SY1{Already Enrolled?}
        SY2[Create Enrollment]
        SY3[Load Modules]
        SY4{Prerequisites Met?}
        SY5[Display Module]
        SY6[Track Progress]
        SY7[Load Quiz]
        SY8[Grade Quiz]
        SY9{Score >= Passing?}
        SY10{All Modules Complete?}
        SY11[Generate Certificate]
    end
    
    subgraph AI["🤖 AI Mentor"]
        AI1[Process Question]
        AI2[Generate Response]
        AI3[Save Conversation]
    end
    
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> SY1
    
    SY1 -->|No| SY2
    SY1 -->|Yes| SY3
    SY2 --> SY3
    
    SY3 --> S5
    S5 --> S6
    S6 --> SY4
    
    SY4 -->|No| S5
    SY4 -->|Yes| SY5
    
    SY5 --> S7
    S7 --> S8
    S8 --> SY6
    SY6 --> S9
    
    S9 --> AI1
    AI1 --> AI2
    AI2 --> AI3
    AI3 --> S7
    
    SY6 --> S10
    S10 --> SY7
    SY7 --> S11
    S11 --> SY8
    SY8 --> SY9
    
    SY9 -->|No| S10
    SY9 -->|Yes| SY10
    
    SY10 -->|No| S5
    SY10 -->|Yes| SY11
    SY11 --> S12
    S12 --> S13
    
    style S1 fill:#90EE90
    style S13 fill:#FFB6C1
    style AI1 fill:#87CEEB
    style AI2 fill:#87CEEB
    style SY11 fill:#FFD700
```

**Discussion:**

The activity diagram illustrates the complete learning workflow using swimlanes to clearly separate responsibilities between Student actions, System processes, and AI Mentor assistance. The Student swimlane shows user interactions from browsing career paths through certificate viewing, while the Learning System swimlane handles business logic including enrollment validation, prerequisites checking, progress tracking, and quiz grading. The AI Mentor swimlane demonstrates how students can request help at any point during content study, with the conversation loop allowing return to studying after receiving AI assistance.

Decision nodes in the System swimlane enforce business rules: enrollment checking prevents duplicate enrollments, prerequisites validation ensures proper learning sequence, quiz scoring determines pass/fail with retry options, and completion checking triggers certificate generation. The diagram uses color coding to highlight key milestones: green for start, pink for end, blue for AI interactions, and gold for certificate generation. This swimlane approach provides clear visibility into which actor or system component is responsible for each activity in the learning process.

**Complete Activity Diagram Coverage:** The system includes 5 swimlane-based activity diagrams:

1. **Learning System** (shown above): Student, System, AI Mentor workflows  
2. **Project Collaboration**: Student, Team Members, Instructor, System workflows  
3. **Community Interaction**: User, Community System, Database workflows  
4. **AI Mentor Session**: Student, AI Service, System workflows  
5. **User Authentication**: User, Backend System, Firebase Auth workflows

See `docs/UML_Diagrams_Viewer.html` (Diagrams 14-18) for all complete activity diagrams with emoji icons and color-coded nodes."""

# 3. NEW SEQUENCE DIAGRAM (Learning Module Enrollment from HTML)
new_sequence_diagram = """#### 4.3.2 Sequence Diagram - Learning Module Enrollment

```mermaid
sequenceDiagram
    actor Student
    participant UI as Frontend UI
    participant API as API Gateway
    participant Auth as Auth Service
    participant Learn as Learning Service
    participant DB as Database
    participant Cert as Certificate Service
    
    Student->>UI: Browse Career Paths
    UI->>API: GET /api/learning/career-paths/
    API->>Auth: Validate JWT Token
    Auth-->>API: Token Valid
    API->>Learn: Get Career Paths
    Learn->>DB: Query CareerPath
    DB-->>Learn: Return Career Paths
    Learn-->>API: Career Path List
    API-->>UI: Display Paths
    
    Student->>UI: Click Enroll
    UI->>API: POST /api/learning/enroll/
    API->>Auth: Validate Token
    Auth-->>API: Authorized
    API->>Learn: Create Enrollment
    Learn->>DB: Check Existing Enrollment
    
    alt Already Enrolled
        DB-->>Learn: Enrollment Exists
        Learn-->>API: Error: Already Enrolled
        API-->>UI: Show Error
    else New Enrollment
        DB-->>Learn: No Enrollment
        Learn->>DB: Create Enrollment Record
        Learn->>DB: Load Modules
        DB-->>Learn: Module List
        Learn-->>API: Enrollment Success
        API-->>UI: Show Module List
    end
    
    Student->>UI: Select Module
    UI->>API: GET /api/learning/module/:id/
    API->>Learn: Get Module Content
    Learn->>DB: Check Prerequisites
    
    alt Prerequisites Not Met
        DB-->>Learn: Prerequisites Missing
        Learn-->>API: Error: Locked Module
        API-->>UI: Show Locked Message
    else Prerequisites Met
        DB-->>Learn: Prerequisites OK
        Learn->>DB: Get Module Content
        DB-->>Learn: Module Data
        Learn->>DB: Create ModuleProgress
        Learn-->>API: Module Content
        API-->>UI: Display Module
    end
    
    Student->>UI: Complete All Modules
    UI->>API: POST /api/learning/complete/
    API->>Learn: Check Completion
    Learn->>DB: Verify All Modules Complete
    DB-->>Learn: All Complete
    Learn->>Cert: Generate Certificate
    Cert->>DB: Save Certificate Record
    Cert-->>Learn: Certificate ID
    Learn-->>API: Completion Success
    API-->>UI: Show Certificate
```

**Discussion:**

The sequence diagram details the learning module enrollment and completion workflow, showing temporal interactions between the student interface, API gateway, authentication service, learning service, database, and certificate service. The diagram demonstrates layered architecture with clear separation of concerns: the API gateway validates authentication for every request, the learning service handles business logic, and the database manages persistence.

Two key alternative flows are shown: enrollment checking (preventing duplicate enrollments with error handling) and prerequisites validation (ensuring students complete modules in proper sequence). The authentication pattern shows JWT token validation occurring before any business logic execution, ensuring secure access throughout the workflow. The certificate generation sequence demonstrates how the system triggers automated processes (certificate creation) based on completion criteria, with the Certificate Service operating as a separate microservice that persists certification records for future verification.

**Complete Sequence Diagram Coverage:** The system includes 5 comprehensive sequence diagrams:

1. **Learning Module Enrollment** (shown above): Enrollment, prerequisites, completion workflows  
2. **AI Mentor Interaction**: Context loading, model switching, conversation management  
3. **Project Collaboration**: Team formation, task management, code review  
4. **Community Post Creation**: Real-time feed updates, WebSocket broadcasting, caching  
5. **User Authentication**: Email/Password and Google OAuth dual flows

See `docs/UML_Diagrams_Viewer.html` (Diagrams 10, 19-22) for all complete sequence diagrams with detailed message flows."""

# Replace the old sections with new ones
# Find and replace Class Diagram section
class_pattern = r'(#### 4\.2\.1 .*?\n\n```mermaid\n.*?```\n\n\*\*Discussion:\*\*\n\n.*?)(?=\n\n#### 4\.2\.2)'
doc_content = re.sub(class_pattern, new_class_diagram, doc_content, flags=re.DOTALL)

# Find and replace Activity Diagram section
activity_pattern = r'(#### 4\.3\.1 Activity Diagram.*?\n\n```mermaid\n.*?```\n\n\*\*Discussion:\*\*\n\n.*?)(?=\n\n#### 4\.3\.2)'
doc_content = re.sub(activity_pattern, new_activity_diagram, doc_content, flags=re.DOTALL)

# Find and replace Sequence Diagram section
sequence_pattern = r'(#### 4\.3\.2 Sequence Diagram.*?\n\n```mermaid\n.*?```\n\n\*\*Discussion:\*\*\n\n.*?)(?=\n\n###|\n\n##|\Z)'
doc_content = re.sub(sequence_pattern, new_sequence_diagram, doc_content, flags=re.DOTALL)

# Write back to file
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(doc_content)

print("✅ Successfully updated documentation diagrams!")
print("\n📊 Updated Diagrams:")
print("   1. Class Diagram → User Management (User + UserProfile)")
print("   2. Activity Diagram → Learning System with Swimlanes")
print("   3. Sequence Diagram → Learning Module Enrollment")
print("\n✨ All diagrams now match docs/UML_Diagrams_Viewer.html!")
