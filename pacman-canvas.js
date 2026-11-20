/*-------------------------------------------------------------------

	___________    ____   _____ _____    ____  
	\____ \__  \ _/ ___\ /     \\__  \  /    \ 
	|  |_> > __ \\  \___|  Y Y  \/ __ \|   |  \
	|   __(____  /\___  >__|_|  (____  /___|  /
	|__|       \/     \/      \/     \/     \/ .platzh1rsch.ch
	
	author: platzh1rsch		(www.platzh1rsch.ch)
	
-------------------------------------------------------------------*/

"use strict";

const GHOSTS = {
	INKY: 'inky',
	BLINKY: 'blinky',
	PINKY: 'pinky',
	CLYDE: 'clyde'
}

function geronimo() {
	/* ----- Global Variables ---------------------------------------- */
	var canvas;
	var joystick;
	var context;
	var game;
	var canvas_walls, context_walls;
	var inky, blinky, clyde, pinky;

	var mapConfig = "data/map.json";
	var mapCache = null;			// map.json is loaded once and cloned for every level

	// logical game size (all game logic works in these units)
	var GAME_W = 540, GAME_H = 390;
	var DPR = Math.min(window.devicePixelRatio || 1, 3);

	// small localStorage helpers (never throw)
	var store = {
		get: function (k, def) {
			try { var v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
		},
		set: function (k, v) {
			try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
		}
	};

	/* Highscore (stored in this browser) */
	var HS_KEY = "pacman_highscores_v1";
	var Highscore = {
		list: function () {
			var l = store.get(HS_KEY, []);
			return Array.isArray(l) ? l : [];
		},
		best: function () {
			var l = this.list();
			return l.length ? l[0].score : 0;
		},
		qualifies: function (score) {
			if (score <= 0) return false;
			var l = this.list();
			return l.length < 10 || score > l[l.length - 1].score;
		},
		add: function (name, score, level) {
			var l = this.list();
			var entry = { name: name, score: score, level: level, date: new Date().toISOString().slice(0, 10) };
			l.push(entry);
			l.sort(function (a, b) { return b.score - a.score; });
			l = l.slice(0, 10);
			store.set(HS_KEY, l);
			return l.indexOf(entry);
		},
		clear: function () { store.set(HS_KEY, []); }
	};

	function escapeHtml(s) {
		return String(s).replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
		});
	}

	var getHighscore = function (highlight) {
		var l = Highscore.list();
		var $list = $("#highscore-list").empty();
		if (!l.length) {
			$list.append("<li class='empty'>まだ記録がありません</li>");
			return;
		}
		for (var i = 0; i < l.length; i++) {
			var cls = (i === highlight) ? " class='new'" : "";
			$list.append("<li" + cls + "><span class='rank'>" + (i + 1) + "</span><span class='hs-name'>" + escapeHtml(l[i].name)
				+ "</span><span class='hs-level'>Lv" + (l[i].level || 1) + "</span><span class='hs-score'>" + l[i].score + "</span></li>");
		}
	};

	function addHighscore() {
		var name = $.trim($("#playerName").val()).slice(0, 10);
		store.set("pacman_last_name", name);
		var rank = Highscore.add(name, game.score.score, game.level);
		game.refreshHiScore();
		$("#highscore-form").html("<p class='saved'>" + (rank + 1) + "位に登録しました！</p><span class='button' id='show-highscore'>ランキングを見る</span>");
	}

	function buildWall(context, gridX, gridY, width, height, inset) {
		inset = inset || 0;
		width = width * 2 - 1;
		height = height * 2 - 1;
		context.fillRect(pacman.radius / 2 + gridX * 2 * pacman.radius + inset, pacman.radius / 2 + gridY * 2 * pacman.radius + inset, width * pacman.radius - 2 * inset, height * pacman.radius - 2 * inset);
	}

	function between(x, min, max) {
		return x >= min && x <= max;
	}


	// Logger
	var logger = function () {
		var oldConsoleLog = null;
		var pub = {};

		pub.enableLogger = function enableLogger() {
			if (oldConsoleLog === null)
				return;

			window['console']['log'] = oldConsoleLog;
		};

		pub.disableLogger = function disableLogger() {
			oldConsoleLog = console.log;
			window['console']['log'] = function () { };
		};

		return pub;
	}();

	// stop watch to measure the time
	function Timer() {
		this.time_diff = 0;
		this.time_start = 0;
		this.time_stop = 0;
		this.start = function () {
			this.time_start = new Date().getTime();
		}
		this.stop = function () {
			this.time_stop = new Date().getTime();
			this.time_diff += this.time_stop - this.time_start;
			this.time_stop = 0;
			this.time_start = 0;
		}
		this.reset = function () {
			this.time_diff = 0;
			this.time_start = 0;
			this.time_stop = 0;
		}
		this.get_time_diff = function () {
			return this.time_diff;
		}
	}

	// Manages the whole game ("God Object")
	function Game() {
		this.timer = new Timer();
		this.refreshRate = 33;		// speed of the game, will increase in higher levels
		this.running = false;
		this.pause = true;
		this.score = new Score();
		this.soundfx = 0;
		this.map;
		this.pillCount;				// number of pills
		this.monsters;
		this.level = 1;
		this.refreshLevel = function (h) {
			$(h).html("<span class='label'>LEVEL</span><span class='val'>" + this.level + "</span>");
		};
		this.refreshHiScore = function () {
			var hi = Math.max(Highscore.best(), this.score.score);
			$(".hiscore").html("<span class='label'>HI-SCORE</span><span class='val'>" + hi + "</span>");
		};
		this.gameOver = false;
		this.canvas = $("#myCanvas").get(0);
		this.wallColor = "Blue";
		this.width = GAME_W;
		this.height = GAME_H;
		this.readyTimer = 0;		// short "READY!" pause before play starts
		this.ghostCombo = 0;		// ghosts eaten during one power pill
		this.popups = [];			// floating score texts
		this.extraLifeGiven = false;
		this.frame = 0;

		this.pillSize = 3;
		this.powerpillSizeMin = 2;
		this.powerpillSizeMax = 6;
		this.powerpillSizeCurrent = this.powerpillSizeMax;
		this.powerPillAnimationCounter = 0;
		this.nextPowerPillSize = function () {
			// gentle pulsing animation
			var t = (Math.sin(this.frame / 4) + 1) / 2;
			this.powerpillSizeCurrent = this.powerpillSizeMin + 2 + t * (this.powerpillSizeMax + 1 - this.powerpillSizeMin - 2);
			return this.powerpillSizeCurrent;
		};

		this.ghostFrightened = false;
		this.ghostFrightenedTimer = 240;
		this.ghostMode = 0;			// 0 = Scatter, 1 = Chase
		this.ghostModeTimer = 200;	// decrements each animationLoop execution
		this.ghostSpeedNormal = (this.level > 4 ? 3 : 2);	// global default for ghost speed
		this.ghostSpeedDazzled = 2; // global default for ghost speed when dazzled

		/* Game Functions */
		this.startGhostFrightened = function () {
			console.log("ghost frigthened");
			this.ghostFrightened = true;
			this.ghostFrightenedTimer = 240;
			this.ghostCombo = 0;
			inky.dazzle();
			pinky.dazzle();
			blinky.dazzle();
			clyde.dazzle();
		};

		this.endGhostFrightened = function () {
			console.log("ghost frigthened end");
			this.ghostFrightened = false;
			inky.undazzle();
			pinky.undazzle();
			blinky.undazzle();
			clyde.undazzle();
		};


		this.checkGhostMode = function () {
			if (this.ghostFrightened) {

				this.ghostFrightenedTimer--;
				if (this.ghostFrightenedTimer === 0) {
					this.endGhostFrightened();
					this.ghostFrigthenedTimer = 240;
					/*inky.reverseDirection();
					pinky.reverseDirection();
					clyde.reverseDirection();
					blinky.reverseDirection();*/
				}
			}
			// always decrement ghostMode timer
			this.ghostModeTimer--;
			if (this.ghostModeTimer === 0 && game.level > 1) {
				this.ghostMode ^= 1;
				this.ghostModeTimer = 200 + this.ghostMode * 450;
				console.log("ghostMode=" + this.ghostMode);

				game.buildWalls();

				inky.reverseDirection();
				pinky.reverseDirection();
				clyde.reverseDirection();
				blinky.reverseDirection();
			}
		};

		this.getMapContent = function (x, y) {
			// wrap around the tunnel edges
			var cols = game.width / 30;
			var rows = game.height / 30;
			x = ((x % cols) + cols) % cols;
			y = ((y % rows) + rows) % rows;
			return this.map.posY[y].posX[x].type;
		};

		this.setMapContent = function (x, y, val) {
			this.map.posY[y].posX[x].type = val;
		};

		this.toggleSound = function () {
			this.soundfx = this.soundfx === 0 ? 1 : 0;
			store.set("pacman_sound", this.soundfx);
			this.refreshSoundButton();
		};
		this.refreshSoundButton = function () {
			$('#sound-toggle')
				.toggleClass('on', this.soundfx === 1)
				.attr('aria-pressed', this.soundfx === 1)
				.attr('title', this.soundfx === 1 ? '音を消す (M)' : '音を出す (M)')
				.text(this.soundfx === 1 ? '🔊' : '🔇');
		};

		this.reset = function () {
		};

		this.newGame = function () {
			// ask only if a game is in progress
			if (this.running && !this.gameOver) {
				if (!this.pause) this.showMessage("ポーズ", "クリック・タップで再開");
				$('#confirm-modal').fadeIn(150);
			} else {
				this.startNewGame();
			}
		};

		this.startNewGame = async function () {
			$('#confirm-modal').hide();
			await this.init(0);
			game.gameOver = false;
			if (!this.running) {
				this.pauseResume();
			} else {
				this.pause = true;
				this.pauseResume();
			}
		};

		this.nextLevel = function () {
			this.level++;
			Sound.play("levelup");
			game.showMessage("LEVEL " + game.level, this.getLevelTitle() + "<br/><small>クリック・タップで次へ</small>");
			game.refreshLevel(".level");
			this.init(1);
		};

		this.drawHearts = function (count) {
			var html = "";
			for (var i = 0; i < count; i++) {
				html += "<span class='life'></span>";
			}
			$(".lives").html(html);

		};

		this.showContent = function (id) {
			if (id !== 'game-content' && this.running && !this.pause && !this.gameOver) {
				this.showMessage("ポーズ", "クリック・タップで再開");
			}
			$('.content').hide();
			$('#' + id).show();
			window.scrollTo(0, 0);
		};

		this.getLevelTitle = function () {
			switch (this.level) {
				case 2:
					return '「追跡開始」<br/>おばけが追いかけてくるように';
				case 3:
					return '「インキー目覚める」<br/>水色のおばけも出てくるぞ';
				case 4:
					return '「クライド目覚める」<br/>オレンジのおばけも参戦';
				case 5:
					return '「スピードアップ」<br/>おばけが速くなった！';
				default:
					return '「まだまだ続く」<br/>どこまで行けるかな？';
			}
		}

		this.showMessage = function (title, text) {
			this.timer.stop();
			this.pause = true;
			$('body').removeClass('playing');
			$('#canvas-overlay-container').stop(true, true).fadeIn(200);
			$('#canvas-overlay-content #title').text(title);
			$('#canvas-overlay-content #text').html(text);
		};

		this.closeMessage = function () {
			$('#canvas-overlay-container').stop(true, true).fadeOut(200);
			$('body').addClass('playing');
		};

		this.addPopup = function (x, y, text, color) {
			this.popups.push({ x: x, y: y, text: text, color: color || "#5ef2ff", ttl: 40 });
		};

		this.addScore = function (points) {
			var before = this.score.score;
			this.score.add(points);
			// one extra life at 10,000 points
			if (!this.extraLifeGiven && before < 10000 && this.score.score >= 10000) {
				this.extraLifeGiven = true;
				pacman.lives++;
				this.drawHearts(pacman.lives);
				this.addPopup(GAME_W / 2, GAME_H / 2, "1UP!", "#ffe14d");
				Sound.play("levelup");
			}
		};

		this.pauseResume = function () {
			if (!this.running) {
				// start timer
				this.timer.start();

				this.pause = false;
				this.running = true;
				this.closeMessage();
				animationLoop();
			}
			else if (this.pause) {
				// stop timer
				this.timer.stop();

				this.pause = false;
				this.closeMessage();
			}
			else {
				this.showMessage("ポーズ", "クリック・タップで再開");
			}
		};

		this.loadMapConfig = async () => {
			if (mapCache) {
				game.map = JSON.parse(JSON.stringify(mapCache));
				return game.map;
			}
			return new Promise((resolve, reject) => {
				$.ajax({
					url: mapConfig,
					beforeSend: function (xhr) {
						if (xhr.overrideMimeType) xhr.overrideMimeType("application/json");
					},
					dataType: "json",
					success: (data) => {
						mapCache = JSON.parse(JSON.stringify(data));
						game.map = data;
						resolve(data);
					},
					error: (response) => {
						console.error('error fetching map config');
						reject(response);
					}
				});


			})
		};

		this.getPillCount = () => {
			var temp = 0;
			$.each(this.map.posY, function (i, item) {
				$.each(this.posX, function () {
					if (this.type == "pill") {
						temp++;
						//console.log("Pill Count++. temp="+temp+". PillCount="+this.pillCount+".");
					}
				});
			});
			return temp;
		}

		this.init = async (state) => {

			console.log("init game " + state);

			// reset timer if restart
			if (state === 0) {
				this.timer.reset();
			}

			// get Level Map
			this.map = await this.loadMapConfig();

			this.pillCount = this.getPillCount();

			if (state === 0) {
				this.score.set(0);
				this.score.refresh(".score");
				pacman.lives = 3;
				game.level = 1;
				this.refreshLevel(".level");
				game.gameOver = false;
				this.extraLifeGiven = false;
			}
			pacman.reset();
			pacman.beastMode = false;
			pacman.beastModeTimer = 0;

			game.drawHearts(pacman.lives);
			this.refreshHiScore();

			// ghosts get faster from level 5 on (speed must divide 30)
			this.ghostSpeedNormal = (this.level >= 5 ? 3 : 2);
			this.readyTimer = 45;
			this.popups = [];
			this.ghostCombo = 0;

			this.ghostFrightened = false;
			this.ghostFrightenedTimer = 240;
			this.ghostMode = 0;			// 0 = Scatter, 1 = Chase
			this.ghostModeTimer = 200;	// decrements each animationLoop execution

			// initalize Ghosts, avoid memory flooding
			if (pinky === null || pinky === undefined) {
				pinky = new Ghost(GHOSTS.PINKY, 7, 5, 'img/pinky.svg', 2, 2);
				inky = new Ghost(GHOSTS.INKY, 8, 5, 'img/inky.svg', 13, 11);
				blinky = new Ghost(GHOSTS.BLINKY, 9, 5, 'img/blinky.svg', 13, 0);
				clyde = new Ghost(GHOSTS.CLYDE, 10, 5, 'img/clyde.svg', 2, 11);
			}
			else {
				//console.log("ghosts reset");
				pinky.reset();
				inky.reset();
				blinky.reset();
				clyde.reset();
			}
			blinky.start();	// blinky is the first to leave ghostHouse
			inky.start();
			pinky.start();
			clyde.start();
		};

		this.check = function () {
			if ((this.pillCount === 0) && game.running) {
				this.nextLevel();
			}
		};

		this.win = function () { };
		this.gameover = function () { };

		this.toPixelPos = function (gridPos) {
			return gridPos * 30;
		};

		this.toGridPos = function (pixelPos) {
			return ((pixelPos % 30) / 30);
		};

		/* ------------ Start Pre-Build Walls  ------------ */
		var WALLS = [
			[0, 0, 18, 1],
			[0, 12, 18, 1],
			[0, 0, 1, 6],
			[0, 7, 1, 6],
			[17, 0, 1, 6],
			[17, 7, 1, 6],
			[7, 4, 1, 1],
			[6, 5, 1, 2],
			[10, 4, 1, 1],
			[11, 5, 1, 2],
			[6, 6, 6, 1],
			[4, 0, 1, 2],
			[13, 0, 1, 2],
			[2, 2, 1, 2],
			[6, 2, 2, 1],
			[15, 2, 1, 2],
			[10, 2, 2, 1],
			[2, 3, 2, 1],
			[14, 3, 2, 1],
			[5, 3, 1, 1],
			[12, 3, 1, 1],
			[3, 3, 1, 3],
			[14, 3, 1, 3],
			[3, 4, 1, 1],
			[14, 4, 1, 1],
			[0, 5, 2, 1],
			[3, 5, 2, 1],
			[16, 5, 2, 1],
			[13, 5, 2, 1],
			[0, 7, 2, 2],
			[16, 7, 2, 2],
			[3, 7, 2, 2],
			[13, 7, 2, 2],
			[4, 8, 2, 2],
			[12, 8, 2, 2],
			[5, 8, 3, 1],
			[10, 8, 3, 1],
			[2, 10, 1, 1],
			[15, 10, 1, 1],
			[7, 10, 4, 1],
			[4, 11, 2, 2],
			[12, 11, 2, 2],
		];
		this.buildWalls = function () {
			var chase = (this.ghostMode !== 0);
			game.wallColor = chase ? "Red" : "Blue";
			var edge = chase ? "#ff4d6d" : "#4d7cff";
			var glow = chase ? "rgba(255,40,80,0.9)" : "rgba(60,110,255,0.9)";
			var inner = chase ? "#2a0712" : "#070d33";

			canvas_walls = document.createElement('canvas');
			canvas_walls.width = GAME_W * DPR;
			canvas_walls.height = GAME_H * DPR;
			context_walls = canvas_walls.getContext("2d");
			context_walls.scale(DPR, DPR);

			// pass 1: bright neon body with glow
			context_walls.save();
			context_walls.shadowColor = glow;
			context_walls.shadowBlur = 10;
			context_walls.fillStyle = edge;
			for (var i = 0; i < WALLS.length; i++) {
				var w = WALLS[i];
				buildWall(context_walls, w[0], w[1], w[2], w[3]);
			}
			context_walls.restore();

			// pass 2: dark inside -> leaves a glowing outline
			context_walls.fillStyle = inner;
			for (var j = 0; j < WALLS.length; j++) {
				var v = WALLS[j];
				buildWall(context_walls, v[0], v[1], v[2], v[3], 3);
			}

			// ghost base door
			context_walls.fillStyle = "#ff9ad5";
			context_walls.fillRect(8 * 2 * pacman.radius, pacman.radius / 2 + 4 * 2 * pacman.radius + 4, 4 * pacman.radius, 3);
			/* ------------ End Pre-Build Walls  ------------ */
		};

	}

	game = new Game();



	function Score() {
		this.score = 0;
		this.set = function (i) {
			this.score = i;
		};
		this.add = function (i) {
			this.score += i;
		};
		this.refresh = function (h) {
			if (this._shown === this.score) return;
			this._shown = this.score;
			$(h).html("<span class='label'>SCORE</span><span class='val'>" + this.score + "</span>");
			if (this.score > Highscore.best()) game.refreshHiScore();
		};

	}



	// used to play sounds during the game
	var Sound = {};
	var audioCtx = null;
	function beep(notes) {
		try {
			audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
			var t = audioCtx.currentTime;
			notes.forEach(function (n, i) {
				var o = audioCtx.createOscillator(), g = audioCtx.createGain();
				o.type = "square";
				o.frequency.value = n;
				g.gain.setValueAtTime(0.08, t + i * 0.09);
				g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.12);
				o.connect(g); g.connect(audioCtx.destination);
				o.start(t + i * 0.09);
				o.stop(t + i * 0.09 + 0.13);
			});
		} catch (e) { }
	}
	Sound.play = function (sound) {
		if (game.soundfx != 1) return;
		if (sound === "levelup") { beep([523, 659, 784, 1047]); return; }
		var audio = document.getElementById(sound);
		if (audio === null) return;
		try {
			if (sound === "waka" && !audio.paused) return;	// avoid stutter
			audio.currentTime = 0;
			var p = audio.play();
			if (p && p.catch) p.catch(function () { });
		} catch (e) { }
	};


	// Direction object in Constructor notation
	function Direction(name, angle1, angle2, dirX, dirY) {
		this.name = name;
		this.angle1 = angle1;
		this.angle2 = angle2;
		this.dirX = dirX;
		this.dirY = dirY;
		this.equals = function (dir) {
			return JSON.stringify(this) == JSON.stringify(dir);
		};
	}

	// Direction Objects
	var up = new Direction("up", 1.75, 1.25, 0, -1);		// UP
	var left = new Direction("left", 1.25, 0.75, -1, 0);	// LEFT
	var down = new Direction("down", 0.75, 0.25, 0, 1);		// DOWN
	var right = new Direction("right", 0.25, 1.75, 1, 0);	// 
	/*var directions = [{},{},{},{}];
	directions[0] = up;
	directions[1] = down;
	directions[2] = right;
	directions[3] = left;*/


	// DirectionWatcher
	function directionWatcher() {
		this.dir = null;
		this.set = function (dir) {
			this.dir = dir;
		};
		this.get = function () {
			return this.dir;
		};
	}

	//var directionWatcher = new directionWatcher();

	// Ghost object in Constructor notation
	function Ghost(name, gridPosX, gridPosY, image, gridBaseX, gridBaseY) {
		this.name = name;
		this.posX = gridPosX * 30;
		this.posY = gridPosY * 30;
		this.startPosX = gridPosX * 30;
		this.startPosY = gridPosY * 30;
		this.gridBaseX = gridBaseX;
		this.gridBaseY = gridBaseY;
		this.speed = game.ghostSpeedNormal;
		this.images = JSON.parse(
			'{"normal" : {'
			+ `"${GHOSTS.INKY}" : "0",`
			+ `"${GHOSTS.PINKY}" : "1",`
			+ `"${GHOSTS.BLINKY}" : "2",`
			+ `"${GHOSTS.CLYDE}" : "3"`
			+ '},'
			+
			'"frightened1" : {'
			+
			'"left" : "", "up": "", "right" : "", "down": ""},'
			+
			'"frightened2" : {'
			+
			'"left" : "", "up": "", "right" : "", "down": ""},'
			+
			'"dead" : {'
			+
			'"left" : "", "up": "", "right" : "", "down": ""}}'
		);
		this.image = new Image();
		this.image.src = image;
		this.ghostHouse = true;
		this.dazzled = false;
		this.dead = false;
		this.dazzle = function () {
			this.changeSpeed(game.ghostSpeedDazzled);
			// ensure ghost doesnt leave grid
			if (this.posX > 0) this.posX = this.posX - this.posX % this.speed;
			if (this.posY > 0) this.posY = this.posY - this.posY % this.speed;
			this.dazzled = true;
		}
		this.undazzle = function () {
			// only change speed if ghost is not "dead"
			if (!this.dead) this.changeSpeed(game.ghostSpeedNormal);
			// ensure ghost doesnt leave grid
			if (this.posX > 0) this.posX = this.posX - this.posX % this.speed;
			if (this.posY > 0) this.posY = this.posY - this.posY % this.speed;
			this.dazzled = false;
		}
		this.dazzleImg = new Image();
		this.dazzleImg.src = 'img/dazzled.svg';
		this.dazzleImg2 = new Image();
		this.dazzleImg2.src = 'img/dazzled2.svg';
		this.deadImg = new Image();
		this.deadImg.src = 'img/dead.svg';
		this.direction = right;
		this.radius = pacman.radius;
		this.draw = function (context) {
			if (this.dead) {
				context.drawImage(this.deadImg, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
			}
			else if (this.dazzled) {
				if (pacman.beastModeTimer < 50 && pacman.beastModeTimer % 8 > 1) {
					context.drawImage(this.dazzleImg2, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
				} else {
					context.drawImage(this.dazzleImg, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
				}
			}
			else context.drawImage(this.image, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
		}
		this.getCenterX = function () {
			return this.posX + this.radius;
		}
		this.getCenterY = function () {
			return this.posY + this.radius;
		}

		this.reset = function () {
			this.dead = false;
			this.posX = this.startPosX;
			this.posY = this.startPosY;
			this.ghostHouse = true;
			this.undazzle();
		}

		this.die = function () {
			if (!this.dead) {
				// 200 -> 400 -> 800 -> 1600 for each ghost eaten with one power pill
				var pts = 200 * Math.pow(2, Math.min(game.ghostCombo, 3));
				game.ghostCombo++;
				game.addScore(pts);
				game.addPopup(this.getCenterX(), this.getCenterY(), String(pts));
				Sound.play("eatghost");
				this.dead = true;
				this.changeSpeed(game.ghostSpeedNormal);
			}
		}
		this.changeSpeed = function (s) {
			// adjust gridPosition to new speed
			this.posX = Math.round(this.posX / s) * s;
			this.posY = Math.round(this.posY / s) * s;
			this.speed = s;
		}

		this.move = function () {

			this.checkDirectionChange();
			this.checkCollision();

			// leave Ghost House
			if (this.ghostHouse == true) {

				// Clyde does not start chasing before 2/3 of all pills are eaten and if level is < 4
				if (this.name == GHOSTS.CLYDE) {
					if ((game.level < 4) || ((game.pillCount > 104 / 3))) this.stop = true;
					else this.stop = false;
				}
				// Inky starts after 30 pills and only from the third level on
				if (this.name == GHOSTS.INKY) {
					if ((game.level < 3) || ((game.pillCount > 104 - 30))) this.stop = true;
					else this.stop = false;
				}

				if ((this.getGridPosY() == 5) && this.inGrid()) {
					if ((this.getGridPosX() == 7)) this.setDirection(right);
					if ((this.getGridPosX() == 8) || this.getGridPosX() == 9) this.setDirection(up);
					if ((this.getGridPosX() == 10)) this.setDirection(left);
				}
				if ((this.getGridPosY() == 4) && ((this.getGridPosX() == 8) || (this.getGridPosX() == 9)) && this.inGrid()) {
					console.log("ghosthouse -> false");
					this.ghostHouse = false;
				}
			}

			if (!this.stop) {
				// Move
				this.posX += this.speed * this.dirX;
				this.posY += this.speed * this.dirY;

				// Check if out of canvas
				if (this.posX >= game.width - this.radius) this.posX = this.speed - this.radius;
				if (this.posX <= 0 - this.radius) this.posX = game.width - this.speed - this.radius;
				if (this.posY >= game.height - this.radius) this.posY = this.speed - this.radius;
				if (this.posY <= 0 - this.radius) this.posY = game.height - this.speed - this.radius;
			}
		}

		this.checkCollision = function () {

			/* Check Back to Home */
			if (this.dead && (this.getGridPosX() == this.startPosX / 30) && (this.getGridPosY() == this.startPosY / 30)) this.reset();
			else {

				/* Check Ghost / Pacman Collision			*/
				if ((between(pacman.getCenterX(), this.getCenterX() - 10, this.getCenterX() + 10))
					&& (between(pacman.getCenterY(), this.getCenterY() - 10, this.getCenterY() + 10))) {
					if ((!this.dazzled) && (!this.dead)) {
						pacman.die();
					}
					else {
						this.die();
					}
				}
			}
		}

		/* Pathfinding */
		this.getNextDirection = function () {
			// get next field
			var pX = this.getGridPosX();
			var pY = this.getGridPosY();
			game.getMapContent(pX, pY);
			var u, d, r, l; 			// option up, down, right, left

			// get target
			if (this.dead) {			// go Home
				var tX = this.startPosX / 30;
				var tY = this.startPosY / 30;
			}
			else if (game.ghostMode == 0) {			// Scatter Mode
				var tX = this.gridBaseX;
				var tY = this.gridBaseY;
			} else if (game.ghostMode == 1) {			// Chase Mode

				switch (this.name) {

					// target: 4 ahead and 4 left of pacman
					case GHOSTS.PINKY:
						var pdir = pacman.direction;
						var pdirX = pdir.dirX == 0 ? - pdir.dirY : pdir.dirX;
						var pdirY = pdir.dirY == 0 ? - pdir.dirX : pdir.dirY;

						var tX = (pacman.getGridPosX() + pdirX * 4) % (game.width / pacman.radius + 1);
						var tY = (pacman.getGridPosY() + pdirY * 4) % (game.height / pacman.radius + 1);
						break;

					// target: pacman
					case GHOSTS.BLINKY:
						var tX = pacman.getGridPosX();
						var tY = pacman.getGridPosY();
						break;

					// target: 
					case GHOSTS.INKY:
						var tX = pacman.getGridPosX() + 2 * pacman.direction.dirX;
						var tY = pacman.getGridPosY() + 2 * pacman.direction.dirY;
						var vX = tX - blinky.getGridPosX();
						var vY = tY - blinky.getGridPosY();
						tX = Math.abs(blinky.getGridPosX() + vX * 2);
						tY = Math.abs(blinky.getGridPosY() + vY * 2);
						break;

					// target: pacman, until pacman is closer than 5 grid fields, then back to scatter
					case GHOSTS.CLYDE:
						var tX = pacman.getGridPosX();
						var tY = pacman.getGridPosY();
						var dist = Math.sqrt(Math.pow((pX - tX), 2) + Math.pow((pY - tY), 2));

						if (dist < 5) {
							tX = this.gridBaseX;
							tY = this.gridBaseY;
						}
						break;

				}
			}


			var oppDir = this.getOppositeDirection();	// ghosts are not allowed to change direction 180�

			var dirs = [{}, {}, {}, {}];
			dirs[0].field = game.getMapContent(pX, pY - 1);
			dirs[0].dir = up;
			dirs[0].distance = Math.sqrt(Math.pow((pX - tX), 2) + Math.pow((pY - 1 - tY), 2));

			dirs[1].field = game.getMapContent(pX, pY + 1);
			dirs[1].dir = down;
			dirs[1].distance = Math.sqrt(Math.pow((pX - tX), 2) + Math.pow((pY + 1 - tY), 2));

			dirs[2].field = game.getMapContent(pX + 1, pY);
			dirs[2].dir = right;
			dirs[2].distance = Math.sqrt(Math.pow((pX + 1 - tX), 2) + Math.pow((pY - tY), 2));

			dirs[3].field = game.getMapContent(pX - 1, pY);
			dirs[3].dir = left;
			dirs[3].distance = Math.sqrt(Math.pow((pX - 1 - tX), 2) + Math.pow((pY - tY), 2));

			// Sort possible directions by distance
			function compare(a, b) {
				if (a.distance < b.distance)
					return -1;
				if (a.distance > b.distance)
					return 1;
				return 0;
			}
			var dirs2 = dirs.sort(compare);

			var r = this.dir;
			var j;

			if (this.dead) {
				for (var i = dirs2.length - 1; i >= 0; i--) {
					if ((dirs2[i].field != "wall") && !(dirs2[i].dir.equals(this.getOppositeDirection()))) {
						r = dirs2[i].dir;
					}
				}
			}
			else {
				for (var i = dirs2.length - 1; i >= 0; i--) {
					if ((dirs2[i].field != "wall") && (dirs2[i].field != "door") && !(dirs2[i].dir.equals(this.getOppositeDirection()))) {
						r = dirs2[i].dir;
					}
				}
			}
			this.directionWatcher.set(r);
			return r;
		}
		this.setRandomDirection = function () {
			var dir = Math.floor((Math.random() * 10) + 1) % 5;

			switch (dir) {
				case 1:
					if (this.getOppositeDirection().equals(up)) this.setDirection(down);
					else this.setDirection(up);
					break;
				case 2:
					if (this.getOppositeDirection().equals(down)) this.setDirection(up);
					else this.setDirection(down);
					break;
				case 3:
					if (this.getOppositeDirection().equals(right)) this.setDirection(left);
					else this.setDirection(right);
					break;
				case 4:
					if (this.getOppositeDirection().equals(left)) this.setDirection(right);
					else this.setDirection(left);
					break;
			}
		}
		this.reverseDirection = function () {
			console.log("reverseDirection: " + this.direction.name + " to " + this.getOppositeDirection().name);
			this.directionWatcher.set(this.getOppositeDirection());
		}

	}

	Ghost.prototype = new Figure();

	// Super Class for Pacman & Ghosts
	function Figure() {
		this.posX;
		this.posY;
		this.speed;
		this.dirX = right.dirX;
		this.dirY = right.dirY;
		this.direction;
		this.stop = true;
		this.directionWatcher = new directionWatcher();
		this.getNextDirection = function () { console.log("Figure getNextDirection"); };
		this.checkDirectionChange = function () {
			if (this.inGrid() && (this.directionWatcher.get() == null)) this.getNextDirection();
			if ((this.directionWatcher.get() != null) && this.inGrid()) {
				//console.log("changeDirection to "+this.directionWatcher.get().name);
				this.setDirection(this.directionWatcher.get());
				this.directionWatcher.set(null);
			}

		}


		this.inGrid = function () {
			if ((this.posX % (2 * this.radius) === 0) && (this.posY % (2 * this.radius) === 0)) return true;
			return false;
		}
		this.getOppositeDirection = function () {
			if (this.direction.equals(up)) return down;
			else if (this.direction.equals(down)) return up;
			else if (this.direction.equals(right)) return left;
			else if (this.direction.equals(left)) return right;
		}
		this.move = function () {

			if (!this.stop) {
				this.posX += this.speed * this.dirX;
				this.posY += this.speed * this.dirY;

				// Check if out of canvas
				if (this.posX >= game.width - this.radius) this.posX = this.speed - this.radius;
				if (this.posX <= 0 - this.radius) this.posX = game.width - this.speed - this.radius;
				if (this.posY >= game.height - this.radius) this.posY = this.speed - this.radius;
				if (this.posY <= 0 - this.radius) this.posY = game.height - this.speed - this.radius;
			}
		}
		this.stop = function () { this.stop = true; }
		this.start = function () { this.stop = false; }

		this.getGridPosX = function () {
			return (this.posX - (this.posX % 30)) / 30;
		}
		this.getGridPosY = function () {
			return (this.posY - (this.posY % 30)) / 30;
		}
		this.setDirection = function (dir) {
			this.dirX = dir.dirX;
			this.dirY = dir.dirY;
			this.angle1 = dir.angle1;
			this.angle2 = dir.angle2;
			this.direction = dir;
		}
		this.setPosition = function (x, y) {
			this.posX = x;
			this.posY = y;
		}
	}

	function pacman() {
		this.radius = 15;
		this.posX = 0;
		this.posY = 6 * 2 * this.radius;
		this.speed = 5;
		this.angle1 = 0.25;
		this.angle2 = 1.75;
		this.mouth = 1; /* Switches between 1 and -1, depending on mouth closing / opening */
		this.dirX = right.dirX;
		this.dirY = right.dirY;
		this.lives = 3;
		this.stuckX = 0;
		this.stuckY = 0;
		this.frozen = false;		// used to play die Animation
		this.freeze = function () {
			this.frozen = true;
		}
		this.unfreeze = function () {
			this.frozen = false;
		}
		this.getCenterX = function () {
			return this.posX + this.radius;
		}
		this.getCenterY = function () {
			return this.posY + this.radius;
		}
		this.directionWatcher = new directionWatcher();

		this.direction = right;

		this.beastMode = false;
		this.beastModeTimer = 0;

		this.checkCollisions = function () {

			if ((this.stuckX == 0) && (this.stuckY == 0) && this.frozen == false) {

				// Get the Grid Position of Pac
				var gridX = this.getGridPosX();
				var gridY = this.getGridPosY();
				var gridAheadX = gridX;
				var gridAheadY = gridY;

				var field = game.getMapContent(gridX, gridY);

				// get the field 1 ahead to check wall collisions
				if ((this.dirX == 1) && (gridAheadX < 17)) gridAheadX += 1;
				if ((this.dirY == 1) && (gridAheadY < 12)) gridAheadY += 1;
				var fieldAhead = game.getMapContent(gridAheadX, gridAheadY);


				/*	Check Pill Collision			*/
				if ((field === "pill") || (field === "powerpill")) {
					//console.log("Pill found at ("+gridX+"/"+gridY+"). Pacman at ("+this.posX+"/"+this.posY+")");
					if (
						((this.dirX == 1) && (between(this.posX, game.toPixelPos(gridX) + this.radius - 5, game.toPixelPos(gridX + 1))))
						|| ((this.dirX == -1) && (between(this.posX, game.toPixelPos(gridX), game.toPixelPos(gridX) + 5)))
						|| ((this.dirY == 1) && (between(this.posY, game.toPixelPos(gridY) + this.radius - 5, game.toPixelPos(gridY + 1))))
						|| ((this.dirY == -1) && (between(this.posY, game.toPixelPos(gridY), game.toPixelPos(gridY) + 5)))
						|| (fieldAhead === "wall")
					) {
						var s;
						if (field === "powerpill") {
							Sound.play("powerpill");
							s = 50;
							this.enableBeastMode();
							game.startGhostFrightened();
						}
						else {
							Sound.play("waka");
							s = 10;
							game.pillCount--;
						}
						game.map.posY[gridY].posX[gridX].type = "null";
						game.addScore(s);
					}
				}

				/*	Check Wall Collision			*/
				if ((fieldAhead === "wall") || (fieldAhead === "door")) {
					this.stuckX = this.dirX;
					this.stuckY = this.dirY;
					pacman.stop();
					// get out of the wall
					if ((this.stuckX == 1) && ((this.posX % 2 * this.radius) != 0)) this.posX -= 5;
					if ((this.stuckY == 1) && ((this.posY % 2 * this.radius) != 0)) this.posY -= 5;
					if (this.stuckX == -1) this.posX += 5;
					if (this.stuckY == -1) this.posY += 5;
				}

			}
		}
		this.checkDirectionChange = function () {
			if (this.directionWatcher.get() != null) {
				//console.log("next Direction: "+directionWatcher.get().name);

				if ((this.stuckX == 1) && this.directionWatcher.get() == right) this.directionWatcher.set(null);
				else {
					// reset stuck events
					this.stuckX = 0;
					this.stuckY = 0;


					// only allow direction changes inside the grid
					if ((this.inGrid())) {
						//console.log("changeDirection to "+directionWatcher.get().name);

						// check if possible to change direction without getting stuck
						var x = this.getGridPosX() + this.directionWatcher.get().dirX;
						var y = this.getGridPosY() + this.directionWatcher.get().dirY;
						var nextTile = game.getMapContent(x, y);

						if (nextTile != "wall" && nextTile != "door") {
							this.setDirection(this.directionWatcher.get());
							this.directionWatcher.set(null);
						}
					}
				}
			}
		}
		this.setDirection = function (dir) {
			if (!this.frozen) {
				this.dirX = dir.dirX;
				this.dirY = dir.dirY;
				this.angle1 = dir.angle1;
				this.angle2 = dir.angle2;
				this.direction = dir;
			}
		}
		this.enableBeastMode = function () {
			this.beastMode = true;
			this.beastModeTimer = 240;
			//console.log("Beast Mode activated!");
			inky.dazzle();
			pinky.dazzle();
			blinky.dazzle();
			clyde.dazzle();
		};
		this.disableBeastMode = function () {
			this.beastMode = false;
			//console.log("Beast Mode is over!");
			inky.undazzle();
			pinky.undazzle();
			blinky.undazzle();
			clyde.undazzle();
		};
		this.move = function () {

			if (!this.frozen) {
				if (this.beastModeTimer > 0) {
					this.beastModeTimer--;
					//console.log("Beast Mode: "+this.beastModeTimer);
				}
				if ((this.beastModeTimer == 0) && (this.beastMode == true)) this.disableBeastMode();

				this.posX += this.speed * this.dirX;
				this.posY += this.speed * this.dirY;

				// Check if out of canvas
				if (this.posX >= game.width - this.radius) this.posX = 5 - this.radius;
				if (this.posX <= 0 - this.radius) this.posX = game.width - 5 - this.radius;
				if (this.posY >= game.height - this.radius) this.posY = 5 - this.radius;
				if (this.posY <= 0 - this.radius) this.posY = game.height - 5 - this.radius;
			}
			else this.dieAnimation();
		}

		this.eat = function () {

			if (!this.frozen) {
				if (this.dirX == this.dirY == 0) {

					this.angle1 -= this.mouth * 0.07;
					this.angle2 += this.mouth * 0.07;

					var limitMax1 = this.direction.angle1;
					var limitMax2 = this.direction.angle2;
					var limitMin1 = this.direction.angle1 - 0.21;
					var limitMin2 = this.direction.angle2 + 0.21;

					if (this.angle1 < limitMin1 || this.angle2 > limitMin2) {
						this.mouth = -1;
					}
					if (this.angle1 >= limitMax1 || this.angle2 <= limitMax2) {
						this.mouth = 1;
					}
				}
			}
		}
		this.stop = function () {
			this.dirX = 0;
			this.dirY = 0;
		}
		this.reset = function () {
			this.unfreeze();
			this.posX = 0;
			this.posY = 6 * 2 * this.radius;
			this.setDirection(right);
			this.stop();
			this.stuckX = 0;
			this.stuckY = 0;
			//console.log("reset pacman");
		}
		this.dieAnimation = function () {
			this.angle1 += 0.05;
			this.angle2 -= 0.05;
			if (this.angle1 >= this.direction.angle1 + 0.7 || this.angle2 <= this.direction.angle2 - 0.7) {
				this.dieFinal();
			}
		}
		this.die = function () {
			if (this.frozen) return;	// already dying
			Sound.play("die");
			this.freeze();
			this.dieAnimation();
		}
		this.dieFinal = function () {
			this.reset();
			this.beastMode = false;
			this.beastModeTimer = 0;
			game.ghostFrightened = false;
			pinky.reset();
			inky.reset();
			blinky.reset();
			clyde.reset();
			this.lives--;
			if (this.lives <= 0) {
				var score = game.score.score;
				var html = "スコア: <b>" + score + "</b><br/>到達レベル: " + game.level;
				if (Highscore.qualifies(score)) {
					var last = escapeHtml(store.get("pacman_last_name", ""));
					html += "<div id='highscore-form'><p class='newrecord'>ランキング入り！名前を入れてね</p><span id='form-validater'></span>"
						+ "<input type='text' id='playerName' maxlength='10' placeholder='なまえ' value='" + last + "' autocomplete='off'/>"
						+ "<span class='button' id='score-submit'>登録</span></div>";
				}
				html += "<div><span class='button' id='retry'>もう一度遊ぶ</span></div>";
				game.showMessage("GAME OVER", html);
				game.gameOver = true;
				setTimeout(function () { $('#playerName').focus(); }, 250);
			} else {
				game.readyTimer = 45;
			}
			game.drawHearts(this.lives);
		}
		this.getGridPosX = function () {
			return (this.posX - (this.posX % 30)) / 30;
		}
		this.getGridPosY = function () {
			return (this.posY - (this.posY % 30)) / 30;
		}
	}
	pacman.prototype = new Figure();
	var pacman = new pacman();
	game.buildWalls();


	// Action starts here:

	$(document).ready(function () {

		$.ajaxSetup({ mimeType: "application/json" });

		$.ajaxSetup({
			beforeSend: function (xhr) {
				if (xhr.overrideMimeType) {
					xhr.overrideMimeType("application/json");
				}
			}
		});

		/* -------------------- EVENT LISTENERS -------------------------- */

		// Keyboard
		window.addEventListener('keydown', doKeyDown, true);

		$('#canvas-container').on('click', function (e) {
			if ($(e.target).closest('#highscore-form, .button, input').length) return;
			if (!(game.gameOver == true)) game.pauseResume();
		});

		// pause automatically when the tab / app goes to background
		document.addEventListener('visibilitychange', function () {
			if (document.hidden && game.running && !game.pause && !game.gameOver) {
				game.showMessage("ポーズ", "クリック・タップで再開");
			}
		});

		$('body').on('click', '#score-submit', function () {
			if ($.trim($('#playerName').val()) === "") {
				$('#form-validater').html("名前を入れてください<br/>");
			} else {
				$('#form-validater').html("");
				addHighscore();
			}
		});
		$('body').on('keydown', '#playerName', function (e) {
			if (e.key === 'Enter') { e.preventDefault(); $('#score-submit').click(); }
		});

		$('body').on('click', '#show-highscore', function () {
			game.showContent('highscore-content');
			getHighscore(0);
		});
		$('body').on('click', '#retry', function () {
			game.startNewGame();
		});

		// confirm dialog for "new game"
		$('#confirm-yes').on('click', function () { game.startNewGame(); });
		$('#confirm-no').on('click', function () { $('#confirm-modal').fadeOut(150); });

		// Hammerjs touch swipe
		["right", "left", "up", "down"].forEach(function (name) {
			var dirs = { right: right, left: left, up: up, down: down };
			Hammer('.container').on("swipe" + name, function (event) {
				if ($('#game-content').is(":visible")) {
					event.gesture.preventDefault();
					pacman.directionWatcher.set(dirs[name]);
				}
			});
		});

		// On-screen D-pad
		var padDirs = { up: up, down: down, left: left, right: right };
		$(document).on('touchstart mousedown', '.controlButton', function (event) {
			event.preventDefault();
			var d = padDirs[this.id];
			if (d) pacman.directionWatcher.set(d);
			$(this).addClass('pressed');
		});
		$(document).on('touchend touchcancel mouseup mouseleave', '.controlButton', function () {
			$(this).removeClass('pressed');
		});

		// Menu
		$(document).on('click', '.button#newGame', function () { game.newGame(); });
		$(document).on('click', '.button#highscore', function () {
			game.showContent('highscore-content');
			getHighscore();
		});
		$(document).on('click', '.button#instructions', function () { game.showContent('instructions-content'); });
		$(document).on('click', '.button#info', function () { game.showContent('info-content'); });
		$(document).on('click', '.button.back', function () { game.showContent('game-content'); });
		$(document).on('click', '#clear-highscore', function () {
			if (confirm('ランキングの記録をすべて消しますか？')) {
				Highscore.clear();
				getHighscore();
				game.refreshHiScore();
			}
		});
		$(document).on('click', '#sound-toggle', function (e) {
			e.stopPropagation();
			game.toggleSound();
		});

		canvas = $("#myCanvas").get(0);
		canvas.width = GAME_W * DPR;
		canvas.height = GAME_H * DPR;
		context = canvas.getContext("2d");

		game.soundfx = store.get("pacman_sound", 0) === 1 ? 1 : 0;
		game.refreshSoundButton();

		logger.disableLogger();

		game.init(0).then(function () {
			renderContent();
		});
	});

	function clearCanvas() {
		context.setTransform(DPR, 0, 0, DPR, 0, 0);
		context.clearRect(0, 0, GAME_W, GAME_H);
	}

	function renderContent() {
		clearCanvas();
		game.frame++;

		// Refresh Score
		game.score.refresh(".score");

		// Pills
		context.beginPath();
		context.fillStyle = "#ffe0bd";

		var dotPosY;
		if (game.map && game.map.posY && game.map.posY.length > 0) {
			$.each(game.map.posY, (i, row) => {
				dotPosY = row.row;
				$.each(row.posX, (j, column) => {
					if (column.type == "pill") {
						var px = game.toPixelPos(column.col - 1) + pacman.radius;
						var py = game.toPixelPos(dotPosY - 1) + pacman.radius;
						context.moveTo(px + game.pillSize, py);
						context.arc(px, py, game.pillSize, 0, 2 * Math.PI);
					}
				});
			});
			context.fill();

			// power pills (pulsing + glow)
			var pps = game.nextPowerPillSize();
			context.save();
			context.shadowColor = "rgba(255,230,190,0.9)";
			context.shadowBlur = 12;
			context.fillStyle = "#fff3e0";
			$.each(game.map.posY, (i, row) => {
				$.each(row.posX, (j, column) => {
					if (column.type == "powerpill") {
						context.beginPath();
						context.arc(game.toPixelPos(column.col - 1) + pacman.radius, game.toPixelPos(row.row - 1) + pacman.radius, pps, 0, 2 * Math.PI);
						context.fill();
					}
				});
			});
			context.restore();
		}

		// Walls (pre-rendered at device resolution)
		context.save();
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.drawImage(canvas_walls, 0, 0);
		context.restore();


		if (game.running == true) {
			// Ghosts
			pinky.draw(context);
			blinky.draw(context);
			inky.draw(context);
			clyde.draw(context);


			// Pac Man
			context.save();
			context.beginPath();
			context.shadowColor = "rgba(255,230,0,0.7)";
			context.shadowBlur = pacman.beastMode ? 16 : 6;
			context.fillStyle = "#ffe600";
			context.arc(pacman.posX + pacman.radius, pacman.posY + pacman.radius, pacman.radius - 1, pacman.angle1 * Math.PI, pacman.angle2 * Math.PI);
			context.lineTo(pacman.posX + pacman.radius, pacman.posY + pacman.radius);
			context.closePath();
			context.fill();
			context.restore();

			// floating score popups
			context.save();
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = "10px 'Press Start 2P', monospace";
			game.popups = game.popups.filter(function (p) {
				context.globalAlpha = Math.min(1, p.ttl / 15);
				context.fillStyle = p.color;
				context.fillText(p.text, p.x, p.y - (40 - p.ttl) * 0.5);
				if (!game.pause) p.ttl--;
				return p.ttl > 0;
			});
			context.restore();

			// READY!
			if (game.readyTimer > 0 && !game.gameOver) {
				context.save();
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.font = "14px 'Press Start 2P', monospace";
				context.fillStyle = "#ffe600";
				context.shadowColor = "#000";
				context.shadowBlur = 6;
				context.fillText("READY!", GAME_W / 2, 3.5 * 30 + 15);
				context.restore();
			}
		}

	}

	function animationLoop() {
		renderContent();

		if (game.pause != true) {
			if (game.readyTimer > 0) {
				game.readyTimer--;
			} else {
				// Make changes before next loop
				pacman.move();
				pacman.eat();
				pacman.checkDirectionChange();
				pacman.checkCollisions();		// has to be the LAST method called on pacman

				blinky.move();
				inky.move();
				pinky.move();
				clyde.move();

				game.checkGhostMode();
			}
		}

		// All dots collected?
		game.check();

		setTimeout(animationLoop, game.refreshRate);
	}



	function doKeyDown(evt) {
		// typing a name: don't steer pacman
		if (evt.target && /^(INPUT|TEXTAREA)$/.test(evt.target.tagName)) return;
		// confirm dialog open
		if ($('#confirm-modal').is(':visible')) {
			if (evt.keyCode === 27) $('#confirm-modal').fadeOut(150);
			return;
		}
		var inGame = $('#game-content').is(':visible');

		switch (evt.keyCode) {
			case 38:	// UP Arrow Key pressed
			case 87:	// W pressed
				if (inGame) { evt.preventDefault(); pacman.directionWatcher.set(up); }
				break;
			case 40:	// DOWN Arrow Key pressed
			case 83:	// S pressed
				if (inGame) { evt.preventDefault(); pacman.directionWatcher.set(down); }
				break;
			case 37:	// LEFT Arrow Key pressed
			case 65:	// A pressed
				if (inGame) { evt.preventDefault(); pacman.directionWatcher.set(left); }
				break;
			case 39:	// RIGHT Arrow Key pressed
			case 68:	// D pressed
				if (inGame) { evt.preventDefault(); pacman.directionWatcher.set(right); }
				break;
			case 78:	// N pressed
				game.newGame();
				break;
			case 77:	// M pressed
				game.toggleSound();
				break;
			case 27:	// ESC pressed -> back to game / pause
				evt.preventDefault();
				if (!inGame) game.showContent('game-content');
				else if (game.running && !game.pause && !game.gameOver) game.pauseResume();
				break;
			case 32:	// SPACE pressed -> pause Game
			case 80:	// P pressed
			case 13:	// ENTER
				if (inGame) {
					evt.preventDefault();
					if (!(game.gameOver == true)) game.pauseResume();
				}
				break;
		}
	}
}

geronimo();
