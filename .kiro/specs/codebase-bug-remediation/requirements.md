# Requirements Document

## Introduction

This specification defines a careful, codebase-wide bug remediation effort for CCIS-CodeHub, a learning and collaboration platform built on a Django 4.2 + Django REST Framework (DRF) + Channels backend, a React 18 + TypeScript + Vite frontend, a PostgreSQL/SQLite database, and a Capacitor Android wrapper.

The goal is to remediate a confirmed inventory of security, correctness, stability, and infrastructure defects without regressing existing intended behavior. Each requirement is written so that the corresponding fix is independently verifiable through automated tests, and so that legitimate user flows (login, registration, OAuth, quiz taking, collaboration) continue to work unchanged.

Requirements are organized into eight themes:

1. Authentication & Authorization Security
2. Quiz Engine Integrity
3. Projects & Collaboration
4. Community & Social
5. AI Mentor & Proctoring
6. Frontend Auth & Session Handling
7. Data Integrity & Counters
8. Configuration & Infrastructure

A final theme captures cross-cutting non-functional requirements that apply to the entire remediation.

## Glossary

- **Platform**: The complete CCIS-CodeHub system (backend, frontend, and mobile wrapper).
- **Backend_API**: The Django + DRF application serving HTTP and WebSocket requests.
- **Registration_Serializer**: The `UserRegistrationSerializer` in `accounts/serializers.py` responsible for creating new user accounts.
- **User_Serializer**: The `UserSerializer` in `accounts/serializers.py` used for full user representation.
- **User_ViewSet**: The `UserViewSet` in `accounts/views.py` managing user CRUD operations.
- **Admin_View**: Administrative endpoints in `accounts/admin_views.py`.
- **Google_OAuth_Service**: The backend components handling Google sign-in (`GoogleOAuthCallbackView`, `CreateGoogleAccountView`) in `accounts/views.py`.
- **Settings_Module**: The Django configuration in `core/settings.py`.
- **Learning_ViewSet**: The `LearningModuleViewSet` in `learning/views.py`.
- **Quiz_ViewSet**: The `QuizViewSet` and related quiz submission logic in `learning/views.py`.
- **Live_Quiz_Service**: Backend components in `views_live_quiz.py` handling live quiz sessions, questions, and responses.
- **Live_Quiz_Consumer**: The Channels WebSocket consumer driving real-time live quiz sessions.
- **Project_ViewSet**: The `PullRequestViewSet`, `ProjectViewSet`, and membership actions in `projects/views.py`.
- **Community_Service**: Backend components in `community/views.py` handling posts, comments, follows, organizations, and notifications.
- **Follow_Service**: The `UserFollowViewSet` and follower-count logic in the community and accounts apps.
- **Notification_Service**: The component that creates `Notification` records.
- **Competitions_App**: The `competitions` Django app routed in `core/urls.py`.
- **AI_Proctor_Service**: The proctoring components in `ai_proctor/services.py`.
- **AI_Mentor_Service**: The mentor chat components in `ai_mentor/views.py` and `ai_mentor/consumers.py`.
- **Captcha_Service**: The CAPTCHA challenge logic in `accounts/captcha.py`.
- **Frontend_App**: The React 18 + TypeScript client application.
- **Auth_Context**: The `AuthContext.tsx` React context managing client-side authentication state.
- **API_Client**: The `api.ts` Axios (or fetch) client including the 401 interceptor.
- **Admin_Route**: The `AdminRoute.tsx` React route guard.
- **Live_Quiz_Session_UI**: The `LiveQuizSession.tsx` React component.
- **Role**: The application-level user classification (`student`, `instructor`, `admin`) stored on the User model.
- **Staff_Flag**: Django's `is_staff` boolean on the User model.
- **Superuser_Flag**: Django's `is_superuser` boolean on the User model.
- **Backfill_Routine**: A management command or migration that recalculates persisted aggregate values from source-of-truth data.
- **Round_Trip**: A test in which an operation followed by its inverse returns the original value.

