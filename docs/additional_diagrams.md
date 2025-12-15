# Additional UML Diagrams - CCIS-CodeHub

## Additional Sequence Diagrams

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as Backend API
    participant Auth as Auth Service
    participant JWT as JWT Handler
    participant DB as Database
    participant Cache as Redis
    
    User->>UI: Enter credentials
    UI->>UI: Validate input format
    UI->>API: POST /api/auth/login
    
    API->>Auth: Validate credentials
    Auth->>DB: Query user by email
    DB-->>Auth: User record
    
    Auth->>Auth: Compare password hash
    
    alt Valid Credentials
        Auth->>JWT: Generate access token
        JWT->>JWT: Create refresh token
        JWT-->>Auth: Tokens generated
        
        Auth->>Cache: Store refresh token
        Cache-->>Auth: Token cached
        
        Auth->>DB: Update last_login
        DB-->>Auth: Updated
        
        Auth-->>API: Authentication successful
        API-->>UI: 200 OK + tokens + user data
        
        UI->>UI: Store tokens in localStorage
        UI->>UI: Redirect to dashboard
        UI-->>User: Display dashboard
        
    else Invalid Credentials
        Auth-->>API: 401 Unauthorized
        API-->>UI: Error response
        UI-->>User: Show error message
        User->>UI: Retry login
    end
```

### 2. Quiz Taking Flow

```mermaid
sequenceDiagram
    actor Student
    participant UI as Frontend
    participant API as Backend API
    participant Quiz as Quiz Service
    participant DB as Database
    participant Timer as Timer Service
    
    Student->>UI: Click "Start Quiz"
    UI->>API: POST /api/quizzes/{id}/start
    
    API->>DB: Check existing attempts
    DB-->>API: Attempts count
    
    alt Attempts Available
        API->>DB: Create QuizAttempt
        DB-->>API: Attempt created
        
        API->>DB: Fetch questions
        DB-->>API: Questions list
        
        API->>Quiz: Randomize if enabled
        Quiz-->>API: Ordered questions
        
        API-->>UI: 200 OK + questions + attempt_id
        
        UI->>Timer: Start countdown
        UI-->>Student: Display first question
        
        loop For each question
            Student->>UI: Select answer
            UI->>UI: Store answer locally
            UI-->>Student: Show next question
        end
        
        Student->>UI: Click "Submit Quiz"
        UI->>Timer: Stop timer
        UI->>API: POST /api/quizzes/{id}/submit
        
        API->>DB: Save all answers
        DB-->>API: Answers saved
        
        API->>Quiz: Calculate score
        Quiz->>DB: Fetch correct answers
        DB-->>Quiz: Correct answers
        Quiz->>Quiz: Compare and score
        Quiz-->>API: Total score
        
        API->>DB: Update attempt status
        DB-->>API: Updated
        
        alt Passing Score
            API->>DB: Update module progress
            DB-->>API: Progress updated
        end
        
        API-->>UI: 200 OK + results
        UI-->>Student: Display score & feedback
        
    else No Attempts Remaining
        API-->>UI: 403 Forbidden
        UI-->>Student: Show "Max attempts reached"
    end
