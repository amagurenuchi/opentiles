/**
 * Cloud Firestore Service
 * 
 * Provides secure data persistence for the OpenTile game.
 * Handles user data, high scores, and game progress with proper security.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let db = null;

/**
 * Initialize the Firestore service
 * @param {Object} dbInstance - Firestore instance
 */
function initFirestoreService(dbInstance) {
  db = dbInstance;
}

/**
 * Get user document reference
 * @param {string} userId - User ID
 * @returns {Object} Document reference
 */
function getUserDocRef(userId) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, 'users', userId);
}

/**
 * Get or create user document
 * @param {string} userId - User ID
 * @param {Object} userData - User data to create if doesn't exist
 * @returns {Promise<Object>} User document data
 */
async function getOrCreateUserDocument(userId, userData = {}) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = getUserDocRef(userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  } else {
    // Create new user document
    const newUserData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      displayName: userData.displayName || 'Player',
      email: userData.email || null,
      photoURL: userData.photoURL || null,
      isAnonymous: userData.isAnonymous || false,
      totalStars: 0,
      totalCrowns: 0,
      highScores: {},
      songLevels: {},
      lives: {
        count: 21,
        lastUpdatedAt: serverTimestamp()
      },
      classification: {
        rank: 'Unranked',
        totalSongsPlayed: 0
      },
      settings: {},
      ...userData
    };
    
    await setDoc(userRef, newUserData);
    return { id: userId, ...newUserData };
  }
}

/**
 * Update user document
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {boolean} skipTimestamp - Skip updatedAt timestamp (for frequent updates)
 * @returns {Promise<void>}
 */
async function updateUserDocument(userId, updates, skipTimestamp = false) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = getUserDocRef(userId);
  const updateData = skipTimestamp ? updates : {
    ...updates,
    updatedAt: serverTimestamp()
  };
  await updateDoc(userRef, updateData);
}

/**
 * Save high score for a song
 * @param {string} userId - User ID
 * @param {string} songId - Song ID (mid value)
 * @param {number} score - Score value
 * @param {number} level - Achievement level
 * @param {Object} metadata - Additional metadata (TPS, stars, crowns, etc.)
 * @returns {Promise<void>}
 */
async function saveHighScore(userId, songId, score, level, metadata = {}) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = getUserDocRef(userId);
  
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const currentHighScore = userData.highScores?.[songId] || { score: 0, level: 0 };
    
    // Only update if new score is better
    if (score > currentHighScore.score || level > currentHighScore.level) {
      // Calculate star/crown state from level
      const starCrownState = getStarAndCrownStateFromLevel(level);
      const stateString = starCrownState.crowns > 0 
        ? `${starCrownState.crowns}👑` 
        : `${starCrownState.stars}⭐`;
      
      const updatedHighScores = {
        ...userData.highScores,
        [songId]: {
          mid: songId,
          score: Math.max(score, currentHighScore.score),
          starCrownState: stateString,
          level: Math.max(level, currentHighScore.level),
          achievedAt: serverTimestamp(),
          ...metadata
        }
      };
      
      transaction.update(userRef, {
        highScores: updatedHighScores,
        updatedAt: serverTimestamp()
      });
    }
  });
}

/**
 * Get user's high scores
 * @param {string} userId - User ID
 * @returns {Promise<Object>} High scores object
 */
async function getUserHighScores(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = await getDoc(getUserDocRef(userId));
  
  if (!userDoc.exists()) {
    return {};
  }
  
  return userDoc.data().highScores || {};
}

/**
 * Update user's total stars and crowns
 * @param {string} userId - User ID
 * @param {number} stars - Total stars
 * @param {number} crowns - Total crowns
 * @returns {Promise<void>}
 */
async function updateUserTotals(userId, stars, crowns) {
  if (!db) throw new Error('Firestore not initialized');
  
  await updateUserDocument(userId, {
    totalStars: stars,
    totalCrowns: crowns
  });
}

/**
 * Save user settings
 * @param {string} userId - User ID
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
async function saveUserSettings(userId, settings) {
  if (!db) throw new Error('Firestore not initialized');
  
  await updateUserDocument(userId, {
    settings: settings
  });
}

/**
 * Get user settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User settings
 */
async function getUserSettings(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = await getDoc(getUserDocRef(userId));
  
  if (!userDoc.exists()) {
    return {};
  }
  
  return userDoc.data().settings || {};
}

/**
 * Save game session data
 * @param {string} userId - User ID
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} Session document ID
 */
async function saveGameSession(userId, sessionData) {
  if (!db) throw new Error('Firestore not initialized');
  
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const sessionDoc = await addDoc(sessionsRef, {
    ...sessionData,
    playedAt: serverTimestamp()
  });
  
  return sessionDoc.id;
}

/**
 * Get recent game sessions
 * @param {string} userId - User ID
 * @param {number} limitCount - Maximum number of sessions to retrieve
 * @returns {Promise<Array>} Array of session documents
 */
