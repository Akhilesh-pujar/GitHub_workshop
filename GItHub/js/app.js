// Main Application Controller for DevPulse
class DevPulseApp {
  constructor() {
    this.profiles = [];
    this.filteredProfiles = [];
    this.activeSkill = 'all';
    this.searchQuery = '';
    this.sortBy = 'default';
    this.kudosStore = JSON.parse(localStorage.getItem('devpulse_kudos') || '{}');
  }

  async init() {
    this.setupConfetti();
    this.setupTabs();
    this.setupAudioToggle();
    this.setupSearchAndFilter();
    this.setupModal();
    this.setupQABacklog();

    await this.loadProfiles();

    // Initialize sub-systems once profiles are available
    if (window.battleArena) {
      window.battleArena.init();
    }
    if (window.gitArcade) {
      window.gitArcade.init();
    }
  }

  // --- Profile Loading Engine ---
  async loadProfiles() {
    const grid = document.getElementById('profiles-grid');
    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading developer cards...</p>
      </div>
    `;

    let fileList = [];

    // Try loading registry.json
    try {
      const regResp = await fetch('data/registry.json');
      if (regResp.ok) {
        fileList = await regResp.json();
      }
    } catch (e) {
      console.warn("Could not load data/registry.json locally", e);
    }

    // Default fallback files if fetch fails (e.g. running directly via file://)
    if (!fileList || fileList.length === 0) {
      fileList = [
        "workshop_lead.json",
        "ada_lovelace.json",
        "linus_torvalds.json",
        "grace_hopper.json"
      ];
    }

    // If hosted on GitHub Pages, try to query GitHub Contents API for any new files
    if (window.location.hostname.includes('github.io')) {
      try {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const repoName = parts[0];
        const owner = window.location.hostname.split('.')[0];
        if (owner && repoName) {
          const apiResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/students`);
          if (apiResp.ok) {
            const apiFiles = await apiResp.json();
            const discovered = apiFiles
              .filter(f => f.name.endsWith('.json') && !f.name.startsWith('_'))
              .map(f => f.name);
            fileList = Array.from(new Set([...fileList, ...discovered]));
          }
        }
      } catch (err) {
        console.log("GitHub API discovery skipped or rate-limited", err);
      }
    }

    // Fetch individual student files
    const fetchPromises = fileList.map(async (filename) => {
      try {
        const res = await fetch(`data/students/${filename}`);
        if (res.ok) {
          const data = await res.json();
          // Initialize kudos from storage if available
          data._kudos = this.kudosStore[data.username] || Math.floor(Math.random() * 8) + 2;
          return data;
        }
      } catch (err) {
        console.warn(`Error loading data/students/${filename}:`, err);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    this.profiles = results.filter(Boolean);

    // Update stats counters
    this.updateStatsCounters();
    this.renderSkillPills();
    this.applyFilters();
  }

  updateStatsCounters() {
    const totalCountEl = document.getElementById('stat-total-contributors');
    const skillsCountEl = document.getElementById('stat-unique-skills');
    const totalKudosEl = document.getElementById('stat-total-kudos');

    if (totalCountEl) totalCountEl.textContent = this.profiles.length;

    const allSkills = new Set();
    let totalKudos = 0;
    this.profiles.forEach(p => {
      (p.skills || []).forEach(s => allSkills.add(s.trim()));
      totalKudos += (p._kudos || 0);
    });

    // Defect #02: uniqueSkillsCount property is undefined on this class
    if (skillsCountEl) skillsCountEl.textContent = this.allSkills.size();
    if (totalKudosEl) totalKudosEl.textContent = totalKudos;
  }

  // --- Filter and Search Handling ---
  renderSkillPills() {
    const container = document.getElementById('skills-filter-container');
    if (!container) return;

    const skillCounts = {};
    this.profiles.forEach(p => {
      (p.skills || []).forEach(s => {
        const normalized = s.trim();
        skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
      });
    });

    const sortedSkills = Object.keys(skillCounts).sort((a, b) => skillCounts[b] - skillCounts[a]);

    container.innerHTML = `
      <button class="filter-pill active" data-skill="all">
        All <span class="pill-badge">${this.profiles.length}</span>
      </button>
      ${sortedSkills.slice(0, 10).map(skill => `
        <button class="filter-pill" data-skill="${skill}">
          ${skill} <span class="pill-badge">${skillCounts[skill]}</span>
        </button>
      `).join('')}
    `;

    container.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSkill = btn.dataset.skill;
        window.soundFX?.playClickSound();
        this.applyFilters();
      });
    });
  }

  setupSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        window.soundFX?.playClickSound();
        this.applyFilters();
      });
    }
  }

  applyFilters() {
    let list = [...this.profiles];

    // Filter by skill
    if (this.activeSkill !== 'all') {
      list = list.filter(p => (p.skills || []).some(s => s.toLowerCase() === this.activeSkill.toLowerCase()));
    }

    // Filter by search query
    if (this.searchQuery) {
      list = list.filter(p => {
        const matchName = (p.name || '').toLowerCase().includes(this.searchQuery);
        const matchUser = (p.username || '').toLowerCase().includes(this.searchQuery);
        const matchBio = (p.bio || '').toLowerCase().includes(this.searchQuery);
        const matchLoc = (p.location || '').toLowerCase().includes(this.searchQuery);
        const matchSkill = (p.skills || []).some(s => s.toLowerCase().includes(this.searchQuery));
        return matchName || matchUser || matchBio || matchLoc || matchSkill;
      });
    }

    // Sort list
    if (this.sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'kudos') {
      // Defect #01: Kudos sorting logic inverted (ascending order instead of descending)
      list.sort((a, b) => (a._kudos || 0) - (b._kudos || 0));
    } else if (this.sortBy === 'debugging') {
      list.sort((a, b) => (b.stats?.debugging || 0) - (a.stats?.debugging || 0));
    } else if (this.sortBy === 'caffeine') {
      list.sort((a, b) => (b.stats?.caffeine || 0) - (a.stats?.caffeine || 0));
    }

    this.filteredProfiles = list;
    this.renderProfilesGrid();
  }

  // --- Render Profiles Grid ---
  renderProfilesGrid() {
    const grid = document.getElementById('profiles-grid');
    if (!grid) return;

    if (this.filteredProfiles.length === 0) {
      grid.innerHTML = `
        <div class="empty-results-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.5rem; color: var(--text-muted);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No matching contributors found</h3>
          <p>Try clearing your search query or selecting a different skill filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredProfiles.map((p, idx) => `
      <div class="dev-card" data-username="${p.username}">
        <div class="dev-card-inner">
          <div class="card-header">
            <div class="avatar-ring">
              <img src="${p.avatar}" alt="${p.name}" class="dev-avatar" loading="lazy" onerror="this.src='https://github.com/${p.username}.png'">
            </div>
            <div class="dev-meta">
              <h3 class="dev-name">${p.name}</h3>
              <span class="dev-username">@${p.username}</span>
              <span class="dev-role">${p.role || 'Contributor'}</span>
            </div>
          </div>

          <p class="dev-bio">${p.bio || 'Building open-source software with the community.'}</p>

          <div class="dev-skills-list">
            ${(p.skills || []).slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            ${(p.skills || []).length > 4 ? `<span class="skill-tag more">+${(p.skills.length - 4)}</span>` : ''}
          </div>

          <div class="dev-stats-bars">
            <div class="stat-bar-row">
              <span class="stat-name">Debug</span>
              <div class="stat-bar-track">
                <div class="stat-bar-val debug" style="width: ${p.stats?.debugging || 70}%"></div>
              </div>
              <span class="stat-num">${p.stats?.debugging || 70}</span>
            </div>
            <div class="stat-bar-row">
              <span class="stat-name">Caffeine</span>
              <div class="stat-bar-track">
                <div class="stat-bar-val caffeine" style="width: ${p.stats?.caffeine || 70}%"></div>
              </div>
              <span class="stat-num">${p.stats?.caffeine || 70}</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="kudos-btn" data-username="${p.username}" title="Endorse contributor" aria-label="Endorse contributor">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="kudos-count" id="kudos-${p.username}">${p._kudos || 0}</span>
            </button>
            <button class="btn btn-outline view-profile-btn" data-username="${p.username}">
              <span>View Profile</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach card event listeners
    grid.querySelectorAll('.kudos-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleKudos(btn.dataset.username, btn);
      });
    });

    grid.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openProfileModal(btn.dataset.username);
      });
    });

    grid.querySelectorAll('.dev-card').forEach(card => {
      card.addEventListener('click', () => {
        this.openProfileModal(card.dataset.username);
      });
    });
  }

  // --- Kudos and Confetti ---
  handleKudos(username, btnElement) {
    const profile = this.profiles.find(p => p.username === username);
    if (!profile) return;

    profile._kudos = (profile._kudos || 0) + 1;
    this.kudosStore[username] = profile._kudos;
    localStorage.setItem('devpulse_kudos', JSON.stringify(this.kudosStore));

    const counter = document.getElementById(`kudos-${username}`);
    if (counter) {
      counter.textContent = profile._kudos;
    }

    btnElement.classList.add('kudos-burst');
    setTimeout(() => btnElement.classList.remove('kudos-burst'), 300);

    window.soundFX?.playKudosChime();
    this.triggerConfetti(btnElement);
    this.updateStatsCounters();
  }

  // --- Modal Logic ---
  setupModal() {
    this.modal = document.getElementById('profile-modal');
    this.modalContent = document.getElementById('modal-body-container');
    this.closeBtn = document.getElementById('modal-close-btn');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  setupQABacklog() {
    const launcherBtn = document.getElementById('qa-backlog-toggle-btn');
    const qaModal = document.getElementById('qa-backlog-modal');
    const qaCloseBtn = document.getElementById('qa-modal-close-btn');

    const openQAModal = (targetIssue = null) => {
      if (!qaModal) return;
      qaModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      window.soundFX?.playClickSound();

      if (targetIssue) {
        setTimeout(() => {
          const card = qaModal.querySelector(`[data-issue-target="${targetIssue}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('pulse');
            setTimeout(() => card.classList.remove('pulse'), 1200);
          }
        }, 150);
      }
    };

    const closeQAModal = () => {
      if (!qaModal) return;
      qaModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (launcherBtn) {
      launcherBtn.addEventListener('click', () => openQAModal());
    }

    if (qaCloseBtn) {
      qaCloseBtn.addEventListener('click', () => closeQAModal());
    }

    if (qaModal) {
      qaModal.addEventListener('click', (e) => {
        if (e.target === qaModal) closeQAModal();
      });
    }

    document.querySelectorAll('.qa-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const issueNum = badge.dataset.issue;
        openQAModal(issueNum);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && qaModal?.classList.contains('active')) {
        closeQAModal();
      }
    });
  }

  openProfileModal(username) {
    const p = this.profiles.find(item => item.username === username);
    if (!p || !this.modal || !this.modalContent) return;

    window.soundFX?.playClickSound();

    this.modalContent.innerHTML = `
      <div class="modal-profile-header">
        <div class="modal-avatar-wrapper">
          <img src="${p.avatar}" alt="${p.name}" class="modal-avatar" onerror="this.src='https://github.com/${p.username}.png'">
        </div>
        <div class="modal-title-info">
          <h2 class="modal-name" id="modal-contributor-name">${p.name}</h2>
          <div class="modal-badges">
            <span class="badge-role">${p.role || 'Contributor'}</span>
            ${p.location ? `
              <span class="badge-loc">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${p.location}</span>
              </span>` : ''}
          </div>
          <a href="https://github.com/${p.username}" target="_blank" rel="noopener noreferrer" class="github-handle-link">
            <span>github.com/${p.username}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>

      <div class="modal-bio-card">
        <p>${p.bio || 'Workshop participant and open-source enthusiast.'}</p>
        ${p.favoriteQuote ? `<blockquote class="modal-quote">"${p.favoriteQuote}"</blockquote>` : ''}
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Developer Metrics</h4>
        <div class="modal-stats-grid">
          <div class="stat-box">
            <span class="stat-lbl">Debugging</span>
            <div class="stat-val-bar"><div style="width: ${p.stats?.debugging || 70}%"></div></div>
            <strong>${p.stats?.debugging || 70} / 100</strong>
          </div>
          <div class="stat-box">
            <span class="stat-lbl">Caffeine Index</span>
            <div class="stat-val-bar"><div style="width: ${p.stats?.caffeine || 70}%"></div></div>
            <strong>${p.stats?.caffeine || 70} / 100</strong>
          </div>
          <div class="stat-box">
            <span class="stat-lbl">AI Prompt Crafting <span class="qa-badge" data-issue="3" title="Defect #03: Prompt Crafting progress bar width binds to debugging stat">Issue #03</span></span>
            <!-- Defect #03: Bar width references p.stats?.debugging instead of p.stats?.promptCrafting -->
            <div class="stat-val-bar"><div style="width: ${p.stats?.debugging || 70}%"></div></div>
            <strong>${p.stats?.promptCrafting || 70} / 100</strong>
          </div>
          <div class="stat-box">
            <span class="stat-lbl">Late-Night Coding</span>
            <div class="stat-val-bar"><div style="width: ${p.stats?.lateNightCoding || 70}%"></div></div>
            <strong>${p.stats?.lateNightCoding || 70} / 100</strong>
          </div>
        </div>
      </div>

      ${p.signatureMove ? `
        <div class="modal-signature-move">
          <span class="move-label">Specialty & Highlight</span>
          <h4 class="move-title">${p.signatureMove.name}</h4>
          <p class="move-text">${p.signatureMove.description}</p>
        </div>
      ` : ''}

      <div class="modal-section">
        <h4 class="modal-section-title">Tech Stack & Skills</h4>
        <div class="modal-skills-wrap">
          ${(p.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
      </div>

      <div class="modal-socials-row">
        ${p.socials?.github ? `<a href="${p.socials.github}" target="_blank" rel="noopener noreferrer" class="social-btn">GitHub</a>` : ''}
        ${p.socials?.linkedin ? `<a href="${p.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-btn">LinkedIn</a>` : ''}
        ${p.socials?.portfolio ? `<a href="${p.socials.portfolio}" target="_blank" rel="noopener noreferrer" class="social-btn">Portfolio</a>` : ''}
      </div>
    `;

    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- Tab Switching ---
  setupTabs() {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const activePanel = document.getElementById(`tab-${targetTab}`);
        if (activePanel) activePanel.classList.add('active');

        window.soundFX?.playClickSound();

        // Refresh arena dropdowns if opening battle arena
        if (targetTab === 'arena' && window.battleArena) {
          window.battleArena.populateSelects();
        }
      });
    });
  }

  // --- Audio Control ---
  setupAudioToggle() {
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => {
      const isMuted = window.soundFX?.toggleMute();
      const label = audioBtn.querySelector('.audio-label');
      if (label) {
        // Defect #08: Label text condition inverted (shows 'Audio: On' when muted)
        label.textContent = isMuted ? 'Audio: Muted' : 'Audio: On';
      }
      audioBtn.classList.toggle('muted', isMuted);
      if (!isMuted) window.soundFX?.playClickSound();
    });
  }

  // --- Confetti Engine (Pure Canvas) ---
  setupConfetti() {
    this.confettiCanvas = document.getElementById('confetti-canvas');
    if (!this.confettiCanvas) return;
    this.confettiCtx = this.confettiCanvas.getContext('2d');
    this.confettiParticles = [];

    const resize = () => {
      this.confettiCanvas.width = window.innerWidth;
      this.confettiCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  triggerConfetti(targetElem = null) {
    if (!this.confettiCanvas || !this.confettiCtx) return;

    let originX = window.innerWidth / 2;
    let originY = window.innerHeight / 2;

    if (targetElem) {
      const rect = targetElem.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }

    const colors = ['#3b82f6', '#10b981', '#64748b', '#94a3b8', '#38bdf8'];

    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 4;
      this.confettiParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        life: 0.95 + Math.random() * 0.04
      });
    }

    if (!this.confettiRunning) {
      this.confettiRunning = true;
      this.animateConfetti();
    }
  }

  animateConfetti() {
    if (!this.confettiCtx) return;
    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    this.confettiParticles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.rotation += p.rotationSpeed;
      p.opacity *= p.life;

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate((p.rotation * Math.PI) / 180);
      this.confettiCtx.fillStyle = p.color;
      this.confettiCtx.globalAlpha = p.opacity;
      this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.confettiCtx.restore();

      if (p.opacity < 0.02 || p.y > this.confettiCanvas.height) {
        this.confettiParticles.splice(idx, 1);
      }
    });

    if (this.confettiParticles.length > 0) {
      requestAnimationFrame(() => this.animateConfetti());
    } else {
      this.confettiRunning = false;
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }
}

window.DevPulseApp = new DevPulseApp();
document.addEventListener('DOMContentLoaded', () => {
  window.DevPulseApp.init();
});