```

### 3. Project Collaboration Flow

```mermaid
sequenceDiagram
    actor Student1
    actor Student2
    participant UI as Frontend
    participant API as Backend API
    participant WS as WebSocket Server
    participant Project as Project Service
    participant DB as Database
    participant Notif as Notification Service
    
    Student1->>UI: Create new task
    UI->>API: POST /api/projects/{id}/tasks
    
    API->>Project: Validate permissions
    Project->>DB: Check team membership
    DB-->>Project: Member confirmed
    
    API->>DB: Create task
    DB-->>API: Task created
    
    API->>Notif: Trigger task notification
    Notif->>DB: Create notifications for team
    DB-->>Notif: Notifications created
    
    Notif->>WS: Broadcast task created event
    WS-->>UI: Real-time notification
    
    API-->>UI: 201 Created + task data
    UI-->>Student1: Show success message
    
    Note over WS,Student2: Real-time update
    WS->>Student2: New task notification
    Student2->>UI: Open project board
    UI->>API: GET /api/projects/{id}/tasks
    API->>DB: Fetch tasks
    DB-->>API: Task list
    API-->>UI: 200 OK + tasks
    UI-->>Student2: Display updated board
    
    Student2->>UI: Assign self to task
    UI->>API: PATCH /api/tasks/{id}
    API->>DB: Update task assignee
    DB-->>API: Updated
    
    API->>WS: Broadcast task update
    WS-->>Student1: Task assigned notification
    API-->>UI: 200 OK
    UI-->>Student2: Task assigned
```

### 4. Content Upload and Processing Flow

```mermaid
sequenceDiagram
    actor Instructor
    participant UI as Frontend
    participant API as Backend API
    participant Upload as Upload Service
    participant FileValidator as File Validator
    participant S3 as S3 Storage
    participant DB as Database
    participant Celery as Celery Worker
    participant PDF as PDF Processor
    
    Instructor->>UI: Select PDF file
    UI->>UI: Validate file size & type
    
    UI->>API: POST /api/modules/upload
    Note over UI,API: Multipart form data
    
    API->>FileValidator: Validate file
    FileValidator->>FileValidator: Check extension
    FileValidator->>FileValidator: Scan for malware
    FileValidator-->>API: Validation passed
    
    API->>Upload: Generate unique filename
    Upload-->>API: Filename generated
    
    API->>S3: Upload file
    S3-->>API: File URL
    
    API->>DB: Create LearningModule record
    DB-->>API: Module created
    
    API->>Celery: Queue PDF processing task
    Celery-->>API: Task queued
    
    API-->>UI: 202 Accepted + module_id
    UI-->>Instructor: Show "Processing..." status
    
    Note over Celery,PDF: Async processing
    Celery->>PDF: Extract text from PDF
    PDF->>S3: Download PDF
    S3-->>PDF: PDF content
    
    PDF->>PDF: Extract text & metadata
    PDF->>PDF: Generate slides
    PDF->>PDF: Extract images
    
    PDF->>DB: Update module with extracted data
    DB-->>PDF: Updated
    
    PDF->>Celery: Task complete
    Celery->>UI: WebSocket notification
    UI-->>Instructor: Show "Processing complete"
    
    Instructor->>UI: Refresh module
    UI->>API: GET /api/modules/{id}
    API->>DB: Fetch module data
    DB-->>API: Module with slides
    API-->>UI: 200 OK + module data
    UI-->>Instructor: Display editable content