## Requirements

## Theme 1: Authentication & Authorization Security

### Requirement 1: Prevent privilege escalation during self-registration

**User Story:** As the Platform owner, I want self-registration to never grant elevated privileges, so that an unauthenticated visitor cannot create an administrator or instructor account.

#### Acceptance Criteria

1. WHEN a registration request is submitted with a `role` value other than the default student role, THE Registration_Serializer SHALL create the account with the default student role and SHALL NOT assign the requested elevated role.
2. WHEN a registration request is submitted with `is_staff`, `is_superuser`, or `is_active` values in the payload, THE Registration_Serializer SHALL ignore those values and create the account with `is_staff` false, `is_superuser` false, and the system default active state.
3. WHEN a valid registration request is submitted with an allowed institutional email, CAPTCHA, and matching passwords, THE Backend_API SHALL create the account and return a success response, preserving the existing registration flow.
4. THE Registration_Serializer SHALL treat the user role as a read-only field with respect to client-supplied input during account creation.

### Requirement 2: Enforce real Google OAuth verification

**User Story:** As the Platform owner, I want Google sign-in to rely only on Google-verified identity, so that an attacker cannot forge account creation or token issuance for an arbitrary email.

#### Acceptance Criteria

1. WHEN an account-creation request is received by the Google_OAuth_Service, THE Google_OAuth_Service SHALL derive the user email and identity solely from a server-side-verified Google token exchange and SHALL NOT trust client-supplied identity fields as proof of identity.
2. IF a Google account-creation request presents identity data that cannot be verified against Google, THEN THE Google_OAuth_Service SHALL reject the request with an authentication error and SHALL NOT issue JWT tokens.
3. WHEN a verified Google identity presents an email whose domain is outside the allowed institutional domains, THE Google_OAuth_Service SHALL reject account creation with a 403 response.
4. WHEN a verified Google identity completes the signup wizard with valid program and year-level data, THE Google_OAuth_Service SHALL create the account and issue tokens, preserving the existing institutional Google sign-up flow.

### Requirement 3: Restrict authenticated and privileged user creation

**User Story:** As the Platform owner, I want only authorized administrators to create users with elevated attributes, so that unauthenticated callers cannot mint privileged or pre-activated accounts.

#### Acceptance Criteria

1. WHEN an unauthenticated request is sent to the User_ViewSet create action, THE Backend_API SHALL reject the request with an authentication error and SHALL NOT create a user.
2. WHERE a user-creation request includes `role`, `is_staff`, `is_superuser`, or `is_active` fields, THE Backend_API SHALL apply those elevated attributes only when the requester holds Staff_Flag privileges.
3. WHEN a non-staff authenticated user attempts to set elevated attributes through user creation or update, THE Backend_API SHALL ignore the elevated attributes or reject the request, and SHALL NOT escalate that user's privileges.

### Requirement 4: Gate administrative endpoints on staff privileges

**User Story:** As the Platform owner, I want administrative endpoints to authorize on Django staff and superuser flags, so that an account whose application Role string was manipulated cannot reach admin functionality.

#### Acceptance Criteria

1. WHEN a request reaches an Admin_View, THE Admin_View SHALL authorize the request using Staff_Flag or Superuser_Flag rather than the application Role string.
2. IF a request to an Admin_View originates from a user lacking Staff_Flag and Superuser_Flag, THEN THE Admin_View SHALL reject the request with a 403 response.
3. WHEN a request to an Admin_View originates from a user holding Staff_Flag, THE Admin_View SHALL process the request, preserving existing administrative capabilities.

### Requirement 5: Make institutional CAPTCHA tokens single-use

**User Story:** As the Platform owner, I want each CAPTCHA token to be usable only once, so that a captured token cannot be replayed within its time-to-live to bypass bot protection.

#### Acceptance Criteria

