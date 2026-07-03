const PATTERN_PRESETS = {
  single: `1\n1\n1\n1\n1\n1`,
  long: `L3\nL3\nL2\nL4`,
  double: `D\nD\nD\nD`
};

const GRADE_COLORS = {
  "E": "#2318cf",
  "D": "#0073ff",
  "D+": "#48cbfb",
  "C": "#9aeab7",
  "C+": "#cfe9bd",
  "B": "#fff094",
  "B+": "#ffd83b",
  "A": "#ffcb91",
  "A+": "#ff92b4",
  "AA": "#b39ee6",
  "AA+": "#bd6ae6",
  "AAA": "#a200e6",
  "AAA+": "#4d4d73",
  "S": "#252554",
  "SS": "#161c47",
  "SSS": "#0f266c",
  "P": "#0c154a",
  "M": "#2d2d2d",
  "GM": "#1a1a1a",
  "PM": "#000000"
};

const COMBO_SPEED_DECAY = 43; // hits remaining at which speed ~approaches 0 (200+)
let gameActive = false;
let gameStarted = false; // true when the first tile is clicked
let currentSpeed = 0;
let timeElapsed = 0;
let highScore = parseFloat(localStorage.getItem('rainingtiles_highscore') || '0');
let keybinds = JSON.parse(localStorage.getItem('rainingtiles_keybinds') || '["KeyD","KeyF","KeyJ","KeyK"]');

let tiles = [];
let nextTileId = 0;
let lastTime = 0;

let parsedPattern = [];
let currentPatternIndex = 0;
let activeKeys = { 0: false, 1: false, 2: false, 3: false };
let lastSpawnY = 50;
let lastSpawnedCols = [];
let frozenSpeed = null;

// DOM Elements
const boardEl = document.getElementById('game-board');
const tilesContainer = document.getElementById('tiles-container');
const hitEffectsEl = document.getElementById('hit-effects');
const tpsDisplay = document.getElementById('tps-display');
const starsDisplay = document.getElementById('stars-display');
const bestDisplay = document.getElementById('best-display');
const keyHintEls = document.querySelectorAll('.key-hint');
const colElements = document.querySelectorAll('.col-element');

// Screen elements
const startScreen = document.getElementById('start-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameoverScreen = document.getElementById('gameover-screen');

// Settings Elements
const inputStartSpeed = document.getElementById('settings-start-speed');
const inputAccel = document.getElementById('settings-accel');
const selectPatternPreset = document.getElementById('settings-pattern-preset');
const textareaCustomPattern = document.getElementById('settings-custom-pattern');

// Initialize settings from localStorage or defaults
function loadSettings() {
  const startSpeedVal = localStorage.getItem('rainingtiles_start_speed') || '3.3';
  const accelVal = localStorage.getItem('rainingtiles_accel_rate') || '0.07';
  const presetVal = localStorage.getItem('rainingtiles_pattern_preset') || 'single';
  const customPatternVal = localStorage.getItem('rainingtiles_custom_pattern') || PATTERN_PRESETS.single;
  
  inputStartSpeed.value = startSpeedVal;
  inputAccel.value = accelVal;
  selectPatternPreset.value = presetVal;
  textareaCustomPattern.value = customPatternVal;
}

function saveSettingsToStorage() {
  localStorage.setItem('rainingtiles_start_speed', inputStartSpeed.value);
  localStorage.setItem('rainingtiles_accel_rate', inputAccel.value);
  localStorage.setItem('rainingtiles_pattern_preset', selectPatternPreset.value);
  localStorage.setItem('rainingtiles_custom_pattern', textareaCustomPattern.value);
}

function getStartSpeed() {
  const val = parseFloat(inputStartSpeed.value);
  return isNaN(val) ? 3.3 : val;
}

// Initial load updates
loadSettings();
updateKeybindHints();
updateBestScoreDisplay();

// Keybind setter logic
let bindingColIdx = null;
const bindButtons = document.querySelectorAll('.keybind-setter');
bindButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const colIdx = parseInt(e.target.dataset.colIdx);
    bindingColIdx = colIdx;
    e.target.textContent = 'Press Key...';
    e.target.classList.add('bg-amber-600', 'animate-pulse');
  });
});