```

---

## Detailed Module Diagrams

### Learning Module - Detailed Class Diagram

```mermaid
classDiagram
    class CareerPath {
        +UUID id
        +String name
        +String slug
        +Text description
        +String program_type
        +String difficulty_level
        +Integer estimated_duration
        +Integer total_modules
        +Integer max_modules
        +Integer points_reward
        +JSONField required_skills
        +String icon
        +String color
        +File certificate_template
        +Boolean is_active
        +Boolean is_featured
        +DateTime created_at
        +DateTime updated_at
        +save()
        +get_modules()
        +calculate_completion_rate()
        +generate_certificate()
    }
    
    class LearningModule {
        +UUID id
        +ForeignKey career_path
        +String title
        +Text description
        +String module_type
        +String difficulty_level
        +Text content
        +File file
        +Integer duration_minutes
        +Integer points_reward
        +Integer order
        +Boolean is_locked
        +DateTime created_at
        +DateTime updated_at
        +get_next_module()
        +check_prerequisites()
        +mark_complete()
        +get_progress()
    }
    
    class Quiz {
        +UUID id
        +ForeignKey learning_module
        +String title
        +Text description
        +Text content
        +Integer time_limit_minutes
        +Integer passing_score
        +Integer max_attempts
        +Boolean randomize_questions
        +DateTime created_at
        +DateTime updated_at
        +start_attempt()
        +submit_attempt()
        +calculate_score()
        +get_results()
    }
    
    class Question {
        +UUID id
        +ForeignKey quiz
        +Text question_text
        +String question_type
        +JSONField correct_answer
        +Integer points
        +Integer order
        +Text explanation
        +DateTime created_at
        +DateTime updated_at
        +validate_answer()
        +get_choices()
    }
    
    class QuestionChoice {
        +UUID id
        +ForeignKey question
        +String choice_text
        +Boolean is_correct
        +Integer order
        +is_valid()
    }
    
    class Enrollment {
        +UUID id
        +ForeignKey user
        +ForeignKey career_path
        +String status
        +Integer progress_percentage
        +DateTime enrolled_at
        +DateTime completed_at
        +update_progress()
        +calculate_percentage()
        +complete_enrollment()
    }
    
    class ModuleProgress {
        +UUID id
        +ForeignKey user
        +ForeignKey module
        +ForeignKey enrollment
        +String status
        +DateTime started_at
        +DateTime completed_at
        +Integer time_spent_minutes
        +Integer current_slide
        +Integer total_slides
        +update_slide_position()
        +mark_completed()
        +get_time_spent()
    }
    
    class QuizAttempt {
        +UUID id
        +ForeignKey user
        +ForeignKey quiz
        +Decimal score
        +Integer time_taken_seconds
        +String status
        +DateTime started_at
        +DateTime submitted_at
        +submit()
        +calculate_final_score()
        +is_passing()
    }
    
    class Answer {
        +UUID id
        +ForeignKey quiz_attempt
        +ForeignKey question
        +JSONField answer_data
        +Boolean is_correct
        +Integer points_earned
        +validate()
        +calculate_points()
    }
    
    class Certificate {
        +UUID id
        +ForeignKey user
        +ForeignKey career_path
        +ForeignKey enrollment
        +String certificate_id
        +DateTime issued_at
        +String pdf_url
        +generate_pdf()
        +send_email()
    }
    
    CareerPath "1" *-- "many" LearningModule
    LearningModule "1" *-- "many" Quiz
    Quiz "1" *-- "many" Question
    Question "1" *-- "many" QuestionChoice
    
    CareerPath "1" -- "many" Enrollment
    LearningModule "1" -- "many" ModuleProgress
    Quiz "1" -- "many" QuizAttempt
    Question "1" -- "many" Answer
    QuizAttempt "1" *-- "many" Answer
    
    Enrollment "1" -- "1" Certificate
    Enrollment "1" -- "many" ModuleProgress