1. WHEN a CAPTCHA token is successfully verified, THE Captcha_Service SHALL mark that token as consumed.
2. IF a previously consumed CAPTCHA token is presented again, THEN THE Captcha_Service SHALL reject verification even when the token is still within its time-to-live.
3. WHEN a fresh, unconsumed CAPTCHA token with a correct answer is presented within its time-to-live, THE Captcha_Service SHALL accept verification, preserving the existing CAPTCHA flow.

## Theme 2: Quiz Engine Integrity

### Requirement 6: Make module completion idempotent and crash-free

**User Story:** As a student, I want to re-trigger module completion without errors, so that revisiting a finished module never crashes the Platform.

#### Acceptance Criteria

1. WHEN a student completes a learning module for the first time, THE Learning_ViewSet SHALL record the completion and return a success response.
2. WHEN a student re-completes an already-completed module, THE Learning_ViewSet SHALL return a success response without raising an UnboundLocalError or any unhandled exception.
3. WHEN a module is re-completed, THE Learning_ViewSet SHALL NOT duplicate completion records or award duplicate points for that module.

### Requirement 7: Validate quiz scores on the server

**User Story:** As an instructor, I want quiz scores computed and validated by the Backend_API, so that a student cannot submit an inflated score from the client.

#### Acceptance Criteria

1. WHEN a quiz submission is received, THE Quiz_ViewSet SHALL compute the score from the submitted answers against the stored correct answers rather than trusting a client-supplied score or points value.
2. IF a quiz submission includes client-supplied score or points fields, THEN THE Quiz_ViewSet SHALL ignore those fields regardless of their values when determining the recorded score.
3. WHERE a quiz defines a time limit, IF a submission arrives after the allowed time window for the attempt, THEN THE Quiz_ViewSet SHALL enforce the time limit according to the quiz configuration.
4. WHEN a valid, in-time quiz submission is received, THE Quiz_ViewSet SHALL persist the server-computed score and return the result, preserving the existing submission flow.

### Requirement 8: Scope live quiz questions and responses by ownership and participation

**User Story:** As an instructor, I want live quiz questions and responses restricted to their rightful owners, so that students cannot read correct answers and instructors cannot alter other instructors' content.

#### Acceptance Criteria

1. WHEN a participant requests live quiz question data during an active session, THE Live_Quiz_Service SHALL exclude correct-answer and solution-code fields from the response sent to participants.
2. WHEN a user requests live quiz responses, THE Live_Quiz_Service SHALL return only responses the requesting user is authorized to view based on ownership of the quiz or the requester's own responses.
3. IF an instructor attempts to edit or delete a live quiz question they do not own, THEN THE Live_Quiz_Service SHALL reject the request with a 403 response.
4. WHEN the owning instructor requests full live quiz question data including correct answers, THE Live_Quiz_Service SHALL return the complete data, preserving authoring and grading capabilities.

### Requirement 9: Produce consistent live quiz scoring across REST and WebSocket paths

**User Story:** As a student, I want my live quiz score to be identical regardless of the delivery path, so that scoring is fair and reproducible.

#### Acceptance Criteria

1. WHEN a coding question with partial credit is scored, THE Live_Quiz_Service SHALL award the same partial-credit points through the REST submission path as through the WebSocket path for identical answers.
2. WHEN a multiple-choice question with a time bonus is scored, THE Live_Quiz_Service SHALL compute the same time-bonus value through the REST path as through the WebSocket path for identical timing.
3. FOR ALL identical sets of question, answer, and timing inputs, the score produced by the REST path SHALL equal the score produced by the WebSocket path.

### Requirement 10: Support live quiz retakes with isolated attempts

**User Story:** As an instructor, I want to allow multiple retakes of a live quiz, so that students can rejoin with a fresh attempt instead of inheriting a previous score.

#### Acceptance Criteria

