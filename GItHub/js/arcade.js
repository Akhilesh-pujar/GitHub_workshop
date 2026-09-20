// DevPulse Arcade: Git Speed Typer, Git Quiz & Interactive Reaction Soundboard
class GitArcade {
  constructor() {
    this.typerScore = 0;
    this.typerTimeLeft = 30;
    this.typerTimer = null;
    this.typerRunning = false;
    this.currentCommandObj = null;

    this.commandsList = [
      { cmd: 'git checkout -b feature/awesome', prompt: 'Create and switch to a new branch called "feature/awesome"' },
      { cmd: 'git add .', prompt: 'Stage all modified and new files in the working directory' },
      { cmd: 'git commit -m "feat: add user profile"', prompt: 'Commit staged changes with message "feat: add user profile"' },
      { cmd: 'git push origin main', prompt: 'Push committed changes to the "main" branch on remote "origin"' },
      { cmd: 'git status', prompt: 'Check the status of modified, untracked, and staged files' },
      { cmd: 'git pull origin main', prompt: 'Fetch and integrate remote changes from "main" into your local branch' },
      { cmd: 'git branch -d bugfix/typo', prompt: 'Safely delete the local branch named "bugfix/typo"' },
      { cmd: 'git log --oneline', prompt: 'View commit history with each commit compressed to a single line' },
      { cmd: 'git stash', prompt: 'Temporarily shelve uncommitted local changes to work on another branch' },
      { cmd: 'git stash pop', prompt: 'Restore previously stashed changes back into your working branch' },
      { cmd: 'git remote -v', prompt: 'List all configured remote repositories and their URLs' },
      { cmd: 'git clone https://github.com/workshop/hub.git', prompt: 'Clone the workshop repository from URL https://github.com/workshop/hub.git' }
    ];

    this.quizQuestions = [
      {
        question: "What is the difference between `git fetch` and `git pull`?",
        options: [
          "git pull fetches remote changes and merges them into your current branch; git fetch only downloads them without merging.",
          "git fetch deletes remote branches while git pull creates them.",
          "git pull only works with GitHub while git fetch works locally.",
          "There is no difference; they are exact aliases."
        ],
        correct: 0,
        explanation: "Correct! `git pull` is essentially `git fetch` followed immediately by `git merge`."
      },
      {
        question: "What does creating a 'Pull Request' (PR) actually do?",
        options: [
          "It downloads all code from GitHub to your hard drive.",
          "It proposes changes from your branch/fork to be reviewed and merged into the target repository.",
          "It immediately overrides the main branch without permission.",
          "It permanently locks the repository against further edits."
        ],
        correct: 1,
        explanation: "Spot on! A PR lets collaborators review, comment on, and test changes before merging."
      },
      {
        question: "How do you resolve a Git merge conflict?",
        options: [
          "Delete the .git directory and reinstall Git.",
          "Open the conflicted files, look for `<<<<<<<` and `>>>>>>>` markers, choose the desired code, then commit.",
          "Run `git push --force` repeatedly until GitHub accepts it.",
          "Conflicts cannot be resolved; you must start over."
        ],
        correct: 1,
        explanation: "Exactly! Git marks the conflicting sections so you can choose or combine the intended code."
      },
      {
        question: "What is the function of the staging area (index) in Git?",
        options: [
          "A preview buffer where you selectively stage changes (`git add`) before saving them in a commit snapshot.",
          "A backup folder stored on Google Drive.",
          "The list of people who have access to the repository.",
          "The compiled binary output of your application."
        ],
        correct: 0,
        explanation: "Great job! Staging lets you craft clean, atomic commits with only the files you want."
      },
      {
        question: "What does `git checkout -b student-name` do?",
        options: [
          "Deletes a branch called student-name.",
          "Creates a new branch called student-name and immediately switches to it.",
          "Renames the remote repository to student-name.",
          "Checks the spelling of your code."
        ],
        correct: 1,
        explanation: "Correct! The `-b` flag tells checkout to create the branch if it doesn't already exist."
      }
    ];

    this.quizIndex = 0;
    this.quizScore = 0;
  }

  init() {
    this.initTyper();
    this.initQuiz();
    this.initSoundboard();
  }

  // --- Git Speed Typer ---
  initTyper() {
    this.typerStartBtn = document.getElementById('typer-start-btn');
    this.typerInput = document.getElementById('typer-input');
    this.typerPrompt = document.getElementById('typer-prompt');
    this.typerTarget = document.getElementById('typer-target');
    this.typerScoreDisplay = document.getElementById('typer-score');
    this.typerTimerDisplay = document.getElementById('typer-time');

    if (!this.typerStartBtn || !this.typerInput) return;

    this.typerStartBtn.addEventListener('click', () => this.startTyperGame());

    this.typerInput.addEventListener('input', (e) => {
      if (!this.typerRunning || !this.currentCommandObj) return;

      const inputVal = e.target.value.trim();
      const expected = this.currentCommandObj.cmd;

      if (inputVal === expected) {
        // Success!
        this.typerScore += 10;
        this.typerScoreDisplay.textContent = this.typerScore;
        window.soundFX?.playSuccessSound();
        e.target.value = '';
        e.target.classList.add('flash-success');
        setTimeout(() => e.target.classList.remove('flash-success'), 250);
        this.nextTyperCommand();
      }
    });
  }

