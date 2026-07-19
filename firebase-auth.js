/**
 * Firebase Authentication Service
 * 
 * Provides secure authentication for the OpenTile game using Google Sign-in only.
 */

import {
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let auth = null;

/**
 * Initialize the auth service
 * @param {Object} authInstance - Firebase Auth instance
 */
function initAuthService(authInstance) {
  auth = authInstance;
}

/**
 * Sign in with Google
 * @returns {Promise<Object>} User credential
 */
async function signInWithGoogle() {
  if (!auth) throw new Error('Auth not initialized');
  
  try {
    const provider = new GoogleAuthProvider();
    // Add scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    
    const userCredential = await signInWithPopup(auth, provider);
    console.log('Google sign in successful');
    return userCredential;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}

/**
 * Sign in with Google using redirect (alternative method)
 * @returns {Promise<void>}
 */
async function signInWithGoogleRedirect() {
  if (!auth) throw new Error('Auth not initialized');
  
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Google redirect sign in error:', error);
    throw error;
  }
}

/**
 * Get redirect result (call after redirect-based sign in)
 * @returns {Promise<Object>} User credential
 */
async function getGoogleRedirectResult() {
  if (!auth) throw new Error('Auth not initialized');
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('Google redirect sign in successful');
      return result;
    }
    return null;
  } catch (error) {
    console.error('Google redirect result error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
async function signOutUser() {
  if (!auth) throw new Error('Auth not initialized');
  
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function (user) => {}
 * @returns {Function} Unsubscribe function
 */
function onAuthStateChange(callback) {
  if (!auth) throw new Error('Auth not initialized');
  
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 * @returns {Object|null} Current user or null
 */
function getCurrentUser() {
  if (!auth) return null;
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  const user = getCurrentUser();
  return user !== null;
}

/**
 * Get user ID
 * @returns {string|null} User ID or null
 */
function getUserId() {
  const user = getCurrentUser();
  return user ? user.uid : null;
}

/**
 * Get user display name
 * @returns {string|null} Display name or null
 */
function getUserDisplayName() {
  const user = getCurrentUser();
  return user ? user.displayName : null;
}

/**
 * Get user email
 * @returns {string|null} Email or null
 */
function getUserEmail() {
  const user = getCurrentUser();
  return user ? user.email : null;
}

/**
 * Get user photo URL
 * @returns {string|null} Photo URL or null
 */
function getUserPhotoURL() {
  const user = getCurrentUser();
  return user ? user.photoURL : null;
}

/**
 * Check if user signed in with Google
 * @returns {boolean}
 */
function isGoogleUser() {
  const user = getCurrentUser();
  if (!user || !user.providerData) return false;
  return user.providerData.some(provider => provider.providerId === 'google.com');
}

// Export for use in other modules (ES6 exports for browser)
export {
  initAuthService,
  signInWithGoogle,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
  signOutUser,
  onAuthStateChange,
  getCurrentUser,
  isAuthenticated,
  getUserId,
  getUserDisplayName,
  getUserEmail,
  getUserPhotoURL,
  isGoogleUser
};
