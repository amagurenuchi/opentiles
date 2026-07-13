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
const tpsDisplayNormal = document.getElementById('tps-display-normal');
const tpsDisplayChallenge = document.getElementById('tps-display-challenge');
const starsDisplay = document.getElementById('stars-display');
const crownsDisplay = document.getElementById('crowns-display');
const bestDisplay = document.getElementById('best-display');
const startScreen = document.getElementById('start-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const songListScreen = document.getElementById('song-list-screen');
const challengesScreen = document.getElementById('challenges-screen');
const pauseScreen = document.getElementById('pause-screen');
const songListContainer = document.getElementById('song-list-container');
const challengesContainer = document.getElementById('challenges-container');
const songStatusEl = document.getElementById('song-status');
const pt2JsonInput = document.getElementById('pt2-json-input');
const pt2MusicSelect = document.getElementById('pt2-music-select');
const loadSampleJsonBtn = document.getElementById('load-sample-json-btn');
const clearSongBtn = document.getElementById('clear-song-btn');
const autoplayToggle = document.getElementById('settings-autoplay');
const reviveSlowdownToggle = document.getElementById('settings-revive-slowdown');
const customSpeedInput = document.getElementById('settings-custom-speed');
const customSpeedDisplay = document.getElementById('custom-speed-display');
const customSongUpload = document.getElementById('custom-song-upload');
const customSongStatus = document.getElementById('custom-song-status');
const bpmModal = document.getElementById('bpm-modal');
const closeBpmModalBtn = document.getElementById('close-bpm-modal-btn');
const colElements = Array.from(document.querySelectorAll('.col-element'));
const keyHintEls = Array.from(document.querySelectorAll('.key-hint'));
const gameBoardWrapper = document.getElementById('game-board-wrapper');
const playerNameDisplay = document.getElementById('player-name-display');
const playerNameText = document.getElementById('player-name-text');
const pPointsDisplay = document.getElementById('p-points-display');
const totalCrownsDisplay = document.getElementById('total-crowns');
const totalStarsDisplay = document.getElementById('total-stars');
const homeScreen = document.getElementById('home-screen');
const loadingScreen = document.getElementById('loading-screen');
const welcomeSongTitle = document.getElementById('welcome-song-title');
const welcomePlayBtn = document.getElementById('welcome-play-btn');
const favouriteSongsContainer = document.getElementById('favourite-songs-container');
const dockHomeBtn = document.getElementById('dock-home-btn');
const dockMusicBtn = document.getElementById('dock-music-btn');
const dockChallengesBtn = document.getElementById('dock-challenges-btn');
const dockSettingsBtn = document.getElementById('dock-settings-btn');
const lifeModal = document.getElementById('life-modal');
const lifeModalCount = document.getElementById('life-modal-count');
const lifeModalTimer = document.getElementById('life-modal-timer');
const lifeModalCloseBtn = document.getElementById('life-modal-close-btn');
const reviveModal = document.getElementById('revive-modal');
const lifeDisplayTriggers = Array.from(document.querySelectorAll('.life-display-trigger'));
const lifePurchaseButtons = Array.from(document.querySelectorAll('.life-purchase-row'));
const lifeCountEls = [
  document.getElementById('life-count'),
  lifeModalCount
].filter(Boolean);
const lifeTimerEls = [
  document.getElementById('life-timer')
].filter(Boolean);
let currentDockTab = 'home';
let previousDockTabBeforeSettings = 'home';

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
const menuLoopPatternText = '#f2,g2,a2,a2,b2,a2,d2,e2,e2,#f2,e2,#f2,g2,a2,a2,b2,a2,U;d2,b2,a2,#f2,g2,#f2,d2,e2,a2,d2,b2,a2,d2;e2,#f2,e2';
let menuLoopPatternNotes = [];
let menuLoopPatternIndex = 0;
let lastMenuCueTime = 0;
let pausedWasStarted = false;

let musicCsvData = [];
let selectedSongData = null;
let lastLoadedJsonText = '';
let lastLoadedLabel = '';
let isPlayInProgress = false;

let highScore = parseFloat(localStorage.getItem('opentile_highscore') || '0');
let keybinds = JSON.parse(localStorage.getItem('opentile_keybinds') || '["KeyD","KeyF","KeyJ","KeyK"]');
let autoplayEnabled = localStorage.getItem('opentile_autoplay') === 'true';
let reviveSlowdownEnabled = localStorage.getItem('opentile_revive_slowdown') !== 'false'; // default true
let isReviveSlowdownActive = false;
let reviveSlowdownStartTime = 0;
let playerName = localStorage.getItem('opentile_playername') || 'Player';
let lastPlayedSong = localStorage.getItem('opentile_last_played') || null;
let favouriteSongs = new Set(JSON.parse(localStorage.getItem('opentile_favourites') || '[]'));
let customStartingSpeed = parseInt(localStorage.getItem('opentile_custom_speed') || '0', 10); // 0 = disabled, direct t/s value
let customSongData = null;
let customSongLabel = '';
let key = 4;
let songName = '';
let sheet = [];
let info = [];
let getSpeed = () => ({ bpm: 120, beats: 0.5 });
let currentBpm = 120;
let currentBeats = 0.5;
let currentSectionIndex = 0;
let currentSectionTileIndex = 0;
let songLoopCount = 0;
let currentScore = 0;
let starthpos = key - 2;
let hpos = 0;
let visualHposOffset = 0; // accumulated compression from combo tiles (hlen - 2 each)
let preslowdownBpm = 0;   // BPM before combo slowdown multiplier, used for TPS display
let cachedActiveComboTile = null; // updated once per frame, shared by engine + HUD
let bgLevel = 1;
let bgLevelPos = [];
let speedLevel = 1;
let speedLevelPos = [];
let normalSongAwardLevel = 1;
let warr = new Array(key).fill(0);
let accompanimentLongColumn = null;
let accompanimentSingleToggle = 0;
let accompanimentSequenceActive = false;
let accompanimentSequenceId = 0;
let activeAccompanimentSequenceId = null;
let tiles = [];
let reviveCountdownInterval = null;
let reviveCountdownRemaining = 0;
const REVIVE_COUNTDOWN_SECONDS = 10;
// Cumulative score estimates at each section boundary (index = normalSongAwardLevel that fires).
// Computed from the sheet data right after song load.
let sectionScoreThresholds = [];

// Challenge mode variables
let isChallengeMode = false;
let challengeAcceleration = 0;
let challengeLastAccelerationTime = 0;
let challengeBpmOffset = 0;
let challengeBaseBpm = 120;
let challengeBaseBeats = 0.5;
let challengeStartTime = 0;

let isAwardAnimationRunning = false;
let awardAnimationTimeout = null;
let lastHudRewardState = null;
let lastAnimatedRewardTier = 0;

function clearAwardAnimation() {
  if (awardAnimationTimeout) {
    clearTimeout(awardAnimationTimeout);
    awardAnimationTimeout = null;
  }
  isAwardAnimationRunning = false;
  const starAnim = document.getElementById('star-animation-display');
  const crownAnim = document.getElementById('crown-animation-display');
  starAnim?.classList.add('hidden');
  crownAnim?.classList.add('hidden');
}

function shouldShowRewardAnimationForTier(currentTier) {
  if (currentTier <= 0) return false;
  if (lastAnimatedRewardTier === currentTier) return false;
  lastAnimatedRewardTier = currentTier;
  return true;
}

function triggerAwardAnimation(stage) {
  isAwardAnimationRunning = true;
  if (awardAnimationTimeout) clearTimeout(awardAnimationTimeout);

  const starAnim = document.getElementById('star-animation-display');
  const crownAnim = document.getElementById('crown-animation-display');

  if (stage.crowns) {
    crownAnim.innerHTML = '<img src="gameImage/crown.png" class="inline-block w-16 h-auto sm:w-20 mr-2 drop-shadow-md">'.repeat(stage.crowns);
    crownAnim.classList.remove('hidden');
    starAnim.classList.add('hidden');
  } else {
    starAnim.innerHTML = stage.stars ? '<img src="gameImage/star.png" class="inline-block w-16 h-auto sm:w-20 mr-2 drop-shadow-md">'.repeat(stage.stars) : '';
    starAnim.classList.remove('hidden');
    crownAnim.classList.add('hidden');
  }
  
  awardAnimationTimeout = setTimeout(() => {
    clearAwardAnimation();
  }, 500);
}
let hasStartedGameplay = false;

// Classic mode variables
let isClassicMode = false;
let classicTimer = 30;
let classicTimerDuration = 30;
let classicTimerStartedAt = 0;
let classicTimerInterval = null;
let classicSongQueue = [];
let classicCurrentSongIndex = 0;
let classicTappedTiles = 0;
let classicScrollTarget = 0;
let classicTimerEnding = false;
let preserveCurrentSpeedOnNextFrame = false;
let pausedSpeedBpm = 120;
let pausedSpeedBeats = 0.5;
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
let currentGameplayBackgroundIndex = 1;
let gameplayBackgroundTransitionTimeout = null;
let gameplayBackgroundTransitionTargetIndex = null;
const LIFE_MAX = 9999;
const LIFE_REGEN_STOP_THRESHOLD = 30;
const LIFE_REGEN_INTERVAL_MS = 5 * 60 * 1000;
let spentPPoints = parseInt(localStorage.getItem('opentile_spent_ppoints') || '0', 10);
let lifeCount = parseInt(localStorage.getItem('opentile_life_count') || '21', 10);
let lifeLastUpdatedAt = parseInt(localStorage.getItem('opentile_life_last_updated_at') || String(Date.now()), 10);
let lifeUiIntervalId = 0;
const MAX_REVIVES_PER_RUN = 3;
let reviveRemaining = MAX_REVIVES_PER_RUN;
let revivePendingFailure = false;
let revivePendingType = null;
let revivePendingTile = null;
let revivePendingColIdx = null;

function isTouchDevice() {
  return typeof window !== 'undefined' && (
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0 ||
    'ontouchstart' in window
  );
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function saveLifeState() {
  localStorage.setItem('opentile_life_count', String(lifeCount));
  localStorage.setItem('opentile_life_last_updated_at', String(lifeLastUpdatedAt));
}

function calculateEarnedPPoints() {
  let totalStars = 0;
  let totalCrowns = 0;

  musicCsvData.forEach((song) => {
    const bestLevel = parseInt(localStorage.getItem(`opentile_highscore_level_${song.mid}`) || '0', 10);
    const stage = getStarAndCrownState(bestLevel - 1);
    totalStars += stage.stars;
    totalCrowns += stage.crowns;
  });

  return {
    totalStars,
    totalCrowns,
    earnedPPoints: totalStars + (totalCrowns * 5)
  };
}

function getAvailablePPoints() {
  const { earnedPPoints } = calculateEarnedPPoints();
  return Math.max(0, earnedPPoints - spentPPoints);
}

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function normalizeLifeState(now = Date.now()) {
  if (!Number.isFinite(lifeCount)) lifeCount = 21;
  if (!Number.isFinite(lifeLastUpdatedAt)) lifeLastUpdatedAt = now;

  lifeCount = clampNumber(lifeCount, 0, LIFE_MAX);

  if (lifeCount > LIFE_REGEN_STOP_THRESHOLD) {
    lifeLastUpdatedAt = now;
    saveLifeState();
    return;
  }

  if (lifeCount >= LIFE_MAX) {
    lifeLastUpdatedAt = now;
    saveLifeState();
    return;
  }

  const elapsed = Math.max(0, now - lifeLastUpdatedAt);
  const regeneratedLives = Math.floor(elapsed / LIFE_REGEN_INTERVAL_MS);

  if (regeneratedLives > 0) {
    lifeCount = clampNumber(lifeCount + regeneratedLives, 0, LIFE_MAX);
    if (lifeCount >= LIFE_MAX) {
      lifeLastUpdatedAt = now;
    } else {
      lifeLastUpdatedAt += regeneratedLives * LIFE_REGEN_INTERVAL_MS;
    }
    saveLifeState();
  }
}

function getLifeTimeRemaining(now = Date.now()) {
  normalizeLifeState(now);
  if (lifeCount > LIFE_REGEN_STOP_THRESHOLD) return 0;
  if (lifeCount >= LIFE_MAX) return 0;
  return LIFE_REGEN_INTERVAL_MS - Math.max(0, now - lifeLastUpdatedAt);
}

function updateLifePurchaseButtons() {
  const availablePPoints = getAvailablePPoints();
  lifePurchaseButtons.forEach((button) => {
    const cost = parseInt(button.dataset.lifeCost || '0', 10);
    const canAfford = availablePPoints >= cost;
    button.disabled = !canAfford;
    button.setAttribute('aria-disabled', String(!canAfford));
    button.title = canAfford ? '' : `Need ${cost - availablePPoints} more P-Points`;
  });
}

function updateLifeUi() {
  const now = Date.now();
  normalizeLifeState(now);
  const isLifeFull = lifeCount > LIFE_REGEN_STOP_THRESHOLD || lifeCount >= LIFE_MAX;
  const timerText = isLifeFull ? '' : formatCountdown(getLifeTimeRemaining(now));

  lifeCountEls.forEach((el) => {
    el.textContent = String(lifeCount);
  });

  lifeTimerEls.forEach((el) => {
    el.textContent = timerText;
    el.style.display = timerText ? '' : 'none';
  });

  if (lifeModalTimer) {
    lifeModalTimer.textContent = timerText ? `Time to next life: ${timerText}` : '';
    lifeModalTimer.style.display = timerText ? '' : 'none';
  }

  updateLifePurchaseButtons();
}

function getVisibleLifeDisplayTrigger() {
  return lifeDisplayTriggers.find((trigger) => trigger.getClientRects().length > 0);
}

function createFloatingHeart(rect, extraClass = '') {
  const heart = document.createElement('div');
  heart.className = `life-fly-heart ${extraClass}`.trim();
  heart.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
    </svg>
  `;
  heart.style.left = `${rect.left + rect.width / 2}px`;
  heart.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(heart);
  return heart;
}

function animateFloatingHeart(heart, deltaX, deltaY, scale = 0.7, duration = 1000) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      heart.classList.add('is-animating');
      heart.style.transitionDuration = `${duration}ms`;
      heart.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
      heart.style.opacity = '0';
    });

    window.setTimeout(() => {
      heart.remove();
      resolve();
    }, duration);
  });
}

function animateLifeSpendFromTopBar() {
  const trigger = getVisibleLifeDisplayTrigger();
  const source = trigger?.querySelector('.life-display-icon');
  if (!source) return;

  const heart = createFloatingHeart(source.getBoundingClientRect(), 'life-fly-heart-spend');
  void animateFloatingHeart(heart, 0, 120, 0.7, 1000);
}

function animatePurchasedLives(button, duration = 1000) {
  const target = document.querySelector('.life-display-counter-only .life-display-icon') || lifeModalCount;
  if (!button || !target) {
    return Promise.resolve();
  }

  const targetRect = target.getBoundingClientRect();
  const heartSources = Array.from(button.querySelectorAll('.life-pack-heart'));
  const starts = heartSources.length ? heartSources : [button.querySelector('.life-purchase-pack')].filter(Boolean);

  return Promise.all(starts.map((source, index) => {
    const startRect = source.getBoundingClientRect();
    const heart = createFloatingHeart(startRect, 'life-fly-heart-buy');
    const deltaX = (targetRect.left + targetRect.width / 2) - (startRect.left + startRect.width / 2) + (index - (starts.length - 1) / 2) * 6;
    const deltaY = (targetRect.top + targetRect.height / 2) - (startRect.top + startRect.height / 2);
    return animateFloatingHeart(heart, deltaX, deltaY, 0.55, duration);
  })).then(() => undefined);
}

function openLifeModal() {
  if (!lifeModal) return;
  updateLifeUi();
  lifeModal.classList.remove('hidden');
  lifeModal.setAttribute('aria-hidden', 'false');
}

function closeLifeModal() {
  if (!lifeModal) return;
  lifeModal.classList.add('hidden');
  lifeModal.setAttribute('aria-hidden', 'true');
}

function clearReviveCountdown() {
  if (reviveCountdownInterval) {
    clearInterval(reviveCountdownInterval);
    reviveCountdownInterval = null;
  }
}

function updateReviveCountdownDisplay() {
  const ringTextEl = document.getElementById('revive-countdown-ring-text');
  const ringEl = document.getElementById('revive-modal-ring');
  const remaining = Math.max(0, reviveCountdownRemaining);

  // Update numeric label (no suffix)
  if (ringTextEl) ringTextEl.textContent = String(remaining);

  // Animate the conic-gradient ring: 100% when full, 0% when done
  if (ringEl) {
    const pct = (remaining / REVIVE_COUNTDOWN_SECONDS) * 100;
    ringEl.style.setProperty('--revive-progress', `${pct.toFixed(1)}%`);
    // Turn ring red in the last 3 seconds
    if (remaining <= 3) {
      ringEl.classList.add('revive-ring-warning');
    } else {
      ringEl.classList.remove('revive-ring-warning');
    }
  }
}

function updateReviveModalProgress() {
  const progressRow = document.getElementById('revive-progress-row');
  if (!progressRow) return;
  let progressHtml = '';

  if (isChallengeMode || isClassicMode) {
    progressHtml = '<div class="revive-progress-label">Resume and keep your current run.</div>';
  } else {
    const level = normalSongAwardLevel || 1;
    const currentStage = getStarAndCrownState(level - 1);

    if (currentStage.crowns === 3) {
      // 3 crowns already — compare current score to per-song best score
      const mid = selectedSongData ? String(selectedSongData.mid || selectedSongData.id || '') : '';
      const scoreKey = mid ? `opentile_best_score_${mid}` : null;
      const bestScore = scoreKey ? parseFloat(localStorage.getItem(scoreKey) || '0') : 0;
      const score = Number(currentScore || 0);

      if (score >= bestScore) {
        // Already beating (or matching) the best score — no target to chase
        progressHtml = '<div class="revive-progress-label">Revive now</div>';
      } else {
        const gap = bestScore - score;
        progressHtml = `
          <div class="revive-progress-icons">
            <img src="gameImage/crown.png" class="revive-progress-icon filled" alt="crown">
            <img src="gameImage/crown.png" class="revive-progress-icon filled" alt="crown">
            <img src="gameImage/crown.png" class="revive-progress-icon filled" alt="crown">
          </div>
          <div class="revive-progress-label">${gap} more points to beat your best score</div>`;
      }
    } else {
      // Determine the minimum level needed to reach the next award tier
      // Tier thresholds (normalSongAwardLevel ≥ X for tier to activate):
      //  1★ → 2 | 2★ → 3 | 3★ → 4 | 1👑 → 5 | 2👑 → 7 | 3👑 → 10
      const tierLevels = [2, 3, 4, 5, 7, 10];
      const tierStates = tierLevels.map((l) => ({ level: l, stage: getStarAndCrownState(l - 1) }));

      // Find the next tier that is better than current
      const next = tierStates.find(({ stage }) => {
        const moreCrowns = stage.crowns > currentStage.crowns;
        const moreStars = stage.crowns === 0 && currentStage.crowns === 0 && stage.stars > currentStage.stars;
        return moreCrowns || moreStars;
      });

      if (!next) {
        progressHtml = '<div class="revive-progress-label">Maximum crowns reached for this song.</div>';
      } else {
        const useCrowns = next.stage.crowns > 0;
        const iconName = useCrowns ? 'crown' : 'star';
        const iconCount = useCrowns ? next.stage.crowns : next.stage.stars;
        const score = Number(currentScore || 0);

        // next.level is the normalSongAwardLevel the player needs to reach.
        // That fires when section index (next.level - 2) is completed.
        // sectionScoreThresholds[next.level - 2] is the estimated cumulative
        // score at that boundary, computed directly from the sheet.
        const threshIdx = next.level - 2;
        let computedThreshold = (threshIdx >= 0 && threshIdx < sectionScoreThresholds.length)
          ? sectionScoreThresholds[threshIdx]
          : 0;

        // If computed threshold is not available, calculate it on the fly from sheet data
        if (computedThreshold === 0 && sheet.length > 0) {
          let runningScore = 0;
          
          // Calculate through all available sections first
          for (let s = 0; s < sheet.length; s++) {
            const section = sheet[s];
            for (const tile of section) {
              switch (tile.type) {
                case 5: runningScore += 4; break;             // combo start tile
                case 3: runningScore += Math.max(2, (tile.scores && tile.scores.length) || 2); break; // multi-tap combo
                case 6: runningScore += Math.round(tile.hlen) + 1; break; // long hold
                default: runningScore += 1; break;             // regular tap (type 2) and others
              }
            }
          }
          
          // If we need to reach a level beyond the available sections, extrapolate
          // by assuming the average score per section continues
          if (threshIdx >= sheet.length && sheet.length > 0) {
            const avgScorePerSection = runningScore / sheet.length;
            const additionalSections = threshIdx - sheet.length + 1;
            runningScore += Math.round(avgScorePerSection * additionalSections);
          }
          
          computedThreshold = runningScore;
        }

        // Also check any historically stored score for that level.
        const mid = selectedSongData ? String(selectedSongData.mid || selectedSongData.id || '') : '';
        const storedThreshold = mid
          ? parseFloat(localStorage.getItem(`opentile_score_at_level_${mid}_${next.level}`) || '0')
          : 0;

        // Prefer the lower (easier to display) of computed vs stored.
        const targetScore = computedThreshold > 0
          ? computedThreshold
          : storedThreshold;

        // Always calculate and display the point gap
        const gap = Math.max(0, Math.ceil(targetScore - score));
        const label = `${gap} more points to reach ${iconCount} ${iconName}${iconCount === 1 ? '' : 's'}`;

        const icons = Array.from({ length: 3 }, (_, i) =>
          `<img src="gameImage/${iconName}.png" class="revive-progress-icon ${i < iconCount ? 'filled' : 'unfilled'}" alt="${iconName}">`
        ).join('');
        progressHtml = `
          <div class="revive-progress-icons">${icons}</div>
          <div class="revive-progress-label">${label}</div>`;
      }
    }
  }
  progressRow.innerHTML = progressHtml;
}

function startReviveCountdown() {
  clearReviveCountdown();
  reviveCountdownRemaining = REVIVE_COUNTDOWN_SECONDS;
  // Reset ring instantly (suppress transition) then re-enable it one frame
  // later so the per-second decrements animate smoothly.
  const ringEl = document.getElementById('revive-modal-ring');
  if (ringEl) {
    ringEl.style.transition = 'none';
    ringEl.style.setProperty('--revive-progress', '100%');
    ringEl.classList.remove('revive-ring-warning');
    // Re-enable the CSS transition after the browser has painted the reset
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ringEl.style.transition = '';
      });
    });
  }
  updateReviveCountdownDisplay();
  reviveCountdownInterval = window.setInterval(() => {
    reviveCountdownRemaining -= 1;
    updateReviveCountdownDisplay();
    if (reviveCountdownRemaining <= 0) {
      clearReviveCountdown();
      if (revivePendingFailure) {
        cancelRevivePrompt();
      }
    }
  }, 1000);
}


function openReviveModal() {
  if (!reviveModal) return;
  const reviveCountEl = document.getElementById('revive-remaining-count');
  const reviveCountDuplicateEl = document.getElementById('revive-remaining-count-duplicate');
  if (reviveCountEl) reviveCountEl.textContent = String(reviveRemaining);
  if (reviveCountDuplicateEl) reviveCountDuplicateEl.textContent = String(reviveRemaining);
  updateReviveModalProgress();
  reviveModal.classList.remove('hidden');
  reviveModal.setAttribute('aria-hidden', 'false');
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }
  updatePauseButtonVisibility();
  startReviveCountdown();
}

function closeReviveModal() {
  if (!reviveModal) return;
  reviveModal.classList.add('hidden');
  reviveModal.setAttribute('aria-hidden', 'true');
  clearReviveCountdown();
}

function cancelRevivePrompt() {
  closeReviveModal();
  revivePendingFailure = false;
  revivePendingType = null;
  revivePendingTile = null;
  revivePendingColIdx = null;
  isPlayInProgress = false; // Reset play progress flag when canceling revive
  finishRun(false);
}

function resumeAfterRevive() {
  if (!revivePendingFailure) {
    closeReviveModal();
    return;
  }

  reviveRemaining = Math.max(0, reviveRemaining - 1);
  closeReviveModal();
  revivePendingFailure = false;
  revivePendingType = null;
  revivePendingColIdx = null;
  revivePendingTile = null;

  captureCurrentSpeedState();
  preserveCurrentSpeedOnNextFrame = true;
  challengeLastAccelerationTime = performance.now();
  isPaused = false;
  isStarted = false;
  hasStartedGameplay = true;
  tiles.forEach((tile) => delete tile.isStartTile);

  const nearestUntapped = getLowestManualTile();
  if (nearestUntapped) {
    resetTileForResume(nearestUntapped);
    nearestUntapped.isStartTile = true;
  }

  if (pauseScreen) {
    pauseScreen.classList.add('hidden');
  }
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }

  if (reviveSlowdownEnabled) {
    isReviveSlowdownActive = true;
    reviveSlowdownStartTime = performance.now();
  }

  updatePauseButtonVisibility();
  playMenuLoopCue();
}

function purchaseLives(amount, cost, purchaseButton = null) {
  const availablePPoints = getAvailablePPoints();
  if (availablePPoints < cost) return;

  spentPPoints += cost;
  localStorage.setItem('opentile_spent_ppoints', String(spentPPoints));

  syncTopDockData();
  updateLifeUi();

  animatePurchasedLives(purchaseButton, 1000).finally(() => {
    normalizeLifeState();
    lifeCount = clampNumber(lifeCount + amount, 0, LIFE_MAX);
    if (lifeCount > LIFE_REGEN_STOP_THRESHOLD || lifeCount >= LIFE_MAX) {
      lifeLastUpdatedAt = Date.now();
    }
    saveLifeState();
    syncTopDockData();
    updateLifeUi();
  });
}

function updatePauseButtonVisibility() {
  const pauseBtn = document.getElementById('pause-btn');
  if (!pauseBtn) return;

  const shouldShow = Boolean(
    isTouchDevice() &&
    isGameLoaded &&
    !isPaused &&
    gameBoardWrapper?.classList.contains('game-playing')
  );

  pauseBtn.classList.toggle('force-show', shouldShow);
}

function captureCurrentSpeedState() {
  pausedSpeedBpm = currentBpm;
  pausedSpeedBeats = currentBeats;
}

function getEffectiveSpeedState() {
  if (!hasStartedGameplay) {
    return { bpm: 0, beats: 0.5 };
  }

  if (isPaused || !isStarted) {
    return {
      bpm: pausedSpeedBpm || currentBpm || 120,
      beats: pausedSpeedBeats || currentBeats || 0.5
    };
  }

  return {
    bpm: currentBpm || pausedSpeedBpm || 120,
    beats: currentBeats || pausedSpeedBeats || 0.5
  };
}

function getGameplayBackgroundIndex() {
  const level = isChallengeMode ? bgLevel : speedLevel;
  if (level >= 3) return 3;
  if (level >= 2) return 2;
  return 1;
}

function updateGameplayBackground() {
  if (!gameBoardWrapper) return;

  const targetBackgroundIndex = getGameplayBackgroundIndex();
  const currentImage = `url("gameImage/bgani_${String(currentGameplayBackgroundIndex).padStart(2, '0')}.png")`;
  const targetImage = `url("gameImage/bgani_${String(targetBackgroundIndex).padStart(2, '0')}.png")`;

  if (targetBackgroundIndex === currentGameplayBackgroundIndex) {
    if (gameplayBackgroundTransitionTimeout) {
      clearTimeout(gameplayBackgroundTransitionTimeout);
      gameplayBackgroundTransitionTimeout = null;
    }
    gameplayBackgroundTransitionTargetIndex = null;
    gameBoardWrapper.style.setProperty('--game-bg-image-1', currentImage);
    gameBoardWrapper.style.setProperty('--game-bg-image-2', targetImage);
    gameBoardWrapper.classList.remove('game-bg-transition-active');
    return;
  }

  if (gameplayBackgroundTransitionTimeout && gameplayBackgroundTransitionTargetIndex === targetBackgroundIndex) {
    return;
  }

  if (gameplayBackgroundTransitionTimeout) {
    clearTimeout(gameplayBackgroundTransitionTimeout);
    gameplayBackgroundTransitionTimeout = null;
  }

  gameplayBackgroundTransitionTargetIndex = targetBackgroundIndex;
  gameBoardWrapper.style.setProperty('--game-bg-image-1', currentImage);
  gameBoardWrapper.style.setProperty('--game-bg-image-2', targetImage);
  gameBoardWrapper.classList.add('game-bg-transition-active');

  gameplayBackgroundTransitionTimeout = window.setTimeout(() => {
    gameBoardWrapper.style.setProperty('--game-bg-image-1', targetImage);
    gameBoardWrapper.style.setProperty('--game-bg-image-2', targetImage);
    gameBoardWrapper.classList.remove('game-bg-transition-active');
    currentGameplayBackgroundIndex = targetBackgroundIndex;
    gameplayBackgroundTransitionTargetIndex = null;
    gameplayBackgroundTransitionTimeout = null;
  }, 900);
}

function unexpected(str) {
  return new SyntaxError(`Unexpected '${str}' at position ${erm.index} (part ${erm.part} track ${erm.track + 1})`);
}

function lenToNum(len, type) {
  return Array.from(len).reduce((sum, char) => sum + ((type ? beatsMap : restMap)[char] || 0), 0);
}

function speedGen(sourceInfo, customStartBpm = null, customSectionSpeedMultiplier = null) {
  const infoBak = JSON.parse(JSON.stringify(sourceInfo));
  const customSectionMultiplier = customSectionSpeedMultiplier != null ? customSectionSpeedMultiplier : 1;

  const buildEntry = (index) => {
    if (index === 0) {
      const firstEntry = sourceInfo[0] || infoBak[0];
      return {
        bpm: customStartBpm ?? firstEntry?.bpm ?? 120,
        beats: firstEntry?.beats ?? 0.5
      };
    }

    const sourceEntry = sourceInfo[index % sourceInfo.length] || infoBak[index - 1];
    const beats = sourceEntry?.beats ?? 0.5;
    const sectionTps = sourceEntry?.bpm != null
      ? calculateTpsFromBpm(sourceEntry.bpm, beats)
      : calculateTpsFromBpm(infoBak[index - 1]?.bpm ?? 120, beats);
    const effectiveTps = customSectionMultiplier !== 1 ? sectionTps * customSectionMultiplier : sectionTps;
    return {
      bpm: Math.trunc(calculateBpmFromTps(effectiveTps, beats)),
      beats
    };
  };

  if (infoBak.length > 0) {
    infoBak[0] = buildEntry(0);
    for (let index = 1; index < infoBak.length; index++) {
      infoBak[index] = buildEntry(index);
    }
  }

  return function(index = 0) {
    while (index >= infoBak.length) {
      const currentIndex = infoBak.length;
      const previousEntry = infoBak[currentIndex - 1];
      const { bpm: lastBpm, beats: lastBeats } = previousEntry || { bpm: 120, beats: 0.5 };
      const currentBeatsValue = sourceInfo[currentIndex % sourceInfo.length].beats;
      const loopTimes = Math.floor(currentIndex / sourceInfo.length);
      let newBpm = getNewBpm(lastBpm, lastBeats, currentBeatsValue, loopTimes);
      if (currentIndex > 0 && customSectionMultiplier !== 1) {
        const originalTps = calculateTpsFromBpm(newBpm, currentBeatsValue);
        const effectiveTps = originalTps * customSectionMultiplier;
        newBpm = Math.trunc(calculateBpmFromTps(effectiveTps, currentBeatsValue));
      }
      infoBak[currentIndex] = { bpm: newBpm, beats: currentBeatsValue };
    }
    return infoBak[index];
  };
}

function getRuntimeSpeed(index) {
  if (customStartingSpeed > 0) {
    const baseSpeed = getSpeed(index);
    const customStartTps = customStartingSpeed;
    const forcedTps = customStartTps;
    return {
      bpm: Math.trunc(calculateBpmFromTps(forcedTps, baseSpeed.beats)),
      beats: baseSpeed.beats
    };
  }
  return getSpeed(index);
}

function getNewBpm(lastBpm, lastBeats, currentBeatsValue, loopTimes) {
  const tpm = lastBpm / lastBeats;
  const effectiveLoopTimes = isChallengeMode && loopTimes > 1 ? 1 : loopTimes;

  if (customStartingSpeed > 0) {
    const customStartTps = customStartingSpeed;
    const sectionIndex = loopTimes * 0 + 1;
    const forcedTps = customStartTps + ((sectionIndex - 1) * 0.5);
    return Math.trunc(calculateBpmFromTps(forcedTps, currentBeatsValue));
  }

  const constant = effectiveLoopTimes < 3 ? 100 : 130;
  const factor = Math.max(1.3 - (tpm - constant) * 0.001, 1.04);
  return Math.trunc(factor * tpm * currentBeatsValue);
}

function calculateBpmFromTps(tps, beats) {
  return Math.round(tps * beats * 60);
}

function calculateTpsFromBpm(bpm, beats) {
  return bpm / beats / 60;
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

async function loadMenuLoopPattern() {
  if (menuLoopPatternNotes.length) return menuLoopPatternNotes;

  const firstLine = menuLoopPatternText;
  menuLoopPatternNotes = firstLine
    .split(',')
    .flatMap((segment) => segment.split(';'))
    .map((token) => token.trim())
    .filter((token) => token && noteNameToMp3Path(token));

  if (!menuLoopPatternNotes.length) {
    menuLoopPatternNotes = ['a2'];
  }

  return menuLoopPatternNotes;
}

function getNextMenuLoopNote() {
  if (!menuLoopPatternNotes.length) {
    menuLoopPatternNotes = ['a2'];
  }

  const note = menuLoopPatternNotes[menuLoopPatternIndex % menuLoopPatternNotes.length];
  menuLoopPatternIndex = (menuLoopPatternIndex + 1) % menuLoopPatternNotes.length;
  return note;
}

async function playMenuLoopCue() {
  const now = performance.now();
  if (now - lastMenuCueTime < 120) return;
  lastMenuCueTime = now;

  const notes = await loadMenuLoopPattern();
  if (!notes.length) return;
  const note = getNextMenuLoopNote();
  await playMp3Note(note, 120);
}

async function playLifeIntroSound() {
  const ctx = ensureAudioEngine();
  if (!ctx) return;

  const buffer = await getCachedAudioBuffer('Audio/Life');
  if (!buffer) return;

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const startAt = ctx.currentTime + 0.01;
  source.buffer = buffer;
  gainNode.gain.setValueAtTime(0.75, startAt);
  source.connect(gainNode);
  gainNode.connect(audioGainNode);
  source.start(startAt);
}

function spendLifeCost(cost) {
  normalizeLifeState();
  if (lifeCount < cost) {
    openLifeModal();
    return false;
  }

  lifeCount = clampNumber(lifeCount - cost, 0, LIFE_MAX);
  lifeLastUpdatedAt = Date.now();
  saveLifeState();
  syncTopDockData();
  updateLifeUi();
  return true;
}

function getPlayLifeCost(songData) {
  return isChallengeSong(songData) ? 2 : 1;
}

function startSongTransition(songData) {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  if (!spendLifeCost(getPlayLifeCost(songData))) {
    return;
  }

  isPlayInProgress = true;
  animateLifeSpendFromTopBar();
  playLifeIntroSound();
  window.setTimeout(() => {
    loadSongFromData(songData);
  }, 1000);
}

function startSongTextTransition(text, label) {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  if (!spendLifeCost(1)) {
    return;
  }

  isPlayInProgress = true;
  animateLifeSpendFromTopBar();
  playLifeIntroSound();
  window.setTimeout(() => {
    loadSongFromText(text, label);
  }, 1000);
}

async function playLoseSound() {
  const ctx = ensureAudioEngine();
  if (!ctx) return;
  const path = 'music/#D-2.mp3';
  const encodedPath = path.replace(/#/g, '%23');
  if (audioBufferCache.has(path)) {
    const buffer = audioBufferCache.get(path);
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(audioGainNode);
    source.start(ctx.currentTime);
    return;
  }
  try {
    const response = await fetch(encodedPath);
    if (!response.ok) return;
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    audioBufferCache.set(path, buffer);
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(audioGainNode);
    source.start(ctx.currentTime);
  } catch (err) {
    console.warn('Failed to load lose sound:', err);
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

function updateLoadingProgress(stage, current, total) {
  const loadingProgress = document.getElementById('loading-progress');
  const loadingStatus = document.getElementById('loading-status');
  
  if (!loadingProgress || !loadingStatus) return;
  
  const percentage = Math.round((current / total) * 100);
  loadingProgress.style.width = `${percentage}%`;
  
  const stageNames = {
    'sprites': 'Loading sprites...',
    'csv': 'Loading song data...',
    'audio': 'Preparing audio...',
    'complete': 'Ready!'
  };
  
  loadingStatus.textContent = stageNames[stage] || `Loading ${stage}...`;
}

function preloadSprites() {
  return new Promise((resolve) => {
    const sprites = [
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
    ];
    
    let loadedCount = 0;
    const totalSprites = sprites.length;
    
    sprites.forEach((name) => {
      const image = new Image();
      image.src = `gameImage/${name}.png`;
      image.onload = () => {
        loadedCount++;
        updateLoadingProgress('sprites', loadedCount, totalSprites);
        if (loadedCount === totalSprites) {
          resolve();
        }
      };
      image.onerror = () => {
        loadedCount++;
        updateLoadingProgress('sprites', loadedCount, totalSprites);
        if (loadedCount === totalSprites) {
          resolve();
        }
      };
      spriteCache[name] = image;
    });
    
    // Fallback in case images are cached
    if (loadedCount === totalSprites) {
      resolve();
    }
  });
}

function loadSettings() {
  if (autoplayToggle) autoplayToggle.checked = autoplayEnabled;
  if (reviveSlowdownToggle) reviveSlowdownToggle.checked = reviveSlowdownEnabled;
  if (playerNameText) playerNameText.textContent = playerName;
  updateTpsDisplayColor();
}

function updateTpsDisplayColor() {
  const displays = [tpsDisplayNormal, tpsDisplayChallenge].filter(Boolean);
  const hasCustomSpeed = customStartingSpeed > 0;
  const hasAutoplay = autoplayEnabled;
  let colorClass = 'text-[#ff6b6b]';

  if (hasCustomSpeed && hasAutoplay) {
    colorClass = 'text-yellow-100';
  } else if (hasCustomSpeed) {
    colorClass = 'text-yellow-300';
  } else if (hasAutoplay) {
    colorClass = 'text-white';
  }

  displays.forEach((display) => {
    display.classList.remove('text-[#ff6b6b]', 'text-yellow-300', 'text-white', 'text-yellow-100');
    display.classList.add(colorClass);
  });
}

function updateSettingsUI() {
  if (customSpeedInput) {
    // Clamp to whole numbers above 0 (0 = disabled, 1+ = t/s)
    if (isNaN(customStartingSpeed) || customStartingSpeed < 0) {
      customStartingSpeed = 0;
    }
    customSpeedInput.value = customStartingSpeed;
    if (customStartingSpeed === 0) {
      customSpeedDisplay.textContent = i18n?.t('label_disabled') || 'Disabled';
      customSpeedDisplay.classList.remove('text-indigo-600');
    } else {
      customSpeedDisplay.textContent = `${customStartingSpeed} t/s`;
      customSpeedDisplay.classList.add('text-indigo-600');
    }
  }
  if (autoplayToggle) autoplayToggle.checked = autoplayEnabled;
  if (reviveSlowdownToggle) reviveSlowdownToggle.checked = reviveSlowdownEnabled;
  updateTpsDisplayColor();
}

function saveSettingsToStorage() {
  if (autoplayToggle) {
    autoplayEnabled = autoplayToggle.checked;
    localStorage.setItem('opentile_autoplay', String(autoplayEnabled));
  }
  if (reviveSlowdownToggle) {
    reviveSlowdownEnabled = reviveSlowdownToggle.checked;
    localStorage.setItem('opentile_revive_slowdown', String(reviveSlowdownEnabled));
  }
  if (customSpeedInput) {
    let value = parseInt(customSpeedInput.value, 10);
    // Clamp to whole numbers above 0 (0 = disabled, direct t/s value)
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    customStartingSpeed = value;
    customSpeedInput.value = value;
    localStorage.setItem('opentile_custom_speed', String(customStartingSpeed));
  }
  updateTpsDisplayColor();
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
        musician: fields[6] || 'Unknown',
        acceleration: parseFloat(fields[7]) || 0
      });
    }
  }

  const merged = new Map();
  rawRows.forEach((row) => {
    const sectionId = row.id % 100;
    if (!merged.has(row.mid)) {
      merged.set(row.mid, {
        id: Math.floor(row.id / 100),
        mid: row.mid,
        musicJson: row.musicJson,
        musician: row.musician,
        acceleration: row.acceleration,
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
    const localizedSongName = i18n ? i18n.getSongName(song.musicJson) : song.musicJson;
    const localizedArtistName = i18n ? i18n.getArtistName(song.musician) : song.musician;
    option.textContent = `${localizedSongName} (${localizedArtistName}) - ${firstSection ? firstSection.bpm : 120} BPM`;
    pt2MusicSelect.appendChild(option);
  });
}

function createCustomSongCard() {
  const card = document.createElement('div');
  card.className = 'song-card custom-song-card';
  
  if (customSongData && customSongLabel) {
    // Display loaded custom song
    card.innerHTML = `
      <div class="song-card-icon ranked">
        <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 C54 4 56 8 58 10 C61 7 65 6 68 8 C71 10 70 14 71 17 C75 16 79 17 81 20 C83 23 81 27 80 30 C84 30 87 32 88 36 C89 40 86 43 84 46 C88 47 90 50 90 50 C90 50 88 53 84 54 C86 57 89 60 88 64 C87 68 84 70 80 70 C81 73 83 77 81 80 C79 83 75 84 71 83 C70 86 71 90 68 92 C65 94 61 93 58 90 C56 92 54 96 50 96 C46 96 44 92 42 90 C39 93 35 94 32 92 C29 90 30 86 29 83 C25 84 21 83 19 80 C17 77 19 73 20 70 C16 70 13 68 12 64 C11 60 14 57 16 54 C12 53 10 50 10 50 C10 50 12 47 16 46 C14 43 11 40 12 36 C13 32 16 30 20 30 C18 27 16 23 18 20 C20 17 24 16 28 17 C29 14 28 10 31 8 C34 6 38 7 41 10 C43 8 46 4 50 4 Z"/><circle cx="50" cy="50" r="22" fill="white" opacity="0.25"/></svg>
        <div class="rank-number" style="color: #e879f9;">0</div>
      </div>
      <div class="song-card-content">
        <div class="song-card-title" style="color: #e879f9;">Custom Song</div>
        <div class="song-card-artist">${customSongLabel}</div>
        <div class="song-card-progress"></div>
      </div>
      <div class="song-card-action flex items-center gap-2">
        <button class="btn-bpm">BPM</button>
        <button class="btn-load">Load</button>
        <button class="btn-play">Play</button>
      </div>
    `;

    const playBtn = card.querySelector('.btn-play');
    playBtn.addEventListener('click', () => {
      if (isPlayInProgress) {
        return; // Prevent multiple play button presses
      }
      
      if (customSongData) {
        // Get BPM values from input fields
        const bpm1 = parseInt(document.getElementById('custom-bpm-1')?.value || '120', 10);
        const bpm2 = parseInt(document.getElementById('custom-bpm-2')?.value || '120', 10);
        const bpm3 = parseInt(document.getElementById('custom-bpm-3')?.value || '120', 10);
        
        // Create mock songData structure to treat custom song like a normal song entry
        const mockSongData = {
          mid: 999999, // Unique ID for custom songs
          musicJson: customSongLabel, // Use filename as musicJson for results screen
          musician: 'Custom',
          acceleration: 0,
          sections: {
            1: { bpm: bpm1, baseBeats: 0.5, musicJson: 'custom' },
            2: { bpm: bpm2, baseBeats: 0.5, musicJson: 'custom' },
            3: { bpm: bpm3, baseBeats: 0.5, musicJson: 'custom' }
          }
        };
        
        // Store the actual custom song data globally so loadSongFromData can access it
        window.customSongJsonData = customSongData;
        
        loadSongFromData(mockSongData);
      }
    });

    const loadBtn = card.querySelector('.btn-load');
    loadBtn.addEventListener('click', () => {
      customSongUpload?.click();
    });

    const bpmBtn = card.querySelector('.btn-bpm');
    bpmBtn.addEventListener('click', () => {
      // Open BPM modal
      if (bpmModal) {
        bpmModal.classList.remove('hidden');
      }
    });
  } else {
    // Display upload prompt
    card.innerHTML = `
      <div class="song-card-icon ranked" style="opacity: 0.5;">
        <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 C54 4 56 8 58 10 C61 7 65 6 68 8 C71 10 70 14 71 17 C75 16 79 17 81 20 C83 23 81 27 80 30 C84 30 87 32 88 36 C89 40 86 43 84 46 C88 47 90 50 90 50 C90 50 88 53 84 54 C86 57 89 60 88 64 C87 68 84 70 80 70 C81 73 83 77 81 80 C79 83 75 84 71 83 C70 86 71 90 68 92 C65 94 61 93 58 90 C56 92 54 96 50 96 C46 96 44 92 42 90 C39 93 35 94 32 92 C29 90 30 86 29 83 C25 84 21 83 19 80 C17 77 19 73 20 70 C16 70 13 68 12 64 C11 60 14 57 16 54 C12 53 10 50 10 50 C10 50 12 47 16 46 C14 43 11 40 12 36 C13 32 16 30 20 30 C18 27 16 23 18 20 C20 17 24 16 28 17 C29 14 28 10 31 8 C34 6 38 7 41 10 C43 8 46 4 50 4 Z"/><circle cx="50" cy="50" r="22" fill="white" opacity="0.25"/></svg>
        <div class="rank-number" style="color: #e879f9;">0</div>
      </div>
      <div class="song-card-content">
        <div class="song-card-title" style="color: #a78bfa;">Upload Custom Song</div>
        <div class="song-card-artist">No song loaded</div>
        <div class="song-card-progress"></div>
      </div>
      <div class="song-card-action flex items-center gap-2">
        <button class="btn-bpm" disabled style="opacity: 0.5; cursor: not-allowed;">BPM</button>
        <button class="btn-load">Load</button>
        <button class="btn-play" disabled style="opacity: 0.5; cursor: not-allowed;">Play</button>
      </div>
    `;

    const loadBtn = card.querySelector('.btn-load');
    loadBtn.addEventListener('click', () => {
      customSongUpload?.click();
    });
  }

  return card;
}

function createSongCard(song, isFavouriteView = false) {
  const firstSection = song.sections[1] || Object.values(song.sections)[0];
  const bestLevel = parseInt(localStorage.getItem(`opentile_highscore_level_${song.mid}`) || '0', 10);
  const stage = getStarAndCrownState(bestLevel - 1);
  const isRanked = stage.stars >= 3 || stage.crowns > 0;
  const isFavourite = favouriteSongs.has(String(song.mid));
  const localizedSongName = i18n ? i18n.getSongName(song.musicJson) : song.musicJson;
  const localizedArtistName = i18n ? i18n.getArtistName(song.musician) : song.musician;

  let progressHTML = '';
  if (stage.crowns > 0) {
    for (let i = 0; i < 3; i++) {
      progressHTML += `<img src="gameImage/crown.png" class="w-6 h-auto mr-1 ${i < stage.crowns ? 'earned' : 'unearned'}">`;
    }
  } else {
    for (let i = 0; i < 3; i++) {
      progressHTML += `<img src="gameImage/star.png" class="w-6 h-auto mr-1 ${i < stage.stars ? 'earned' : 'unearned'}">`;
    }
  }

  const card = document.createElement('div');
  card.className = `song-card`;
  const isPurple = song.id >= 700;
  card.innerHTML = `
    <div class="song-card-icon ${isRanked ? `ranked ${isPurple ? 'purple' : ''}` : 'numbered'}">
      ${isRanked
        ? `<svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 C54 4 56 8 58 10 C61 7 65 6 68 8 C71 10 70 14 71 17 C75 16 79 17 81 20 C83 23 81 27 80 30 C84 30 87 32 88 36 C89 40 86 43 84 46 C88 47 90 50 90 50 C90 50 88 53 84 54 C86 57 89 60 88 64 C87 68 84 70 80 70 C81 73 83 77 81 80 C79 83 75 84 71 83 C70 86 71 90 68 92 C65 94 61 93 58 90 C56 92 54 96 50 96 C46 96 44 92 42 90 C39 93 35 94 32 92 C29 90 30 86 29 83 C25 84 21 83 19 80 C17 77 19 73 20 70 C16 70 13 68 12 64 C11 60 14 57 16 54 C12 53 10 50 10 50 C10 50 12 47 16 46 C14 43 11 40 12 36 C13 32 16 30 20 30 C18 27 16 23 18 20 C20 17 24 16 28 17 C29 14 28 10 31 8 C34 6 38 7 41 10 C43 8 46 4 50 4 Z"/><circle cx="50" cy="50" r="22" fill="white" opacity="0.25"/></svg><div class="rank-number">${song.id}</div>`
        : `${song.id}`
      }
    </div>
    <div class="song-card-content">
      <div class="song-card-title">${localizedSongName}</div>
      <div class="song-card-artist">${localizedArtistName}</div>
      <div class="song-card-progress">
        ${progressHTML}
      </div>
    </div>
    <div class="song-card-action flex items-center gap-2">
      <button class="heart-button ${isFavourite ? 'favourite' : ''}" data-song-id="${song.mid}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </button>
      <button class="btn-play">Play</button>
    </div>
  `;

  const playBtn = card.querySelector('.btn-play');
  playBtn.addEventListener('click', () => {
    if (isPlayInProgress) {
      return; // Prevent multiple play button presses
    }
    startSongTransition(song);
  });

  const heartBtn = card.querySelector('.heart-button');
  heartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavourite(String(song.mid));
    heartBtn.classList.toggle('favourite');
    if (!isFavouriteView) {
      // Re-render favourite songs if on home screen
      if (!homeScreen.classList.contains('hidden')) {
        renderFavouriteSongs();
      }
    } else {
      // Remove card from favourite view if unfavourited
      if (!favouriteSongs.has(String(song.mid))) {
        card.remove();
        if (favouriteSongsContainer.children.length === 0) {
          favouriteSongsContainer.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">No favourite songs yet. Tap the heart on any song to add it here!</p>';
        }
      }
    }
  });

  return card;
}

function createChallengeCard(challengeData) {
  const isClassicChallenge = String(challengeData.mid || '').startsWith('200009');
  const bestScoreKey = isClassicChallenge
    ? `opentile_classic_challenge_best_tiles_${challengeData.mid}`
    : `opentile_challenge_best_tps_${challengeData.mid}`;
  const storedBestScore = parseFloat(localStorage.getItem(bestScoreKey) || '0', 10);
  const bestDisplayValue = isClassicChallenge ? `${Math.round(storedBestScore)} tiles` : `${storedBestScore.toFixed(3)} TPS`;
  const rewardState = shouldShowChallengeRewards(challengeData)
    ? (isClassicChallenge ? getClassicChallengeRewardStateFromTiles(storedBestScore) : getChallengeRewardStateFromTps(storedBestScore))
    : null;
  const rewardMarkup = rewardState ? renderRewardIcons(rewardState) : '';

  const card = document.createElement('div');
  card.className = `song-card challenge-card`;
  const localizedSongName = i18n ? i18n.getSongName(challengeData.musicJson) : challengeData.musicJson;
  card.innerHTML = `
    <div class="song-card-content">
      <div class="song-card-title">${localizedSongName}</div>
      <div class="song-card-progress">
        ${rewardMarkup}
      </div>
    </div>
    <div class="song-card-action">
      <div class="best-score-display">Best: ${bestDisplayValue}</div>
      <button class="btn-play inline-flex items-center justify-center gap-1 px-4 py-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
          <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
        </svg>
        <span class="text-sm font-black">x2</span>
      </button>
    </div>
  `;

  const playBtn = card.querySelector('.btn-play');
  playBtn.addEventListener('click', () => {
    if (isPlayInProgress) {
      return; // Prevent multiple play button presses
    }
    startSongTransition(challengeData);
  });

  return card;
}

function renderSongList(searchQuery = '') {
  if (!songListContainer) return;
  songListContainer.innerHTML = '';

  // Always add custom song slot as song #0 - either with loaded song or as upload placeholder
  const customCard = createCustomSongCard();
  songListContainer.insertBefore(customCard, songListContainer.firstChild);

  // Sort by Mid in ascending order and exclude challenge songs from the normal list
  let sortedSongs = [...musicCsvData]
    .filter(song => !isChallengeSong(song))
    .sort((a, b) => a.mid - b.mid);

  // Filter songs based on search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    sortedSongs = sortedSongs.filter(song => {
      const originalName = song.musicJson.toLowerCase();
      const localizedSongName = i18n ? i18n.getSongName(song.musicJson).toLowerCase() : originalName;
      const musicianName = song.musician.toLowerCase();
      const localizedArtistName = i18n ? i18n.getArtistName(song.musician).toLowerCase() : musicianName;
      
      return originalName.includes(query) ||
             localizedSongName.includes(query) ||
             musicianName.includes(query) ||
             localizedArtistName.includes(query);
    });
  }

  sortedSongs.forEach((song, index) => {
    const songCard = createSongCard(song, false);
    songListContainer.appendChild(songCard);
  });

  // Sync top dock data across both tabs
  syncTopDockData();
}

function renderChallenges() {
  if (!challengesContainer) return;
  challengesContainer.innerHTML = '';

  // List challenge songs based on their MID prefix from the CSV data
  const challengeSongs = musicCsvData
    .filter(song => isChallengeSong(song))
    .sort((a, b) => a.mid - b.mid);

  challengeSongs.forEach((challenge) => {
    const challengeCard = createChallengeCard(challenge);
    challengesContainer.appendChild(challengeCard);
  });

  // Sync top dock data
  syncTopDockData();
}

async function loadMusicCsv() {
  try {
    updateLoadingProgress('csv', 0, 1);
    
    if (typeof i18n !== 'undefined' && i18n.loadTranslations) {
      await i18n.loadTranslations();
    }

    const response = await fetch('music_json.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    musicCsvData = parseMusicCsv(text);
    populateMusicSelect();
    renderSongList();
    renderHomeScreen();
    setSongStatus(`Loaded ${musicCsvData.length} songs from music_json.csv`);
    
    updateLoadingProgress('csv', 1, 1);
  } catch (err) {
    console.warn(err);
    setSongStatus(`Failed to load music_json.csv: ${err.message}`);
    updateLoadingProgress('csv', 1, 1);
  }
}

function resetInputState() {
  activeKeys = { 0: false, 1: false, 2: false, 3: false };
}

function resetEngineState() {
  clearQueuedTimeouts();
  sheet = [];
  currentSectionIndex = 0;
  currentSectionTileIndex = 0;
  songLoopCount = 0;
  currentGameplayBackgroundIndex = 1;
  gameplayBackgroundTransitionTargetIndex = null;
  if (gameplayBackgroundTransitionTimeout) {
    clearTimeout(gameplayBackgroundTransitionTimeout);
    gameplayBackgroundTransitionTimeout = null;
  }
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.remove('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
    gameBoardWrapper.style.removeProperty('--game-bg-image-1');
    gameBoardWrapper.style.removeProperty('--game-bg-image-2');
  }
  info = [];
  currentScore = 0;
  hpos = 0;
  visualHposOffset = 0;
  starthpos = key - 2;
  bgLevel = 1;
  bgLevelPos = [];
  speedLevel = 1;
  speedLevelPos = [];
  normalSongAwardLevel = 1;
  starterColumn = Math.floor(Math.random() * key);
  warr = new Array(key).fill(0).map((_, idx) => (idx === starterColumn ? 1 : 0));
  accompanimentLongColumn = null;
  accompanimentSingleToggle = 0;
  accompanimentSequenceActive = false;
  nextTileId = 0;
  tiles = [{
    id: nextTileId++,
    type: -1,
    hlen: 1,
    hpos: -1,
    visualAdjustedHpos: -1,  // hpos - visualHposOffset at spawn time
    scores: [],
    warr: [...warr]
  }];
  tileDomCache.forEach((el) => el.remove());
  tileDomCache.clear();
  tilesContainer.innerHTML = '';
  hitEffectsEl.innerHTML = '';
  updatePauseButtonVisibility();
  isStarted = false;
  isPaused = false;
  isGameLoaded = false;
  challengeBpmOffset = 0;
  challengeBaseBpm = 120;
  challengeBaseBeats = 0.5;
  hasStartedGameplay = false;
  lastHudRewardState = null;
  preserveCurrentSpeedOnNextFrame = false;
  pausedSpeedBpm = 120;
  pausedSpeedBeats = 0.5;
  resetInputState();
  pendingHitEffects = [];
  isReviveSlowdownActive = false;
}

function loadSongObject(data, label) {
  resetEngineState();
  reviveRemaining = MAX_REVIVES_PER_RUN;
  revivePendingFailure = false;
  revivePendingType = null;
  revivePendingTile = null;
  revivePendingColIdx = null;
  lastLoadedJsonText = JSON.stringify(data);
  lastLoadedLabel = label;

  let baseBpm = data.baseBpm || 120;
  const musics = Array.isArray(data.musics) ? [...data.musics].sort((a, b) => a.id - b.id) : [];
  if (!musics.length) {
    throw new Error('No musics found in JSON');
  }
  const firstSectionMusic = musics[0];
  let baseBeats = firstSectionMusic?.baseBeats || 0.5;
  const challengeTimingBaseBpm = isChallengeMode ? (firstSectionMusic?.bpm || baseBpm || 120) : null;
  const challengeTimingBaseBeats = isChallengeMode ? (firstSectionMusic?.baseBeats || baseBeats || 0.5) : null;

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

    // Challenge runs keep tile lengths based on the section's beat spacing,
    // and ignore per-section BPM values for tile length generation.
    const sectionBaseBeats = music.baseBeats || baseBeats || 0.5;
    const sectionBpm = isChallengeMode ? challengeTimingBaseBpm : (music.bpm != null ? music.bpm : baseBpm);
    const tileLengthBaseBeats = sectionBaseBeats;
    
    // Use section's baseBeats as minimum tile length for scaling
    const minTileLen = sectionBaseBeats;
    const scalingFactor = tileLengthBaseBeats / minTileLen;
    
    const realscore = [];
    for (const tile of base) {
      if (tile.type) {
        const hlenValue = (tile.len / tileLengthBaseBeats) * scalingFactor;
        // In classic mode, force all tiles to be visible single tap tiles.
        // Type 1 is the invisible blank tile, so classic mode uses type 2 instead.
        let tileType = tile.type;
        if (isClassicMode) {
          tileType = 2;
        } else {
          tileType = Number(tile.type) === 1 && tile.notes.flat().length ? (hlenValue > 1 ? 6 : 2) : tile.type;
        }
        realscore.push({
          type: tileType,
          scores: [tile.notes],
          hlen: hlenValue
        });
      } else if (realscore.length) {
        realscore[realscore.length - 1].scores.push(tile.notes);
        realscore[realscore.length - 1].hlen += (tile.len / tileLengthBaseBeats) * scalingFactor;
      }
    }

    sheet.push(realscore);
    if (!isChallengeMode && music.bpm != null) {
      baseBpm = music.bpm;
      baseBeats = music.baseBeats;
    }
    info.push({ bpm: Math.trunc(sectionBpm / sectionBaseBeats * sectionBaseBeats), beats: sectionBaseBeats, id: music.id });
  }

  // Calculate custom BPM if custom starting speed is set
  let customBpmOverride = null;
  let customSectionSpeedMultiplier = null;
  if (customStartingSpeed > 0) {
    const customTps = customStartingSpeed; // direct t/s value
    const originalFirstSectionTps = info[0] ? calculateTpsFromBpm(info[0].bpm, info[0].beats) : 0;
    customBpmOverride = calculateBpmFromTps(customTps, info[0].beats);
    if (originalFirstSectionTps > 0) {
      customSectionSpeedMultiplier = customTps / originalFirstSectionTps;
    }
  }

  getSpeed = speedGen(info, customBpmOverride, customSectionSpeedMultiplier);
  currentBpm = getSpeed(0).bpm;
  currentBeats = getSpeed(0).beats;
  if (isChallengeMode) {
    challengeBaseBpm = currentBpm;
    challengeBaseBeats = currentBeats;
  }
  songName = label;
  isGameLoaded = true;
  const localizedSongName = i18n ? i18n.getSongName(label) : label;
  setSongStatus(`Loaded ${localizedSongName} with ${sheet.length} sections`);
  computeSectionScoreThresholds();
}

// Pre-compute the cumulative score at each section-award boundary.
// Each entry sectionScoreThresholds[i] is the total estimated score a player
// would have accumulated just after completing section i (0-indexed).
// normalSongAwardLevel increments to (i + 2) when section i is cleared, so
// the threshold for award level L is sectionScoreThresholds[L - 2].
function computeSectionScoreThresholds() {
  sectionScoreThresholds = [];
  let runningScore = 0;
  
  // Calculate through all available sections
  for (let s = 0; s < sheet.length; s++) {
    const section = sheet[s];
    for (const tile of section) {
      switch (tile.type) {
        case 5: runningScore += 4; break;             // combo start tile
        case 3: runningScore += Math.max(2, (tile.scores && tile.scores.length) || 2); break; // multi-tap combo
        case 6: runningScore += Math.round(tile.hlen) + 1; break; // long hold
        default: runningScore += 1; break;             // regular tap (type 2) and others
      }
    }
    sectionScoreThresholds.push(runningScore);
  }
  
  // Extrapolate for crown tiers that may require more sections than available
  // Crown tiers: 1👑 → level 5, 2👑 → level 7, 3👑 → level 10
  // We need thresholds up to level 10 (index 8 in sectionScoreThresholds)
  const maxLevelNeeded = 10;
  const maxIdxNeeded = maxLevelNeeded - 2; // level 10 needs index 8
  
  if (sheet.length > 0 && sectionScoreThresholds.length < maxIdxNeeded + 1) {
    const avgScorePerSection = runningScore / sheet.length;
    while (sectionScoreThresholds.length <= maxIdxNeeded) {
      runningScore += Math.round(avgScorePerSection);
      sectionScoreThresholds.push(runningScore);
    }
  }
}

async function loadSongFromData(songData) {
  try {
    isPlayInProgress = true; // Set play progress flag when loading from data
    selectedSongData = songData;
    reviveRemaining = MAX_REVIVES_PER_RUN;
    revivePendingFailure = false;
    revivePendingType = null;
    revivePendingTile = null;
    revivePendingColIdx = null;

    // Check if this is a classic song
    if (isClassicSong(songData)) {
      startClassicMode();
      return;
    }

    // Check if this is a challenge song
    isChallengeMode = isChallengeSong(songData);
    if (isChallengeMode) {
      challengeAcceleration = (songData.acceleration || 0) / 10;
      challengeLastAccelerationTime = 0;
      challengeBpmOffset = 0;
    }

    const sectionIds = Object.keys(songData.sections).map(Number).sort((a, b) => a - b);
    const firstSection = songData.sections[sectionIds[0]];
    const challengeFirstSectionBpm = isChallengeMode ? (firstSection?.bpm || 120) : null;
    const challengeFirstSectionBeats = isChallengeMode ? (firstSection?.baseBeats || 0.5) : null;
    
    // Check if this is a custom song (mid === 999999 or musicJson is not a real file)
    let sourceJson;
    if (songData.mid === 999999 && window.customSongJsonData) {
      sourceJson = window.customSongJsonData;
    } else {
      const response = await fetch(`song/${firstSection.musicJson}.json`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      sourceJson = JSON.parse(await response.text());
    }
    
    const musics = Array.isArray(sourceJson.musics) ? sourceJson.musics : [];
    const mergedMusics = [];

    sectionIds.forEach((sectionId) => {
      const music = musics.find((entry) => parseInt(entry.id, 10) === sectionId);
      const csvSection = songData.sections[sectionId];
      if (!music || !csvSection) return;
      mergedMusics.push({
        ...music,
        id: sectionId,
        bpm: isChallengeMode ? (csvSection.bpm || challengeFirstSectionBpm || music.bpm || 120) : (csvSection.bpm || music.bpm || 120),
        baseBeats: isChallengeMode ? (music.baseBeats || csvSection.baseBeats || challengeFirstSectionBeats || 0.5) : (music.baseBeats || csvSection.baseBeats || 0.5)
      });
    });

    if (!mergedMusics.length) {
      throw new Error('No matching music sections found');
    }

    const localizedArtistName = i18n ? i18n.getArtistName(songData.musician) : songData.musician;
    loadSongObject({
      baseBpm: mergedMusics[0].bpm,
      musics: mergedMusics
    }, `${songData.musicJson} (${localizedArtistName})`);

    // Show game interface but don't start game (wait for START tile)
    songListScreen.classList.add('hidden');
    challengesScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    homeScreen.classList.add('hidden');

    // Hide dock during gameplay
    const sharedDock = document.getElementById('shared-dock');
    if (sharedDock) {
      sharedDock.classList.add('hidden');
    }

    // Hide shared top bar during gameplay
    const sharedTopBar = document.getElementById('shared-top-bar');
    if (sharedTopBar) {
      sharedTopBar.classList.add('hidden');
    }

    // Show background immediately when song is loaded
    if (gameBoardWrapper) {
      gameBoardWrapper.classList.add('game-playing');
    }
  } catch (err) {
    console.error(err);
    const localizedSongName = i18n ? i18n.getSongName(songData.musicJson) : songData.musicJson;
    setSongStatus(`Failed to load ${localizedSongName}: ${err.message}`);
  }
}

function loadSongFromText(text, label) {
  isPlayInProgress = true; // Set play progress flag when loading from text
  const parsed = JSON.parse(text);
  loadSongObject(parsed, label);
  
  // Show game interface but don't start game (wait for START tile)
  songListScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  homeScreen.classList.add('hidden');
  
  // Hide dock during gameplay
  const sharedDock = document.getElementById('shared-dock');
  if (sharedDock) {
    sharedDock.classList.add('hidden');
  }
  
  // Hide shared top bar during gameplay
  const sharedTopBar = document.getElementById('shared-top-bar');
  if (sharedTopBar) {
    sharedTopBar.classList.add('hidden');
  }
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

function getAccompanimentTilePos() {
  const nextLongColumn = accompanimentLongColumn === null
    ? (Math.random() < 0.5 ? 0 : 3)
    : (accompanimentLongColumn === 0 ? 3 : 0);
  
  if (accompanimentLongColumn !== nextLongColumn) {
    accompanimentSingleToggle = 0;
  }
  accompanimentLongColumn = nextLongColumn;

  return {
    longColumn: nextLongColumn,
    singleColumns: nextLongColumn === 0 ? [2, 3] : [0, 1]
  };
}

function getAccompanimentSingleColumn() {
  const singleColumns = accompanimentLongColumn === 0 ? [2, 3] : [0, 1];
  const nextSingleColumn = singleColumns[accompanimentSingleToggle % singleColumns.length];
  accompanimentSingleToggle = (accompanimentSingleToggle + 1) % singleColumns.length;
  return nextSingleColumn;
}

function nextPos(arr, type) {
  if (type === 9) {
    const { longColumn } = getAccompanimentTilePos();
    return [longColumn];
  }

  accompanimentLongColumn = null;
  accompanimentSingleToggle = 0;
  accompanimentSequenceActive = false;

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

function isSpecialChallengeSong(song) {
  if (!song) return false;
  const title = String(song.musicJson || song.title || '').trim().toLowerCase();
  return title === 'beginner challenge' || title === 'skilled challenge' || title === 'master challenge';
}

function shouldShowChallengeRewards(song) {
  return isChallengeSong(song) && !isSpecialChallengeSong(song);
}

function shouldAnimateChallengeRewards(song) {
  return isChallengeSong(song) && !isSpecialChallengeSong(song);
}

function getChallengeRewardStateFromTps(tps) {
  const value = Number(tps) || 0;
  if (value >= 11.5) return { stars: 3, crowns: 3 };
  if (value >= 9) return { stars: 3, crowns: 2 };
  if (value >= 8) return { stars: 3, crowns: 1 };
  if (value >= 7) return { stars: 3, crowns: 0 };
  if (value >= 6.2) return { stars: 2, crowns: 0 };
  if (value >= 5.5) return { stars: 1, crowns: 0 };
  return { stars: 0, crowns: 0 };
}

function getClassicChallengeRewardStateFromTiles(tiles) {
  const value = Number(tiles) || 0;
  if (value >= 350) return { stars: 3, crowns: 3 };
  if (value >= 280) return { stars: 3, crowns: 2 };
  if (value >= 200) return { stars: 3, crowns: 1 };
  if (value >= 150) return { stars: 3, crowns: 0 };
  if (value >= 100) return { stars: 2, crowns: 0 };
  if (value >= 50) return { stars: 1, crowns: 0 };
  return { stars: 0, crowns: 0 };
}

function getRewardTierRank(state) {
  if (!state) return 0;
  const crownCount = Number(state.crowns || 0);
  if (crownCount > 0) return 3 + crownCount;
  return Number(state.stars || 0);
}

function renderRewardIcons(state, baseClass = 'w-6 h-auto mr-1') {
  if (!state) return '';
  const useCrowns = (state.crowns || 0) > 0;
  const achieved = useCrowns ? state.crowns : state.stars;
  const iconName = useCrowns ? 'crown' : 'star';
  return Array.from({ length: 3 }, (_, i) => {
    const earned = i < achieved;
    return `<img src="gameImage/${iconName}.png" class="${baseClass} ${earned ? 'earned' : 'unearned'}">`;
  }).join('');
}

function renderResultsRewardIcons(container, state, baseClass = 'inline-block w-20 h-20 mr-3') {
  if (!container || !state) {
    if (container) container.innerHTML = '';
    return;
  }

  container.innerHTML = '';
  const useCrowns = (state.crowns || 0) > 0;
  const achieved = useCrowns ? state.crowns : state.stars;
  const iconName = useCrowns ? 'crown' : 'star';

  for (let i = 1; i <= 3; i++) {
    const img = document.createElement('img');
    img.src = `gameImage/${iconName}.png`;
    img.alt = useCrowns ? 'crown' : 'star';
    img.className = baseClass;
    if (i > achieved) {
      img.classList.add('medal-silhouette');
    } else {
      img.classList.add('result-medal');
      img.style.animationDelay = `${(i - 1) * 0.15}s`;
    }
    container.appendChild(img);
  }
}

const TILE_HIT_ANIMATION_DURATION_MS = 150;

function getTileFinishImage(ended = 0) {
  if (ended === 1) return '1';
  if (ended === 2) return '2';
  if (ended === 3) return '3';
  return '4';
}

function triggerTileHitAnimation(tile) {
  if (!tile || isLongTile(tile) || tile.type === 3) return;
  if (!isTapTile(tile) && !isDoubleTile(tile)) return;
  tile.hitAnimationStartedAt = performance.now();
}

function getTileHitAnimationFrame(tile, now = performance.now()) {
  if (!tile || !tile.hitAnimationStartedAt) return 0;

  const elapsedMs = now - tile.hitAnimationStartedAt;
  if (elapsedMs >= TILE_HIT_ANIMATION_DURATION_MS) return 4;

  return Math.min(4, Math.floor((elapsedMs / TILE_HIT_ANIMATION_DURATION_MS) * 4) + 1);
}

function isLongTile(tile) {
  return tile.type === 6 || tile.type >= 7 || (tile.type === 9 && tile.isAccompanimentLong);
}

function isComboTile(tile) {
  return tile.type === 3;
}

function getTileEffectiveHeight(tile) {
  return isComboTile(tile) ? 2 : tile.hlen;
}

function getActiveComboTile() {
  // Only active after the first tap (remainingTaps < taps) and while visually on screen.
  return tiles.find((tile) =>
    isComboTile(tile) &&
    !tile.clicked &&
    tile.remainingTaps > 0 &&
    tile.remainingTaps < (tile.taps || 2) &&  // at least one tap has landed
    getTileBottom(tile) > 0 &&
    getTileTop(tile) < key
  );
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

function isTileNearTap(tile, pointerEvent) {
  if (!pointerEvent) return true; // Keyboard input, assume proximity
  const boardRect = boardEl.getBoundingClientRect();
  const clickYRel = (pointerEvent.clientY - boardRect.top) / boardRect.height;
  const clickRow = Math.floor(clickYRel * key);
  
  const tileTopRow = Math.floor(getTileTop(tile));
  const tileBottomRow = Math.max(tileTopRow, Math.floor(getTileBottom(tile) - 0.01));
  
  // Check if tap is within the tile's vertical range
  return clickRow >= tileTopRow && clickRow <= tileBottomRow;
}

function isTileNearAccompaniment(tile, pointerEvent) {
  // Check if this tile is an accompaniment tile
  if (tile.isAccompanimentTile) return true;
  
  // Check if there are accompaniment tiles nearby (within 2 rows)
  const tileCenter = (getTileTop(tile) + getTileBottom(tile)) / 2;
  const nearbyAccompaniment = tiles.find((t) => 
    t.isAccompanimentTile && 
    !t.clicked && 
    !t.holdCompleted &&
    Math.abs((getTileTop(t) + getTileBottom(t)) / 2 - tileCenter) < 2
  );
  
  return !!nearbyAccompaniment;
}

function getTileBottom(tile) {
  return getTileTop(tile) + getTileEffectiveHeight(tile);
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
  if (tile.type === 9) {
    tile.audioPlayed = true;
    tile.played = true;
    return;
  }
  let realLen = 0;
  // Handle both formats: array of arrays (normal tiles) or single array (single accompaniment tiles)
  const scoreGroups = Array.isArray(tile.scores[0]) ? tile.scores : [tile.scores];
  scoreGroups.forEach((scoreGroup) => {
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

// Play the note for a single combo tap immediately so rapid taps each trigger
// their own sound instead of bunching up when input is delayed.
function playComboTapAudio(tile) {
  if (!tile || !isComboTile(tile)) return;
  // tap index = number of taps already made = taps - remainingTaps (before decrement)
  const tapIdx = (tile.taps || 2) - (tile.remainingTaps || 0);
  const scoreGroup = tile.scores?.[tapIdx] || tile.scores?.[0];
  // Always mark played so the autoplay audio loop doesn't double-trigger.
  tile.played = true;
  if (!scoreGroup) return;
  scoreGroup.forEach((note) => {
    queueTimeout(() => playPitchString(note.note, note.len), 0);
  });
}

function spawnHitRipple(x, y, options = {}) {
  const containerRect = hitEffectsEl.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = options.big ? 'hit-ripple hit-ripple-combo' : 'hit-ripple';

  let anchorX = typeof x === 'number' ? x : null;
  let anchorY = typeof y === 'number' ? y : null;

  if ((anchorX == null || anchorY == null) && options.tile) {
    const tileEl = document.querySelector(`[data-tile-id="${options.tile.id}"]`);
    const rect = tileEl?.getBoundingClientRect();
    if (rect) {
      const activeCols = getActiveColumns(options.tile);
      const leftMost = Math.min(...activeCols);
      const rightMost = Math.max(...activeCols);
      const side = options.colIdx <= (leftMost + rightMost) / 2 ? 'left' : 'right';
      anchorX = side === 'left' ? rect.left + rect.width * 0.28 : rect.right - rect.width * 0.28;
      anchorY = rect.top + rect.height * 0.3;
    }
  }

  if (anchorX == null || anchorY == null) {
    if (options.colIdx != null && colElements[options.colIdx]) {
      const colRect = colElements[options.colIdx].getBoundingClientRect();
      anchorX = colRect.left + colRect.width / 2;
      anchorY = colRect.top + colRect.height * 0.75;
    } else {
      anchorX = containerRect.left + containerRect.width / 2;
      anchorY = containerRect.top + containerRect.height * 0.2;
    }
  }

  ripple.style.left = `${anchorX - containerRect.left}px`;
  ripple.style.top = `${anchorY - containerRect.top}px`;
  hitEffectsEl.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function spawnComboPlusOne(tile, colIdx, pointerEvent = null) {
  if (!tile || !isComboTile(tile)) return;

  const containerRect = hitEffectsEl.getBoundingClientRect();
  const tileEl = document.querySelector(`[data-tile-id="${tile.id}"]`);
  const rect = tileEl?.getBoundingClientRect();
  const activeCols = getActiveColumns(tile);
  const leftMost = Math.min(...activeCols);
  const rightMost = Math.max(...activeCols);
  const side = colIdx <= (leftMost + rightMost) / 2 ? 'left' : 'right';

  let anchorX = pointerEvent ? pointerEvent.clientX : null;
  let anchorY = pointerEvent ? pointerEvent.clientY : null;

  if (rect) {
    anchorX = side === 'left' ? rect.left + rect.width * 0.2 : rect.right - rect.width * 0.2;
    anchorY = rect.top + rect.height * 0.25;
  }

  if (anchorX == null || anchorY == null) {
    if (colElements[colIdx]) {
      const colRect = colElements[colIdx].getBoundingClientRect();
      anchorX = colRect.left + colRect.width / 2;
      anchorY = colRect.top + colRect.height * 0.75;
    } else {
      anchorX = containerRect.left + containerRect.width / 2;
      anchorY = containerRect.top + containerRect.height * 0.2;
    }
  }

  const plusOne = document.createElement('div');
  plusOne.className = 'combo-plus-one';
  plusOne.textContent = '+1';
  plusOne.style.left = `${anchorX - containerRect.left}px`;
  plusOne.style.top = `${anchorY - containerRect.top}px`;
  hitEffectsEl.appendChild(plusOne);
  plusOne.addEventListener('animationend', () => plusOne.remove());
  setTimeout(() => {
    if (plusOne.parentNode) plusOne.remove();
  }, 350);
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

function blinkTile(tile) {
  const el = document.querySelector(`[data-tile-id="${tile.id}"]`);
  if (!el) return;
  el.classList.add('blink-three-times');
  setTimeout(() => el.classList.remove('blink-three-times'), 1500);
}

function flashColumnRed(colIdx, tile) {
  const colEl = colElements[colIdx];
  if (!colEl) return;

  const tileTopUnits = getTileTop(tile);
  const tileHeightUnits = tile.hlen;
  const tileTopPercent = (tileTopUnits / key) * 100;
  const tileHeightPercent = (tileHeightUnits / key) * 100;

  // Create a temporary overlay element for the red flash at the correct position
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.top = `${tileTopPercent}%`;
  overlay.style.height = `${tileHeightPercent}%`;
  overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '20';
  overlay.classList.add('column-flash-red');
  
  colEl.appendChild(overlay);
  
  setTimeout(() => {
    overlay.remove();
  }, 1500);
}

async function finishRun(showLibrary = false) {
  resetInputState();
  captureCurrentSpeedState();
  isStarted = false;
  isPaused = true;
  isPlayInProgress = false; // Reset play progress flag when run finishes
  
  // Clean up classic mode timer
  if (isClassicMode) {
    if (classicTimerInterval) {
      clearInterval(classicTimerInterval);
      classicTimerInterval = null;
    }
    classicTimerStartedAt = 0;
    classicTimerEnding = false;
  }

  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }
  updatePauseButtonVisibility();

  if (isChallengeMode) {
    // In challenge mode: save best TPS, display final TPS and earned medals
    const finalTps = currentBpm / currentBeats / 60;
    const rewardState = shouldShowChallengeRewards(selectedSongData) ? getChallengeRewardStateFromTps(finalTps) : null;
    const finalStarsEl = document.getElementById('final-stars');
    const finalCrownsEl = document.getElementById('final-crowns');
    document.getElementById('final-score').textContent = finalTps.toFixed(3);
    if (finalStarsEl) finalStarsEl.innerHTML = rewardState && rewardState.crowns === 0 ? renderRewardIcons(rewardState, 'w-8 h-auto mr-1') : '';
    if (finalCrownsEl) finalCrownsEl.innerHTML = rewardState && rewardState.crowns > 0 ? renderRewardIcons(rewardState, 'w-8 h-auto mr-1') : '';
    document.getElementById('final-grade').classList.add('hidden');

    if (selectedSongData && !autoplayEnabled && customStartingSpeed === 0) {
      const key = `opentile_challenge_best_tps_${selectedSongData.mid}`;
      const bestTps = parseFloat(localStorage.getItem(key) || '0', 10);
      if (finalTps > bestTps) {
        localStorage.setItem(key, String(finalTps));
      }
    }

    if (showLibrary) {
      gameoverScreen.classList.add('hidden');
      challengesScreen.classList.remove('hidden');
      renderChallenges(); // Re-render to update UI with new best TPS
    } else {
      gameoverScreen.classList.remove('hidden');
    }
  } else if (isClassicMode) {
    // Classic mode: display tapped tiles count and earned medals
    const rewardState = getClassicChallengeRewardStateFromTiles(classicTappedTiles);
    const finalStarsEl = document.getElementById('final-stars');
    const finalCrownsEl = document.getElementById('final-crowns');
    document.getElementById('final-score').textContent = String(classicTappedTiles);

    if (selectedSongData && !autoplayEnabled && customStartingSpeed === 0) {
      const key = `opentile_classic_challenge_best_tiles_${selectedSongData.mid}`;
      const bestTiles = parseFloat(localStorage.getItem(key) || '0', 10);
      if (classicTappedTiles > bestTiles) {
        localStorage.setItem(key, String(classicTappedTiles));
      }
    }
    if (finalStarsEl) finalStarsEl.innerHTML = rewardState && rewardState.crowns === 0 ? renderRewardIcons(rewardState, 'w-8 h-auto mr-1') : '';
    if (finalCrownsEl) finalCrownsEl.innerHTML = rewardState && rewardState.crowns > 0 ? renderRewardIcons(rewardState, 'w-8 h-auto mr-1') : '';
    document.getElementById('final-grade').classList.add('hidden');

    if (showLibrary) {
      gameoverScreen.classList.add('hidden');
      songListScreen.classList.remove('hidden');
      renderSongList();
    } else {
      gameoverScreen.classList.add('hidden');
    }
  } else {
    // Normal mode: save high score level, display score
    document.getElementById('final-score').textContent = String(currentScore);
    document.getElementById('final-stars').innerHTML = starsDisplay.innerHTML;
    document.getElementById('final-crowns').innerHTML = crownsDisplay.innerHTML;
    document.getElementById('final-grade').classList.add('hidden');

    if (selectedSongData && !autoplayEnabled) {
      if (customStartingSpeed === 0) {
        const key = `opentile_highscore_level_${selectedSongData.mid}`;
        const bestLevel = parseInt(localStorage.getItem(key) || '0', 10);
        // Save the higher of the current run's award level vs the stored best.
        // normalSongAwardLevel directly maps to the star/crown tier shown in the HUD.
        if (normalSongAwardLevel > bestLevel) {
          localStorage.setItem(key, String(normalSongAwardLevel));
        }
      }
      // Save last played song
      if (selectedSongData.mid) {
        saveLastPlayed(String(selectedSongData.mid));
      }
    }

    if (showLibrary) {
      gameoverScreen.classList.add('hidden');
      songListScreen.classList.remove('hidden');
      renderSongList(); // Re-render to update UI with new high score
    } else {
      // Do not show the legacy gameover screen for normal results.
      // The newer `results-screen` will be used below.
      gameoverScreen.classList.add('hidden');
    }
  }

  // Hide dock on results screen
  const sharedDock = document.getElementById('shared-dock');
  if (sharedDock) {
    sharedDock.classList.add('hidden');
  }

  // Populate results screen if available
  const resultsScreen = document.getElementById('results-screen');
  if (resultsScreen) {
    try {
      // helper to animate numbers (integer or float) used on results screen
      function animateNumberTo(el, finalValue, duration = 300, decimals = 0) {
        if (!el) return;
        const start = 0;
        const end = Number(finalValue) || 0;
        const startTime = performance.now();
        function step(now) {
          const t = Math.min((now - startTime) / duration, 1);
          const current = start + (end - start) * t;
          if (decimals > 0) {
            el.textContent = current.toFixed(decimals);
          } else {
            el.textContent = String(Math.round(current));
          }
          if (t < 1) requestAnimationFrame(step);
        }
        // add pop class to trigger scale animation
        el.classList.remove('score-increment');
        // force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('score-increment');
        requestAnimationFrame(() => requestAnimationFrame(step));
      }
      const titleEl = document.getElementById('results-song-title');
      const artistEl = document.getElementById('results-song-artist');
      const scoreEl = document.getElementById('results-score');
      const tpsEl = document.getElementById('results-tps');
      const lapsEl = document.getElementById('results-laps');
      const subtextEl = document.getElementById('results-subtext');
      const playerNameEl = document.getElementById('player-name-text');
      const ppointsEl = document.getElementById('p-points-display');
      const totalCrownsEl = document.getElementById('total-crowns');
      const totalStarsEl = document.getElementById('total-stars');

      if (selectedSongData) {
        const num = selectedSongData.id ?? selectedSongData.mid ?? '';
        const shouldPrefixTitle = !isChallengeMode && !isClassicMode;
        const localizedSongName = i18n ? i18n.getSongName(selectedSongData.musicJson) : selectedSongData.musicJson;
        const localizedArtistName = i18n ? i18n.getArtistName(selectedSongData.musician) : selectedSongData.musician;
        const displayTitle = `${shouldPrefixTitle && num ? String(num) + '. ' : ''}${localizedSongName}`;
        if (titleEl) titleEl.textContent = displayTitle;
        if (artistEl) artistEl.textContent = localizedArtistName || '';
      }

      if (isChallengeMode) {
        const finalTps = currentBpm / currentBeats / 60;
        if (tpsEl) {
          tpsEl.classList.add('hidden');
          tpsEl.textContent = '';
        }
        if (scoreEl) animateNumberTo(scoreEl, finalTps, 300, 3);
        if (lapsEl) {
          lapsEl.classList.remove('hidden');
          const lapCount = Math.max(1, songLoopCount + 1);
          lapsEl.textContent = `${lapCount} Lap${lapCount === 1 ? '' : 's'}`;
        }
        if (subtextEl) {
          subtextEl.classList.remove('hidden');
          subtextEl.textContent = 'TPS';
        }
        const medalsEl = document.getElementById('results-medals');
        if (medalsEl) {
          const rewardState = shouldShowChallengeRewards(selectedSongData) ? getChallengeRewardStateFromTps(finalTps) : null;
          renderResultsRewardIcons(medalsEl, rewardState);
        }
      } else if (isClassicMode) {
        const finalTiles = Number(classicTappedTiles || 0);
        const averageTilesPerSecond = finalTiles / Math.max(1, classicTimerDuration || 30);
        if (tpsEl) {
          tpsEl.classList.remove('hidden');
          tpsEl.textContent = `${averageTilesPerSecond.toFixed(2)} tiles/sec`;
        }
        if (scoreEl) animateNumberTo(scoreEl, finalTiles, 300, 0);
        if (lapsEl) {
          lapsEl.classList.add('hidden');
          lapsEl.textContent = '';
        }
        if (subtextEl) {
          subtextEl.classList.add('hidden');
          subtextEl.textContent = '';
        }
        const medalsEl = document.getElementById('results-medals');
        if (medalsEl) {
          const rewardState = getClassicChallengeRewardStateFromTiles(finalTiles);
          renderResultsRewardIcons(medalsEl, rewardState);
        }
      } else {
        if (tpsEl) {
          tpsEl.classList.remove('hidden');
          tpsEl.textContent = `${(currentBpm / currentBeats / 60).toFixed(3)} TPS`;
        }
        if (scoreEl) animateNumberTo(scoreEl, Number(currentScore || 0), 300, 0);
        if (lapsEl) {
          lapsEl.classList.remove('hidden');
          const lapCount = Math.max(1, songLoopCount + 1);
          lapsEl.textContent = `${lapCount} Lap${lapCount === 1 ? '' : 's'}`;
        }
        const numericScore = Number(currentScore || 0);
        const isNewBestScore = (() => {
          if (!selectedSongData) return false;
          const mid = String(selectedSongData.mid || selectedSongData.id || '');
          const scoreKey = `opentile_best_score_${mid}`;
          const prev = parseFloat(localStorage.getItem(scoreKey) || '0');
          const isBest = numericScore > prev;
          if (isBest) {
            localStorage.setItem(scoreKey, String(numericScore));
          }
          return isBest;
        })();

        if (subtextEl) {
          if (isNewBestScore) {
            subtextEl.classList.remove('hidden');
            subtextEl.textContent = 'New Best!';
          } else {
            subtextEl.classList.add('hidden');
            subtextEl.textContent = '';
          }
        }

        // compute stars/crowns earned for this play based on the award level
        const stage = getStarAndCrownState((normalSongAwardLevel || 1) - 1);
        const medalsEl = document.getElementById('results-medals');
        // helper to play result audio depending on stage
        async function playResultAudioSequence() {
          const ctx = ensureAudioEngine();
          if (!ctx) return;
          let audioPath = null;
          if (stage.crowns && stage.crowns > 0) {
            if (stage.crowns === 1) audioPath = 'Audio/OneCrown';
            else if (stage.crowns === 2) audioPath = 'Audio/TwoCrown';
            else audioPath = 'Audio/ThreeCrown';
          } else {
            const s = stage.stars || 0;
            if (s === 0) audioPath = 'Audio/FailPage';
            else if (s === 1) audioPath = 'Audio/PassPageOne';
            else if (s === 2) audioPath = 'Audio/PassPageTwo';
            else audioPath = 'Audio/PassPageThree';
          }

          async function playFile(base) {
            const buffer = await getCachedAudioBuffer(base);
            if (!buffer) return;
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            const startAt = ctx.currentTime + 0.01;
            source.buffer = buffer;
            gainNode.gain.setValueAtTime(1.0, startAt);
            source.connect(gainNode);
            gainNode.connect(audioGainNode);
            source.start(startAt);
            return new Promise((resolve) => {
              source.onended = () => resolve();
              // fallback timeout
              setTimeout(resolve, (buffer.duration || 0) * 1000 + 100);
            });
          }

          if (audioPath) {
            await playFile(audioPath);
          }

          // play NewBest audio when this run beat the stored best for the song
          if (isNewBestScore) {
            await playFile('Audio/NewBest');
          }
        }

        if (medalsEl) {
          medalsEl.innerHTML = '';
          // helper to animate numbers (integer or float)
          function animateNumberTo(el, finalValue, duration = 300, decimals = 0) {
            const start = 0;
            const end = Number(finalValue) || 0;
            const startTime = performance.now();
            function step(now) {
              const t = Math.min((now - startTime) / duration, 1);
              const eased = t; // linear easing is fine for short increment
              const current = start + (end - start) * eased;
              if (decimals > 0) {
                el.textContent = current.toFixed(decimals);
              } else {
                el.textContent = String(Math.round(current));
              }
              if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          }

          // always render 3 icons; fill achieved ones normally, unachieved as silhouettes
          const useCrowns = stage.crowns && stage.crowns > 0;
          const achieved = useCrowns ? stage.crowns : (stage.stars || 0);
          for (let i = 1; i <= 3; i++) {
            const img = document.createElement('img');
            img.src = useCrowns ? 'gameImage/crown.png' : 'gameImage/star.png';
            img.alt = useCrowns ? 'crown' : 'star';
            // show silhouettes immediately for all, but only animate achieved ones
            if (i > achieved) {
              img.className = 'inline-block medal-silhouette';
            } else {
              img.className = 'inline-block result-medal';
              img.style.animationDelay = `${(i - 1) * 0.5}s`;
            }
            medalsEl.appendChild(img);
          }
          // play the result audio sequence (do not block UI)
          playResultAudioSequence().catch(() => {});
        }
      }

      if (playerNameEl) playerNameEl.textContent = playerName || 'Player';
      if (ppointsEl) ppointsEl.textContent = pPointsDisplay ? pPointsDisplay.textContent : (pPointsDisplay || '0');
      if (totalCrownsEl) totalCrownsEl.textContent = totalCrownsDisplay ? totalCrownsDisplay.textContent : '0';
      if (totalStarsEl) totalStarsEl.textContent = totalStarsDisplay ? totalStarsDisplay.textContent : '0';

      // Show results screen and hide other overlays
      gameoverScreen.classList.add('hidden');
      startScreen.classList.add('hidden');
      songListScreen.classList.add('hidden');
      challengesScreen.classList.add('hidden');
      settingsScreen.classList.add('hidden');
      homeScreen.classList.add('hidden');

      resultsScreen.classList.remove('hidden');

      // Ensure shared top bar is visible on results screen
      const sharedTopBar = document.getElementById('shared-top-bar');
      if (sharedTopBar) sharedTopBar.classList.remove('hidden');

      // Hook up buttons
      const backBtn = document.getElementById('results-back-btn');
      const homeBtn = document.getElementById('results-home-btn');
      const favBtn = document.getElementById('results-fav-btn');
      if (backBtn) {
        backBtn.onclick = () => {
          // Play life intro immediately, disable button to prevent double-press
          backBtn.disabled = true;
          backBtn.classList.add('opacity-50');
          playLifeIntroSound();

          // Reinitialize state now so UI shows fresh board once loaded
          resetEngineState();

          setTimeout(() => {
            // hide results and load the song data (which will show the game UI)
            resultsScreen.classList.add('hidden');
            if (selectedSongData) {
              loadSongFromData(selectedSongData);
            } else {
              returnToMainMenu();
            }

            // re-enable button for future use (if results shown again)
            backBtn.disabled = false;
            backBtn.classList.remove('opacity-50');
          }, 1000);
        };
      }
      if (homeBtn) {
        homeBtn.onclick = () => {
          // play menu loop cue for feedback
          try { playMenuLoopCue(); } catch (e) {}
          resultsScreen.classList.add('hidden');
          returnToMainMenu();
        };
      }
      if (favBtn) {
        // set initial favourite state
        try {
          if (selectedSongData && favouriteSongs.has(String(selectedSongData.mid))) {
            favBtn.classList.add('favourite');
          } else {
            favBtn.classList.remove('favourite');
          }
        } catch (e) {}

        favBtn.onclick = () => {
          if (!selectedSongData) return;
          // play menu loop cue for feedback
          try { playMenuLoopCue(); } catch (e) {}
          const id = String(selectedSongData.mid);
          toggleFavourite(id);
          favBtn.classList.toggle('favourite', favouriteSongs.has(id));
          // update other UI that may show favourites
          renderFavouriteSongs();
        };
      }
    } catch (err) {
      console.warn('Failed populating results screen', err);
    }
  }
}

function failRun(failureType = 'miss', tile = null, colIdx = null) {
  // Stop the game immediately
  resetInputState();
  captureCurrentSpeedState();
  isPaused = true;
  isStarted = false;
  
  // Clean up classic mode
  if (isClassicMode) {
    if (classicTimerInterval) {
      clearInterval(classicTimerInterval);
      classicTimerInterval = null;
    }
    classicTimerStartedAt = 0;
    classicTimerEnding = false;
  }
  
  // Play lose sound immediately
  playLoseSound();
  
  if (gameBoardWrapper) {
    // Keep the game background visible while the fail animation runs.
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }
  classicScrollTarget = starthpos;
  updatePauseButtonVisibility();

  let shouldOfferRevive = reviveRemaining > 0;
  
  if (isChallengeMode) {
    shouldOfferRevive = false;
  } else {
    const stage = getStarAndCrownState((normalSongAwardLevel || 1) - 1);
    if (currentScore < 100 && stage.stars === 0) {
      shouldOfferRevive = false;
    }
  }

  if (shouldOfferRevive) {
    revivePendingFailure = true;
    revivePendingType = failureType;
    revivePendingTile = tile;
    revivePendingColIdx = colIdx;
  } else {
    revivePendingFailure = false;
    revivePendingType = null;
    revivePendingTile = null;
    revivePendingColIdx = null;
  }

  const openOrFinish = () => {
    if (shouldOfferRevive) {
      openReviveModal();
    } else {
      if (gameBoardWrapper) {
        gameBoardWrapper.classList.remove('game-playing');
      }
      finishRun(false);
    }
  };

  if (failureType === 'miss' && tile) {
    // Scroll back to reveal the missed tile
    // Calculate target position so the tile's bottom is at the hitline (key - 1)
    // We want: starthpos - tile.hpos = key - 1
    // So: starthpos = tile.hpos + key - 1
    const targetHpos = tile.hpos + key - 1;
    const scrollDuration = 300;
    const startHpos = starthpos;
    const startTime = performance.now();
    
    function scrollAnimation(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      starthpos = startHpos + (targetHpos - startHpos) * progress;
      classicScrollTarget = starthpos;
      
      if (progress < 1) {
        requestAnimationFrame(scrollAnimation);
      } else {
        blinkTile(tile);
        setTimeout(openOrFinish, 1000);
      }
    }
    requestAnimationFrame(scrollAnimation);
  } else if (failureType === 'wrong_hit' && tile && colIdx !== null) {
    flashColumnRed(colIdx, tile);
    setTimeout(openOrFinish, 1000);
  } else {
    setTimeout(openOrFinish, 1000);
  }
}

function tileMatchesColumn(tile, colIdx) {
  return getTileHitColumns(tile).includes(colIdx);
}

function maybeGrantNormalSongAward(tile) {
  if (!isStarted || isPaused || isClassicMode || isChallengeMode || !tile) return;
  if (!tile.isSectionAwardTile || tile.awardGranted) return;

  const previousStage = getStarAndCrownState((normalSongAwardLevel || 1) - 1);
  normalSongAwardLevel = Math.min(10, (normalSongAwardLevel || 1) + 1);
  tile.awardGranted = true;
  // Persist the score at which this level was reached so the revive modal
  // can display the score gap to the next award tier.
  if (selectedSongData && customStartingSpeed === 0) {
    const mid = String(selectedSongData.mid || selectedSongData.id || '');
    if (mid) {
      const scoreAtLevelKey = `opentile_score_at_level_${mid}_${normalSongAwardLevel}`;
      const existing = parseFloat(localStorage.getItem(scoreAtLevelKey) || '0');
      // Only update if the current score is lower (i.e. reached the level more efficiently)
      // or the key doesn't exist yet.
      if (!existing || currentScore < existing) {
        localStorage.setItem(scoreAtLevelKey, String(currentScore));
      }
    }
  }
  
  const currentStage = getStarAndCrownState((normalSongAwardLevel || 1) - 1);
  const shouldAnimateReward = getRewardTierRank(currentStage) > getRewardTierRank(previousStage);

  if (!isChallengeMode) {
    if (shouldAnimateReward) {
      triggerAwardAnimation(currentStage);
    }
    updateNormalSongAwardDisplay();
  }
}

function handleManualInputDown(colIdx, pointerEvent = null) {
  if (isPaused) return;
  
  // Handle start tile separately
  if (!isStarted) {
    const startTile = tiles.find((tile) => tile.isStartTile) || tiles.find((tile) => tile.type === -1 && tile.hpos === -1);
    if (startTile && tileMatchesColumn(startTile, colIdx)) {
      const tileBottom = getTileBottom(startTile);
      // Allow tapping start tile anywhere on-screen
      if (tileBottom >= 0) {
        delete startTile.isStartTile;
        isStarted = true;
        hasStartedGameplay = true;
        startTime = performance.now();
        if (gameBoardWrapper) {
          gameBoardWrapper.classList.add('game-playing');
          updateGameplayBackground();
          updatePauseButtonVisibility();
        }

        if (startTile.type === -1 && startTile.hpos === -1) {
          startTile.clicked = true;
          startTile.ended = 1;
          triggerTileHitAnimation(startTile);
          playTileAudioNow(startTile);
          if (isClassicMode) {
            classicTappedTiles++;
            advanceClassicTilefield();
          }
        } else if (isLongTile(startTile)) {
          playTileAudioNow(startTile);
          startTile.holdStarted = true;
          startTile.activeHoldColumn = colIdx;
          const el = document.querySelector(`[data-tile-id="${startTile.id}"]`);
          if (pointerEvent) {
            startTile.tapScreenY = pointerEvent.clientY;
          } else if (el) {
            const rect = el.getBoundingClientRect();
            const unitHeight = rect.height / startTile.hlen;
            startTile.tapScreenY = rect.bottom - (unitHeight / 2);
          }
          if (el && startTile.tapScreenY) {
            const rect = el.getBoundingClientRect();
            const unitHeight = rect.height / startTile.hlen;
            const tapDistFromTop = (startTile.tapScreenY - rect.top) / unitHeight;
            startTile.completionPlaying = startTile.playing + tapDistFromTop - 0.5;
            startTile.tapPlaying = startTile.playing;
          }
        } else if (startTile.type === 2) {
          startTile.clicked = true;
          startTile.ended = 1;
          triggerTileHitAnimation(startTile);
          playTileAudioNow(startTile);
          if (!startTile.isAccompanimentSingle) currentScore += 1;
          maybeGrantNormalSongAward(startTile);
        } else if (startTile.type === 5) {
          if (!startTile.hitColumns.includes(colIdx)) {
            startTile.hitColumns.push(colIdx);
            playTileAudioNow(startTile);
            if (startTile.hitColumns.length >= getActiveColumns(startTile).length) {
              startTile.clicked = true;
              startTile.ended = 1;
              triggerTileHitAnimation(startTile);
              currentScore += 4;
              maybeGrantNormalSongAward(startTile);
            }
          }
        } else if (startTile.type === 3) {
          playComboTapAudio(startTile);
          spawnComboPlusOne(startTile, colIdx, pointerEvent);
          spawnHitRipple(pointerEvent?.clientX ?? null, pointerEvent?.clientY ?? null, { tile: startTile, colIdx, big: true });
          startTile.remainingTaps = Math.max(0, (startTile.remainingTaps || startTile.taps || 2) - 1);
          if (startTile.remainingTaps <= 0) {
            startTile.clicked = true;
            startTile.ended = 1;
            currentScore += Math.max(2, startTile.taps || 2);
            maybeGrantNormalSongAward(startTile);
          }
        } else {
          startTile.clicked = true;
          startTile.ended = 1;
          triggerTileHitAnimation(startTile);
          playTileAudioNow(startTile);
          maybeGrantNormalSongAward(startTile);
        }
        return;
      }
    }
    return;
  }
  
  if (autoplayEnabled) return;
  
  const tile = getLowestManualTile();
  if (!tile) return;

  if (pointerEvent) {
    const boardRect = boardEl.getBoundingClientRect();
    const clickYRel = (pointerEvent.clientY - boardRect.top) / boardRect.height;
    const clickRow = Math.floor(clickYRel * key);
    
    const tileTopRow = Math.floor(getTileTop(tile));
    const tileBottomRow = Math.max(tileTopRow, Math.floor(getTileBottom(tile) - 0.01));

    if (clickRow < tileTopRow || clickRow > tileBottomRow) {
      return;
    }
  }

  // Only check for accompaniment tiles if the tapped tile is spatially close to them
  // This prevents routing to distant accompaniment tiles
  let longAccompanimentTile = null;
  let singleAccompanimentTile = null;
  
  if (tile.isAccompanimentTile || (pointerEvent && isTileNearAccompaniment(tile, pointerEvent))) {
    // Set the active sequence ID if we're hitting an accompaniment tile
    if (tile.isAccompanimentTile && tile.accompanimentSequenceId) {
      activeAccompanimentSequenceId = tile.accompanimentSequenceId;
    }
    
    // Check if the pressed column has an accompaniment tile that can be hit
    // Only consider accompaniment tiles that are spatially close AND from the active sequence
    longAccompanimentTile = tiles.find((t) => 
      t.isAccompanimentTile && 
      t.type === 9 && 
      t.isAccompanimentLong &&
      !t.clicked && 
      !t.holdCompleted &&
      tileMatchesColumn(t, colIdx) &&
      isTileNearTap(t, pointerEvent) &&
      (activeAccompanimentSequenceId === null || t.accompanimentSequenceId === activeAccompanimentSequenceId)
    );

    if (longAccompanimentTile) {
      // Set the active sequence ID when we start holding a long tile
      activeAccompanimentSequenceId = longAccompanimentTile.accompanimentSequenceId;
      
      // Long accompaniment tile - handle as holdable tile (completely silent)
      if (!longAccompanimentTile.holdStarted) {
        longAccompanimentTile.holdStarted = true;
        longAccompanimentTile.activeHoldColumn = colIdx;
        longAccompanimentTile.played = true;
        longAccompanimentTile.audioPlayed = true;
        const el = document.querySelector(`[data-tile-id="${longAccompanimentTile.id}"]`);
        if (pointerEvent) {
          longAccompanimentTile.tapScreenY = pointerEvent.clientY;
        } else if (el) {
          const rect = el.getBoundingClientRect();
          const unitHeight = rect.height / longAccompanimentTile.hlen;
          longAccompanimentTile.tapScreenY = rect.bottom - (unitHeight / 2);
        }
        if (el && longAccompanimentTile.tapScreenY) {
          const rect = el.getBoundingClientRect();
          const unitHeight = rect.height / longAccompanimentTile.hlen;
          const tapDistFromTop = (longAccompanimentTile.tapScreenY - rect.top) / unitHeight;
          longAccompanimentTile.completionPlaying = longAccompanimentTile.playing + tapDistFromTop - 0.5;
          longAccompanimentTile.tapPlaying = longAccompanimentTile.playing;
        }
      }
      // Don't return - allow single accompaniment tile to also be handled on the same tap
    }

    singleAccompanimentTile = tiles.find((t) => 
      t.isAccompanimentTile && 
      t.type === 2 && 
      t.isAccompanimentSingle &&
      !t.clicked && 
      !t.holdCompleted &&
      tileMatchesColumn(t, colIdx) &&
      isTileNearTap(t, pointerEvent) &&
      (activeAccompanimentSequenceId === null || t.accompanimentSequenceId === activeAccompanimentSequenceId)
    );

    if (singleAccompanimentTile) {
      // Set the active sequence ID when we hit a single tile
      activeAccompanimentSequenceId = singleAccompanimentTile.accompanimentSequenceId;
      
      // Use the single accompaniment tile instead of the regular tile
      singleAccompanimentTile.clicked = true;
      singleAccompanimentTile.ended = 1;
      triggerTileHitAnimation(singleAccompanimentTile);
      playTileAudioNow(singleAccompanimentTile);
      
      // Check if this was the last single tile in the sequence
      const sequenceId = singleAccompanimentTile.accompanimentSequenceId;
      const remainingSingleTiles = tiles.filter((t) => 
        t.isAccompanimentSingle && 
        t.accompanimentSequenceId === sequenceId && 
        !t.clicked
      );
      
      if (remainingSingleTiles.length === 0) {
        // Sequence completed, reset the active sequence ID
        activeAccompanimentSequenceId = null;
      }
      
      return;
    }
  }

  // Check if there's an active long tile in a different column
  const activeLongInOtherCol = tiles.find((t) => 
    isLongTile(t) && 
    t.holdStarted && 
    !t.holdCompleted && 
    !t.holdReleased && 
    t.activeHoldColumn !== colIdx
  );
  
  if (activeLongInOtherCol) {
    // Don't drop accompaniment long tiles when tapping on their single tiles
    // They're meant to be played together
    // Also check that they belong to the same sequence to prevent cross-sequence interference
    const isSameSequence = activeLongInOtherCol.accompanimentSequenceId && 
                          (tile.accompanimentSequenceId === activeLongInOtherCol.accompanimentSequenceId ||
                           (singleAccompanimentTile && singleAccompanimentTile.accompanimentSequenceId === activeLongInOtherCol.accompanimentSequenceId));
    
    if (activeLongInOtherCol.isAccompanimentLong && (tile.isAccompanimentSingle || singleAccompanimentTile) && isSameSequence) {
      // Allow both tiles to be active - don't drop the long tile
    } else {
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
  }

  // Remove hit window restriction - allow tapping anywhere on-screen
  // Keep column matching and order logic
  if (!tileMatchesColumn(tile, colIdx)) {
    failRun('wrong_hit', tile, colIdx);
    return;
  }
  
  // Don't allow tapping long tiles that have been released
  if (isLongTile(tile) && tile.holdReleased) {
    return;
  }

  if (tile.type === -1 || tile.type === 2) {
    tile.clicked = true;
    tile.ended = 1;
    triggerTileHitAnimation(tile);
    playTileAudioNow(tile);
    if (tile.type === 2 && !tile.isAccompanimentSingle) currentScore += 1;
    maybeGrantNormalSongAward(tile);
    
    // Classic mode: increment tapped tiles and advance field
    if (isClassicMode) {
      classicTappedTiles++;
      advanceClassicTilefield();
    }
    return;
  }

  if (tile.type === 5) {
    if (!tile.hitColumns.includes(colIdx)) {
      tile.hitColumns.push(colIdx);
      playTileAudioNow(tile);
      if (tile.hitColumns.length >= getActiveColumns(tile).length) {
        tile.clicked = true;
        tile.ended = 1;
        triggerTileHitAnimation(tile);
        currentScore += 4;
        maybeGrantNormalSongAward(tile);
        
        // Classic mode: increment tapped tiles and advance field
        if (isClassicMode) {
          classicTappedTiles++;
          advanceClassicTilefield();
        }
      }
    }
    return;
  }

  if (tile.type === 3) {
    playComboTapAudio(tile);
    spawnComboPlusOne(tile, colIdx, pointerEvent);
    spawnHitRipple(pointerEvent?.clientX ?? null, pointerEvent?.clientY ?? null, { tile, colIdx, big: true });
    tile.remainingTaps = Math.max(0, (tile.remainingTaps || tile.taps || 2) - 1);
    if (tile.remainingTaps <= 0) {
      tile.clicked = true;
      tile.ended = 1;
      currentScore += Math.max(2, tile.taps || 2);
      maybeGrantNormalSongAward(tile);
      
      // Classic mode: increment tapped tiles and advance field
      if (isClassicMode) {
        classicTappedTiles++;
        advanceClassicTilefield();
      }
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
      maybeGrantNormalSongAward(tile);
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

function updateChallengeRewardAnimation() {
  if (!isChallengeMode || !shouldAnimateChallengeRewards(selectedSongData)) {
    lastHudRewardState = { stars: 0, crowns: 0 };
    clearAwardAnimation();
    return;
  }

  const rewardState = getChallengeRewardStateFromTps(currentBeats > 0 ? currentBpm / currentBeats / 60 : 0);
  const previousRewardState = lastHudRewardState && lastHudRewardState.stars !== undefined && lastHudRewardState.crowns !== undefined
    ? lastHudRewardState
    : null;
  const previousTier = getRewardTierRank(previousRewardState);
  const currentTier = getRewardTierRank(rewardState);
  const rewardTierImproved = previousTier > 0 && currentTier > previousTier;
  const rewardTierVisible = currentTier > 0;
  const shouldAnimateTier = rewardTierImproved && rewardTierVisible && shouldShowRewardAnimationForTier(currentTier);

  if (shouldAnimateTier) {
    triggerAwardAnimation(rewardState);
  } else {
    clearAwardAnimation();
  }

  lastHudRewardState = rewardState;
}

function updateClassicRewardAnimation() {
  if (!isClassicMode) {
    lastHudRewardState = { stars: 0, crowns: 0 };
    clearAwardAnimation();
    return;
  }

  const rewardState = getClassicChallengeRewardStateFromTiles(Number(classicTappedTiles || 0));
  const previousRewardState = lastHudRewardState && lastHudRewardState.stars !== undefined && lastHudRewardState.crowns !== undefined
    ? lastHudRewardState
    : null;
  const previousTier = getRewardTierRank(previousRewardState);
  const currentTier = getRewardTierRank(rewardState);
  const rewardTierImproved = previousTier > 0 && currentTier > previousTier;
  const rewardTierVisible = currentTier > 0;
  const shouldAnimateTier = rewardTierImproved && rewardTierVisible && shouldShowRewardAnimationForTier(currentTier);

  if (shouldAnimateTier) {
    triggerAwardAnimation(rewardState);
  } else {
    clearAwardAnimation();
  }

  lastHudRewardState = rewardState;
}

function updateNormalSongAwardDisplay() {
  starsDisplay.innerHTML = '';
  crownsDisplay.innerHTML = '';
  starsDisplay.classList.add('hidden');
  crownsDisplay.classList.add('hidden');

  if (isChallengeMode) {
    updateChallengeRewardAnimation();
  } else if (isClassicMode) {
    updateClassicRewardAnimation();
  }
}

function updateHUD() {
  updateTpsDisplayColor();
  const { bpm: effectiveBpm, beats: effectiveBeats } = getEffectiveSpeedState();
  // Use the cached active combo tile (set once per engine frame) for TPS display.
  const displayBpm = (preslowdownBpm > 0 && cachedActiveComboTile) ? preslowdownBpm : effectiveBpm;
  const scrollSpeed = hasStartedGameplay ? displayBpm / effectiveBeats / 60 : 0;
  const tpsText = `${scrollSpeed.toFixed(3)}`;

  tpsDisplayNormal?.classList.add('hidden');
  tpsDisplayChallenge?.classList.add('hidden');
  scoreDisplay.classList.add('hidden');

  updateGameplayBackground();

  updateNormalSongAwardDisplay();

  if (isAwardAnimationRunning) {
    return;
  }

  if (isChallengeMode) {
    // In challenge mode: hide score, show challenge TPS, hide stars/crowns
    if (isGameLoaded) {
      tpsDisplayChallenge?.classList.remove('hidden');
      if (tpsDisplayChallenge) {
        // Wrap each character in an individual span for consistent positioning
        tpsDisplayChallenge.innerHTML = tpsText.split('').map(char => 
          `<span class="score-digit-wrapper">${char}</span>`
        ).join('');
      }
    }
  } else if (isClassicMode) {
    // Classic mode: hide score, show timer with 3 decimal points, hide stars/crowns
    if (isGameLoaded) {
      tpsDisplayChallenge?.classList.remove('hidden');
      if (tpsDisplayChallenge) {
        // Wrap each character in an individual span for consistent positioning
        const timerText = classicTimer.toFixed(3);
        tpsDisplayChallenge.innerHTML = timerText.split('').map(char => 
          `<span class="score-digit-wrapper">${char}</span>`
        ).join('');
      }
    }
  } else {
    // Normal mode: show score, show normal TPS, show stars/crowns
    scoreDisplay.classList.remove('hidden');
    // Wrap each digit in an individual span for consistent positioning
    const scoreStr = String(currentScore);
    scoreDisplay.innerHTML = scoreStr.split('').map(digit => 
      `<span class="score-digit-wrapper">${digit}</span>`
    ).join('');

    if (isGameLoaded) {
      tpsDisplayNormal?.classList.remove('hidden');
      if (tpsDisplayNormal) {
        // Wrap each character in an individual span for consistent positioning
        tpsDisplayNormal.innerHTML = tpsText.split('').map(char => 
          `<span class="score-digit-wrapper">${char}</span>`
        ).join('');
      }
    }
  }
}

function getTileTop(tile) {
  // visualAdjustedHpos = hpos - visualHposOffset, precomputed at spawn.
  // Falls back to raw hpos for the start tile which has no visualHposOffset.
  const adjHpos = tile.visualAdjustedHpos ?? tile.hpos;
  return starthpos - adjHpos - getTileEffectiveHeight(tile);
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
    const tileHeight = getTileEffectiveHeight(tile);
    const bottomUnits = topUnits + tileHeight;
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
    el.style.height = `${(tileHeight / key) * 100}%`;
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
    startLabelEl.classList.remove('tile-start-label-at-head');
    startLabelEl.style.justifyContent = 'center';
    startLabelEl.style.fontFamily = 'var(--font-game)';
    startLabelEl.style.fontWeight = '500';
    startLabelEl.style.fontSize = '2.8rem';
    startLabelEl.style.color = '#ffffff';
    startLabelEl.style.letterSpacing = '0.1em';
    startLabelEl.style.display = 'none';
    startLabelEl.style.position = 'absolute';
    startLabelEl.style.inset = '0';
    startLabelEl.style.top = '0';
    startLabelEl.style.right = '0';
    startLabelEl.style.bottom = '0';
    startLabelEl.style.left = '0';
    startLabelEl.style.height = 'auto';
    startLabelEl.style.alignItems = 'center';

    const showStartLabel = tile.isStartTile && !tile.played && !isStarted;
    const showStartLabelAtHead = showStartLabel && isLongTile(tile);

    if (tile.type === -1 && tile.hpos === -1) {
      const animatedHitFrame = getTileHitAnimationFrame(tile);
      const startTileImageSuffix = animatedHitFrame > 0
        ? getTileFinishImage(animatedHitFrame)
        : (tile.played ? getTileFinishImage(tile.ended) : 'tile_start');
      el.style.backgroundImage = `url("gameImage/${startTileImageSuffix}.png")`;
      if (!tile.played && !isStarted) {
        startLabelEl.classList.remove('hidden');
        startLabelEl.style.display = 'flex';
      }
    } else if (tile.type === 1) {
      // Rest/blank tile - make entirely invisible
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    } else if (isTapTile(tile) || isDoubleTile(tile)) {
      let isPlayed = tile.played;
      let isEnded = tile.ended;
      if (isDoubleTile(tile) && !autoplayEnabled) {
        const thisCol = cols[0];
        isPlayed = tile.hitColumns.includes(thisCol);
        isEnded = isPlayed ? 1 : 0;
      }

      const animatedHitFrame = getTileHitAnimationFrame(tile);
      const tileImageSuffix = animatedHitFrame > 0
        ? getTileFinishImage(animatedHitFrame)
        : (isPlayed ? getTileFinishImage(isEnded) : 'tile_black');
      el.style.backgroundImage = `url("gameImage/${tileImageSuffix}.png")`;
      if (showStartLabel) {
        startLabelEl.classList.remove('hidden');
        startLabelEl.style.display = 'flex';
      }
    } else if (isComboTile(tile) && !autoplayEnabled) {
      if (el.className !== 'tile-combo') el.className = 'tile-combo';
      el.style.backgroundImage = `url("gameImage/${tile.clicked ? getTileFinishImage(tile.ended) : 'tile_black'}.png")`;
      comboBadgeEl.classList.remove('hidden');
      // Use nullish coalescing to correctly show 0 when all taps are done
      const badgeVal = String(tile.remainingTaps ?? 0);
      if (el.dataset.lastBadgeText !== badgeVal) {
        comboBadgeEl.textContent = badgeVal;
        el.dataset.lastBadgeText = badgeVal;
      }
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

      if (showStartLabelAtHead) {
        const headHeightPercent = (1.35 / tile.hlen) * 100;
        startLabelEl.classList.remove('hidden');
        startLabelEl.classList.add('tile-start-label-at-head');
        startLabelEl.style.display = 'flex';
        startLabelEl.style.inset = 'auto';
        startLabelEl.style.left = '0';
        startLabelEl.style.right = '0';
        startLabelEl.style.top = 'auto';
        startLabelEl.style.bottom = '-110px';
        startLabelEl.style.height = `${headHeightPercent}%`;
        startLabelEl.style.fontSize = '2.8rem';
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
  let nextBpm = currentBpm;
  let nextBeats = currentBeats;
  const shouldPreserveSpeed = preserveCurrentSpeedOnNextFrame || isPaused || !hasStartedGameplay;

  if (!shouldPreserveSpeed) {
    if (isChallengeMode) {
      nextBpm = challengeBaseBpm;
      nextBeats = challengeBaseBeats;
    } else if (isClassicMode) {
      nextBpm = currentBpm;
      nextBeats = currentBeats;
    } else {
      const baseSpeed = getRuntimeSpeed(speedLevel - 1);
      nextBpm = baseSpeed.bpm;
      nextBeats = baseSpeed.beats;
    }
  } else {
    nextBpm = pausedSpeedBpm;
    nextBeats = pausedSpeedBeats;
  }

  if (preserveCurrentSpeedOnNextFrame) {
    preserveCurrentSpeedOnNextFrame = false;
  }

  const activeComboTile = getActiveComboTile();
  // Cache for use in updateHUD (avoids a second full tiles.find scan per frame)
  cachedActiveComboTile = activeComboTile;
  const comboSlowdownMultiplier = activeComboTile && activeComboTile.remainingTaps > 0
    ? (activeComboTile.remainingTaps === 1 ? 0.2 : (0.2 / activeComboTile.remainingTaps))
    : 1;

  // Challenge mode uses constant acceleration as its only speed-changing mechanic.
  if (isChallengeMode && isStarted && !isPaused) {
    if (!activeComboTile) {
      // Accumulate BPM increase only when no combo tile is active
      if (challengeLastAccelerationTime === 0) {
        challengeLastAccelerationTime = now;
      }
      const timeSinceLastAcceleration = (now - challengeLastAccelerationTime) / 1000;
      if (timeSinceLastAcceleration >= 0.1) {
        const bpmIncrease = challengeAcceleration * nextBeats * 60;
        challengeBpmOffset += bpmIncrease;
        challengeLastAccelerationTime = now;
      }
    } else {
      // While a combo tile is active, freeze the acceleration timer so we don't
      // accumulate a large gap when it resumes.
      challengeLastAccelerationTime = now;
    }
    // Always apply the already-accumulated offset so slowdown is relative to current speed
    nextBpm += challengeBpmOffset;
  }

  // Capture the pre-slowdown BPM for the TPS display.
  preslowdownBpm = nextBpm;
  nextBpm *= comboSlowdownMultiplier;
  currentBpm = nextBpm;
  currentBeats = nextBeats;

  if (bgLevelPos.length && bgLevelPos[0] < starthpos) {
    bgLevelPos.shift();
    bgLevel++;
  }
  if (speedLevelPos.length && speedLevelPos[0] < starthpos) {
    speedLevelPos.shift();
    if (!isChallengeMode && !isClassicMode) {
      speedLevel++;
    }
  }

  while (tiles.filter(t => !t.isAccompanimentTile).length < key * 3) {
    if (currentSectionIndex < sheet.length) {
      const currentTile = sheet[currentSectionIndex][currentSectionTileIndex];
      if (currentTile) {
        const comboTaps = Math.max(2, currentTile.scores.length || Math.round(currentTile.hlen) + 1);
        const isCombo = currentTile.type === 3;
        const isAccompanimentTile = currentTile.type === 9;
        const sectionTileIndex = currentSectionTileIndex;
        const isLastTileInSection = sectionTileIndex === sheet[currentSectionIndex].length - 1;
        currentSectionTileIndex++;

        if (isAccompanimentTile) {
          const { longColumn } = getAccompanimentTilePos();
          const longWarr = new Array(key).fill(0);
          longWarr[longColumn] = 1;
          
          // Assign a unique sequence ID to this accompaniment group
          const currentSequenceId = ++accompanimentSequenceId;

          tiles.push({
            id: nextTileId++,
            type: currentTile.type,
            scores: [],
            hlen: currentTile.hlen,
            hpos,
            visualHposOffset,
            visualAdjustedHpos: hpos - visualHposOffset,
            warr: longWarr,
            taps: 0,
            remainingTaps: 0,
            holdStarted: false,
            holdCompleted: false,
            released: false,
            clicked: false,
            played: false,
            ended: 0,
            hitColumns: [],
            hitAnimationStartedAt: 0,
            isSectionAwardTile: isLastTileInSection,
            awardGranted: false,
            isAccompanimentLong: true,
            isAccompanimentTile: true,
            accompanimentSequenceId: currentSequenceId
          });

          const numSingleTiles = Math.round(currentTile.hlen);
          for (let i = 0; i < numSingleTiles; i++) {
            const currentSingleColumn = getAccompanimentSingleColumn();
            const singleWarr = new Array(key).fill(0);
            singleWarr[currentSingleColumn] = 1;
            const singleTileHpos = hpos + i;
            // Each single tile gets the corresponding score group from the original accompaniment tile
            // currentTile.scores[i] is already a score group (array of notes), assign directly
            const tileScore = currentTile.scores[i] !== undefined ? currentTile.scores[i] : [];

            tiles.push({
              id: nextTileId++,
              type: 2,
              scores: tileScore,
              hlen: 1,
              hpos: singleTileHpos,
              visualHposOffset,
              visualAdjustedHpos: singleTileHpos - visualHposOffset,
              warr: singleWarr,
              taps: 0,
              remainingTaps: 0,
              holdStarted: false,
              holdCompleted: false,
              released: false,
              clicked: false,
              played: false,
              ended: 0,
              hitColumns: [],
              hitAnimationStartedAt: 0,
              isSectionAwardTile: isLastTileInSection && i === numSingleTiles - 1,
              awardGranted: false,
              isAccompanimentSingle: true,
              isAccompanimentTile: true,
              accompanimentSequenceId: currentSequenceId
            });
          }

          warr = new Array(key).fill(0);
        } else {
          warr = nextPos(warr, currentTile.type);
          tiles.push({
            id: nextTileId++,
            type: currentTile.type,
            scores: currentTile.scores,
            hlen: currentTile.hlen,
            hpos,
            visualHposOffset,
            visualAdjustedHpos: hpos - visualHposOffset,
            warr: [...warr],
            taps: isCombo ? comboTaps : 0,
            remainingTaps: isCombo ? comboTaps : 0,
            holdStarted: false,
            holdCompleted: false,
            released: false,
            clicked: false,
            played: false,
            ended: 0,
            hitColumns: [],
            hitAnimationStartedAt: 0,
            isSectionAwardTile: isLastTileInSection,
            awardGranted: false
          });
        }

        hpos += currentTile.hlen;
        // Combo tiles are displayed as 2 rows tall; accumulate the visual compression
        // so subsequent tiles are positioned directly above the combo with no gap.
        if (isCombo) {
          visualHposOffset += currentTile.hlen - 2;
        }
      } else {
        bgLevelPos.push(hpos - 4 + key);
        // Advance the normal-song award threshold one tile earlier so it can trigger
        // at the end of the current section rather than the next section's first tile.
        speedLevelPos.push(hpos - 2 + key);
        currentSectionIndex++;
        currentSectionTileIndex = 0;
      }
    } else {
      currentSectionIndex = 0;
      songLoopCount += 1;
    }
  }

  tiles.forEach((tile) => {
    tile.playing = starthpos - tile.hpos - (key - 1);
    // Use the visual-adjusted position for the autoplay audio trigger so tiles after a
    // combo tile (which have a large visualHposOffset) are triggered at the correct time.
    const visualPlaying = starthpos - (tile.visualAdjustedHpos ?? tile.hpos) - (key - 1);
    if (autoplayEnabled && visualPlaying > 0 && !tile.played && !tile.isAccompanimentLong) {
      let realLen = 0;
      // Handle both formats: array of arrays (normal tiles) or single array (single accompaniment tiles)
      const scoreGroups = Array.isArray(tile.scores[0]) ? tile.scores : [tile.scores];
      scoreGroups.forEach((scoreGroup) => {
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
          if (tile.isAccompanimentSingle) {
            // Single accompaniment tiles should only play when manually tapped
            if (tile.played && !tile.ended) {
              tile.clicked = true;
              tile.ended = 1;
            } else if (tile.ended) {
              tile.ended++;
            }
          } else if (tile.played && !tile.ended) {
            currentScore++;
            tile.clicked = true;
            tile.ended = 1;
            maybeGrantNormalSongAward(tile);
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 5:
          if (tile.played && !tile.ended) {
            currentScore += 4;
            tile.clicked = true;
            tile.ended = 1;
            maybeGrantNormalSongAward(tile);
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 3:
          if (tile.played && !tile.clicked) {
            if (!tile.lastAutoTapAt) tile.lastAutoTapAt = now;
            const elapsed = now - tile.lastAutoTapAt;
            if (elapsed >= 100) {
              tile.lastAutoTapAt = now;
              // Alternate left/right column for effects
              const activeComboCols = getActiveColumns(tile);
              const autoComboSide = (tile.autoTapCount || 0) % 2 === 0 ? 0 : activeComboCols.length - 1;
              const autoComboColIdx = activeComboCols[autoComboSide] ?? (activeComboCols[0] ?? 0);
              tile.autoTapCount = (tile.autoTapCount || 0) + 1;
              // Resolve column coordinates once here to avoid DOM queries inside
              // spawnComboPlusOne and spawnHitRipple (the null,null fallback path).
              const autoColEl = colElements[autoComboColIdx];
              const autoColRect = autoColEl?.getBoundingClientRect();
              const autoRippleX = autoColRect ? autoColRect.left + autoColRect.width / 2 : null;
              const autoRippleY = autoColRect ? autoColRect.bottom - autoColRect.height * 0.25 : null;
              playComboTapAudio(tile);
              spawnComboPlusOne(tile, autoComboColIdx, null);
              spawnHitRipple(autoRippleX, autoRippleY, { tile, colIdx: autoComboColIdx, big: true });
              tile.remainingTaps = Math.max(0, (tile.remainingTaps || tile.taps || 2) - 1);
              currentScore += 1;
              if (tile.remainingTaps <= 0) {
                tile.clicked = true;
                tile.ended = 1;
                maybeGrantNormalSongAward(tile);
              }
            }
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
              maybeGrantNormalSongAward(tile);
            } else {
              tile.ended++;
            }
          }
          break;
        case 9:
          // Accompaniment long tiles - completely silent, no scoring
          if (tile.playing > tile.hlen - 1) {
            tile.clicked = true;
            tile.ended = 1;
          } else if (tile.ended) {
            tile.ended++;
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
              maybeGrantNormalSongAward(tile);
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

  if (!autoplayEnabled && !isPaused) {
    // Handle combo tiles going off-screen:
    // - Never-tapped combos (remainingTaps === taps) → silently dismissed
    // - Partially-tapped combos (remainingTaps < taps) → game-over
    let partiallyTappedComboMissed = null;
    tiles.forEach((tile) => {
      if (
        isComboTile(tile) &&
        !tile.clicked &&
        tile.remainingTaps > 0 &&
        getTileTop(tile) > key + 0.05
      ) {
        if (tile.remainingTaps < (tile.taps || 2)) {
          // Player started tapping but didn't finish — game over
          partiallyTappedComboMissed = tile;
        } else {
          // Never tapped — silently dismiss
          tile.clicked = true;
          tile.ended = 1;
        }
      }
    });
    if (partiallyTappedComboMissed) {
      failRun('miss', partiallyTappedComboMissed);
      return;
    }

    const missedTile = tiles.find((tile) => {
      if (tile.type === 1) return false;
      if (isComboTile(tile)) return false; // handled above
      // Don't fail while waiting for a START tap
      if (!isStarted && (tile.isStartTile || (tile.type === -1 && tile.hpos === -1))) return false;
      if (tile.clicked || tile.holdCompleted) return false;
      if (isLongTile(tile) && tile.holdStarted) return false;
      return getTileTop(tile) > key + 0.05;
    });
    if (missedTile) {
      failRun('miss', missedTile);
    }
  }

  // Clean up tiles that have fully scrolled off the top of the screen.
  // Uses getTileTop (visual position) so combo tiles don't linger due to large raw hlen.
  if (tiles[0] && getTileTop(tiles[0]) > key + 1) {
    tiles.shift();
  }

  // In classic mode, load next song when all tiles are cleared
  if (isClassicMode && tiles.length === 0) {
    loadNextClassicSong();
  }

  if (isClassicMode) {
    if (isStarted && !isPaused && classicTimerStartedAt) {
      classicTimer = Math.max(0, classicTimerDuration - (performance.now() - classicTimerStartedAt) / 1000);
      if (classicTimer <= 0) {
        classicTimer = 0;
        if (!classicTimerEnding) {
          classicTimerEnding = true;
          const timerDisplay = tpsDisplayChallenge;
          if (timerDisplay) {
            let blinkCount = 0;
            const blinkTimer = () => {
              timerDisplay.classList.remove('blink-three-times');
              void timerDisplay.offsetWidth;
              timerDisplay.classList.add('blink-three-times');
              blinkCount += 1;
              if (blinkCount < 3) {
                setTimeout(blinkTimer, 200);
              } else {
                setTimeout(() => {
                  timerDisplay.classList.remove('blink-three-times');
                  finishRun(false);
                }, 1000);
              }
            };
            blinkTimer();
          } else {
            setTimeout(() => finishRun(false), 1000);
          }
        }
        return;
      }
    }
    starthpos += (classicScrollTarget - starthpos) * 0.18;
  } else if (isStarted && !isPaused) {
    let effectiveTps = currentBpm / currentBeats / 60;
    if (isReviveSlowdownActive) {
      const elapsed = (now - reviveSlowdownStartTime) / 1000;
      if (elapsed >= 2) {
        isReviveSlowdownActive = false;
      } else {
        // Starts at 2 tiles/sec and linearly interpolates to effectiveTps over 2 seconds
        effectiveTps = 2 + (effectiveTps - 2) * (elapsed / 2);
      }
    }
    starthpos += (now - startTime) * effectiveTps / 1000;
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
  resetInputState();
  ensureAudioEngine();
  startScreen.classList.add('hidden');
  songListScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  isStarted = true;
  hasStartedGameplay = true;
  isPaused = false;
  startTime = performance.now();
  updatePauseButtonVisibility();
  isPlayInProgress = false; // Reset play progress flag when game actually starts
}

function stopGame(showStart = true) {
  clearQueuedTimeouts();
  resetEngineState();
  selectedSongData = null;
  lastLoadedJsonText = '';
  lastLoadedLabel = '';
  isPlayInProgress = false; // Reset play progress flag when game stops
  if (showStart) {
    startScreen.classList.add('hidden');
    songListScreen.classList.add('hidden');
    challengesScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    renderHomeScreen();
  }
  gameoverScreen.classList.add('hidden');
  scoreDisplay.innerHTML = '<span class="score-digit-wrapper">0</span>';
  starsDisplay.innerHTML = '';
  crownsDisplay.innerHTML = '';
  
  updatePauseButtonVisibility();
}

function returnToMainMenu() {
  clearQueuedTimeouts();
  
  // Clean up classic mode timer
  if (isClassicMode) {
    if (classicTimerInterval) {
      clearInterval(classicTimerInterval);
      classicTimerInterval = null;
    }
    classicTimerStartedAt = 0;
    isClassicMode = false;
  }
  
  resetEngineState();
  selectedSongData = null;
  lastLoadedJsonText = '';
  lastLoadedLabel = '';
  isPlayInProgress = false; // Reset play progress flag when returning to menu
  const resultsScreen = document.getElementById('results-screen');
  if (resultsScreen) {
    resultsScreen.classList.add('hidden');
  }
  startScreen.classList.add('hidden');
  songListScreen.classList.add('hidden');
  challengesScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  scoreDisplay.innerHTML = '<span class="score-digit-wrapper">0</span>';
  starsDisplay.innerHTML = '';
  crownsDisplay.innerHTML = '';
  
  updatePauseButtonVisibility();

  if (currentDockTab === 'music') {
    showMusicScreen();
  } else if (currentDockTab === 'challenges') {
    showChallengesScreen();
  } else if (currentDockTab === 'settings') {
    showSettingsScreen();
  } else {
    showHomeScreen();
  }
}

function resetTileForResume(tile) {
  tile.clicked = false;
  tile.played = false;
  tile.audioPlayed = false;
  tile.ended = 0;
  tile.holdStarted = false;
  tile.holdCompleted = false;
  tile.holdReleased = false;
  tile.hitColumns = [];
  delete tile.holdReleasedAt;
  delete tile.activeHoldColumn;
  delete tile.tapScreenY;
  delete tile.tapPlaying;
  delete tile.completionPlaying;
  if (tile.type === 3) {
    tile.remainingTaps = tile.taps || 2;
  }

  // Center the START tile on screen if it's not fully visible
  const adjHpos = tile.visualAdjustedHpos ?? tile.hpos;
  const tileHeight = getTileEffectiveHeight(tile);
  const tileTop = starthpos - adjHpos - tileHeight;
  const tileBottom = starthpos - adjHpos;
  
  // Check if tile (or head of long tile) is fully visible on-screen
  // Using the same visibility check as the rest of the game: screen spans from 0 to key
  const isFullyVisible = tileBottom > 0 && tileTop < key;
  
  if (!isFullyVisible) {
    // Calculate new starthpos to center the tile, shifted down by 1 tile height
    // Tile center in screen coordinates: starthpos - adjHpos - tileHeight/2
    // Screen center shifted down by 1: starthpos - (key-1)/2 - 1
    // We want tile center = screen center shifted down by 1
    // So: starthpos - adjHpos - tileHeight/2 = starthpos - (key-1)/2 - 1
    // This simplifies to: adjHpos + tileHeight/2 = (key-1)/2 + 1
    // So: starthpos = adjHpos + tileHeight/2 + (key-1)/2 + 1
    starthpos = adjHpos + tileHeight / 2 + (key - 1) / 2 + 1;
    classicScrollTarget = starthpos;
  }
}

function continueFromPause() {
  if (!isPaused) return;

  captureCurrentSpeedState();
  preserveCurrentSpeedOnNextFrame = true;
  challengeLastAccelerationTime = performance.now();

  isPaused = false;
  isStarted = false;
  if (!pausedWasStarted) {
    tiles.forEach((tile) => {
      if (tile.type === -1 && tile.hpos === -1 && !tile.played) {
        tile.isStartTile = true;
      }
    });
  }
  pausedWasStarted = false;
  pauseScreen.classList.add('hidden');

  if (gameBoardWrapper) {
    // Preserve the loaded background when resuming from pause.
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }

  updatePauseButtonVisibility();
  playMenuLoopCue();
}

document.getElementById('revive-continue-btn')?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  resumeAfterRevive();
});

document.getElementById('revive-cancel-btn')?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  cancelRevivePrompt();
});

document.getElementById('revive-modal')?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('[data-close-revive-modal="true"]')) {
    cancelRevivePrompt();
  }
});

function exitToSongLibrary() {
  pauseScreen.classList.add('hidden');
  
  // Clean up classic mode timer
  if (isClassicMode) {
    if (classicTimerInterval) {
      clearInterval(classicTimerInterval);
      classicTimerInterval = null;
    }
    classicTimerStartedAt = 0;
    isClassicMode = false;
  }
  
  playMenuLoopCue();
  returnToMainMenu();
}

function togglePause() {
  if (!isGameLoaded) return;
  if (!hasStartedGameplay) {
    exitToSongLibrary();
    return;
  }
  if (isPaused) {
    continueFromPause();
    return;
  }

  clearQueuedTimeouts();
  captureCurrentSpeedState();
  pausedWasStarted = isStarted;

  if (pausedWasStarted) {
    tiles.forEach((tile) => delete tile.isStartTile);
    const nearestUntapped = getLowestManualTile();
    if (nearestUntapped && nearestUntapped.type !== 1 && nearestUntapped.hpos !== -1 && getTileBottom(nearestUntapped) >= 0) {
      resetTileForResume(nearestUntapped);
      nearestUntapped.isStartTile = true;
    }
  } else {
    tiles.forEach((tile) => {
      if (tile.type === -1 && tile.hpos === -1 && !tile.played) {
        tile.isStartTile = true;
      }
    });
  }

  isPaused = true;
  isStarted = false;
  challengeLastAccelerationTime = performance.now();
  pauseScreen.classList.remove('hidden');
  if (gameBoardWrapper) {
    // Keep the current gameplay background visible while paused.
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
  }
  updatePauseButtonVisibility();
  playMenuLoopCue();
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

function isChallengeSong(song) {
  if (!song) return false;
  const mid = song.mid ?? song.id ?? song;
  const midText = String(mid);
  return midText.startsWith('2');
}

function isClassicSong(song) {
  if (!song) return false;
  const mid = song.mid ?? song.id ?? song;
  const midText = String(mid);
  return midText.startsWith('200009');
}

function initializeClassicMode() {
  resetInputState();
  isClassicMode = true;
  classicTimer = classicTimerDuration;
  classicTimerStartedAt = performance.now();
  classicTappedTiles = 0;
  classicCurrentSongIndex = 0;
  classicScrollTarget = key - 2;
  
  // Create shuffled queue of Classic1-13
  classicSongQueue = [];
  for (let i = 1; i <= 13; i++) {
    classicSongQueue.push(`Classic${i}`);
  }
  // Shuffle the queue
  for (let i = classicSongQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [classicSongQueue[i], classicSongQueue[j]] = [classicSongQueue[j], classicSongQueue[i]];
  }
  
  if (classicTimerInterval) {
    clearInterval(classicTimerInterval);
    classicTimerInterval = null;
  }
}

function loadNextClassicSong() {
  if (classicCurrentSongIndex >= classicSongQueue.length) {
    // Reshuffle and start over
    classicCurrentSongIndex = 0;
    for (let i = classicSongQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [classicSongQueue[i], classicSongQueue[j]] = [classicSongQueue[j], classicSongQueue[i]];
    }
  }
  
  const songName = classicSongQueue[classicCurrentSongIndex];
  classicCurrentSongIndex++;
  
  // Load the song JSON directly
  fetch(`song/${songName}.json`)
    .then(response => response.json())
    .then(data => {
      loadSongObject(data, songName);
    })
    .catch(err => {
      console.error('Failed to load classic song:', err);
    });
}

function advanceClassicTilefield() {
  classicScrollTarget += 1;
}

function startClassicMode() {
  // Reset game state
  resetInputState();
  isGameLoaded = false;
  isStarted = false;
  isPaused = false;
  tiles = [];
  currentScore = 0;
  hpos = 0;
  visualHposOffset = 0;
  starthpos = key - 2;
  classicScrollTarget = starthpos;
  classicTimerDuration = 30;
  classicTimer = classicTimerDuration;
  classicTimerStartedAt = performance.now();
  sheet = [];
  info = [];
  currentSectionIndex = 0;
  currentSectionTileIndex = 0;
  bgLevel = 1;
  bgLevelPos = [];
  speedLevel = 1;
  speedLevelPos = [];
  warr = new Array(key).fill(0);
  
  // Initialize classic mode
  initializeClassicMode();
  
  // Load first classic song
  loadNextClassicSong();
  
  // Show game interface
  songListScreen.classList.add('hidden');
  challengesScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  homeScreen.classList.add('hidden');
  
  // Hide dock during gameplay
  const sharedDock = document.getElementById('shared-dock');
  if (sharedDock) {
    sharedDock.classList.add('hidden');
  }
  
  // Hide shared top bar during gameplay
  const sharedTopBar = document.getElementById('shared-top-bar');
  if (sharedTopBar) {
    sharedTopBar.classList.add('hidden');
  }
  
  // Show background immediately
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
  }
}

function saveLastPlayed(songId) {
  if (!songId) return;

  const song = musicCsvData.find((entry) => String(entry.mid) === String(songId));
  if (isChallengeSong(song)) return;

  lastPlayedSong = songId;
  localStorage.setItem('opentile_last_played', songId);
}

function saveFavourites() {
  localStorage.setItem('opentile_favourites', JSON.stringify([...favouriteSongs]));
}

function toggleFavourite(songId) {
  if (favouriteSongs.has(songId)) {
    favouriteSongs.delete(songId);
  } else {
    favouriteSongs.add(songId);
  }
  saveFavourites();
}

function getLocalizedSongDisplayName(song) {
  if (!song) return '';

  const songKey = song.musicJson || song.title || '';
  if (typeof i18n !== 'undefined' && i18n.getSongName) {
    return i18n.getSongName(songKey, songKey);
  }

  return songKey;
}

function renderHomeScreen() {
  // Render welcome back section
  let songToDisplay = null;

  if (lastPlayedSong) {
    songToDisplay = musicCsvData.find(song => String(song.mid) === lastPlayedSong && !isChallengeSong(song));
  }

  // Default to first non-challenge song if no suitable song played
  if (!songToDisplay && musicCsvData.length > 0) {
    songToDisplay = musicCsvData.find(song => !isChallengeSong(song)) || musicCsvData[0];
  }
  
  if (songToDisplay) {
    const localizedSongName = getLocalizedSongDisplayName(songToDisplay);
    welcomeSongTitle.textContent = `${songToDisplay.id}. ${localizedSongName}`;
    welcomePlayBtn.textContent = i18n ? i18n.t('btn_play') : 'Play';
    welcomePlayBtn.onclick = () => {
      if (isPlayInProgress) {
        return; // Prevent multiple play button presses
      }
      startSongTransition(songToDisplay);
    };
  } else {
    // Show "Loading songs..." if music data hasn't loaded yet
    if (musicCsvData.length === 0) {
      welcomeSongTitle.textContent = 'Loading songs...';
    } else if (!lastPlayedSong) {
      // Only show "No song played yet" if songs are loaded but none have been played
      welcomeSongTitle.textContent = i18n ? i18n.t('msg_no_song_played') : 'No song played yet';
    } else {
      // Last played song exists but wasn't found in data (maybe deleted)
      welcomeSongTitle.textContent = 'Song not found';
    }
    welcomePlayBtn.textContent = i18n ? i18n.t('btn_play') : 'Play';
    welcomePlayBtn.onclick = null;
  }

  // Render favourite songs
  renderFavouriteSongs();
  
  // Sync top dock data (includes player name sync)
  syncTopDockData();
  
  // Update translations for dynamic content
  if (typeof i18n !== 'undefined' && i18n.updateUITranslations) {
    i18n.updateUITranslations();
  }
  
  // Setup scroll rotation
  setupDiscRotation();
}

let discRotation = 0;
let lastScrollY = 0;

function setupDiscRotation() {
  const homeContentContainer = document.getElementById('home-content-container');
  const welcomeDisc = document.getElementById('welcome-disc');
  const welcomeCard = document.getElementById('welcome-card');
  const welcomeActions = document.getElementById('welcome-actions');
  const welcomeSongTitle = document.getElementById('welcome-song-title');
  const welcomePlayBtn = document.getElementById('welcome-play-btn');

  if (!homeContentContainer || !welcomeDisc || !welcomeCard || !welcomeActions || !welcomeSongTitle || !welcomePlayBtn) return;

  const updateWelcomeCardLayout = (scrollTop) => {
    const stickyStart = 0;
    const collapseRange = 220;
    const progress = Math.max(0, Math.min(1, (scrollTop - stickyStart) / collapseRange));

    const cardPadding = 1.5 - progress * 0.3;
    const cardMinHeight = 25 - progress * 4;
    const titleSize = 2 - progress * 0.6;
    const buttonPaddingY = 0.75 - progress * 0.2;
    const buttonPaddingX = 2 - progress * 0.5;
    const buttonFontSize = 1 - progress * 0.15;

    welcomeCard.style.setProperty('--welcome-card-padding', `${cardPadding.toFixed(2)}rem`);
    welcomeCard.style.setProperty('--welcome-card-min-height', `${cardMinHeight.toFixed(2)}rem`);
    welcomeActions.style.setProperty('--welcome-title-size', `${titleSize.toFixed(2)}rem`);
    welcomeActions.style.setProperty('--welcome-button-padding', `${buttonPaddingY.toFixed(2)}rem ${buttonPaddingX.toFixed(2)}rem`);
    welcomeActions.style.setProperty('--welcome-button-font-size', `${buttonFontSize.toFixed(2)}rem`);
  };

  const syncScrollState = () => {
    const currentScrollY = homeContentContainer.scrollTop;
    const scrollDelta = currentScrollY - lastScrollY;

    discRotation += scrollDelta * 0.5;
    welcomeDisc.style.transform = `rotate(${discRotation}deg)`;

    updateWelcomeCardLayout(currentScrollY);

    const actionsTop = welcomeActions.getBoundingClientRect().top;
    const containerTop = homeContentContainer.getBoundingClientRect().top;
    welcomeActions.classList.toggle('is-stuck', actionsTop <= containerTop + 1);

    lastScrollY = currentScrollY;
  };

  homeContentContainer.addEventListener('scroll', syncScrollState, { passive: true });
  updateWelcomeCardLayout(homeContentContainer.scrollTop);
}

function renderFavouriteSongs() {
  if (!favouriteSongsContainer) return;
  
  const favouriteSongsList = musicCsvData.filter(song => favouriteSongs.has(String(song.mid)));
  
  if (favouriteSongsList.length === 0) {
    const noFavouritesMsg = i18n ? i18n.t('msg_no_favourites') : 'No favourite songs yet. Tap the heart on any song to add it here!';
    favouriteSongsContainer.innerHTML = `<p class="text-gray-500 text-xs text-center py-4">${noFavouritesMsg}</p>`;
    return;
  }

  favouriteSongsContainer.innerHTML = '';
  favouriteSongsList.forEach(song => {
    const songCard = createSongCard(song, true);
    favouriteSongsContainer.appendChild(songCard);
  });
}

function updateDockSelection(nextTab) {
  currentDockTab = nextTab;
  [dockHomeBtn, dockMusicBtn, dockChallengesBtn, dockSettingsBtn].forEach((button) => button?.classList.remove('selected'));

  if (nextTab === 'home') {
    dockHomeBtn?.classList.add('selected');
  } else if (nextTab === 'music') {
    dockMusicBtn?.classList.add('selected');
  } else if (nextTab === 'challenges') {
    dockChallengesBtn?.classList.add('selected');
  } else if (nextTab === 'settings') {
    dockSettingsBtn?.classList.add('selected');
  }
}

function setDockView(tab) {
  if (tab !== 'settings' && !settingsScreen.classList.contains('hidden')) {
    saveSettingsToStorage();
    settingsScreen.classList.add('hidden');
  }

  if (tab === 'home') {
    homeScreen.classList.remove('hidden');
    songListScreen.classList.add('hidden');
    challengesScreen.classList.add('hidden');
    updateDockSelection('home');
    renderHomeScreen();
  } else if (tab === 'music') {
    homeScreen.classList.add('hidden');
    songListScreen.classList.remove('hidden');
    challengesScreen.classList.add('hidden');
    updateDockSelection('music');
    renderSongList();
  } else if (tab === 'challenges') {
    homeScreen.classList.add('hidden');
    songListScreen.classList.add('hidden');
    challengesScreen.classList.remove('hidden');
    updateDockSelection('challenges');
    renderChallenges();
  } else if (tab === 'settings') {
    updateSettingsUI();
    settingsScreen.classList.remove('hidden');
    updateDockSelection('settings');
  }

  const sharedDock = document.getElementById('shared-dock');
  if (sharedDock) {
    sharedDock.classList.remove('hidden');
  }

  // Ensure shared top bar is visible when viewing screens
  const sharedTopBar = document.getElementById('shared-top-bar');
  if (sharedTopBar) {
    sharedTopBar.classList.remove('hidden');
  }

  updatePauseButtonVisibility();

  syncTopDockData();
}

function showHomeScreen() {
  setDockView('home');
}

function showMusicScreen() {
  setDockView('music');
}

function showChallengesScreen() {
  setDockView('challenges');
}

function showSettingsScreen() {
  previousDockTabBeforeSettings = currentDockTab === 'settings' ? previousDockTabBeforeSettings : currentDockTab;
  setDockView('settings');
}

function syncTopDockData() {
  const { totalStars, totalCrowns, earnedPPoints } = calculateEarnedPPoints();
  const pPoints = Math.max(0, earnedPPoints - spentPPoints);
  
  // Update Music tab displays
  if (pPointsDisplay) pPointsDisplay.textContent = String(pPoints);
  if (totalCrownsDisplay) totalCrownsDisplay.textContent = String(totalCrowns);
  if (totalStarsDisplay) totalStarsDisplay.textContent = String(totalStars);
  
  // Update Home/Challenges fallbacks (kept for backwards compatibility)
  const pPointsDisplayHome = document.getElementById('p-points-display-home');
  const totalCrownsDisplayHome = document.getElementById('total-crowns-home');
  const totalStarsDisplayHome = document.getElementById('total-stars-home');
  const pPointsDisplayChallenges = document.getElementById('p-points-display-challenges');
  const totalCrownsDisplayChallenges = document.getElementById('total-crowns-challenges');
  const totalStarsDisplayChallenges = document.getElementById('total-stars-challenges');

  // Primary (shared) top bar updates
  if (pPointsDisplay) pPointsDisplay.textContent = String(pPoints);
  if (totalCrownsDisplay) totalCrownsDisplay.textContent = String(totalCrowns);
  if (totalStarsDisplay) totalStarsDisplay.textContent = String(totalStars);

  // Fallback updates for any remaining per-screen elements (optional)
  if (pPointsDisplayHome) pPointsDisplayHome.textContent = String(pPoints);
  if (totalCrownsDisplayHome) totalCrownsDisplayHome.textContent = String(totalCrowns);
  if (totalStarsDisplayHome) totalStarsDisplayHome.textContent = String(totalStars);
  if (pPointsDisplayChallenges) pPointsDisplayChallenges.textContent = String(pPoints);
  if (totalCrownsDisplayChallenges) totalCrownsDisplayChallenges.textContent = String(totalCrowns);
  if (totalStarsDisplayChallenges) totalStarsDisplayChallenges.textContent = String(totalStars);

  // Update player name (shared)
  if (playerNameText) playerNameText.textContent = playerName;
  const playerNameTextHome = document.getElementById('player-name-text-home');
  const playerNameTextChallenges = document.getElementById('player-name-text-challenges');
  if (playerNameTextHome) playerNameTextHome.textContent = playerName;
  if (playerNameTextChallenges) playerNameTextChallenges.textContent = playerName;

  updateLifeUi();
}

function initUi() {
  bestDisplay.textContent = `${highScore.toFixed(3)} t/s`;
  startScreen.classList.add('hidden');
  songListScreen.classList.add('hidden');
  homeScreen.classList.remove('hidden');
  gameoverScreen.classList.add('hidden');
  scoreDisplay.innerHTML = '<span class="score-digit-wrapper">0</span>';
  loadSettings();
  updateKeybindHints();
  normalizeLifeState();
  updateLifeUi();

  if (lifeUiIntervalId) clearInterval(lifeUiIntervalId);
  lifeUiIntervalId = window.setInterval(updateLifeUi, 1000);

  // Ensure shared UI (top bar and dock) visible on startup
  const sharedTopBar = document.getElementById('shared-top-bar');
  if (sharedTopBar) sharedTopBar.classList.remove('hidden');
  const sharedDock = document.getElementById('shared-dock');
  if (sharedDock) sharedDock.classList.remove('hidden');
}

async function initializeGame() {
  // Show loading screen
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
  }
  
  try {
    // Load assets in parallel
    await Promise.all([
      preloadSprites(),
      loadMusicCsv()
    ]);
    
    // Finalize loading
    updateLoadingProgress('complete', 1, 1);
    
    // Small delay to show the completion state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hide loading screen and initialize UI
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    
    initUi();
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
    
    // Even if there's an error, hide loading screen and show the game
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    initUi();
  }
}

document.getElementById('song-library-btn')?.addEventListener('click', () => {
  songListScreen.classList.remove('hidden');
  playMenuLoopCue();
});

document.getElementById('song-list-settings-btn')?.addEventListener('click', () => {
  updateSettingsUI();
  settingsScreen.classList.remove('hidden');
  playMenuLoopCue();
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  updateSettingsUI();
  settingsScreen.classList.remove('hidden');
  playMenuLoopCue();
});

document.getElementById('save-settings-btn')?.addEventListener('click', () => {
  saveSettingsToStorage();
  settingsScreen.classList.add('hidden');
  setDockView(previousDockTabBeforeSettings || 'home');
  setSongStatus(`Settings saved. Autoplay is ${autoplayEnabled ? 'on' : 'off'}.`);
  playMenuLoopCue();
});

document.getElementById('restart-btn')?.addEventListener('click', () => {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  if (selectedSongData) {
    startSongTransition(selectedSongData);
  } else if (lastLoadedJsonText) {
    startSongTextTransition(lastLoadedJsonText, lastLoadedLabel || 'Reloaded song');
  }
});

document.getElementById('home-btn')?.addEventListener('click', () => {
  returnToMainMenu();
});

document.getElementById('pause-continue-btn')?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  continueFromPause();
});

document.getElementById('pause-exit-btn')?.addEventListener('click', () => {
  exitToSongLibrary();
});

document.getElementById('pause-btn')?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  togglePause();
});

document.getElementById('pause-btn')?.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    event.preventDefault();
    event.stopPropagation();
    togglePause();
  }
});

lifeDisplayTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLifeModal();
  });
});

lifeModalCloseBtn?.addEventListener('click', () => {
  closeLifeModal();
});

lifeModal?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest('[data-close-life-modal="true"]')) {
    closeLifeModal();
  }
});

lifePurchaseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const amount = parseInt(button.dataset.lifeAmount || '0', 10);
    const cost = parseInt(button.dataset.lifeCost || '0', 10);
    if (!amount) return;
    purchaseLives(amount, cost, button);
  });
});

dockHomeBtn?.addEventListener('click', () => {
  showHomeScreen();
  playMenuLoopCue();
});

dockMusicBtn?.addEventListener('click', () => {
  showMusicScreen();
  playMenuLoopCue();
});

dockChallengesBtn?.addEventListener('click', () => {
  showChallengesScreen();
  playMenuLoopCue();
});

dockSettingsBtn?.addEventListener('click', () => {
  showSettingsScreen();
  playMenuLoopCue();
});

document.getElementById('player-name-text-home')?.addEventListener('click', () => {
  const newName = prompt('Enter your player name:', playerName);
  if (newName && newName.trim()) {
    playerName = newName.trim();
    localStorage.setItem('opentile_playername', playerName);
    syncTopDockData();
  }
});

document.getElementById('player-name-text')?.addEventListener('click', () => {
  const newName = prompt('Enter your player name:', playerName);
  if (newName && newName.trim()) {
    playerName = newName.trim();
    localStorage.setItem('opentile_playername', playerName);
    syncTopDockData();
  }
});

document.getElementById('player-name-text-challenges')?.addEventListener('click', () => {
  const newName = prompt('Enter your player name:', playerName);
  if (newName && newName.trim()) {
    playerName = newName.trim();
    localStorage.setItem('opentile_playername', playerName);
    syncTopDockData();
  }
});

const songSearchInput = document.getElementById('song-search-input');
songSearchInput?.addEventListener('input', (event) => {
  const query = event.target.value;
  renderSongList(query);
});

pt2MusicSelect?.addEventListener('change', () => {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  const mid = parseInt(pt2MusicSelect.value, 10);
  if (!mid) return;
  const songData = musicCsvData.find((song) => song.mid === mid);
  if (songData) {
    startSongTransition(songData);
  }
});

pt2JsonInput?.addEventListener('change', async (event) => {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    loadSongFromText(text, file.name);
  } catch (err) {
    setSongStatus(`Failed to load ${file.name}: ${err.message}`);
  }
});

customSongUpload?.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    customSongData = parsed;
    customSongLabel = file.name.replace(/\.json$/i, '');
    customSongStatus.textContent = `✓ Loaded: ${customSongLabel}`;
    customSongStatus.classList.add('text-green-600');
    setSongStatus(`Custom song loaded: ${customSongLabel}`);
    
    // Update the custom song card in the DOM
    const existingCard = document.querySelector('.custom-song-card');
    if (existingCard) {
      const newCard = createCustomSongCard();
      existingCard.replaceWith(newCard);
    }
  } catch (err) {
    customSongData = null;
    customSongLabel = '';
    customSongStatus.textContent = `✗ Failed to load: ${err.message}`;
    customSongStatus.classList.remove('text-green-600');
    setSongStatus(`Failed to load custom song: ${err.message}`);
  }
});

closeBpmModalBtn?.addEventListener('click', () => {
  if (bpmModal) {
    bpmModal.classList.add('hidden');
  }
});

// Close modal when clicking on backdrop
bpmModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeBpmModal === 'true') {
    bpmModal.classList.add('hidden');
  }
});

customSpeedInput?.addEventListener('input', (event) => {
  let value = parseInt(event.target.value, 10);
  // Clamp to whole numbers above 0 (0 = disabled, direct t/s value)
  if (isNaN(value) || value < 0) {
    value = 0;
  }
  // Update the input value to reflect clamping
  event.target.value = value;
  
  if (value === 0) {
    customSpeedDisplay.textContent = i18n?.t('label_disabled') || 'Disabled';
    customSpeedDisplay.classList.remove('text-indigo-600');
  } else {
    customSpeedDisplay.textContent = `${value} t/s`;
    customSpeedDisplay.classList.add('text-indigo-600');
  }
});

loadSampleJsonBtn?.addEventListener('click', async () => {
  try {
    const response = await fetch('song/Horseman.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    startSongTextTransition(await response.text(), 'Horseman.json');
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
  scoreDisplay.innerHTML = '<span class="score-digit-wrapper">0</span>';
  starsDisplay.innerHTML = '';
  crownsDisplay.innerHTML = '';
  setSongStatus('Load a PT2 JSON file to play a song.');
});

document.querySelectorAll('.keybind-setter').forEach((button) => {
  button.addEventListener('click', () => {
    bindingColIdx = parseInt(button.dataset.colIdx || '-1', 10);
    if (bindingColIdx >= 0) {
      button.textContent = '...';
    }
    playMenuLoopCue();
  });
});

window.addEventListener('blur', () => {
  resetInputState();
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    resetInputState();
  }
});

window.addEventListener('keydown', (event) => {
  const activeElement = document.activeElement;
  const isEditableTarget = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT' ||
    activeElement.isContentEditable
  );

  if (bindingColIdx !== null) {
    keybinds[bindingColIdx] = event.code;
    localStorage.setItem('opentile_keybinds', JSON.stringify(keybinds));
    bindingColIdx = null;
    updateKeybindHints();
    event.preventDefault();
    return;
  }

  if (isEditableTarget) {
    return;
  }

  if ((event.code === 'Escape' || event.code === 'Space') && event.repeat) {
    return;
  }

  if (event.code === 'Escape') {
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen && !resultsScreen.classList.contains('hidden')) {
      returnToMainMenu();
      return;
    }
    if (lifeModal && !lifeModal.classList.contains('hidden')) {
      closeLifeModal();
      return;
    }
    if (!settingsScreen.classList.contains('hidden')) {
      saveSettingsToStorage();
      settingsScreen.classList.add('hidden');
      setDockView(previousDockTabBeforeSettings || 'home');
      return;
    }
    if (!pauseScreen.classList.contains('hidden')) {
      continueFromPause();
      return;
    }
    if (isGameLoaded && !hasStartedGameplay) {
      exitToSongLibrary();
      return;
    }
    if (isStarted || isGameLoaded) {
      togglePause();
    }
  }
  if (event.code === 'Space') {
    // Don't intercept space if user is typing in an input field
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
    togglePause();
    event.preventDefault();
    return;
  }
  const colIdx = keybinds.indexOf(event.code);
  if (colIdx !== -1) {
    if (event.repeat && activeKeys[colIdx]) {
      event.preventDefault();
      return;
    }

    activeKeys[colIdx] = true;
    handleManualInputDown(colIdx);
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const activeElement = document.activeElement;
  const isEditableTarget = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT' ||
    activeElement.isContentEditable
  );

  if (isEditableTarget) {
    return;
  }

  const colIdx = keybinds.indexOf(event.code);
  if (colIdx !== -1) {
    if (activeKeys[colIdx]) {
      activeKeys[colIdx] = false;
      handleManualInputUp(colIdx);
    }
    event.preventDefault();
  }
});

colElements.forEach((colElement, colIdx) => {
  colElement.addEventListener('pointerdown', (event) => {
    activeKeys[colIdx] = true;
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

// Prevent double-tap zoom on iOS devices
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Prevent iOS zoom on pinch
document.addEventListener('gesturestart', (event) => {
  event.preventDefault();
}, false);

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const interactiveTarget = target.closest('button, .dock-button, .song-card, .heart-button, .btn-play, .keybind-setter');
  if (!interactiveTarget) return;

  const menuUiContainer = target.closest('#home-screen, #song-list-screen, #challenges-screen, #start-screen, #settings-screen, #shared-dock');
  if (!menuUiContainer) return;

  const isPlayButton = Boolean(interactiveTarget.closest('.btn-play, #welcome-play-btn'));
  if (isPlayButton) return;

  playMenuLoopCue();
}, true);

initializeGame();

// Listen for language changes to update song displays (after functions are defined)
document.addEventListener('languageChanged', () => {
  if (typeof renderSongList === 'function') renderSongList();
  if (typeof renderHomeScreen === 'function') renderHomeScreen();
  if (typeof renderFavouriteSongs === 'function') renderFavouriteSongs();
  if (typeof populateMusicSelect === 'function') populateMusicSelect();
});

// Listen for language changes to update song displays
document.addEventListener('languageChanged', () => {
  renderSongList();
  renderHomeScreen();
  renderFavouriteSongs();
  populateMusicSelect();
});
rafId = requestAnimationFrame(frame);
