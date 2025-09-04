class KiruCoin {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('kiruCoinBalance') || '0');
        this.isMining = localStorage.getItem('isMining') === 'true' || false;
        this.miningProgress = parseFloat(localStorage.getItem('miningProgress') || '0');
        this.walletAddress = localStorage.getItem('walletAddress') || this.generateWalletAddress();
        this.username = localStorage.getItem('kiruCoinUsername') || this.setUsername();

        this.initPage();
        if (this.isMining) this.startMining(); // Resume mining if it was active
    }

    setUsername() {
        let username = prompt('Enter your username:');
        if (!username) username = 'Anonymous_' + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('kiruCoinUsername', username);
        return username;
    }

    generateWalletAddress() {
        const address = 'KIRU_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('walletAddress', address);
        return address;
    }

    initPage() {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        
        if (page === 'index.html') this.initMiningPage();
        if (page === 'wallet.html') this.initWalletPage();
        if (page === 'share.html') this.initSharePage();

        this.updateUI();
    }

    // Mining Page
    initMiningPage() {
        this.balanceEl = document.getElementById('balance');
        this.usernameEl = document.getElementById('username');
        this.mineButton = document.getElementById('mineButton');
        this.progressEl = document.getElementById('miningProgress');
        this.animationEl = document.getElementById('coin-animation');

        this.mineButton.addEventListener('click', () => this.toggleMining());
        this.progressEl.style.width = `${Math.min(this.miningProgress, 100)}%`; // Set initial progress
    }

    toggleMining() {
        this.isMining = !this.isMining;
        this.mineButton.textContent = this.isMining ? 'Stop Mining' : 'Start Mining';
        localStorage.setItem('isMining', this.isMining);
        if (this.isMining) this.startMining();
    }

    startMining() {
        if (!this.isMining) return;

        this.miningProgress += Math.random() * 2; // Slower progress
        if (this.progressEl) this.progressEl.style.width = `${Math.min(this.miningProgress, 100)}%`;
        localStorage.setItem('miningProgress', this.miningProgress);

        if (this.miningProgress >= 100) {
            this.miningProgress = 0;
            this.balance += 1;
            this.saveToLocalStorage();
            this.updateUI();
            if (this.animationEl) this.showCoinAnimation();
        }

        setTimeout(() => this.startMining(), 200); // Continues in background
    }

    showCoinAnimation() {
        this.animationEl.textContent = '💰 +1 KIRU';
        setTimeout(() => this.animationEl.textContent = '', 1000);
    }

    // Wallet Page
    initWalletPage() {
        this.usernameEl = document.getElementById('username');
        this.balanceEl = document.getElementById('balance');
        this.walletAddressEl = document.getElementById('walletAddress');
    }

    // Share Page
    initSharePage() {
        this.usernameEl = document.getElementById('username');
        this.balanceEl = document.getElementById('balance');
        this.recipientInput = document.getElementById('recipientUsername');
        this.amountInput = document.getElementById('amount');
        this.shareButton = document.getElementById('shareButton');
        this.shareLinkEl = document.getElementById('shareLink');
        this.receiveLinkInput = document.getElementById('receiveLink');
        this.claimButton = document.getElementById('claimButton');
        this.claimStatusEl = document.getElementById('claimStatus');

        this.shareButton.addEventListener('click', () => this.generateShareLink());
        this.claimButton.addEventListener('click', () => this.claimCoins());
    }

    generateShareLink() {
        const recipient = this.recipientInput.value;
        const amount = parseFloat(this.amountInput.value);

        if (!recipient || !amount || amount > this.balance || amount <= 0) {
            alert('Invalid recipient or amount!');
            return;
        }

        // Subtract from sender's balance immediately
        this.balance -= amount;
        this.saveToLocalStorage();
        this.updateUI();

        const shareData = {
            sender: this.username,
            recipient: recipient,
            amount: amount,
            timestamp: new Date().toISOString()
        };

        const encodedData = encodeURIComponent(JSON.stringify(shareData));
        const shareUrl = `${window.location.origin}/share.html?transfer=${encodedData}${amount}kiru`;
        this.shareLinkEl.textContent = 'Share this link with the recipient: ' + shareUrl;
        navigator.clipboard.writeText(shareUrl);
        alert(`Share link copied to clipboard! ${amount} KIRU deducted from your balance. Send it to ${recipient}`);
    }

    claimCoins() {
        const link = this.receiveLinkInput.value.trim();
        if (!link) {
            this.claimStatusEl.textContent = 'Please paste a valid share link!';
            return;
        }

        try {
            const urlParams = new URLSearchParams(link.split('?')[1]);
            const transferDataRaw = urlParams.get('transfer');
            if (!transferDataRaw) {
                this.claimStatusEl.textContent = 'Invalid share link format!';
                return;
            }

            // Extract the amount and JSON data separately
            const amountMatch = transferDataRaw.match(/(\d+)kiru$/);
            const amountFromLink = amountMatch ? parseFloat(amountMatch[1]) : 0;
            const jsonData = transferDataRaw.replace(/(\d+)kiru$/, ''); // Remove the amount suffix

            if (!amountFromLink || !jsonData) {
                this.claimStatusEl.textContent = 'Invalid share link format!';
                return;
            }

            const data = JSON.parse(decodeURIComponent(jsonData));
            if (data.recipient !== this.username) {
                this.claimStatusEl.textContent = 'This link is not for you!';
                return;
            }

            if (data.amount !== amountFromLink) {
                this.claimStatusEl.textContent = 'Amount mismatch in link!';
                return;
            }

            this.balance += amountFromLink;
            this.saveToLocalStorage();
            this.updateUI();
            this.claimStatusEl.textContent = `Successfully claimed ${amountFromLink} KIRU from ${data.sender}!`;
            this.receiveLinkInput.value = ''; // Clear input
        } catch (e) {
            this.claimStatusEl.textContent = 'Error processing link: ' + e.message;
            console.error('Error claiming coins:', e);
        }
    }

    updateUI() {
        if (this.usernameEl) this.usernameEl.textContent = this.username;
        if (this.balanceEl) this.balanceEl.textContent = this.balance.toFixed(2);
        if (this.walletAddressEl) this.walletAddressEl.textContent = this.walletAddress;
    }

    saveToLocalStorage() {
        localStorage.setItem('kiruCoinBalance', this.balance);
    }
}

// Initialize the cryptocurrency

const kiruCoin = new KiruCoin();
console.log("Kirubel Mesfin Production")