window.addEventListener('keydown', (e) => {
  if (bindingColIdx !== null) {
    keybinds[bindingColIdx] = e.code;
    localStorage.setItem('rainingtiles_keybinds', JSON.stringify(keybinds));
    
    const btn = document.querySelector(`.keybind-setter[data-col-idx="${bindingColIdx}"]`);
    btn.textContent = e.code.replace('Key', '');
    btn.classList.remove('bg-amber-600', 'animate-pulse');
    
    bindingColIdx = null;
    updateKeybindHints();
    e.preventDefault();
    return;
  }

  // Check gameplay inputs
  if (gameActive) {
    const colIdx = keybinds.indexOf(e.code);
    if (colIdx !== -1 && !activeKeys[colIdx]) {
      activeKeys[colIdx] = true;
      flashColumn(colIdx);
      handleColumnInputDown(colIdx, { source: 'keyboard' });
      e.preventDefault();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (gameActive) {
    const colIdx = keybinds.indexOf(e.code);
    if (colIdx !== -1) {
      activeKeys[colIdx] = false;
      handleColumnInputUp(colIdx);
      e.preventDefault();
    }
  }
});

// Touch and Click Input Handling on board columns
colElements.forEach(col => {
  const colIdx = parseInt(col.dataset.col);
  
  col.addEventListener('pointerdown', (e) => {
    if (!gameActive) return;
    try {
      col.setPointerCapture(e.pointerId);
    } catch(err) {}
    activeKeys[colIdx] = true;
    flashColumn(colIdx);
    handleColumnInputDown(colIdx, { source: 'pointer', x: e.clientX, y: e.clientY });
    e.preventDefault();
  });
  
  col.addEventListener('pointerup', (e) => {
    if (!gameActive) return;
    try {
      col.releasePointerCapture(e.pointerId);
    } catch(err) {}
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleColumnInputUp(colIdx);
    }
    e.preventDefault();
  });
  
  col.addEventListener('pointercancel', (e) => {
    if (!gameActive) return;
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleColumnInputUp(colIdx);
    }
    e.preventDefault();
  });
});

// Window level fallback to release key/pointer hold state reliably
window.addEventListener('pointerup', (e) => {
  if (!gameActive) return;
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleColumnInputUp(colIdx);
    }
  }
});

window.addEventListener('pointercancel', (e) => {
  if (!gameActive) return;
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleColumnInputUp(colIdx);
    }
  }
});

// Button event listeners
document.getElementById('settings-btn').addEventListener('click', () => {
  // Set button texts to match current keybinds
  bindButtons.forEach(btn => {
    const idx = parseInt(btn.dataset.colIdx);
    btn.textContent = keybinds[idx].replace('Key', '');
  });
  settingsScreen.classList.remove('hidden');
});

document.getElementById('save-settings-btn').addEventListener('click', () => {
  saveSettingsToStorage();
  settingsScreen.classList.add('hidden');
});

selectPatternPreset.addEventListener('change', (e) => {
  const val = e.target.value;
  if (PATTERN_PRESETS[val]) {
    textareaCustomPattern.value = PATTERN_PRESETS[val];
  }
});

textareaCustomPattern.addEventListener('input', () => {
  selectPatternPreset.value = 'custom';
});

document.getElementById('play-btn').addEventListener('click', () => {
  startGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  startGame();
});