1. WHERE a live quiz session permits more than one retake, WHEN a student starts a new attempt, THE Live_Quiz_Service SHALL create a distinct attempt record rather than reusing the prior participant record.
2. WHEN a student rejoins a live quiz session for a new attempt, THE Live_Quiz_Service SHALL start that attempt with a reset score rather than carrying over the previous attempt's score.
3. WHILE a maximum retake limit is configured, IF a student attempts to exceed the configured retake count, THEN THE Live_Quiz_Service SHALL reject the additional attempt.
4. WHERE a live quiz session permits a single attempt, THE Live_Quiz_Service SHALL preserve the existing single-attempt behavior.

### Requirement 11: Prevent duplicate in-progress quiz attempts

**User Story:** As a student, I want starting a quiz to yield a single resumable attempt, so that submission does not fail due to multiple in-progress attempts.

#### Acceptance Criteria

1. WHEN a student starts a quiz for which an in-progress attempt already exists, THE Quiz_ViewSet SHALL resume the existing in-progress attempt rather than creating an additional one.
2. WHEN a quiz submission is processed, THE Quiz_ViewSet SHALL resolve exactly one in-progress attempt and SHALL NOT raise a MultipleObjectsReturned error.
3. WHEN a student starts a quiz with no in-progress attempt, THE Quiz_ViewSet SHALL create a single new attempt, preserving the existing start behavior.
## Theme 3: Projects & Collaboration

### Requirement 12: Enforce correct pull request merge semantics

**User Story:** As a project maintainer, I want pull request merges to respect approvals, protected branches, and atomicity, so that merges reflect real review state and never leave the repository half-updated.

#### Acceptance Criteria

1. WHEN a pull request merge is requested, THE Project_ViewSet SHALL apply the merge as a single transaction so that a failure leaves no partial state.
2. IF a pull request targets a protected branch without satisfying the required reviewer approvals, THEN THE Project_ViewSet SHALL reject the merge with an error response.
3. WHEN a pull request merge succeeds, THE Project_ViewSet SHALL update the target branch and commit state to reflect the merged changes.
4. WHEN a pull request that satisfies all approval and branch-protection rules has its merge operation complete successfully, THE Project_ViewSet SHALL mark the pull request as merged and return a success response.
5. IF the merge operation fails after validation, THEN THE Project_ViewSet SHALL leave the pull request unmerged and SHALL NOT mark it as merged.

### Requirement 13: Authorize project membership changes

**User Story:** As a project owner, I want member additions to require proper authorization, so that arbitrary users cannot add members to a project.

#### Acceptance Criteria

1. WHEN a request is made to add a member to a project, THE Project_ViewSet SHALL verify that the requester is authorized to manage that project's membership.
2. IF an unauthorized user attempts to add a member to a project, THEN THE Project_ViewSet SHALL reject the request with a 403 response and SHALL NOT create a membership record.
3. WHEN an authorized owner or maintainer adds a member, THE Project_ViewSet SHALL create the membership record and return a success response.
4. THE Project_ViewSet SHALL permit only a project owner or maintainer to add members.

### Requirement 14: Report project progress from valid fields and roles

**User Story:** As a project member, I want the project progress endpoint to compute correctly, so that viewing progress never crashes and reflects real contribution data.

#### Acceptance Criteria

1. WHEN the project progress action is invoked, THE Project_ViewSet SHALL read contribution data from a field that exists on the queried model and SHALL NOT raise an AttributeError.
2. WHEN the project progress action references member roles, THE Project_ViewSet SHALL use role values defined in the membership model and SHALL NOT reference an undefined role value.
3. WHEN project progress is requested for a valid project, THE Project_ViewSet SHALL return a progress response, preserving the existing progress reporting behavior.
## Theme 4: Community & Social

### Requirement 15: Scope follow records to the requesting user

**User Story:** As a user, I want follow data restricted to my own relationships, so that I cannot read or delete other users' follow records.

#### Acceptance Criteria

