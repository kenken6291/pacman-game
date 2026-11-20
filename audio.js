/* =========================================================
   PAC-MAN NEON - audio.js v2.0.0
   Web Audio API による効果音のリアルタイム合成
   ========================================================= */
class GameAudio {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = false;
        this.wakaFlip = false;
        this.loop = null;          // 鳴り続けるループ音（サイレン等）
        this.loopKind = 'none';
        try {
            this.muted = localStorage.getItem('pacman_neon_muted') === '1';
        } catch (_) { /* localStorage 不可 */ }
    }

    /** ユーザー操作のたびに呼ぶ（iOS対策で毎回 resume する） */
    init() {
        try {
            if (!this.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.muted ? 0 : 0.6;
                this.master.connect(this.ctx.destination);
                // iOS のアンロック用に無音を一瞬鳴らす
                const buf = this.ctx.createBuffer(1, 1, 22050);
                const src = this.ctx.createBufferSource();
                src.buffer = buf;
                src.connect(this.master);
                src.start(0);
            }
            if (this.ctx.state === 'suspended') {
                const p = this.ctx.resume();
                if (p && p.catch) p.catch(() => {});
            }
        } catch (e) {
            console.warn('Audio init failed:', e);
        }
    }

    get ready() {
        return !!(this.ctx && this.master);
    }

    setMuted(m) {
        this.muted = m;
        try { localStorage.setItem('pacman_neon_muted', m ? '1' : '0'); } catch (_) {}
        if (this.ready) {
            this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.02);
        }
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    /** 単音を鳴らす汎用ヘルパー */
    tone(freq, dur, { type = 'square', vol = 0.12, at = 0, slide = null, slideType = 'exp' } = {}) {
        if (!this.ready || this.muted) return;
        try {
            const t0 = this.ctx.currentTime + at;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            if (slide) {
                if (slideType === 'exp') osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
                else osc.frequency.linearRampToValueAtTime(slide, t0 + dur);
            }
            g.gain.setValueAtTime(vol, t0);
            g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
            osc.connect(g);
            g.connect(this.master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        } catch (e) {
            console.warn('tone error', e);
        }
    }

    // ---------- 単発の効果音 ----------
    playWaka() {
        // 「ワ」「カ」を交互に鳴らす
        this.wakaFlip = !this.wakaFlip;
        if (this.wakaFlip) this.tone(240, 0.085, { type: 'triangle', vol: 0.16, slide: 520 });
        else this.tone(520, 0.085, { type: 'triangle', vol: 0.16, slide: 240 });
    }

    playPowerPellet() {
        this.tone(160, 0.18, { type: 'square', vol: 0.1, slide: 720 });
    }

    playEatGhost() {
        this.tone(180, 0.35, { type: 'sawtooth', vol: 0.16, slide: 1400 });
        this.tone(900, 0.12, { type: 'square', vol: 0.06, at: 0.3, slide: 1800 });
    }

    playFruit() {
        [660, 880, 1320].forEach((f, i) => this.tone(f, 0.09, { type: 'square', vol: 0.1, at: i * 0.07 }));
    }

    playExtraLife() {
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
            this.tone(f, 0.12, { type: 'square', vol: 0.1, at: i * 0.1 }));
    }

    playDeath() {
        this.setLoop('none');
        // ゆらぎながら下降する音
        for (let i = 0; i < 9; i++) {
            const f = 700 - i * 60;
            this.tone(f, 0.14, { type: 'square', vol: 0.11, at: i * 0.13, slide: f * 0.7, slideType: 'lin' });
        }
        // 最後の「ポポン」
        this.tone(160, 0.12, { type: 'triangle', vol: 0.2, at: 1.25, slide: 60 });
        this.tone(160, 0.12, { type: 'triangle', vol: 0.2, at: 1.42, slide: 60 });
    }

    playLevelComplete() {
        this.setLoop('none');
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
            this.tone(f, 0.14, { type: 'square', vol: 0.1, at: i * 0.12 }));
    }

    /** ゲーム開始ジングル（オリジナル曲・約3.6秒） */
    playStartBGM() {
        this.setLoop('none');
        const beat = 0.15;
        // [周波数, 拍数]  0 は休符
        const melody = [
            [523, 1], [659, 1], [784, 1], [1047, 2], [784, 1], [880, 2],
            [698, 1], [880, 1], [1047, 1], [1175, 2], [1047, 1], [988, 2],
            [784, 1], [988, 1], [1175, 1], [1319, 2], [1175, 1], [1047, 1], [988, 1],
            [1047, 4]
        ];
        const bass = [131, 131, 175, 175, 196, 196, 131, 131];
        let t = 0;
        melody.forEach(([f, b]) => {
            if (f) this.tone(f, beat * b * 0.9, { type: 'square', vol: 0.08, at: t });
            t += beat * b;
        });
        bass.forEach((f, i) => this.tone(f, beat * 2.6, { type: 'triangle', vol: 0.14, at: i * beat * 3 }));
    }

    // ---------- ループ音（サイレン / パワー / 目玉） ----------
    /**
     * 毎フレーム呼ばれる。種類が変わったときだけ音を作り直す。
     * kind: 'none' | 'siren' | 'power' | 'eyes'
     * intensity: 0〜1（残りドットが少ないほど高くなる）
     */
    setLoop(kind, intensity = 0) {
        if (!this.ready) { this.loopKind = 'none'; return; }
        if (kind !== this.loopKind) {
            this._stopLoop();
            this.loopKind = kind;
            if (kind !== 'none') this._startLoop(kind);
        }
        if (kind === 'siren' && this.loop) {
            const now = this.ctx.currentTime;
            this.loop.osc.frequency.setTargetAtTime(230 + intensity * 200, now, 0.3);
            this.loop.lfo.frequency.setTargetAtTime(2.4 + intensity * 2.6, now, 0.3);
        }
    }

    _startLoop(kind) {
        try {
            const c = this.ctx;
            const osc = c.createOscillator();
            const g = c.createGain();
            const lfo = c.createOscillator();
            const depth = c.createGain();
            let vol;
            if (kind === 'siren') {
                osc.type = 'triangle'; osc.frequency.value = 230;
                lfo.type = 'sine'; lfo.frequency.value = 2.4; depth.gain.value = 70; vol = 0.06;
            } else if (kind === 'power') {
                osc.type = 'sawtooth'; osc.frequency.value = 320;
                lfo.type = 'sawtooth'; lfo.frequency.value = 7; depth.gain.value = 140; vol = 0.03;
            } else { // eyes
                osc.type = 'square'; osc.frequency.value = 900;
                lfo.type = 'sine'; lfo.frequency.value = 14; depth.gain.value = 350; vol = 0.025;
            }
            lfo.connect(depth);
            depth.connect(osc.frequency);
            osc.connect(g);
            g.connect(this.master);
            const now = c.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(vol, now + 0.08);
            osc.start(now);
            lfo.start(now);
            this.loop = { osc, lfo, g };
        } catch (e) {
            console.warn('loop start error', e);
            this.loop = null;
        }
    }

    _stopLoop() {
        if (!this.loop) return;
        try {
            const now = this.ctx.currentTime;
            const { osc, lfo, g } = this.loop;
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(0, now + 0.06);
            osc.stop(now + 0.08);
            lfo.stop(now + 0.08);
        } catch (_) { /* 既に停止済み */ }
        this.loop = null;
    }
}

window.gameAudio = new GameAudio();
