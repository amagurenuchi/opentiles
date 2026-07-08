'use strict';

const restMap = { Q: 8, R: 4, S: 2, T: 1, U: 0.5, V: 0.25, W: 0.125, X: 0.0625, Y: 0.03125 };
const beatsMap = { H: 8, I: 4, J: 2, K: 1, L: 0.5, M: 0.25, N: 0.125, O: 0.0625, P: 0.03125 };
const playTypes = {
  '1<': 1,
  '2<': 2,
  '3<': 3,
  '5<': 5,
  '6<': 6,
  '7<': 7,
  '8<': 8,
  '9<': 9,
  '10<': 10
};
const pitches = ['A-3', '#A-3', 'B-3', 'C-2', '#C-2', 'D-2', '#D-2', 'E-2', 'F-2', '#F-2', 'G-2', '#G-2', 'A-2', '#A-2', 'B-2', 'C-1', '#C-1', 'D-1', '#D-1', 'E-1', 'F-1', '#F-1', 'G-1', '#G-1', 'A-1', '#A-1', 'B-1', 'c', '#c', 'd', '#d', 'e', 'f', '#f', 'g', '#g', 'a', '#a', 'b', 'c1', '#c1', 'd1', '#d1', 'e1', 'f1', '#f1', 'g1', '#g1', 'a1', '#a1', 'b1', 'c2', '#c2', 'd2', '#d2', 'e2', 'f2', '#f2', 'g2', '#g2', 'a2', '#a2', 'b2', 'c3', '#c3', 'd3', '#d3', 'e3', 'f3', '#f3', 'g3', '#g3', 'a3', '#a3', 'b3', 'c4', '#c4', 'd4', '#d4', 'e4', 'f4', '#f4', 'g4', '#g4', 'a4', '#a4', 'b4', 'c5', 'mute', 'chuanshao'];

