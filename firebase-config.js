/**
 * Firebase Configuration Module
 * 
 * This module securely initializes Firebase with environment variables.
 * In production, these values should come from environment variables or
 * a secure configuration service, never hardcoded.
 * 
 * SECURITY NOTES:
 * - Never commit actual Firebase credentials to version control
 * - The API key is safe to expose in client-side code (it's designed for that)
 * - However, other credentials should be protected via Firebase Security Rules
 * - Enable Firebase Authentication to restrict data access
 */

// Load environment variables from the .env file
// In Electron, we need to read these from the main process or use a preload script
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
};

/**
 * Validate that required Firebase configuration is present
 * @throws {Error} If required configuration is missing
 */
function validateFirebaseConfig() {
  const requiredFields = ['apiKey', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Firebase configuration: ${missingFields.join(', ')}. ` +
      'Please set these in your .env file or environment variables.'
    );
  }
}

/**
 * Get Firebase configuration
 * @returns {Object} Firebase configuration object
 */
function getFirebaseConfig() {
  validateFirebaseConfig();
  return firebaseConfig;
}

/**
 * Check if Firebase is properly configured
 * @returns {boolean} True if Firebase is configured
 */
function isFirebaseConfigured() {
  try {
    validateFirebaseConfig();
    return true;
  } catch (error) {
    console.warn('Firebase not configured:', error.message);
    return false;
  }
}

// For browser environment, we'll use a different approach
// This file will be used in the main process, and we'll pass config to renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFirebaseConfig,
    isFirebaseConfigured,
    firebaseConfig
  };
}