  startTyperGame() {
    this.typerRunning = true;
    this.typerScore = 0;
    this.typerTimeLeft = 30;
    this.typerScoreDisplay.textContent = '0';
    this.typerTimerDisplay.textContent = `${this.typerTimeLeft}s`;
    this.typerInput.disabled = false;
    this.typerInput.value = '';
    this.typerInput.focus();
    this.typerStartBtn.disabled = true;
    this.typerStartBtn.textContent = '⚡ In Progress...';

    this.nextTyperCommand();

    if (this.typerTimer) clearInterval(this.typerTimer);
    this.typerTimer = setInterval(() => {
      this.typerTimeLeft--;
      this.typerTimerDisplay.textContent = `${this.typerTimeLeft}s`;

      if (this.typerTimeLeft <= 0) {
        clearInterval(this.typerTimer);
        this.endTyperGame();
      }
    }, 1000);
  }

  nextTyperCommand() {
    const remaining = this.commandsList.filter((c) => c !== this.currentCommandObj);
    this.currentCommandObj = remaining[Math.floor(Math.random() * remaining.length)];
    this.typerPrompt.textContent = this.currentCommandObj.prompt;
    this.typerTarget.textContent = this.currentCommandObj.cmd;
  }

  endTyperGame() {
    this.typerRunning = false;
    this.typerInput.disabled = true;
    this.typerStartBtn.disabled = false;
    this.typerStartBtn.textContent = '🔄 Play Again!';
    this.typerPrompt.innerHTML = `🎉 Game Over! Final Score: <strong>${this.typerScore} pts</strong>`;
    this.typerTarget.textContent = 'Click "Play Again" to sharpen your Git muscle memory!';
    window.soundFX?.playVictoryFanfare();
    if (window.DevPulseApp?.triggerConfetti && this.typerScore > 0) {
      window.DevPulseApp.triggerConfetti();
    }
  }

  // --- Git Quizzer ---
  initQuiz() {
    this.quizContainer = document.getElementById('quiz-box');
    this.renderQuizQuestion();
  }

  renderQuizQuestion() {
    if (!this.quizContainer) return;
    const q = this.quizQuestions[this.quizIndex];

    if (!q) {
      // Quiz complete
      this.quizContainer.innerHTML = `
        <div class="quiz-completed">
          <h3>🎓 Workshop Quiz Completed!</h3>
          <p class="quiz-final-score">Your Score: <strong>${this.quizScore} / ${this.quizQuestions.length}</strong></p>
          <p class="quiz-congrats">
            ${this.quizScore === this.quizQuestions.length ? "🌟 Perfect score! You're ready to teach Git yourself!" : "Great effort! Review the questions and try again!"}
          </p>
          <button class="btn btn-primary" id="restart-quiz-btn">🔄 Restart Quiz</button>
        </div>
      `;
      document.getElementById('restart-quiz-btn')?.addEventListener('click', () => {
        this.quizIndex = 0;
        this.quizScore = 0;
        this.renderQuizQuestion();
      });
      return;
    }

    this.quizContainer.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress-bar">
          <span>Question ${this.quizIndex + 1} of ${this.quizQuestions.length}</span>
          <span>Score: ${this.quizScore}</span>
        </div>
        <h3 class="quiz-question-title">${q.question}</h3>
        <div class="quiz-options-grid">
          ${q.options
            .map(
              (opt, idx) => `
            <button class="quiz-option-btn" data-idx="${idx}">${opt}</button>
          `
            )
            .join('')}
        </div>
        <div id="quiz-feedback-box" class="quiz-feedback-box" style="display: none;"></div>
      </div>
    `;

    const optionBtns = this.quizContainer.querySelectorAll('.quiz-option-btn');
    optionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => this.handleQuizAnswer(parseInt(e.currentTarget.dataset.idx, 10), optionBtns));
    });
  }

  handleQuizAnswer(selectedIdx, optionBtns) {
    const q = this.quizQuestions[this.quizIndex];
    const feedbackBox = document.getElementById('quiz-feedback-box');
    optionBtns.forEach((btn) => (btn.disabled = true));

    if (selectedIdx === q.correct) {
      this.quizScore++;
      optionBtns[selectedIdx].classList.add('correct');
      window.soundFX?.playSuccessSound();
      feedbackBox.className = 'quiz-feedback-box correct';
      feedbackBox.innerHTML = `✅ <strong>Correct!</strong> ${q.explanation}`;
    } else {
      optionBtns[selectedIdx].classList.add('wrong');
      optionBtns[q.correct].classList.add('correct');
      window.soundFX?.playErrorSound();
      feedbackBox.className = 'quiz-feedback-box wrong';
      feedbackBox.innerHTML = `❌ <strong>Not quite!</strong> ${q.explanation}`;
    }

    feedbackBox.style.display = 'block';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary next-q-btn';
    nextBtn.textContent = this.quizIndex + 1 < this.quizQuestions.length ? 'Next Question ➡️' : 'View Final Results 🏆';
    nextBtn.addEventListener('click', () => {
      this.quizIndex++;
      this.renderQuizQuestion();
    });
    feedbackBox.appendChild(nextBtn);
  }

  // --- Soundboard Buttons ---
  initSoundboard() {
    const buttons = document.querySelectorAll('.soundboard-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const soundType = btn.dataset.sound;
        switch (soundType) {
          case 'kudos':
            window.soundFX?.playKudosChime();
            break;
          case 'attack':
            window.soundFX?.playAttackSound();
            break;
          case 'victory':
            window.soundFX?.playVictoryFanfare();
            break;
          case 'success':
            window.soundFX?.playSuccessSound();
            break;
          case 'error':
            window.soundFX?.playErrorSound();
            break;
          default:
            window.soundFX?.playClickSound();
        }
        btn.classList.add('pulse');
        setTimeout(() => btn.classList.remove('pulse'), 200);
      });
    });
  }
}

window.gitArcade = new GitArcade();
