'use strict';

// Firebase imports from CDN (for direct auth usage in game.js)
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, deleteUser } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase integration functions
import {
  initializeGameFirebase,
  getAuthInstance,
  isFirebaseAvailable,
  syncLivesToFirestore,
  saveSongLevelToFirestore,
  syncAllUserDataToFirestore,
  loadAllUserDataFromFirestore
} from './firebase-integration.js';

let firebaseReady = false;
let auth = null;

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
const bestDisplay = document.getElementById('best-display');
const startScreen = document.getElementById('start-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const songListScreen = document.getElementById('song-list-screen');
const challengesScreen = document.getElementById('challenges-screen');
const classScreen = document.getElementById('class-screen');
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
const songs700PlusContainer = document.getElementById('700-plus-songs-container');
const dockHomeBtn = document.getElementById('dock-home-btn');
const dockMusicBtn = document.getElementById('dock-music-btn');
const dockChallengesBtn = document.getElementById('dock-challenges-btn');
const dockClassBtn = document.getElementById('dock-class-btn');
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
const googleLoginCard = document.getElementById('google-login-card');
const googleLoginBtn = document.getElementById('google-login-btn');
const loginPillPPoints = document.getElementById('login-pill-ppoints');
const loginPillCrowns = document.getElementById('login-pill-crowns');
const loginPillStars = document.getElementById('login-pill-stars');
let currentDockTab = 'home';
let previousDockTabBeforeSettings = 'home';

// Firebase configuration - loaded from firebase-config-browser.js
const firebaseConfig = window.firebaseConfig || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Firebase Authentication functions
function updateLoginPillStats() {
  const { earnedPPoints, totalStars, totalCrowns } = calculateEarnedPPoints();
  if (loginPillPPoints) loginPillPPoints.textContent = String(earnedPPoints);
  if (loginPillCrowns) loginPillCrowns.textContent = String(totalCrowns);
  if (loginPillStars) loginPillStars.textContent = String(totalStars);
}

function handleAuthStateChange(user) {
  const profilePill = document.getElementById('profile-pill');
  
  if (user) {
    // User is signed in, hide the login pill
    if (googleLoginCard) googleLoginCard.classList.add('hidden');
    
    // Set player name from Google account display name (override local name)
    if (user.displayName) {
      playerName = user.displayName;
      localStorage.setItem('opentile_playername', playerName);
      syncTopDockData();
    }
    
    // Update profile pill to show "Profile"
    if (profilePill) {
      profilePill.innerHTML = `
        <div class="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-gray-600">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span class="text-base font-semibold text-gray-800" data-i18n="label_profile">Profile</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-gray-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      `;
    }
  } else {
    // User is signed out, show the login pill
    if (googleLoginCard) {
      googleLoginCard.classList.remove('hidden');
      updateLoginPillStats();
    }
    
    // Reset player name to local storage
    playerName = localStorage.getItem('opentile_playername') || 'Player';
    syncTopDockData();
    
    // Update profile pill to show Google sign in button
    if (profilePill) {
      profilePill.innerHTML = `
        <div class="flex items-center gap-4">
          <svg class="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C.78 9.08 0 11.43 0 14s.78 4.92 2.18 6.93l2.85-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span class="text-base font-semibold text-gray-800">Sign in with Google</span>
        </div>
      `;
    }
  }
}

async function setupFirebaseAuth() {
  // Initialize Firestore integration (this will also initialize auth)
  try {
    firebaseReady = await initializeGameFirebase();
    if (firebaseReady) {
      // Get the auth instance from the initialized Firebase services
      auth = getAuthInstance();
      console.log('Firestore integration initialized');
    }
  } catch (error) {
    console.warn('Firestore initialization failed:', error);
    firebaseReady = false;
  }

  if (!auth) {
    console.warn('Firebase auth not initialized');
    return;
  }

  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    await handleAuthStateChange(user);
    
    // Load user data from Firestore when signed in
    if (user && firebaseReady) {
      try {
        const loaded = await loadAllUserDataFromFirestore();
        if (loaded) {
          console.log('User data loaded from Firestore');
          // Refresh UI with loaded data
          invalidateEarnedPPointsCache();
          syncTopDockData();
          updateLifeUi();
          // Refresh song list to show updated star/crown states
          if (typeof renderSongList === 'function') {
            renderSongList();
          }
          // Reinitialize settings UI with loaded settings
          if (typeof updateSettingsUI === 'function') {
            updateSettingsUI();
          }
        }
      } catch (error) {
        console.warn('Failed to load user data from Firestore:', error);
      }
    }
  });

  // Wire up login button
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log('Google sign in successful');
        
        // Sync local data to Firestore after sign in
        if (firebaseReady && musicCsvData) {
          syncAllUserDataToFirestore(musicCsvData).catch(err => {
            console.warn('Failed to sync data to Firestore after sign in:', err);
          });
        }
      } catch (error) {
        console.error('Google sign in error:', error);
      }
    });
  }

  // Set up periodic sync for when user comes back online
  setupPeriodicSync();
}

// Periodic sync to handle offline-to-online transitions
let syncIntervalId = null;

function setupPeriodicSync() {
  // Clear any existing interval
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }

  // Sync every 30 seconds when online and authenticated
  syncIntervalId = setInterval(async () => {
    if (!firebaseReady || !isFirebaseAvailable() || !musicCsvData) {
      return;
    }

    // Only sync if document is visible (user is actively using the app)
    if (document.visibilityState === 'visible') {
      try {
        await syncAllUserDataToFirestore(musicCsvData);
        console.debug('Periodic sync to Firestore completed');
      } catch (error) {
        console.debug('Periodic sync failed (likely offline):', error.message);
      }
    }
  }, 30000); // 30 seconds

  // Also sync when page becomes visible
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && firebaseReady && isFirebaseAvailable() && musicCsvData) {
      try {
        await syncAllUserDataToFirestore(musicCsvData);
        console.debug('Sync on page visibility change completed');
      } catch (error) {
        console.debug('Sync on visibility change failed (likely offline):', error.message);
      }
    }
  });

  // Sync when network comes back online
  window.addEventListener('online', async () => {
    if (firebaseReady && isFirebaseAvailable() && musicCsvData) {
      try {
        await syncAllUserDataToFirestore(musicCsvData);
        console.log('Sync on network reconnection completed');
      } catch (error) {
        console.warn('Sync on network reconnection failed:', error);
      }
    }
  });
}

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
let currentSongIsSongOfTheDay = false;

let highScore = parseFloat(localStorage.getItem('opentile_highscore') || '0');
let keybinds = JSON.parse(localStorage.getItem('opentile_keybinds') || '["KeyD","KeyF","KeyJ","KeyK"]');
let autoplayEnabled = localStorage.getItem('opentile_autoplay') === 'true';
let reviveSlowdownEnabled = localStorage.getItem('opentile_revive_slowdown') !== 'false'; // default true
let isReviveSlowdownActive = false;
let reviveSlowdownStartTime = 0;
let isPostReviveState = false;
let playerName = localStorage.getItem('opentile_playername') || 'Player';
let lastPlayedSong = localStorage.getItem('opentile_last_played') || null;
let favouriteSongs = new Set(JSON.parse(localStorage.getItem('opentile_favourites') || '[]'));
let customStartingSpeed = parseFloat(localStorage.getItem('opentile_custom_speed') || '0'); // 0 = disabled, direct t/s value
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
let classTotalPlayableTiles = 0;
let classSongHitTiles = []; // per-song hit tile counts (replaces old scalar classCurrentHitTiles)
let classCurrentHitTiles = 0; // kept for legacy references, mirrors classSongHitTiles[classSongIndex]
let classSongSectionStarts = [];
let classSongTotalTiles = [];
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
let isClassMode = false;
let classData = [];
let classCurrentData = null;
let classSongIndex = 0;
let classPauseTimer = 60;
let classPauseInterval = null;
let classHighestCleared = parseInt(localStorage.getItem('classHighestCleared') || '0', 10);
let classSongProgress = [];
let classLastHitSongIndex = 0; // song index of the most recently hit tile (hitline-based)
let classCourseCleared = false; // true when all Dan songs are passed (set before finishRun)

let challengeAcceleration = 0;
let challengeLastAccelerationTime = 0;
let challengeBpmOffset = 0;
let challengeBaseBpm = 120;
let challengeBaseBeats = 0.5;
let challengeStartTime = 0;

let isAwardAnimationRunning = false;
let awardAnimationTimeout = null;
let lastHudRewardState = { stars: 0, crowns: 0 };
let lastAnimatedRewardTier = 0;

// Increment the class-mode hit-tile counter for both the legacy scalar and the
// per-song array. Always use the HIT TILE's own song index (tile.classSongIdx)
// rather than the global classSongIndex (which is a look-ahead loading cursor
// that advances before the hitline reaches the new song).
function incrementClassHitTiles(tile) {
  // Accompaniment tiles (long and single) are excluded from classSongTotalTiles
  // in computeSectionScoreThresholds (type 9 / isAccompanimentTile).
  // The numerator must match: skip them here so the denominator and numerator
  // count exactly the same set of tiles, preventing premature 100%.
  if (tile && (tile.isAccompanimentTile || tile.isAccompanimentSingle || tile.isAccompanimentLong)) {
    return;
  }
  const songIdx = (tile && tile.classSongIdx != null) ? tile.classSongIdx : (classSongIndex || 0);
  classCurrentHitTiles = (classCurrentHitTiles || 0) + 1;
  if (!classSongHitTiles[songIdx]) {
    classSongHitTiles[songIdx] = 0;
  }
  classSongHitTiles[songIdx]++;
  classLastHitSongIndex = songIdx; // track which song the player is currently on
}

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

let pendingAwardAnimationStages = [];

function triggerPendingAwardAnimations() {
  if (pendingAwardAnimationStages.length > 0) {
    const stage = pendingAwardAnimationStages.shift();
    triggerAwardAnimation(stage);
  }
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
let classicLoadFailCount = 0; // consecutive failure guard
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
let activePointerIds = { 0: null, 1: null, 2: null, 3: null };
let bindingColIdx = null;
let pendingHitEffects = [];
let currentGameplayBackgroundIndex = 1;
let gameplayBackgroundTransitionTimeout = null;
let gameplayBackgroundTransitionTargetIndex = null;
let pendingBackgroundUpdate = false;
let pendingBgLevelIncrement = false;
let pendingSpeedLevelIncrement = false;
let bgLevelPosIndex = 0;
let speedLevelPosIndex = 0;
// Cached board rect — refreshed once per animation frame so touch handlers
// never have to call getBoundingClientRect() themselves (avoids layout flushes).
let _cachedBoardRect = null;
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
  
  // Sync to Firestore when online (non-blocking, won't affect offline gameplay)
  if (firebaseReady && isFirebaseAvailable()) {
    syncLivesToFirestore(lifeCount, lifeLastUpdatedAt).catch(err => {
      // Silently fail - offline gameplay continues normally
      console.debug('Firestore sync failed (likely offline):', err.message);
    });
  }
}

let _earnedPPointsCache = null;

function invalidateEarnedPPointsCache() {
  _earnedPPointsCache = null;
}