const boardEl = document.getElementById('game-board');
const tilesContainer = document.getElementById('tiles-container');
const hitEffectsEl = document.getElementById('hit-effects');
const scoreDisplay = document.getElementById('score-display');
const starsDisplay = document.getElementById('stars-display');
const crownsDisplay = document.getElementById('crowns-display');
const bestDisplay = document.getElementById('best-display');
const startScreen = document.getElementById('start-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const songListScreen = document.getElementById('song-list-screen');
const pauseScreen = document.getElementById('pause-screen');
const songListContainer = document.getElementById('song-list-container');
const songStatusEl = document.getElementById('song-status');
const pt2JsonInput = document.getElementById('pt2-json-input');
const pt2MusicSelect = document.getElementById('pt2-music-select');
const loadSampleJsonBtn = document.getElementById('load-sample-json-btn');
const clearSongBtn = document.getElementById('clear-song-btn');
const autoplayToggle = document.getElementById('settings-autoplay');
const colElements = Array.from(document.querySelectorAll('.col-element'));
const keyHintEls = Array.from(document.querySelectorAll('.key-hint'));
const gameBoardWrapper = document.getElementById('game-board-wrapper');

const erm = { part: 0, track: 0, index: 0 };
const table = {};
pitches.forEach((pitch) => {
  table[pitch] = true;
});

let audioContext = null;
let audioGainNode = null;
const audioBufferCache = new Map();
let queuedTimeouts = [];
let rafId = 0;
const spriteCache = {};
let lastHoldEffectTime = 0;

let musicCsvData = [];
let selectedSongData = null;
let lastLoadedJsonText = '';
let lastLoadedLabel = '';

let highScore = parseFloat(localStorage.getItem('opentile_highscore') || '0');
let keybinds = JSON.parse(localStorage.getItem('opentile_keybinds') || '["KeyD","KeyF","KeyJ","KeyK"]');
let autoplayEnabled = localStorage.getItem('opentile_autoplay') === 'true';
let key = 4;
let songName = '';
let sheet = [];
let info = [];
let getSpeed = () => ({ bpm: 120, beats: 0.5 });
let currentBpm = 120;
let currentBeats = 0.5;
let currentSectionIndex = 0;
let currentSectionTileIndex = 0;
let currentScore = 0;
let starthpos = key - 2;
let hpos = 0;
let bgLevel = 1;
let bgLevelPos = [];
let speedLevel = 1;
let speedLevelPos = [];
let warr = new Array(key).fill(0);
let tiles = [];
let tileDomCache = new Map();
let starterColumn = 0;
let startTime = 0;
let isStarted = false;
let isPaused = false;
let isGameLoaded = false;
let nextTileId = 0;
let activeKeys = { 0: false, 1: false, 2: false, 3: false };
let bindingColIdx = null;
let pendingHitEffects = [];

function unexpected(str) {
  return new SyntaxError(`Unexpected '${str}' at position ${erm.index} (part ${erm.part} track ${erm.track + 1})`);
}

function lenToNum(len, type) {
  return Array.from(len).reduce((sum, char) => sum + ((type ? beatsMap : restMap)[char] || 0), 0);
}

function speedGen(sourceInfo) {
  const infoBak = JSON.parse(JSON.stringify(sourceInfo));
  return function(index = 0) {
    while (index >= infoBak.length) {
      const currentIndex = infoBak.length;
      const { bpm: lastBpm, beats: lastBeats } = infoBak[currentIndex - 1];
      const currentBeatsValue = sourceInfo[currentIndex % sourceInfo.length].beats;
      const loopTimes = Math.floor(currentIndex / sourceInfo.length);
      const newBpm = getNewBpm(lastBpm, lastBeats, currentBeatsValue, loopTimes);
      infoBak[currentIndex] = { bpm: newBpm, beats: currentBeatsValue };
    }
    return infoBak[index];
  };
}

function getNewBpm(lastBpm, lastBeats, currentBeatsValue, loopTimes) {
  const tpm = lastBpm / lastBeats;
  const constant = loopTimes < 3 ? 100 : 130;
  const factor = Math.max(1.3 - (tpm - constant) * 0.001, 1.04);
  return Math.trunc(factor * tpm * currentBeatsValue);
}

function ensureAudioEngine() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
    audioGainNode = audioContext.createGain();
    audioGainNode.gain.value = 1;
    audioGainNode.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

async function getCachedAudioBuffer(basePath) {
  const path = `${basePath}.mp3`;
  const encodedPath = path.replace(/#/g, '%23');
  if (audioBufferCache.has(path)) {
    return audioBufferCache.get(path);
  }
  try {
    const response = await fetch(encodedPath);
    if (!response.ok) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    const decoded = await ensureAudioEngine().decodeAudioData(buffer);
    audioBufferCache.set(path, decoded);
    return decoded;
  } catch (err) {
    console.warn('Failed to load audio buffer:', path, err);
    return null;
  }
}

function noteNameToMp3Path(noteName) {
  const normalized = String(noteName || '').trim();
  if (!normalized) return null;
  if (normalized === 'mute' || normalized === 'chuanshao') return 'music/mute';

  const cleaned = normalized
    .replace(/^[\s(<\[]+/g, '')
    .replace(/[\s>)\]]+$/g, '')
    .replace(/\{[^}]*\}\s*$/g, '')
    .replace(/\[[^\]]*\]\s*$/g, '')
    .trim();

  const pitchMatch = cleaned.match(/([#b]?)([a-gA-G])(-?\d+)?/);
  if (!pitchMatch) return null;

  const accidental = pitchMatch[1];
  const letter = pitchMatch[2];
  const octavePart = pitchMatch[3];
  let filename;

  if (octavePart === undefined || octavePart === '0') {
    filename = accidental + letter.toLowerCase();
  } else {
    const octave = parseInt(octavePart, 10);
    if (octave < 0) {
      filename = `${letter.toUpperCase()}${octave}`;
      if (accidental === '#') filename = `#${filename}`;
    } else {
      filename = `${accidental}${letter.toLowerCase()}${octave}`;
    }
  }
  return `music/${filename}`;
}

function spawnHoldEffectForTile(tile) {
  const containerRect = hitEffectsEl.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  
  // Get the active column for this tile
  const activeCols = getActiveColumns(tile);
  const colIdx = tile.activeHoldColumn !== undefined ? tile.activeHoldColumn : activeCols[0];
  
  if (colIdx === undefined) return;
  
  // Calculate horizontal center of the column
  const colElement = colElements[colIdx];
  if (!colElement) return;
  const colRect = colElement.getBoundingClientRect();
  const centerX = colRect.left + colRect.width / 2;
  
  // Use the tap screen Y position where the user tapped the long tile
  // This matches the position of the long_light.png curve
  const effectY = (tile.tapScreenY || (boardRect.top + ((key - 1) / key) * boardRect.height)) - 120;
  
  const effectContainer = document.createElement('div');
  effectContainer.className = 'hold-effect-container';
  effectContainer.style.left = `${centerX - containerRect.left}px`;
  effectContainer.style.top = `${effectY - containerRect.top}px`;
  
  const circle = document.createElement('div');
  circle.className = 'hold-circle';
  circle.style.left = '50%';
  circle.style.top = '50%';
  
  const dot = document.createElement('div');
  dot.className = 'hold-dot';
  dot.style.left = '50%';
  dot.style.top = '50%';
  
  effectContainer.appendChild(circle);
  effectContainer.appendChild(dot);
  hitEffectsEl.appendChild(effectContainer);
  
  effectContainer.addEventListener('animationend', () => {
    effectContainer.remove();
  });
  
  // Also remove after animation completes (0.25s)
  setTimeout(() => {
    if (effectContainer.parentNode) {
      effectContainer.remove();
    }
  }, 100);
}

async function playMp3Note(noteName, durationMs) {
  const ctx = ensureAudioEngine();
  if (!ctx) return;
  const basePath = noteNameToMp3Path(noteName);
  if (!basePath) return;
  const buffer = await getCachedAudioBuffer(basePath);
  if (!buffer) return;

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const startAt = ctx.currentTime + 0.01;
  source.buffer = buffer;
  gainNode.gain.setValueAtTime(0.95, startAt);
  source.connect(gainNode);
  gainNode.connect(audioGainNode);
  source.start(startAt);
  
  // Spawn hold visual effect if there's an active long tile being held
  // Use cooldown to treat chords as single notes (chords play notes very close together)
  const now = performance.now();
  if (isStarted && !autoplayEnabled && now - lastHoldEffectTime > 50) {
    const activeLongTile = tiles.find((tile) => 
      isLongTile(tile) && 
      tile.holdStarted && 
      !tile.holdCompleted && 
      !tile.holdReleased
    );
    
    if (activeLongTile) {
      spawnHoldEffectForTile(activeLongTile);
      lastHoldEffectTime = now;
    }
  }
}

function queueTimeout(fn, delay) {
  const id = window.setTimeout(fn, delay);
  queuedTimeouts.push(id);
}

function clearQueuedTimeouts() {
  queuedTimeouts.forEach((id) => clearTimeout(id));
  queuedTimeouts = [];
}

function playPitchString(str = '', len = 0) {
  const ms = len * 60000 / currentBpm;
  let str1 = str.match(/\((.+)\)/);
  str1 = str1 ? str1[1] : str;
  const ch = str1.match(/[~@&^$%!]/);
  if (ch) {
    const sh = ch[0];
    const zh = str1.split(sh);
    const num = zh.length;
    let stepMs = ms;
    let trill = false;

    switch (sh) {
      case '@':
        stepMs *= num === 2 ? 0.1 : 0.1 / Math.max(1, num - 2);
        break;
      case '~':
      case '$':
        stepMs *= 1 / num;
        break;
      case '%':
        stepMs *= 0.3 / Math.max(1, num - 1);
        break;
      case '!':
        stepMs *= 0.15 / Math.max(1, num - 1);
        break;
      case '&':
      case '^':
        trill = true;
        break;
      default:
        return;
    }

    if (!trill) {
      zh.forEach((part, idx) => {
        queueTimeout(() => {
          part.split('.').forEach((note) => {
            if (table[note]) {
              playMp3Note(note, ms);
            }
          });
        }, stepMs * idx);
      });
      return;
    }

    if (num === 2) {
      const tickCount = Math.ceil(ms * 0.0125);
      for (let i = 0; i < tickCount; i++) {
        queueTimeout(() => {
          const note = zh[i % 2];
          if (table[note]) {
            playMp3Note(note, 80);
          }
        }, i / 0.0125);
      }
    }
    return;
  }

  str1.split('.').forEach((note) => {
    if (table[note]) {
      playMp3Note(note, ms);
    }
  });
}

function setSongStatus(message) {
  if (songStatusEl) songStatusEl.textContent = message;
}

function preloadSprites() {
  [
    '1',
    '2',
    '3',
    '4',
    'long_finish',
    'long_head',
    'long_light',
    'long_tap2',
    'long_tilelight',
    'tile_black',
    'tile_start'
  ].forEach((name) => {
    const image = new Image();
    image.src = `gameImage/${name}.png`;
    spriteCache[name] = image;
  });
}

function loadSettings() {
  if (autoplayToggle) autoplayToggle.checked = autoplayEnabled;
}

function saveSettingsToStorage() {
  if (autoplayToggle) {
    autoplayEnabled = autoplayToggle.checked;
    localStorage.setItem('opentile_autoplay', String(autoplayEnabled));
  }
}

function parseMusicCsv(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) return [];

  const rawRows = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 7) {
      rawRows.push({
        id: parseInt(fields[0], 10) || 0,
        mid: parseInt(fields[1], 10) || 0,
        bpm: parseInt(fields[2], 10) || 120,
        baseBeats: parseFloat(fields[3]) || 0.5,
        ratio: parseFloat(fields[4]) || 0,
        musicJson: fields[5] || '',
        musician: fields[6] || 'Unknown'
      });
    }
  }

  const merged = new Map();
  rawRows.forEach((row) => {
    const sectionId = row.id % 100;
    if (!merged.has(row.mid)) {
      merged.set(row.mid, {
        mid: row.mid,
        musicJson: row.musicJson,
        musician: row.musician,
        sections: {}
      });
    }
    merged.get(row.mid).sections[sectionId] = row;
  });

  return Array.from(merged.values()).sort((a, b) => a.mid - b.mid);
}

