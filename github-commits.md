I'm sharing the GitHub repository for the project:

https://github.com/ayush-init/Expense-tracker.git

Please connect to this repository and use it as the main project repository.

**Important instructions:**

1. Read the complete `RoomSync_Master_Build_Prompt.md` and follow all the requirements mentioned in it.
2. Complete the entire project phase by phase. Do not stop after completing one phase or wait for my approval between phases.
3. After successfully completing and testing **each phase**, commit and push all relevant changes to GitHub with proper commit messages.
4. For the database, use the Neon PostgreSQL connection string I'm providing separately. Configure it securely using environment variables. Never hardcode credentials or push `.env` files to GitHub.
5. For Google OAuth, complete the implementation and configuration structure first. Once the entire project is developed, tested, and ready, inform me about the Google OAuth credentials and setup required. I'll provide/configure them.
6. You already have all the project requirements and design references. Use your own judgment and don't ask me questions for every small decision. Make sensible decisions and continue development.
7. Follow the provided Stitch UI references and maintain the light glassmorphism design throughout the application.

**My expectation:** Take your time, work carefully, implement every section, test everything, fix issues, and complete the entire project. Don't leave placeholder screens, fake functionality, or incomplete modules. Keep pushing the completed phases to GitHub.

Start by inspecting the repository and the project files, then proceed through all phases until the application is fully developed and tested.


**Git Commit & Push Standards:**

Whenever you complete a development phase, create a clean, professional, and meaningful Git commit. Do not use generic commit messages such as `Phase 1 completed`, `changes`, `update`, or `final code`.

Follow conventional commit message standards wherever appropriate, for example:

- `chore: initialize Expo project and configure TypeScript`
- `feat(auth): implement email authentication and session management`
- `feat(dashboard): build dashboard with live expense summaries`
- `feat(expenses): implement expense creation and member-wise splitting`
- `feat(food): add personal meal calendar and food tracking`
- `fix(payments): correct balance calculation after partial settlements`
- `test: add coverage for expense splitting and settlement calculations`

Each commit must represent a properly completed and tested unit of work. Keep commits organized, descriptive, and easy to understand from the Git history.

Before pushing:
- Run relevant tests, linting, and TypeScript checks.
- Review the changes and remove unnecessary files or debug code.
- Ensure `.env`, credentials, secrets, and sensitive information are never committed.
- Push the changes to the correct GitHub branch.

Maintain a clean, professional Git history throughout the entire project.