1. WHEN a user queries follow records through the Follow_Service, THE Follow_Service SHALL return only follow rows where the requesting user is the follower or the followed party.
2. IF a user attempts to delete a follow record they do not participate in, THEN THE Follow_Service SHALL reject the request with a 403 or 404 response and SHALL guarantee that no record is deleted.
3. WHEN a user creates or removes a follow relationship in which they are the follower, THE Follow_Service SHALL apply the change, preserving the existing follow and unfollow behavior.

### Requirement 16: Create valid organization notifications

**User Story:** As an organization member, I want join, invite, and approval actions to generate valid notifications, so that these actions complete without server errors.

#### Acceptance Criteria

1. WHEN the Community_Service creates a notification for an organization join, invite, or approval event, THE Notification_Service SHALL set the notification type to a value defined in the notification type choices.
2. WHEN the Community_Service creates a notification for an organization join, invite, or approval event, THE Notification_Service SHALL populate all non-null required fields, including the notification title.
3. IF a notification is created with missing required fields, THEN THE Notification_Service SHALL prevent persistence rather than raising an unhandled database error.
4. WHEN an organization join, invite, or approval action is performed with valid data, THE Community_Service SHALL complete the action and create the notification successfully.

## Theme 5: AI Mentor & Proctoring

### Requirement 17: Replace server-side webcam capture with client-supplied proctoring frames

**User Story:** As a student in a proctored session, I want proctoring to analyze my own device's camera frames, so that proctoring works correctly in a multi-user cloud deployment.

#### Acceptance Criteria

1. THE AI_Proctor_Service SHALL obtain proctoring image frames from client-submitted data rather than from a server-attached camera device.
2. WHILE multiple proctored sessions run concurrently on the Backend_API, THE AI_Proctor_Service SHALL process each session's frames without sharing a single server camera device across sessions.
3. WHEN the AI_Proctor_Service uses a shared face-landmark detector across concurrent requests, THE AI_Proctor_Service SHALL serialize access so that concurrent use does not produce corrupted or interleaved results.
4. WHEN the AI_Proctor_Service mutates shared session-tracking state, THE AI_Proctor_Service SHALL guard that mutation with a lock so that concurrent updates remain consistent.
5. WHEN the AI_Proctor_Service assigns frame timestamps, THE AI_Proctor_Service SHALL produce timestamps that are monotonically non-decreasing within a session.

### Requirement 18: Make AI mentor messaging robust and correct

**User Story:** As a student using the AI mentor, I want the mentor chat to reference the correct messages and handle my replies safely, so that conversations do not crash or misbehave.

#### Acceptance Criteria

1. WHEN the AI_Mentor_Service sends a message, THE AI_Mentor_Service SHALL reference the most recent prior AI message rather than the user message just created.
2. IF a user's confirmation reply is ambiguous, THEN THE AI_Mentor_Service SHALL handle the reply deterministically without raising an UnboundLocalError.
3. WHEN the AI_Mentor_Service generates assistant content, THE AI_Mentor_Service SHALL call an existing, defined content-generation function.
4. WHEN the AI_Mentor_Service parses numeric input from a message, THE AI_Mentor_Service SHALL validate the input before conversion and SHALL handle non-numeric input without raising an unhandled exception.
5. WHEN the AI_Mentor_Service determines a user's role, THE AI_Mentor_Service SHALL read the Role from the User model where it is defined.
## Theme 6: Frontend Auth & Session Handling

### Requirement 19: Provide consistent client session storage with per-tab isolation

**User Story:** As a user, I want my session stored consistently in one place, so that authentication state behaves predictably across tabs.

#### Acceptance Criteria

1. THE Auth_Context SHALL read and write authentication tokens from a single, consistent storage mechanism rather than mixing session storage and local storage for the same token.
2. WHERE per-tab session isolation is the intended behavior, THE Auth_Context SHALL store the session so that separate browser tabs maintain independent sessions.
3. WHEN a user is authenticated, THE Frontend_App SHALL read the active token from the same storage location used to write it.