document.getElementById('home-btn').addEventListener('click', () => {
  gameoverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

// Score & Star-Crown formulas
function getStarsAndCrowns(tps) {
  if (tps >= 11.5) return "👑👑👑";
  if (tps >= 9.0) return "👑👑";
  if (tps >= 8.0) return "👑";
  if (tps >= 7.0) return "⭐⭐⭐";
  if (tps >= 6.2) return "⭐⭐";
  if (tps >= 5.0) return "⭐";
  return "";
}

function getGrade(tps) {
  if (tps < 3) return "E";
  if (tps < 3.5) return "D";
  if (tps < 4) return "D+";
  if (tps < 4.5) return "C";
  if (tps < 5) return "C+";
  if (tps < 5.5) return "B";
  if (tps < 6) return "B+";
  if (tps < 6.5) return "A";
  if (tps < 7) return "A+";
  if (tps < 7.5) return "AA";
  if (tps < 8) return "AA+";
  if (tps < 8.5) return "AAA";
  if (tps < 9) return "AAA+";
  if (tps < 10) return "S";
  if (tps < 11) return "SS";
  if (tps < 12) return "SSS";
  if (tps < 13) return "P";
  if (tps < 14) return "M";
  if (tps < 15) return "GM";
  return "PM";
}

function getGradeClass(grade) {
  return 'grade-' + grade.replace('+', '-plus');
}

function updateHUD(tps) {
  tpsDisplay.textContent = tps.toFixed(3);
  const grade = getGrade(tps);
  tpsDisplay.style.color = GRADE_COLORS[grade] || "#ff6b6b";
  starsDisplay.textContent = getStarsAndCrowns(tps);
}

// Core Game Mechanics
function updateBestScoreDisplay() {
  bestDisplay.textContent = highScore.toFixed(3) + ' t/s';
}

function updateKeybindHints() {
  keyHintEls.forEach((hint, idx) => {
    const key = keybinds[idx] || '';
    hint.textContent = key.replace('Key', '');
  });
}

function flashColumn(colIdx) {
  const colEl = colElements[colIdx];
  colEl.classList.add('bg-white/10');
  setTimeout(() => {
    colEl.classList.remove('bg-white/10');
  }, 80);
}

function parsePattern(patternStr) {
  const lines = patternStr.trim().split('\n');
  const parsed = [];
  
  for (let line of lines) {
    line = line.trim().toUpperCase();
    if (!line) continue;
    
    if (line === '1') {
      parsed.push({ type: 'single' });
    } else if (line === 'D') {
      parsed.push({ type: 'double' });
    } else if (line.startsWith('L')) {
      const len = parseInt(line.substring(1)) || 2;
      parsed.push({ type: 'long', length: len });
    } else if (line.startsWith('C')) {
      const taps = parseInt(line.substring(1)) || 3;
      parsed.push({ type: 'combo', taps: taps });
    }
  }
  
  if (parsed.length === 0) {
    parsed.push({ type: 'single' });
  }
  
  return parsed;
}

function spawnPatternRow(yPos, options = {}) {
  const forceSingle = options.forceSingle === true;
  const preventCombo = options.preventCombo === true;
  let notePattern = forceSingle
    ? { type: 'single' }
    : parsedPattern[currentPatternIndex];
  
  if (preventCombo && notePattern && notePattern.type === 'combo') {
    notePattern = { type: 'single' };
  }
  let activeNotes = [];
  
  if (notePattern.type === 'single') {
    activeNotes = [{ type: 'single' }];
  } else if (notePattern.type === 'double') {
    activeNotes = [{ type: 'single' }, { type: 'single' }];
  } else if (notePattern.type === 'long') {
    activeNotes = [{ type: 'long', length: notePattern.length }];
  } else if (notePattern.type === 'combo') {
    activeNotes = [{ type: 'combo', taps: notePattern.taps }];
  }

  let maxLength = 1;
  activeNotes.forEach(note => {
    if (note.type === 'long' && note.length > maxLength) {
      maxLength = note.length;
    } else if (note.type === 'combo' && 2 > maxLength) {
      maxLength = 2;
    }
  });

  // Determine columns for active notes randomly with constraints
  let chosenCols = [];
  const isComboRow = activeNotes.length === 1 && activeNotes[0].type === 'combo';
  if (isComboRow) {
    // Combo notes always span columns 2 and 3 (1-indexed), i.e. indices 1 and 2
    chosenCols = [1, 2];
  } else if (activeNotes.length === 1) {
    // Single note: pick any col not used in previous row
    const available = [0, 1, 2, 3].filter(col => !lastSpawnedCols.includes(col));
    const colsToPick = available.length > 0 ? available : [0, 1, 2, 3];
    const pickedCol = colsToPick[Math.floor(Math.random() * colsToPick.length)];
    chosenCols.push(pickedCol);
  } else if (activeNotes.length >= 2) {
    // Double note: must be either {0, 2} or {1, 3} (1-indexed 1/3 or 2/4)
    // and neither column can be in lastSpawnedCols
    const optAValid = !lastSpawnedCols.includes(0) && !lastSpawnedCols.includes(2);
    const optBValid = !lastSpawnedCols.includes(1) && !lastSpawnedCols.includes(3);
    
    let chosenSet;
    if (optAValid && optBValid) {
      chosenSet = Math.random() < 0.5 ? [0, 2] : [1, 3];
    } else if (optAValid) {
      chosenSet = [0, 2];
    } else if (optBValid) {
      chosenSet = [1, 3];
    } else {
      chosenSet = Math.random() < 0.5 ? [0, 2] : [1, 3];
    }
    
    // Randomize col mapping
    if (Math.random() < 0.5) {
      chosenCols = [chosenSet[0], chosenSet[1]];
    } else {
      chosenCols = [chosenSet[1], chosenSet[0]];
    }
  }

  // Update tracking variable
  lastSpawnedCols = chosenCols;

  activeNotes.forEach((note, idx) => {
    const colIdx = chosenCols[idx];
    if (colIdx === undefined) return;

    const isCombo = note.type === 'combo';
    const tileLength = note.type === 'long' ? note.length : (note.type === 'combo' ? 2 : 1);
    const tile = {
      id: nextTileId++,
      col: isCombo ? 1 : colIdx,
      y: yPos - (tileLength - 1) * 25,
      type: note.type,
      clicked: false,
      isStart: false
    };

    if (note.type === 'long') {
      tile.length = note.length;
      tile.held = false;
      tile.holdProgress = 0;
      tile.holdCompleted = false;
      tile.tapped = false;
      tile.pressY = undefined;
    } else if (isCombo) {
      tile.taps = note.taps;
      tile.remainingTaps = note.taps;
      tile.spanCols = [1, 2];
    }

    tiles.push(tile);
    if (isCombo) return;
  });

  if (!forceSingle) {
    currentPatternIndex = (currentPatternIndex + 1) % parsedPattern.length;
  }
  return maxLength;
}

function startGame() {
  // Hide overlays
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');

  // Reset state
  gameActive = true;
  gameStarted = false;
  timeElapsed = 0;
  
  const startSpeed = getStartSpeed();
  currentSpeed = startSpeed;
  
  updateHUD(currentSpeed);

  tilesContainer.style.transition = 'none';
  tilesContainer.style.transform = 'none';
  tilesContainer.innerHTML = '';
  hitEffectsEl.innerHTML = '';
  tiles = [];
  nextTileId = 0;
  activeKeys = { 0: false, 1: false, 2: false, 3: false };

  // Parse pattern
  parsedPattern = parsePattern(textareaCustomPattern.value);
  currentPatternIndex = 0;

  // Spawn initial tiles
  lastSpawnY = 50;
  lastSpawnedCols = [];
  frozenSpeed = null;
  for (let i = 0; i < 4; i++) {
    const isStartRow = i === 0;
    const maxLength = spawnPatternRow(lastSpawnY, { forceSingle: isStartRow });
    if (isStartRow) {
      const startTile = tiles.find(t => t.y === lastSpawnY && t.type === 'single');
      if (startTile) {
        startTile.isStart = true;
      }
    }
    lastSpawnY -= maxLength * 25;
  }

  renderTiles();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function getTileBottom(tile) {
  return tile.y + (tile.type === 'long' ? tile.length * 25 : (tile.type === 'combo' ? 50 : 25));
}

function tileMatchesColumn(tile, colIdx) {
  if (tile.spanCols) {
    return tile.spanCols.includes(colIdx);
  }
  return tile.col === colIdx;
}

function getActiveComboTile() {
  const lowest = getLowestUnclickedTile();
  if (lowest && lowest.type === 'combo' && !lowest.clicked) {
    return lowest;
  }
  return null;
}

function getComboInSlowdownPhase() {
  const combo = getActiveComboTile();
  if (combo && combo.remainingTaps < combo.taps) {
    return combo;
  }
  return null;
}

function getComboEffectiveSpeed(frozenBaseSpeed, remainingTaps) {
  // Speed increases via a 1/x curve as remainingTaps decreases, reaching exactly 20% of frozenBaseSpeed at 1 hit left.
  return frozenBaseSpeed * (0.2 / Math.max(1, remainingTaps));
}

function getLowestUnclickedTile() {
  let lowest = null;
  let maxBottom = -9999;
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].clicked && !tiles[i].holdCompleted) {
      const tileBottom = getTileBottom(tiles[i]);
      if (tileBottom > maxBottom) {
        maxBottom = tileBottom;
        lowest = tiles[i];
      }
    }
  }
  return lowest;
}