function calculateEarnedPPoints() {
  if (_earnedPPointsCache) return _earnedPPointsCache;

  let totalStars = 0;
  let totalCrowns = 0;

  musicCsvData.forEach((song) => {
    const bestLevel = parseInt(localStorage.getItem(`opentile_highscore_level_${song.mid}`) || '0', 10);
    const stage = getStarAndCrownState(bestLevel - 1);
    totalStars += stage.stars;
    totalCrowns += stage.crowns;
  });

  _earnedPPointsCache = {
    totalStars,
    totalCrowns,
    earnedPPoints: totalStars + (totalCrowns * 5)
  };
  return _earnedPPointsCache;
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
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
  isStarted = false;
  hasStartedGameplay = true;
  isPostReviveState = true; // Set flag to indicate we're in post-revive state
  tiles.forEach((tile) => delete tile.isStartTile);

  const nearestUntapped = getLowestManualTile();
  if (nearestUntapped) {
    resetTileForResume(nearestUntapped);
    nearestUntapped.isStartTile = true;
    nearestUntapped.isResumeStartTile = true;
  }

  if (pauseScreen) {
    pauseScreen.classList.add('hidden');
  }
  if (gameBoardWrapper) {
    gameBoardWrapper.classList.add('game-playing');
    gameBoardWrapper.classList.remove('game-bg-transition-active');
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
  
  if (targetBackgroundIndex === currentGameplayBackgroundIndex) {
    return;
  }

  // Use CSS classes for background switching (more performant than inline styles)
  gameBoardWrapper.classList.remove('bg-level-2', 'bg-level-3');
  
  if (targetBackgroundIndex === 2) {
    gameBoardWrapper.classList.add('bg-level-2');
  } else if (targetBackgroundIndex === 3) {
    gameBoardWrapper.classList.add('bg-level-3');
  }
  
  currentGameplayBackgroundIndex = targetBackgroundIndex;
}

function unexpected(str) {
  return new SyntaxError(`Unexpected '${str}' at position ${erm.index} (part ${erm.part} track ${erm.track + 1})`);
}

function lenToNum(len, type) {
  const map = type ? beatsMap : restMap;
  let sum = 0;
  for (const char of len) sum += map[char] || 0;
  return sum;
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

const _runtimeSpeedCache = new Map();

function getRuntimeSpeed(index) {
  const cacheKey = `${songName}:${index}:${customStartingSpeed}`;
  if (_runtimeSpeedCache.has(cacheKey)) {
    return _runtimeSpeedCache.get(cacheKey);
  }

  // Dans (Class mode) ignore Custom Speed settings
  if (customStartingSpeed > 0 && !isClassMode) {
    const baseSpeed = getSpeed(index);
    const customStartTps = customStartingSpeed;
    
    // Calculate speed incrementally with dynamic acceleration
    // The index represents the section index (0-based)
    let currentSpeed = customStartTps;
    for (let i = 0; i < index; i++) {
      const acceleration = currentSpeed < 10 ? 1 : 0.5;
      currentSpeed += acceleration;
    }
    const forcedTps = currentSpeed;
    
    const result = {
      bpm: Math.trunc(calculateBpmFromTps(forcedTps, baseSpeed.beats)),
      beats: baseSpeed.beats
    };
    _runtimeSpeedCache.set(cacheKey, result);
    return result;
  }
  const result = getSpeed(index);
  _runtimeSpeedCache.set(cacheKey, result);
  return result;
}

function getNewBpm(lastBpm, lastBeats, currentBeatsValue, loopTimes) {
  const tpm = lastBpm / lastBeats;
  const effectiveLoopTimes = isChallengeMode && loopTimes > 1 ? 1 : loopTimes;

  // Dans (Class mode) ignore Custom Speed settings
  if (customStartingSpeed > 0 && !isClassMode) {
    const customStartTps = customStartingSpeed;
    const sectionIndex = loopTimes * 0 + 1;
    
    // Calculate speed incrementally with dynamic acceleration
    let currentSpeed = customStartTps;
    for (let i = 1; i < sectionIndex; i++) {
      const acceleration = currentSpeed < 10 ? 1 : 0.5;
      currentSpeed += acceleration;
    }
    const forcedTps = currentSpeed;
    
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

function startSongTransition(songData, isSongOfTheDay = false) {
  if (isPlayInProgress) {
    return; // Prevent multiple play button presses
  }
  
  if (!spendLifeCost(getPlayLifeCost(songData))) {
    return;
  }

  isPlayInProgress = true;
  currentSongIsSongOfTheDay = isSongOfTheDay;
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
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingSubstatus = document.getElementById('loading-substatus');
  
  if (!loadingProgress || !loadingStatus) return;
  
  const percentage = Math.round((current / total) * 100);
  loadingProgress.style.width = `${percentage}%`;
  if (loadingPercentage) {
    loadingPercentage.textContent = `${percentage}%`;
  }
  
  const stageNames = {
    'sprites': 'Loading sprites...',
    'csv': 'Loading song data...',
    'audio': 'Preparing audio...',
    'complete': 'Ready!'
  };
  
  loadingStatus.textContent = stageNames[stage] || `Loading ${stage}...`;
  if (stage === 'complete' && loadingSubstatus) {
    loadingSubstatus.textContent = 'Initialization complete!';
  }
}

async function preloadAssets() {
  const loadingStatus = document.getElementById('loading-status');
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingProgress = document.getElementById('loading-progress');
  const loadingSubstatus = document.getElementById('loading-substatus');

  const tasks = [];
  
  // A. Sprites (Images in gameImage)
  const spriteNames = [
    '1', '2', '3', '4',
    'bgani_01', 'bgani_02', 'bgani_03',
    'circle_light', 'collect_cd_1014',
    'crown', 'dot_light',
    'long_finish', 'long_head', 'long_light', 'long_tap2', 'long_tilelight',
    'star', 'tile_black', 'tile_start'
  ];
  spriteNames.forEach(name => {
    tasks.push({
      type: 'sprite',
      name: name,
      url: `gameImage/${name}.png`,
      execute: () => new Promise((resolve) => {
        const img = new Image();
        img.src = `gameImage/${name}.png`;
        img.onload = () => {
          spriteCache[name] = img;
          resolve();
        };
        img.onerror = () => {
          spriteCache[name] = img;
          resolve();
        };
      })
    });
  });

  // B. Special images
  const specialImages = ['logo.png', 'logowide.png', 'right.png', 'splash.png'];
  specialImages.forEach(name => {
    tasks.push({
      type: 'special_image',
      name: name,
      url: `special/${name}`,
      execute: () => new Promise((resolve) => {
        const img = new Image();
        img.src = `special/${name}`;
        img.onload = resolve;
        img.onerror = resolve;
      })
    });
  });

  // C. Audio Effects
  const audioEffects = [
    'FailPage', 'Life', 'NewBest', 'OneCrown',
    'PassPageOne', 'PassPageThree', 'PassPageTwo',
    'ThreeCrown', 'TwoCrown'
  ];
  audioEffects.forEach(name => {
    tasks.push({
      type: 'audio_effect',
      name: name,
      url: `Audio/${name}.mp3`,
      execute: async () => {
        await getCachedAudioBuffer(`Audio/${name}`);
      }
    });
  });

  // D. Piano Notes (from pitches)
  const noteFiles = pitches.map(pitch => noteNameToMp3Path(pitch)).filter(Boolean);
  const uniqueNoteFiles = [...new Set(noteFiles)];
  uniqueNoteFiles.forEach(path => {
    const filename = path.split('/').pop();
    tasks.push({
      type: 'note',
      name: filename,
      url: `${path}.mp3`,
      execute: async () => {
        await getCachedAudioBuffer(path);
      }
    });
  });

  // E. Song JSON files
  const uniqueSongJsons = new Set();
  uniqueSongJsons.add('Horseman'); // Ensure fallback is cached
  // Classic challenge mode loads Classic1–Classic13 directly, not via CSV sections
  for (let i = 1; i <= 13; i++) {
    uniqueSongJsons.add(`Classic${i}`);
  }
  if (Array.isArray(musicCsvData)) {
    musicCsvData.forEach(song => {
      if (song && song.sections) {
        Object.values(song.sections).forEach(section => {
          if (section && section.musicJson && section.musicJson !== 'Classic') {
            uniqueSongJsons.add(section.musicJson);
          }
        });
      }
    });
  }

  const CACHE_NAME_REF = 'opentiles-v1';
  uniqueSongJsons.forEach(songName => {
    tasks.push({
      type: 'song_json',
      name: songName,
      url: `song/${songName}.json`,
      execute: async () => {
        const url = `song/${songName}.json`;
        try {
          // Check if already cached before fetching
          if ('caches' in window) {
            const cached = await caches.match(url);
            if (cached) return; // already in cache, skip
          }
          const response = await fetch(url);
          if (response.ok) {
            // Explicitly write into the cache so it works regardless of SW timing
            if ('caches' in window) {
              const cache = await caches.open(CACHE_NAME_REF);
              await cache.put(url, response);
            }
          }
        } catch (e) {
          console.warn('Failed preloading song JSON:', songName, e);
        }
      }
    });
  });

  // Execute tasks with a concurrency limit
  const total = tasks.length;
  let completed = 0;
  const CONCURRENCY_LIMIT = 15;

  const updateProgress = (taskName, type) => {
    completed++;
    const percentage = Math.round((completed / total) * 100);
    if (loadingProgress) loadingProgress.style.width = `${percentage}%`;
    if (loadingPercentage) loadingPercentage.textContent = `${percentage}%`;
    
    let typeLabel = 'Loading assets...';
    if (type === 'sprite' || type === 'special_image') typeLabel = 'Loading graphics...';
    else if (type === 'audio_effect') typeLabel = 'Loading audio effects...';
    else if (type === 'note') typeLabel = 'Loading piano keys...';
    else if (type === 'song_json') typeLabel = 'Caching song data...';

    if (loadingStatus) loadingStatus.textContent = typeLabel;
    if (loadingSubstatus) {
      loadingSubstatus.textContent = `${taskName} (${completed}/${total})`;
    }
  };

  // Run with concurrency limit queue
  const queue = [...tasks];
  const workers = [];

  const runWorker = async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;
      try {
        await task.execute();
      } catch (err) {
        console.error('Error preloading task:', task.url, err);
      }
      updateProgress(task.name, task.type);
    }
  };

  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, queue.length); i++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
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
    // Clamp to decimal values above 0 (0 = disabled, 0.1+ = t/s)
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
  
  // Update language pill status
  updateLanguageSelection();
  
  // Update sound status based on audio context state
  const soundStatus = document.getElementById('sound-status');
  if (soundStatus && audioContext) {
    soundStatus.textContent = audioContext.state === 'suspended' ? (i18n?.t('status_off') || 'Off') : (i18n?.t('status_on') || 'On');
  }
  
  // Update autoplay pill status
  const autoplayStatus = document.getElementById('autoplay-status');
  if (autoplayStatus) {
    autoplayStatus.textContent = autoplayEnabled ? (i18n?.t('status_on') || 'On') : (i18n?.t('status_off') || 'Off');
  }
  
  // Update revive slowdown pill status
  const reviveSlowdownStatus = document.getElementById('revive-slowdown-status');
  if (reviveSlowdownStatus) {
    reviveSlowdownStatus.textContent = reviveSlowdownEnabled ? (i18n?.t('status_on') || 'On') : (i18n?.t('status_off') || 'Off');
  }
  
  // Update speed pill status
  const speedStatus = document.getElementById('speed-status');
  if (speedStatus) {
    if (customStartingSpeed === 0) {
      speedStatus.textContent = i18n?.t('label_disabled') || 'Disabled';
    } else {
      speedStatus.textContent = `${customStartingSpeed} t/s`;
    }
  }
  
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
    let value = parseFloat(customSpeedInput.value);
    // Clamp to decimal values above 0 (0 = disabled, direct t/s value)
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
        <img src="gameImage/award.png" class="rank-icon-image">
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
        // Get original BPM values from custom song data for defaults
        const originalBpm = customSongData.baseBpm || 120;
        const section1 = customSongData.musics?.[0] || customSongData.sections?.[1] || {};
        const section2 = customSongData.musics?.[1] || customSongData.sections?.[2] || {};
        const section3 = customSongData.musics?.[2] || customSongData.sections?.[3] || {};
        
        const defaultBpm1 = section1.bpm || originalBpm;
        const defaultBpm2 = section2.bpm || defaultBpm1;
        const defaultBpm3 = section3.bpm || defaultBpm2;
        
        const defaultBeats1 = section1.baseBeats || 0.5;
        const defaultBeats2 = section2.baseBeats || defaultBeats1;
        const defaultBeats3 = section3.baseBeats || defaultBeats2;
        
        // Get BPM values from input fields, defaulting to original values if empty
        const bpm1 = parseInt(document.getElementById('custom-bpm-1')?.value || String(defaultBpm1), 10);
        const bpm2 = parseInt(document.getElementById('custom-bpm-2')?.value || String(defaultBpm2), 10);
        const bpm3 = parseInt(document.getElementById('custom-bpm-3')?.value || String(defaultBpm3), 10);
        
        // Create mock songData structure to treat custom song like a normal song entry
        const mockSongData = {
          mid: 999999, // Unique ID for custom songs
          musicJson: customSongLabel, // Use filename as musicJson for results screen
          musician: 'Custom',
          acceleration: 0,
          sections: {
            1: { bpm: bpm1, baseBeats: defaultBeats1, musicJson: 'custom' },
            2: { bpm: bpm2, baseBeats: defaultBeats2, musicJson: 'custom' },
            3: { bpm: bpm3, baseBeats: defaultBeats3, musicJson: 'custom' }
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

    // Helper function to update speed display (converts from tile/min to tile/sec)
    function updateSpeedDisplay(sectionNum, bpm, beats) {
      const tilesPerMin = bpm / beats;
      const tilesPerSec = (tilesPerMin / 60).toFixed(3);
      document.getElementById(`speed-${sectionNum}`).textContent = tilesPerSec;
    }

    const bpmBtn = card.querySelector('.btn-bpm');
    bpmBtn.addEventListener('click', () => {
      // Open BPM modal and populate with original values
      if (bpmModal && customSongData) {
        // Extract original BPM and beats from custom song data
        const originalBpm1 = customSongData.baseBpm || 120;
        const originalBeats1 = customSongData.baseBeats || 0.5;
        
        // Try to get section-specific values if available
        const section1 = customSongData.musics?.[0] || customSongData.sections?.[1] || {};
        const section2 = customSongData.musics?.[1] || customSongData.sections?.[2] || {};
        const section3 = customSongData.musics?.[2] || customSongData.sections?.[3] || {};
        
        const bpm1 = section1.bpm || originalBpm1;
        const beats1 = section1.baseBeats || originalBeats1;
        const bpm2 = section2.bpm || bpm1;
        const beats2 = section2.baseBeats || beats1;
        const bpm3 = section3.bpm || bpm2;
        const beats3 = section3.baseBeats || beats2;
        
        // Update original values display
        document.getElementById('original-bpm-1').textContent = bpm1;
        document.getElementById('original-beats-1').textContent = beats1;
        document.getElementById('original-bpm-2').textContent = bpm2;
        document.getElementById('original-beats-2').textContent = beats2;
        document.getElementById('original-bpm-3').textContent = bpm3;
        document.getElementById('original-beats-3').textContent = beats3;
        
        // Clear input fields (leave them empty)
        document.getElementById('custom-bpm-1').value = '';
        document.getElementById('custom-bpm-2').value = '';
        document.getElementById('custom-bpm-3').value = '';
        
        // Calculate and display initial speeds based on original values
        updateSpeedDisplay(1, bpm1, beats1);
        updateSpeedDisplay(2, bpm2, beats2);
        updateSpeedDisplay(3, bpm3, beats3);
        
        bpmModal.classList.remove('hidden');
      }
    });

    // Add event listeners for live speed updates
    ['custom-bpm-1', 'custom-bpm-2', 'custom-bpm-3'].forEach((inputId, index) => {
      const sectionNum = index + 1;
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', () => {
          const bpmEl = document.getElementById(`original-bpm-${sectionNum}`);
          const originalBpm = parseFloat(bpmEl?.textContent) || 120;
          const bpm = input.value ? parseFloat(input.value) : originalBpm;
          const beatsEl = document.getElementById(`original-beats-${sectionNum}`);
          const beats = parseFloat(beatsEl?.textContent) || 0.5;
          updateSpeedDisplay(sectionNum, bpm, beats);
        });
      }
    });
  } else {
    // Display upload prompt
    card.innerHTML = `
      <div class="song-card-icon ranked" style="opacity: 0.5;">
        <img src="gameImage/award.png" class="rank-icon-image">
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
        ? `<img src="gameImage/${isPurple ? 'awardselection.png' : 'award.png'}" class="rank-icon-image"><div class="rank-number">${song.id}</div>`
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
        render700PlusSongs();
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

  // Map MID prefix to badge image
  const midPrefix = String(challengeData.mid || '').substring(0, 6);
  const badgeMap = {
    '200001': 'beginner.png',
    '200002': 'skilled.png',
    '200003': 'master.png',
    '200004': 'single.png',
    '200005': 'double.png',
    '200006': 'combo.png',
    '200007': 'slider.png',
    '200008': 'accompaniment.png',
    '200009': 'classic.png'
  };
  const badgeImage = badgeMap[midPrefix] || 'star.png';

  const card = document.createElement('div');
  card.className = `song-card challenge-card`;
  const localizedSongName = i18n ? i18n.getSongName(challengeData.musicJson) : challengeData.musicJson;
  card.innerHTML = `
    <div class="song-card-badge">
      <img src="gameImage/${badgeImage}" class="challenge-badge-icon" alt="${challengeData.musicJson}">
    </div>
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

  // Add "More songs to be expected..." text at the end
  const moreSongsText = document.createElement('div');
  moreSongsText.className = 'mt-4';
  const moreSongsMsg = i18n ? i18n.t('msg_more_songs_expected') : 'More songs to be expected...';
  moreSongsText.innerHTML = `<p class="text-gray-400 text-l text-center">${moreSongsMsg}</p>`;
  songListContainer.appendChild(moreSongsText);

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
    
    try {
      const danResp = await fetch('dan.json');
      if (danResp.ok) {
        classData = await danResp.json();
      }
    } catch (e) { console.error('Failed to load dan.json', e); }

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
  if (typeof activeKeys !== 'undefined' && activeKeys) {
    for (let colIdx = 0; colIdx < 4; colIdx++) {
      if (activeKeys[colIdx]) {
        activeKeys[colIdx] = false;
        if (typeof handleManualInputUp === 'function') {
          handleManualInputUp(colIdx);
        }
      }
    }
  }
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
    gameBoardWrapper.classList.remove('bg-level-2', 'bg-level-3');
    gameBoardWrapper.style.removeProperty('--game-bg-image-1');
    gameBoardWrapper.style.removeProperty('--game-bg-image-2');
  }
  info = [];
  currentScore = 0;
  classCurrentHitTiles = 0;
  classSongHitTiles = [];
  classLastHitSongIndex = 0;
  classCourseCleared = false;
  classTotalPlayableTiles = 0;
  hpos = 0;
  visualHposOffset = 0;
  starthpos = key - 2;
  bgLevel = 1;
  bgLevelPos = [];
  bgLevelPosIndex = 0;
  speedLevel = 1;
  speedLevelPos = [];
  speedLevelPosIndex = 0;
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
    warr: [...warr],
    activeCols: computeActiveCols(warr)
  }];
  tileDomCache.forEach((el) => el.remove());
  tileDomCache.clear();
  tilesContainer.innerHTML = '';
  hitEffectsEl.innerHTML = '';
  _runtimeSpeedCache.clear();
  updatePauseButtonVisibility();
  isStarted = false;
  isPaused = false;
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
  isGameLoaded = false;
  challengeBpmOffset = 0;
  challengeBaseBpm = 120;
  challengeBaseBeats = 0.5;
  hasStartedGameplay = false;
  lastHudRewardState = { stars: 0, crowns: 0 };
  preserveCurrentSpeedOnNextFrame = false;
  pausedSpeedBpm = 120;
  pausedSpeedBeats = 0.5;
  resetInputState();
  pendingHitEffects = [];
  isReviveSlowdownActive = false;
  isPostReviveState = false; // Reset revive flag when engine is reset
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
    info.push({ 
      bpm: Math.trunc(sectionBpm / sectionBaseBeats * sectionBaseBeats), 
      beats: sectionBaseBeats, 
      id: music.id,
      isExplicitBreak: music.isExplicitBreak || false,
      breakDurationSeconds: music.breakDurationSeconds || 3
    });
  }

  // Calculate custom BPM if custom starting speed is set
  // Dans (Class mode) ignore Custom Speed settings
  let customBpmOverride = null;
  let customSectionSpeedMultiplier = null;
  if (customStartingSpeed > 0 && !isClassMode) {
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
  // Clear runtime speed cache when loading a new song to prevent cached speeds from previous songs
  _runtimeSpeedCache.clear();
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
    let songIndex = 0;
    if (isClassMode && classSongSectionStarts && classSongSectionStarts.length > 0) {
      for (let i = 0; i < classSongSectionStarts.length; i++) {
        if (s >= classSongSectionStarts[i]) songIndex = i;
      }
      if (classSongTotalTiles[songIndex] === undefined) {
        classSongTotalTiles[songIndex] = 0;
      }
    }

    for (const tile of section) {
      let isPlayable = false;
      switch (tile.type) {
        case 5: 
          runningScore += 4; 
          isPlayable = true;
          break; // combo start tile
        case 3: 
          runningScore += Math.max(2, (tile.scores && tile.scores.length) || 2); 
          isPlayable = true;
          break; // multi-tap combo
        case 6: 
          runningScore += Math.round(tile.hlen) + 1; 
          isPlayable = true;
          break; // long hold
        case 9:
        case 1:
          break; // accompaniment and blank tiles give no score
        default: 
          runningScore += 1; 
          isPlayable = true;
          break; // regular tap (type 2) and others
      }
      if (isPlayable) {
        classTotalPlayableTiles += 1;
        if (isClassMode && classSongTotalTiles) {
          classSongTotalTiles[songIndex] += 1;
        }
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
  // Use the per-frame cached rect to avoid forcing a layout flush here.
  const boardRect = _cachedBoardRect || boardEl.getBoundingClientRect();
  const clickYRel = (pointerEvent.clientY - boardRect.top) / boardRect.height;
  const clickRow = Math.floor(clickYRel * key);
  
  const tileTopRow = Math.floor(getTileTop(tile));
  const tileBottomRow = Math.max(tileTopRow, Math.floor(getTileBottom(tile) - 0.01));
  
  // Check if tap is within the tile's vertical range
  // Use a ±1 row buffer so fast-scrolling tiles are still registerable when
  // event delivery slightly lags the visual position.
  return clickRow >= tileTopRow - 1 && clickRow <= tileBottomRow + 1;
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
    // Skip long tiles that were started but not completed (e.g., pause-dropped)
    if (isLongTile(tile) && tile.holdStarted && !tile.holdCompleted) return;
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
  triggerPendingAwardAnimations();
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
  triggerPendingAwardAnimations();
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
    const activeCols = getActiveColumns(options.tile);
    const domKey = `${options.tile.id}:${activeCols.join('-')}`;
    const tileEl = tileDomCache.get(domKey);
    const rect = tileEl?.getBoundingClientRect();
    if (rect) {
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
  const domKey = `${tile.id}:${[1, 2].join('-')}`;
  const tileEl = tileDomCache.get(domKey);
  const rect = tileEl?.getBoundingClientRect();

  // Position +1 on columns 0 (left) and 3 (right)
  const leftColRect = colElements[0]?.getBoundingClientRect();
  const rightColRect = colElements[3]?.getBoundingClientRect();

  let anchorX = pointerEvent ? pointerEvent.clientX : null;
  let anchorY = pointerEvent ? pointerEvent.clientY : null;

  if (rect && leftColRect && rightColRect) {
    // Alternate between left (col 0) and right (col 3) for each hit
    const tapIndex = (tile.taps || 2) - (tile.remainingTaps || 0);
    const useLeft = tapIndex % 2 === 0;
    
    anchorX = useLeft ? leftColRect.left + leftColRect.width / 2 : rightColRect.left + rightColRect.width / 2;
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
  isPostReviveState = false; // Reset revive flag when run finishes
  
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

  if (isClassMode) {
    // If we failed (classCourseCleared is false), populate classSongProgress dynamically
    if (!classCourseCleared && classSongProgress.length === 0 && classCurrentData) {
      classCurrentData.songs.forEach((s, idx) => {
        if (idx < classSongIndex) {
          classSongProgress.push({ name: s.customName, status: 'Pass', reached: true });
        } else if (idx === classSongIndex) {
          classSongProgress.push({ name: s.customName, status: 'Fail', reached: true });
        } else {
          classSongProgress.push({ name: s.customName, status: 'Unreached', reached: false });
        }
      });
    }
    
    // Play appropriate audio based on class mode result
    const ctx = ensureAudioEngine();
    if (ctx) {
      async function playClassAudio(base) {
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
          setTimeout(resolve, (buffer.duration || 0) * 1000 + 100);
        });
      }
      
      if (classCourseCleared) {
        await playClassAudio('Audio/NewBest');
      } else {
        await playClassAudio('Audio/FailPage');
      }
    }
  }

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
    const stage = getStarAndCrownState((normalSongAwardLevel || 1) - 1);
    document.getElementById('final-stars').innerHTML = stage.stars > 0 ? '<img src="gameImage/star.png" class="inline-block w-8 h-auto mr-1">'.repeat(stage.stars) : '';
    document.getElementById('final-crowns').innerHTML = stage.crowns > 0 ? '<img src="gameImage/crown.png" class="inline-block w-8 h-auto mr-1">'.repeat(stage.crowns) : '';
    document.getElementById('final-grade').classList.add('hidden');

    if (selectedSongData && !autoplayEnabled) {
      if (customStartingSpeed === 0) {
        const key = `opentile_highscore_level_${selectedSongData.mid}`;
        const bestLevel = parseInt(localStorage.getItem(key) || '0', 10);
        // Save the higher of the current run's award level vs the stored best.
        // normalSongAwardLevel directly maps to the star/crown tier shown in the HUD.
        if (normalSongAwardLevel > bestLevel) {
          localStorage.setItem(key, String(normalSongAwardLevel));
          invalidateEarnedPPointsCache();
          
          // Sync to Firestore when online (non-blocking, won't affect offline gameplay)
          if (firebaseReady && isFirebaseAvailable() && selectedSongData.mid) {
            saveSongLevelToFirestore(String(selectedSongData.mid), normalSongAwardLevel).catch(err => {
              console.debug('Firestore sync failed (likely offline):', err.message);
            });
          }
          
          // Song of the Day reward: award P-Points if completed with 3 stars
          if (currentSongIsSongOfTheDay && normalSongAwardLevel >= 4 && !isSongOfTheDayCompleted()) {
            const currentStreak = updateSongOfTheDayStreak();
            const reward = getSongOfTheDayReward(currentStreak);
            spentPPoints -= reward; // Add P-Points by reducing spent amount
            localStorage.setItem('opentile_spent_ppoints', String(spentPPoints));
            syncTopDockData();
          }
        }
      }
      // Save last played song
      if (selectedSongData.mid) {
        saveLastPlayed(String(selectedSongData.mid));
      }
    }
    
    // Reset Song of the Day flag
    currentSongIsSongOfTheDay = false;

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
      // Snapshot before the panel block may clear isClassMode
      const wasClassMode = isClassMode;

      if (selectedSongData) {
        const num = selectedSongData.id ?? selectedSongData.mid ?? '';
        const shouldPrefixTitle = !isChallengeMode && !isClassicMode;
        const localizedSongName = i18n ? i18n.getSongName(selectedSongData.musicJson) : selectedSongData.musicJson;
        const localizedArtistName = i18n ? i18n.getArtistName(selectedSongData.musician) : selectedSongData.musician;
        const displayTitle = `${shouldPrefixTitle && num ? String(num) + '. ' : ''}${localizedSongName}`;
        if (titleEl) titleEl.textContent = displayTitle;
        if (artistEl) artistEl.textContent = localizedArtistName || '';
      }

      if (isClassMode) {
        document.getElementById('results-standard-mode')?.classList.add('hidden');
        document.getElementById('results-class-mode')?.classList.remove('hidden');
        
        // Determine overall status
        const overallStatus = classCourseCleared ? 'Cleared' : 'Failed';
        const overallStatusClass = classCourseCleared ? 'class-pass' : 'class-fail';
        
        // Build the results HTML with overall status and song list
        let resultsHtml = `
          <div class="class-overall-status mb-4 text-center">
            <span class="text-lg font-bold ${overallStatusClass}">${overallStatus}</span>
          </div>
        `;
        
        resultsHtml += classSongProgress.map(p => {
          const statusClass = p.status === 'Pass' ? 'class-pass' : (p.status === 'Fail' ? 'class-fail' : '');
          const opacityClass = p.reached ? '' : 'opacity-50';
          const statusText = p.reached ? p.status : '';
          
          return `
            <div class="class-pass-fail-item ${opacityClass}">
              <span>${p.name}</span>
              ${statusText ? `<span class="${statusClass}">${statusText}</span>` : ''}
            </div>
          `;
        }).join('');
        
        document.getElementById('results-class-mode').innerHTML = resultsHtml;
        if (titleEl) titleEl.textContent = classCurrentData?.name || '';
        // Now that the results panel is fully rendered, tear down the class-mode state.
        isClassMode = false;
        classCourseCleared = false;
      } else {
        document.getElementById('results-standard-mode')?.classList.remove('hidden');
        document.getElementById('results-class-mode')?.classList.add('hidden');
        
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
      
      if (wasClassMode) {
        if (backBtn) backBtn.classList.add('hidden');
        if (favBtn) favBtn.classList.add('hidden');
      } else {
        if (backBtn) backBtn.classList.remove('hidden');
        if (favBtn) favBtn.classList.remove('hidden');
      }

      if (backBtn) {
        backBtn.onclick = () => {
          // Check and spend life cost before proceeding
          if (!spendLifeCost(getPlayLifeCost(selectedSongData))) {
            return;
          }

          // Play life intro immediately, disable button to prevent double-press
          backBtn.disabled = true;
          backBtn.classList.add('opacity-50');
          animateLifeSpendFromTopBar();
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
        const heartIcon = document.getElementById('results-fav-heart-icon');
        const copyIcon = document.getElementById('results-fav-copy-icon');
        
        // Check if playing custom song
        const isCustomSong = customSongData !== null;
        
        // Toggle icons based on song type
        if (isCustomSong) {
          heartIcon.classList.add('hidden');
          copyIcon.classList.remove('hidden');
        } else {
          heartIcon.classList.remove('hidden');
          copyIcon.classList.add('hidden');
          
          // set initial favourite state for regular songs
          try {
            if (selectedSongData && favouriteSongs.has(String(selectedSongData.mid))) {
              favBtn.classList.add('favourite');
            } else {
              favBtn.classList.remove('favourite');
            }
          } catch (e) {}
        }

        favBtn.onclick = () => {
          // play menu loop cue for feedback
          try { playMenuLoopCue(); } catch (e) {}
          
          if (isCustomSong) {
            // Copy custom JSON content to clipboard
            if (customSongData) {
              const jsonContent = JSON.stringify(customSongData, null, 2);
              navigator.clipboard.writeText(jsonContent).then(() => {
                // Visual feedback - briefly change icon or show success
                copyIcon.style.stroke = '#22c55e';
                setTimeout(() => {
                  copyIcon.style.stroke = '';
                }, 1000);
              }).catch(err => {
                console.error('Failed to copy:', err);
              });
            }
          } else {
            // Toggle favourite for regular songs
            if (!selectedSongData) return;
            const id = String(selectedSongData.mid);
            toggleFavourite(id);
            favBtn.classList.toggle('favourite', favouriteSongs.has(id));
            // update other UI that may show favourites
            renderFavouriteSongs();
            render700PlusSongs();
          }
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
  isPostReviveState = false; // Reset revive flag when run fails
  
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
  
  if (isChallengeMode || isClassMode) {
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
  const hitColumns = getTileHitColumns(tile);
  // For partially hit double tiles, only match if the column hasn't been hit yet
  if (isDoubleTile(tile) && tile.hitColumns && tile.hitColumns.length > 0) {
    const remainingColumns = hitColumns.filter(col => !tile.hitColumns.includes(col));
    return remainingColumns.includes(colIdx);
  }
  return hitColumns.includes(colIdx);
}

function checkNormalSongAwards(reachedSection) {
  if (!isStarted || isPaused || isClassicMode || isChallengeMode || isClassMode) {
    return;
  }

  const currentAwardLevel = normalSongAwardLevel || 1;
  // Maximum award level is 10 (3 crowns).
  if (currentAwardLevel >= 10) return;

  // Trigger animation one tile early (when approaching the next award level)
  // but don't increment the award level yet
  if (reachedSection === currentAwardLevel - 1) {
    const nextStage = getStarAndCrownState(currentAwardLevel - 1);
    const currentStage = currentAwardLevel > 1 ? getStarAndCrownState(currentAwardLevel - 2) : { stars: 0, crowns: 0 };
    const currentTierRank = getRewardTierRank(currentStage);
    const nextTierRank = getRewardTierRank(nextStage);
    const shouldAnimateReward = nextTierRank > currentTierRank;

    if (shouldAnimateReward) {
      pendingAwardAnimationStages.push(nextStage);
    }
  }

  // Increment award level when section is actually reached
  if (reachedSection >= currentAwardLevel) {
    normalSongAwardLevel = currentAwardLevel + 1;

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

    updateNormalSongAwardDisplay();

    // Check recursively in case they skipped multiple sections at once
    checkNormalSongAwards(reachedSection);
  }
}

function handleManualInputDown(colIdx, pointerEvent = null) {
  if (isPaused) return;
  
  // Handle start tile separately
  if (!isStarted) {
    const startTile = tiles.find((tile) => tile.isStartTile || tile.isResumeStartTile) || tiles.find((tile) => tile.type === -1 && tile.hpos === -1);
    if (startTile && tileMatchesColumn(startTile, colIdx)) {
      const tileBottom = getTileBottom(startTile);
      // Allow tapping start tile anywhere on-screen
      if (tileBottom >= 0) {
        // For partially hit double tiles, only allow input on the untapped column
        if (isDoubleTile(startTile) && startTile.hitColumns && startTile.hitColumns.length > 0) {
          if (startTile.hitColumns.includes(colIdx)) {
            // This column was already hit, ignore input
            return;
          }
          // This is the untapped column, allow input to complete the tile and restart
        }
        delete startTile.isStartTile;
        delete startTile.isResumeStartTile;
        isStarted = true;
        hasStartedGameplay = true;
        startTime = performance.now();
        if (isClassicMode) {
          classicTimerStartedAt = performance.now(); // Start timer when START tile is tapped in Classic mode
        }
        if (gameBoardWrapper) {
          gameBoardWrapper.classList.add('game-playing');
          updateGameplayBackground();
          updatePauseButtonVisibility();
        }

        // Start revive slowdown only when tapping START tile after revive
        if (isPostReviveState && reviveSlowdownEnabled) {
          isReviveSlowdownActive = true;
          reviveSlowdownStartTime = performance.now();
          isPostReviveState = false; // Reset flag after using it
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
          if (pointerEvent) {
            startTile.tapScreenY = pointerEvent.clientY;
          } else {
            // Keyboard fallback: derive tapScreenY from board geometry, avoiding
            // a querySelector + getBoundingClientRect on the input hot path.
            const br = _cachedBoardRect || boardEl.getBoundingClientRect();
            const tileBottom = getTileBottom(startTile);
            const unitHeightPx = br.height / key;
            startTile.tapScreenY = br.top + (tileBottom / key) * br.height - unitHeightPx / 2;
          }
          {
            // Compute completionPlaying from tile geometry (no DOM rect needed).
            const br = _cachedBoardRect || boardEl.getBoundingClientRect();
            const tileTop = getTileTop(startTile);
            const tileBottom = getTileBottom(startTile);
            const tileTopPx = br.top + (tileTop / key) * br.height;
            const tileHeightPx = ((tileBottom - tileTop) / key) * br.height;
            const tapDistFromTop = (startTile.tapScreenY - tileTopPx) / tileHeightPx * startTile.hlen;
            startTile.completionPlaying = startTile.playing + tapDistFromTop - 0.5;
            startTile.tapPlaying = startTile.playing;
          }
        } else if (startTile.type === 2) {
          startTile.clicked = true;
          startTile.ended = 1;
          triggerTileHitAnimation(startTile);
          playTileAudioNow(startTile);
          if (!startTile.isAccompanimentSingle) currentScore += 1; if (isClassMode && !startTile.classHitCounted) { startTile.classHitCounted = true; incrementClassHitTiles(startTile); }

        } else if (startTile.type === 5) {
          if (!startTile.hitColumns.includes(colIdx)) {
            startTile.hitColumns.push(colIdx);
            playTileAudioNow(startTile);
            if (startTile.hitColumns.length >= getActiveColumns(startTile).length) {
              startTile.clicked = true;
              startTile.ended = 1;
              triggerTileHitAnimation(startTile);
              currentScore += 4; if (isClassMode && !startTile.classHitCounted) { startTile.classHitCounted = true; incrementClassHitTiles(startTile); }

            }
          }
        } else if (startTile.type === 3) {
          playComboTapAudio(startTile);
          // Defer cosmetic DOM mutations so they don't delay the next touch event.
          const _stSnapTile = startTile, _stSnapCol = colIdx, _stSnapPx = pointerEvent?.clientX ?? null, _stSnapPy = pointerEvent?.clientY ?? null;
          queueMicrotask(() => {
            spawnComboPlusOne(_stSnapTile, _stSnapCol, null);
            spawnHitRipple(_stSnapPx, _stSnapPy, { tile: _stSnapTile, colIdx: _stSnapCol, big: true });
          });
          startTile.remainingTaps = Math.max(0, (startTile.remainingTaps || startTile.taps || 2) - 1);
          if (startTile.remainingTaps <= 0) {
            startTile.clicked = true;
            startTile.ended = 1;
            currentScore += Math.max(2, startTile.taps || 2); if (isClassMode && !startTile.classHitCounted) { startTile.classHitCounted = true; incrementClassHitTiles(startTile); }

          }
        } else {
          startTile.clicked = true;
          startTile.ended = 1;
          triggerTileHitAnimation(startTile);
          playTileAudioNow(startTile);

        }
        return;
      }
    }
    return;
  }
  
  if (autoplayEnabled) return;
  
  const tile = getLowestManualTile();
  if (!tile) return;

  // If the lowest tile is already clicked/completed, ignore the input
  // This prevents routing input from completed combo tiles to tiles above
  if (tile.clicked || tile.ended) {
    return;
  }

  if (pointerEvent) {
    // Use the per-frame cached rect to avoid a synchronous layout flush.
    const boardRect = _cachedBoardRect || boardEl.getBoundingClientRect();
    const clickYRel = (pointerEvent.clientY - boardRect.top) / boardRect.height;
    const clickUnits = clickYRel * key;
    
    const tileTop = getTileTop(tile);
    const tileBottom = getTileBottom(tile);

    // Add a vertical forgiveness buffer (±1.5 tile-units) so that taps whose
    // pointer events arrive slightly after the tile has scrolled past the exact
    // touch point are still accepted.  Column (X) discrimination stays strict.
    const yBuffer = 1.5;
    if (clickUnits < tileTop - yBuffer || clickUnits > tileBottom + yBuffer) {
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
        if (pointerEvent) {
          longAccompanimentTile.tapScreenY = pointerEvent.clientY;
        } else {
          // Keyboard fallback: derive tapScreenY from board geometry.
          const br = _cachedBoardRect || boardEl.getBoundingClientRect();
          const tileBottom = getTileBottom(longAccompanimentTile);
          const unitHeightPx = br.height / key;
          longAccompanimentTile.tapScreenY = br.top + (tileBottom / key) * br.height - unitHeightPx / 2;
        }
        {
          const br = _cachedBoardRect || boardEl.getBoundingClientRect();
          const tileTop = getTileTop(longAccompanimentTile);
          const tileBottom = getTileBottom(longAccompanimentTile);
          const tileTopPx = br.top + (tileTop / key) * br.height;
          const tileHeightPx = ((tileBottom - tileTop) / key) * br.height;
          const tapDistFromTop = (longAccompanimentTile.tapScreenY - tileTopPx) / tileHeightPx * longAccompanimentTile.hlen;
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
      currentScore += Math.max(1, Math.ceil(completedHeight)); if (isClassMode && !activeLong.classHitCounted) { activeLong.classHitCounted = true; incrementClassHitTiles(activeLong); }
      
      if (!tileMatchesColumn(tile, colIdx)) {
        return;
      }
    }
  }

  // Remove hit window restriction - allow tapping anywhere on-screen
  // Keep column matching and order logic
  if (!tileMatchesColumn(tile, colIdx)) {
    // Check if there's an accompaniment long tile in the tapped column
    // If so, ignore the input instead of failing (accompaniment tiles are optional)
    const accompanimentLongInCol = tiles.find((t) =>
      t.isAccompanimentTile &&
      t.type === 9 &&
      t.isAccompanimentLong &&
      !t.clicked &&
      !t.holdCompleted &&
      tileMatchesColumn(t, colIdx)
    );
    if (accompanimentLongInCol) {
      return;
    }
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
    if (tile.type === 2 && !tile.isAccompanimentSingle) currentScore += 1; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }

    
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
        currentScore += 4; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }

        
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
    // Defer cosmetic DOM mutations so they don't delay the next touch event.
    const _snapTile = tile, _snapCol = colIdx, _snapPx = pointerEvent?.clientX ?? null, _snapPy = pointerEvent?.clientY ?? null;
    queueMicrotask(() => {
      spawnComboPlusOne(_snapTile, _snapCol, null);
      spawnHitRipple(_snapPx, _snapPy, { tile: _snapTile, colIdx: _snapCol, big: true });
    });
    tile.remainingTaps = Math.max(0, (tile.remainingTaps || tile.taps || 2) - 1);
    if (tile.remainingTaps <= 0) {
      tile.clicked = true;
      tile.ended = 1;
      currentScore += Math.max(2, tile.taps || 2); if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }

      
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

      if (pointerEvent) {
        tile.tapScreenY = pointerEvent.clientY;
      } else {
        // Keyboard fallback: derive tapScreenY from board geometry, avoiding
        // a querySelector + getBoundingClientRect on the input hot path.
        const br = _cachedBoardRect || boardEl.getBoundingClientRect();
        const tileBottom = getTileBottom(tile);
        const unitHeightPx = br.height / key;
        tile.tapScreenY = br.top + (tileBottom / key) * br.height - unitHeightPx / 2;
      }

      {
        // Compute completionPlaying from tile geometry (no DOM rect needed).
        const br = _cachedBoardRect || boardEl.getBoundingClientRect();
        const tileTop = getTileTop(tile);
        const tileBottom = getTileBottom(tile);
        const tileTopPx = br.top + (tileTop / key) * br.height;
        const tileHeightPx = ((tileBottom - tileTop) / key) * br.height;
        const tapDistFromTop = (tile.tapScreenY - tileTopPx) / tileHeightPx * tile.hlen;
        tile.completionPlaying = tile.playing + tapDistFromTop - 0.5;
        tile.tapPlaying = tile.playing;
      }

    }
  }
}

function handleManualInputUp(colIdx) {
  if (autoplayEnabled || !isStarted) return;
  const activeLong = tiles.find((tile) => isLongTile(tile) && tile.holdStarted && !tile.holdCompleted && !tile.holdReleased && tile.activeHoldColumn === colIdx);
  if (activeLong) {
    // Mark the release point instead of failing
    activeLong.holdReleasedAt = activeLong.playing || 0;
    activeLong.holdReleased = true;
    activeLong.played = true; // Mark as played so audio doesn't re-trigger
    
    const completedHeight = Math.max(0, activeLong.playing - (activeLong.tapPlaying || 0));
    currentScore += Math.max(1, Math.ceil(completedHeight)); if (isClassMode && !activeLong.classHitCounted) { activeLong.classHitCounted = true; incrementClassHitTiles(activeLong); }

  }
}

function updateChallengeRewardAnimation() {
  if (!isChallengeMode || !shouldAnimateChallengeRewards(selectedSongData) || isClassMode) {
    lastHudRewardState = { stars: 0, crowns: 0 };
    clearAwardAnimation();
    return;
  }

  const rewardState = getChallengeRewardStateFromTps(currentBeats > 0 ? currentBpm / currentBeats / 60 : 0);
  const previousRewardState = lastHudRewardState;
  const previousTier = getRewardTierRank(previousRewardState);
  const currentTier = getRewardTierRank(rewardState);
  const rewardTierImproved = currentTier > previousTier;
  const rewardTierDecreased = currentTier < previousTier;
  const rewardTierVisible = currentTier > 0;
  const shouldAnimateTier = rewardTierImproved && rewardTierVisible && shouldShowRewardAnimationForTier(currentTier);

  if (shouldAnimateTier) {
    triggerAwardAnimation(rewardState);
  } else if (rewardTierDecreased) {
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
  const previousRewardState = lastHudRewardState;
  const previousTier = getRewardTierRank(previousRewardState);
  const currentTier = getRewardTierRank(rewardState);
  const rewardTierImproved = currentTier > previousTier;
  const rewardTierDecreased = currentTier < previousTier;
  const rewardTierVisible = currentTier > 0;
  const shouldAnimateTier = rewardTierImproved && rewardTierVisible && shouldShowRewardAnimationForTier(currentTier);

  if (shouldAnimateTier) {
    triggerAwardAnimation(rewardState);
  } else if (rewardTierDecreased) {
    clearAwardAnimation();
  }

  lastHudRewardState = rewardState;
}

function updateNormalSongAwardDisplay() {
  if (isChallengeMode) {
    updateChallengeRewardAnimation();
  } else if (isClassicMode) {
    updateClassicRewardAnimation();
  }
  // Normal song mode no longer has persistent star/crown display
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

  updateNormalSongAwardDisplay();

  if (isAwardAnimationRunning) {
    return;
  }

  if (isClassMode) {
    scoreDisplay.classList.remove('hidden');
    let scoreStr = '';
    if (!isStarted && !isPaused && classPauseTimer > 0 && classPauseInterval) {
      scoreStr = String(Math.ceil(classPauseTimer));
    } else {
      // Detect whether we're currently in the visible blank gap between songs.
      // Condition 1: a break spacer tile is in the buffer (confirms we're between songs).
      // Condition 2: no non-spacer tile has entered the visible board area yet.
      //   getTileBottom(t) >= 0 means the tile's bottom edge has crossed onto screen;
      //   the moment that is true the board is no longer blank.
      const inDanBreak = tiles.some(t => t._isClassBreakSpacer);
      const boardStillBlank = inDanBreak && !tiles.some(t =>
        !t._isClassBreakSpacer &&
        !t.isAccompanimentTile &&
        t.type !== 1 &&
        getTileBottom(t) >= 0
      );
      if (boardStillBlank) {
        // Show which stage just finished (1-based).
        const completedStage = (classLastHitSongIndex || 0) + 1;
        scoreStr = `Stage ${completedStage} complete`;
      } else {
        // Use classLastHitSongIndex — the song of the most recently hit tile —
        // so the % is always tied to the hitline, not the look-ahead loading cursor.
        const displaySong = classLastHitSongIndex || 0;
        const hitForSong = (classSongHitTiles && classSongHitTiles[displaySong]) || 0;
        const songTiles = (classSongTotalTiles && classSongTotalTiles[displaySong]) || 1;
        const songProgressFrac = Math.min(1, Math.max(0, hitForSong / songTiles));
        const songProgress = songProgressFrac * 100;
        scoreStr = `${songProgress.toFixed(1)}%`;
      }
    }
    if (scoreDisplay._lastText !== scoreStr) {
      scoreDisplay._lastText = scoreStr;
      scoreDisplay.innerHTML = scoreStr.split('').map(ch =>
        `<span class="score-digit-wrapper">${ch}</span>`
      ).join('');
    }

    if (isGameLoaded) {
      tpsDisplayNormal?.classList.remove('hidden');
      if (tpsDisplayNormal) {
        const totalSongs = classCurrentData.songs.length;
        // Sum across all per-song buckets for the overall Dan % bar.
        // Each bucket only grows when tiles of that song are actually hit,
        // so this value can never jump backwards or skip ahead.
        let totalHit = 0;
        let totalExpected = 0;
        for (let si = 0; si < totalSongs; si++) {
          const songTiles = (classSongTotalTiles && classSongTotalTiles[si]) || 1;
          const hitCount = (classSongHitTiles && classSongHitTiles[si]) || 0;
          totalHit += Math.min(hitCount, songTiles);
          totalExpected += songTiles;
        }
        const danProgress = totalExpected > 0 ? (totalHit / totalExpected) * 100 : 0;
        const danText = `${danProgress.toFixed(1)}%`;
        if (tpsDisplayNormal._lastText !== danText) {
          tpsDisplayNormal._lastText = danText;
          tpsDisplayNormal.innerHTML = danText.split('').map(char => 
            `<span class="score-digit-wrapper">${char}</span>`
          ).join('');
        }
      }
    }
  } else if (isClassicMode) {
    // Classic mode: hide score, show timer with 3 decimal points, hide stars/crowns
    // This takes precedence over challenge mode to prevent fallback
    if (isGameLoaded) {
      tpsDisplayChallenge?.classList.remove('hidden');
      if (tpsDisplayChallenge) {
        const timerText = classicTimer.toFixed(3);
        if (tpsDisplayChallenge._lastText !== timerText) {
          tpsDisplayChallenge._lastText = timerText;
          // Wrap each character in an individual span for consistent positioning
          tpsDisplayChallenge.innerHTML = timerText.split('').map(char => 
            `<span class="score-digit-wrapper">${char}</span>`
          ).join('');
        }
      }
    }
  } else if (isChallengeMode) {
    // In challenge mode: hide score, show challenge TPS, hide stars/crowns
    if (isGameLoaded) {
      tpsDisplayChallenge?.classList.remove('hidden');
      if (tpsDisplayChallenge && tpsDisplayChallenge._lastText !== tpsText) {
        tpsDisplayChallenge._lastText = tpsText;
        // Wrap each character in an individual span for consistent positioning
        tpsDisplayChallenge.innerHTML = tpsText.split('').map(char => 
          `<span class="score-digit-wrapper">${char}</span>`
        ).join('');
      }
    }
  } else {
    // Normal mode: show score, show normal TPS, show stars/crowns
    scoreDisplay.classList.remove('hidden');
    // Wrap each digit in an individual span for consistent positioning
    const scoreStr = String(currentScore);
    if (scoreDisplay._lastText !== scoreStr) {
      scoreDisplay._lastText = scoreStr;
      scoreDisplay.innerHTML = scoreStr.split('').map(digit => 
        `<span class="score-digit-wrapper">${digit}</span>`
      ).join('');
    }

    if (isGameLoaded) {
      tpsDisplayNormal?.classList.remove('hidden');
      if (tpsDisplayNormal && tpsDisplayNormal._lastText !== tpsText) {
        tpsDisplayNormal._lastText = tpsText;
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

function computeActiveCols(warr) {
  const cols = [];
  for (let i = 0; i < warr.length; i++) {
    if (warr[i]) cols.push(i);
  }
  return cols;
}

function getActiveColumns(tile) {
  if (tile.activeCols) return tile.activeCols;
  // Fallback for tiles created before this optimization (e.g. the start tile)
  const cols = [];
  for (let i = 0; i < tile.warr.length; i++) {
    if (tile.warr[i]) cols.push(i);
  }
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
      el._head = el.querySelector('.tile-head');
      el._lightStrip = el.querySelector('.tile-light-strip');
      el._lightOrb = el.querySelector('.tile-light-orb');
      el._comboBadge = el.querySelector('.combo-badge');
      el._startLabel = el.querySelector('.tile-start-label');
      tilesContainer.appendChild(el);
      tileDomCache.set(domKey, el);
    }

    const leftCol = Math.min(...cols);
    const widthCols = isComboTile(tile) && !autoplayEnabled ? 2 : cols.length;
    const headEl = el._head;
    const lightStripEl = el._lightStrip;
    const lightOrbEl = el._lightOrb;
    const comboBadgeEl = el._comboBadge;
    const startLabelEl = el._startLabel;

    el.className = '';
    const styleLeft = `${(leftCol / key) * 100}%`;
    const styleWidth = `${(widthCols / key) * 100}%`;
    const styleTop = `${(topUnits / key) * 100}%`;
    const styleHeight = `${(tileHeight / key) * 100}%`;
    const styleFilter = (tile.type === 3 || (tile.type >= 7 && !(tile.type === 9 && tile.isAccompanimentLong))) ? 'hue-rotate(-90deg)' : 'none';

    if (el._lastLeft !== styleLeft) { el.style.left = styleLeft; el._lastLeft = styleLeft; }
    if (el._lastWidth !== styleWidth) { el.style.width = styleWidth; el._lastWidth = styleWidth; }
    if (el._lastTop !== styleTop) { el.style.top = styleTop; el._lastTop = styleTop; }
    if (el._lastHeight !== styleHeight) { el.style.height = styleHeight; el._lastHeight = styleHeight; }
    if (el._lastFilter !== styleFilter) { el.style.filter = styleFilter; el._lastFilter = styleFilter; }

    if (el._lastBgStyle !== 'batched') {
      el.style.backgroundColor = 'transparent';
      el.style.borderTop = 'none';
      el.style.boxShadow = 'none';
      el.style.opacity = '1';
      el._lastBgStyle = 'batched';
    }

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

    const showStartLabel = (tile.isStartTile || tile.isResumeStartTile) && !tile.played && !isStarted;
    const showStartLabelAtHead = showStartLabel && isLongTile(tile);
    
    // For double tiles, show START label only on the untapped column and only if it's a resume/revive start tile
    let showStartLabelForDoubleTile = showStartLabel;
    if (isDoubleTile(tile) && tile.hitColumns && tile.hitColumns.length > 0) {
      // Only show START label if this specific column hasn't been hit yet AND it's a resume/revive start tile
      const thisCol = cols[0];
      showStartLabelForDoubleTile = !tile.hitColumns.includes(thisCol) && tile.isResumeStartTile;
    }

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
      // Show START label for double tiles only if not partially hit
      const shouldShowStartLabel = isDoubleTile(tile) ? showStartLabelForDoubleTile : showStartLabel;
      if (shouldShowStartLabel) {
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
      // Show START label for combo tiles when needed (post-revive/resume)
      if (showStartLabel) {
        startLabelEl.classList.remove('hidden');
        startLabelEl.style.display = 'flex';
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
        const headImage = (tile.type === 9 && tile.isAccompanimentLong) ? 'a_long_head' : 'long_head';
        headEl.style.backgroundImage = `url("gameImage/${headImage}.png")`;
      }

      if (played && !ended) {
        let orbCenterBottomPercent = 0;
        
        // Keep the light orb at the absolute screen position where it was tapped.
        // Compute from board geometry instead of calling getBoundingClientRect() each
        // frame — that was causing a layout flush on every RAF tick per held tile.
        if (tile.tapScreenY && !isReleased) {
          const br = _cachedBoardRect || boardEl.getBoundingClientRect();
          const tileTop = getTileTop(tile);
          const tileEffH = getTileEffectiveHeight(tile);
          const tileScreenTop = br.top + (tileTop / key) * br.height;
          const tileScreenHeight = (tileEffH / key) * br.height;

          const orbRelativeY = tile.tapScreenY - tileScreenTop;
          const orbRelativePercent = (orbRelativeY / tileScreenHeight) * 100;

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

  tileDomCache.forEach((el, keyValue) => {
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
      if (timeSinceLastAcceleration >= 0.093303) {
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

  if (bgLevelPos.length && bgLevelPos[bgLevelPosIndex] < starthpos) {
    pendingBgLevelIncrement = true;
    pendingBackgroundUpdate = true;
  }
  if (speedLevelPos.length && speedLevelPos[speedLevelPosIndex] < starthpos) {
    if (!isChallengeMode && !isClassicMode) {
      pendingSpeedLevelIncrement = true;
      pendingBackgroundUpdate = true;
    }
  }

  let manualTileCount = 0;
  for (const t of tiles) if (!t.isAccompanimentTile) manualTileCount++;

  while (manualTileCount < key * 3) {
    if (currentSectionIndex < sheet.length) {
      const currentTile = sheet[currentSectionIndex][currentSectionTileIndex];
      if (currentTile) {
        const comboTaps = Math.max(2, currentTile.scores.length || Math.round(currentTile.hlen) + 1);
        const isCombo = currentTile.type === 3;
        const isAccompanimentTile = currentTile.type === 9;
        const sectionTileIndex = currentSectionTileIndex;
        const isLastTileInSection = sectionTileIndex === sheet[currentSectionIndex].length - 1;
        currentSectionTileIndex++;

        // Compute which Dan song this tile belongs to at spawn time so that
        // incrementClassHitTiles can credit the correct per-song bucket even
        // when currentSectionIndex (the loading cursor) is already ahead.
        let classSongIdxForTile = 0;
        if (isClassMode && classSongSectionStarts && classSongSectionStarts.length > 0) {
          for (let si = 0; si < classSongSectionStarts.length; si++) {
            if (currentSectionIndex >= classSongSectionStarts[si]) classSongIdxForTile = si;
          }
        }

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
            activeCols: computeActiveCols(longWarr),
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
            accompanimentSequenceId: currentSequenceId,
            sectionIndex: currentSectionIndex,
            classSongIdx: classSongIdxForTile,
            loopCount: songLoopCount
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
              activeCols: computeActiveCols(singleWarr),
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
              accompanimentSequenceId: currentSequenceId,
              sectionIndex: currentSectionIndex,
              classSongIdx: classSongIdxForTile,
              loopCount: songLoopCount
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
            activeCols: computeActiveCols(warr),
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
            awardGranted: false,
            sectionIndex: currentSectionIndex,
            classSongIdx: classSongIdxForTile,
            _isClassBreakSpacer: currentTile._isClassBreakSpacer || false,
            loopCount: songLoopCount
          });
          manualTileCount++;
        }

        hpos += currentTile.hlen;
        // Combo tiles are displayed as 2 rows tall; accumulate the visual compression
        // so subsequent tiles are positioned directly above the combo with no gap.
        if (isCombo) {
          visualHposOffset += currentTile.hlen - 2;
        }
      } else {
        // Class mode suppresses background transitions between sections.
        if (!isClassMode) {
          bgLevelPos.push(hpos - 4 + key);
        }
        // Advance the normal-song award threshold one tile earlier so it can trigger
        // at the end of the current section rather than the next section's first tile.
        // Class mode has no star/crown awards, so skip the speedLevelPos push too.
        if (!isClassMode) {
          speedLevelPos.push(hpos - 2 + key);
        }
        currentSectionIndex++;
        currentSectionTileIndex = 0;
      }
    } else {
      if (isClassicMode || isClassMode) break;
      currentSectionIndex = 0;
      songLoopCount += 1;
    }

  }

  let maxEffectiveSectionReached = -1;

  tiles.forEach((tile) => {
    tile.playing = starthpos - tile.hpos - (key - 1);
    
    // Check section progression for normal song awards
    if (tile.playing >= -0.5 || tile.clicked || tile.ended > 0) {
      const effectiveSection = (tile.loopCount || 0) * sheet.length + (tile.sectionIndex || 0);
      if (effectiveSection > maxEffectiveSectionReached) {
        maxEffectiveSectionReached = effectiveSection;
      }
    }

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
      triggerPendingAwardAnimations();
    }

    if (autoplayEnabled) {
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
            currentScore++; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
            tile.clicked = true;
            tile.ended = 1;
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 5:
          if (tile.played && !tile.ended) {
            currentScore += 4; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
            tile.clicked = true;
            tile.ended = 1;
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
              currentScore += 1; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
              if (tile.remainingTaps <= 0) {
                tile.clicked = true;
                tile.ended = 1;
              }
            }
          } else if (tile.ended) {
            tile.ended++;
          }
          break;
        case 6:
          if (tile.playing > tile.hlen - 1) {
            if (!tile.ended) {
              currentScore += Math.round(tile.hlen) + 1; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
              tile.clicked = true;
              tile.ended = 1;
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
              currentScore += Math.round(scoreDelta) + 1; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
              tile.clicked = true;
              tile.ended = 1;
            } else {
              tile.ended++;
            }
          }
      }
    } else {
      // Handle long tiles that were released midway
      if (tile.holdStarted && !tile.holdCompleted && !tile.holdReleased && tile.playing > (tile.completionPlaying !== undefined ? tile.completionPlaying : tile.hlen - 1)) {
        tile.holdCompleted = true;
        tile.clicked = true;
        tile.ended = 1;
        currentScore += Math.round(tile.hlen) + 1; if (isClassMode && !tile.classHitCounted) { tile.classHitCounted = true; incrementClassHitTiles(tile); }
      } else if ((tile.clicked || tile.holdCompleted) && tile.ended) {
        tile.ended++;
      }
    }
  });

  if (maxEffectiveSectionReached >= normalSongAwardLevel) {
    checkNormalSongAwards(maxEffectiveSectionReached);
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
      // Don't fail for accompaniment long tiles - they are optional
      if (tile.type === 9 && tile.isAccompanimentLong) return false;
      // Don't fail while waiting for a START tap
      if (!isStarted && (tile.isStartTile || tile.isResumeStartTile || (tile.type === -1 && tile.hpos === -1))) return false;
      // For double tiles, don't fail if it's the resume/revive start tile and has remaining columns to tap
      if (!isStarted && isDoubleTile(tile) && (tile.isStartTile || tile.isResumeStartTile) && tile.hitColumns && tile.hitColumns.length > 0) {
        // Check if there are still columns remaining to be tapped
        const activeColumns = getActiveColumns(tile);
        if (tile.hitColumns.length < activeColumns.length) {
          return false;
        }
      }
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
  
  if (isClassMode) {
    let newIndex = 0;
    if (classSongSectionStarts && classSongSectionStarts.length > 0) {
      for (let i = 0; i < classSongSectionStarts.length; i++) {
        if (currentSectionIndex >= classSongSectionStarts[i]) newIndex = i;
      }
    }
    // Advance the loading song index when we actually enter a new song's sections.
    // Break sections (isExplicitBreak) have only spacer tiles and no playable content;
    // we skip advancing while in those to avoid premature index changes.
    if (newIndex !== classSongIndex) {
      // Check if the current section contains a non-break tile (break sections only have spacers)
      const currentSectionIsBreak = sheet[currentSectionIndex] &&
        sheet[currentSectionIndex].length > 0 &&
        sheet[currentSectionIndex].every(t => t._isClassBreakSpacer);
      const currentSectionHasTiles = sheet[currentSectionIndex] &&
        sheet[currentSectionIndex].length > 0 &&
        !currentSectionIsBreak;
      if (currentSectionHasTiles) {
        // Only advance when we're entering real playable sections of the next song
        if (newIndex > classSongIndex) {
          classSongIndex = newIndex;
          // Do NOT reset classCurrentHitTiles here; per-song tracking uses classSongHitTiles[]
          classCurrentHitTiles = (classSongHitTiles && classSongHitTiles[classSongIndex]) || 0;
        }
      }
    }

    // Complete Dan course when all tiles are cleared and sheet is exhausted
    if (tiles.length === 0 && currentSectionIndex >= sheet.length) {
      // Signal a successful clear BEFORE calling finishRun so that isClassMode
      // remains true inside finishRun and the class results panel is shown.
      classCourseCleared = true;
      const danNum = classCurrentData.id === 'kaidan' ? 11 : parseInt(classCurrentData.id);
      if (danNum && danNum > classHighestCleared) {
        classHighestCleared = danNum;
        localStorage.setItem('classHighestCleared', classHighestCleared);
      }
      classSongProgress = classCurrentData.songs.map(s => ({ name: s.customName, status: 'Pass', reached: true }));
      finishRun(false);
      return;
    }
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
  // Refresh the board rect cache once per frame so all gameplay code can read
  // it without triggering synchronous layout calculations.
  _cachedBoardRect = boardEl.getBoundingClientRect();

  if (isGameLoaded) {
    updateEngineFrame(now);
    updateHUD();
    renderTiles();
    
    // Handle deferred level increments and background update after critical frame work
    if (pendingBackgroundUpdate) {
      pendingBackgroundUpdate = false;
      
      // Perform the actual level increments using index counters (O(1) instead of O(n) shift)
      if (pendingBgLevelIncrement) {
        pendingBgLevelIncrement = false;
        bgLevelPosIndex++;
        bgLevel++;
      }
      if (pendingSpeedLevelIncrement) {
        pendingSpeedLevelIncrement = false;
        speedLevelPosIndex++;
        speedLevel++;
      }
      
      // Update background after level changes
      requestAnimationFrame(() => updateGameplayBackground());
    }
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
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
  startTime = performance.now();
  updatePauseButtonVisibility();
  isPlayInProgress = false; // Reset play progress flag when game actually starts
  isPostReviveState = false; // Reset revive flag when starting normal game
}

function stopGame(showStart = true) {
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
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
  
  updatePauseButtonVisibility();
}

function returnToMainMenu() {
  clearQueuedTimeouts();
  isClassMode = false;
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }

  
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
  
  updatePauseButtonVisibility();

  if (currentDockTab === 'music') {
    showMusicScreen();
  } else if (currentDockTab === 'challenges') {
    showChallengesScreen();
  } else if (currentDockTab === 'settings') {
    showSettingsScreen();
  } else if (currentDockTab === 'class') {
    // Return to the class screen so the updated Classification rank is shown immediately.
    showClassScreen();
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
  // Preserve hitColumns for double tiles (type 5) to maintain partial hits
  if (tile.type !== 5) {
    tile.hitColumns = [];
  }
  delete tile.holdReleasedAt;
  delete tile.activeHoldColumn;
  delete tile.tapScreenY;
  delete tile.tapPlaying;
  delete tile.completionPlaying;
  if (tile.type === 3) {
    // Preserve remainingTaps for combo tiles to maintain partial progress
    // Only reset if it hasn't been tapped yet (remainingTaps equals taps)
    if (tile.remainingTaps === (tile.taps || 2)) {
      tile.remainingTaps = tile.taps || 2;
    }
  }
  // Mark this tile as a resume/revive start tile to show START label
  tile.isResumeStartTile = true;

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
  if (!isClassMode && typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
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
    tiles.forEach((tile) => {
      delete tile.isStartTile;
      delete tile.isResumeStartTile;
    });
    
    // Force-drop any currently held long tile
    const heldLongTile = tiles.find((tile) =>
      isLongTile(tile) &&
      tile.holdStarted &&
      !tile.holdCompleted &&
      !tile.holdReleased
    );
    
    if (heldLongTile) {
      // Mark the release point for proper tracking
      heldLongTile.holdReleasedAt = heldLongTile.playing || 0;
      heldLongTile.holdReleased = true;
      heldLongTile.played = true;
      heldLongTile.holdCompleted = true;
      heldLongTile.clicked = true;
      heldLongTile.ended = 1;
      
      // Calculate score based on completed height, same as normal release
      const completedHeight = Math.max(0, heldLongTile.playing - (heldLongTile.tapPlaying || 0));
      currentScore += Math.max(1, Math.ceil(completedHeight)); if (isClassMode && !heldLongTile.classHitCounted) { heldLongTile.classHitCounted = true; incrementClassHitTiles(heldLongTile); }
    }
    
    const nearestUntapped = getLowestManualTile();
    if (nearestUntapped && nearestUntapped.type !== 1 && nearestUntapped.hpos !== -1 && getTileBottom(nearestUntapped) >= 0) {
      resetTileForResume(nearestUntapped);
      nearestUntapped.isStartTile = true;
      nearestUntapped.isResumeStartTile = true;
      
      // Center the START tile on screen if it's not fully visible
      const adjHpos = nearestUntapped.visualAdjustedHpos ?? nearestUntapped.hpos;
      const tileHeight = getTileEffectiveHeight(nearestUntapped);
      const tileTop = starthpos - adjHpos - tileHeight;
      const tileBottom = starthpos - adjHpos;
      
      // Check if tile (or head of long tile) is fully visible on-screen
      const isFullyVisible = tileBottom > 0 && tileTop < key;
      
      if (!isFullyVisible) {
        // Calculate new starthpos to center the tile, shifted down by 1 tile height
        starthpos = adjHpos + tileHeight / 2 + (key - 1) / 2 + 1;
        classicScrollTarget = starthpos;
      }
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
  if (isClassMode) {
    const classTimerContainer = document.getElementById('class-pause-timer-container');
    const classTimerEl = document.getElementById('class-pause-timer');
    const btnResume = document.getElementById('pause-continue-btn');
    if (classTimerContainer) classTimerContainer.classList.remove('hidden');
    if (classTimerEl) classTimerEl.textContent = Math.ceil(classPauseTimer);
    if (btnResume) btnResume.disabled = classPauseTimer <= 0;
    if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
      clearInterval(classPauseInterval);
    }
    classPauseInterval = setInterval(() => {
      if (isStarted) {
        clearInterval(classPauseInterval);
        classPauseInterval = null;
        return;
      }
      classPauseTimer -= 1;
      if (classTimerEl) classTimerEl.textContent = Math.ceil(classPauseTimer);
      if (classPauseTimer <= 0) {
        classPauseTimer = 0;
        if (classTimerEl) classTimerEl.textContent = 0;
        if (btnResume) btnResume.disabled = true;
        clearInterval(classPauseInterval);
        classPauseInterval = null;
        if (!isPaused && !isStarted) {
          failRun('timeout');
        }
      }
    }, 1000);
  } else {
    const classTimerContainer = document.getElementById('class-pause-timer-container');
    const btnResume = document.getElementById('pause-continue-btn');
    if (classTimerContainer) classTimerContainer.classList.add('hidden');
    if (btnResume) btnResume.disabled = false;
  }
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
      note.pitch = arr[4].trim();
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
    if (!pitches.includes(pitch.trim())) throw unexpected(pitch);
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
  classicTimerStartedAt = 0; // Timer starts when START tile is tapped
  classicTappedTiles = 0;
  classicCurrentSongIndex = 0;
  classicLoadFailCount = 0;
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
  // Guard: stop retrying if we've failed every song in the current queue rotation
  if (classicLoadFailCount >= classicSongQueue.length) {
    console.error('All classic songs failed to load. Offline with no cache?');
    classicLoadFailCount = 0;
    return;
  }

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
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      classicLoadFailCount = 0; // reset on success
      loadSongObject(data, songName);
    })
    .catch(err => {
      console.error('Failed to load classic song:', songName, err);
      classicLoadFailCount++;
      loadNextClassicSong(); // skip to next, bounded by guard above
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
  if (typeof classPauseInterval !== 'undefined' && classPauseInterval) {
    clearInterval(classPauseInterval);
    classPauseInterval = null;
  }
  isPostReviveState = false; // Reset revive flag when starting classic mode
  tiles = [];
  currentScore = 0;
  hpos = 0;
  visualHposOffset = 0;
  starthpos = key - 2;
  classicScrollTarget = starthpos;
  classicTimerDuration = 30;
  classicTimer = classicTimerDuration;
  classicTimerStartedAt = 0; // Timer starts when START tile is tapped
  sheet = [];
  info = [];
  currentSectionIndex = 0;
  currentSectionTileIndex = 0;
  bgLevel = 1;
  bgLevelPos = [];
  bgLevelPosIndex = 0;
  speedLevel = 1;
  speedLevelPos = [];
  speedLevelPosIndex = 0;
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
  // Render selection songs
  render700PlusSongs();
  // Render Song of the Day
  renderSongOfTheDay();
  // Render latest updates
  renderLatestUpdates();
  
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

function render700PlusSongs() {
  if (!songs700PlusContainer) return;
  
  const songs700PlusList = musicCsvData.filter(song => song.id >= 700 && !isChallengeSong(song));
  
  if (songs700PlusList.length === 0) {
    const no700PlusMsg = i18n ? i18n.t('msg_no_700_plus_songs') : 'No songs 700+ found.';
    songs700PlusContainer.innerHTML = `<p class="text-gray-500 text-xs text-center py-4">${no700PlusMsg}</p>`;
    return;
  }

  // Sort by id value
  songs700PlusList.sort((a, b) => a.id - b.id);

  songs700PlusContainer.innerHTML = '';
  songs700PlusList.forEach(song => {
    const songCard = createSongCard(song, true);
    songs700PlusContainer.appendChild(songCard);
  });
}

// Song of the Day functions
function getDailySong() {
  // Get today's date as a string (YYYY-MM-DD) for consistent daily selection
  const today = new Date();
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Use a simple hash of the date string to select a song
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Filter out challenge songs and get regular songs
  const regularSongs = musicCsvData.filter(song => !isChallengeSong(song));
  
  // Use the hash to select a song (ensure positive index)
  const songIndex = Math.abs(hash) % regularSongs.length;
  return regularSongs[songIndex];
}

function getSongOfTheDayStreak() {
  const streakData = localStorage.getItem('opentile_song_of_the_day_streak');
  if (!streakData) return 0;
  
  try {
    const data = JSON.parse(streakData);
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // If the last completion was today, return the current streak
    if (data.lastCompletionDate === todayString) {
      return data.streak;
    }
    
    // Check if the last completion was yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    // If the last completion was yesterday, keep the streak
    // Otherwise, reset the streak
    if (data.lastCompletionDate === yesterdayString) {
      return data.streak;
    } else {
      // Reset streak if more than a day has passed
      localStorage.setItem('opentile_song_of_the_day_streak', JSON.stringify({ streak: 0, lastCompletionDate: null }));
      return 0;
    }
  } catch (e) {
    console.error('Error parsing streak data:', e);
    return 0;
  }
}

function updateSongOfTheDayStreak() {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const streakData = localStorage.getItem('opentile_song_of_the_day_streak');
  let currentStreak = 0;
  
  if (streakData) {
    try {
      const data = JSON.parse(streakData);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      // If already completed today, don't update
      if (data.lastCompletionDate === todayString) {
        return data.streak;
      }
      
      // If last completion was yesterday, increment streak
      if (data.lastCompletionDate === yesterdayString) {
        currentStreak = data.streak + 1;
      } else {
        // Otherwise, start new streak
        currentStreak = 1;
      }
    } catch (e) {
      console.error('Error parsing streak data:', e);
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }
  
  localStorage.setItem('opentile_song_of_the_day_streak', JSON.stringify({ 
    streak: currentStreak, 
    lastCompletionDate: todayString 
  }));
  
  return currentStreak;
}

function getSongOfTheDayReward(streak) {
  // P-Points reward based on streak: 10 base + 5 * streak
  return 10 + (streak * 5);
}

function isSongOfTheDayCompleted() {
  const streakData = localStorage.getItem('opentile_song_of_the_day_streak');
  if (!streakData) return false;
  
  try {
    const data = JSON.parse(streakData);
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return data.lastCompletionDate === todayString;
  } catch (e) {
    return false;
  }
}

function createSongOfTheDayCard(song) {
  const firstSection = song.sections[1] || Object.values(song.sections)[0];
  const bestLevel = parseInt(localStorage.getItem(`opentile_highscore_level_${song.mid}`) || '0', 10);
  const stage = getStarAndCrownState(bestLevel - 1);
  const isCompleted = isSongOfTheDayCompleted();
  const localizedSongName = i18n ? i18n.getSongName(song.musicJson) : song.musicJson;
  const localizedArtistName = i18n ? i18n.getArtistName(song.musician) : song.musician;
  const currentStreak = getSongOfTheDayStreak();

  let progressHTML = '';
  if (stage.crowns > 0) {
    for (let i = 0; i < 3; i++) {
      progressHTML += `<img src="gameImage/crown.png" class="w-5 h-auto mr-1 ${i < stage.crowns ? 'earned' : 'unearned'}">`;
    }
  } else {
    for (let i = 0; i < 3; i++) {
      progressHTML += `<img src="gameImage/star.png" class="w-5 h-auto mr-1 ${i < stage.stars ? 'earned' : 'unearned'}">`;
    }
  }

  const card = document.createElement('div');
  card.className = 'song-card';
  const isPurple = song.id >= 700;
  
  const statusBadge = isCompleted 
    ? `<span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">${i18n ? i18n.t('label_completed') : 'Completed'}</span>`
    : `<span class="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">+${getSongOfTheDayReward(currentStreak)} P-Points</span>`;

  const playButtonText = i18n ? i18n.t('btn_play') : 'Play';

  card.innerHTML = `
    <div class="song-card-icon ${stage.stars >= 3 || stage.crowns > 0 ? `ranked ${isPurple ? 'purple' : ''}` : 'numbered'}">
      ${stage.stars >= 3 || stage.crowns > 0
        ? `<img src="gameImage/${isPurple ? 'awardselection.png' : 'award.png'}" class="rank-icon-image"><div class="rank-number">${song.id}</div>`
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
    <div class="song-card-action flex flex-col items-end gap-2">
      <div class="song-card-reward">
        ${statusBadge}
      </div>
      <button class="btn-play">${playButtonText}</button>
    </div>
  `;

  const playBtn = card.querySelector('.btn-play');
  playBtn.addEventListener('click', () => {
    if (isPlayInProgress) {
      return;
    }
    startSongTransition(song, true); // true = isSongOfTheDay
  });

  return card;
}

function renderSongOfTheDay() {
  const container = document.getElementById('song-of-the-day-container');
  const streakDisplay = document.getElementById('song-of-the-day-streak');
  if (!container || !streakDisplay) return;

  const dailySong = getDailySong();
  if (!dailySong) {
    container.innerHTML = `<p class="text-gray-500 text-xs text-center py-4">${i18n ? i18n.t('msg_no_song_of_the_day') : 'No Song of the Day available.'}</p>`;
    return;
  }

  const currentStreak = getSongOfTheDayStreak();
  streakDisplay.textContent = currentStreak;

  container.innerHTML = '';
  const songCard = createSongOfTheDayCard(dailySong);
  container.appendChild(songCard);
}

async function renderLatestUpdates() {
  const updatesContainer = document.getElementById('latest-updates-container');
  if (!updatesContainer) return;

  try {
    const response = await fetch('updates.json');
    if (!response.ok) {
      throw new Error('Failed to load updates.json');
    }
    const data = await response.json();
    
    if (!data.updates || data.updates.length === 0) {
      updatesContainer.innerHTML = '<p class="text-gray-500 text-xs">No updates available.</p>';
      return;
    }

    // Get the latest 3 updates (first 3 in array)
    const latestUpdates = data.updates.slice(0, 3);
    
    let updatesHtml = latestUpdates.map(update => {
      let changesHtml = update.changes.map(change => 
        `<div class="text-gray-600 text-xs">• ${change}</div>`
      ).join('');

      return `
        <div class="mb-3">
          <div class="text-gray-600 text-xs">
            <span class="font-semibold">${update.version}</span> <span class="text-gray-400">(${update.date})</span>
          </div>
          <div class="space-y-1 mt-1">
            ${changesHtml}
          </div>
        </div>
      `;
    }).join('');

    updatesContainer.innerHTML = updatesHtml;
  } catch (error) {
    console.error('Error loading updates:', error);
    updatesContainer.innerHTML = '<p class="text-gray-500 text-xs">Failed to load updates.</p>';
  }
}

function updateDockSelection(nextTab) {
  currentDockTab = nextTab;
  [dockHomeBtn, dockMusicBtn, dockChallengesBtn, dockSettingsBtn, dockClassBtn].forEach((button) => button?.classList.remove('selected'));

  if (nextTab === 'home') {
    dockHomeBtn?.classList.add('selected');
  } else if (nextTab === 'music') {
    dockMusicBtn?.classList.add('selected');
  } else if (nextTab === 'challenges') {
    dockChallengesBtn?.classList.add('selected');
  } else if (nextTab === 'class') {
    dockClassBtn?.classList.add('selected');
  } else if (nextTab === 'settings') {
    dockSettingsBtn?.classList.add('selected');
  }
}

function setDockView(tab) {
  if (tab !== 'settings' && !settingsScreen.classList.contains('hidden')) {
    settingsScreen.classList.add('hidden');
  }

  homeScreen.classList.add('hidden');
  songListScreen.classList.add('hidden');
  challengesScreen.classList.add('hidden');
  if (classScreen) classScreen.classList.add('hidden');

  if (tab === 'home') {
    homeScreen.classList.remove('hidden');
    updateDockSelection('home');
    renderHomeScreen();
  } else if (tab === 'music') {
    songListScreen.classList.remove('hidden');
    updateDockSelection('music');
    renderSongList();
  } else if (tab === 'challenges') {
    challengesScreen.classList.remove('hidden');
    updateDockSelection('challenges');
    renderChallenges();
  } else if (tab === 'class') {
    if (classScreen) classScreen.classList.remove('hidden');
    updateDockSelection('class');
    renderClassScreen();
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

function showClassScreen() {
  setDockView('class');
}


function showSettingsScreen() {
  previousDockTabBeforeSettings = currentDockTab === 'settings' ? previousDockTabBeforeSettings : currentDockTab;
  setDockView('settings');
}

function syncTopDockData() {
  const { totalStars, totalCrowns, earnedPPoints } = calculateEarnedPPoints();
  const pPoints = Math.max(0, earnedPPoints - spentPPoints);

  // Primary (shared) top bar updates
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

  // Update classification display
  const classHighestClearedEl = document.getElementById('class-highest-cleared');
  if (classHighestClearedEl) {
    let clearedText = "None";
    if (classHighestCleared > 0) {
      if (classHighestCleared === 11) clearedText = "Kaidan";
      else clearedText = classHighestCleared + (classHighestCleared === 1 ? "st" : classHighestCleared === 2 ? "nd" : classHighestCleared === 3 ? "rd" : "th") + " Dan";
    }
    classHighestClearedEl.textContent = "Class: " + clearedText;
  }

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
    const loadingStatus = document.getElementById('loading-status');
    const loadingSubstatus = document.getElementById('loading-substatus');
    
    if (loadingStatus) loadingStatus.textContent = 'Loading database...';
    if (loadingSubstatus) loadingSubstatus.textContent = 'Fetching game CSV configurations';

    // 1. First, load music CSV and translations (required to parse unique songs)
    await loadMusicCsv();

    // 2. Now run the unified asset preloader which loads and caches everything else
    await preloadAssets();
    
    // Set up Firebase authentication
    setupFirebaseAuth();
    
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

// Settings pill click handlers
document.getElementById('profile-pill')?.addEventListener('click', async () => {
  // Check if user is signed in
  if (typeof auth !== 'undefined' && auth.currentUser) {
    // User is signed in, show profile modal
    document.getElementById('profile-modal').classList.remove('hidden');
    // Update profile email if user is signed in
    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) {
      profileEmail.textContent = auth.currentUser.email || 'user@example.com';
    }
  } else {
    // User is signed out, trigger Google sign-in
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('Google sign in successful');
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  }
});

document.getElementById('sound-pill')?.addEventListener('click', () => {
  const soundStatus = document.getElementById('sound-status');
  const isMuted = soundStatus.textContent === (i18n?.t('status_off') || 'Off');
  soundStatus.textContent = isMuted ? (i18n?.t('status_on') || 'On') : (i18n?.t('status_off') || 'Off');
  // Toggle audio context if needed
  if (audioContext) {
    if (isMuted) {
      audioContext.resume();
    } else {
      audioContext.suspend();
    }
  }
});

document.getElementById('autoplay-pill')?.addEventListener('click', () => {
  autoplayEnabled = !autoplayEnabled;
  localStorage.setItem('opentile_autoplay', String(autoplayEnabled));
  const autoplayStatus = document.getElementById('autoplay-status');
  autoplayStatus.textContent = autoplayEnabled ? (i18n?.t('status_on') || 'On') : (i18n?.t('status_off') || 'Off');
  // Update checkbox if it exists
  if (autoplayToggle) {
    autoplayToggle.checked = autoplayEnabled;
  }
});

document.getElementById('revive-slowdown-pill')?.addEventListener('click', () => {
  reviveSlowdownEnabled = !reviveSlowdownEnabled;
  localStorage.setItem('opentile_revive_slowdown', String(reviveSlowdownEnabled));
  const reviveSlowdownStatus = document.getElementById('revive-slowdown-status');
  reviveSlowdownStatus.textContent = reviveSlowdownEnabled ? (i18n?.t('status_on') || 'On') : (i18n?.t('status_off') || 'Off');
  // Update checkbox if it exists
  if (reviveSlowdownToggle) {
    reviveSlowdownToggle.checked = reviveSlowdownEnabled;
  }
});

document.getElementById('keybinds-pill')?.addEventListener('click', () => {
  document.getElementById('keybinds-modal').classList.remove('hidden');
});

document.getElementById('speed-pill')?.addEventListener('click', () => {
  document.getElementById('speed-modal').classList.remove('hidden');
});

// Auto-save speed input on change
document.getElementById('settings-custom-speed')?.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (isNaN(value) || value < 0) {
    customStartingSpeed = 0;
  } else {
    customStartingSpeed = value;
  }
  localStorage.setItem('opentile_custom_speed', String(customStartingSpeed));
  
  // Update display
  if (customStartingSpeed === 0) {
    customSpeedDisplay.textContent = i18n?.t('label_disabled') || 'Disabled';
    customSpeedDisplay.classList.remove('text-indigo-600');
  } else {
    customSpeedDisplay.textContent = `${customStartingSpeed} t/s`;
    customSpeedDisplay.classList.add('text-indigo-600');
  }
  
  // Update pill status
  const speedStatus = document.getElementById('speed-status');
  if (speedStatus) {
    if (customStartingSpeed === 0) {
      speedStatus.textContent = i18n?.t('label_disabled') || 'Disabled';
    } else {
      speedStatus.textContent = `${customStartingSpeed} t/s`;
    }
  }
});

document.getElementById('language-pill')?.addEventListener('click', () => {
  document.getElementById('language-modal').classList.remove('hidden');
  updateLanguageSelection();
});

// Modal close handlers
document.getElementById('close-keybinds-modal')?.addEventListener('click', () => {
  document.getElementById('keybinds-modal').classList.add('hidden');
});

document.getElementById('keybinds-modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('keybinds-modal').classList.add('hidden');
});

document.getElementById('close-speed-modal')?.addEventListener('click', () => {
  document.getElementById('speed-modal').classList.add('hidden');
});

document.getElementById('speed-modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('speed-modal').classList.add('hidden');
});

document.getElementById('close-language-modal')?.addEventListener('click', () => {
  // Discard any unsaved language selection
  selectedLanguage = null;
  document.getElementById('language-modal').classList.add('hidden');
});

document.getElementById('done-language-modal')?.addEventListener('click', () => {
  // Apply the selected language when Done is pressed
  if (selectedLanguage) {
    // Update language selector if it exists
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
      languageSelector.value = selectedLanguage;
    }
    
    // Update pill status
    const langStatus = document.getElementById('language-status');
    if (langStatus) {
      const selectedLangObj = languages.find(l => l.code === selectedLanguage);
      langStatus.textContent = selectedLangObj ? selectedLangObj.name : 'English';
    }
    
    // Trigger language change using i18n system
    if (typeof i18n !== 'undefined' && i18n.setLanguage) {
      i18n.setLanguage(selectedLanguage);
    } else {
      localStorage.setItem('opentile_language', selectedLanguage);
    }
    
    selectedLanguage = null;
  }
  
  document.getElementById('language-modal').classList.add('hidden');
});

document.getElementById('language-modal-backdrop')?.addEventListener('click', () => {
  // Discard any unsaved language selection
  selectedLanguage = null;
  document.getElementById('language-modal').classList.add('hidden');
});

// Profile modal handlers
document.getElementById('close-profile-modal')?.addEventListener('click', () => {
  document.getElementById('profile-modal').classList.add('hidden');
});

document.getElementById('profile-modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('profile-modal').classList.add('hidden');
});

document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
  if (typeof auth !== 'undefined') {
    try {
      await signOut(auth);
      document.getElementById('profile-modal').classList.add('hidden');
      setSongStatus('Signed out successfully.');
    } catch (error) {
      console.error('Sign out error:', error);
      setSongStatus('Error signing out.');
    }
  }
});

document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
  if (typeof auth !== 'undefined' && auth.currentUser) {
    // Show confirmation prompt
    const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.');
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    try {
      await deleteUser(auth.currentUser);
      document.getElementById('profile-modal').classList.add('hidden');
      setSongStatus('Account deleted successfully.');
    } catch (error) {
      console.error('Account deletion error:', error);
      if (error.code === 'auth/requires-recent-login') {
        setSongStatus('Please re-authenticate before deleting account. Sign out and sign in again.');
      } else {
        setSongStatus('Error deleting account. Please try again.');
      }
    }
  }
});

// Credits pill handler
document.getElementById('credits-pill')?.addEventListener('click', () => {
  document.getElementById('credits-modal').classList.remove('hidden');
});

// Privacy Policy pill handler
document.getElementById('privacy-pill')?.addEventListener('click', () => {
  document.getElementById('privacy-modal').classList.remove('hidden');
});

// Credits modal handlers
document.getElementById('close-credits-modal')?.addEventListener('click', () => {
  document.getElementById('credits-modal').classList.add('hidden');
});

document.getElementById('credits-modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('credits-modal').classList.add('hidden');
});

// Privacy modal handlers
document.getElementById('close-privacy-modal')?.addEventListener('click', () => {
  document.getElementById('privacy-modal').classList.add('hidden');
});

document.getElementById('privacy-modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('privacy-modal').classList.add('hidden');
});

// Language selection handler
const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' }
];

let selectedLanguage = null;

function renderLanguageOptions() {
  const container = document.getElementById('language-options');
  if (!container) return;
  
  const currentLang = localStorage.getItem('opentile_language') || 'en';
  const displayLang = selectedLanguage || currentLang;
  
  container.innerHTML = languages.map(lang => `
    <button class="language-option flex items-center justify-between bg-white rounded-full px-5 py-4 shadow-sm transition-all active:scale-[0.98]" data-lang="${lang.code}">
      <span class="text-base font-semibold text-gray-800">${lang.name}</span>
      <svg class="language-check w-6 h-6 text-green-500 ${lang.code === displayLang ? '' : 'hidden'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </button>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.language-option').forEach((option) => {
    option.addEventListener('click', () => {
      const lang = option.dataset.lang;
      
      // Store selected language but don't apply yet
      selectedLanguage = lang;
      
      // Update all options visually
      container.querySelectorAll('.language-option').forEach(opt => {
        const check = opt.querySelector('.language-check');
        if (opt.dataset.lang === lang) {
          check.classList.remove('hidden');
          opt.classList.add('selected');
        } else {
          check.classList.add('hidden');
          opt.classList.remove('selected');
        }
      });
    });
  });
}

function updateLanguageSelection() {
  const currentLang = localStorage.getItem('opentile_language') || 'en';
  
  // Reset selected language when modal opens
  selectedLanguage = null;
  
  // Update pill status
  const langStatus = document.getElementById('language-status');
  if (langStatus) {
    const selectedLang = languages.find(l => l.code === currentLang);
    langStatus.textContent = selectedLang ? selectedLang.name : 'English';
  }
  
  // Re-render language options if modal is open
  renderLanguageOptions();
}

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

dockClassBtn?.addEventListener('click', () => {
  showClassScreen();
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
  const input = event.target;
  const inputValue = input.value;
  
  // Save cursor position before any modifications
  const cursorPosition = input.selectionStart;
  const cursorEnd = input.selectionEnd;
  
  // Allow empty input or input ending with dot (while typing decimal)
  if (inputValue === '' || inputValue.endsWith('.')) {
    if (inputValue === '' || inputValue === '.') {
      customSpeedDisplay.textContent = i18n?.t('label_disabled') || 'Disabled';
      customSpeedDisplay.classList.remove('text-indigo-600');
    } else {
      // Display the current value without the trailing dot
      const valueWithoutDot = parseFloat(inputValue);
      if (!isNaN(valueWithoutDot) && valueWithoutDot > 0) {
        customSpeedDisplay.textContent = `${valueWithoutDot} t/s`;
        customSpeedDisplay.classList.add('text-indigo-600');
      } else {
        customSpeedDisplay.textContent = i18n?.t('label_disabled') || 'Disabled';
        customSpeedDisplay.classList.remove('text-indigo-600');
      }
    }
    // Restore cursor position
    input.setSelectionRange(cursorPosition, cursorEnd);
    return;
  }
  
  let value = parseFloat(inputValue);
  // Clamp to decimal values above 0 (0 = disabled, direct t/s value)
  if (isNaN(value) || value < 0) {
    value = 0;
  }
  // Update the input value to reflect clamping
  input.value = value;
  
  // Restore cursor position (adjust if the value was shortened)
  const newLength = String(value).length;
  const newCursorPosition = Math.min(cursorPosition, newLength);
  input.setSelectionRange(newCursorPosition, newCursorPosition);
  
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
      activePointerIds[colIdx] = null;
      handleManualInputUp(colIdx);
    }
    event.preventDefault();
  }
});

colElements.forEach((colElement, colIdx) => {
  colElement.addEventListener('pointerdown', (event) => {
    activeKeys[colIdx] = true;
    activePointerIds[colIdx] = event.pointerId;
    handleManualInputDown(colIdx, event);
    event.preventDefault();
  });
  colElement.addEventListener('pointerup', (event) => {
    if (activePointerIds[colIdx] === event.pointerId) {
      activeKeys[colIdx] = false;
      activePointerIds[colIdx] = null;
      handleManualInputUp(colIdx);
    }
    event.preventDefault();
  });
  colElement.addEventListener('pointercancel', (event) => {
    if (activePointerIds[colIdx] === event.pointerId) {
      activeKeys[colIdx] = false;
      activePointerIds[colIdx] = null;
      handleManualInputUp(colIdx);
    }
  });
});

// Window level fallback to release key/pointer hold state reliably
window.addEventListener('pointerup', (event) => {
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx] && activePointerIds[colIdx] === event.pointerId) {
      activeKeys[colIdx] = false;
      activePointerIds[colIdx] = null;
      handleManualInputUp(colIdx);
    }
  }
});

window.addEventListener('pointercancel', (event) => {
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    if (activeKeys[colIdx] && activePointerIds[colIdx] === event.pointerId) {
      activeKeys[colIdx] = false;
      activePointerIds[colIdx] = null;
      handleManualInputUp(colIdx);
    }
  }
});

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
  if (typeof render700PlusSongs === 'function') render700PlusSongs();
  if (typeof renderSongOfTheDay === 'function') renderSongOfTheDay();
  if (typeof populateMusicSelect === 'function') populateMusicSelect();
});
rafId = requestAnimationFrame(frame);

function renderClassScreen() {
  const container = document.getElementById('class-list-container');
  const highestCleared = document.getElementById('class-highest-cleared');
  if (!container) return;
  container.innerHTML = '';
  
  let clearedText = "None";
  if (classHighestCleared > 0) {
    if (classHighestCleared === 11) clearedText = "Kaidan";
    else clearedText = classHighestCleared + (classHighestCleared === 1 ? "st" : classHighestCleared === 2 ? "nd" : classHighestCleared === 3 ? "rd" : "th") + " Dan";
  }
  if (highestCleared) highestCleared.textContent = "Classification: " + clearedText;

  // Render from highest (Kaidan) down to 1st
  const sortedData = [...classData].reverse();
  
  sortedData.forEach((dan, index) => {
    const item = document.createElement('div');
    item.className = 'class-item';
    if (dan.id === 'kaidan') item.classList.add('bg-kaidan');
    else if (dan.id === '9th_dan' || dan.id === '10th_dan') item.classList.add('bg-grey');
    
    item.innerHTML = `
      <div class="class-item-title">${dan.name}</div>
      <div class="class-song-list">
        ${dan.songs.map(s => `<span>"${s.customName}"</span>`).join('')}
      </div>
    `;
    item.onclick = () => {
      if (isPlayInProgress) return;
      if (!spendLifeCost(1)) return;

      isPlayInProgress = true;
      animateLifeSpendFromTopBar();
      playLifeIntroSound();
      
      const buttonEl = item;
      buttonEl.style.transform = 'scale(0.9)';
      setTimeout(() => {
        buttonEl.style.transform = 'scale(1)';
      }, 150);
      
      window.setTimeout(() => {
        startClassMode(dan);
      }, 1000);
    };
    container.appendChild(item);
  });
}

function startClassMode(dan) {
  isClassMode = true;
  isClassicMode = false;
  isChallengeMode = false;
  classCurrentData = dan;
  classSongIndex = 0;
  classPauseTimer = 60;
  classSongProgress = [];
  classSongSectionStarts = [];
  classSongTotalTiles = [];
  
  if (classScreen) classScreen.classList.add('hidden');
  
  loadClassCourse();
}

async function loadClassCourse() {
  try {
    let allMergedMusics = [];
    let currentSectionOffset = 0;
    const breakSectionIndices = []; // track which section offsets are inter-song breaks
    const BREAK_DURATION_SECONDS = 3;

    for (let i = 0; i < classCurrentData.songs.length; i++) {
      const songInfo = classCurrentData.songs[i];
      const musicData = musicCsvData.find(m => m.musicJson === songInfo.fileName);
      if (!musicData) throw new Error("Song not found: " + songInfo.fileName);

      const r = await fetch(`song/${songInfo.fileName}.json`);
      const sourceJson = await r.json();

      const sectionIds = Object.keys(musicData.sections).map(Number).sort((a, b) => a - b);
      const musics = Array.isArray(sourceJson.musics) ? sourceJson.musics : [];
      
      classSongSectionStarts.push(currentSectionOffset);
      let lastBpm = 120;
      let lastBaseBeats = 0.5;

      sectionIds.forEach((sectionId) => {
        const music = musics.find((entry) => parseInt(entry.id, 10) === sectionId);
        const csvSection = musicData.sections[sectionId];
        if (!music || !csvSection) return;
        
        lastBpm = csvSection.bpm || music.bpm || 120;
        lastBaseBeats = music.baseBeats || csvSection.baseBeats || 0.5;
        
        allMergedMusics.push({
          ...music,
          id: currentSectionOffset++,
          bpm: lastBpm,
          baseBeats: lastBaseBeats
        });
      });
      
      // Inject a break gap between songs (not after the last song)
      if (i < classCurrentData.songs.length - 1) {
        // Record this section offset so we can inject spacer tiles after loadSongObject
        breakSectionIndices.push(currentSectionOffset);
        // Use baseBeats matching the last song section so tile size is consistent.
        // scores is a single rest character to ensure strToTiles produces a non-empty base
        // for the section — the actual spacer tile will be injected post-load.
        allMergedMusics.push({
          id: currentSectionOffset++,
          bpm: lastBpm,
          baseBeats: lastBaseBeats,
          scores: [''], // empty string → strToTiles returns [] → sheet entry becomes []
          isExplicitBreak: true,
          breakDurationSeconds: BREAK_DURATION_SECONDS
        });
      }
    }

    selectedSongData = {
      label: classCurrentData.name,
      scrollDuration: 100, 
      musicJson: classCurrentData.songs[0].fileName,
      bpm: allMergedMusics[0].bpm
    };

    loadSongObject({
      baseBpm: allMergedMusics[0].bpm,
      musics: allMergedMusics
    }, classCurrentData.name);

    // Post-process: inject blank spacer tiles into each break section so the gap
    // is visually represented as scrolling empty space between songs.
    // At scroll speed = bpm/beats/60 tiles-per-second, a gap of BREAK_DURATION_SECONDS
    // seconds needs hlen = speed * duration tiles of blank space.
    for (const breakIdx of breakSectionIndices) {
      if (sheet[breakIdx] !== undefined) {
        // Determine the speed from the info entry for this section
        const breakInfo = info[breakIdx];
        const bpm = (breakInfo && breakInfo.bpm) || allMergedMusics[0].bpm || 120;
        const beats = (breakInfo && breakInfo.beats) || 0.5;
        const tilesPerSecond = bpm / beats / 60;
        const spacerHlen = Math.max(1, tilesPerSecond * BREAK_DURATION_SECONDS);
        // Insert a single invisible (type 1) spacer tile tagged so the engine can
        // identify it as a break spacer and ignore it for song-index tracking.
        sheet[breakIdx] = [{
          type: 1,
          scores: [],
          hlen: spacerHlen,
          _isClassBreakSpacer: true
        }];
      }
    }

    const sharedDock = document.getElementById('shared-dock');
    if (sharedDock) sharedDock.classList.add('hidden');

    const sharedTopBar = document.getElementById('shared-top-bar');
    if (sharedTopBar) sharedTopBar.classList.add('hidden');

    if (gameBoardWrapper) gameBoardWrapper.classList.add('game-playing');

  } catch (err) {
    console.error(err);
    finishRun(false);
  }
}
