/* =========================================================
   PAC-MAN NEON - app.js v2.0.0
   ========================================================= */
'use strict';
(function () {

// ---------------------------------------------------------
// 基本設定
// ---------------------------------------------------------
const T = 16;                 // 1マスのピクセル数
const COLS = 28;
const ROWS = 31;
const W = COLS * T;           // 448
const H = ROWS * T;           // 496
const TUNNEL_ROW = 13;
const BASE_SPEED = 2.5;       // 速度100%のときの移動量(px/フレーム, 60fps基準)
const FRAME_MS = 1000 / 60;   // 固定タイムステップ（120Hz端末でも速度が変わらない）
const FONT = '"Press Start 2P", monospace';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const audio = window.gameAudio;

function sfx(name, ...args) {
    try {
        if (audio && typeof audio[name] === 'function') audio[name](...args);
    } catch (e) {
        console.warn('sound error:', name, e);
    }
}

// タイルマップ (0:空, 1:壁, 2:ドット, 3:パワーエサ, 4:ゲート, 5:ゴーストハウス)
const ORIGINAL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,1,2,1,1,2,1,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const cloneMap = () => ORIGINAL_MAP.map(row => row.slice());
let map = cloneMap();

// 方向
const DIR = {
    up:    { x: 0,  y: -1, name: 'up',    angle: -Math.PI / 2 },
    down:  { x: 0,  y: 1,  name: 'down',  angle: Math.PI / 2 },
    left:  { x: -1, y: 0,  name: 'left',  angle: Math.PI },
    right: { x: 1,  y: 0,  name: 'right', angle: 0 }
};
const DIR_ORDER = [DIR.up, DIR.left, DIR.down, DIR.right]; // 同距離のときの優先順
const OPPOSITE = { up: DIR.down, down: DIR.up, left: DIR.right, right: DIR.left };
const opposite = d => OPPOSITE[d.name];

// 主要座標
const GATE_X = 14 * T;              // ゲート中央（13列と14列の境目）
const OUTSIDE_Y = 10 * T + T / 2;   // ゲートの真上の通路
const HOUSE_Y = 13 * T + T / 2;     // 巣の中央
const PAC_START = { x: 14 * T, y: 23 * T + T / 2 };
const FRUIT_POS = { x: 14 * T, y: 16 * T + T / 2 };
const MSG_Y = 16 * T + T / 2 + 5;   // READY! などの表示位置

// ---------------------------------------------------------
// マップ補助関数
// ---------------------------------------------------------
function tileAt(c, r) {
    if (r === TUNNEL_ROW && (c === -1 || c === COLS)) return 0; // トンネルの画面外1マス
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 1;
    return map[r][c];
}
function walkable(c, r) {
    const t = tileAt(c, r);
    return t !== 1 && t !== 4 && t !== 5;
}
const tileOf = v => Math.floor(v / T);
const centerOf = v => tileOf(v) * T + T / 2;
const EPS = 1e-6;
function atCenter(e) {
    return Math.abs(e.x - centerOf(e.x)) < EPS && Math.abs(e.y - centerOf(e.y)) < EPS;
}
function countDots() {
    let n = 0;
    for (const row of map) for (const t of row) if (t === 2 || t === 3) n++;
    return n;
}

/**
 * 移動エンジン：どんな速度でも必ずマスの中心を通過し、そこで進路を決める。
 * （旧版は速度変更時に中心とずれ、ゴーストが壁をすり抜けていた）
 * decide(e) は中心で呼ばれ、false を返すとその場で停止する。
 */
function advance(e, dist, decide) {
    let remaining = dist;
    for (let guard = 0; guard < 10 && remaining > EPS; guard++) {
        if (atCenter(e)) {
            e.x = centerOf(e.x);
            e.y = centerOf(e.y);
            // ワープトンネル（画面外の1マスで反対側へ）
            const c = tileOf(e.x);
            if (c < 0 && e.dir === DIR.left) e.x += (COLS + 1) * T;
            else if (c >= COLS && e.dir === DIR.right) e.x -= (COLS + 1) * T;
            if (!decide(e)) { e.moving = false; return; }
        }
        const d = e.dir;
        if (d.x !== 0) {
            const c = centerOf(e.x);
            const target = d.x > 0 ? (c > e.x + EPS ? c : c + T) : (c < e.x - EPS ? c : c - T);
            const span = Math.abs(target - e.x);
            if (remaining >= span) { e.x = target; remaining -= span; }
            else { e.x += d.x * remaining; remaining = 0; }
        } else {
            const c = centerOf(e.y);
            const target = d.y > 0 ? (c > e.y + EPS ? c : c + T) : (c < e.y - EPS ? c : c - T);
            const span = Math.abs(target - e.y);
            if (remaining >= span) { e.y = target; remaining -= span; }
            else { e.y += d.y * remaining; remaining = 0; }
        }
    }
    e.moving = true;
}

function moveToward(cur, target, step) {
    if (Math.abs(target - cur) <= step) return target;
    return cur + Math.sign(target - cur) * step;
}

// ---------------------------------------------------------
// レベル設定
// ---------------------------------------------------------
const FRUITS = [
    { kind: 'cherry', pts: 100 },
    { kind: 'strawberry', pts: 300 },
    { kind: 'orange', pts: 500 },
    { kind: 'orange', pts: 500 },
    { kind: 'apple', pts: 700 },
    { kind: 'apple', pts: 700 },
    { kind: 'melon', pts: 1000 },
    { kind: 'melon', pts: 1000 },
    { kind: 'grapes', pts: 2000 },
    { kind: 'grapes', pts: 2000 },
    { kind: 'bell', pts: 3000 },
    { kind: 'bell', pts: 3000 },
    { kind: 'key', pts: 5000 }
];
const fruitFor = n => FRUITS[Math.min(n, FRUITS.length) - 1];

function levelSpec(n) {
    const frightSecs = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 1, 1];
    const fs = n <= frightSecs.length ? frightSecs[n - 1] : 1;
    const tier = n === 1 ? 0 : (n <= 4 ? 1 : 2);
    const elroy1 = [20, 30, 40, 40, 40, 50, 50, 50, 60, 60, 60, 80][Math.min(n, 12) - 1];
    return {
        pac:         BASE_SPEED * [0.80, 0.90, 1.00][tier],
        pacFright:   BASE_SPEED * [0.90, 0.95, 1.00][tier],
        ghost:       BASE_SPEED * [0.75, 0.85, 0.95][tier],
        ghostFright: BASE_SPEED * [0.50, 0.55, 0.60][tier],
        ghostTunnel: BASE_SPEED * [0.40, 0.45, 0.50][tier],
        frightFrames: fs * 60,
        flashFrames: Math.min(fs * 60, 120),
        // 秒数：偶数番目=散開(scatter) 奇数番目=追跡(chase)
        schedule: tier === 0 ? [7, 20, 7, 20, 5, 20, 5, Infinity]
                : tier === 1 ? [7, 20, 7, 20, 5, 60, 1, Infinity]
                : [5, 20, 5, 20, 5, 60, 1, Infinity],
        // 巣から出るのに必要なドット数（累計）[Blinky, Pinky, Inky, Clyde]
        dotLimits: n === 1 ? [0, 0, 30, 90] : n === 2 ? [0, 0, 0, 50] : [0, 0, 0, 0],
        idleLimit: n < 5 ? 240 : 180,
        elroy1,
        elroy2: Math.floor(elroy1 / 2)
    };
}
const LIFE_LOST_LIMITS = [0, 7, 17, 32];

// ---------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------
let state = 'start';        // start | ready | play | pause | dying | clear | over
let pausedFrom = null;
let stateTimer = 0;
let globalTimer = 0;

let score = 0;
let highScore = 0;
let newRecord = false;
let level = 1;
let lives = 3;
let extraLifeGiven = false;
let lv = levelSpec(1);

let totalDots = countDots();
let dotsEaten = 0;
let lifeDots = 0;
let lifeLost = false;
let idleTimer = 0;

let frightTimer = 0;
let ghostCombo = 0;
let modePhase = 0;
let modeTimer = 0;
let globalMode = 'scatter';

let freezeTimer = 0;        // ゴーストを食べた瞬間の一時停止
let frozenGhost = null;
let fruit = null;
let popups = [];
let particles = [];

try {
    highScore = parseInt(localStorage.getItem('pacman_neon_highscore'), 10) || 0;
} catch (_) { /* localStorage 不可 */ }

function saveHighScore() {
    try { localStorage.setItem('pacman_neon_highscore', String(highScore)); } catch (_) {}
}

// ---------------------------------------------------------
// パックマン
// ---------------------------------------------------------
const pacman = {
    x: PAC_START.x, y: PAC_START.y,
    dir: DIR.left, nextDir: DIR.left,
    moving: true, animT: 0, freeze: 0,

    reset() {
        this.x = PAC_START.x;
        this.y = PAC_START.y;
        this.dir = DIR.left;
        this.nextDir = DIR.left;
        this.moving = true;
        this.animT = 4;
        this.freeze = 0;
    },

    update() {
        if (this.freeze > 0) { this.freeze--; return; }
        // 逆方向へはいつでも即座に切り返せる
        if (this.nextDir === opposite(this.dir)) this.dir = this.nextDir;
        const sp = frightTimer > 0 ? lv.pacFright : lv.pac;
        advance(this, sp, pacDecide);
        if (this.moving) this.animT += sp;
    }
};

function pacDecide(e) {
    const c = tileOf(e.x), r = tileOf(e.y);
    if (walkable(c + e.nextDir.x, r + e.nextDir.y)) e.dir = e.nextDir;
    return walkable(c + e.dir.x, r + e.dir.y);
}

// ---------------------------------------------------------
// ゴースト
// ---------------------------------------------------------
class Ghost {
    constructor(name, color, idx, scatter, homeX) {
        this.name = name;
        this.color = color;
        this.idx = idx;
        this.scatter = scatter;
        this.homeX = homeX;
        this.reset();
    }

    reset() {
        this.frightened = false;
        this.reverse = false;
        this.anim = Math.random() * 100 | 0;
        this.moving = true;
        if (this.idx === 0) {
            this.mode = 'active';
            this.x = GATE_X;
            this.y = OUTSIDE_Y;
            this.dir = DIR.left;
        } else {
            // mode: house(巣で待機) / exit(脱出中) / active(迷路内) / eaten(目玉で帰還) / enter(巣へ入る)
            this.mode = 'house';
            this.x = this.homeX;
            this.y = HOUSE_Y + (this.idx === 1 ? 0 : (this.idx === 2 ? -4 : 4));
            this.dir = this.idx === 2 ? DIR.down : DIR.up;
        }
    }

    get isEyes() {
        return this.mode === 'eaten' || this.mode === 'enter';
    }

    isElroy() {
        if (this.idx !== 0) return 0;
        const left = totalDots - dotsEaten;
        if (left <= lv.elroy2) return 2;
        if (left <= lv.elroy1) return 1;
        return 0;
    }

    speed() {
        if (this.isEyes) return 4;
        if (this.mode === 'house' || this.mode === 'exit') return 0.9;
        const c = tileOf(this.x), r = tileOf(this.y);
        if (r === TUNNEL_ROW && (c <= 5 || c >= 22)) return lv.ghostTunnel;
        if (this.frightened) return lv.ghostFright;
        const e = this.isElroy();
        return lv.ghost * (e === 2 ? 1.1 : e === 1 ? 1.05 : 1);
    }

    update() {
        this.anim++;
        const sp = this.speed();
        switch (this.mode) {
            case 'house':
                this.y += this.dir.y * sp * 0.6;
                if (this.y <= HOUSE_Y - 5) { this.y = HOUSE_Y - 5; this.dir = DIR.down; }
                else if (this.y >= HOUSE_Y + 5) { this.y = HOUSE_Y + 5; this.dir = DIR.up; }
                break;

            case 'exit':
                if (Math.abs(this.x - GATE_X) > EPS && Math.abs(this.y - HOUSE_Y) > EPS) {
                    this.dir = this.y > HOUSE_Y ? DIR.up : DIR.down;
                    this.y = moveToward(this.y, HOUSE_Y, sp);
                } else if (Math.abs(this.x - GATE_X) > EPS) {
                    this.dir = this.x < GATE_X ? DIR.right : DIR.left;
                    this.x = moveToward(this.x, GATE_X, sp);
                } else {
                    this.dir = DIR.up;
                    this.y = moveToward(this.y, OUTSIDE_Y, sp);
                    if (this.y === OUTSIDE_Y) {
                        this.mode = 'active';
                        this.dir = DIR.left;
                        this.reverse = false;
                    }
                }
                break;

            case 'enter':
                if (Math.abs(this.x - GATE_X) > EPS) {
                    this.x = moveToward(this.x, GATE_X, sp);
                } else {
                    this.dir = DIR.down;
                    this.y = moveToward(this.y, HOUSE_Y, sp);
                    if (this.y === HOUSE_Y) {
                        this.mode = 'exit';   // 巣に戻って復活
                        this.frightened = false;
                    }
                }
                break;

            default: // active / eaten
                advance(this, sp, g => g.decide());
        }
    }

    decide() {
        const c = tileOf(this.x), r = tileOf(this.y);

        // 目玉がゲート上に着いたら巣へ入る
        if (this.mode === 'eaten' && r === 10 && (c === 13 || c === 14)) {
            this.mode = 'enter';
            return false;
        }

        // モード切替時の反転
        if (this.reverse) {
            this.reverse = false;
            const o = opposite(this.dir);
            if (walkable(c + o.x, r + o.y)) { this.dir = o; return true; }
        }

        const back = opposite(this.dir);
        const options = DIR_ORDER.filter(d => d !== back && walkable(c + d.x, r + d.y));
        if (options.length === 0) { this.dir = back; return true; }

        // イジケ中はランダム
        if (this.frightened && this.mode === 'active') {
            this.dir = options[Math.floor(Math.random() * options.length)];
            return true;
        }

        const t = this.mode === 'eaten' ? { x: 13.5, y: 10 } : this.target();
        let best = options[0], bestD = Infinity;
        for (const d of options) {
            const dx = c + d.x - t.x, dy = r + d.y - t.y;
            const dd = dx * dx + dy * dy;
            if (dd < bestD - EPS) { bestD = dd; best = d; }
        }
        this.dir = best;
        return true;
    }

    target() {
        const pc = tileOf(pacman.x), pr = tileOf(pacman.y), pd = pacman.dir;
        if (globalMode === 'scatter' && this.isElroy() === 0) return this.scatter;

        switch (this.name) {
            case 'Blinky': // 赤：直接追跡
                return { x: pc, y: pr };
            case 'Pinky': { // ピンク：4マス先回り（上向き時は元祖同様に左へずれる）
                const ox = pd === DIR.up ? -4 : 0;
                return { x: pc + pd.x * 4 + ox, y: pr + pd.y * 4 };
            }
            case 'Inky': { // 水色：Blinkyとの挟み撃ち
                const ax = pc + pd.x * 2 + (pd === DIR.up ? -2 : 0);
                const ay = pr + pd.y * 2;
                const b = ghosts[0];
                return { x: 2 * ax - tileOf(b.x), y: 2 * ay - tileOf(b.y) };
            }
            default: { // オレンジ：8マス以内に近づくと縄張りへ逃げる
                const dx = tileOf(this.x) - pc, dy = tileOf(this.y) - pr;
                return dx * dx + dy * dy > 64 ? { x: pc, y: pr } : this.scatter;
            }
        }
    }

    draw() {
        const R = 7.2;
        ctx.save();
        ctx.translate(this.x, this.y);

        if (!this.isEyes) {
            let body = this.color;
            if (this.frightened) {
                const flash = frightTimer < lv.flashFrames && Math.floor(frightTimer / 12) % 2 === 0;
                body = flash ? '#f2f2ff' : '#2a3dff';
            }
            ctx.shadowBlur = 10;
            ctx.shadowColor = body;
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.arc(0, -1, R, Math.PI, 0);
            const f = Math.floor(this.anim / 7) % 2;
            if (f === 0) {
                ctx.lineTo(R, R);
                ctx.lineTo(R * 0.5, R - 3.5);
                ctx.lineTo(0, R);
                ctx.lineTo(-R * 0.5, R - 3.5);
                ctx.lineTo(-R, R);
            } else {
                ctx.lineTo(R, R - 2);
                ctx.lineTo(R * 0.72, R);
                ctx.lineTo(R * 0.25, R - 3.5);
                ctx.lineTo(-R * 0.25, R);
                ctx.lineTo(-R * 0.72, R - 3.5);
                ctx.lineTo(-R, R);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            if (this.frightened) {
                const flash = frightTimer < lv.flashFrames && Math.floor(frightTimer / 12) % 2 === 0;
                const face = flash ? '#ff2244' : '#ffd6b0';
                ctx.fillStyle = face;
                ctx.fillRect(-3.5, -3.5, 2.2, 2.2);
                ctx.fillRect(1.3, -3.5, 2.2, 2.2);
                ctx.strokeStyle = face;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-5, 3);
                for (let i = 0; i < 5; i++) ctx.lineTo(-5 + (i + 1) * 2, i % 2 === 0 ? 1.5 : 3);
                ctx.stroke();
                ctx.restore();
                return;
            }
        }

        // 目（進行方向を見る）
        const dx = this.dir.x * 1.6, dy = this.dir.y * 1.6;
        ctx.fillStyle = '#ffffff';
        if (this.isEyes) { ctx.shadowBlur = 6; ctx.shadowColor = '#9fd8ff'; }
        ctx.beginPath();
        ctx.ellipse(-3 + dx * 0.5, -2 + dy * 0.5, 2.5, 3.1, 0, 0, Math.PI * 2);
        ctx.ellipse(3 + dx * 0.5, -2 + dy * 0.5, 2.5, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1430ff';
        ctx.beginPath();
        ctx.arc(-3 + dx, -2 + dy, 1.5, 0, Math.PI * 2);
        ctx.arc(3 + dx, -2 + dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

const ghosts = [
    new Ghost('Blinky', '#ff3355', 0, { x: 25, y: -3 }, GATE_X),
    new Ghost('Pinky',  '#ffb8ff', 1, { x: 2,  y: -3 }, GATE_X),
    new Ghost('Inky',   '#00ffff', 2, { x: 27, y: 31 }, GATE_X - 2 * T),
    new Ghost('Clyde',  '#ffb852', 3, { x: 0,  y: 31 }, GATE_X + 2 * T)
];

// ---------------------------------------------------------
// 進行処理
// ---------------------------------------------------------
function addScore(n) {
    score += n;
    if (!extraLifeGiven && score >= 10000) {
        extraLifeGiven = true;
        lives++;
        sfx('playExtraLife');
        popups.push({ x: pacman.x, y: pacman.y - 10, text: '1UP!', color: '#7dff6a', t: 90 });
    }
    if (score > highScore) {
        highScore = score;
        newRecord = true;
    }
}

function resetActors() {
    pacman.reset();
    ghosts.forEach(g => g.reset());
    frightTimer = 0;
    ghostCombo = 0;
    modePhase = 0;
    modeTimer = 0;
    globalMode = 'scatter';
    freezeTimer = 0;
    frozenGhost = null;
    fruit = null;
}

function startGame() {
    hideResultModal();
    document.getElementById('start-overlay').classList.remove('active');
    score = 0;
    level = 1;
    lives = 3;
    newRecord = false;
    extraLifeGiven = false;
    lv = levelSpec(1);
    map = cloneMap();
    totalDots = countDots();
    dotsEaten = 0;
    lifeDots = 0;
    lifeLost = false;
    idleTimer = 0;
    popups = [];
    particles = [];
    resetActors();
    state = 'ready';
    stateTimer = 230;
    pausedFrom = null;
    sfx('playStartBGM');
    document.getElementById('start-btn').textContent = 'Restart';
    document.getElementById('game-title').classList.add('playing');
}

function nextLevel() {
    level++;
    lv = levelSpec(level);
    map = cloneMap();
    totalDots = countDots();
    dotsEaten = 0;
    lifeDots = 0;
    lifeLost = false;
    idleTimer = 0;
    resetActors();
    state = 'ready';
    stateTimer = 120;
}

function startFright() {
    ghostCombo = 0;
    const dur = lv.frightFrames;
    ghosts.forEach(g => {
        if (g.mode === 'active') g.reverse = true;
        if (dur > 0 && !g.isEyes) g.frightened = true;
    });
    frightTimer = dur;
}

function eatDots() {
    const c = tileOf(pacman.x), r = tileOf(pacman.y);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const t = map[r][c];
    if (t !== 2 && t !== 3) return;

    map[r][c] = 0;
    dotsEaten++;
    lifeDots++;
    idleTimer = 0;
    if (t === 2) {
        addScore(10);
        pacman.freeze = 1;
        sfx('playWaka');
    } else {
        addScore(50);
        pacman.freeze = 3;
        sfx('playPowerPellet');
        startFright();
    }

    if (dotsEaten === 70 || dotsEaten === 170) {
        const f = fruitFor(level);
        fruit = { kind: f.kind, pts: f.pts, t: 600 };
    }

    if (dotsEaten >= totalDots) {
        state = 'clear';
        stateTimer = 0;
        fruit = null;
        saveHighScore();
        sfx('playLevelComplete');
    }
}

function updateModeSchedule() {
    const sched = lv.schedule;
    if (modePhase >= sched.length - 1) return;
    modeTimer++;
    if (modeTimer >= sched[modePhase] * 60) {
        modeTimer = 0;
        modePhase++;
        globalMode = modePhase % 2 === 0 ? 'scatter' : 'chase';
        ghosts.forEach(g => { if (g.mode === 'active') g.reverse = true; });
    }
}

function releaseGhosts() {
    idleTimer++;
    const g = ghosts.find(gh => gh.mode === 'house');
    if (!g) return;
    const limit = lifeLost ? LIFE_LOST_LIMITS[g.idx] : lv.dotLimits[g.idx];
    if (lifeDots >= limit || idleTimer >= lv.idleLimit) {
        g.mode = 'exit';
        idleTimer = 0;
    }
}

function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.6 + Math.random() * 2;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + Math.random() * 20, color });
    }
}

function checkCollisions() {
    for (const g of ghosts) {
        if (g.mode !== 'active') continue;
        if (Math.hypot(g.x - pacman.x, g.y - pacman.y) >= 10) continue;

        if (g.frightened) {
            g.mode = 'eaten';
            g.frightened = false;
            ghostCombo++;
            const pts = 200 * Math.pow(2, ghostCombo - 1);
            addScore(pts);
            popups.push({ x: g.x, y: g.y, text: String(pts), color: '#00f2fe', t: 50 });
            burst(g.x, g.y, '#5b7bff', 14);
            freezeTimer = 30;
            frozenGhost = g;
            sfx('playEatGhost');
            return;
        }
        // パックマンがやられた
        state = 'dying';
        stateTimer = 0;
        fruit = null;
        saveHighScore();
        return;
    }
}

function updateFruit() {
    if (!fruit) return;
    if (--fruit.t <= 0) { fruit = null; return; }
    if (Math.hypot(pacman.x - FRUIT_POS.x, pacman.y - FRUIT_POS.y) < 9) {
        addScore(fruit.pts);
        popups.push({ x: FRUIT_POS.x, y: FRUIT_POS.y, text: String(fruit.pts), color: '#ff7ad9', t: 90 });
        burst(FRUIT_POS.x, FRUIT_POS.y, '#ff7ad9', 10);
        sfx('playFruit');
        fruit = null;
    }
}

function updatePlay() {
    if (freezeTimer > 0) {
        freezeTimer--;
        if (freezeTimer === 0) frozenGhost = null;
        // 食べられた目玉だけは止まらずに帰る
        ghosts.forEach(g => { if (g.isEyes && g !== frozenGhost) g.update(); });
        return;
    }

    if (frightTimer > 0) {
        frightTimer--;
        if (frightTimer === 0) ghosts.forEach(g => { g.frightened = false; });
    } else {
        updateModeSchedule();
    }

    releaseGhosts();
    pacman.update();
    eatDots();
    if (state !== 'play') return;
    checkCollisions();
    if (state !== 'play' || freezeTimer > 0) return;
    ghosts.forEach(g => g.update());
    checkCollisions();
    updateFruit();
}

const DEATH_FREEZE = 40;
const DEATH_TOTAL = 160;

function tick() {
    globalTimer++;

    switch (state) {
        case 'start':
            ghosts.forEach(g => { if (g.mode === 'house') g.update(); else g.anim++; });
            break;
        case 'ready':
            ghosts.forEach(g => { g.anim++; });
            if (--stateTimer <= 0) state = 'play';
            break;
        case 'play':
            updatePlay();
            break;
        case 'dying':
            stateTimer++;
            if (stateTimer === DEATH_FREEZE) sfx('playDeath');
            if (stateTimer === DEATH_FREEZE + 75) burst(pacman.x, pacman.y, '#ffe600', 18);
            if (stateTimer >= DEATH_TOTAL) afterDeath();
            break;
        case 'clear':
            stateTimer++;
            if (stateTimer >= 160) nextLevel();
            break;
        case 'over':
            stateTimer++;
            if (stateTimer === 100) showResultModal();
            break;
        default:
            break; // pause
    }

    // 演出の更新
    for (let i = popups.length - 1; i >= 0; i--) {
        if (state !== 'pause' && --popups[i].t <= 0) popups.splice(i, 1);
    }
    if (state !== 'pause') {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94;
            if (--p.life <= 0) particles.splice(i, 1);
        }
    }

    updateAudioLoop();
    updateHUD();
}