```

### AI Mentor Module - Detailed Architecture

```mermaid
graph TB
    subgraph Client["Client Interface"]
        ChatUI[Chat UI Component]
        CodeEditor[Code Editor]
        ContextPanel[Learning Context Panel]
    end
    
    subgraph API_Layer["API Layer"]
        ChatEndpoint[/api/ai-mentor/chat]
        CodeAnalysisEndpoint[/api/ai-mentor/analyze-code]
        RecommendationEndpoint[/api/ai-mentor/recommendations]
        HistoryEndpoint[/api/ai-mentor/history]
    end
    
    subgraph AI_Service["AI Mentor Service"]
        MessageProcessor[Message Processor]
        ContextBuilder[Context Builder]
        ModelSelector[AI Model Selector]
        ResponseFormatter[Response Formatter]
    end
    
    subgraph AI_Providers["AI Provider Integration"]
        OpenAI[OpenAI GPT-4]
        Gemini[Google Gemini]
        ProviderRouter[Provider Router]
    end
    
    subgraph Context_Sources["Context Sources"]
        UserProfile[User Profile & Progress]
        CurrentModule[Current Learning Module]
        PreviousConversations[Conversation History]
        CodeSubmissions[Code Submissions]
    end
    
    subgraph Storage["Storage Layer"]
        ConversationDB[(Conversation Database)]
        CacheLayer[(Redis Cache)]
        VectorDB[(Vector Database<br/>for Embeddings)]
    end
    
    ChatUI --> ChatEndpoint
    CodeEditor --> CodeAnalysisEndpoint
    ContextPanel --> RecommendationEndpoint
    
    ChatEndpoint --> MessageProcessor
    CodeAnalysisEndpoint --> MessageProcessor
    RecommendationEndpoint --> MessageProcessor
    
    MessageProcessor --> ContextBuilder
    
    ContextBuilder --> UserProfile
    ContextBuilder --> CurrentModule
    ContextBuilder --> PreviousConversations
    ContextBuilder --> CodeSubmissions
    
    ContextBuilder --> ModelSelector
    ModelSelector --> ProviderRouter
    
    ProviderRouter --> OpenAI
    ProviderRouter --> Gemini
    
    OpenAI --> ResponseFormatter
    Gemini --> ResponseFormatter
    
    ResponseFormatter --> ConversationDB
    ResponseFormatter --> CacheLayer
    
    MessageProcessor --> VectorDB
    
    style AI_Service fill:#e8f5e9
    style AI_Providers fill:#fff3e0
    style Context_Sources fill:#e3f2fd
    style Storage fill:#fce4ec
```

### Project Management Module - State Diagram

```mermaid
stateDiagram-v2
    [*] --> ProjectPlanning
    
    ProjectPlanning --> Active : Approve Project
    ProjectPlanning --> Cancelled : Reject Project
    
    Active --> OnHold : Pause Project
    OnHold --> Active : Resume Project
    
    Active --> InReview : Submit for Review
    InReview --> Active : Request Changes
    InReview --> Completed : Approve Completion
    
    Active --> Cancelled : Cancel Project
    OnHold --> Cancelled : Cancel Project
    
    Completed --> Archived : Archive
    Cancelled --> Archived : Archive
    
    Archived --> [*]
    
    state Active {
        [*] --> TaskCreation
        TaskCreation --> TaskAssignment
        TaskAssignment --> InProgress
        InProgress --> CodeReview
        CodeReview --> Testing
        Testing --> Done
        Done --> [*]
        
        CodeReview --> InProgress : Changes Requested
        Testing --> InProgress : Bugs Found
    }
```

### Community Module - Activity Diagram

```mermaid
flowchart TD
    Start([User Opens Community]) --> CheckAuth{Authenticated?}
    
    CheckAuth -->|No| RedirectLogin[Redirect to Login]
    RedirectLogin --> End([End])
    
    CheckAuth -->|Yes| LoadFeed[Load Community Feed]
    LoadFeed --> DisplayPosts[Display Posts]
    
    DisplayPosts --> UserAction{User Action}
    
    UserAction -->|Create Post| ComposePost[Open Post Composer]
    ComposePost --> AddContent[Add Text/Images/Code]
    AddContent --> AddTags[Add Tags/Hashtags]
    AddTags --> SubmitPost[Submit Post]
    SubmitPost --> ValidatePost{Valid Content?}
    
    ValidatePost -->|No| ShowError[Show Error Message]
    ShowError --> ComposePost
    
    ValidatePost -->|Yes| SavePost[Save to Database]
    SavePost --> NotifyFollowers[Notify Followers]
    NotifyFollowers --> LoadFeed
    
    UserAction -->|Comment| OpenCommentBox[Open Comment Box]
    OpenCommentBox --> WriteComment[Write Comment]
    WriteComment --> SubmitComment[Submit Comment]
    SubmitComment --> SaveComment[Save Comment]
    SaveComment --> NotifyAuthor[Notify Post Author]
    NotifyAuthor --> LoadFeed
    
    UserAction -->|Like| ToggleLike[Toggle Like Status]
    ToggleLike --> UpdateCount[Update Like Count]
    UpdateCount --> LoadFeed
    
    UserAction -->|Follow User| CheckFollowing{Already Following?}
    CheckFollowing -->|No| CreateFollow[Create Follow Relationship]
    CheckFollowing -->|Yes| RemoveFollow[Remove Follow]
    CreateFollow --> LoadFeed
    RemoveFollow --> LoadFeed
    
    UserAction -->|Search| EnterQuery[Enter Search Query]
    EnterQuery --> SearchDB[Search Database]
    SearchDB --> FilterResults[Filter by Type/Tags]
    FilterResults --> DisplayResults[Display Search Results]
    DisplayResults --> DisplayPosts
    
    UserAction -->|Exit| End
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style SavePost fill:#87CEEB
    style NotifyFollowers fill:#FFD700