### Requirement 20: Recover from expired sessions with token refresh and return navigation

**User Story:** As a user, I want an expired token to trigger a refresh or a graceful redirect, so that I am not trapped in a logout loop and I return to my intended page.

#### Acceptance Criteria

1. WHEN the API_Client receives a 401 response and a valid refresh token is available, THE API_Client SHALL attempt a token refresh and retry the original request once.
2. IF a token refresh attempt fails, THEN THE API_Client SHALL redirect the user to the login page and preserve the originating location as a return target.
3. WHILE handling a 401 response, THE API_Client SHALL NOT enter a repeated redirect loop for the same failed request.
4. WHEN a 401 refresh-and-retry succeeds, THE API_Client SHALL deliver the retried response to the caller, preserving the original request intent.

### Requirement 21: Distinguish authorization failures from authentication failures for admin probes

**User Story:** As a student, I want admin-only endpoints to not log me out, so that an authorization denial does not terminate my session.

#### Acceptance Criteria

1. WHEN an admin-only endpoint returns a 403 response to a non-admin user, THE Frontend_App SHALL treat the response as an authorization denial and SHALL NOT log the user out.
2. IF an admin-only endpoint returns a 401 response, THEN THE Frontend_App SHALL treat the response as an authentication failure and apply the session-recovery behavior.
3. WHEN a student loads a view that probes an admin-only endpoint, THE Frontend_App SHALL keep the student's session active regardless of an authorization denial.

### Requirement 22: Make the admin route guard safe and efficient

**User Story:** As an administrator, I want the admin route guard to evaluate access without unmount errors or redundant fetches, so that admin navigation is stable and efficient.

#### Acceptance Criteria

1. IF the Admin_Route component begins unmounting before an in-flight access check resolves, THEN THE Admin_Route SHALL prevent all state updates once unmount begins, regardless of when the check resolves.
2. THE Admin_Route SHALL read the authentication token from the same consistent storage mechanism used by the Auth_Context.
3. WHERE admin status is already available in shared client state, THE Admin_Route SHALL reuse that status rather than re-fetching the profile on every mount.
4. WHEN an administrator navigates to an admin route, THE Admin_Route SHALL grant access, preserving existing admin navigation.

### Requirement 23: Fix stale-closure handling in the live quiz WebSocket UI

**User Story:** As a student in a live quiz, I want real-time events to use current state, so that fallback scoring and pause handling behave correctly.

#### Acceptance Criteria

1. WHEN the Live_Quiz_Session_UI handles a question-end event, THE Live_Quiz_Session_UI SHALL read the current selected answer rather than a stale value captured at handler creation.
2. WHILE a live quiz is paused, IF a question-shuffle event is received, THEN THE Live_Quiz_Session_UI SHALL respect the paused state and SHALL NOT advance the question.
3. WHEN the Live_Quiz_Session_UI processes WebSocket messages, THE Live_Quiz_Session_UI SHALL access the latest session and answer state for scoring decisions.

### Requirement 24: Acquire camera media outside of render

**User Story:** As a student, I want the camera to be requested through lifecycle effects, so that quiz pages do not repeatedly prompt or leak media streams.

#### Acceptance Criteria

1. THE quiz session pages SHALL request camera media within lifecycle effects rather than during component render.
2. WHEN a quiz session page unmounts, THE Frontend_App SHALL stop the acquired media stream tracks.
3. WHEN a quiz session page mounts, THE Frontend_App SHALL request camera access exactly once per session start with no automatic retry within that session, preserving proctoring capture.

### Requirement 25: Resolve the Google auth API base URL from configuration

**User Story:** As a developer, I want Google authentication to use the configured API base URL, so that sign-in works across deployment environments.

#### Acceptance Criteria

