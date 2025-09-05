/* script.js — upgraded KiruCoin front-end
   Features:
   - mining loop with adjustable speed
   - transaction history, export CSV
   - wallet generation/copy/export
   - confetti + sound when reward hits
   - persistent localStorage usage
*/

class KiruCoin {
  constructor() {
    // state
    this.balance = parseFloat(localStorage.getItem('kiruCoinBalance') || '0');
    this.isMining = localStorage.getItem('isMining') === 'true';
    this.miningProgress = parseFloat(localStorage.getItem('miningProgress') || '0');
    this.walletAddress = localStorage.getItem('walletAddress') || this.generateWalletAddress();
    this.username = localStorage.getItem('kiruCoinUsername') || this.askUsername();
    this.txHistory = JSON.parse(localStorage.getItem('kiruTxHistory') || '[]');
    this.miningSpeed = parseInt(localStorage.getItem('miningSpeed') || '6', 10);
    this.reward = parseFloat(localStorage.getItem('miningReward') || '1');
    this.sessionStart = Date.now();
    this.autoClaimThreshold = parseFloat(localStorage.getItem('autoClaimThreshold') || '0');

    // UI refs
    this.bindElements();
    this.updateUI();
    this.setupEvents();

    if (this.isMining) {
      this.startMiningLoop();
    }

    // UI update tick
    this.sessionTimer = setInterval(() => this.updateSessionTime(), 1000);
  }

  askUsername() {
    let username = prompt('Enter your username for KiruCoin:');
    if (!username) username = 'Anon_' + Math.random().toString(36).slice(2,8);
    localStorage.setItem('kiruCoinUsername', username);
    return username;
  }

  generateWalletAddress() {
    const addr = 'KIRU_' + Math.random().toString(36).substr(2, 12).toUpperCase();
    localStorage.setItem('walletAddress', addr);
    return addr;
  }

  bindElements() {
    this.balanceEl = document.getElementById('balance');
    this.usernameEl = document.getElementById('username');
    this.walletAddressEl = document.getElementById('walletAddress');
    this.walletAddressShort = document.getElementById('walletAddressShort');
    this.copyAddressBtn = document.getElementById('copyAddressBtn');
    this.mineButton = document.getElementById('mineButton');
    this.stopAllBtn = document.getElementById('stopAll');
    this.progressEl = document.getElementById('miningProgress');
    this.circ = document.getElementById('circProgress');
    this.circText = document.getElementById('circText');
    this.progressPercent = document.getElementById('progressPercent');
    this.coinAnim = document.getElementById('coinAnim');
    this.speedRange = document.getElementById('speedRange');
    this.speedLabel = document.getElementById('speedLabel');
    this.autoToggle = document.getElementById('autoToggle');
    this.soundToggle = document.getElementById('soundToggle');
    this.txList = document.getElementById('txList');
    this.exportCsvBtn = document.getElementById('exportCsv');
    this.clearHistoryBtn = document.getElementById('clearHistory');
    this.regenWalletBtn = document.getElementById('regenWallet');
    this.exportWalletBtn = document.getElementById('exportWallet');
    this.leaderboardEl = document.getElementById('leaderboard');
    this.rewardInput = document.getElementById('rewardInput');
    this.autoClaimInput = document.getElementById('autoClaimInput');
    this.sessionTimeEl = document.getElementById('sessionTime');
    this.themeToggle = document.getElementById('themeToggle');
    this.coinSound = document.getElementById('coinSound');

    // sound: small beep as dataURI (simple)
    try {
      // create a short beep audio via WebAudio and convert to dataurl (fallback)
      this.coinSound.src = '';
    } catch (e) { /* ignore */ }
  }