function afterDeath() {
    lives--;
    if (lives <= 0) {
        state = 'over';
        stateTimer = 0;
        saveHighScore();
        document.getElementById('game-title').classList.remove('playing');
        return;
    }
    lifeLost = true;
    lifeDots = 0;
    idleTimer = 0;
    resetActors();
    state = 'ready';
    stateTimer = 120;
}

function updateAudioLoop() {
    if (!audio) return;
    let kind = 'none';
    if (state === 'play') {
        if (ghosts.some(g => g.isEyes)) kind = 'eyes';
        else if (frightTimer > 0) kind = 'power';
        else kind = 'siren';
    }
    try { audio.setLoop(kind, totalDots ? dotsEaten / totalDots : 0); } catch (_) {}
}

// ---------------------------------------------------------
// 描画
// ---------------------------------------------------------
let renderScale = 1;
let wallBlue = null;
let wallWhite = null;
let wallPath = null;

/** 迷路の外側（到達不可能な空白）を壁として扱うためのフラグ */
const voidTiles = (() => {
    const seen = ORIGINAL_MAP.map(row => row.map(() => false));
    const stack = [[14, 23]];
    while (stack.length) {
        let [c, r] = stack.pop();
        if (r === TUNNEL_ROW) c = (c + COLS) % COLS;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
        if (seen[r][c] || ORIGINAL_MAP[r][c] === 1) continue;
        seen[r][c] = true;
        stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    return ORIGINAL_MAP.map((row, r) => row.map((t, c) => t !== 1 && !seen[r][c]));
})();

function solid(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    return ORIGINAL_MAP[r][c] === 1 || voidTiles[r][c];
}

/** 壁の輪郭線をつなげたパスを作る（ネオン管風） */
function buildWallPath() {
    const p = new Path2D();
    const d = 5;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!solid(c, r)) continue;
            const x0 = c * T, y0 = r * T;
            const up = !solid(c, r - 1), dn = !solid(c, r + 1);
            const lf = !solid(c - 1, r), rt = !solid(c + 1, r);
            if (up) { p.moveTo(x0 + (lf ? d : 0), y0 + d); p.lineTo(x0 + T - (rt ? d : 0), y0 + d); }
            if (dn) { p.moveTo(x0 + (lf ? d : 0), y0 + T - d); p.lineTo(x0 + T - (rt ? d : 0), y0 + T - d); }
            if (lf) { p.moveTo(x0 + d, y0 + (up ? d : 0)); p.lineTo(x0 + d, y0 + T - (dn ? d : 0)); }
            if (rt) { p.moveTo(x0 + T - d, y0 + (up ? d : 0)); p.lineTo(x0 + T - d, y0 + T - (dn ? d : 0)); }
            // 内側の角（凹角）を丸くつなぐ
            if (!up && !lf && !solid(c - 1, r - 1)) { p.moveTo(x0 + d, y0); p.arc(x0, y0, d, 0, Math.PI / 2); }
            if (!up && !rt && !solid(c + 1, r - 1)) { p.moveTo(x0 + T, y0 + d); p.arc(x0 + T, y0, d, Math.PI / 2, Math.PI); }
            if (!dn && !lf && !solid(c - 1, r + 1)) { p.moveTo(x0, y0 + T - d); p.arc(x0, y0 + T, d, -Math.PI / 2, 0); }
            if (!dn && !rt && !solid(c + 1, r + 1)) { p.moveTo(x0 + T - d, y0 + T); p.arc(x0 + T, y0 + T, d, Math.PI, Math.PI * 1.5); }
        }
    }
    return p;
}

