/**
 * Firebase Integration Example
 * 
 * This file demonstrates how to integrate Firebase into the OpenTile game using Google Sign-in only.
 * Import this file in your game.js or main game logic to use Firebase features.
 */

import { initializeFirebaseServices, getFirebaseServices } from './firebase-init.js';
import {
  initAuthService,
  signInWithGoogle,
  onAuthStateChange,
  getUserId,
  isAuthenticated,
  getUserDisplayName,
  getUserPhotoURL
} from './firebase-auth.js';
import {
  initFirestoreService,
  getOrCreateUserDocument,
  saveHighScore,
  getUserHighScores,
  updateUserTotals,
  saveUserSettings,
  getUserSettings,
  updateUserLives,
  getUserLives,
  saveSongLevel,
  getUserSongLevels,
  updateUserClassification,
  getUserClassification,
  syncUserDataFromLocal,
  updateUserDocument
} from './firebase-firestore.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let firebaseInitialized = false;

/**
 * Initialize Firebase for the OpenTile game
 * Call this when the game starts (after loading screen)
 */
async function initializeGameFirebase() {
  try {
    // Get Firebase config from preload script
    const config = window.firebaseConfig;
    
    if (!config || !config.apiKey) {
      console.log('Firebase not configured. Running in offline mode.');
      return false;
    }
    
    // Initialize Firebase services
    const services = initializeFirebaseServices(config);
    firebaseInitialized = true;
    
    // Initialize auth and firestore services
    initAuthService(services.auth);
    initFirestoreService(services.db);
    
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    // Check if this is a Firestore database not found error
    if (error.code === 'not-found' || error.message?.includes('does not exist')) {
      console.log('Firestore database not created yet. Running in offline mode. Create Firestore database in Firebase Console to enable cloud sync.');
    } else {
      console.log('Firebase initialization failed. Running in offline mode:', error.message);
    }
    return false;
  }
}

/**
 * Get the auth instance for use in game.js
 * @returns {Object|null} Auth instance or null
 */
function getAuthInstance() {
  try {
    const services = getFirebaseServices();
    return services.auth;
  } catch (error) {
    console.warn('Auth instance not available:', error);
    return null;
  }
}

/**
 * Sign in user for gameplay using Google Sign-in
 * @returns {Promise<Object|null>} User data or null if failed
 */
async function signInForGameplay() {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized, skipping sign in');
    return null;
  }
  
  try {
    const userCredential = await signInWithGoogle();
    const userId = getUserId();
    const displayName = getUserDisplayName();
    const email = getUserEmail();
    const photoURL = getUserPhotoURL();
    
    // Get or create user document with authenticated user data
    const userData = await getOrCreateUserDocument(userId, {
      displayName: displayName || 'Player',
      email: email || null,
      photoURL: photoURL || null,
      isAnonymous: false
    });
    
    console.log('User signed in for gameplay:', userId);
    return userData;
  } catch (error) {
    console.error('Google sign in failed:', error);
    return null;
  }
}

/**
 * Save game score to Firebase
 * @param {string} songId - Song ID
 * @param {number} score - Score value
 * @param {number} level - Achievement level
 * @param {Object} metadata - Additional metadata (stars, crowns, TPS, etc.)
 */
async function saveGameScore(songId, score, level, metadata = {}) {
  if (!firebaseInitialized || !isAuthenticated()) {
    console.warn('Firebase not available for score saving');
    return;
  }
  
  try {
    const userId = getUserId();
    await saveHighScore(userId, songId, score, level, metadata);
    console.log('Score saved to Firebase');
  } catch (error) {
    console.error('Failed to save score:', error);
  }
}

/**
 * Load user's high scores from Firebase
 * @returns {Promise<Object>} High scores object
 */
async function loadHighScores() {
  if (!firebaseInitialized || !isAuthenticated()) {
    console.warn('Firebase not available for loading scores');
    return {};
  }
  
  try {
    const userId = getUserId();
    const highScores = await getUserHighScores(userId);
    return highScores;
  } catch (error) {
    console.error('Failed to load high scores:', error);
    return {};
  }
}