function getKeyboardHitPosition(colIdx, tile) {
  const boardRect = boardEl.getBoundingClientRect();
  const colWidth = boardRect.width / 4;
  const jitterX = (Math.random() - 0.5) * colWidth * 0.35;
  const x = boardRect.left + colIdx * colWidth + colWidth / 2 + jitterX;

  const tileEl = tile ? document.querySelector(`[data-tile-id="${tile.id}"]`) : null;
  if (tileEl) {
    const tileRect = tileEl.getBoundingClientRect();
    const jitterY = (Math.random() - 0.5) * tileRect.height * 0.45;
    return { x, y: tileRect.top + tileRect.height / 2 + jitterY };
  }

  const jitterY = (Math.random() - 0.5) * boardRect.height * 0.04;
  return { x, y: boardRect.top + boardRect.height * 0.85 + jitterY };
}

function spawnHitRipple(x, y) {
  const containerRect = hitEffectsEl.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'hit-ripple';
  ripple.style.left = (x - containerRect.left) + 'px';
  ripple.style.top = (y - containerRect.top) + 'px';
  hitEffectsEl.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function playHitAnimation(colIdx, hitContext, tile) {
  let x;
  let y;
  if (hitContext && hitContext.source === 'pointer') {
    x = hitContext.x;
    y = hitContext.y;
  } else {
    ({ x, y } = getKeyboardHitPosition(colIdx, tile));
  }
  spawnHitRipple(x, y);

  if (tile && tile.type === 'combo') {
    const el = document.querySelector(`[data-tile-id="${tile.id}"]`);
    if (el) {
      el.classList.remove('combo-hit-pulse');
      void el.offsetWidth;
      el.classList.add('combo-hit-pulse');
    }
  }
}

function pulseComboBadge(tileId, remainingTaps) {
  const badge = document.querySelector(`[data-tile-id="${tileId}"] .combo-badge`);
  if (badge) {
    badge.textContent = remainingTaps;
    badge.classList.remove('combo-badge-pop');
    void badge.offsetWidth;
    badge.classList.add('combo-badge-pop');
  }
}

function handleColumnInputDown(colIdx, hitContext) {
  if (!gameActive) return;

  const lowest = getLowestUnclickedTile();
  if (!lowest) return;

  const lowestBottom = getTileBottom(lowest);
  const lowestActiveTiles = tiles.filter(t => 
    !t.clicked && 
    !t.holdCompleted && 
    Math.abs(getTileBottom(t) - lowestBottom) < 1
  );
  
  const matchingTile = lowestActiveTiles.find(t => tileMatchesColumn(t, colIdx));
  
  if (matchingTile) {
    if (!gameStarted) {
      gameStarted = true;
    }

    playHitAnimation(colIdx, hitContext, matchingTile);
    
    if (matchingTile.type === 'single') {
      matchingTile.clicked = true;
      playClickVisual(matchingTile.id);
    } else if (matchingTile.type === 'combo') {
      const wasUntouched = matchingTile.remainingTaps === matchingTile.taps;
      matchingTile.remainingTaps--;
      if (wasUntouched && matchingTile.remainingTaps > 0) {
        const startSpeed = getStartSpeed();
        const accel = parseFloat(inputAccel.value) || 0.07;
        frozenSpeed = startSpeed + accel * timeElapsed;
      }
      if (matchingTile.remainingTaps <= 0) {
        matchingTile.clicked = true;
        playClickVisual(matchingTile.id);
      } else {
        pulseComboBadge(matchingTile.id, matchingTile.remainingTaps);
      }
    } else if (matchingTile.type === 'long') {
      matchingTile.held = true;
      matchingTile.tapped = true;
      
      // Calculate where the press occurred
      if (hitContext && hitContext.source === 'pointer' && hitContext.y !== undefined) {
        const boardRect = boardEl.getBoundingClientRect();
        const pressPercentY = ((hitContext.y - boardRect.top) / boardRect.height) * 100;
        matchingTile.pressY = Math.max(10, Math.min(95, pressPercentY));
      } else {
        // Keyboard or default hit position at bottom of the long tile (cue ring area)
        // cue ring is at tileBottom - 12.5
        const tileBottom = matchingTile.y + matchingTile.length * 25;
        matchingTile.pressY = Math.max(10, Math.min(95, tileBottom - 12.5));
      }

      const el = document.querySelector(`[data-tile-id="${matchingTile.id}"]`);
      if (el) {
        el.classList.add('tile-holding');
      }
    }
  } else {
    gameOver(lowest.id);
  }
}

function handleColumnInputUp(colIdx) {
  if (!gameActive) return;
  
  const activeLongTile = tiles.find(t => t.col === colIdx && t.type === 'long' && t.held && !t.holdCompleted);
  if (activeLongTile) {
    activeLongTile.held = false;
    const el = document.querySelector(`[data-tile-id="${activeLongTile.id}"]`);
    if (el) {
      el.classList.remove('tile-holding');
    }
  }
}

function playClickVisual(tileId) {
  const el = document.querySelector(`[data-tile-id="${tileId}"]`);
  if (el) {
    el.classList.remove('bg-black');
    el.classList.add('tile-clicked');
    el.classList.remove('tile-holding');
    // Remove cue ring
    const ring = el.querySelector('.red-ring-cue');
    if (ring) ring.remove();
    const combo = el.querySelector('.combo-badge');
    if (combo) combo.remove();
  }
}

function gameLoop(time) {
  if (!gameActive) return;

  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (gameStarted) {
    const startSpeed = getStartSpeed();
    const accel = parseFloat(inputAccel.value) || 0.07;
    const comboInSlowdown = getComboInSlowdownPhase();
    let effectiveSpeed;

    if (comboInSlowdown && frozenSpeed !== null) {
      currentSpeed = frozenSpeed;
      effectiveSpeed = getComboEffectiveSpeed(frozenSpeed, comboInSlowdown.remainingTaps);
    } else {
      frozenSpeed = null;
      timeElapsed += dt;
      currentSpeed = startSpeed + accel * timeElapsed;
      effectiveSpeed = currentSpeed;
    }

    updateHUD(currentSpeed);

    const movement = effectiveSpeed * 25 * dt;
    
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].y += movement;
      
      // Update hold progress if held
      if (tiles[i].type === 'long' && tiles[i].held) {
        const targetY = (tiles[i].pressY !== undefined) ? (tiles[i].pressY - 12) : 83;
        if (tiles[i].y >= targetY) {
          tiles[i].holdCompleted = true;
          tiles[i].held = false;
          tiles[i].clicked = true;
          playClickVisual(tiles[i].id);
        }
      }
    }

    // Check if any unclicked tile is completely out of bounds (top y > 100)
    for (let i = 0; i < tiles.length; i++) {
      if (!tiles[i].clicked && !tiles[i].held && !tiles[i].tapped && tiles[i].y > 100) {
        gameOver(tiles[i].id);
        return;
      }
    }

    // Clean up passed tiles (only when the top of the tile goes off-screen so long tiles don't disappear early)
    tiles = tiles.filter(t => {
      return !((t.clicked || t.tapped) && t.y > 100);
    });

    lastSpawnY += movement;

    // Keep spawning tiles using the independent lastSpawnY tracker
    while (lastSpawnY > -25) {
      lastSpawnY = lastSpawnY - spawnPatternRow(lastSpawnY) * 25;
    }
  }

  renderTiles();
  requestAnimationFrame(gameLoop);
}