function makeWallLayer(stroke, glow, inner) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * renderScale);
    cv.height = Math.round(H * renderScale);
    const g = cv.getContext('2d');
    g.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = stroke;
    g.lineWidth = 3;
    g.shadowBlur = 10;
    g.shadowColor = glow;
    g.stroke(wallPath);
    g.stroke(wallPath);
    g.shadowBlur = 0;
    g.strokeStyle = inner;
    g.lineWidth = 1;
    g.stroke(wallPath);
    return cv;
}

function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.getBoundingClientRect().width || W;
    renderScale = Math.min(3, Math.max(1, (cssW * dpr) / W));
    canvas.width = Math.round(W * renderScale);
    canvas.height = Math.round(H * renderScale);
    if (!wallPath) wallPath = buildWallPath();
    wallBlue = makeWallLayer('#1f5bff', '#2a8bff', '#9cc8ff');
    wallWhite = makeWallLayer('#ffffff', '#ffffff', '#ffffff');
}

function drawDots() {
    const blinkOff = state === 'play' && Math.floor(globalTimer / 12) % 2 === 1;
    ctx.fillStyle = '#ffcfa0';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 2) ctx.fillRect(c * T + 6.5, r * T + 6.5, 3, 3);
        }
    }
    if (blinkOff) return;
    ctx.save();
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 12;
    const pr = 5 + Math.sin(globalTimer * 0.15);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] !== 3) continue;
            ctx.beginPath();
            ctx.arc(c * T + T / 2, r * T + T / 2, pr, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawGate() {
    ctx.save();
    ctx.strokeStyle = '#ffb8ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffb8ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(13 * T, 11 * T + 9);
    ctx.lineTo(15 * T, 11 * T + 9);
    ctx.stroke();
    ctx.restore();
}

function drawPacman() {
    const open = pacman.moving ? Math.abs(Math.sin(pacman.animT * Math.PI / 16)) * 0.27 + 0.02 : 0.16;
    ctx.save();
    ctx.translate(pacman.x, pacman.y);
    ctx.rotate(pacman.dir.angle);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffe600';
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(0, 0, 7.4, open * Math.PI, (2 - open) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPacmanDeath() {
    if (stateTimer < DEATH_FREEZE) { drawPacman(); return; }
    const p = Math.min(1, (stateTimer - DEATH_FREEZE) / 75);
    if (p >= 1) return;
    const open = 0.02 + p * 0.98;
    ctx.save();
    ctx.translate(pacman.x, pacman.y);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffe600';
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(0, 0, 7.4, open * Math.PI, (2 - open) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawFruit(kind, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 8;
    const circle = (cx, cy, r, color) => {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    };
    const leaf = (cx, cy, rot) => {
        ctx.fillStyle = '#3ddc84';
        ctx.shadowColor = '#3ddc84';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 3, 1.4, rot, 0, Math.PI * 2);
        ctx.fill();
    };
    switch (kind) {
        case 'cherry':
            ctx.strokeStyle = '#3ddc84';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(-3, 2); ctx.quadraticCurveTo(-1, -5, 4, -7);
            ctx.moveTo(3, 3); ctx.quadraticCurveTo(3, -3, 4, -7);
            ctx.stroke();
            circle(-3.2, 3, 3.4, '#ff2a4d');
            circle(3, 4, 3.4, '#ff2a4d');
            ctx.shadowBlur = 0;
            circle(-4.2, 2, 0.9, '#ffffff');
            break;
        case 'strawberry':
            ctx.fillStyle = '#ff2a4d';
            ctx.shadowColor = '#ff2a4d';
            ctx.beginPath();
            ctx.moveTo(-6, -3);
            ctx.quadraticCurveTo(0, -6, 6, -3);
            ctx.quadraticCurveTo(5, 4, 0, 7);
            ctx.quadraticCurveTo(-5, 4, -6, -3);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffe9a0';
            [[-3, -1], [1, -2], [3, 1], [-1, 2], [0, 4.5], [-3.5, 2]].forEach(([a, b]) => ctx.fillRect(a, b, 1, 1));
            leaf(-2, -5, -0.3); leaf(2, -5, 0.3);
            break;
        case 'orange':
            circle(0, 1, 6, '#ff9a1f');
            leaf(2.5, -5, 0.4);
            ctx.shadowBlur = 0;
            circle(-2, -1, 1.2, '#ffd29a');
            break;
        case 'apple':
            circle(0, 1.5, 6, '#ff2a3a');
            ctx.strokeStyle = '#a0612b';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(1, -7); ctx.stroke();
            leaf(3, -5.5, -0.5);
            ctx.shadowBlur = 0;
            circle(-2.5, -0.5, 1.2, '#ffb3b3');
            break;
        case 'melon':
            circle(0, 0, 6.5, '#3ddc84');
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#0e7a3e';
            ctx.lineWidth = 1;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.abs(i) * 4 + 0.5, 6.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            break;
        case 'grapes':
            [[-3, -2], [3, -2], [0, -2], [-1.5, 1], [1.5, 1], [0, 4], [-4, 1.5], [4, 1.5]]
                .forEach(([a, b]) => circle(a, b, 2.3, '#a35cff'));
            leaf(0, -6, 0);
            break;
        case 'bell':
            ctx.fillStyle = '#ffd400';
            ctx.shadowColor = '#ffd400';
            ctx.beginPath();
            ctx.moveTo(-6, 4);
            ctx.quadraticCurveTo(-5, -6, 0, -6);
            ctx.quadraticCurveTo(5, -6, 6, 4);
            ctx.closePath();
            ctx.fill();
            circle(0, 5, 1.8, '#9cc8ff');
            break;
        default: // key
            ctx.strokeStyle = '#7fe9ff';
            ctx.shadowColor = '#7fe9ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -3.5, 3, 0, Math.PI * 2);
            ctx.moveTo(0, -0.5); ctx.lineTo(0, 7);
            ctx.moveTo(0, 3.5); ctx.lineTo(3, 3.5);
            ctx.moveTo(0, 6); ctx.lineTo(2.5, 6);
            ctx.stroke();
    }
    ctx.restore();
}

function drawText(text, x, y, color, size = 12) {
    ctx.save();
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function textPlate(y, h) {
    ctx.fillStyle = 'rgba(3, 0, 8, 0.85)';
    ctx.fillRect(W / 2 - 92, y - h / 2, 184, h);
}

function render() {
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.fillStyle = '#030008';
    ctx.fillRect(0, 0, W, H);

    const flashWhite = state === 'clear' && stateTimer >= 60 && Math.floor((stateTimer - 60) / 12) % 2 === 0;
    ctx.drawImage(flashWhite ? wallWhite : wallBlue, 0, 0, W, H);
    if (state !== 'clear' || stateTimer < 60) drawGate();
    drawDots();
    if (fruit && (fruit.t > 120 || Math.floor(fruit.t / 8) % 2 === 0)) drawFruit(fruit.kind, FRUIT_POS.x, FRUIT_POS.y);

    const hideGhosts = (state === 'dying' && stateTimer >= DEATH_FREEZE) ||
                       (state === 'clear' && stateTimer >= 60) || state === 'over';
    if (!hideGhosts) {
        // 目玉 → 通常の順に描く（重なり時に体が上に来るように）
        ghosts.filter(g => g.isEyes).forEach(g => { if (g !== frozenGhost) g.draw(); });
        ghosts.filter(g => !g.isEyes).forEach(g => g.draw());
    }

    if (state === 'dying') drawPacmanDeath();
    else if (state !== 'over' && freezeTimer === 0) drawPacman();

    // パーティクル
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1, p.y - 1, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;

    // 得点ポップアップ
    for (const p of popups) {
        drawText(p.text, p.x, p.y - (p.t < 30 ? (30 - p.t) * 0.3 : 0), p.color, 8);
    }

    // 状態ごとのメッセージ
    if (state === 'ready') {
        if (level > 1 || lifeLost) {
            textPlate(MSG_Y - 22, 16);
            drawText(`LEVEL ${level}`, W / 2, MSG_Y - 22, '#00f2fe', 9);
        }
        drawText('READY!', W / 2, MSG_Y, '#ffe600', 12);
    } else if (state === 'clear' && stateTimer >= 30) {
        textPlate(MSG_Y, 20);
        drawText('CLEAR!', W / 2, MSG_Y, '#7dff6a', 12);
    } else if (state === 'over') {
        drawText('GAME  OVER', W / 2, MSG_Y, '#ff2d55', 12);
    } else if (state === 'pause') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, W, H);
        drawText('PAUSED', W / 2, H / 2 - 12, '#ff2d95', 18);
        drawText('TAP / P TO RESUME', W / 2, H / 2 + 20, '#cfd3ff', 8);
    }
}

// ---------------------------------------------------------
// HUD・ボタン
// ---------------------------------------------------------
const el = {
    score: document.getElementById('score'),
    high: document.getElementById('highscore'),
    level: document.getElementById('level'),
    lives: document.getElementById('lives'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    muteBtn: document.getElementById('mute-btn'),
    ctrlPause: document.getElementById('ctrl-pause'),
    dirBtns: Array.from(document.querySelectorAll('.ctrl-btn[data-dir]'))
};
const hudCache = {};

function setOnce(key, value, fn) {
    if (hudCache[key] === value) return;
    hudCache[key] = value;
    fn(value);
}

function updateHUD() {
    setOnce('score', score, v => { el.score.textContent = String(v).padStart(6, '0'); });
    setOnce('high', highScore, v => { el.high.textContent = String(v).padStart(6, '0'); });
    setOnce('level', level, v => { el.level.textContent = v; });
    setOnce('lives', lives, v => {
        el.lives.innerHTML = '';
        for (let i = 0; i < Math.min(v, 6); i++) {
            const d = document.createElement('div');
            d.className = 'life-icon';
            el.lives.appendChild(d);
        }
    });
    const canPause = state === 'play' || state === 'ready' || state === 'pause';
    setOnce('pause', `${canPause}|${state === 'pause'}`, () => {
        el.pauseBtn.disabled = !canPause;
        el.pauseBtn.textContent = state === 'pause' ? 'Resume' : 'Pause';
        el.ctrlPause.textContent = state === 'pause' ? '▶' : 'II';
    });
    const active = (state === 'play' || state === 'ready') ? pacman.nextDir.name : '';
    setOnce('dir', active, v => {
        el.dirBtns.forEach(b => b.classList.toggle('active', b.dataset.dir === v));
    });
}

function updateMuteLabel() {
    const m = audio ? audio.muted : true;
    el.muteBtn.textContent = m ? 'Sound: OFF' : 'Sound: ON';
}

function showResultModal() {
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = level;
    document.getElementById('modal-title').textContent = 'GAME OVER';
    document.getElementById('new-record').classList.toggle('show', newRecord && score > 0);
    document.getElementById('result-modal').classList.add('active');
}

function hideResultModal() {
    document.getElementById('result-modal').classList.remove('active');
}

// ---------------------------------------------------------
// 入力
// ---------------------------------------------------------
function unlockAudio() {
    if (audio) audio.init();
}

function setDirection(name) {
    if (!DIR[name]) return;
    if (state === 'play' || state === 'ready') pacman.nextDir = DIR[name];
}

function togglePause() {
    if (state === 'pause') {
        state = pausedFrom || 'play';
        pausedFrom = null;
    } else if (state === 'play' || state === 'ready') {
        pausedFrom = state;
        state = 'pause';
        saveHighScore();
    }
}

function requestStart() {
    unlockAudio();
    startGame();
}

const KEY_DIRS = {
    arrowup: 'up', w: 'up',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left',
    arrowright: 'right', d: 'right'
};

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    unlockAudio();
    if (KEY_DIRS[k]) { setDirection(KEY_DIRS[k]); return; }
    if (k === 'p' || k === 'escape') { togglePause(); return; }
    if (k === 'm') { if (audio) audio.toggleMute(); updateMuteLabel(); return; }
    if (k === 'enter' || k === ' ') {
        if (state === 'start' || state === 'over') requestStart();
        else if (state === 'pause') togglePause();
    }
});

// 十字キー
el.dirBtns.forEach(btn => {
    btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        unlockAudio();
        setDirection(btn.dataset.dir);
    });
});
el.ctrlPause.addEventListener('pointerdown', e => {
    e.preventDefault();
    unlockAudio();
    if (state === 'start' || state === 'over') requestStart();
    else togglePause();
});

