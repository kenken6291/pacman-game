class GameAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.sirenInterval = null;
        this.powerSirenInterval = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopSiren();
            this.stopPowerSiren();
        }
        return this.muted;
    }

    playWaka() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // パックマンの「ワカ」という特徴的な口の開閉音をピッチスウィープで再現
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.quadraticRampToValueAtTime(600, now + 0.04);
        osc.frequency.quadraticRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playPowerPellet() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playEatGhost() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const duration = 0.4;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // ゴーストを食べた時のヒューンという上昇音
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    playDeath() {
        if (this.muted) return;
        this.init();
        this.stopSiren();
        this.stopPowerSiren();

        const now = this.ctx.currentTime;
        const duration = 1.2;
        
        // プレイヤー死亡時の下降音（何段階かに分けて下降）
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        
        // 段階的に音程を下げる
        for (let i = 1; i <= 10; i++) {
            const timeOffset = (duration / 10) * i;
            const freq = 500 - (i * 45);
            osc.frequency.setValueAtTime(freq, now + timeOffset);
        }

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    playLevelComplete() {
        if (this.muted) return;
        this.init();
        this.stopSiren();
        this.stopPowerSiren();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25]; // C4, E4, G4, C5, G4, C5
        const noteDuration = 0.15;

        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + index * noteDuration);

            gain.gain.setValueAtTime(0.15, now + index * noteDuration);
            gain.gain.linearRampToValueAtTime(0.01, now + (index + 1) * noteDuration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + index * noteDuration);
            osc.stop(now + (index + 1) * noteDuration);
        });
    }

    playStartBGM() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        // クラシックなパックマンのイントロテーマを再現
        const introMelody = [
            { note: 247.94, dur: 0.1 }, // B3
            { note: 495.88, dur: 0.1 }, // B4
            { note: 369.99, dur: 0.1 }, // F#4
            { note: 311.13, dur: 0.1 }, // D#4
            { note: 495.88, dur: 0.08 }, // B4
            { note: 369.99, dur: 0.08 }, // F#4
            { note: 311.13, dur: 0.15 }, // D#4
            
            { note: 261.63, dur: 0.1 }, // C4
            { note: 523.25, dur: 0.1 }, // C5
            { note: 392.00, dur: 0.1 }, // G4
            { note: 329.63, dur: 0.1 }, // E4
            { note: 523.25, dur: 0.08 }, // C5
            { note: 392.00, dur: 0.08 }, // G4
            { note: 329.63, dur: 0.15 }, // E4

            { note: 247.94, dur: 0.1 }, // B3
            { note: 495.88, dur: 0.1 }, // B4
            { note: 369.99, dur: 0.1 }, // F#4
            { note: 311.13, dur: 0.1 }, // D#4
            { note: 495.88, dur: 0.08 }, // B4
            { note: 369.99, dur: 0.08 }, // F#4
            { note: 311.13, dur: 0.15 }, // D#4

            { note: 311.13, dur: 0.05 }, // D#4
            { note: 329.63, dur: 0.05 }, // E4
            { note: 349.23, dur: 0.05 }, // F4
            { note: 369.99, dur: 0.05 }, // F#4
            { note: 392.00, dur: 0.05 }, // G4
            { note: 415.30, dur: 0.05 }, // G#4
            { note: 440.00, dur: 0.05 }, // A4
            { note: 495.88, dur: 0.15 }  // B4
        ];

        let elapsed = 0;
        introMelody.forEach((item) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(item.note, now + elapsed);

            gain.gain.setValueAtTime(0.12, now + elapsed);
            gain.gain.linearRampToValueAtTime(0.01, now + elapsed + item.dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + elapsed);
            osc.stop(now + elapsed + item.dur);

            elapsed += item.dur + 0.02;
        });
    }

    startSiren() {
        if (this.muted) return;
        this.init();
        if (this.sirenInterval) return;

        // ゲームプレイ中の背景音（サイレンのような低音ウーウー音）
        this.sirenInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.linearRampToValueAtTime(350, now + 0.25);
            osc.frequency.linearRampToValueAtTime(250, now + 0.5);

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.4);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.5);
        }, 500);
    }

    stopSiren() {
        if (this.sirenInterval) {
            clearInterval(this.sirenInterval);
            this.sirenInterval = null;
        }
    }

    startPowerSiren() {
        if (this.muted) return;
        this.init();
        if (this.powerSirenInterval) return;
        this.stopSiren();

        // パワーエサ（イジケ状態）の背景音（テンポの速い高いサイレン音）
        this.powerSirenInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.15);
            osc.frequency.linearRampToValueAtTime(400, now + 0.3);

            gain.gain.setValueAtTime(0.03, now);
            gain.gain.linearRampToValueAtTime(0.03, now + 0.25);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.3);
        }, 300);
    }

    stopPowerSiren() {
        if (this.powerSirenInterval) {
            clearInterval(this.powerSirenInterval);
            this.powerSirenInterval = null;
        }
    }
}

// グローバルで利用可能にする
window.gameAudio = new GameAudio();