function renderTiles() {
  const existingEls = {};
  const children = Array.from(tilesContainer.children);
  children.forEach(child => {
    existingEls[child.dataset.tileId] = child;
  });

  tiles.forEach(tile => {
    let el = existingEls[tile.id];
    if (!el) {
      el = document.createElement('div');
      el.dataset.tileId = tile.id;
      
      if (tile.type === 'long') {
        el.className = 'absolute w-1/4 border-slate-800/40 select-none tile-long pointer-events-none';
        el.style.height = (tile.length * 25) + '%';
        
        // Red gradient: transitions from black to red within the first 2 rows length of the tile
        const L = tile.length;
        const transitionPercent = Math.min(100, (2 / L) * 100);
        el.style.background = `linear-gradient(to top, #000000 0%, #ff1a1a ${transitionPercent}%, #ff1a1a 100%)`;
        
        // Add red ring cue inside
        const ring = document.createElement('div');
        ring.className = 'red-ring-cue';
        ring.style.bottom = `calc(${(50 / L)}% - 16px)`;
        el.appendChild(ring);

        // Add vertical line starting above the ring until about half a row height left
        const line = document.createElement('div');
        line.className = 'tile-long-line';
        line.style.bottom = `calc(${(50 / L)}% + 13px)`; // Shifted down to connect to guide ring
        line.style.top = `${(50 / L)}%`; // Leaves exactly half a row's height left at the top
        el.appendChild(line);
      } else {
        const isWideCombo = tile.type === 'combo' && tile.spanCols;
        el.className = isWideCombo
          ? 'absolute tile-combo border-b border-r border-slate-800/40 flex items-center justify-center transition-shadow select-none pointer-events-none'
          : 'absolute w-1/4 h-1/4 border-b border-r border-slate-800/40 flex items-center justify-center transition-shadow select-none pointer-events-none';
        if (tile.clicked) {
          el.classList.add('tile-clicked');
        } else {
          el.classList.add('bg-black', 'border-t', 'border-slate-800');
        }
        
        if (tile.isStart && !tile.clicked) {
          const startText = document.createElement('div');
          startText.className = 'text-white font-black text-xs tracking-wider uppercase font-game animate-pulse';
          startText.innerText = 'START';
          el.appendChild(startText);
        } else if (tile.type === 'combo' && !tile.clicked) {
          const badge = document.createElement('div');
          badge.className = 'combo-badge';
          badge.innerText = tile.remainingTaps;
          el.appendChild(badge);
        }
      }

      tilesContainer.appendChild(el);
    }

    // Update position
    if (tile.spanCols) {
      el.style.left = (tile.spanCols[0] * 25) + '%';
      el.style.width = (tile.spanCols.length * 25) + '%';
      el.style.height = '50%';
    } else {
      el.style.left = (tile.col * 25) + '%';
      el.style.width = '';
    }
    el.style.top = tile.y + '%';
    
    // Update active class for holding
    if (tile.type === 'long') {
      if (tile.held) {
        el.classList.add('tile-holding');
        
        if (tile.pressY !== undefined) {
          let domeEl = el.querySelector('.tile-hold-dome');
          if (!domeEl) {
            domeEl = document.createElement('div');
            domeEl.className = 'tile-hold-dome';
            el.appendChild(domeEl);
          }
          const tileHeightPercent = tile.length * 25;
          const pressPercentOfTile = ((tile.pressY - tile.y) / tileHeightPercent) * 100;
          const domeHeightPercentOfTile = (12 / tileHeightPercent) * 100;
          
          domeEl.style.height = domeHeightPercentOfTile + '%';
          domeEl.style.top = (pressPercentOfTile - domeHeightPercentOfTile) + '%';
        }
      } else {
        el.classList.remove('tile-holding');
        const domeEl = el.querySelector('.tile-hold-dome');
        if (domeEl) {
          domeEl.remove();
        }
      }
      
      if (tile.clicked) {
        el.style.background = '#f3f4f6';
        el.style.border = '1px solid #e5e7eb';
        el.style.boxShadow = 'none';
        const ring = el.querySelector('.red-ring-cue');
        if (ring) ring.remove();
        const dome = el.querySelector('.tile-hold-dome');
        if (dome) dome.remove();
        const line = el.querySelector('.tile-long-line');
        if (line) line.remove();
      }
    }
  });

  // Remove elements that are no longer in the tiles list
  const currentIds = new Set(tiles.map(t => String(t.id)));
  children.forEach(child => {
    if (!currentIds.has(child.dataset.tileId)) {
      child.remove();
    }
  });
}