1. THE Google sign-in client module SHALL construct backend request URLs from the configured API base URL value rather than a hardcoded path.
2. WHERE the API base URL configuration value is set, THE Frontend_App SHALL direct Google authentication requests to that configured base URL without an alternative fallback URL.
3. WHEN Google authentication runs in the default environment, THE Frontend_App SHALL preserve the existing successful sign-in behavior.
## Theme 7: Data Integrity & Counters

### Requirement 26: Maintain follower and following counts accurately

**User Story:** As a user, I want my follower and following counts to reflect reality, so that displayed social statistics are correct.

#### Acceptance Criteria

1. WHEN a follow relationship is accepted, THE Follow_Service SHALL update the affected users' follower and following counts to match the number of accepted relationships.
2. WHEN a follow relationship is removed, THE Follow_Service SHALL update the affected users' follower and following counts to match the number of remaining accepted relationships.
3. THE Backfill_Routine SHALL recalculate every user's follower and following counts from existing follow records so that stored counts match the source-of-truth relationships.
4. FOR ALL users after backfill, the stored follower count SHALL equal the count of accepted follow records where the user is followed, and the stored following count SHALL equal the count of accepted follow records where the user is the follower.

### Requirement 27: Update like and participant counters atomically

**User Story:** As a user, I want like counts and live-quiz participant statistics to be accurate under concurrency, so that simultaneous actions do not corrupt the totals.

#### Acceptance Criteria

1. WHEN a post or comment like count is updated, THE Community_Service SHALL apply the update using an atomic database operation rather than a read-modify-write sequence.
2. WHEN live-quiz participant statistics are updated, THE Live_Quiz_Service SHALL apply the update using an atomic database operation or a row-level lock.
3. WHEN concurrent like operations target the same post or comment, THE Community_Service SHALL produce a final count equal to the number of net like operations applied.
4. THE Backfill_Routine SHALL recalculate existing like counts and participant statistics from source-of-truth records so that stored counts match the underlying data.

### Requirement 28: Aggregate admin analytics view totals correctly

**User Story:** As an administrator, I want total view metrics summed correctly, so that the analytics dashboard reports accurate totals.

#### Acceptance Criteria

1. WHEN admin analytics computes total views, THE Backend_API SHALL sum the per-record view-count values rather than count the number of records.
2. WHEN the analytics dashboard is requested, THE Backend_API SHALL return a total-views value equal to the sum of all contributing view counts.

### Requirement 29: Compute leaderboard rankings across all scored activities

**User Story:** As a student, I want weekly and monthly leaderboards to reflect all my scored activity, so that rankings are fair and complete.

#### Acceptance Criteria

1. WHEN the weekly or monthly leaderboard is computed, THE Backend_API SHALL include all scored activity types that contribute to a user's points within the period, not only completed modules.
2. WHEN leaderboard rankings are produced, THE Backend_API SHALL order users by their total period points across the included activity types.

## Theme 8: Configuration & Infrastructure

### Requirement 30: Honor the debug configuration flag

**User Story:** As an operator, I want the debug flag parsed as a boolean, so that production security middleware activates when debug is disabled.

#### Acceptance Criteria

1. WHEN the Settings_Module reads the debug configuration value, THE Settings_Module SHALL interpret it as a boolean rather than a non-empty string.
2. WHILE the debug configuration value is set to a false-equivalent value, THE Settings_Module SHALL set debug mode off and activate the production security configuration, with debug mode and production security mutually exclusive.
3. WHILE the debug configuration value is set to a true-equivalent value, THE Settings_Module SHALL enable debug mode, preserving the existing development behavior.

### Requirement 31: Apply timeouts to outbound external requests

**User Story:** As an operator, I want every outbound external call to use a timeout, so that a slow third party cannot hang Backend_API workers.

#### Acceptance Criteria

