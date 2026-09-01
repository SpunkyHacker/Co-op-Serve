# Git Setup Guide — Co-op-Serve

This guide walks you through installing Git and getting it configured on your machine for the first time. Follow it top to bottom before you touch the project setup steps in the main README.

---

## 1. Install Git

1. Download the installer from [git-scm.com/download/win](https://git-scm.com/download/win).
2. Run the installer. Default options are fine for everyone — just keep clicking **Next** until you reach **Install**, then click **Install**.
3. Once installed, open **Git Bash** from the Start menu (search "Git Bash"). Use Git Bash for every command below.

---

## 2. Verify the Installation

In Git Bash, run:

```bash
git --version
```

You should see something like `git version 2.4x.x`. If you see that, Git is installed correctly.

---

## 3. Set Your Identity

Git needs to know your name and email so it can label your commits. Run these two commands, replacing the placeholders with your own details:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Tip:** Use the same email you use for your GitHub account so your commits show up correctly on GitHub.

To double check it worked:

```bash
git config --global user.name
git config --global user.email
```

---

## 4. Set Up GitHub Access

You'll need a GitHub account and a way to authenticate when pushing/pulling code.

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Ask a team member to add you as a collaborator on the **Co-op-Serve** repository.
3. When you clone or push for the first time, GitHub will ask you to log in. The easiest way is:
   - Install **GitHub CLI**: [cli.github.com](https://cli.github.com)
   - Run `gh auth login` and follow the prompts.
   
   (Alternatively, GitHub Desktop or a personal access token both work — ask the team if you'd rather use one of those.)

---

## 5. Clone the Project

Once Git is installed and your identity is set, move to a folder where you want the project to live, then run:

```bash
git clone https://github.com/SpunkyHacker/Co-op-Serve-.git
cd Co-op-Serve-
```

You now have a full local copy of the project.

---

## ✅ Setup Checklist

- [ ] Git installed (`git --version` works)
- [ ] Name and email configured (`git config --global user.name/user.email`)
- [ ] GitHub account created and added as a collaborator
- [ ] Repository cloned successfully

Once everything above is checked off, do the **project setup steps** (virtual environment, `.env` file, etc.) from the main README. After that, you're ready for the day-to-day workflow below.

---

## 🌿 6. Branch Naming Conventions

Never work directly on the `main` branch. Always create a new branch for your work using the following naming structure:

| Branch Type | Prefix | Example | Use Case |
|---|---|---|---|
| Feature | `feature/` | `feature/user-authentication` | Adding a completely new feature or page |
| Bug Fix | `bugfix/` | `bugfix/login-crash` | Fixing an issue in existing code |
| Hotfix | `hotfix/` | `hotfix/security-patch` | Urgent fixes pushed directly to production |
| Refactor | `refactor/` | `refactor/api-endpoints` | Cleaning up code without changing functionality |

---

## 🔄 7. The Core Development Workflow

### Phase 1: Sync with the team

Always start your work session by ensuring your local `main` branch is up to date with the remote repository.

```bash
git checkout main
git pull origin main
```

### Phase 2: Create your branch

Create a descriptive branch for your specific task.

```bash
git checkout -b feature/your-feature-name
```

### Phase 3: Write code & commit in chunks

Write your code and commit it in small, logical pieces. Do not wait until the entire feature is done to make your first commit.

```bash
# Check what files you have modified
git status

# Stage your changes
git add .

# Commit with a clear, descriptive message
git commit -m "Add login form validation"
```

### Phase 4: Push for backup

Push your branch at the end of your work session to back it up to the remote repository.

```bash
# First time pushing the branch:
git push -u origin feature/your-feature-name

# Subsequent pushes on the same branch:
git push
```

### Phase 5: Handle updates from main (if applicable)

If another team member merges code into `main` that affects your work, pull those updates into your feature branch to resolve conflicts locally.

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
```

If a merge conflict occurs, open the affected files in your editor, resolve the highlighted conflicts, save, and commit the resolution.

### Phase 6: Open a Pull Request (PR)

When the feature is complete and tested:

1. Go to the GitHub repository.
2. Click **New Pull Request**.
3. Set the base branch to `main` and the compare branch to your feature branch.
4. Add a brief description of what you changed and request a review from a team member.

### Phase 7: Sync & clean up

Once your Pull Request is approved and merged into `main` on GitHub, return to Git Bash to sync your local environment and delete your old branch.

```bash
# Pull the newly updated main branch
git checkout main
git pull origin main

# Delete your local feature branch
git branch -d feature/your-feature-name
```

---

## 🚨 8. Golden Rules of the Repository

- **The `main` branch is sacred.** It should always contain working, deployable code. Never commit directly to it.
- **Never force push.** If you are stuck in a merge conflict, do not use `git push --force`. Ask the team for help resolving the conflict so we don't overwrite someone else's work.
- **Pull frequently.** The longer your branch sits without pulling updates from `main`, the harder it will be to merge later.