function populateMusicSelect() {
  if (!pt2MusicSelect) return;
  pt2MusicSelect.innerHTML = '<option value="">Select a song...</option>';
  musicCsvData.forEach((song) => {
    const firstSection = song.sections[1] || Object.values(song.sections)[0];
    const option = document.createElement('option');
    option.value = String(song.mid);
    option.textContent = `${song.musicJson} (${song.musician}) - ${firstSection ? firstSection.bpm : 120} BPM`;
    pt2MusicSelect.appendChild(option);
  });
}

function renderSongList() {
  if (!songListContainer) return;
  songListContainer.innerHTML = '';
  musicCsvData.forEach((song) => {
    const firstSection = song.sections[1] || Object.values(song.sections)[0];
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
      <div class="song-card-info-left">
        <div class="song-card-title">${song.musicJson}</div>
        <div class="song-card-artist">${song.musician}</div>
        <div class="song-card-info">
          <span class="song-card-bpm">${firstSection ? firstSection.bpm : 120} BPM</span>
          <span class="song-card-sections">${Object.keys(song.sections).length} sections</span>
        </div>
      </div>
      <button class="song-card-play-btn">Play</button>
    `;
    const playBtn = card.querySelector('.song-card-play-btn');
    playBtn.addEventListener('click', () => loadSongFromData(song));
    songListContainer.appendChild(card);
  });
}

async function loadMusicCsv() {
  try {
    const response = await fetch('music_json.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    musicCsvData = parseMusicCsv(text);
    populateMusicSelect();
    renderSongList();
    setSongStatus(`Loaded ${musicCsvData.length} songs from music_json.csv`);
  } catch (err) {
    console.warn(err);
    setSongStatus(`Failed to load music_json.csv: ${err.message}`);
  }
}

function resetEngineState() {
  clearQueuedTimeouts();
  sheet = [];
  info = [];
  currentSectionIndex = 0;
  currentSectionTileIndex = 0;
  currentScore = 0;
  hpos = 0;
  starthpos = key - 2;
  bgLevel = 1;
  bgLevelPos = [];
  speedLevel = 1;
  speedLevelPos = [];
  starterColumn = Math.floor(Math.random() * key);
  warr = new Array(key).fill(0).map((_, idx) => (idx === starterColumn ? 1 : 0));
  nextTileId = 0;
  tiles = [{
    id: nextTileId++,
    type: -1,
    hlen: 1,
    hpos: -1,
    scores: [],
    warr: [...warr]
  }];
  tileDomCache.forEach((el) => el.remove());
  tileDomCache.clear();
  tilesContainer.innerHTML = '';
  hitEffectsEl.innerHTML = '';
  isStarted = false;
  isPaused = false;
  isGameLoaded = false;
  activeKeys = { 0: false, 1: false, 2: false, 3: false };
  pendingHitEffects = [];
}

function loadSongObject(data, label) {
  resetEngineState();
  lastLoadedJsonText = JSON.stringify(data);
  lastLoadedLabel = label;

  let baseBpm = data.baseBpm || 120;
  const musics = Array.isArray(data.musics) ? [...data.musics].sort((a, b) => a.id - b.id) : [];
  if (!musics.length) {
    throw new Error('No musics found in JSON');
  }
  let baseBeats = musics[0].baseBeats || 0.5;

  for (const music of musics) {
    erm.part = music.id;
    erm.track = 0;
    const base = strToTiles(music.scores[0]);
    for (let j = 1; j < music.scores.length; j++) {
      let baseDur = 0;
      let baseIdx = 0;
      let branchDur = 0;
      let branchIdx = 0;
      erm.track = j;
      const branch = strToTiles(music.scores[j]);
      while (baseIdx < base.length && branchIdx < branch.length) {
        if (branchDur < baseDur + base[baseIdx].len) {
          if (branch[branchIdx].notes[0]) {
            base[baseIdx].notes.push({
              note: branch[branchIdx].notes[0].note,
              start: branchDur - baseDur,
              len: branch[branchIdx].notes[0].len
            });
          }
          branchDur += branch[branchIdx++].len;
        } else {
          baseDur += base[baseIdx++].len;
        }
      }
    }

    const realscore = [];
    for (const tile of base) {
      if (tile.type) {
        const hlenValue = tile.len / music.baseBeats;
        realscore.push({
          type: Number(tile.type) === 1 && tile.notes.flat().length ? (hlenValue > 1 ? 6 : 2) : tile.type,
          scores: [tile.notes],
          hlen: hlenValue
        });
      } else if (realscore.length) {
        realscore[realscore.length - 1].scores.push(tile.notes);
        realscore[realscore.length - 1].hlen += tile.len / music.baseBeats;
      }
    }

    sheet.push(realscore);
    if (music.bpm != null) {
      baseBpm = music.bpm;
      baseBeats = music.baseBeats;
    }
    info.push({ bpm: Math.trunc(baseBpm / baseBeats * music.baseBeats), beats: music.baseBeats, id: music.id });
  }

  getSpeed = speedGen(info);
  currentBpm = info[0].bpm;
  currentBeats = info[0].beats;
  songName = label;
  isGameLoaded = true;
  setSongStatus(`Loaded ${label} with ${sheet.length} sections`);
}

async function loadSongFromData(songData) {
  try {
    selectedSongData = songData;
    const sectionIds = Object.keys(songData.sections).map(Number).sort((a, b) => a - b);
    const firstSection = songData.sections[sectionIds[0]];
    const response = await fetch(`song/${firstSection.musicJson}.json`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const sourceJson = JSON.parse(await response.text());
    const musics = Array.isArray(sourceJson.musics) ? sourceJson.musics : [];
    const mergedMusics = [];

    sectionIds.forEach((sectionId) => {
      const music = musics.find((entry) => parseInt(entry.id, 10) === sectionId);
      const csvSection = songData.sections[sectionId];
      if (!music || !csvSection) return;
      mergedMusics.push({
        ...music,
        id: sectionId,
        bpm: csvSection.bpm,
        baseBeats: csvSection.baseBeats || music.baseBeats || 0.5
      });
    });

    if (!mergedMusics.length) {
      throw new Error('No matching music sections found');
    }

    loadSongObject({
      baseBpm: mergedMusics[0].bpm,
      musics: mergedMusics
    }, `${songData.musicJson} (${songData.musician})`);
    
    // Show game interface but don't start game (wait for START tile)
    songListScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    
    // Show background immediately when song is loaded
    if (gameBoardWrapper) {
      gameBoardWrapper.classList.add('game-playing');
    }
  } catch (err) {
    console.error(err);
    setSongStatus(`Failed to load ${songData.musicJson}: ${err.message}`);
  }
}

function loadSongFromText(text, label) {
  const parsed = JSON.parse(text);
  loadSongObject(parsed, label);
  
  // Show game interface but don't start game (wait for START tile)
  songListScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  
  // Show background immediately when song is loaded
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
  }
}

function getDoubleTilePos(arr0) {
  const validPairs = [];
  for (let i = 0; i < key - 2; i++) {
    if (arr0[i] === 0 && arr0[i + 2] === 0) {
      validPairs.push(i);
    }
  }
  if (validPairs.length === 0) return null;
  const chosenIndex = validPairs[Math.floor(Math.random() * validPairs.length)];
  const arr = new Array(key).fill(0);
  arr[chosenIndex] = 1;
  arr[chosenIndex + 2] = 1;
  return arr;
}

function getSingleTilePos(arr0) {
  const arr = [1];
  while (arr.length < key) {
    arr.splice(Math.floor(Math.random() * (arr.length + 1)), 0, 0);
  }
  for (let i = 0; i < key; i++) {
    if (arr[i] && arr0[i]) return null;
  }
  return arr;
}

function nextPos(arr, type) {
  const getPos = type === 5 ? getDoubleTilePos : getSingleTilePos;
  let result = getPos(arr);
  let guard = 0;
  while (!result) {
    result = getPos(arr);
    if (++guard > 1000) {
      throw new RangeError('Track count cannot accommodate this chart');
    }
  }
  return result;
}

function getRank(idx) {
  const loopSize = info.length;
  let result = `${Math.floor(idx / loopSize) + 1}-${idx % loopSize + 1}`;
  if (idx < 1) result += ' (0 star)';
  else if (idx < 2) result += ' (1 star)';
  else if (idx < 3) result += ' (2 stars)';
  else if (idx < 4) result += ' (3 stars)';
  else if (idx < 6) result += ' (1 crown)';
  else if (idx < 9) result += ' (2 crowns)';
  else result += ' (3 crowns)';
  return result;
}

function getStarAndCrownState(idx) {
  if (idx < 1) return { stars: 0, crowns: 0 };
  if (idx < 2) return { stars: 1, crowns: 0 };
  if (idx < 3) return { stars: 2, crowns: 0 };
  if (idx < 4) return { stars: 3, crowns: 0 };
  if (idx < 6) return { stars: 3, crowns: 1 };
  if (idx < 9) return { stars: 3, crowns: 2 };
  return { stars: 3, crowns: 3 };
}

function getTileFinishImage(ended = 0) {
  if (ended === 1) return '1';
  if (ended === 2) return '2';
  if (ended === 3) return '3';
  return '4';
}

function isLongTile(tile) {
  return tile.type === 6 || tile.type >= 7;
}

function isComboTile(tile) {
  return tile.type === 3;
}

function isTapTile(tile) {
  return tile.type === -1 || tile.type === 2;
}

function isDoubleTile(tile) {
  return tile.type === 5;
}

function getTileDisplayColumns(tile) {
  if (isComboTile(tile) && !autoplayEnabled) return [1, 2];
  return getActiveColumns(tile);
}

function getTileHitColumns(tile) {
  if (isComboTile(tile) && !autoplayEnabled) return [1, 2];
  return getActiveColumns(tile);
}

function getTileBottom(tile) {
  return getTileTop(tile) + tile.hlen;
}

function getLowestManualTile() {
  let lowest = null;
  let maxBottom = -Infinity;
  tiles.forEach((tile) => {
    if (tile.clicked || tile.holdCompleted) return;
    if (tile.type === 1) return;
    // Skip long tiles that have been released midway
    if (isLongTile(tile) && tile.holdReleased) return;
    const bottom = getTileBottom(tile);
    if (bottom > maxBottom) {
      maxBottom = bottom;
      lowest = tile;
    }
  });
  return lowest;
}

function getManualProgress(tile) {
  return Math.max(0, Math.min(tile.hlen, tile.playing || 0));
}

function playTileAudioNow(tile) {
  if (!tile || tile.audioPlayed) return;
  let realLen = 0;
  tile.scores.forEach((scoreGroup) => {
    scoreGroup.forEach((note) => {
      queueTimeout(() => playPitchString(note.note, note.len), (note.start + realLen) * 60000 / currentBpm);
    });
    if (scoreGroup[0]) {
      realLen += scoreGroup[0].len;
    }
  });
  tile.audioPlayed = true;
  tile.played = true;
}

function spawnHitRipple(x, y) {
  const containerRect = hitEffectsEl.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'hit-ripple';
  ripple.style.left = `${x - containerRect.left}px`;
  ripple.style.top = `${y - containerRect.top}px`;
  hitEffectsEl.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function spawnHoldEffect(x, y) {
  const containerRect = hitEffectsEl.getBoundingClientRect();
  const effectContainer = document.createElement('div');
  effectContainer.className = 'hold-effect-container';
  effectContainer.style.left = `${x - containerRect.left}px`;
  effectContainer.style.top = `${y - containerRect.top}px`;
  
  const circle = document.createElement('div');
  circle.className = 'hold-circle';
  circle.style.left = '50%';
  circle.style.top = '50%';
  
  const dot = document.createElement('div');
  dot.className = 'hold-dot';
  dot.style.left = '50%';
  dot.style.top = '50%';
  
  effectContainer.appendChild(circle);
  effectContainer.appendChild(dot);
  hitEffectsEl.appendChild(effectContainer);
  
  effectContainer.addEventListener('animationend', () => {
    effectContainer.remove();
  });
  
  // Also remove after animation completes (0.25s)
  setTimeout(() => {
    if (effectContainer.parentNode) {
      effectContainer.remove();
    }
  }, 250);
}

function flashColumn(colIdx) {
  const colEl = colElements[colIdx];
  if (!colEl) return;
  colEl.classList.add('bg-white/10');
  setTimeout(() => colEl.classList.remove('bg-white/10'), 80);
}

function finishRun(showLibrary = false) {
  isStarted = false;
  isPaused = true;
  document.getElementById('final-score').textContent = String(currentScore);
  document.getElementById('final-stars').textContent = starsDisplay.textContent;
  document.getElementById('final-crowns').textContent = crownsDisplay.textContent;
  document.getElementById('final-grade').classList.add('hidden');
  if (showLibrary) {
    gameoverScreen.classList.add('hidden');
    songListScreen.classList.remove('hidden');
  } else {
    gameoverScreen.classList.remove('hidden');
  }
}

function failRun() {
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.remove('game-playing');
  }
  finishRun(false);
}

function tileMatchesColumn(tile, colIdx) {
  return getTileHitColumns(tile).includes(colIdx);
}

function handleManualInputDown(colIdx, pointerEvent = null) {
  if (isPaused) return;
  
  // Handle start tile separately
  if (!isStarted) {
    const startTile = tiles.find(tile => (tile.type === -1 && tile.hpos === -1) || tile.isStartTile);
    if (startTile && tileMatchesColumn(startTile, colIdx)) {
      const tileBottom = getTileBottom(startTile);
      // Allow tapping start tile anywhere on-screen
      if (tileBottom >= 0) {
        startTile.clicked = true;
        startTile.ended = 1;
        // Clear the isStartTile flag after it's been tapped
        delete startTile.isStartTile;
        playTileAudioNow(startTile);
        isStarted = true;
        startTime = performance.now();
        if (gameBoardWrapper) {
          gameBoardWrapper.classList.add('game-playing');
        }
        if (pointerEvent) {
          spawnHitRipple(pointerEvent.clientX, pointerEvent.clientY);
        }
        return;
      }
    }
    return;
  }
  
  if (autoplayEnabled) return;
  const tile = getLowestManualTile();
  if (!tile) return;

  // Check if there's an active long tile in a different column
  const activeLongInOtherCol = tiles.find((t) => 
    isLongTile(t) && 
    t.holdStarted && 
    !t.holdCompleted && 
    !t.holdReleased && 
    t.activeHoldColumn !== colIdx
  );
  
  if (activeLongInOtherCol) {
    // Drop the active long tile instead of game over
    activeLongInOtherCol.holdReleasedAt = activeLongInOtherCol.playing || 0;
    activeLongInOtherCol.holdReleased = true;
    activeLongInOtherCol.played = true;
    
    const completedHeight = Math.max(0, activeLongInOtherCol.playing - (activeLongInOtherCol.tapPlaying || 0));
    currentScore += Math.max(1, Math.ceil(completedHeight));
    
    if (!tileMatchesColumn(tile, colIdx)) {
      return;
    }
  }

  // Remove hit window restriction - allow tapping anywhere on-screen
  // Keep column matching and order logic
  if (!tileMatchesColumn(tile, colIdx)) {
    failRun();
    return;
  }
  
  // Don't allow tapping long tiles that have been released
  if (isLongTile(tile) && tile.holdReleased) {
    return;
  }

  if (pointerEvent) {
    spawnHitRipple(pointerEvent.clientX, pointerEvent.clientY);
  }

  if (tile.type === -1 || tile.type === 2) {
    tile.clicked = true;
    tile.ended = 1;
    playTileAudioNow(tile);
    if (tile.type === 2) currentScore += 1;
    return;
  }

  if (tile.type === 5) {
    if (!tile.hitColumns.includes(colIdx)) {
      tile.hitColumns.push(colIdx);
      playTileAudioNow(tile);
      if (tile.hitColumns.length >= getActiveColumns(tile).length) {
        tile.clicked = true;
        tile.ended = 1;
        currentScore += 4;
      }
    }
    return;
  }

  if (tile.type === 3) {
    playTileAudioNow(tile);
    tile.remainingTaps = Math.max(0, (tile.remainingTaps || tile.taps || 2) - 1);
    if (tile.remainingTaps <= 0) {
      tile.clicked = true;
      tile.ended = 1;
      currentScore += Math.max(2, tile.taps || 2);
    }
    return;
  }

  if (isLongTile(tile)) {
    // Don't allow re-tapping if already released - just ignore
    if (tile.holdReleased) return;
    
    if (!tile.holdStarted) {
      playTileAudioNow(tile);
      tile.holdStarted = true;
      tile.activeHoldColumn = colIdx;
      
      const el = document.querySelector(`[data-tile-id="${tile.id}"]`);
      if (pointerEvent) {
        tile.tapScreenY = pointerEvent.clientY;
      } else if (el) {
        const rect = el.getBoundingClientRect();
        const unitHeight = rect.height / tile.hlen;
        tile.tapScreenY = rect.bottom - (unitHeight / 2);
      }

      if (el && tile.tapScreenY) {
        const rect = el.getBoundingClientRect();
        const unitHeight = rect.height / tile.hlen;
        const tapDistFromTop = (tile.tapScreenY - rect.top) / unitHeight;
        tile.completionPlaying = tile.playing + tapDistFromTop - 0.5;
        tile.tapPlaying = tile.playing;
      }
    }
  }
}

function handleManualInputUp(colIdx) {
  if (autoplayEnabled || !isStarted) return;
  const activeLong = tiles.find((tile) => isLongTile(tile) && tile.holdStarted && !tile.holdCompleted && tile.activeHoldColumn === colIdx);
  if (activeLong) {
    // Mark the release point instead of failing
    activeLong.holdReleasedAt = activeLong.playing || 0;
    activeLong.holdReleased = true;
    activeLong.played = true; // Mark as played so audio doesn't re-trigger
    
    const completedHeight = Math.max(0, activeLong.playing - (activeLong.tapPlaying || 0));
    currentScore += Math.max(1, Math.ceil(completedHeight));
  }
}

function updateHUD() {
  scoreDisplay.classList.remove('hidden');
  scoreDisplay.textContent = String(currentScore);

  const stage = getStarAndCrownState(speedLevel - 1);
  starsDisplay.textContent = stage.stars ? '✦'.repeat(stage.stars) : '';
  crownsDisplay.textContent = stage.crowns ? '👑'.repeat(stage.crowns) : '';
}

function getTileTop(tile) {
  return starthpos - tile.hpos - tile.hlen;
}

function getActiveColumns(tile) {
  const cols = [];
  tile.warr.forEach((value, idx) => {
    if (value) cols.push(idx);
  });
  return cols;
}

function renderTiles() {
  const visibleKeys = new Set();

  tiles.forEach((tile) => {
    const topUnits = getTileTop(tile);
    const bottomUnits = topUnits + tile.hlen;
    if (topUnits > key + 1 || bottomUnits < -1) return;

    const displayCols = getTileDisplayColumns(tile);
    const renderGroups = isDoubleTile(tile) ? displayCols.map(c => [c]) : [displayCols];

    renderGroups.forEach((cols) => {
      const domKey = `${tile.id}:${cols.join('-')}`;
      visibleKeys.add(domKey);
      let el = tileDomCache.get(domKey);
    if (!el) {
      el = document.createElement('div');
      el.dataset.tileId = String(tile.id);
      el.dataset.tileKey = domKey;
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      el.style.borderRight = '1px solid rgba(51,65,85,0.45)';
      el.style.borderBottom = '1px solid rgba(51,65,85,0.45)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.boxSizing = 'border-box';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundSize = '100% 100%';
      el.style.overflow = 'visible';
      el.innerHTML = `
        <div class="tile-image-layer tile-head"></div>
        <div class="tile-image-layer tile-light-strip"></div>
        <div class="tile-image-layer tile-light-orb"></div>
        <div class="combo-badge hidden"></div>
        <div class="tile-start-label hidden">START</div>
      `;
      tilesContainer.appendChild(el);
      tileDomCache.set(domKey, el);
    }

    const leftCol = Math.min(...cols);
    const widthCols = isComboTile(tile) && !autoplayEnabled ? 2 : cols.length;
    const headEl = el.querySelector('.tile-head');
    const lightStripEl = el.querySelector('.tile-light-strip');
    const lightOrbEl = el.querySelector('.tile-light-orb');
    const comboBadgeEl = el.querySelector('.combo-badge');
    const startLabelEl = el.querySelector('.tile-start-label');

    el.className = '';
    el.style.left = `${(leftCol / key) * 100}%`;
    el.style.width = `${(widthCols / key) * 100}%`;
    el.style.top = `${(topUnits / key) * 100}%`;
    el.style.height = `${(tile.hlen / key) * 100}%`;
    el.style.filter = (tile.type === 3 || tile.type >= 7) ? 'hue-rotate(-90deg)' : 'none';
    el.style.backgroundColor = 'transparent';
    el.style.borderTop = 'none';
    el.style.boxShadow = 'none';
    el.style.opacity = '1';

    [headEl, lightStripEl, lightOrbEl].forEach((child) => {
      child.style.position = 'absolute';
      child.style.left = '0';
      child.style.right = '0';
      child.style.backgroundRepeat = 'no-repeat';
      child.style.backgroundSize = '100% 100%';
      child.style.pointerEvents = 'none';
      child.style.display = 'none';
    });

    comboBadgeEl.classList.add('hidden');
    startLabelEl.classList.add('hidden');
    startLabelEl.style.justifyContent = 'center';
    startLabelEl.style.fontFamily = 'var(--font-game)';
    startLabelEl.style.fontWeight = '500';
    startLabelEl.style.fontSize = '2.8rem';
    startLabelEl.style.color = '#ffffff';
    startLabelEl.style.letterSpacing = '0.1em';
    startLabelEl.style.display = 'none';
    startLabelEl.style.position = 'absolute';
    startLabelEl.style.inset = '0';
    startLabelEl.style.alignItems = 'center';

    if (tile.type === -1 && tile.hpos === -1) {
      el.style.backgroundImage = `url("gameImage/${tile.played ? getTileFinishImage(tile.ended) : 'tile_start'}.png")`;
      if (!tile.played && !isStarted) startLabelEl.style.display = 'flex';
    } else if (tile.type === 1) {
      // Rest/blank tile - make entirely invisible
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    } else if (tile.isStartTile) {
      // Show START label without changing tile appearance
      if (!tile.played && !isStarted) startLabelEl.style.display = 'flex';
    } else if (isTapTile(tile) || isDoubleTile(tile)) {
      let isPlayed = tile.played;
      let isEnded = tile.ended;
      if (isDoubleTile(tile) && !autoplayEnabled) {
        const thisCol = cols[0];
        isPlayed = tile.hitColumns.includes(thisCol);
        isEnded = isPlayed ? 1 : 0;
      }
      el.style.backgroundImage = `url("gameImage/${isPlayed ? getTileFinishImage(isEnded) : 'tile_black'}.png")`;
    } else if (isComboTile(tile) && !autoplayEnabled) {
      el.className = 'tile-combo';
      el.style.backgroundImage = `url("gameImage/${tile.clicked ? getTileFinishImage(tile.ended) : 'tile_black'}.png")`;
      comboBadgeEl.classList.remove('hidden');
      comboBadgeEl.textContent = String(tile.remainingTaps || tile.taps || 2);
    } else if (isLongTile(tile) || isComboTile(tile)) {
      const played = tile.played || tile.clicked;
      const ended = tile.ended || tile.holdCompleted;
      const isReleased = isLongTile(tile) && tile.holdReleased;
      
      // Use release point if the tile was released midway, otherwise use current progress
      let progress;
      if (isReleased) {
        progress = tile.holdReleasedAt || 0;
      } else {
        progress = autoplayEnabled ? (tile.playing || 0) : getManualProgress(tile);
      }

      el.style.backgroundImage = `url("gameImage/${ended ? 'long_finish' : 'long_tap2'}.png")`;

      if (!played) {
        headEl.style.display = 'block';
        headEl.style.bottom = '0';
        headEl.style.height = `${(1.35 / tile.hlen) * 100}%`;
        headEl.style.backgroundImage = 'url("gameImage/long_head.png")';
      }

      if (played && !ended) {
        let orbCenterBottomPercent = 0;
        
        // Keep the light orb at the absolute screen position where it was tapped
        if (tile.tapScreenY && !isReleased) {
          const tileRect = el.getBoundingClientRect();
          const tileScreenTop = tileRect.top;
          
          const orbScreenY = tile.tapScreenY;
          const orbRelativeY = orbScreenY - tileScreenTop;
          const orbRelativePercent = (orbRelativeY / tileRect.height) * 100;
          
          orbCenterBottomPercent = 100 - orbRelativePercent;
        } else {
          // Fallback to normal behavior for released tiles or when tapScreenY is not available
          // Progress is measured from the bottom of the tile up to the hitline
          const fallbackProgress = Math.max(0, Math.min(tile.hlen, progress + 1));
          orbCenterBottomPercent = (fallbackProgress / tile.hlen) * 100 - (0.5 / tile.hlen) * 100;
        }
        
        // Ensure the strip doesn't overflow the tile boundaries
        orbCenterBottomPercent = Math.max(0, Math.min(100, orbCenterBottomPercent));
        
        const orbHeightPercent = (1 / tile.hlen) * 100;
        const orbBottomPercent = orbCenterBottomPercent - (orbHeightPercent / 2);
        
        lightOrbEl.style.display = 'block';
        lightOrbEl.style.height = `${orbHeightPercent}%`;
        lightOrbEl.style.bottom = `${orbBottomPercent}%`;
        lightOrbEl.style.backgroundImage = 'url("gameImage/long_light.png")';
        
        lightStripEl.style.display = 'block';
        lightStripEl.style.bottom = '0';
        lightStripEl.style.height = `${orbCenterBottomPercent}%`;
        lightStripEl.style.backgroundImage = 'url("gameImage/long_tilelight.png")';
      }

      if (ended) {
        lightStripEl.style.display = 'block';
        lightStripEl.style.top = '0';
        lightStripEl.style.height = '100%';
        lightStripEl.style.backgroundImage = 'url("gameImage/long_tilelight.png")';
        lightStripEl.style.opacity = `${Math.max(1 - (tile.ended || 0) / 10, 0)}`;
      } else {
        lightStripEl.style.opacity = '1';
      }
    }
    });
  });

  Array.from(tileDomCache.entries()).forEach(([keyValue, el]) => {
    if (!visibleKeys.has(keyValue)) {
      el.remove();
      tileDomCache.delete(keyValue);
    }
  });
}

function updateEngineFrame(now) {
  ({ bpm: currentBpm, beats: currentBeats } = getSpeed(speedLevel - 1));

  if (bgLevelPos.length && bgLevelPos[0] < starthpos) {
    bgLevelPos.shift();
    bgLevel++;
  }
  if (speedLevelPos.length && speedLevelPos[0] < starthpos) {
    speedLevelPos.shift();
    speedLevel++;
  }

  while (tiles.length < key * 3) {
    if (currentSectionIndex < sheet.length) {
      const currentTile = sheet[currentSectionIndex][currentSectionTileIndex++];
      if (currentTile) {
        warr = nextPos(warr, currentTile.type);
        const comboTaps = Math.max(2, currentTile.scores.length || Math.round(currentTile.hlen) + 1);
        tiles.push({
          id: nextTileId++,
          type: currentTile.type,
          scores: currentTile.scores,
          hlen: currentTile.hlen,
          hpos,
          warr: [...warr],
          taps: currentTile.type === 3 ? comboTaps : 0,
          remainingTaps: currentTile.type === 3 ? comboTaps : 0,
          holdStarted: false,
          holdCompleted: false,
          released: false,
          clicked: false,
          played: false,
          ended: 0,
          hitColumns: []
        });
        hpos += currentTile.hlen;
      } else {
        bgLevelPos.push(hpos - 4 + key);
        speedLevelPos.push(hpos - 1 + key);
        currentSectionIndex++;
        currentSectionTileIndex = 0;
      }
    } else {
      currentSectionIndex = 0;
    }
  }

  tiles.forEach((tile) => {
    tile.playing = starthpos - tile.hpos - (key - 1);
    if (autoplayEnabled && tile.playing > 0 && !tile.played) {
      let realLen = 0;
      tile.scores.forEach((scoreGroup) => {
        scoreGroup.forEach((note) => {
          queueTimeout(() => playPitchString(note.note, note.len), (note.start + realLen) * 60000 / currentBpm);
        });
        if (scoreGroup[0]) {
          realLen += scoreGroup[0].len;
        }
      });
      tile.played = true;
    }
  });

  if (autoplayEnabled) {
    tiles.forEach((tile) => {
      switch (tile.type) {
        case -1:
          // Start tile must be clicked manually even in autoplay mode
          if (tile.hpos === -1 && !tile.played && !isStarted) {
            // Don't auto-play the start tile
            break;
          }
          break;
        case 1:
          break;
        case 2:
          if (tile.played && !tile.ended) {
            currentScore++;
            tile.clicked = true;
            tile.ended = 1;
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 5:
          if (tile.played && !tile.ended) {
            currentScore += 4;
            tile.clicked = true;
            tile.ended = 1;
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 6:
          if (tile.playing > tile.hlen - 1) {
            if (!tile.ended) {
              currentScore += Math.round(tile.hlen) + 1;
              tile.clicked = true;
              tile.ended = 1;
            } else {
              tile.ended++;
            }
          }
          break;
        default:
          if (tile.playing > tile.hlen - 1) {
            let scoreDelta = tile.hlen;
            if (tile.type === 3) scoreDelta = tile.scores.length - 1;
            if (tile.type === 10) scoreDelta = 0;
            if (!tile.ended) {
              currentScore += Math.round(scoreDelta) + 1;
              tile.clicked = true;
              tile.ended = 1;
            } else {
              tile.ended++;
            }
          }
      }
    });
  } else {
    tiles.forEach((tile) => {
      // Handle long tiles that were released midway
      if (tile.holdStarted && !tile.holdCompleted && !tile.holdReleased && tile.playing > (tile.completionPlaying !== undefined ? tile.completionPlaying : tile.hlen - 1)) {
        tile.holdCompleted = true;
        tile.clicked = true;
        tile.ended = 1;
        currentScore += Math.round(tile.hlen) + 1;
      } else if ((tile.clicked || tile.holdCompleted) && tile.ended) {
        tile.ended++;
      }
    });
  }

  if (!autoplayEnabled) {
    const missedTile = tiles.find((tile) => {
      if (tile.type === 1) return false;
      // Don't fail on start tile before game starts
      if (tile.type === -1 && tile.hpos === -1 && !isStarted) return false;
      if (tile.clicked || tile.holdCompleted) return false;
      if (isLongTile(tile) && tile.holdStarted) return false;
      return getTileTop(tile) > key + 0.05;
    });
    if (missedTile) {
      failRun();
    }
  }

  if (tiles[0] && starthpos - tiles[0].hpos - tiles[0].hlen > key + 1) {
    tiles.shift();
  }

  if (isStarted && !isPaused) {
    starthpos += (now - startTime) * currentBpm / currentBeats / 60000;
    startTime = now;
  }
}

function frame(now) {
  if (isGameLoaded) {
    updateEngineFrame(now);
    updateHUD();
    renderTiles();
  }
  rafId = requestAnimationFrame(frame);
}

function startGame() {
  if (!isGameLoaded) return;
  ensureAudioEngine();
  startScreen.classList.add('hidden');
  songListScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  isStarted = true;
  isPaused = false;
  startTime = performance.now();
}

function stopGame(showStart = true) {
  clearQueuedTimeouts();
  resetEngineState();
  selectedSongData = null;
  lastLoadedJsonText = '';
  lastLoadedLabel = '';
  if (showStart) {
    startScreen.classList.add('hidden');
    songListScreen.classList.remove('hidden');
  }
  gameoverScreen.classList.add('hidden');
  scoreDisplay.textContent = '0';
  starsDisplay.textContent = '';
  crownsDisplay.textContent = '';
}

function continueFromPause() {
  // Find the nearest untapped note (skip rest/blank tiles with type === 1)
  const nearestUntapped = tiles.find(tile => 
    !tile.clicked && 
    !tile.played && 
    tile.type !== -1 &&
    tile.type !== 1 && // Skip rest/blank tiles
    tile.hpos !== -1 &&
    getTileBottom(tile) >= 0
  );

  if (nearestUntapped) {
    // Mark this tile as the new START tile without changing its type
    nearestUntapped.isStartTile = true;
    
    // Reset game state to wait for START tile
    isStarted = false;
    isPaused = false;
    pauseScreen.classList.add('hidden');
  } else {
    // If no untapped tile found, just resume normally
    togglePause();
  }
}

function exitToSongLibrary() {
  pauseScreen.classList.add('hidden');
  stopGame(true);
}

function togglePause() {
  if (!isStarted && !isGameLoaded) return;
  isPaused = !isPaused;
  if (isPaused) {
    pauseScreen.classList.remove('hidden');
  } else {
    pauseScreen.classList.add('hidden');
    startTime = performance.now();
  }
}

function updateKeybindHints() {
  keyHintEls.forEach((hint, idx) => {
    const keyCode = keybinds[idx] || '';
    hint.textContent = keyCode.replace('Key', '');
  });
  document.querySelectorAll('.keybind-setter').forEach((button) => {
    const idx = parseInt(button.dataset.colIdx || '-1', 10);
    if (idx >= 0) {
      button.textContent = (keybinds[idx] || '').replace('Key', '');
    }
  });
}

function strToTiles(scores = '') {
  const notes = [];
  const notes2 = parseScore(scores);
  for (const item of notes2) {
    let type = item.type || 1;
    for (const note of item.items) {
      notes.push({
        type,
        notes: note.pitch ? [{ note: note.pitch, start: 0, len: note.beats }] : [],
        len: note.beats
      });
      if (type !== 1) type = 0;
    }
  }
  return JSON.parse(JSON.stringify(notes));
}

function parseScore(scores) {
  const notes = [];
  scores.replace(/((\d+<)(.*?)>|(.*?))([,;]|$)/gs, (...arr) => {
    if (arr[2]) {
      const items = [];
      String(arr[3] + arr[5]).replace(/(.*?)([,;]|$)/g, (...arrr) => {
        erm.index = arr[6] + arrr[2].length + arrr[3];
        if (arrr[1] || arrr[2]) items.push({ ...parseNote(arrr[1]), splitter: arrr[2] });
      });
      notes.push({ type: playTypes[arr[2]], items });
    } else if (arr[1] || arr[5]) {
      erm.index = arr[6];
      notes.push({ type: 0, items: [{ ...parseNote(arr[1]), splitter: arr[5] }] });
    }
  });
  return notes;
}

function parseNote(notestr) {
  const note = {
    pitch: null,
    effect: null,
    hasAccent: false,
    beats: 0
  };
  notestr.replace(/^(([Q-Y]+)|(!?)(.*?)\[(.*?)\])($|(.*?)\{(.*?)\})|(.)/gs, (...arr) => {
    const i = erm.index + arr[10];
    if (arr[9]) throw unexpected(arr[9]);
    if (arr[2] == null) {
      const beatIndex = i + (arr[3] + arr[4]).length;
      erm.index = beatIndex + arr[5].indexOf(']');
      if (arr[5].includes(']')) throw unexpected(']');
      erm.index = beatIndex + arr[5].indexOf('{');
      if (arr[8] == null && arr[5].includes('{')) throw unexpected('{');
      erm.index = beatIndex + arr[5].indexOf('}');
      if (arr[8] != null && arr[5].includes('}')) throw unexpected('}');
      note.beats = lenToNum(arr[5], true);
      note.hasAccent = Boolean(arr[3]);
      erm.index = i;
      checkPitch(arr[4]);
      note.pitch = arr[4];
    } else {
      note.beats = lenToNum(arr[2], false);
    }
    if (arr[8] != null) note.effect = arr[8];
  });
  return note;
}

function checkPitch(pitch) {
  const i = erm.index;
  if (pitch.startsWith('(') && pitch.endsWith(')')) {
    pitch.slice(1, -1).replace(/(^|[.~@&^$%!])([^.~@&^$%!]+)/gs, (...arr) => {
      if (!pitches.includes(arr[2])) {
        if (!'QRSTUVWXYZ'.split('').includes(arr[2])) {
          erm.index = i + arr[3] + arr[1].length;
          throw unexpected(arr[2]);
        }
      }
    });
  } else {
    erm.index = i;
    if (!pitches.includes(pitch)) throw unexpected(pitch);
  }
}

function initUi() {
  bestDisplay.textContent = `${highScore.toFixed(3)} t/s`;
  startScreen.classList.add('hidden');
  songListScreen.classList.remove('hidden');
  gameoverScreen.classList.add('hidden');
  scoreDisplay.classList.remove('hidden');
  scoreDisplay.textContent = '0';
  loadSettings();
  updateKeybindHints();
}

document.getElementById('song-library-btn')?.addEventListener('click', () => {
  songListScreen.classList.remove('hidden');
});

document.getElementById('song-list-settings-btn')?.addEventListener('click', () => {
  settingsScreen.classList.remove('hidden');
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  settingsScreen.classList.remove('hidden');
});

document.getElementById('save-settings-btn')?.addEventListener('click', () => {
  saveSettingsToStorage();
  settingsScreen.classList.add('hidden');
  setSongStatus(`Settings saved. Autoplay is ${autoplayEnabled ? 'on' : 'off'}.`);
});

document.getElementById('restart-btn')?.addEventListener('click', () => {
  if (selectedSongData) {
    loadSongFromData(selectedSongData);
  } else if (lastLoadedJsonText) {
    loadSongFromText(lastLoadedJsonText, lastLoadedLabel || 'Reloaded song');
  }
});

document.getElementById('home-btn')?.addEventListener('click', () => {
  stopGame(true);
});

document.getElementById('pause-continue-btn')?.addEventListener('click', () => {
  continueFromPause();
});

document.getElementById('pause-exit-btn')?.addEventListener('click', () => {
  exitToSongLibrary();
});

pt2MusicSelect?.addEventListener('change', () => {
  const mid = parseInt(pt2MusicSelect.value, 10);
  if (!mid) return;
  const songData = musicCsvData.find((song) => song.mid === mid);
  if (songData) {
    loadSongFromData(songData);
  }
});

pt2JsonInput?.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    loadSongFromText(text, file.name);
  } catch (err) {
    setSongStatus(`Failed to load ${file.name}: ${err.message}`);
  }
});

loadSampleJsonBtn?.addEventListener('click', async () => {
  try {
    const response = await fetch('song/Horseman.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    loadSongFromText(await response.text(), 'Horseman.json');
  } catch (err) {
    setSongStatus(`Could not load Horseman.json: ${err.message}`);
  }
});

clearSongBtn?.addEventListener('click', () => {
  resetEngineState();
  selectedSongData = null;
  lastLoadedJsonText = '';
  lastLoadedLabel = '';
  startScreen.classList.add('hidden');
  songListScreen.classList.remove('hidden');
  gameoverScreen.classList.add('hidden');
  scoreDisplay.textContent = '0';
  starsDisplay.textContent = '';
  crownsDisplay.textContent = '';
  setSongStatus('Load a PT2 JSON file to play a song.');
});

document.querySelectorAll('.keybind-setter').forEach((button) => {
  button.addEventListener('click', () => {
    bindingColIdx = parseInt(button.dataset.colIdx || '-1', 10);
    if (bindingColIdx >= 0) {
      button.textContent = '...';
    }
  });
});

window.addEventListener('keydown', (event) => {
  if (bindingColIdx !== null) {
    keybinds[bindingColIdx] = event.code;
    localStorage.setItem('opentile_keybinds', JSON.stringify(keybinds));
    bindingColIdx = null;
    updateKeybindHints();
    event.preventDefault();
    return;
  }
  if (event.code === 'Escape') {
    if (!settingsScreen.classList.contains('hidden')) {
      settingsScreen.classList.add('hidden');
      return;
    }
    if (!pauseScreen.classList.contains('hidden')) {
      togglePause();
      return;
    }
    if (isStarted || isGameLoaded) {
      togglePause();
    }
  }
  if (event.code === 'Space') {
    togglePause();
    event.preventDefault();
    return;
  }
  const colIdx = keybinds.indexOf(event.code);
  if (colIdx !== -1 && !activeKeys[colIdx]) {
    activeKeys[colIdx] = true;
    flashColumn(colIdx);
    handleManualInputDown(colIdx);
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const colIdx = keybinds.indexOf(event.code);
  if (colIdx !== -1) {
    activeKeys[colIdx] = false;
    handleManualInputUp(colIdx);
    event.preventDefault();
  }
});

colElements.forEach((colElement, colIdx) => {
  colElement.addEventListener('pointerdown', (event) => {
    activeKeys[colIdx] = true;
    flashColumn(colIdx);
    handleManualInputDown(colIdx, event);
    event.preventDefault();
  });
  colElement.addEventListener('pointerup', (event) => {
    activeKeys[colIdx] = false;
    handleManualInputUp(colIdx);
    event.preventDefault();
  });
  colElement.addEventListener('pointercancel', () => {
    activeKeys[colIdx] = false;
    handleManualInputUp(colIdx);
  });
});

// Window level fallback to release key/pointer hold state reliably
window.addEventListener('pointerup', (event) => {
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleManualInputUp(colIdx);
    }
  }
});

window.addEventListener('pointercancel', (event) => {
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleManualInputUp(colIdx);
    }
  }
});

preloadSprites();
loadMusicCsv();
initUi();
rafId = requestAnimationFrame(frame);
