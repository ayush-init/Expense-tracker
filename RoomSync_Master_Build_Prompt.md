# RoomSync --- Master Build Prompt & Phased Development Plan

## 1. Project instruction

You are a senior product engineer, UI/UX designer, React Native
developer, backend architect, and QA engineer. Build **RoomSync**, a
shared-flat expense, food, and payment tracking mobile application for
three roommates:

-   **Ayush**
-   **Yuvraj**
-   **Vansh**

The app must be designed so more members and additional households can
be supported later, but the first working setup is for these three
users.

**Most important instruction: do not build the entire application in one
attempt.** Work strictly phase by phase and section by section. Complete
only the phase explicitly requested by the user. After finishing a
phase, explain what was created, list the files changed, run the
relevant checks, mention anything incomplete, and wait for approval
before starting the next phase.

The user will provide: 1. This master prompt in the project folder. 2.
UI reference screenshots/images exported from Google Stitch.

Treat the supplied Stitch images as the primary visual reference.
Inspect all supplied references before implementing a screen. Match
their layout, spacing, colors, typography, cards, icons, and component
style as closely as practical. Do not replace the design with a generic
template.

------------------------------------------------------------------------

## 2. Product vision

RoomSync should make it easy for three roommates to understand:

-   How much each person has spent during the current month.
-   Who owes money to whom, and how much.
-   Which expenses were added, by whom, and for whom.
-   How much food/meal payment has accumulated since the last food
    settlement.
-   Which meals each person actually had.
-   When a payment was made, its payment method, and whether proof was
    attached.
-   What changed in the household, with a clear activity and
    notification history.

The app should replace scattered WhatsApp messages and manual
calculations with one reliable shared record.

The app must be simple enough for a roommate to add an expense or update
a meal in a few seconds.

------------------------------------------------------------------------

## 3. Scope and important product rules

### 3.1 Users and household

Initial household members: - Ayush - Yuvraj - Vansh

For the first version, these three users will use the same household.
However, do not hard-code business logic in a way that prevents adding a
fourth member or creating another household later.

Each user must have: - Their own account and profile. - Their own
personal meal calendar/history. - Their own expenses and payment
history. - A view of shared household expenses and balances. - Access
only to the household data they belong to.

### 3.2 Dashboard

After login, open the user's dashboard.

The dashboard should clearly show:

1.  **My spending this month**
    -   Total amount spent/paid by the logged-in user during the current
        calendar month.
    -   Make the meaning of the number clear: amount paid by me, not
        necessarily my final share of all household expenses.
2.  **My balance**
    -   Amount I need to pay others.
    -   Amount others need to pay me.
    -   A clear net balance.
3.  **Food status**
    -   Food amount accumulated in the current food settlement cycle.
    -   Date the current cycle started.
    -   A small summary of meals recorded so far.
    -   Do not treat food as a fixed monthly bill.
4.  **Recent activity**
    -   Latest expenses, payments, food updates, and relevant household
        changes.
    -   Show who performed each action.
5.  **Quick actions**
    -   Add expense.
    -   Add/update my meal.
    -   Record a payment.
    -   View food calendar.

Keep the dashboard useful and uncluttered. Prioritize the most important
numbers rather than showing every data point at once.

### 3.3 Food / meal tracking --- separate from normal expenses

Food is a special module. It must not be treated as a normal monthly
expense because the food provider may ask for payment at any time.

#### Food settlement cycles

-   Food charges accumulate from the start of the current cycle.
-   The provider may ask for the accumulated amount at any time.
-   When the household records that the food bill has been settled,
    close the current cycle and start a new cycle from zero.
-   Preserve all previous cycles permanently in history.
-   Never delete old food records when a cycle is settled.
-   Show the current cycle's start date, end/settlement date if settled,
    total amount, and payment records.
-   Do not automatically reset food to zero just because a month has
    changed.
-   Only start a new cycle after a settlement action is recorded and
    confirmed.

Example: - Food tracking starts on the 1st. - The amount accumulates
until the provider asks for payment on the 12th. - The household records
the settlement on the 12th. - The previous cycle remains visible in
history. - A new cycle begins after the settlement, with a fresh running
total of zero.

Support partial food settlements if needed. If only part of the bill is
paid, keep the unpaid amount visible instead of resetting the full
cycle.

#### Personal meal calendar

Each member must have a personal food calendar.

