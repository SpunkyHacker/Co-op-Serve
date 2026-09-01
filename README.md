Co-op-Serve
Welcome to the Co-op-Serve repository. This document serves as the central hub for our project overview, local setup instructions, and the official Git workflow our team uses to maintain a clean and stable codebase.
Project Structure
frontend/: Contains the frontend application code (HTML/CSS/JS).
backend/: Contains the Python backend logic and API infrastructure.

🚀 1. Initial Project Setup (First Time Only)
Follow these steps to configure your local development environment. You only need to do this once when setting up a new machine.
Step 1: Clone the repository
Download the project to your local machine and move into the project folder.
Bash
git clone https://github.com/SpunkyHacker/Co-op-Serve-.git
cd Co-op-Serve-
Step 2: Set up the Python Virtual Environment
We use a virtual environment to keep our backend dependencies isolated.
Bash
cd backend

# On Windows:
python -m venv venv
venv\Scripts\activate

# On Mac/Linux:
python3 -m venv venv
source venv/bin/activate
Step 3: Obtain Environment Secrets
We never commit sensitive passwords or API keys to GitHub. Reach out to obtain the local .env configuration file and place it in your root directory before running the application.
🌿 2. Branch Naming Conventions
Never work directly on the main branch. Always create a new branch for your work using the following naming structure:
Branch Type	Prefix	Example	Use Case
Feature	feature/	feature/user-authentication	Adding a completely new feature or page.
Bug Fix	bugfix/	bugfix/login-crash	Fixing an issue in existing code.
Hotfix	hotfix/	hotfix/security-patch	Urgent fixes pushed directly to production.
Refactor	refactor/	refactor/api-endpoints	Cleaning up code without changing functionality.
🔄 3. The Core Development Workflow
Phase 1: Sync with the Team
Always start your work session by ensuring your local main branch is up to date with the remote repository.
Bash
git checkout main
git pull origin main
Phase 2: Create Your Branch
Create a descriptive branch for your specific task.
Bash
git checkout -b feature/your-feature-name
Phase 3: Write Code & Commit in Chunks
Write your code and commit it in small, logical pieces. Do not wait until the entire feature is done to make your first commit.
Bash
# Check what files you have modified
git status

# Stage your changes
git add .

# Commit with a clear, descriptive message
git commit -m "Add login form validation"
Phase 4: Push for Backup
Push your branch at the end of your work session to back it up to the remote repository.
Bash
# First time pushing the branch:
git push -u origin feature/your-feature-name

# Subsequent pushes on the same branch:
git push
Phase 5: Handle Updates from Main (If Applicable)
If another team member merges code into main that affects your work, pull those updates into your feature branch to resolve conflicts locally.
Bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
If a merge conflict occurs, open the files in your editor, resolve the highlighted conflicts, save, and commit the resolution.
Phase 6: Open a Pull Request (PR)
When the feature is complete and tested:
Go to the GitHub repository.
Click New Pull Request.
Set the base branch to main and the compare branch to your feature branch.
Add a brief description of what you changed and request a review from a team member.
Phase 7: Sync & Clean Up
Once your Pull Request is approved and merged into main on GitHub, return to your terminal to sync your local environment and delete your old branch.
Bash
# Pull the newly updated main branch
git checkout main
git pull origin main

# Delete your local feature branch
git branch -d feature/your-feature-name
🚨 4. Golden Rules of the Repository
The main branch is sacred. It should always contain working, deployable code. Never commit directly to it.
Never force push. If you are stuck in a merge conflict, do not use git push --force. Ask the team for help resolving the conflict so we do not overwrite someone else's work.
Pull frequently. The longer your branch sits without pulling updates from main, the harder it will be to merge later.