  setupEvents() {
    // basic controls
    this.mineButton.addEventListener('click', () => this.toggleMining());
    this.stopAllBtn.addEventListener('click', () => this.resetProgress());
    this.speedRange.addEventListener('input', (e) => this.setSpeed(e.target.value));
    this.copyAddressBtn.addEventListener('click', () => this.copyAddress());
    this.exportCsvBtn.addEventListener('click', () => this.exportCSV());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.regenWalletBtn.addEventListener('click', () => this.regenerateWallet());
    this.exportWalletBtn.addEventListener('click', () => this.exportWallet());
    this.rewardInput.addEventListener('input', e => this.setReward(parseFloat(e.target.value)));
    this.autoClaimInput.addEventListener('input', e => this.setAutoClaim(parseFloat(e.target.value)));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    // keyboard shortcut: M toggles mining
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'm') this.toggleMining();
    });

    // populate initial states
    this.speedRange.value = this.miningSpeed;
    this.speedLabel.textContent = this.miningSpeed;
    this.autoToggle.checked = this.isMining;
    this.rewardInput.value = this.reward;
    this.autoClaimInput.value = this.autoClaimThreshold;
  }

  setSpeed(v) {
    this.miningSpeed = parseInt(v, 10) || 6;
    this.speedLabel.textContent = this.miningSpeed;
    localStorage.setItem('miningSpeed', this.miningSpeed);
  }

  setReward(v) {
    if (isNaN(v) || v <= 0) return;
    this.reward = v;
    localStorage.setItem('miningReward', this.reward);
  }

  setAutoClaim(v) {
    this.autoClaimThreshold = v || 0;
    localStorage.setItem('autoClaimThreshold', this.autoClaimThreshold);
  }

  toggleTheme() {
    document.body.classList.toggle('light-theme');
  }

  copyAddress() {
    navigator.clipboard.writeText(this.walletAddress).then(() => {
      this.showToast('Address copied to clipboard');
    }).catch(()=> this.showToast('Copy failed'));
  }

  regenerateWallet() {
    if (!confirm('Regenerate wallet address? old address will be lost locally.')) return;
    this.walletAddress = this.generateWalletAddress();
    this.updateUI();
    this.showToast('New wallet generated');
  }

  exportWallet() {
    const data = { username: this.username, address: this.walletAddress, balance: this.balance };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kiru-wallet.json'; a.click();
    URL.revokeObjectURL(url);
  }

  toggleMining() {
    this.isMining = !this.isMining;
    localStorage.setItem('isMining', this.isMining);
    this.mineButton.textContent = this.isMining ? 'Stop Mining' : 'Start Mining';
    if (this.isMining) this.startMiningLoop();
  }

  startMiningLoop() {
    if (this.miningInterval) clearInterval(this.miningInterval);
    // mining tick frequency depends on miningSpeed (higher = faster)
    const baseMs = 1000;
    const tickMs = Math.max(120, Math.round(baseMs / (this.miningSpeed / 2)));
    this.miningInterval = setInterval(() => this.mineTick(), tickMs);
  }

  mineTick() {
    // increment progress with some randomness
    const step = (Math.random() * (this.miningSpeed / 20)) + (this.miningSpeed / 50);
    this.miningProgress = Math.min(100, this.miningProgress + step);
    this.saveState();
    this.updateProgressUI();

    if (this.miningProgress >= 100) {
      this.miningProgress = 0;
      const earned = parseFloat(this.reward.toFixed(2));
      this.balance = parseFloat((this.balance + earned).toFixed(2));
      this.addTx({ type:'mined', amount: earned, note: 'Mining reward' });
      this.saveState();
      this.animateReward();
      this.updateUI();
    }
  }

  animateReward() {
    // coin flash + confetti
    this.coinAnim.classList.add('pop');
    setTimeout(()=> this.coinAnim.classList.remove('pop'), 900);
    this.fireConfetti();
    if (this.soundToggle && this.soundToggle.checked) this.playCoinSound();
  }

  playCoinSound() {
    // simple beep using WebAudio
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 600;
      g.gain.value = 0.03;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=> { o.stop(); ctx.close(); }, 120);
    } catch (e) { /* ignore */ }
  }

  fireConfetti() {
    // simple confetti effect: small DOM particles
    const confettiCount = 24;
    const frag = document.createDocumentFragment();
    for (let i=0;i<confettiCount;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      const x = 50 + (Math.random()*200-100);
      el.style.left = `${x}px`;
      el.style.background = i%2 ? '#00D2FF' : '#7CFFB2';
      el.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
      frag.appendChild(el);
      document.body.appendChild(el);
      requestAnimationFrame(()=> {
        el.style.transform = `translateY(${150 + Math.random()*200}px) rotate(${Math.random()*720}deg)`;
        el.style.opacity = '0';
      });
      setTimeout(()=> el.remove(), 1600);
    }
  }

  resetProgress() {
    if (!confirm('Reset mining progress?')) return;
    this.miningProgress = 0;
    this.saveState();
    this.updateProgressUI();
  }

  addTx(tx) {
    const entry = {
      id: 'tx_' + Date.now().toString(36),
      ts: new Date().toISOString(),
      username: this.username,
      address: this.walletAddress,
      ...tx
    };
    this.txHistory.unshift(entry);
    // keep last 200
    this.txHistory = this.txHistory.slice(0,200);
    localStorage.setItem('kiruTxHistory', JSON.stringify(this.txHistory));
    this.updateTxList();
    this.updateLeaderboard();
  }

  updateTxList() {
    this.txList.innerHTML = '';
    for (const tx of this.txHistory) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <div><strong>${tx.type === 'mined' ? 'Mined' : tx.type}</strong> • ${tx.note || ''}</div>
          <div class="meta">${new Date(tx.ts).toLocaleString()}</div>
        </div>
        <div style="text-align:right">
          <div><strong>${tx.amount ? tx.amount.toFixed(2) : ''} KIRU</strong></div>
          <div class="meta">${tx.username}</div>
        </div>
      `;
      this.txList.appendChild(li);
    }
  }

  updateLeaderboard() {
    // simple local leaderboard: group by username total
    const map = {};
    for (const tx of this.txHistory) {
      if (!map[tx.username]) map[tx.username] = 0;
      map[tx.username] += (tx.amount || 0);
    }
    const rows = Object.entries(map).sort((a,b)=> b[1]-a[1]).slice(0,5);
    this.leaderboardEl.innerHTML = rows.length ? rows.map(r => `<li>${r[0]} — ${r[1].toFixed(2)}</li>`).join('') : '<li class="muted">No miners yet</li>';
  }

  exportCSV() {
    const header = ['id','ts','username','address','type','amount','note'];
    const rows = [header.join(',')].concat(this.txHistory.map(tx => {
      return [tx.id, tx.ts, tx.username, tx.address, tx.type || '', tx.amount || 0, (tx.note || '').replace(/,/g,' ')]
        .map(v => `"${v}"`).join(',');
    })).join('\n');
    const blob = new Blob([rows], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kiru-transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  clearHistory() {
    if (!confirm('Clear transaction history? This cannot be undone.')) return;
    this.txHistory = [];
    localStorage.removeItem('kiruTxHistory');
    this.updateTxList();
    this.updateLeaderboard();
  }

  saveState() {
    localStorage.setItem('kiruCoinBalance', this.balance);
    localStorage.setItem('miningProgress', this.miningProgress);
  }

  updateProgressUI() {
    const pct = Math.round(this.miningProgress);
    this.progressEl.style.width = Math.min(100, pct) + '%';
    // circular stroke dashoffset (circumference ~ 2πr, r=50 -> ~314)
    const circumference = 314;
    const offset = circumference - (circumference * pct / 100);
    if (this.circ) this.circ.style.strokeDashoffset = offset;
    if (this.circText) this.circText.textContent = pct + '%';
    if (this.progressPercent) this.progressPercent.textContent = pct + '%';
    if (this.nextReward) this.nextReward = document.getElementById('nextReward');
  }

  updateUI() {
    if (this.balanceEl) this.balanceEl.textContent = this.balance.toFixed(2);
    if (this.usernameEl) this.usernameEl.textContent = this.username;
    if (this.walletAddressEl) this.walletAddressEl.textContent = this.walletAddress;
    if (this.walletAddressShort) this.walletAddressShort.textContent = this.walletAddress.slice(0,12) + '...';
    this.updateProgressUI();
    this.updateTxList();
    this.updateLeaderboard();
    this.mineButton.textContent = this.isMining ? 'Stop Mining' : 'Start Mining';
  }

  updateSessionTime() {
    const s = Math.floor((Date.now() - this.sessionStart)/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    this.sessionTimeEl.textContent = `${mm}:${ss}`;
  }
}

document.addEventListener('DOMContentLoaded', ()=> {
  window.kiru = new KiruCoin();
});

// small styles for confetti DOM nodes (injected here to keep single file)
const confStyle = document.createElement('style');
confStyle.textContent = `
.confetti{position:fixed;top:40px;width:10px;height:14px;border-radius:2px;z-index:9999;opacity:1;transition:transform 1.6s ease-out, opacity 1.4s linear}
.coin.pop{transform:scale(1.3) rotate(-10deg);transition:transform 0.6s cubic-bezier(.2,.9,.2,1)}
`;
document.head.appendChild(confStyle);
