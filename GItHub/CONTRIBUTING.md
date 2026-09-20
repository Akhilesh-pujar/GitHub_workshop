# 🤝 Contributing to DevPulse

Welcome to the **GitHub Awareness Workshop**! This guide will take you step-by-step through making your very first open-source Pull Request.

---

## 📋 Quick Checklist

1. [Fork](#1-fork-this-repository) the repository to your own GitHub account.
2. [Clone](#2-clone-your-fork-locally) the repository to your computer.
3. Create a new [feature branch](#3-create-a-feature-branch).
4. Add your [developer card](#4-add-your-developer-card) in `data/students/<your-username>.json`.
5. Register your card in `data/registry.json`.
6. Test your changes locally in the browser.
7. [Commit and Push](#5-commit-and-push) your branch.
8. Open a [Pull Request (PR)](#6-open-a-pull-request) on GitHub!

---

## Step 1: Fork This Repository
1. Look at the top-right corner of this GitHub repository page.
2. Click the **Fork** button.
3. Choose your personal GitHub account as the destination.
4. Keep the repository name as `DevPulse` (or default) and click **Create Fork**.

---

## Step 2: Clone Your Fork Locally
Open your terminal (PowerShell, Command Prompt, Git Bash, or Terminal) and run:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/DevPulse.git
cd DevPulse
```
*(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)*

---

## Step 3: Create a Feature Branch
Always work on a separate branch instead of `main`!

```bash
git checkout -b feature/add-YOUR_USERNAME
```
*(Example: `git checkout -b feature/add-alex-smith`)*

---

## Step 4: Add Your Developer Card
1. Navigate to the `data/students/` folder.
2. Copy the template file `_template.json` and name your new file `<your-github-username>.json`:
   - Windows PowerShell:
     ```powershell
     Copy-Item data/students/_template.json data/students/your-github-username.json
     ```
   - Mac / Linux / Git Bash:
     ```bash
     cp data/students/_template.json data/students/your-github-username.json
     ```
3. Open your new file in your code editor (e.g., VS Code) and customize your profile:
   - `username`: Your exact GitHub handle (e.g. `"alexsmith"`)
   - `name`: Your full name
   - `role`: E.g., `"Computer Science Explorer / Web Dev Enthusiast"`
   - `avatar`: URL to your photo or use `https://github.com/your-username.png`
   - `bio`: A short intro about yourself
   - `skills`: Array of skills/technologies you know or are learning (e.g. `["JavaScript", "Python", "Git"]`)
   - `stats`: Customize your RPG power stats (0 to 100):
     - `debugging`
     - `caffeine`
     - `promptCrafting`
     - `lateNightCoding`
   - `signatureMove`: Name and description of your special developer move for the Battle Arena!
   - `favoriteQuote`: Your favorite motto or programming quote.

4. Open `data/registry.json` and add your filename to the list:
   ```json
   [
     "workshop_lead.json",
     "ada_lovelace.json",
     "linus_torvalds.json",
     "grace_hopper.json",
     "your-github-username.json"
   ]
   ```
   > ⚠️ Make sure all items except the last one have commas!

5. **Test locally**: Simply open `index.html` in your favorite web browser (or use VS Code Live Server). You should see your card appear right away!

---

## Step 5: Commit and Push

Check the files you changed:
```bash
git status
```

Stage your files:
```bash
git add data/students/your-github-username.json data/registry.json
```

Commit your changes with a descriptive message:
```bash
git commit -m "feat: add developer profile card for @your-username"
```

Push the branch to your GitHub fork:
```bash
git push -u origin feature/add-YOUR_USERNAME
```

---

## Step 6: Open a Pull Request! 🎉
1. Visit the original repository on GitHub.
2. You will see a banner: **"feature/add-YOUR_USERNAME had recent pushes"** with a button saying **Compare & pull request**.
3. Click **Compare & pull request**.
4. Fill in the Pull Request template:
   - Mention your username
   - Confirm you tested your card locally
5. Click **Create pull request**!

Once the workshop lead merges your Pull Request into `main`, your profile will go live on the workshop website! 🚀

---

### Need Help During the Workshop?
Ask the instructor, raise a GitHub Issue, or reach out to your workshop peers! Happy coding!