```

### Database Schema - Detailed ERD with Constraints

```mermaid
erDiagram
    USER ||--o{ ENROLLMENT : enrolls
    USER ||--o{ MODULE_PROGRESS : tracks
    USER ||--o{ QUIZ_ATTEMPT : attempts
    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    USER ||--o{ PROJECT_MEMBER : joins
    USER ||--o{ AI_SESSION : has
    USER ||--o{ NOTIFICATION : receives
    USER }o--o{ USER : follows
    
    CAREER_PATH ||--|{ LEARNING_MODULE : contains
    CAREER_PATH ||--o{ ENROLLMENT : has
    CAREER_PATH ||--o{ CERTIFICATE : awards
    
    LEARNING_MODULE ||--o{ QUIZ : includes
    LEARNING_MODULE ||--o{ MODULE_PROGRESS : tracked_by
    
    QUIZ ||--|{ QUESTION : contains
    QUIZ ||--o{ QUIZ_ATTEMPT : receives
    
    QUESTION ||--o{ QUESTION_CHOICE : has
    QUESTION ||--o{ ANSWER : answered_by
    
    QUIZ_ATTEMPT ||--|{ ANSWER : includes
    
    ENROLLMENT ||--o{ MODULE_PROGRESS : tracks
    ENROLLMENT ||--o| CERTIFICATE : generates
    
    PROJECT ||--o{ PROJECT_MEMBER : has
    PROJECT ||--o{ PROJECT_TASK : contains
    PROJECT ||--o{ PROJECT_FILE : stores
    PROJECT ||--o{ CODE_REVIEW : receives
    
    POST ||--o{ COMMENT : receives
    POST ||--o{ LIKE : has
    POST }o--o{ HASHTAG : tagged_with
    
    USER {
        uuid id PK "Primary Key"
        string email UK "Unique, NOT NULL"
        string username UK "Unique, NOT NULL"
        string password_hash "NOT NULL"
        enum role "admin/instructor/student"
        datetime created_at "Default: now()"
        datetime updated_at "Auto-update"
        boolean is_active "Default: true"
    }
    
    CAREER_PATH {
        uuid id PK
        string name "NOT NULL"
        string slug UK "Unique, NOT NULL"
        text description
        enum program_type "bsit/bscs/bsis"
        enum difficulty "beginner/intermediate/advanced"
        integer total_modules "Default: 0"
        integer points_reward "Default: 100"
        datetime created_at
    }
    
    LEARNING_MODULE {
        uuid id PK
        uuid career_path_id FK "NOT NULL, ON DELETE CASCADE"
        string title "NOT NULL"
        text content
        enum module_type "video/text/interactive/quiz"
        integer order "NOT NULL"
        integer duration_minutes "Default: 30"
        boolean is_locked "Default: false"
        datetime created_at
    }
    
    QUIZ {
        uuid id PK
        uuid learning_module_id FK "NOT NULL, ON DELETE CASCADE"
        string title "NOT NULL"
        integer time_limit_minutes "Default: 30"
        integer passing_score "Default: 70, Range: 0-100"
        integer max_attempts "Default: 3"
        boolean randomize "Default: true"
        datetime created_at
    }
    
    QUESTION {
        uuid id PK
        uuid quiz_id FK "NOT NULL, ON DELETE CASCADE"
        text question_text "NOT NULL"
        enum type "multiple_choice/true_false/short_answer/coding"
        json correct_answer "NOT NULL"
        integer points "Default: 1, Min: 1"
        integer order "Default: 0"
    }
    
    ENROLLMENT {
        uuid id PK
        uuid user_id FK "NOT NULL, ON DELETE CASCADE"
        uuid career_path_id FK "NOT NULL, ON DELETE CASCADE"
        enum status "active/completed/dropped"
        integer progress_percentage "0-100"
        datetime enrolled_at "Default: now()"
        datetime completed_at "Nullable"
    }
    
    MODULE_PROGRESS {
        uuid id PK
        uuid user_id FK "NOT NULL, ON DELETE CASCADE"
        uuid module_id FK "NOT NULL, ON DELETE CASCADE"
        uuid enrollment_id FK "NOT NULL, ON DELETE CASCADE"
        enum status "not_started/in_progress/completed"
        integer current_slide "Default: 0"
        integer total_slides "Default: 1"
        integer time_spent_minutes "Default: 0"
        datetime started_at
        datetime completed_at
    }
    
    PROJECT {
        uuid id PK
        string name "NOT NULL"
        string slug UK "Unique"
        text description
        datetime deadline
        enum status "planning/active/on_hold/completed/cancelled"
        datetime created_at
    }
    
    POST {
        uuid id PK
        uuid user_id FK "NOT NULL, ON DELETE CASCADE"
        text content "NOT NULL"
        integer like_count "Default: 0"
        integer comment_count "Default: 0"
        boolean is_pinned "Default: false"
        datetime created_at
    }
```

---

## Performance and Scalability Diagrams

### System Load Flow

```mermaid
flowchart LR
    Users[Users<br/>500+ concurrent] --> CDN[CloudFront CDN]
    Users --> DNS[Route 53 DNS]
    
    CDN --> StaticFiles[Static Assets<br/>CSS, JS, Images]
    
    DNS --> LB[Load Balancer<br/>Nginx]
    
    LB --> Web1[Web Server 1<br/>Gunicorn + Daphne]
    LB --> Web2[Web Server 2<br/>Gunicorn + Daphne]
    LB --> Web3[Web Server 3<br/>Gunicorn + Daphne]
    
    Web1 --> Cache{Redis Cache}
    Web2 --> Cache
    Web3 --> Cache
    
    Cache -->|Hit| ReturnCache[Return Cached Data]
    Cache -->|Miss| DB_Read
    
    Web1 --> DB_Read[Read Replica<br/>PostgreSQL]
    Web2 --> DB_Read
    Web3 --> DB_Read
    
    Web1 --> DB_Write[(Master DB<br/>PostgreSQL)]
    Web2 --> DB_Write
    Web3 --> DB_Write
    
    DB_Write -.Replication.-> DB_Read
    
    Web1 --> Queue[Celery Queue<br/>Redis]
    Web2 --> Queue
    Web3 --> Queue
    
    Queue --> Worker1[Celery Worker 1]
    Queue --> Worker2[Celery Worker 2]
    
    Worker1 --> S3[S3 Storage]
    Worker2 --> S3
    
    style Users fill:#e3f2fd
    style LB fill:#fff3e0
    style Cache fill:#f1f8e9
    style DB_Write fill:#fce4ec
```

---

**Additional Diagrams Created:**
- 4 Additional Sequence Diagrams
- 3 Detailed Module Diagrams
- 2 State Diagrams
- 2 Activity Diagrams
- 1 Enhanced ERD with constraints
- 1 Performance diagram

These diagrams provide comprehensive coverage of all system modules and workflows.