// スワイプ（指を離さなくても、動かした時点で方向転換）
const wrapper = document.getElementById('canvas-wrapper');
let swipe = null;
wrapper.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    unlockAudio();
    swipe = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
});
wrapper.addEventListener('pointermove', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'right' : 'left');
    else setDirection(dy > 0 ? 'down' : 'up');
    swipe.x = e.clientX;
    swipe.y = e.clientY;
    swipe.moved = true;
});
const endSwipe = e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    if (!swipe.moved && state === 'pause') togglePause(); // タップで再開
    swipe = null;
};
wrapper.addEventListener('pointerup', endSwipe);
wrapper.addEventListener('pointercancel', endSwipe);
// スクロールやズームを防止
wrapper.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.getElementById('mobile-controls').addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// ボタン類
document.getElementById('overlay-start-btn').addEventListener('click', requestStart);
el.startBtn.addEventListener('click', requestStart);
document.getElementById('restart-btn').addEventListener('click', requestStart);
el.pauseBtn.addEventListener('click', () => { unlockAudio(); togglePause(); });
el.muteBtn.addEventListener('click', () => {
    unlockAudio();
    if (audio) audio.toggleMute();
    updateMuteLabel();
});
document.addEventListener('pointerdown', unlockAudio, { passive: true });

// 画面を離れたら自動で一時停止
document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'play' || state === 'ready')) togglePause();
    if (document.hidden) saveHighScore();
});
window.addEventListener('pagehide', saveHighScore);

// タッチ端末判定
const isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('touch');

// ---------------------------------------------------------
// メインループ（固定タイムステップ）
// ---------------------------------------------------------
let lastTime = performance.now();
let acc = 0;

function frame(now) {
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 250) dt = 250; // タブ復帰時などの大きな飛びを抑制
    acc += dt;
    let steps = 0;
    while (acc >= FRAME_MS && steps < 5) {
        try { tick(); } catch (e) { console.error('tick error:', e); }
        acc -= FRAME_MS;
        steps++;
    }
    if (steps >= 5) acc = 0;
    try { render(); } catch (e) { console.error('render error:', e); }
    requestAnimationFrame(frame);
}

let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupCanvas, 150);
});

setupCanvas();
updateMuteLabel();
updateHUD();
if (document.fonts && document.fonts.load) {
    document.fonts.load(`12px ${FONT}`).catch(() => {});
}
requestAnimationFrame(frame);

})();