For example, when Ayush logs in, he should be able to view and update
**Ayush's own meals**. Yuvraj and Vansh should have their own separate
meal records.

Each date should support: - Lunch - Dinner

Default behaviour: - Lunch and dinner are marked as received/expected by
default according to the household's configured food arrangement. - The
food provider/vendor name should be prefilled as **Rox** by default, but
it must be editable in settings. - The default meal price should be
configurable. Do not permanently hard-code a price in the app. - The app
should make it very easy to uncheck a meal if the person did not eat.

When a user unchecks a meal, ask for or allow a reason: - Food
provider/uncle did not come. - We did not order food. - I did not eat. -
Other (with optional note).

Only meals actually received should create a food charge. A skipped meal
or a meal that was not delivered must not be charged.

Allow a user to: - Open a date in the calendar. - See lunch and dinner
status. - Mark a meal as not received/skipped. - Select the reason. -
Add an optional note. - Correct an entry later, with an edit history.

The logged-in user should only be able to create or edit their own meal
entries in the normal flow. A household admin may be allowed to correct
another member's entry, but such changes must be recorded in the
activity/audit history.

#### Food calculations

-   Calculate food charges from the actual recorded meals and the
    applicable price for each meal.
-   Keep historical prices attached to the meal/cycle so changing the
    default price later does not rewrite old charges.
-   Show a member-wise food total for the current cycle.
-   Show the household's total food amount for the current cycle.
-   Show settled and outstanding amounts separately.
-   Make it possible to inspect the calculation behind every total.

### 3.4 Normal household expenses

This module handles purchases other than the special meal tracking
described above.

Examples: - Groceries - Vegetables - Milk - Snacks - Cleaning supplies -
Electricity - Wi-Fi - Rent - Household essentials - Other purchases

When someone adds an expense, provide fields for: - Expense title. -
Amount. - Category. - Date and time. - Person who paid. - Members who
should share the expense. - Split type: equal split initially, with room
for custom splits later. - Payment method. - Optional
description/note. - Optional bill/receipt/proof image or file.

Example: - Yuvraj buys something for ₹600. - He selects himself as the
payer. - He selects Ayush and Vansh as the members who should share the
expense. - Ayush and Vansh receive a notification that Yuvraj added the
expense. - The expense appears in the shared household activity. - Each
selected person's share and the payer's share are reflected correctly in
balances.

Important: - The payer and the people sharing the expense are separate
selections. - Do not automatically assume that every household member
shares every expense. - Allow the payer to include or exclude themselves
from the split. - Support a personal expense that is paid by one person
and shared with nobody else. - Do not charge a person who was not
selected. - Show a split preview before saving. - Validate that split
shares add up exactly to the expense amount.

For future flexibility, structure the expense system so custom
amount/percentage splits and item-wise splits can be added without
rewriting the entire data model. Do not implement unrequested advanced
features in the first phase.

### 3.5 Payment methods and proof

For normal expenses and recorded repayments, support a payment-method
selector. Include at least:

-   Cash
-   PhonePe
-   Google Pay (GPay)
-   Paytm
-   UPI (other app)
-   Bank transfer
-   Card
-   Other

The user should be able to attach a payment slip, receipt, or screenshot
as proof where appropriate.

Store: - Amount. - Paid by. - Paid to / recipient, where applicable. -
Date and time. - Payment method. - Optional transaction/reference ID. -
Optional note. - Optional proof attachment. - Status such as recorded,
pending confirmation, confirmed, or disputed where the workflow requires
it.

Do not claim that selecting PhonePe/GPay or uploading a screenshot
verifies a bank transaction. In the initial version, treat a payment as
manually recorded unless a real payment-verification integration is
implemented later.

### 3.6 Notifications and activity tracking

Notifications are a core feature, not an optional decoration.

Examples: - Yuvraj adds a ₹600 expense and includes Ayush and Vansh: the
selected members receive a notification. - A roommate records a payment
to another roommate: the relevant person receives a notification. - A
meal entry is changed: notify the relevant person(s) where
appropriate. - An expense is edited or cancelled: notify affected
members. - A food settlement is recorded: notify the household members.

Every important event should also be available in an in-app
activity/notification history.

Each activity item should show: - Who performed the action. - What
happened. - Amount, if applicable. - Date and time. - Related
expense/payment/meal record. - Whether the activity affects the
logged-in user's balance.