1. WHEN the Backend_API makes an outbound request to Google OAuth endpoints, THE Backend_API SHALL apply an explicit request timeout.
2. WHEN the Backend_API makes an outbound request to an AI provider, THE Backend_API SHALL apply an explicit request timeout.
3. IF an outbound external request exceeds its configured timeout, THEN THE Backend_API SHALL handle the timeout and return an error response rather than blocking indefinitely.

### Requirement 32: Resolve or remove the unimplemented competitions app

**User Story:** As a developer, I want the competitions routes to either function or be removed, so that advertised endpoints do not return unexpected 404 errors.

#### Acceptance Criteria

1. WHERE the Competitions_App lacks an implementation, THE Backend_API SHALL remove the competitions routes and their advertisement from the API root listing, while leaving competitions database tables and migrations unchanged.
2. IF the competitions feature is retained, THEN THE Competitions_App SHALL provide serializers, views, and routes that return successful responses for its advertised endpoints.
3. WHEN a client requests an endpoint listed in the API root, THE Backend_API SHALL route the request to a working handler rather than a nonexistent view.

### Requirement 33: Use cross-process-capable real-time and task infrastructure

**User Story:** As an operator, I want real-time messaging, caching, and background tasks to function across processes, so that notifications and async work behave correctly in a multi-process deployment.

#### Acceptance Criteria

1. WHERE the Platform runs across multiple processes, THE Backend_API SHALL use a channel layer that delivers WebSocket messages across processes.
2. WHEN a server-side event targets a connected notification client, THE Backend_API SHALL deliver the push to the corresponding WebSocket consumer.
3. WHERE background task execution is required, THE Backend_API SHALL execute tasks through a worker configuration that operates across processes rather than only in an eager in-process mode.
4. WHEN application settings change, THE Backend_API SHALL serve the updated settings to all processes within a bounded staleness window.
5. IF an application settings change cannot propagate to all processes within the bounded staleness window, THEN THE Backend_API SHALL reject the settings change.
## Theme 9: Cross-Cutting Non-Functional Requirements

### Requirement 34: Preserve existing intended behavior across all fixes

**User Story:** As a user, I want remediation to fix defects without regressing working features, so that the Platform remains usable throughout the effort.

#### Acceptance Criteria

1. WHEN a remediation change is applied, THE Platform SHALL preserve the existing intended behavior of unaffected and legitimate flows, including login, registration, OAuth sign-in, quiz taking, and collaboration.
2. FOR ALL security fixes, THE Platform SHALL continue to accept valid login, registration, and institutional OAuth requests while rejecting the targeted abuse cases.
3. IF a security fix would break existing legitimate functionality, THEN THE remediation SHALL withhold the breaking change until a non-breaking solution is found.
4. WHEN a remediation change is merged, THE Platform SHALL pass the existing automated test suite together with the new tests added for that change.

### Requirement 35: Provide independent test verification for each fix

**User Story:** As a developer, I want each fix backed by its own tests, so that every remediation is independently verifiable and protected against regression.

#### Acceptance Criteria

1. WHEN a remediation change is implemented, THE remediation SHALL include automated tests that fail against the pre-fix behavior and pass against the post-fix behavior.
2. WHERE a fix concerns a parser, serializer, or scoring transformation, THE remediation SHALL include a Round_Trip or equivalence property test validating the corrected behavior.
3. THE remediation SHALL follow existing project patterns for DRF viewsets, permissions, and testing so that new tests integrate with the current suite.

### Requirement 36: Provide backfill paths for corrected aggregate data

**User Story:** As an operator, I want corrected counters to be recalculated for existing data, so that historical records become consistent after a counter fix is deployed.

#### Acceptance Criteria

1. WHEN a counter or aggregate correctness fix is deployed, THE remediation SHALL provide a Backfill_Routine that recalculates the affected stored values from source-of-truth data.
2. WHEN the Backfill_Routine completes, THE stored aggregate values SHALL equal the values recomputed from the underlying records.
3. WHERE a Backfill_Routine is run more than once, THE Backfill_Routine SHALL produce the same result as a single run for unchanged source data.