function gameOver(failedTileId) {
  gameActive = false;

  const failedTile = tiles.find(t => t.id === failedTileId);
  const failedEl = document.querySelector(`[data-tile-id="${failedTileId}"]`);
  if (failedEl) {
    failedEl.classList.remove('bg-black', 'tile-holding');
    failedEl.style.background = ''; // reset dynamic gradients if any
    failedEl.classList.add('flash-error');
  }

  // Scroll up to reveal the missed note if it went off screen
  if (failedTile) {
    const tileBottom = getTileBottom(failedTile);
    if (tileBottom > 100) {
      const overlap = tileBottom - 90; // center bottom of tile at 90% of screen
      tilesContainer.style.transition = 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)';
      tilesContainer.style.transform = `translateY(-${overlap}%)`;
    }
  }

  // Update High Score
  if (currentSpeed > highScore) {
    highScore = currentSpeed;
    localStorage.setItem('rainingtiles_highscore', highScore.toString());
    updateBestScoreDisplay();
  }

  // Populate game over panel info
  document.getElementById('final-tps').textContent = currentSpeed.toFixed(3);
  const grade = getGrade(currentSpeed);
  const finalGradeEl = document.getElementById('final-grade');
  finalGradeEl.textContent = grade;
  finalGradeEl.className = `font-game text-2xl font-black text-white px-2 py-0.5 rounded shadow ${getGradeClass(grade)}`;
  
  document.getElementById('final-stars').textContent = getStarsAndCrowns(currentSpeed);
  
  const startSpeedVal = getStartSpeed();
  document.getElementById('final-start-tps').textContent = startSpeedVal.toFixed(1);
  
  const accelVal = parseFloat(inputAccel.value) || 0.07;
  document.getElementById('final-accel').textContent = accelVal.toFixed(2);

  // Show Game Over Screen
  setTimeout(() => {
    gameoverScreen.classList.remove('hidden');
  }, 500);
}