Do not send unnecessary notifications to people who are not affected by
an event.

Use a reliable backend event/notification design. In-app real-time
updates and push notifications are different requirements: - In-app live
updates should refresh the relevant screens without requiring manual
reload. - Push notifications should be delivered when the app is in the
background or closed, subject to device permissions and platform
support.

### 3.7 Balance and transaction history

The app must maintain a transparent record of: - Expenses. - Individual
shares. - Payments/repayments. - Food charges. - Food settlements. -
Corrections and edits.

Users should be able to open a record and understand why their balance
changed.

Do not store a manually editable balance as the source of truth. Derive
balances from the underlying expense splits, meal charges, settlements,
and payments.

Keep an audit trail for important edits. Avoid silently deleting
financial records. Prefer a void/cancel/correction record with a reason.

------------------------------------------------------------------------

## 4. UI/UX design requirements

### Visual direction: Light Glassmorphism only

The app must use a premium, modern **light glassmorphism** design.

-   Light theme only for this version.
-   Do not create a dark theme or dark-mode screens.
-   Use a clean, bright background with subtle soft gradients.
-   Use frosted/translucent cards with restrained blur effects.
-   Use soft shadows, thin translucent borders, rounded corners, and
    clear visual hierarchy.
-   Use a polished fintech-style interface.
-   Keep text highly readable; glass effects must never reduce contrast.
-   Use consistent spacing, typography, icon sizes, corner radii, and
    button styles.
-   Use color carefully to distinguish positive balances, amounts owed,
    completed payments, and warnings.
-   Avoid excessive gradients, excessive blur, or too many decorative
    elements.
-   The design must look like a production-ready mobile app, not a
    generic admin dashboard.

### Stitch reference images

The user will place Google Stitch design screenshots/images in the
project folder.

Before implementing any UI: 1. Find and inspect the supplied design
reference images. 2. Identify which screen each image represents. 3.
Extract the design system: colors, typography, spacing, card styles,
navigation, buttons, icons, and component patterns. 4. Create reusable
UI components based on those references. 5. Match the reference rather
than inventing a different visual style. 6. If a required screen has no
reference, extend the same design language consistently.

Do not ignore the screenshots. Do not use unrelated stock UI designs.

### Navigation

Use a simple bottom navigation suitable for a roommate finance app. The
exact navigation can be refined from the Stitch references, but it
should make these areas easy to reach:

-   Dashboard
-   Expenses
-   Food
-   Activity/Payments
-   Profile/Settings

Use a prominent Add action for common tasks if it fits the reference
design.

------------------------------------------------------------------------

## 5. Technical direction

Use the following stack unless the existing project already has a
working, well-justified alternative. Inspect the project before changing
its architecture.

### Mobile application

-   React Native
-   Expo
-   TypeScript
-   Expo Router or the navigation approach already established in the
    project

### Backend

-   Supabase
    -   PostgreSQL database
    -   Supabase Authentication
    -   Row Level Security (RLS)
    -   Supabase Storage for receipts/payment proof
    -   Supabase Realtime for live in-app updates
    -   Edge Functions or another secure server-side mechanism for
        privileged operations and notification triggers

### Notifications

-   Expo Notifications for device push notifications.
-   Secure server-side handling for push tokens and notification
    dispatch.
-   Do not expose service-role keys or other secrets in the mobile app.

### Build and delivery

-   Use Expo/EAS-compatible configuration.
-   Keep Android development and APK testing in mind.
-   The app should be structured so an Android APK/AAB can be built when
    the user is ready.

### Engineering standards

-   TypeScript types for core entities and API responses.
-   Reusable components and clear feature-based folder structure.
-   Environment variables for secrets/configuration.
-   Never hard-code API secrets.
-   Validate all important financial inputs.
-   Store money as integer paise in the database (for example, ₹100.50 =
    10050 paise), not floating-point values.
-   Use database transactions or safe server-side operations for
    financial updates where needed.
-   Add database migrations/schema changes in a controlled, documented
    way.
-   Use RLS so one household cannot read or modify another household's
    data.
-   Handle loading, empty, error, success, and offline/network-failure
    states.
-   Do not leave fake buttons or non-functional navigation in a phase
    marked complete.

------------------------------------------------------------------------

## 6. Suggested core data model

Design the schema carefully before implementing features. Names may be
adjusted, but preserve the relationships and financial meaning.

