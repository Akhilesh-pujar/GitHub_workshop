// Battle Arena - Developer Card RPG Duel Simulator
class BattleArena {
  constructor() {
    this.fighter1 = null;
    this.fighter2 = null;
    this.hp1 = 100;
    this.hp2 = 100;
    this.maxHp = 100;
    this.isRunning = false;
    this.turn = 1;
    this.logContainer = null;
  }

  init() {
    this.select1 = document.getElementById('arena-fighter-1');
    this.select2 = document.getElementById('arena-fighter-2');
    this.card1Container = document.getElementById('fighter-1-card');
    this.card2Container = document.getElementById('fighter-2-card');
    this.startBtn = document.getElementById('start-battle-btn');
    this.resetBtn = document.getElementById('reset-battle-btn');
    this.logContainer = document.getElementById('battle-log-messages');

    if (!this.select1 || !this.select2) return;

    this.populateSelects();

    this.select1.addEventListener('change', () => this.onFighterChange(1));
    this.select2.addEventListener('change', () => this.onFighterChange(2));

    this.startBtn.addEventListener('click', () => this.startBattle());
    this.resetBtn.addEventListener('click', () => this.resetBattle());
  }

  populateSelects() {
    const profiles = window.DevPulseApp?.profiles || [];
    if (profiles.length < 2) return;

    this.select1.innerHTML = '<option value="">-- Choose Contender 1 --</option>';
    this.select2.innerHTML = '<option value="">-- Choose Contender 2 --</option>';

    profiles.forEach((p, idx) => {
      const opt1 = document.createElement('option');
      opt1.value = p.username;
      opt1.textContent = `${p.name} (@${p.username})`;
      if (idx === 0) opt1.selected = true;
      this.select1.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p.username;
      opt2.textContent = `${p.name} (@${p.username})`;
      if (idx === 1) opt2.selected = true;
      this.select2.appendChild(opt2);
    });

    this.onFighterChange(1);
    this.onFighterChange(2);
  }

  onFighterChange(fighterNum) {
    const profiles = window.DevPulseApp?.profiles || [];
    const username = fighterNum === 1 ? this.select1.value : this.select2.value;
    const profile = profiles.find((p) => p.username === username);

    if (fighterNum === 1) {
      this.fighter1 = profile || null;
      this.renderFighterPreview(1, this.fighter1);
    } else {
      this.fighter2 = profile || null;
      this.renderFighterPreview(2, this.fighter2);
    }

    this.resetState();
  }

  renderFighterPreview(fighterNum, profile) {
    const container = fighterNum === 1 ? this.card1Container : this.card2Container;
    if (!profile) {
      container.innerHTML = `<div class="empty-fighter-slot">Select a developer to enter the ring</div>`;
      return;
    }

    container.innerHTML = `
      <div class="fighter-preview-card" id="fighter-card-${fighterNum}">
        <div class="fighter-header">
          <img src="${profile.avatar}" alt="${profile.name}" class="fighter-avatar" onerror="this.src='https://github.com/${profile.username}.png'">
          <div>
            <h4 class="fighter-name">${profile.name}</h4>
            <span class="fighter-role">${profile.role}</span>
          </div>
        </div>
        <div class="hp-bar-wrapper">
          <div class="hp-label">
            <span>HP</span>
            <span id="fighter-${fighterNum}-hp-text">100 / 100</span>
          </div>
          <div class="hp-track">
            <div class="hp-fill" id="fighter-${fighterNum}-hp-fill" style="width: 100%"></div>
          </div>
        </div>
        <div class="fighter-stats-mini">
          <div class="stat-pill"><span class="stat-ico">⚡</span> Debug: <strong>${profile.stats?.debugging || 70}</strong></div>
          <div class="stat-pill"><span class="stat-ico">☕</span> Caffeine: <strong>${profile.stats?.caffeine || 70}</strong></div>
          <div class="stat-pill"><span class="stat-ico">🎯</span> AI: <strong>${profile.stats?.promptCrafting || 70}</strong></div>
          <div class="stat-pill"><span class="stat-ico">🌙</span> Night: <strong>${profile.stats?.lateNightCoding || 70}</strong></div>
        </div>
        <div class="signature-move-badge">
          <strong>Special:</strong> ${profile.signatureMove?.name || 'Git Push --force'}
        </div>
      </div>
    `;
  }

  resetState() {
    this.hp1 = 100;
    this.hp2 = 100;
    this.isRunning = false;
    this.turn = 1;
    this.updateHpDisplay();
    this.startBtn.disabled = !(this.fighter1 && this.fighter2 && this.fighter1 !== this.fighter2);
    this.startBtn.classList.remove('active-fighting');
    this.startBtn.textContent = '⚔️ Start Git Duel!';
    if (this.logContainer) {
      this.logContainer.innerHTML = '<div class="log-entry system">Ready for battle. Select two developers and click Start!</div>';
    }
    const c1 = document.getElementById('fighter-card-1');
    const c2 = document.getElementById('fighter-card-2');
    if (c1) c1.classList.remove('winner', 'loser', 'shake');
    if (c2) c2.classList.remove('winner', 'loser', 'shake');
  }

