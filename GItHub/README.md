# ⚡ DevPulse – The Collaborative Git Workshop Hub & Arcade

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://pages.github.com/)
[![Built for Education](https://img.shields.io/badge/Built%20For-Git%20Awareness%20Workshop-6366f1)](#)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla)-success)](#)
Helllo Guys,
**DevPulse** is a gamified, hands-on web application designed for interactive student **GitHub Awareness Workshops**. It enables dozens of students to experience the end-to-end Git workflow (forking, cloning, branching, committing, pushing, PR review, and merging) with **zero initial merge conflicts** and **instant visual gratification**.

---

## 🌟 Application Features

1. **🧑‍💻 Developer Profiles & RPG Cards Grid**:
   - Every student creates a unique JSON profile card showing their avatar, bio, tech skills, and custom RPG stats (*Debugging*, *Caffeine*, *Prompt Crafting*, *Late-Night Coding*).
   - Real-time search by name, skill, or location.
   - Skill tag filtering and custom sorting.
   - Interactive modal inspection and community "Kudos" button with celebratory confetti bursts.
2. **⚔️ Git Duel RPG Battle Arena**:
   - Select any two contributors to face off in a turn-based simulated combat arena based on their stats and custom signature moves!
   - Dynamic combat log, sound effects, shake animations, and victory fanfare.
3. **🎮 Git Mini-Arcade**:
   - **Git Command Speed Typer**: 30-second rapid-fire muscle memory game for typing essential Git commands.
   - **Git Knowledge Quizzer**: Interactive quiz with immediate answers and score tracking.
   - **Workshop Audio Soundboard**: Web Audio API synthesizer generating real-time chimes, lasers, and fanfares without external audio files.
4. **📖 In-App Git Cheatsheet & Guide**:
   - Interactive tab walking students through the exact terminal commands needed to contribute.

---

## 🚀 Running the Project Locally

Because DevPulse is built using pure **HTML5, Vanilla CSS3, and ES6 JavaScript**, it runs immediately without needing `npm install` or node package installations!

### Method 1: Using Python HTTP Server (Recommended)
Open your terminal inside this folder:
```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Method 2: Using Node `npx serve`
```bash
npx serve .
```

### Method 3: VS Code Live Server
Right-click `index.html` inside VS Code and choose **"Open with Live Server"**.

---

## 🎓 Instructor Guide: Suggested Workshop Agenda (90–120 Mins)

| Time | Topic | Activity |
|---|---|---|
| **00:00 - 00:20** | **Why Git & Version Control?** | Concepts: Working Directory, Staging (`git add`), Commit History (`git commit`). |
| **00:20 - 00:35** | **Branching & Remote Repos** | Why branches matter (`git checkout -b`), remotes, and GitHub vs Git. |
| **00:35 - 01:15** | **Live Hands-On Contribution** | Students fork the repository, create their card, test locally, and push their branch. |
| **01:15 - 01:35** | **PR Review & Merging Live** | Project lead opens incoming PRs on the projector, reviews them with students, and merges them. |
| **01:35 - 01:45** | **Live Refresh & Git Duel** | Watch all student cards appear on the live site! Run student vs instructor battles in the Battle Arena! |
| **01:45 - 02:00** | **Speed Typer Challenge & Q&A** | Run the Speed Typer game on the projector to test command recall. |

---

## 🌐 Enabling GitHub Pages (Live Automated Deployment)

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of DevPulse workshop hub"
   git branch -M main
   git remote add origin https://github.com/YOUR_ACCOUNT/DevPulse.git
   git push -u origin main
   ```
2. In your GitHub repository, go to **Settings** > **Pages**.
3. Under **Source**, select **GitHub Actions**.
4. The included workflow `.github/workflows/deploy.yml` will automatically build and publish the website whenever a PR is merged into `main`!

---

## 📂 Project Architecture

```
├── index.html                   # Master single-page app
├── css/
│   └── styles.css               # Modern glassmorphism cyberpunk design system
├── js/
│   ├── app.js                   # Application state, card filtering, search, confetti, kudos
│   ├── battle-arena.js          # Turn-based RPG duel engine
│   ├── arcade.js                # Speed typer & Git quiz logic
│   └── audio.js                 # Web Audio API sound synthesizer
├── data/
│   ├── registry.json            # Active card registry for local testing
│   └── students/
│       ├── _template.json       # Clean template for students
│       ├── workshop_lead.json   # Instructor profile
│       ├── ada_lovelace.json    # Example historical profile 1
│       ├── linus_torvalds.json  # Example historical profile 2
│       └── grace_hopper.json    # Example historical profile 3
├── CONTRIBUTING.md               # Student hands-on guide
└── README.md                    # Project and instructor overview
```

---

## 🤝 Student Contribution Guidelines

Detailed student instructions are in [CONTRIBUTING.md](file:///d:/WEB_LAB/GItHub/CONTRIBUTING.md).