Potential entities:

-   `profiles`: user profile linked to authentication.
-   `households`: household/flat information.
-   `household_members`: membership, role, and status.
-   `expenses`: original expense details, payer, household, date,
    category, and status.
-   `expense_splits`: amount owed by each selected member for an
    expense.
-   `expense_attachments`: receipt/proof file metadata.
-   `meal_entries`: member, date, meal type, provider, received/skipped
    status, reason, price, and cycle.
-   `food_cycles`: start date, settlement date, status,
    total/settled/outstanding amounts.
-   `food_settlements`: payments made against a food cycle.
-   `payments`: roommate-to-roommate or household payments/repayments.
-   `payment_attachments`: payment proof metadata.
-   `notifications`: in-app notification records.
-   `device_push_tokens`: registered device tokens.
-   `activity_logs`: important actions and financial record changes.

This is a starting point, not permission to create every table
immediately. During the database phase, review relationships,
constraints, indexes, RLS, and migration order before implementation.

------------------------------------------------------------------------

# 7. Mandatory phased development workflow

**Follow these phases in order. Do not skip ahead. Do not implement all
phases from this prompt at once.**

At the beginning of every phase: 1. Read this master prompt. 2. Inspect
the existing project and current implementation. 3. Inspect relevant
Stitch screenshots. 4. Identify dependencies and risks. 5. State exactly
what this phase will and will not include.

At the end of every phase: 1. Summarize what was completed. 2. List
files created/modified. 3. Explain how to test the work. 4. Run
available lint/typecheck/tests/build checks relevant to the phase. 5.
Report errors honestly. 6. List remaining work. 7. Stop and wait for the
user's approval before starting the next phase.

Do not silently move into the next phase.

## Phase 1 --- Project inspection and setup

Goal: establish a clean, working project foundation.

Tasks: - Inspect the project folder before changing anything. - Identify
existing app, package manager, framework, and configuration. - Check
whether Expo/React Native/TypeScript is already configured. - Check the
supplied Stitch reference image folder and list the references found. -
Propose a clean folder structure. - Set up or repair the Expo + React
Native + TypeScript project only as needed. - Add basic scripts for
start, lint, typecheck, and tests where appropriate. - Add
`.env.example` with placeholder variable names only. - Add a README with
setup and run instructions. - Confirm the app launches on the intended
development target.

Do not build authentication, dashboard, expenses, or food functionality
in this phase.

Acceptance criteria: - Project structure is clear. - App starts
successfully. - TypeScript configuration works. - No secrets are
committed. - User receives exact run commands.

## Phase 2 --- Design system and reusable UI foundation

Goal: translate the Stitch design into reusable app components.

Tasks: - Inspect all supplied Stitch screenshots. - Document the light
glassmorphism design tokens. - Define colors, typography, spacing,
radii, shadows, borders, and icon conventions. - Create reusable
components such as: - Screen/container layout - Glass card -
Primary/secondary button - Text input - Amount display - Avatar/member
row - Status chip - List row - Bottom navigation - Modal/bottom sheet -
Loading, empty, and error states - Create a visual test/sandbox screen
to verify components against Stitch references.

Do not implement real backend functionality in this phase.

Acceptance criteria: - Reusable components match the supplied
references. - Light theme only. - Components work on the target mobile
screen sizes. - No unrelated visual style is introduced.

## Phase 3 --- Backend foundation and database design

Goal: establish a secure backend foundation before connecting app
features.

Tasks: - Configure Supabase project connection using environment
variables. - Design and document the database schema. - Create
migrations in a controlled order. - Define household membership and role
relationships. - Add Row Level Security policies. - Define storage
buckets and secure access rules for proof attachments. - Add typed
client/service layers. - Test that a household member can access only
permitted household data. - Document how to configure Supabase
locally/remotely.

Do not build all app screens in this phase.

Acceptance criteria: - Database migrations apply successfully. - RLS
policies are tested. - No service-role key is present in client code. -
Core schema relationships are documented.

## Phase 4 --- Authentication and onboarding

Goal: allow Ayush, Yuvraj, and Vansh to sign in securely.