  updateHpDisplay() {
    const hpText1 = document.getElementById('fighter-1-hp-text');
    const hpFill1 = document.getElementById('fighter-1-hp-fill');
    const hpText2 = document.getElementById('fighter-2-hp-text');
    const hpFill2 = document.getElementById('fighter-2-hp-fill');

    if (hpText1 && hpFill1) {
      const pct1 = Math.max(0, Math.min(100, (this.hp1 / this.maxHp) * 100));
      hpText1.textContent = `${Math.ceil(this.hp1)} / 100`;
      hpFill1.style.width = `${pct1}%`;
      hpFill1.className = `hp-fill ${pct1 < 30 ? 'critical' : pct1 < 60 ? 'warning' : ''}`;
    }

    if (hpText2 && hpFill2) {
      const pct2 = Math.max(0, Math.min(100, (this.hp2 / this.maxHp) * 100));
      hpText2.textContent = `${Math.ceil(this.hp2)} / 100`;
      hpFill2.style.width = `${pct2}%`;
      hpFill2.className = `hp-fill ${pct2 < 30 ? 'critical' : pct2 < 60 ? 'warning' : ''}`;
    }
  }

  async startBattle() {
    if (this.isRunning || !this.fighter1 || !this.fighter2) return;
    if (this.fighter1.username === this.fighter2.username) {
      alert("Please select two different developers for the battle!");
      return;
    }

    this.isRunning = true;
    this.startBtn.disabled = true;
    this.startBtn.textContent = '🔥 Battling...';
    this.logContainer.innerHTML = '';
    this.addLog(`⚡ Match begins: <strong>${this.fighter1.name}</strong> VS <strong>${this.fighter2.name}</strong>!`, 'system');

    window.soundFX?.playAttackSound();

    let attackerNum = Math.random() > 0.5 ? 1 : 2;

    while (this.hp1 > 0 && this.hp2 > 0 && this.isRunning) {
      await this.sleep(1100);
      if (!this.isRunning) break;

      const attacker = attackerNum === 1 ? this.fighter1 : this.fighter2;
      const defender = attackerNum === 1 ? this.fighter2 : this.fighter1;
      const defenderNum = attackerNum === 1 ? 2 : 1;

      this.executeTurn(attacker, defender, attackerNum, defenderNum);
      attackerNum = attackerNum === 1 ? 2 : 1;
    }

    if (this.isRunning) {
      this.endBattle();
    }
  }

  executeTurn(attacker, defender, attackerNum, defenderNum) {
    const isSpecial = Math.random() < 0.35;
    const baseDamage = 14 + Math.floor(Math.random() * 12);
    const statBonus = Math.floor(((attacker.stats?.debugging || 70) - 50) * 0.18);
    const critRoll = Math.random() * 100;
    const isCrit = critRoll < ((attacker.stats?.lateNightCoding || 70) * 0.35);

    let damage = Math.max(8, baseDamage + statBonus);
    if (isSpecial) damage = Math.floor(damage * 1.35);
    if (isCrit) damage = Math.floor(damage * 1.5);

    if (defenderNum === 1) {
      this.hp1 = Math.max(0, this.hp1 - damage);
    } else {
      this.hp2 = Math.max(0, this.hp2 - damage);
    }

    this.updateHpDisplay();

    // Sound & animations
    window.soundFX?.playAttackSound(isCrit || isSpecial);
    const defCard = document.getElementById(`fighter-card-${defenderNum}`);
    if (defCard) {
      defCard.classList.remove('shake');
      void defCard.offsetWidth; // force reflow
      defCard.classList.add('shake');
    }

    let moveDesc = '';
    if (isSpecial && attacker.signatureMove) {
      moveDesc = `unleashes signature move <strong class="move-name">"${attacker.signatureMove.name}"</strong>!`;
    } else {
      const genericMoves = [
        "dispatches a sleek pull request review",
        "executes a flawless interactive rebase",
        "solves a cryptic compiler warning",
        "injects an espresso shot into the terminal",
        "fires a clean regex pattern"
      ];
      moveDesc = genericMoves[Math.floor(Math.random() * genericMoves.length)];
    }

    const critBadge = isCrit ? `<span class="crit-tag">💥 CRITICAL HIT!</span> ` : '';
    this.addLog(
      `<strong>${attacker.name}</strong> ${moveDesc}! ${critBadge}Dealt <strong>${damage}</strong> damage to ${defender.name}.`,
      attackerNum === 1 ? 'player1' : 'player2'
    );
  }

  endBattle() {
    this.isRunning = false;
    this.startBtn.disabled = false;
    this.startBtn.textContent = '⚔️ Rematch!';

    const winnerNum = this.hp1 > 0 ? 1 : 2;
    const winner = winnerNum === 1 ? this.fighter1 : this.fighter2;
    const loserNum = winnerNum === 1 ? 2 : 1;

    const winnerCard = document.getElementById(`fighter-card-${winnerNum}`);
    const loserCard = document.getElementById(`fighter-card-${loserNum}`);

    if (winnerCard) winnerCard.classList.add('winner');
    if (loserCard) loserCard.classList.add('loser');

    this.addLog(`🏆 <strong>${winner.name}</strong> wins the Git Duel with ${Math.ceil(winnerNum === 1 ? this.hp1 : this.hp2)} HP remaining!`, 'winner');

    window.soundFX?.playVictoryFanfare();
    if (window.DevPulseApp?.triggerConfetti) {
      window.DevPulseApp.triggerConfetti();
    }
  }

  resetBattle() {
    this.isRunning = false;
    this.resetState();
  }

  addLog(msg, type = 'normal') {
    if (!this.logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[T+${this.turn++}]</span> ${msg}`;
    this.logContainer.appendChild(entry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.battleArena = new BattleArena();