/**
 * Sync local settings with Firebase
 */
async function syncSettings() {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    
    // Get local settings
    const localSettings = {
      keybinds: JSON.parse(localStorage.getItem('opentile_keybinds') || '["KeyD","KeyF","KeyJ","KeyK"]'),
      autoplayEnabled: localStorage.getItem('opentile_autoplay') === 'true',
      reviveSlowdownEnabled: localStorage.getItem('opentile_revive_slowdown') !== 'false',
      customStartingSpeed: parseFloat(localStorage.getItem('opentile_custom_speed') || '0'),
      language: localStorage.getItem('opentile_language') || 'en'
    };
    
    // Save to Firebase
    await saveUserSettings(userId, localSettings);
    
    // Get cloud settings and merge (for cross-device sync)
    const cloudSettings = await getUserSettings(userId);
    
    // Merge cloud settings with local (cloud takes precedence for some settings)
    if (cloudSettings.language) {
      localStorage.setItem('opentile_language', cloudSettings.language);
    }
    
    console.log('Settings synced with Firebase');
  } catch (error) {
    console.error('Failed to sync settings:', error);
  }
}

/**
 * Update user's total stars and crowns
 * @param {number} totalStars - Total stars
 * @param {number} totalCrowns - Total crowns
 */
async function updateUserProgress(totalStars, totalCrowns) {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    await updateUserTotals(userId, totalStars, totalCrowns);
    console.log('User progress updated');
  } catch (error) {
    console.error('Failed to update user progress:', error);
  }
}

/**
 * Set up auth state listener
 * @param {Function} callback - Callback when auth state changes
 */
function setupAuthListener(callback) {
  if (!firebaseInitialized) {
    return () => {};
  }
  
  return onAuthStateChange((user) => {
    if (user) {
      console.log('User is signed in:', user.uid);
      callback(true, user);
    } else {
      console.log('User is signed out');
      callback(false, null);
    }
  });
}

/**
 * Check if Firebase is available
 * @returns {boolean}
 */
function isFirebaseAvailable() {
  return firebaseInitialized && isAuthenticated();
}

/**
 * Sync user lives to Firestore
 * @param {number} lifeCount - Current life count
 * @param {number} lastUpdatedAt - Last updated timestamp
 */
async function syncLivesToFirestore(lifeCount, lastUpdatedAt) {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    await updateUserLives(userId, lifeCount, lastUpdatedAt);
    console.debug('Lives synced to Firestore');
  } catch (error) {
    // Silently handle offline/missing database
    if (error.code === 'unavailable' || error.code === 'not-found' || error.message?.includes('offline')) {
      console.debug('Firestore unavailable, lives data stored locally');
    } else {
      console.debug('Failed to sync lives to Firestore:', error.message);
    }
  }
}

/**
 * Load user lives from Firestore
 * @returns {Promise<Object>} Lives data { count, lastUpdatedAt }
 */
async function loadLivesFromFirestore() {
  if (!firebaseInitialized || !isAuthenticated()) {
    return null;
  }
  
  try {
    const userId = getUserId();
    const lives = await getUserLives(userId);
    return lives;
  } catch (error) {
    console.error('Failed to load lives:', error);
    return null;
  }
}

/**
 * Save song level achievement to Firestore
 * @param {string} songId - Song ID
 * @param {number} level - Achievement level
 */
async function saveSongLevelToFirestore(songId, level) {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    await saveSongLevel(userId, songId, level);
    console.debug('Song level saved to Firestore');
  } catch (error) {
    // Silently handle offline/missing database
    if (error.code === 'unavailable' || error.code === 'not-found' || error.message?.includes('offline')) {
      console.debug('Firestore unavailable, song level stored locally');
    } else {
      console.debug('Failed to save song level to Firestore:', error.message);
    }
  }
}