Tasks: - Build signup and login screens matching Stitch references. -
Integrate Supabase Auth. - Add OAuth login providers where supported and
configured, such as Google. - Do not show an OAuth provider as working
until its provider credentials and redirect configuration are set up. -
Add session persistence and logout. - Create/link the user's profile
after signup. - Add household onboarding: - Create household. - Join
household using a secure invite code/link. - For the first household,
support Ayush, Yuvraj, and Vansh joining the same flat. - Add
appropriate loading, error, and duplicate-account states. - Protect
authenticated routes.

Acceptance criteria: - Each of the three users can sign in with their
own account. - OAuth works only when correctly configured. - A user can
join the intended household. - A user cannot access another household's
data.

## Phase 5 --- Dashboard UI and live household summary

Goal: build the first real app landing screen.

Tasks: - Implement the dashboard UI from Stitch references. - Show
current calendar month's amount paid by the logged-in user. - Show
amount the user owes and amount owed to the user. - Show current
food-cycle amount and cycle start date. - Show a compact meal summary. -
Show recent household activity. - Add quick actions for expense, meal,
payment, and food calendar. - Connect dashboard values to backend data
where available. - Add loading, empty, and error states. - Ensure values
refresh after relevant changes.

Acceptance criteria: - Dashboard is personalized to the logged-in
user. - Financial labels clearly distinguish amount paid from net amount
owed. - No hard-coded sample totals remain in the production data flow.

## Phase 6 --- Normal expenses

Goal: allow roommates to record and share regular purchases.

Tasks: - Build expense list and expense details screens. - Build Add
Expense flow. - Add title, amount, category, date, payer, participants,
payment method, note, and optional receipt. - Support equal split for
the first working version. - Allow payer to choose who shares the
expense, including whether the payer is included. - Support personal
expenses. - Show a split preview before saving. - Save expense and split
records securely. - Recalculate derived balances. - Show who added the
expense and when. - Add edit/cancel flow with reason and activity
history. - Notify only affected members.

Acceptance criteria: - Yuvraj can add a ₹600 expense and select Ayush
and Vansh as participants. - Selected members see the expense and
receive an appropriate notification. - Unselected members are not
charged. - Split shares add up exactly to the original amount. -
Editing/cancelling does not silently corrupt historical balances.

## Phase 7 --- Personal food calendar and meal tracking

Goal: allow each member to track their own lunch and dinner.

Tasks: - Build Food screen and calendar. - Build personal day-detail
screen. - Show lunch and dinner for the selected date. - Prefill
provider as Rox, configurable later. - Use configurable default meal
pricing. - Default meal status according to the configured food
arrangement. - Allow the logged-in user to uncheck a meal. - Ask for
reason: provider did not come, food not ordered, did not eat, or
other. - Charge only meals actually received. - Add optional notes. -
Allow corrections with an audit trail. - Show personal meal count and
amount for the selected period. - Show household/member meal totals for
users with permission.

Acceptance criteria: - Ayush can update Ayush's meals without changing
Yuvraj's or Vansh's records. - Lunch and dinner are independent. - A
skipped/not-delivered meal is not charged. - Historical meal prices do
not change when the default price changes.

## Phase 8 --- Food cycles and settlements

Goal: track food bills from one settlement to the next, not by calendar
month.

Tasks: - Build current food-cycle summary. - Show cycle start date, meal
totals, total amount, paid amount, and outstanding amount. - Allow a
food settlement to be recorded when the provider asks for payment. -
Support full and partial settlements. - On full settlement, close the
old cycle and start a new cycle. - Preserve previous cycles and their
meal records. - Do not reset a cycle automatically at month-end. -
Notify relevant household members when a settlement is recorded. -
Provide a cycle history screen and detailed breakdown.

Acceptance criteria: - Settling food on any date closes the current
cycle. - A new cycle begins at zero only after a confirmed full
settlement. - Partial settlement leaves the outstanding balance
visible. - Previous cycles remain accessible.

## Phase 9 --- Roommate payments and payment proof

Goal: record repayments between roommates and preserve proof.

Tasks: - Build payment history and Record Payment screens. - Support
payer, recipient, amount, date/time, method, note, and optional
reference ID. - Add payment method options: Cash, PhonePe, GPay, Paytm,
UPI other, Bank transfer, Card, Other. - Allow proof image/file
upload. - Store attachments securely. - Support manual
confirmation/status where appropriate. - Update derived balances after a
valid payment record. - Notify the relevant recipient. - Add payment
detail view and correction flow.

