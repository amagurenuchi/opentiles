const PATTERN_PRESETS = {
  single: `1\n1\n1\n1\n1\n1`,
  long: `L3\nL3\nL2\nL4`,
  double: `D\nD\nD\nD`
};

const PT2_DURATION_WEIGHTS = {
  P: 0.03125,
  O: 0.0625,
  N: 0.125,
  M: 0.25,
  L: 0.5,
  K: 1,
  J: 2,
  I: 4,
  H: 8
};

const PT2_SPACE_WEIGHTS = {
  Y: 0.03125,
  X: 0.0625,
  W: 0.125,
  V: 0.25,
  U: 0.5,
  T: 1,
  S: 2,
  R: 4,
  Q: 8
};

const PT2_SPECIAL_TILE_MAP = {
  2: 'single',
  3: 'combo',
  5: 'double',
  6: 'long',
  7: 'long',
  8: 'long',
  9: 'long',
  10: 'long'
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
let songStartTime = 0;
let audioContext = null;
let audioGainNode = null;
let scheduledAudioNodes = [];
let soundfontInstrument = null;
let soundfontInstrumentPromise = null;

let parsedPattern = [];
let currentPatternIndex = 0;
let activeKeys = { 0: false, 1: false, 2: false, 3: false };
let lastSpawnY = 50;
let lastSpawnedCols = [];
let frozenSpeed = null;
let importedSong = null;
let importedSongs = [];
let selectedImportedSongIndex = 0;
let importedSongLabel = '';
let importedSongStatus = '';
let importedSongTitle = '';
let importedSongDurationSeconds = 0;
let importedSongSpawnCursor = 0;
let importedSongTiles = [];
let importedSongAudioEvents = [];
let importedSongBaseSpeed = null;
let importedSongSpeedLocked = false;
let importedSongSpeedSchedule = [];
let importedSongElapsedSeconds = 0;
let importedSongRawText = '';

let debugCurrentSectionId = null;
let debugLastPlayedTileId = null;
let debugLastPlayedEventKey = null;
let debugLastPlayedNoteNames = [];
let debugLastScrolledSectionId = null;
let debugLastScrolledEventKey = null;
let debugRawEventMap = new Map();
let debugParsedSectionMap = new Map();
let debugParsedEventMap = new Map();
let debugParsedNoteMap = new Map();

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
const pt2JsonInput = document.getElementById('pt2-json-input');
const pt2MusicSelect = document.getElementById('pt2-music-select');
const loadSampleJsonBtn = document.getElementById('load-sample-json-btn');
const clearSongBtn = document.getElementById('clear-song-btn');
const songStatusEl = document.getElementById('song-status');
const debugRawPanel = document.getElementById('debug-raw-panel');
const debugParsedPanel = document.getElementById('debug-parsed-panel');

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

function setSongStatus(message) {
  importedSongStatus = message;
  if (songStatusEl) {
    songStatusEl.textContent = message;
  }
}

function getImportedEventKey(event) {
  if (!event) return '';
  const sectionId = event.musicId !== undefined && event.musicId !== null
    ? event.musicId
    : (event.songIndex !== undefined && event.songIndex !== null ? event.songIndex : '');
  const startSeconds = Number.isFinite(event.startSeconds) ? event.startSeconds.toFixed(3) : '0.000';
  const trackIndices = Array.isArray(event.trackIndices)
    ? event.trackIndices.join(',')
    : (Number.isFinite(event.trackIndex) ? String(event.trackIndex) : '');
  const raw = String(event.raw || '').trim();
  return `${sectionId}|${startSeconds}|${trackIndices}|${raw}`;
}

function getImportedEventNoteNames(event) {
  if (!event || !Array.isArray(event.notes)) return [];
  return event.notes.map((note) => note && note.name).filter(Boolean);
}

function getImportedSectionIdForElapsedSeconds(elapsedSeconds) {
  const section = getImportedSongSectionAt(elapsedSeconds);
  return section ? section.id : null;
}

function getImportedSectionIdForCurrentTile() {
  if (!gameActive) {
    return null;
  }

  const lowestTile = getLowestUnclickedTile();
  if (lowestTile && lowestTile.sourceSectionId !== undefined && lowestTile.sourceSectionId !== null) {
    return lowestTile.sourceSectionId;
  }

  return null;
}

function getImportedPlaybackSection(elapsedSeconds = importedSongElapsedSeconds) {
  const sectionId = getImportedSectionIdForCurrentTile();
  if (sectionId !== null && sectionId !== undefined) {
    const matchingSection = importedSongSpeedSchedule.find((section) => String(section.id) === String(sectionId));
    if (matchingSection) {
      return matchingSection;
    }
  }

  return getImportedSongSectionAt(elapsedSeconds);
}

function getImportedSectionIdForPlayback(elapsedSeconds = importedSongElapsedSeconds) {
  const section = getImportedPlaybackSection(elapsedSeconds);
  return section ? section.id : null;
}

function clearDebugPanels() {
  if (debugRawPanel) debugRawPanel.innerHTML = '';
  if (debugParsedPanel) debugParsedPanel.innerHTML = '';
  debugCurrentSectionId = null;
  debugLastPlayedTileId = null;
  debugLastPlayedEventKey = null;
  debugLastPlayedNoteNames = [];
  debugLastScrolledSectionId = null;
  debugLastScrolledEventKey = null;
  debugRawEventMap = new Map();
  debugParsedSectionMap = new Map();
  debugParsedEventMap = new Map();
  debugParsedNoteMap = new Map();
}

function scrollDebugPanels() {
  if (!importedSong) return;

  const sectionId = debugCurrentSectionId;
  if (sectionId !== null && sectionId !== debugLastScrolledSectionId) {
    const sectionKey = String(sectionId);
    const rawSectionEl = debugRawPanel
      ? debugRawPanel.querySelector(`[data-debug-section-id="${sectionKey}"]`)
      : null;
    const parsedSectionEl = debugParsedSectionMap.get(sectionKey) || null;

    if (rawSectionEl) {
      rawSectionEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    }
    if (parsedSectionEl) {
      parsedSectionEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    }

    debugLastScrolledSectionId = sectionId;
  }

  const eventKey = debugLastPlayedEventKey;
  if (!eventKey || eventKey === debugLastScrolledEventKey) return;

  const rawEventEl = debugRawEventMap.get(eventKey) || null;
  const parsedEventEl = debugParsedEventMap.get(eventKey) || null;

  if (rawEventEl) {
    rawEventEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  }
  if (parsedEventEl) {
    parsedEventEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  }

  debugLastScrolledEventKey = eventKey;
}

function updateDebugCurrentSection() {
  const sectionId = importedSong ? getImportedSectionIdForPlayback(importedSongElapsedSeconds) : null;
  debugCurrentSectionId = sectionId;

  debugParsedSectionMap.forEach((sectionEl, key) => {
    if (!sectionEl) return;
    const isCurrent = sectionId !== null && String(key) === String(sectionId);
    sectionEl.classList.toggle('debug-current-section', isCurrent);
    const badge = sectionEl.querySelector('[data-debug-current-badge="1"]');
    if (badge) {
      badge.classList.toggle('bg-amber-100', isCurrent);
      badge.classList.toggle('text-amber-800', isCurrent);
      badge.classList.toggle('bg-gray-100', !isCurrent);
      badge.classList.toggle('text-gray-600', !isCurrent);
    }
  });

  debugRawPanel && debugRawPanel.querySelectorAll('[data-debug-section-id]').forEach((sectionEl) => {
    const isCurrent = sectionId !== null && String(sectionEl.dataset.debugSectionId) === String(sectionId);
    sectionEl.classList.toggle('debug-current-section', isCurrent);
  });

  scrollDebugPanels();
}

function updateDebugLastPlayedState(tile) {
  if (!tile || !importedSong) return;

  debugLastPlayedTileId = tile.id;
  debugLastPlayedEventKey = tile.sourceEventKey || '';
  debugLastPlayedNoteNames = Array.isArray(tile.notes) ? tile.notes.map((note) => note && note.name).filter(Boolean) : [];

  debugRawEventMap.forEach((eventEl, key) => {
    if (!eventEl) return;
    eventEl.classList.toggle('debug-last-played', key === debugLastPlayedEventKey);
  });

  debugParsedEventMap.forEach((eventEl, key) => {
    if (!eventEl) return;
    eventEl.classList.toggle('debug-last-played', key === debugLastPlayedEventKey);
  });

  debugParsedNoteMap.forEach((noteNodes, eventKey) => {
    const isActiveEvent = eventKey === debugLastPlayedEventKey;
    (Array.isArray(noteNodes) ? noteNodes : []).forEach((noteEl) => {
      if (!noteEl) return;
      const noteName = noteEl.dataset.debugNoteName;
      const isMatch = isActiveEvent && debugLastPlayedNoteNames.includes(noteName);
      noteEl.classList.toggle('debug-last-played-note', isMatch);
    });
  });

  scrollDebugPanels();
}

function buildDebugPanels(song) {
  clearDebugPanels();

  if (!song || !Array.isArray(song.entries) || !song.entries.length) {
    if (debugRawPanel) {
      debugRawPanel.innerHTML = '<div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500">Load a PT2 song to inspect raw tile data.</div>';
    }
    if (debugParsedPanel) {
      debugParsedPanel.innerHTML = '<div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500">Load a PT2 song to inspect parsed engine data.</div>';
    }
    return;
  }

  const playableEvents = Array.isArray(song.playableEvents) ? song.playableEvents : [];
  const rawEventsBySection = new Map();
  playableEvents.forEach((event) => {
    const sectionId = event.musicId !== undefined && event.musicId !== null
      ? event.musicId
      : (event.songIndex !== undefined && event.songIndex !== null ? event.songIndex + 1 : 'unknown');
    const key = String(sectionId);
    if (!rawEventsBySection.has(key)) rawEventsBySection.set(key, []);
    rawEventsBySection.get(key).push(event);
  });

  const parsedEventsBySection = new Map();
  playableEvents.forEach((event) => {
    const sectionId = event.musicId !== undefined && event.musicId !== null
      ? event.musicId
      : (event.songIndex !== undefined && event.songIndex !== null ? event.songIndex + 1 : 'unknown');
    const key = String(sectionId);
    if (!parsedEventsBySection.has(key)) parsedEventsBySection.set(key, []);
    parsedEventsBySection.get(key).push(event);
  });

  if (debugRawPanel) {
    debugRawPanel.innerHTML = '';
  }
  if (debugParsedPanel) {
    debugParsedPanel.innerHTML = '';
  }

  const sectionEntries = Array.isArray(song.entries) ? song.entries : [];
  sectionEntries.forEach((entry) => {
    const sectionKey = String(entry.id);
    const sectionEvents = rawEventsBySection.get(sectionKey) || [];
    const sectionParsedEvents = parsedEventsBySection.get(sectionKey) || [];

    if (debugRawPanel) {
      const sectionCard = document.createElement('section');
      sectionCard.dataset.debugSectionId = sectionKey;
      sectionCard.className = 'rounded-2xl border border-gray-200 bg-gray-50/90 p-3';

      const header = document.createElement('div');
      header.className = 'flex items-start justify-between gap-3 mb-3';
      header.innerHTML = `
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-gray-900">Section ${entry.id}</span>
            <span class="text-[10px] uppercase tracking-[0.2em] text-gray-400">raw</span>
          </div>
          <div class="text-[11px] text-gray-500 mt-1">${entry.bpm} BPM · ${entry.baseBeats} bb · ${entry.speed.toFixed(3)} t/s</div>
        </div>
      `;
      sectionCard.appendChild(header);

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'space-y-2';

      sectionEvents.forEach((event) => {
        const eventKey = getImportedEventKey(event);
        const row = document.createElement('div');
        row.dataset.eventKey = eventKey;
        row.className = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700';
        row.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[11px] leading-snug break-all">${event.raw || '(rest)'}</span>
            <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">${event.tileType || 'single'}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1 text-[10px] text-gray-400">
            <span>start ${Number.isFinite(event.startSeconds) ? event.startSeconds.toFixed(2) : '0.00'}s</span>
            <span>tracks ${(Array.isArray(event.trackIndices) ? event.trackIndices : [event.trackIndex]).join(',') || '-'}</span>
          </div>
        `;
        debugRawEventMap.set(eventKey, row);
        tokenWrap.appendChild(row);
      });

      sectionCard.appendChild(tokenWrap);
      debugRawPanel.appendChild(sectionCard);
    }

    if (debugParsedPanel) {
      const sectionCard = document.createElement('section');
      sectionCard.dataset.debugSectionId = sectionKey;
      sectionCard.className = 'rounded-2xl border border-gray-200 bg-gray-50/90 p-3';

      const header = document.createElement('div');
      header.className = 'flex items-start justify-between gap-3 mb-3';
      header.innerHTML = `
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-gray-900">Section ${entry.id}</span>
            <span data-debug-current-badge="1" class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">current</span>
          </div>
          <div class="text-[11px] text-gray-500 mt-1">id ${entry.id} · ${entry.bpm} BPM · ${entry.baseBeats} bb · ${entry.speed.toFixed(3)} t/s</div>
        </div>
      `;
      sectionCard.appendChild(header);

      const eventList = document.createElement('div');
      eventList.className = 'space-y-2';

      sectionParsedEvents.forEach((event) => {
        const eventKey = getImportedEventKey(event);
        const row = document.createElement('div');
        row.dataset.eventKey = eventKey;
        row.className = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700';

        const noteNames = getImportedEventNoteNames(event);
        const notesHtml = noteNames.length
          ? noteNames.map((noteName) => `<span data-debug-note-name="${noteName}" class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600">${noteName}</span>`).join(' ')
          : '<span class="text-gray-400">rest</span>';
        row.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[11px] leading-snug break-all">${event.raw || '(rest)'}</span>
            <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">${event.tileType || 'single'}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1 text-[10px] text-gray-400">
            <span>${Number.isFinite(event.durationBeats) ? event.durationBeats.toFixed(3) : '0.000'} beats</span>
            <span>${Number.isFinite(event.durationSeconds) ? event.durationSeconds.toFixed(2) : '0.00'}s</span>
            <span>note${noteNames.length === 1 ? '' : 's'} ${noteNames.length}</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">${notesHtml}</div>
        `;

        debugParsedNoteMap.set(eventKey, Array.from(row.querySelectorAll('[data-debug-note-name]')));

        debugParsedEventMap.set(eventKey, row);
        eventList.appendChild(row);
      });

      sectionCard.appendChild(eventList);
      debugParsedSectionMap.set(sectionKey, sectionCard);
      debugParsedPanel.appendChild(sectionCard);
    }
  });

  updateDebugCurrentSection();
  if (debugLastPlayedEventKey) {
    debugRawEventMap.forEach((eventEl, key) => {
      if (eventEl) eventEl.classList.toggle('debug-last-played', key === debugLastPlayedEventKey);
    });
    debugParsedEventMap.forEach((eventEl, key) => {
      if (eventEl) eventEl.classList.toggle('debug-last-played', key === debugLastPlayedEventKey);
    });
    debugParsedNoteMap.forEach((noteNodes, eventKey) => {
      const isActiveEvent = eventKey === debugLastPlayedEventKey;
      (Array.isArray(noteNodes) ? noteNodes : []).forEach((noteEl) => {
        if (!noteEl) return;
        const noteName = noteEl.dataset.debugNoteName;
        noteEl.classList.toggle('debug-last-played-note', isActiveEvent && debugLastPlayedNoteNames.includes(noteName));
      });
    });
  }
}

function clearImportedSong() {
  importedSong = null;
  importedSongs = [];
  selectedImportedSongIndex = 0;
  importedSongRawText = '';
  importedSongLabel = '';
  importedSongTitle = '';
  importedSongDurationSeconds = 0;
  importedSongSpawnCursor = 0;
  importedSongTiles = [];
  importedSongAudioEvents = [];
  importedSongBaseSpeed = null;
  importedSongSpeedLocked = false;
  importedSongSpeedSchedule = [];
  importedSongElapsedSeconds = 0;
  buildDebugPanels(null);
  if (pt2MusicSelect) {
    pt2MusicSelect.innerHTML = '<option value="">Load a PT2 JSON first</option>';
    pt2MusicSelect.disabled = true;
  }
  scheduledAudioNodes.forEach(node => {
    try {
      if (node && typeof node.stop === 'function') {
        node.stop();
      }
    } catch (err) {}
  });
  scheduledAudioNodes = [];
  setSongStatus('No PT2 file loaded. Pattern mode is active.');
}

function decodePT2DurationTag(tag) {
  if (!tag) return 1;
  let total = 0;
  for (const char of tag.toUpperCase()) {
    total += PT2_DURATION_WEIGHTS[char] || 0;
  }
  return total > 0 ? total : 1;
}

function splitPT2TopLevel(input) {
  const tokens = [];
  let current = '';
  const stack = [];
  const closing = { '(': ')', '[': ']', '{': '}', '<': '>' };
  const opening = new Set(Object.keys(closing));
  const isTopLevelSeparator = (char) => (char === ',' || char === ';') && stack.length === 0;

  for (const char of input) {
    if (isTopLevelSeparator(char)) {
      const trimmed = current.trim();
      if (trimmed) tokens.push(trimmed);
      current = '';
      continue;
    }

    if (opening.has(char)) {
      stack.push(closing[char]);
    } else if (stack.length > 0 && char === stack[stack.length - 1]) {
      stack.pop();
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) tokens.push(trimmed);
  return tokens;
}

function stripOuterPair(input, openChar, closeChar) {
  const trimmed = input.trim();
  if (!trimmed.startsWith(openChar) || !trimmed.endsWith(closeChar)) {
    return trimmed;
  }

  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === openChar) depth++;
    if (char === closeChar) depth--;
    if (depth === 0 && i < trimmed.length - 1) {
      return trimmed;
    }
  }

  return trimmed.slice(1, -1).trim();
}

function calculateArpeggioDelay(operator, operatorCount, tileLength) {
  if (!operator || operatorCount === 0) return 0;

  const n = operatorCount;
  const l = tileLength;

  switch (operator) {
    case '~':
    case '$':
      if (n === 1) {
        return (1/10) * l;
      } else if (n > 1) {
        return (1/10) / (n - 1) * l;
      }
      return l / (n + 1);
    case '%':
      return (3/10) / n * l;
    case '!':
      return (3/20) / n * l;
    case '@':
      // Same as % for arpeggios
      return (3/10) / n * l;
    case '^':
    case '&':
      // Fixed delay of 1/12 second (independent of tile length)
      return 1/12;
    default:
      return 0;
  }
}

function parsePT2NoteGroup(rawGroup) {
  const cleaned = stripOuterPair(rawGroup, '(', ')').trim();
  if (!cleaned) return [];

  // Check for arpeggio operators (~, %, @, !, ^, &)
  const hasArpeggio = /[~%@!^&]/.test(cleaned);

  if (hasArpeggio) {
    // Split by arpeggio operators while preserving the operators
    const parts = cleaned.split(/([~%@!^&])/).filter(Boolean);
    const notes = [];
    let currentOperator = '';
    const operatorCounts = {};

    // Count operators for delay calculation
    parts.forEach(part => {
      if (/[~%@!^&]/.test(part)) {
        operatorCounts[part] = (operatorCounts[part] || 0) + 1;
      }
    });

    const totalOperators = Object.values(operatorCounts).reduce((sum, count) => sum + count, 0);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (/[~%@!^&]/.test(part)) {
        currentOperator = part;
      } else if (part) {
        const durationMatch = part.match(/\[([^\]]+)\]\s*$/);
        const effectMatch = part.match(/\{([^}]+)\}\s*$/);
        const bareNote = part
          .replace(/\{[^}]+\}\s*$/, '')
          .replace(/\[[^\]]+\]\s*$/, '')
          .trim();

        notes.push({
          raw: part,
          name: bareNote,
          durationTag: durationMatch ? durationMatch[1].trim() : '',
          effect: effectMatch ? effectMatch[1].trim() : '',
          arpeggioOperator: currentOperator,
          arpeggioOperatorCount: totalOperators
        });
      }
    }
    return notes;
  }

  // No arpeggio - split by . and , only
  return cleaned.split(/[.,]/).map(note => note.trim()).filter(Boolean).map(note => {
    const durationMatch = note.match(/\[([^\]]+)\]\s*$/);
    const effectMatch = note.match(/\{([^}]+)\}\s*$/);
    const bareNote = note
      .replace(/\{[^}]+\}\s*$/, '')
      .replace(/\[[^\]]+\]\s*$/, '')
      .trim();

    return {
      raw: note,
      name: bareNote,
      durationTag: durationMatch ? durationMatch[1].trim() : '',
      effect: effectMatch ? effectMatch[1].trim() : '',
      arpeggioOperator: '',
      arpeggioOperatorCount: 0
    };
  });
}

function parsePT2Block(rawBlock) {
  let block = String(rawBlock || '').trim();
  if (!block) return null;

  if (!block.includes('[') && !block.includes('(') && !block.includes('<') && PT2_SPACE_WEIGHTS[block] !== undefined) {
    return {
      isRest: true,
      durationRatio: PT2_SPACE_WEIGHTS[block],
      durationTag: block,
      effect: '',
      notes: [],
      noteCount: 0
    };
  }

  const effectMatch = block.match(/\{([^}]+)\}\s*$/);
  const effect = effectMatch ? effectMatch[1].trim() : '';
  if (effectMatch) {
    block = block.slice(0, effectMatch.index).trim();
  }

  const durationMatch = block.match(/\[([^\]]+)\]\s*$/);
  const durationTag = durationMatch ? durationMatch[1].trim() : '';
  const body = durationMatch ? block.slice(0, durationMatch.index).trim() : block;
  const noteSource = body.startsWith('(') ? body : (body ? `(${body})` : '');
  const notes = noteSource ? parsePT2NoteGroup(noteSource) : [];

  return {
    isRest: notes.length === 0,
    durationRatio: decodePT2DurationTag(durationTag),
    durationTag,
    effect,
    notes,
    noteCount: notes.length
  };
}

function parsePT2NoteGroupToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return null;

  const specialMatch = token.match(/^(\d+)<([\s\S]+)>$/);
  if (specialMatch) {
    const specialId = parseInt(specialMatch[1], 10);
    const specialType = PT2_SPECIAL_TILE_MAP[specialId] || 'long';
    const innerBlocks = splitPT2TopLevel(specialMatch[2].trim());
    let durationRatio = 0;
    const notes = [];

    innerBlocks.forEach((innerBlock) => {
      const parsedBlock = parsePT2Block(innerBlock);
      if (!parsedBlock) return;
      durationRatio += parsedBlock.durationRatio;
      if (!parsedBlock.isRest) {
        notes.push(...parsedBlock.notes);
      }
    });

    return {
      specialId,
      specialType,
      durationRatio: durationRatio > 0 ? durationRatio : 1,
      notes,
      noteCount: Math.max(notes.length, innerBlocks.filter(Boolean).length)
    };
  }

  const parsedBlock = parsePT2Block(token);
  if (!parsedBlock) return null;

  return {
    specialId: 0,
    specialType: '',
    durationRatio: parsedBlock.durationRatio,
    notes: parsedBlock.notes,
    noteCount: parsedBlock.isRest ? 0 : Math.max(parsedBlock.noteCount, 1)
  };
}

function classifyPT2Tile(noteCount, durationRatio, specialType, durationBeats, baseBeats) {
  if (specialType) return specialType;
  // Unmarked PT2 blocks with duration ratio > 1 render as hold/long tiles.
  // Check actual duration in beats relative to baseBeats for notes without explicit tags.
  // durationRatio is the note's duration in beats, baseBeats is the smallest unit.
  // The actual ratio is how many baseBeats the note spans.
  const actualRatio = (durationRatio && baseBeats && baseBeats > 0) ? durationRatio / baseBeats : durationRatio;
  if (actualRatio > 1) return 'long';
  return 'single';
}

function pickColumnsForImportedTile(tileType, noteCount) {
  if (tileType === 'combo') {
    return [1, 2];
  }

  if (tileType === 'double') {
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

    return Math.random() < 0.5 ? [chosenSet[0], chosenSet[1]] : [chosenSet[1], chosenSet[0]];
  }

  const available = [0, 1, 2, 3].filter(col => !lastSpawnedCols.includes(col));
  const colsToPick = available.length > 0 ? available : [0, 1, 2, 3];
  return [colsToPick[Math.floor(Math.random() * colsToPick.length)]];
}

function getPT2TileDurationRatio(note) {
  const tag = note.durationTag || '';
  return decodePT2DurationTag(tag);
}

function getImportedTileLengthRows(event, forceMinForLong) {
  const baseBeats = event && event.baseBeats ? event.baseBeats : 1;
  const durationBeats = event && event.durationBeats ? event.durationBeats : baseBeats;
  const ratio = durationBeats / baseBeats;
  // Use exact ratio (may be non-integer) so that non-power-of-2 durations (e.g. [KL] = 1.5)
  // don't create visual gaps between tiles. Round only to avoid floating-point noise.
  const exactLength = Math.max(1, Math.round(ratio * 1000) / 1000);
  // Long tiles must be at least 2 rows to be visually/mechanically meaningful
  if (forceMinForLong && exactLength < 2) return 2;
  return exactLength;
}

function resolvePT2SectionBpm(music, fallbackBpm) {
  const sectionBpm = parseFloat(music && music.bpm);
  if (Number.isFinite(sectionBpm) && sectionBpm > 0) {
    return sectionBpm;
  }

  const fallback = parseFloat(fallbackBpm);
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return 120;
}

function resolvePT2SectionBaseBeats(music, fallbackBaseBeats = 1) {
  const sectionBaseBeats = parseFloat(music && music.baseBeats);
  if (Number.isFinite(sectionBaseBeats) && sectionBaseBeats > 0) {
    return sectionBaseBeats;
  }

  const fallback = parseFloat(fallbackBaseBeats);
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return 1;
}

function computePT2TilesPerSecond(bpm, baseBeats) {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const safeBaseBeats = Number.isFinite(baseBeats) && baseBeats > 0 ? baseBeats : 1;
  return safeBpm / (60 * safeBaseBeats);
}

function buildImportedSectionRowOffsets(song) {
  const offsets = new Map();
  let cursorRows = 0;

  (Array.isArray(song && song.entries) ? song.entries : []).forEach((entry, index) => {
    const key = entry && entry.songIndex !== undefined && entry.songIndex !== null
      ? String(entry.songIndex)
      : String(index);
    const bpm = resolvePT2SectionBpm(entry, song.baseBpm || song.bpm || 120);
    const baseBeats = resolvePT2SectionBaseBeats(entry, song.baseBeats || 1);
    const durationSeconds = parseFloat(entry && entry.durationSeconds ? entry.durationSeconds : 0) || 0;
    const sectionRows = durationSeconds * computePT2TilesPerSecond(bpm, baseBeats);

    offsets.set(key, cursorRows);
    if (entry && entry.id !== undefined && entry.id !== null) {
      offsets.set(`id:${entry.id}`, cursorRows);
    }

    cursorRows += sectionRows;
  });

  return offsets;
}

function getImportedEventStartRows(event, sectionRowOffsets) {
  const baseBeats = event && event.baseBeats ? event.baseBeats : 1;
  const localRows = Number.isFinite(event && event.startBeats)
    ? event.startBeats / baseBeats
    : 0;
  const sectionKey = event && event.songIndex !== undefined && event.songIndex !== null
    ? String(event.songIndex)
    : null;
  const sectionOffset = sectionKey !== null && sectionRowOffsets.has(sectionKey)
    ? sectionRowOffsets.get(sectionKey)
    : sectionRowOffsets.get(`id:${event && event.musicId}`) || 0;

  return sectionOffset + localRows;
}

function getImportedEventDurationRows(event) {
  const baseBeats = event && event.baseBeats ? event.baseBeats : 1;
  const durationBeats = event && event.durationBeats ? event.durationBeats : baseBeats;
  const ratio = durationBeats / baseBeats;
  // Use exact ratio (may be non-integer) so layout gaps match the actual tile heights.
  // This avoids spurious visual gaps with non-power-of-2 durations like [KL] = 1.5 beats.
  return ratio > 0 ? Math.max(1, Math.round(ratio * 1000) / 1000) : 0;
}

function sortPT2MusicsById(musics) {
  return [...musics].map((music, sourceIndex) => ({ music, sourceIndex })).sort((a, b) => {
    const idA = parseInt(a.music && a.music.id, 10);
    const idB = parseInt(b.music && b.music.id, 10);
    const safeA = Number.isFinite(idA) ? idA : Number.MAX_SAFE_INTEGER;
    const safeB = Number.isFinite(idB) ? idB : Number.MAX_SAFE_INTEGER;
    if (safeA !== safeB) return safeA - safeB;
    return a.sourceIndex - b.sourceIndex;
  }).map((entry) => entry.music);
}

function buildImportedSongSpeedSchedule(song) {
  const schedule = [];
  let cursorSeconds = 0;

  (Array.isArray(song.entries) ? song.entries : []).forEach((entry, index) => {
    const bpm = resolvePT2SectionBpm(entry, song.baseBpm || song.bpm || 120);
    const baseBeats = resolvePT2SectionBaseBeats(entry, song.baseBeats || 1);
    const durationSeconds = parseFloat(entry && entry.durationSeconds ? entry.durationSeconds : 0) || 0;
    const speed = computePT2TilesPerSecond(bpm, baseBeats);

    schedule.push({
      index,
      id: entry.id,
      startSeconds: cursorSeconds,
      endSeconds: cursorSeconds + durationSeconds,
      durationSeconds,
      bpm,
      baseBeats,
      speed
    });

    cursorSeconds += durationSeconds;
  });

  return schedule;
}

function getImportedSongSectionAt(elapsedSeconds) {
  if (!importedSongSpeedSchedule.length) {
    return null;
  }

  const elapsed = Math.max(0, elapsedSeconds);
  for (let i = importedSongSpeedSchedule.length - 1; i >= 0; i--) {
    const section = importedSongSpeedSchedule[i];
    if (elapsed >= section.startSeconds) {
      return section;
    }
  }

  return importedSongSpeedSchedule[0];
}

function getImportedSongSpeedAt(elapsedSeconds) {
  const section = getImportedPlaybackSection(elapsedSeconds);
  if (section) {
    return section.speed;
  }

  return importedSongBaseSpeed || getStartSpeed();
}

function noteTokenToMidi(noteName) {
  if (!noteName) return null;
  const normalized = String(noteName).trim();
  const cleaned = normalized
    .replace(/^[\s(<\[]+/g, '')
    .replace(/[\s>)\]]+$/g, '')
    .replace(/\{[^}]*\}\s*$/g, '')
    .replace(/\[[^\]]*\]\s*$/g, '')
    .replace(/[>]+$/g, '')
    .trim();

  if (!cleaned || cleaned === 'mute' || cleaned === 'empty' || cleaned === 'chuanshao') {
    return null;
  }

  const pitchMatch = cleaned.match(/([#b]?)([a-gA-G])(-?\d+)?/);
  if (!pitchMatch) return null;

  const accidental = pitchMatch[1];
  const letter = pitchMatch[2].toLowerCase();
  const octavePart = pitchMatch[3];
  const semitoneOffsets = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11
  };

  // PT2 uses c/c1/c2 and A-3/A-1 style names; map them to scientific pitch via +3.
  const scientificOctave = octavePart === undefined ? 3 : parseInt(octavePart, 10) + 3;
  let midi = (scientificOctave + 1) * 12 + semitoneOffsets[letter];
  if (accidental === '#') midi += 1;
  if (accidental === 'b') midi -= 1;
  return midi;
}

function noteTokenToFrequency(noteName) {
  const midi = noteTokenToMidi(noteName);
  if (midi === null) return null;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getAudioVoiceFromInstrument(instrumentName) {
  const normalized = (instrumentName || '').toLowerCase();
  if (normalized.includes('bass')) return { type: 'square', detune: -12 };
  if (normalized.includes('pluck')) return { type: 'triangle', detune: 0 };
  if (normalized.includes('lead')) return { type: 'sawtooth', detune: 0 };
  if (normalized.includes('drum') || normalized.includes('kick') || normalized.includes('snare') || normalized.includes('hat')) {
    return { type: 'noise', detune: 0 };
  }
  return { type: 'triangle', detune: 0 };
}

function ensureAudioEngine() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
    audioGainNode = audioContext.createGain();
    audioGainNode.gain.value = 1.0;
    audioGainNode.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function ensureSoundfontInstrument() {
  if (soundfontInstrument) {
    return Promise.resolve(soundfontInstrument);
  }
  if (soundfontInstrumentPromise) {
    return soundfontInstrumentPromise;
  }

  const ctx = ensureAudioEngine();
  const SoundFontCtor = window.SoundFont;
  if (!ctx || typeof SoundFontCtor !== 'function') {
    return Promise.resolve(null);
  }

  const soundfont = new SoundFontCtor();

  const pickProgramId = () => {
    const programs = Array.isArray(soundfont.programs) ? soundfont.programs : [];
    const preferred = programs.find((program) => {
      const name = String(program && (program.name || program.text || program.title || '')).toLowerCase();
      return name.includes('piano') || name.includes('steinway') || name.includes('grand');
    });
    return (preferred || programs[0] || {}).id;
  };

  const pickBankId = () => {
    const banks = Array.isArray(soundfont.banks) ? soundfont.banks : [];
    return (banks[0] || {}).id;
  };

  soundfontInstrumentPromise = soundfont.loadSoundFontFromURL('./akai_steinway.sf2').then(() => {
    const bankId = pickBankId();
    const programId = pickProgramId();
    if (bankId !== undefined) {
      soundfont.bank = bankId;
    }
    if (programId !== undefined) {
      soundfont.program = programId;
    }

    soundfontInstrument = {
      play(midi, startTime, options = {}) {
        if (typeof midi !== 'number' || Number.isNaN(midi)) return null;

        const duration = Math.max(0.05, Number(options.duration) || 0.25);
        const startDelayMs = Math.max(0, (startTime - (performance.now() / 1000)) * 1000);
        const endDelayMs = startDelayMs + duration * 1000;

        let active = true;
        let noteStarted = false;
        let startTimer = null;
        let stopTimer = null;

        const noteOff = () => {
          if (!active) return;
          active = false;
          try {
            soundfont.noteOff(midi);
          } catch (err) {}
        };

        startTimer = window.setTimeout(() => {
          if (!active) return;
          noteStarted = true;
          try {
            soundfont.noteOn(midi);
          } catch (err) {}
        }, startDelayMs);

        stopTimer = window.setTimeout(() => {
          if (noteStarted) {
            noteOff();
          } else {
            active = false;
          }
        }, endDelayMs);

        return {
          stop() {
            active = false;
            if (startTimer !== null) {
              clearTimeout(startTimer);
            }
            if (stopTimer !== null) {
              clearTimeout(stopTimer);
            }
            if (noteStarted) {
              try {
                soundfont.noteOff(midi);
              } catch (err) {}
            }
          }
        };
      }
    };

    return soundfontInstrument;
  }).catch((err) => {
    console.warn('Unable to load akai_steinway.sf2; using synth fallback.', err);
    return null;
  }).finally(() => {
    soundfontInstrumentPromise = null;
  });

  return soundfontInstrumentPromise;
}

function playSynthNote({ frequency, startTime, duration, instrumentName, velocity = 1 }) {
  if (!audioContext || !frequency) return;

  const voice = getAudioVoiceFromInstrument(instrumentName);
  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  const endTime = startTime + Math.max(0.05, duration);
  const attack = Math.min(0.02, duration * 0.2);
  const release = Math.min(0.08, duration * 0.35);
  const sustainLevel = voice.type === 'noise' ? 0.5 : 0.7;

  if (voice.type === 'noise') {
    const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(amp);
    amp.connect(audioGainNode);
    amp.gain.setValueAtTime(0.0001, startTime);
    amp.gain.linearRampToValueAtTime(sustainLevel * velocity, startTime + attack);
    amp.gain.setValueAtTime(sustainLevel * velocity, Math.max(startTime + attack, endTime - release));
    amp.gain.linearRampToValueAtTime(0.0001, endTime);
    source.start(startTime);
    source.stop(endTime + 0.02);
    scheduledAudioNodes.push(source);
    return;
  }

  osc.type = voice.type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (voice.detune) {
    osc.detune.setValueAtTime(voice.detune, startTime);
  }
  osc.connect(amp);
  amp.connect(audioGainNode);
  amp.gain.setValueAtTime(0.0001, startTime);
  amp.gain.linearRampToValueAtTime(0.32 * velocity, startTime + attack);
  amp.gain.setValueAtTime(0.32 * velocity, Math.max(startTime + attack, endTime - release));
  amp.gain.linearRampToValueAtTime(0.0001, endTime);
  osc.start(startTime);
  osc.stop(endTime + 0.03);
  scheduledAudioNodes.push(osc);
}

function buildPT2AudioEvents(parsedEvent, instrumentName) {
  const notes = parsedEvent.notes.length > 0 ? parsedEvent.notes : [{ name: parsedEvent.name }];
  return notes
    .map(note => ({
      midi: noteTokenToMidi(note.name),
      frequency: noteTokenToFrequency(note.name),
      name: note.name,
      durationSeconds: parsedEvent.durationSeconds,
      instrumentName,
      velocity: note.effect && String(note.effect).toUpperCase().includes('V') ? 1.15 : 1
    }))
    .filter(event => event.frequency !== null || event.midi !== null);
}

function playImportedTileAudio(tile) {
  if (!importedSong || !tile || tile.audioPlayed) return;
  const ctx = ensureAudioEngine();
  if (!ctx || !audioGainNode) return;

  const baseStartAt = ctx.currentTime + 0.01;

  if (tile.isArpeggio && Array.isArray(tile.notes) && tile.notes.some(n => n.arpeggioDelay !== undefined)) {
    // Arpeggio long tile: play each note sequentially with its stored delay
    tile.notes.forEach((note) => {
      const delay = (typeof note.arpeggioDelay === 'number') ? note.arpeggioDelay : 0;
      const noteStartAt = baseStartAt + delay;
      const noteDuration = Math.max(0.08, Math.min(1.2, tile.durationSeconds || 0.25));
      const midi = noteTokenToMidi(note.name);
      const freq = noteTokenToFrequency(note.name);
      const velocity = note.effect && String(note.effect).toUpperCase().includes('V') ? 1.15 : 1;
      if (soundfontInstrument && midi !== null) {
        const node = soundfontInstrument.play(midi, noteStartAt, {
          duration: noteDuration,
          gain: Math.min(1, 0.98 * velocity)
        });
        if (node) scheduledAudioNodes.push(node);
      } else if (freq !== null) {
        playSynthNote({
          frequency: freq,
          startTime: noteStartAt,
          duration: Math.max(0.08, Math.min(0.8, noteDuration)),
          instrumentName: tile.trackInstrument,
          velocity
        });
      }
    });
  } else {
    const audioEvents = buildPT2AudioEvents(
      {
        notes: tile.notes || [],
        durationSeconds: tile.durationSeconds || 0.25
      },
      tile.trackInstrument
    );

    if (soundfontInstrument) {
      audioEvents.forEach((audioEvent) => {
        const node = soundfontInstrument.play(audioEvent.midi, baseStartAt, {
          duration: Math.max(0.08, Math.min(1.2, audioEvent.durationSeconds)),
          gain: Math.min(1, 0.98 * audioEvent.velocity)
        });
        if (node) {
          scheduledAudioNodes.push(node);
        }
      });
    } else {
      ensureSoundfontInstrument();
      audioEvents.forEach((audioEvent) => {
        playSynthNote({
          frequency: audioEvent.frequency,
          startTime: baseStartAt,
          duration: Math.max(0.08, Math.min(0.8, audioEvent.durationSeconds)),
          instrumentName: audioEvent.instrumentName,
          velocity: audioEvent.velocity
        });
      });
    }
  }

  tile.audioPlayed = true;
}

function mergePT2Events(events) {
  const mergedByTime = new Map();
  const epsilon = 0.001;
  const TILE_TYPE_PRIORITY = { combo: 4, long: 3, double: 2, single: 1 };

  const applyLeadTrackTileFields = (target, source) => {
    target.raw = source.raw;
    target.startBeats = source.startBeats;
    target.durationSeconds = source.durationSeconds;
    target.durationBeats = source.durationBeats;
    target.tileType = source.tileType;
    target.specialType = source.specialType;
    target.baseBeats = source.baseBeats;
    target.leadTrackIndex = source.trackIndex;
    target.songIndex = source.songIndex;
    target.musicId = source.musicId;
    target.isRest = source.isRest;
    target.durationRatio = source.durationRatio;
    // Preserve arpeggio metadata so sequential note playback is not lost
    target.isArpeggio = source.isArpeggio || false;
  };

  const shouldPreferLeadTile = (existing, event) => {
    if (event.trackIndex === 0 && existing.leadTrackIndex !== 0) return true;
    if (existing.leadTrackIndex === 0 && event.trackIndex !== 0) return false;
    return (TILE_TYPE_PRIORITY[event.tileType] || 0) > (TILE_TYPE_PRIORITY[existing.tileType] || 0);
  };

  events.forEach((event) => {
    const bucketKey = Math.round(event.startSeconds / epsilon) * epsilon;
    const existing = mergedByTime.get(bucketKey);
    const notes = event.notes && event.notes.length ? event.notes : [{ name: event.raw || '' }];

    if (!existing) {
      mergedByTime.set(bucketKey, {
        raw: event.raw,
        startBeats: event.startBeats,
        startSeconds: event.startSeconds,
        durationSeconds: event.durationSeconds,
        durationBeats: event.durationBeats,
        trackIndices: [event.trackIndex],
        trackInstrument: event.trackInstrument,
        notes: [...notes],
        noteCount: notes.length,
        tileType: event.tileType,
        specialType: event.specialType,
        baseBeats: event.baseBeats,
        leadTrackIndex: event.trackIndex,
        songIndex: event.songIndex,
        musicId: event.musicId,
        isRest: event.isRest || false,
        durationRatio: event.durationRatio,
        isArpeggio: event.isArpeggio || false
      });
      return;
    }

    existing.trackIndices.push(event.trackIndex);
    existing.notes.push(...notes);
    existing.noteCount = existing.notes.length;
    existing.trackInstrument = existing.trackInstrument || event.trackInstrument;

    if (shouldPreferLeadTile(existing, event)) {
      applyLeadTrackTileFields(existing, event);
    } else {
      existing.durationSeconds = Math.max(existing.durationSeconds, event.durationSeconds);
      existing.durationBeats = Math.max(existing.durationBeats, event.durationBeats);
      existing.specialType = existing.specialType || event.specialType;
      existing.baseBeats = existing.baseBeats || event.baseBeats;
      existing.isRest = existing.isRest && event.isRest;
      // Re-classify tileType based on merged duration
      if (!existing.specialType && existing.baseBeats && existing.durationRatio) {
        const actualRatio = existing.durationRatio / existing.baseBeats;
        if (actualRatio > 1) {
          existing.tileType = 'long';
        } else if (existing.tileType === 'long') {
          existing.tileType = 'single';
        }
      }
    }
  });

  return Array.from(mergedByTime.values()).sort((a, b) => a.startSeconds - b.startSeconds);
}

function parsePT2MusicEntry(music, sectionMeta, offsetSeconds) {
  const fallbackBpm = sectionMeta && sectionMeta.fallbackBpm;
  const fallbackBaseBeats = sectionMeta && sectionMeta.fallbackBaseBeats;
  const bpm = resolvePT2SectionBpm(music, fallbackBpm);
  const baseBeats = resolvePT2SectionBaseBeats(music, fallbackBaseBeats);
  const musicId = sectionMeta && sectionMeta.id;
  const songIndex = sectionMeta && sectionMeta.songIndex;
  const scores = Array.isArray(music.scores) ? music.scores : [];
  const instruments = Array.isArray(music.instruments) ? music.instruments : [];
  const alternatives = Array.isArray(music.alternatives) ? music.alternatives : [];
  const events = [];
  let songEndBeats = 0;

  scores.forEach((score, trackIndex) => {
    const tokens = splitPT2TopLevel(String(score || ''));
    let cursorBeats = 0;
    const trackInstrument = instruments[trackIndex] || alternatives[trackIndex] || instruments[0] || 'piano';

    tokens.forEach((rawToken) => {
      const token = rawToken.trim();
      if (!token) return;

      // Detect PT2 space/rest tokens: bare uppercase letters Q-Y without brackets
      if (!token.includes('[') && !token.includes('<') && !token.includes('(') && PT2_SPACE_WEIGHTS[token] !== undefined) {
        const spaceBeats = baseBeats * PT2_SPACE_WEIGHTS[token];
        const durationSeconds = spaceBeats * (60 / bpm);
        events.push({
          raw: token,
          musicId,
          songIndex,
          trackIndex,
          trackInstrument,
          startBeats: cursorBeats,
          startSeconds: offsetSeconds + (cursorBeats * (60 / bpm)),
          durationBeats: spaceBeats,
          durationSeconds,
          noteCount: 0,
          tileType: 'rest',
          specialId: 0,
          notes: [],
          specialType: '',
          bpm,
          baseBeats,
          isRest: true
        });
        cursorBeats += spaceBeats;
        if (cursorBeats > songEndBeats) songEndBeats = cursorBeats;
        return;
      }

      const parsedToken = parsePT2NoteGroupToken(token);
      if (!parsedToken) return;

      const durationRatio = parsedToken.durationRatio;
      const noteGroups = parsedToken.notes;
      const isRest = parsedToken.noteCount === 0 && noteGroups.length === 0;
      const specialType = parsedToken.specialType;
      const durationBeats = baseBeats * durationRatio;
      const durationSeconds = durationBeats * (60 / bpm);
      const noteCount = parsedToken.noteCount || noteGroups.length || 1;
      const tileType = classifyPT2Tile(noteCount, durationRatio, specialType, durationBeats, baseBeats);

      if (!isRest) {
        // Check if notes have arpeggio operators AND the token has parentheses
        // (i.e. the arpeggio group is inside circle brackets like (c~d~e)[L])
        const hasArpeggio = noteGroups.some(note => note.arpeggioOperator);
        const tokenHasCircleBrackets = token.trimStart().startsWith('(');

        if (hasArpeggio && noteGroups.length > 1 && tokenHasCircleBrackets) {
          // Arpeggio in circle brackets → ONE long tile event.
          // Build per-note delays for sequential audio playback.
          const arpeggioNotes = [];
          let cumulativeDelay = 0;
          noteGroups.forEach((note, index) => {
            const operator = note.arpeggioOperator || '';
            const operatorCount = note.arpeggioOperatorCount || 0;
            if (operator && index > 0) {
              const delay = calculateArpeggioDelay(operator, operatorCount, durationSeconds);
              cumulativeDelay += delay;
            }
            arpeggioNotes.push({
              ...note,
              arpeggioDelay: cumulativeDelay
            });
          });

          events.push({
            raw: token,
            musicId,
            songIndex,
            trackIndex,
            trackInstrument,
            startBeats: cursorBeats,
            startSeconds: offsetSeconds + (cursorBeats * (60 / bpm)),
            durationBeats,
            durationSeconds,
            noteCount,
            tileType: 'long',
            specialId: parsedToken.specialId,
            notes: arpeggioNotes,
            specialType,
            bpm,
            baseBeats,
            durationRatio,
            isArpeggio: true
          });
        } else if (hasArpeggio && noteGroups.length > 1) {
          // Arpeggio WITHOUT circle brackets → separate tile events with delays (old behavior)
          let arpeggioDelay = 0;
          noteGroups.forEach((note, index) => {
            const operator = note.arpeggioOperator || '';
            const operatorCount = note.arpeggioOperatorCount || 0;

            if (operator && index > 0) {
              const delay = calculateArpeggioDelay(operator, operatorCount, durationSeconds);
              arpeggioDelay += delay;
            }

            events.push({
              raw: note.raw || token,
              musicId,
              songIndex,
              trackIndex,
              trackInstrument,
              startBeats: cursorBeats + (arpeggioDelay * bpm / 60),
              startSeconds: offsetSeconds + (cursorBeats * (60 / bpm)) + arpeggioDelay,
              durationBeats: durationBeats / noteGroups.length,
              durationSeconds: durationSeconds / noteGroups.length,
              noteCount: 1,
              tileType: 'single',
              specialId: parsedToken.specialId,
              notes: [note],
              specialType: '',
              bpm,
              baseBeats,
              durationRatio: durationRatio / noteGroups.length,
              isArpeggio: true,
              arpeggioOperator: operator
            });
          });
        } else {
          // Single event for non-arpeggio notes
          events.push({
            raw: token,
            musicId,
            songIndex,
            trackIndex,
            trackInstrument,
            startBeats: cursorBeats,
            startSeconds: offsetSeconds + (cursorBeats * (60 / bpm)),
            durationBeats,
            durationSeconds,
            noteCount,
            tileType,
            specialId: parsedToken.specialId,
            notes: noteGroups,
            specialType,
            bpm,
            baseBeats,
            durationRatio
          });
        }
      }

      cursorBeats += durationBeats;
      if (cursorBeats > songEndBeats) {
        songEndBeats = cursorBeats;
      }
    });
  });

  return {
    id: musicId,
    songIndex,
    bpm,
    baseBeats,
    events,
    durationSeconds: songEndBeats * (60 / bpm),
    instruments,
    alternatives
  };
}

function parsePT2SongData(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('PT2 JSON must be an object.');
  }

  const musics = Array.isArray(jsonData.musics) ? jsonData.musics : [];
  if (!musics.length) {
    throw new Error('PT2 JSON is missing a musics array.');
  }

  const rootBaseBpm = parseFloat(jsonData.baseBpm);
  const sortedMusics = sortPT2MusicsById(musics);
  const events = [];
  const entries = [];
  let songOffsetSeconds = 0;

  sortedMusics.forEach((music, songIndex) => {
    const parsedId = parseInt(music && music.id, 10);
    const sectionId = Number.isFinite(parsedId) ? parsedId : songIndex + 1;
    const parsedMusic = parsePT2MusicEntry(music, {
      id: sectionId,
      songIndex,
      fallbackBpm: rootBaseBpm,
      fallbackBaseBeats: sortedMusics[0] ? resolvePT2SectionBaseBeats(sortedMusics[0], 1) : 1
    }, songOffsetSeconds);

    entries.push({
      id: sectionId,
      songIndex,
      bpm: parsedMusic.bpm,
      baseBeats: parsedMusic.baseBeats,
      speed: computePT2TilesPerSecond(parsedMusic.bpm, parsedMusic.baseBeats),
      startSeconds: songOffsetSeconds,
      instruments: parsedMusic.instruments,
      alternatives: parsedMusic.alternatives,
      durationSeconds: parsedMusic.durationSeconds,
      scores: Array.isArray(music.scores) ? [...music.scores] : []
    });
    events.push(...parsedMusic.events);
    songOffsetSeconds += parsedMusic.durationSeconds;
  });

  entries.forEach((entry, index) => {
    entry.endSeconds = entry.startSeconds + entry.durationSeconds;
    entry.index = index;
  });

  events.sort((a, b) => {
    if (a.startSeconds !== b.startSeconds) return a.startSeconds - b.startSeconds;
    if (a.songIndex !== b.songIndex) return a.songIndex - b.songIndex;
    if (a.trackIndex !== b.trackIndex) return a.trackIndex - b.trackIndex;
    return a.startBeats - b.startBeats;
  });

  const playableEvents = mergePT2Events(events);
  const totalDurationSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const firstEntry = entries[0] || null;

  const song = {
    title: sortedMusics.length === 1 && sortedMusics[0].id ? `Music ${sortedMusics[0].id}` : 'Imported PT2 song',
    bpm: firstEntry ? firstEntry.bpm : resolvePT2SectionBpm(null, rootBaseBpm),
    baseBeats: firstEntry ? firstEntry.baseBeats : 1,
    trackCount: entries.reduce((sum, entry) => sum + (entry.instruments ? entry.instruments.length : 0), 0),
    musicCount: sortedMusics.length,
    entries,
    events,
    playableEvents,
    durationSeconds: totalDurationSeconds,
    instruments: firstEntry ? firstEntry.instruments : [],
    alternatives: firstEntry ? firstEntry.alternatives : [],
    baseBpm: Number.isFinite(rootBaseBpm) && rootBaseBpm > 0 ? rootBaseBpm : (firstEntry ? firstEntry.bpm : 120)
  };

  song.speedSchedule = buildImportedSongSpeedSchedule(song);
  return song;
}

function buildImportedSongSection(song, selectedIndex = 0) {
  if (!song || !Array.isArray(song.entries) || !song.entries.length) {
    return null;
  }

  const safeIndex = Math.min(Math.max(0, selectedIndex | 0), song.entries.length - 1);
  const sourceEntry = song.entries[safeIndex];
  if (!sourceEntry) {
    return null;
  }

  const sectionStartSeconds = Number.isFinite(sourceEntry.startSeconds) ? sourceEntry.startSeconds : 0;
  const sectionEvents = (Array.isArray(song.events) ? song.events : [])
    .filter((event) => event.songIndex === sourceEntry.songIndex)
    .map((event) => ({
      ...event,
      songIndex: 0,
      startSeconds: Math.max(0, event.startSeconds - sectionStartSeconds)
    }))
    .sort((a, b) => {
      if (a.startSeconds !== b.startSeconds) return a.startSeconds - b.startSeconds;
      if (a.trackIndex !== b.trackIndex) return a.trackIndex - b.trackIndex;
      return a.startBeats - b.startBeats;
    });

  const sectionEntry = {
    ...sourceEntry,
    songIndex: 0,
    startSeconds: 0,
    endSeconds: sourceEntry.durationSeconds,
    index: 0,
    scores: Array.isArray(sourceEntry.scores) ? [...sourceEntry.scores] : []
  };

  const sectionSong = {
    title: sourceEntry.id ? `Music ${sourceEntry.id}` : 'Imported PT2 song',
    bpm: sourceEntry.bpm,
    baseBeats: sourceEntry.baseBeats,
    trackCount: sourceEntry.instruments ? sourceEntry.instruments.length : 0,
    musicCount: 1,
    entries: [sectionEntry],
    events: sectionEvents,
    playableEvents: mergePT2Events(sectionEvents),
    durationSeconds: sourceEntry.durationSeconds,
    instruments: sourceEntry.instruments || [],
    alternatives: sourceEntry.alternatives || [],
    baseBpm: Number.isFinite(song.baseBpm) && song.baseBpm > 0 ? song.baseBpm : sourceEntry.bpm
  };

  sectionSong.speedSchedule = buildImportedSongSpeedSchedule(sectionSong);
  return sectionSong;
}

function buildImportedSongTiles(song) {
  const playableEvents = Array.isArray(song.playableEvents) ? song.playableEvents : song.events;
  const builtTiles = [];
  const startTileY = 50;
  const firstEventY = 25;
  const sectionRowOffsets = buildImportedSectionRowOffsets(song);
  let previousTimingRows = null;
  let previousDurationRows = 0;
  let previousVisualRows = 1;
  let layoutRows = 0;
  lastSpawnedCols = [];

  builtTiles.push({
    id: nextTileId++,
    col: 1,
    y: startTileY,
    type: 'single',
    clicked: false,
    isStart: true,
    fromImportedSong: true,
    startSeconds: 0,
    durationSeconds: 0,
    notes: [],
    trackInstrument: 'piano',
    audioPlayed: false
  });

  playableEvents.forEach((event) => {
    const tileType = event.tileType || 'single';
    const isRest = tileType === 'rest' || event.isRest;
    const isLong = tileType === 'long';
    const isCombo = tileType === 'combo';
    const isDouble = tileType === 'double';
    const isArpeggio = isLong && event.isArpeggio;
    const tileLength = isLong
      ? getImportedTileLengthRows(event, !isArpeggio)
      : (isCombo ? 2 : 1);
    const timingRows = getImportedEventStartRows(event, sectionRowOffsets);
    const durationRows = getImportedEventDurationRows(event);

    if (previousTimingRows === null) {
      layoutRows = Math.max(0, timingRows);
    } else {
      const timingDeltaRows = Math.max(0, timingRows - previousTimingRows);
      const blankRows = Math.max(0, timingDeltaRows - previousDurationRows);
      layoutRows += previousVisualRows + blankRows;
    }

    // Skip tile creation for rest events, but add their duration to the layout
    if (isRest) {
      layoutRows += durationRows;
      previousTimingRows = timingRows;
      previousDurationRows = durationRows;
      previousVisualRows = 0;
      return;
    }

    const eventY = firstEventY - (layoutRows * 25);
    const chosenCols = pickColumnsForImportedTile(tileType, event.noteCount || 1);
    const sourceEventKey = getImportedEventKey(event);
    const sourceNoteNames = getImportedEventNoteNames(event);

    if (isDouble) {
      // Double tiles: spawn two single tiles at the same Y in different columns
      chosenCols.forEach((col) => {
        builtTiles.push({
          id: nextTileId++,
          col: col,
          y: eventY,
          type: 'single',
          clicked: false,
          isStart: false,
          fromImportedSong: true,
          startSeconds: event.startSeconds,
          durationSeconds: event.durationSeconds,
          durationBeats: event.durationBeats,
          notes: event.notes,
          trackInstrument: event.trackInstrument,
          chordSize: event.notes.length,
          sourceEventKey,
          sourceSectionId: event.musicId,
          sourceRaw: event.raw,
          sourceNoteNames,
          audioPlayed: false
        });
      });
      lastSpawnedCols = chosenCols;
    } else if (isCombo) {
      // Combo tiles: span two columns, require multiple taps
      const comboTaps = Math.max(2, event.noteCount || event.notes.length || 3);
      builtTiles.push({
        id: nextTileId++,
        col: 1,
        y: eventY - (tileLength - 1) * 25,
        type: 'combo',
        clicked: false,
        isStart: false,
        fromImportedSong: true,
        startSeconds: event.startSeconds,
        durationSeconds: event.durationSeconds,
        durationBeats: event.durationBeats,
        notes: event.notes,
        trackInstrument: event.trackInstrument,
        chordSize: event.notes.length,
        sourceEventKey,
        sourceSectionId: event.musicId,
        sourceRaw: event.raw,
        sourceNoteNames,
        audioPlayed: false,
        taps: comboTaps,
        remainingTaps: comboTaps,
        spanCols: [1, 2]
      });
      lastSpawnedCols = [1, 2];
    } else if (isLong) {
      // Long/hold tiles (including arpeggio long tiles)
      const chosenCol = chosenCols[0];
      builtTiles.push({
        id: nextTileId++,
        col: chosenCol,
        y: eventY - (tileLength - 1) * 25,
        type: 'long',
        clicked: false,
        isStart: false,
        fromImportedSong: true,
        startSeconds: event.startSeconds,
        durationSeconds: event.durationSeconds,
        durationBeats: event.durationBeats,
        notes: event.notes,
        trackInstrument: event.trackInstrument,
        chordSize: event.notes.length,
        sourceEventKey,
        sourceSectionId: event.musicId,
        sourceRaw: event.raw,
        sourceNoteNames,
        audioPlayed: false,
        length: tileLength,
        held: false,
        holdProgress: 0,
        holdCompleted: false,
        tapped: false,
        pressY: undefined,
        isArpeggio: event.isArpeggio || false
      });
      lastSpawnedCols = [chosenCol];
    } else {
      // Single tiles (default)
      const chosenCol = chosenCols[0];
      builtTiles.push({
        id: nextTileId++,
        col: chosenCol,
        y: eventY,
        type: 'single',
        clicked: false,
        isStart: false,
        fromImportedSong: true,
        startSeconds: event.startSeconds,
        durationSeconds: event.durationSeconds,
        durationBeats: event.durationBeats,
        notes: event.notes,
        trackInstrument: event.trackInstrument,
        chordSize: event.notes.length,
        sourceEventKey,
        sourceSectionId: event.musicId,
        sourceRaw: event.raw,
        sourceNoteNames,
        audioPlayed: false
      });
      lastSpawnedCols = [chosenCol];
    }

    previousTimingRows = timingRows;
    previousDurationRows = durationRows;
    previousVisualRows = tileLength;
  });

  return builtTiles;
}

function formatPT2SectionSpeedSummary(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => `id ${entry.id}: ${entry.bpm} BPM / ${entry.baseBeats} bb = ${entry.speed.toFixed(3)} t/s`)
    .join(' · ');
}

function loadImportedSongFromJsonText(text, label = 'Imported PT2 file') {
  const parsed = JSON.parse(text);
  const song = parsePT2SongData(parsed);
  importedSongRawText = text;
  importedSong = song;
  importedSongs = Array.isArray(song.entries) ? song.entries : [];
  selectedImportedSongIndex = 0;
  importedSongLabel = label;
  importedSongTitle = song.title;
  importedSongDurationSeconds = song.durationSeconds;
  importedSongSpeedSchedule = song.speedSchedule || buildImportedSongSpeedSchedule(song);
  importedSongBaseSpeed = importedSongSpeedSchedule[0]
    ? importedSongSpeedSchedule[0].speed
    : computePT2TilesPerSecond(song.bpm, song.baseBeats);
  importedSongSpeedLocked = true;
  importedSongElapsedSeconds = 0;
  importedSongTiles = [];
  importedSongAudioEvents = [];
  if (pt2MusicSelect) {
    pt2MusicSelect.innerHTML = '';
    importedSongs.forEach((entry, idx) => {
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = `id ${entry.id} · ${entry.bpm} BPM · ${entry.baseBeats} bb · ${entry.speed.toFixed(3)} t/s · ${entry.durationSeconds.toFixed(1)}s`;
      pt2MusicSelect.appendChild(option);
    });
    pt2MusicSelect.disabled = importedSongs.length <= 1;
    pt2MusicSelect.value = '0';
  }
  setSongStatus(`Loaded ${label}: ${importedSongs.length} section(s) by id — ${formatPT2SectionSpeedSummary(importedSongs)}.`);
  buildDebugPanels(song);
  scheduleImportedSongAudio(song);
  return song;
}

function scheduleImportedSongAudio(song) {
  ensureAudioEngine();
  ensureSoundfontInstrument();
}

// Initial load updates
loadSettings();
updateKeybindHints();
updateBestScoreDisplay();
clearImportedSong();

if (pt2JsonInput) {
  pt2JsonInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      loadImportedSongFromJsonText(text, file.name);
    } catch (err) {
      clearImportedSong();
      setSongStatus(`Failed to load ${file.name}: ${err.message}`);
    }
  });
}

if (loadSampleJsonBtn) {
  loadSampleJsonBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('Horseman.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      loadImportedSongFromJsonText(text, 'Horseman.json');
    } catch (err) {
      setSongStatus(`Could not load Horseman.json automatically: ${err.message}`);
    }
  });
}

if (clearSongBtn) {
  clearSongBtn.addEventListener('click', () => {
    clearImportedSong();
    if (pt2JsonInput) {
      pt2JsonInput.value = '';
    }
  });
}

if (pt2MusicSelect) {
  pt2MusicSelect.addEventListener('change', () => {
    selectedImportedSongIndex = parseInt(pt2MusicSelect.value, 10) || 0;
    const entry = importedSongs[selectedImportedSongIndex];
    if (entry) {
      setSongStatus(`Section id ${entry.id}: ${entry.bpm} BPM, ${entry.baseBeats} baseBeats → ${entry.speed.toFixed(3)} t/s (${entry.durationSeconds.toFixed(1)}s segment).`);
    }
  });
}

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

  ensureAudioEngine();

  // Reset state
  gameActive = true;
  gameStarted = false;
  timeElapsed = 0;
  
  const useImportedSong = !!importedSong;
  const startSpeed = useImportedSong
    ? (importedSongSpeedSchedule[0] ? importedSongSpeedSchedule[0].speed : getStartSpeed())
    : getStartSpeed();
  currentSpeed = startSpeed;
  
  updateHUD(currentSpeed);

  tilesContainer.style.transition = 'none';
  tilesContainer.style.transform = 'none';
  tilesContainer.innerHTML = '';
  hitEffectsEl.innerHTML = '';
  tiles = [];
  nextTileId = 0;
  activeKeys = { 0: false, 1: false, 2: false, 3: false };

  if (useImportedSong) {
    ensureSoundfontInstrument();
    frozenSpeed = null;
    importedSongElapsedSeconds = 0;
    lastSpawnY = 50;
    lastSpawnedCols = [];
    tiles = buildImportedSongTiles(importedSong);
    importedSongTiles = tiles;
    updateDebugCurrentSection();
  } else {
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
      if (importedSong && matchingTile.isStart) {
        ensureAudioEngine();
      }
    }

    if (matchingTile.fromImportedSong) {
      updateDebugLastPlayedState(matchingTile);
    }

    playHitAnimation(colIdx, hitContext, matchingTile);
    
    if (matchingTile.type === 'single') {
      matchingTile.clicked = true;
      playClickVisual(matchingTile.id);
      if (matchingTile.fromImportedSong) {
        playImportedTileAudio(matchingTile);
      }
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
      if (matchingTile.fromImportedSong) {
        playImportedTileAudio(matchingTile);
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
    const importedMode = !!importedSong;
    const startSpeed = importedMode ? getImportedSongSpeedAt(0) : getStartSpeed();
    const accel = parseFloat(inputAccel.value) || 0.07;
    const comboInSlowdown = importedMode ? null : getComboInSlowdownPhase();
    let effectiveSpeed;

    if (importedMode) {
      importedSongElapsedSeconds += dt;
      currentSpeed = getImportedSongSpeedAt(importedSongElapsedSeconds);
      effectiveSpeed = currentSpeed;
      updateDebugCurrentSection();
    } else if (comboInSlowdown && frozenSpeed !== null) {
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

    if (!importedMode) {
      lastSpawnY += movement;

      // Keep spawning tiles using the independent lastSpawnY tracker
      while (lastSpawnY > -25) {
        lastSpawnY = lastSpawnY - spawnPatternRow(lastSpawnY) * 25;
      }
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