/**
 * Load song levels from Firestore
 * @returns {Promise<Object>} Song levels object
 */
async function loadSongLevelsFromFirestore() {
  if (!firebaseInitialized || !isAuthenticated()) {
    return {};
  }
  
  try {
    const userId = getUserId();
    const songLevels = await getUserSongLevels(userId);
    return songLevels;
  } catch (error) {
    console.error('Failed to load song levels:', error);
    return {};
  }
}

/**
 * Sync user classification to Firestore
 * @param {Object} classification - Classification data
 */
async function syncClassificationToFirestore(classification) {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    await updateUserClassification(userId, classification);
    console.log('Classification synced to Firestore');
  } catch (error) {
    console.error('Failed to sync classification:', error);
  }
}

/**
 * Load user classification from Firestore
 * @returns {Promise<Object>} Classification data
 */
async function loadClassificationFromFirestore() {
  if (!firebaseInitialized || !isAuthenticated()) {
    return null;
  }
  
  try {
    const userId = getUserId();
    const classification = await getUserClassification(userId);
    return classification;
  } catch (error) {
    console.error('Failed to load classification:', error);
    return null;
  }
}

/**
 * Sync all local user data to Firestore
 * @param {Array} musicData - Music CSV data for calculating stars/crowns
 */
async function syncAllUserDataToFirestore(musicData) {
  if (!firebaseInitialized || !isAuthenticated()) {
    return;
  }
  
  try {
    const userId = getUserId();
    
    // Gather data from localStorage
    const playerName = localStorage.getItem('opentile_playername') || 'Player';
    const lifeCount = parseInt(localStorage.getItem('opentile_life_count') || '21', 10);
    const lifeLastUpdatedAt = parseInt(localStorage.getItem('opentile_life_last_updated_at') || String(Date.now()), 10);
    
    // Calculate total stars and crowns from localStorage and build high scores
    let totalStars = 0;
    let totalCrowns = 0;
    const songLevels = {};
    const highScores = {};
    
    if (musicData && Array.isArray(musicData)) {
      musicData.forEach((song) => {
        const bestLevel = parseInt(localStorage.getItem(`opentile_highscore_level_${song.mid}`) || '0', 10);
        if (bestLevel > 0) {
          songLevels[song.mid] = bestLevel;
          const stage = getStarAndCrownStateFromLevel(bestLevel);
          totalStars += stage.stars;
          totalCrowns += stage.crowns;
          
          // Build high score in "mid,score,star/crown state" format
          const bestScoreKey = `opentile_best_score_${song.mid}`;
          const bestScore = parseFloat(localStorage.getItem(bestScoreKey) || '0');
          const stateString = stage.crowns > 0 
            ? `${stage.crowns}👑` 
            : `${stage.stars}⭐`;
          
          highScores[song.mid] = {
            mid: song.mid,
            score: bestScore,
            starCrownState: stateString,
            level: bestLevel
          };
        }
      });
    }
    
    // Update Firestore with all data (skip timestamp for frequent syncs)
    await updateUserDocument(userId, {
      displayName: playerName,
      lives: {
        count: lifeCount,
        lastUpdatedAt: lifeLastUpdatedAt
      },
      songLevels: songLevels,
      highScores: highScores,
      totalStars: totalStars,
      totalCrowns: totalCrowns
    }, true);
    
    console.debug('All user data synced to Firestore');
  } catch (error) {
    // Silently handle offline/missing database
    if (error.code === 'unavailable' || error.code === 'not-found' || error.message?.includes('offline')) {
      console.debug('Firestore unavailable, user data stored locally');
    } else {
      console.debug('Failed to sync user data to Firestore:', error.message);
    }
  }
}

/**
 * Load all user data from Firestore and sync to localStorage
 */