async function getRecentSessions(userId, limitCount = 10) {
  if (!db) throw new Error('Firestore not initialized');
  
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const q = query(
    sessionsRef,
    orderBy('playedAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Listen to user document changes
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function (data) => {}
 * @returns {Function} Unsubscribe function
 */
function onUserDocumentChange(userId, callback) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = getUserDocRef(userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
}

/**
 * Delete user account and all associated data
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deleteUserAccount(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  // Delete user document (cascades to subcollections in Firestore)
  await deleteDoc(getUserDocRef(userId));
}

/**
 * Get leaderboard data for a specific song
 * @param {string} songId - Song ID
 * @param {number} limitCount - Maximum number of entries
 * @returns {Promise<Array>} Leaderboard entries
 */
async function getSongLeaderboard(songId, limitCount = 100) {
  if (!db) throw new Error('Firestore not initialized');
  
  // This requires a composite index in Firestore
  // Create index: highScores.{songId}.score (descending)
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where(`highScores.${songId}.score`, '>', 0),
    orderBy(`highScores.${songId}.score`, 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      userId: doc.id,
      displayName: data.displayName || 'Anonymous',
      score: data.highScores?.[songId]?.score || 0,
      level: data.highScores?.[songId]?.level || 0,
      isAnonymous: data.isAnonymous || false
    };
  });
}

/**
 * Batch update multiple user documents
 * @param {Array} updates - Array of { userId, updates } objects
 * @returns {Promise<void>}
 */
async function batchUpdateUsers(updates) {
  if (!db) throw new Error('Firestore not initialized');
  
  const batch = writeBatch(db);
  
  updates.forEach(({ userId, updates: userUpdates }) => {
    const userRef = getUserDocRef(userId);
    batch.update(userRef, {
      ...userUpdates,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
}

/**
 * Update user's lives data
 * @param {string} userId - User ID
 * @param {number} lifeCount - Current life count
 * @param {number} lastUpdatedAt - Last updated timestamp
 * @returns {Promise<void>}
 */
async function updateUserLives(userId, lifeCount, lastUpdatedAt) {
  if (!db) throw new Error('Firestore not initialized');
  
  // Skip timestamp for frequent life updates
  await updateUserDocument(userId, {
    lives: {
      count: lifeCount,
      lastUpdatedAt: lastUpdatedAt
    }
  }, true);
}

/**
 * Get user's lives data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Lives data { count, lastUpdatedAt }
 */
async function getUserLives(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = await getDoc(getUserDocRef(userId));
  
  if (!userDoc.exists()) {
    return { count: 21, lastUpdatedAt: Date.now() };
  }
  
  return userDoc.data().lives || { count: 21, lastUpdatedAt: Date.now() };
}

/**
 * Save song level (star/crown achievement)
 * @param {string} userId - User ID
 * @param {string} songId - Song ID
 * @param {number} level - Achievement level
 * @returns {Promise<void>}
 */
async function saveSongLevel(userId, songId, level) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = getUserDocRef(userId);
  
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const currentLevel = userData.songLevels?.[songId] || 0;
    
    // Only update if new level is better
    if (level > currentLevel) {
      const updatedSongLevels = {
        ...userData.songLevels,
        [songId]: level
      };
      
      // Recalculate total stars and crowns
      let totalStars = 0;
      let totalCrowns = 0;
      
      Object.values(updatedSongLevels).forEach(songLevel => {
        const stage = getStarAndCrownStateFromLevel(songLevel);
        totalStars += stage.stars;
        totalCrowns += stage.crowns;
      });
      
      transaction.update(userRef, {
        songLevels: updatedSongLevels,
        totalStars: totalStars,
        totalCrowns: totalCrowns,
        updatedAt: serverTimestamp()
      });
    }
  });
}

/**
 * Get user's song levels
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Song levels object
 */
async function getUserSongLevels(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = await getDoc(getUserDocRef(userId));
  
  if (!userDoc.exists()) {
    return {};
  }
  
  return userDoc.data().songLevels || {};
}

/**
 * Update user classification
 * @param {string} userId - User ID
 * @param {Object} classification - Classification data
 * @returns {Promise<void>}
 */
async function updateUserClassification(userId, classification) {
  if (!db) throw new Error('Firestore not initialized');
  
  await updateUserDocument(userId, {
    classification: classification
  });
}

/**
 * Get user classification
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Classification data
 */
async function getUserClassification(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = await getDoc(getUserDocRef(userId));
  
  if (!userDoc.exists()) {
    return { rank: 'Unranked', totalSongsPlayed: 0 };
  }
  
  return userDoc.data().classification || { rank: 'Unranked', totalSongsPlayed: 0 };
}

/**
 * Sync user data from localStorage to Firestore
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function syncUserDataFromLocal(userId) {
  if (!db) throw new Error('Firestore not initialized');
  
  // Gather data from localStorage
  const playerName = localStorage.getItem('opentile_playername') || 'Player';
  const lifeCount = parseInt(localStorage.getItem('opentile_life_count') || '21', 10);
  const lifeLastUpdatedAt = parseInt(localStorage.getItem('opentile_life_last_updated_at') || String(Date.now()), 10);
  const spentPPoints = parseInt(localStorage.getItem('opentile_spent_ppoints') || '0', 10);
  
  // Calculate total stars and crowns from localStorage
  let totalStars = 0;
  let totalCrowns = 0;
  const songLevels = {};
  
  // This would need access to musicCsvData - will be handled in game.js integration
  
  await updateUserDocument(userId, {
    displayName: playerName,
    lives: {
      count: lifeCount,
      lastUpdatedAt: lifeLastUpdatedAt
    },
    songLevels: songLevels,
    totalStars: totalStars,
    totalCrowns: totalCrowns,
    updatedAt: serverTimestamp()
  });
}

/**
 * Helper function to get star and crown state from level
 * @param {number} level - Achievement level
 * @returns {Object} { stars, crowns }
 */
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

// Export for use in other modules (ES6 exports for browser)
export {
  initFirestoreService,
  getOrCreateUserDocument,
  updateUserDocument,
  saveHighScore,
  getUserHighScores,
  updateUserTotals,
  saveUserSettings,
  getUserSettings,
  saveGameSession,
  getRecentSessions,
  onUserDocumentChange,
  deleteUserAccount,
  getSongLeaderboard,
  batchUpdateUsers,
  updateUserLives,
  getUserLives,
  saveSongLevel,
  getUserSongLevels,
  updateUserClassification,
  getUserClassification,
  syncUserDataFromLocal,
  getStarAndCrownStateFromLevel
};
