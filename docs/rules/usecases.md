# The Comprehensive Blueprint for Writing Effective Use Cases
**Based on Alistair Cockburn’s *Writing Effective Use Cases***

## Phase 1: Strategy & Mindset
*Before starting, establish the right approach to manage energy and scope.*

### 1. Adopt the "Hub-and-Spoke" Mindset
*   Understand that use cases are only **Chapter 3 (Behavior)** of the requirements.
*   Do not force Data Formats, UI Design, or Complex Business Rules into the use case text. Instead, link to them (the "spokes") from the use case (the "hub") **(Chapter 1.3 & Chapter 16)**.

### 2. Commit to "Breadth-First" Writing
*   Do not write full details immediately. It wastes energy.
*   **The Workflow:** Actors & Goals $\rightarrow$ Briefs $\rightarrow$ Main Success Scenario $\rightarrow$ Failure Conditions $\rightarrow$ Failure Handling **(Chapter 1.5 & Reminder 17)**.

---

## Phase 2: Scoping & Discovery
*Define the boundaries and the goals before writing steps.*

### 3. Define the System Scope
*   **The In/Out List:** Create a table of topics. Mark them "In" or "Out." Use this dynamically in meetings to stop scope creep **(Chapter 3)**.
*   **Design Scope:** Decide if you are describing the **Enterprise** (Business Use Case) or the **System** (System Use Case). Label the scope explicitly (e.g., "MyInsCo" vs. "Acura System") **(Chapter 3)**.

### 4. Identify Actors & Stakeholders
*   **Primary Actor:** Who calls upon the system? **(Chapter 4)**.
*   **Off-Stage Stakeholders:** Who doesn't touch the system but cares about the result (e.g., Auditors, Regulators)? You must identify their interests to ensure the system protects them **(Chapter 4)**.

### 5. Build the Actor-Goal List (Functional Scope)
*   List every primary actor and their goals.
*   **Check Goal Levels:** Ensure goals are at the **User-Goal Level (Sea-Level)**.
    *   *Test:* Can it be done in one sitting (2–20 mins)? Does the user go away happy? (e.g., "Register Customer" = Blue/Sea-Level. "Log In" = Indigo/Subfunction. "Manage Sales" = White/Summary) **(Chapter 5)**.

---

## Phase 3: The "Warm-Up" (Low Precision)
*Get the story straight before worrying about the formalities.*

### 6. Write a Usage Narrative
*   Write a specific, concrete story using real names (e.g., "Mary tries to buy a book but her card fails"). This helps the team visualize the reality before abstracting it into a formal use case **(Chapter 1.6)**.

### 7. Draft Use Case Briefs
*   Write a 2–6 sentence summary for each goal in your Actor-Goal list. Use these to estimate project complexity and prioritize work before writing full steps **(Chapter 3)**.

---

## Phase 4: The "Fully Dressed" Draft (High Precision)
*Now, detail the specific behavioral contract.*