async function loadAllUserDataFromFirestore() {
  if (!firebaseInitialized || !isAuthenticated()) {
    return false;
  }
  
  try {
    const userId = getUserId();
    const userData = await getOrCreateUserDocument(userId, {});
    
    // Sync to localStorage
    if (userData.displayName) {
      localStorage.setItem('opentile_playername', userData.displayName);
    }
    
    if (userData.lives) {
      localStorage.setItem('opentile_life_count', String(userData.lives.count || 21));
      if (userData.lives.lastUpdatedAt) {
        localStorage.setItem('opentile_life_last_updated_at', String(userData.lives.lastUpdatedAt));
      }
    }
    
    // Restore song levels (star/crown achievements)
    if (userData.songLevels) {
      Object.entries(userData.songLevels).forEach(([songId, level]) => {
        localStorage.setItem(`opentile_highscore_level_${songId}`, String(level));
      });
    }
    
    // Restore high scores (actual score values)
    if (userData.highScores) {
      Object.entries(userData.highScores).forEach(([songId, scoreData]) => {
        if (scoreData && scoreData.score) {
          localStorage.setItem(`opentile_best_score_${songId}`, String(scoreData.score));
        }
      });
    }
    
    // Restore total stars and crowns (for UI display)
    if (userData.totalStars !== undefined) {
      // This is calculated from songLevels, but stored for reference
      console.debug(`Loaded ${userData.totalStars} total stars from Firestore`);
    }
    
    if (userData.totalCrowns !== undefined) {
      console.debug(`Loaded ${userData.totalCrowns} total crowns from Firestore`);
    }
    
    // Restore user settings if available
    if (userData.settings) {
      if (userData.settings.keybinds) {
        localStorage.setItem('opentile_keybinds', JSON.stringify(userData.settings.keybinds));
      }
      if (userData.settings.autoplayEnabled !== undefined) {
        localStorage.setItem('opentile_autoplay', String(userData.settings.autoplayEnabled));
      }
      if (userData.settings.reviveSlowdownEnabled !== undefined) {
        localStorage.setItem('opentile_revive_slowdown', String(userData.settings.reviveSlowdownEnabled));
      }
      if (userData.settings.customStartingSpeed !== undefined) {
        localStorage.setItem('opentile_custom_speed', String(userData.settings.customStartingSpeed));
      }
      if (userData.settings.language) {
        localStorage.setItem('opentile_language', userData.settings.language);
      }
    }
    
    console.log('All user data loaded from Firestore');
    return true;
  } catch (error) {
    // Silently handle offline/missing database - game continues with localStorage
    if (error.code === 'unavailable' || error.code === 'not-found' || error.message?.includes('offline')) {
      console.debug('Firestore unavailable, using localStorage data');
    } else {
      console.debug('Failed to load user data from Firestore, using localStorage:', error.message);
    }
    return false;
  }
}

// Helper function (imported from firestore)
function getStarAndCrownStateFromLevel(level) {
  if (level < 1) return { stars: 0, crowns: 0 };
  if (level === 1) return { stars: 1, crowns: 0 };
  if (level === 2) return { stars: 2, crowns: 0 };
  if (level === 3) return { stars: 3, crowns: 0 };
  if (level >= 4 && level < 6) return { stars: 3, crowns: 1 };
  if (level >= 6 && level < 9) return { stars: 3, crowns: 2 };
  if (level >= 9) return { stars: 3, crowns: 3 };
  return { stars: 0, crowns: 0 };
}

// Export functions for use in game.js (ES6 exports for browser)
export {
  initializeGameFirebase,
  getAuthInstance,
  signInForGameplay,
  saveGameScore,
  loadHighScores,
  syncSettings,
  updateUserProgress,
  setupAuthListener,
  isFirebaseAvailable,
  syncLivesToFirestore,
  loadLivesFromFirestore,
  saveSongLevelToFirestore,
  loadSongLevelsFromFirestore,
  syncClassificationToFirestore,
  loadClassificationFromFirestore,
  syncAllUserDataToFirestore,
  loadAllUserDataFromFirestore
};