Acceptance criteria: - Partial repayment reduces the outstanding amount
correctly. - Proof can be opened only by authorized household members. -
A payment method or screenshot is not falsely presented as automatic
bank verification.

## Phase 10 --- Activity feed and push notifications

Goal: make household activity visible and timely.

Tasks: - Build in-app notification/activity screen. - Add real-time
updates for expenses, payments, meal changes, and settlements. -
Register device push tokens. - Configure Expo push notifications with
secure server-side dispatch. - Add notification preferences where
appropriate. - Handle permissions denied, expired tokens, and delivery
failures. - Prevent duplicate notifications. - Deep-link notifications
to the relevant record where possible.

Acceptance criteria: - Relevant users see new activity without manually
reloading. - Push notifications work when permissions and device
configuration allow. - Unaffected members are not spammed. - In-app
activity remains available even if a push notification is missed.

## Phase 11 --- Profile, household settings, and audit history

Goal: make the app manageable after initial setup.

Tasks: - Build profile screen. - Show/edit basic profile information. -
Show household members and roles. - Allow authorized users to manage
invitations. - Configure food provider name and default meal price. -
Configure household preferences and notification settings. - Add
financial record audit/history views. - Add safe sign-out and
account/session handling.

Acceptance criteria: - Household settings are permission-protected. -
Changing the default meal price does not alter historical meals. -
Important edits are traceable.

## Phase 12 --- Testing, security review, and Android release preparation

Goal: prepare a stable testable Android build.

Tasks: - Test authentication and household access. - Test expense splits
and balance calculations. - Test personal meal tracking and skipped-meal
logic. - Test full/partial food settlements and cycle transitions. -
Test repayments and proof uploads. - Test real-time updates and push
notifications. - Test poor network, loading, empty, and error states. -
Review RLS and storage access. - Check logs for exposed secrets or
sensitive data. - Fix layout issues on common Android screen sizes. -
Configure EAS build profiles. - Produce an Android development/preview
build when requested. - Document APK installation and update steps.

Acceptance criteria: - Critical financial calculations pass tests. -
Household data is isolated. - No critical navigation or crash issue
remains. - Build instructions are documented. - Any known limitation is
clearly reported.

------------------------------------------------------------------------

## 8. Financial correctness rules --- never violate these

1.  Use integer paise for all stored monetary values.
2.  Keep the original expense amount separate from each member's share.
3.  The payer is not automatically the only person responsible for the
    expense.
4.  Only selected participants receive a share.
5.  Personal expenses must not affect other members' balances.
6.  Meal charges are created only for meals actually received.
7.  Food cycles are settlement-based, not calendar-month-based.
8.  A partial food settlement must not clear the outstanding amount.
9.  A roommate repayment must reduce the correct outstanding balance.
10. Do not silently delete financial history.
11. Record who created or changed an important financial record and
    when.
12. Ensure rounding/remainder paise are allocated deterministically so
    split totals equal the original amount.
13. Never display a balance without being able to explain which records
    produced it.

------------------------------------------------------------------------

## 9. Working rules for the coding agent

-   Work only on the phase the user asks you to start.
-   Never interpret this master prompt as permission to implement all
    phases immediately.
-   Before editing, inspect existing files and avoid overwriting working
    code unnecessarily.
-   Keep changes focused and small enough to review.
-   Do not spend excessive time over-analysing a small, well-defined
    task.
-   Do not add unrequested features just because they seem useful.
-   Do not use fake backend data as if it were real.
-   If temporary mock data is needed for UI development, label it
    clearly and keep it isolated.
-   Never claim a feature is complete unless it works and has been
    checked.
-   If a required credential, Supabase setting, OAuth configuration, or
    push-notification setup is missing, explain exactly what is needed
    and continue only with work that can safely be completed.
-   If a requirement is ambiguous and affects data correctness, ask one
    focused question before implementing it. Do not repeatedly ask
    questions whose answers are already in this prompt.
-   Preserve the supplied Stitch visual direction throughout all UI
    phases.
-   Keep the app light-theme-only.
-   At the end of each phase, stop and ask the user whether to proceed.

------------------------------------------------------------------------

# 10. How to start

When this master prompt is added to the project:

**Do not start building the full application automatically.**

First, acknowledge the project requirements and inspect the project
folder and Stitch reference images. Then prepare a concise Phase 1
execution plan and begin **Phase 1 only** if the user explicitly asks
you to start.

The user will control when each next phase begins.