### 8. Setup the Template
*   **Format:** Choose "Fully Dressed" (numbered steps) for high-risk projects or "Casual" (paragraphs) for low-risk ones **(Chapter 11)**.
*   **Preconditions:** What is true *before* the start? (Don't check these in the steps; assume they are true) **(Chapter 6)**.
*   **Trigger:** What specific event starts the use case? **(Chapter 6)**.
*   **Guarantees:**
    *   *Minimal:* What the system promises even on failure (e.g., "Log the error") **(Chapter 6)**.
    *   *Success:* What is achieved when the goal succeeds **(Chapter 6)**.

### 9. Write the Main Success Scenario (MSS)
*   **Steps:** Write 3–9 steps showing the "Happy Path."
*   **Style Rules:**
    *   **Grammar:** Simple Subject + Verb + Object (e.g., "System validates password").
    *   **Bird's Eye View:** Write from a third-person perspective.
    *   **No GUI:** Describe *intent*, not interface. (e.g., "User identifies self," NOT "User clicks Login button") **(Chapter 7 & Reminder 7)**.
    *   **Who has the ball?** Clearly distinguish if the User or the System is acting **(Chapter 7)**.

---

## Phase 5: Handling Failures & Variations
*The most critical phase for discovering hidden requirements.*

### 10. Brainstorm Extensions
*   Look at every step in the MSS. Ask: "What can go wrong?" "What choices does the user have?"
*   List *all* failure conditions before writing the handling logic **(Chapter 8)**.

### 11. Write Extension Handling
*   **Numbering:** Use a scheme like "2a" to link the failure to Step 2.
*   **The Logic:** Describe detection $\rightarrow$ handling $\rightarrow$ outcome (success or failure).
*   **Sub Use Cases:** If a recovery step is complex (e.g., "User creates a new account"), link to it as a Sub Use Case (underline it) **(Chapter 10)**.

### 12. Handle Special Cases
*   **Technology Variations:** If a step can be done via Voice OR Keyboard, do not branch. List it in the "Technology & Data Variations" section **(Chapter 9)**.
*   **CRUD:** Merge "Create," "Retrieve," "Update," "Delete" into a single "Manage [Object]" use case to avoid repetition **(Chapter 14)**.
*   **Extension Use Cases:** If the main flow can be interrupted asynchronously (e.g., "Spell Check" or "Change Language"), write a separate Extension Use Case that "patches" onto the base use case. Do not clutter the MSS **(Chapter 10)**.

---

## Phase 6: Review & Refine
*Quality control.*

### 13. The "Striped Trousers" Check
*   Does the use case have a clear Goal (Belt)?
*   Does it have a Success leg (MSS) and a Failure leg (Extensions)? **(Chapter 2)**.

### 14. The "Missing Requirements" Check
*   Did you accidentally include UI design or data field definitions? Remove them and link to the appropriate external documents (UI Design or Data Dictionary) **(Chapter 16)**.

### 15. Final Readability Check
*   Is it a readable prose essay? If it is hard to read, it will be ignored. **(Chapter 20, Reminder 1)**.

-----



# EXAMPLE: Warehouse Certification Adaptive Learning Platform
**System Specification**

## 1. Domain Understanding

**Context:**
The application is an adaptive learning platform designed to prepare warehouse staff (specifically forklift operators) for technical certification exams (UDT). Unlike a static quiz, the system employs **Spaced Repetition** to optimize retention.

**Core Value Proposition:**
1.  **Efficiency:** Users do not waste time answering questions they already know perfectly.
2.  **Retention:** The system re-introduces "mastered" questions after a decay period to ensure long-term memory.
3.  **Habit Formation:** Gamification elements (Streaks, Daily Goals) encourage small, daily learning sessions rather than "cramming."

**Target Audience:**
Mobile-first users (warehouse operators) who need quick, 3-5 minute training sessions during breaks.

---

## 2. Domain Glossary (Ubiquitous Language)

These terms represent the shared language between the code (Domain Layer) and the business logic.

| Term | Definition | Code Reference |
| :--- | :--- | :--- |
| **Sprint** | A single game session consisting of a fixed number of questions (default: 15). Can be a "Daily Sprint" (mixed) or "Category Sprint" (focused). | `GameConfig.SPRINT_QUESTIONS` |
| **Mastery** | The state of a question where the user has answered it correctly `N` times in a row. Currently, $N=1$. | `GameConfig.MASTERY_THRESHOLD` |
| **Streak (User)** | The number of consecutive days a user has logged in. Resets if a day is skipped. | `UserProfile.streak_days` |
| **Streak (Question)** | The number of times a specific question has been answered correctly *in a row*. Resets to 0 immediately upon a wrong answer. | `user_progress.consecutive_correct` |
| **Candidate** | A question eligible to be included in a Sprint. It carries metadata about the user's history with it (seen/unseen, current streak). | `QuestionCandidate` |
| **Smart Mix** | The algorithmically generated set of questions for a Daily Sprint. It balances **New** material vs. **Review** material. | `SpacedRepetitionSelector` |
| **Decay** | The logic that forces a "Mastered" question back into the review pool if it hasn't been seen in a specific timeframe (3 days). | `sqlite_repository.py` |
| **Onboarding** | A one-time flow that initializes the user profile and teaches UI mechanics. | `OnboardingFlow` |

---

## 3. Business Rules and Constraints

### 3.1. Learning Algorithm (Spaced Repetition)
The "Smart Mix" algorithm selects questions based on the following priority hierarchy:
1.  **Pool Segregation:**
    *   **New Pool:** Questions never seen by the user.
    *   **Learning Pool:** Seen questions with `question_streak < MASTERY_THRESHOLD`.
    *   **Review Pool:** Seen questions with `question_streak >= MASTERY_THRESHOLD`.
2.  **Selection Ratio:** The system attempts to fill **60%** of the Sprint with **New** questions (`GameConfig.NEW_RATIO = 0.6`).
3.  **Review Trigger:** A Mastered question re-enters the candidate pool if it was last answered > 3 days ago.
4.  **Backfill Strategy:** If there aren't enough "New" questions, the system fills the remaining slots with "Learning/Review" questions to ensure the user always has a full Sprint.

### 3.2. Gamification & Progression
*   **Daily Goal:** The user targets **3** completed sprints per day.
*   **Streak Calculation:**
    *   Login on $Today = LastLogin$: No change.
    *   Login on $Today = LastLogin + 1$: Streak increments (+1).
    *   Login on $Today > LastLogin + 1$: Streak resets to 1.
*   **Passing Score:** A Sprint is considered "Passed" (Positive Rating) if the score is $\ge 11/15$ (~73%).

### 3.3. Question Logic
*   **Immediate Feedback:** The user must see if they were correct/incorrect immediately after submission.
*   **High Stakes Reset:** If a user answers a question incorrectly, their `consecutive_correct` count for that question resets to **0**, regardless of how high it was previously.
*   **Mastery Threshold:** A question is considered "Mastered" when `consecutive_correct >= 1`.

---

## 4. Use Cases

### Use Case 1: Complete Daily Sprint

**Primary Actor:** Forklift Operator
**Scope:** Warehouse Quiz App
**Level:** 🌊 User Goal
**Stakeholders & Interests:**
*   **Operator:** Wants to learn efficiently without repeating known facts; wants credit for the daily goal.
*   **Employer:** Wants assurance that the operator is retaining knowledge (via Spaced Repetition).

**Preconditions:** User is identified and authorized.
**Minimal Guarantees:** System saves the result of every individual question answered, even if the sprint is aborted. Streak is updated based on the last login date.
**Success Guarantees:** Sprint is marked complete. Daily Goal counter increments. "Smart Mix" algorithm updates question weights for tomorrow.

**Main Success Scenario:**
1.  User **requests to start** a Daily Sprint.
2.  System generates a "Smart Mix" of questions (based on *Business Rule 3.1*).
3.  **User and System repeat until sprint limit is reached:**
    a. System presents the next question.
    b. User **submits** an answer.
    c. System validates the answer and records the result (Pass/Fail) to the database.
    d. System provides immediate feedback on correctness.
4.  System presents the Sprint Summary (score, time, rewards).
5.  User **acknowledges** the summary to return to the Dashboard.

**Extensions:**
*   **2a. Insufficient Questions:**
    *   2a1. System detects fewer than 15 eligible questions.
    *   2a2. System generates a reduced-length sprint.
*   **2b. No Questions Available (All Mastered):**
    *   2b1. System detects 0 eligible questions.
    *   2b2. System informs user of mastery status.
    *   2b3. Use case ends (Success).
*   **3a. User Aborts (e.g., closes app or navigates away):**
    *   3a1. System saves progress of *answered* questions.
    *   3a2. System discards the temporary session score.
    *   3a3. System redirects to Dashboard. (Goal fails).

---

### Use Case 2: Review Specific Category

**Primary Actor:** Forklift Operator
**Scope:** Warehouse Quiz App
**Level:** 🌊 User Goal
**Stakeholders & Interests:**
*   **Operator:** Wants to focus study on a specific weak area (e.g., Safety/BHP).

**Preconditions:** User is on the Dashboard.
**Minimal Guarantees:** System saves the result of every individual question answered.
**Success Guarantees:** User has practiced questions exclusively from the selected domain. Category-specific mastery statistics are updated.

**Main Success Scenario:**
1.  User **initiates a review** of a specific Category (e.g., "BHP").
2.  System retrieves all eligible questions for that category.
3.  **User and System repeat until all questions in category are answered OR user stops:**
    a. System presents the next question.
    b. User **submits** an answer.
    c. System validates and records the result.
    d. System provides immediate feedback.
4.  System presents the Summary Screen.
5.  User **acknowledges** the summary to return to the Dashboard.

**Extensions:**
*   **2a. Category Empty:**
    *   2a1. System displays "No questions in category" message.
    *   2a2. User returns to Dashboard.
*   **3a. User Aborts (e.g., closes app or navigates away):**
    *   3a1. System saves progress of *answered* questions.
    *   3a2. System redirects to Dashboard.

---

### Use Case 3: Fix Mistakes

**Primary Actor:** Forklift Operator
**Scope:** Warehouse Quiz App
**Level:** 🌊 User Goal
**Stakeholders & Interests:**
*   **Operator:** Wants to immediately correct misconceptions to prevent the "High Stakes Reset" from happening again tomorrow.

**Preconditions:**
*   User has just completed a Sprint.
*   The session resulted in at least one incorrect answer (`has_errors = True`).
*   User is on the Summary Screen.

**Minimal Guarantees:** Any corrected answers are updated in the database (streak moves from 0 to 1).
**Success Guarantees:** All errors from the previous session have been reviewed and re-attempted.

**Main Success Scenario:**
1.  User **requests to review errors** from the previous session.
2.  System retrieves the list of failed questions.
3.  **User and System repeat until all errors are reviewed:**
    a. System presents the failed question.
    b. User **submits** the correct answer.
    c. System updates DB (streak moves from 0 -> 1).
    d. System displays positive feedback.
4.  System presents the Summary Screen.

**Extensions:**
*   **3b. User selects the INCORRECT answer (again):**
    *   3b1. System records the failure (streak remains 0).
    *   3b2. System displays negative feedback.
    *   3b3. System moves to the next question (does **not** force an immediate retry of the same question).
*   **3c. User Aborts (e.g., closes app or navigates away):**
    *   3c1. System saves progress of any *corrected* questions.
    *   3c2. System redirects to Dashboard.

---

### Use Case 4: Onboard New User

**Primary Actor:** New User
**Scope:** Warehouse Quiz App
**Level:** 🌊 User Goal
**Stakeholders & Interests:**
*   **Employer:** Wants to ensure the operator understands how to use the app before training data is recorded.

**Preconditions:** User has just created an account; `has_completed_onboarding` is False.
**Minimal Guarantees:** If the flow is aborted, `has_completed_onboarding` remains False (User will be forced to retry next login).
**Success Guarantees:** User understands UI mechanics; `has_completed_onboarding` is set to True.

**Main Success Scenario:**
1.  System detects a first-time user.
2.  System displays the Welcome / Context screen.
3.  User proceeds to the Tutorial.
4.  System presents a sample Tutorial Question.
5.  User **successfully completes** the interaction (selects correct answer).
6.  System displays "Training Complete" confirmation.
7.  User **exits** the onboarding flow.
8.  System updates profile: `has_completed_onboarding = True`.
9.  System redirects to Dashboard.

**Extensions:**
*   **5a. User answers incorrectly:**
    *   5a1. System displays error feedback (demonstrating the "Wrong Answer" UI).
