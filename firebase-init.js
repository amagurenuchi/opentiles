/**
 * Firebase Initialization for Renderer Process
 * 
 * This module initializes Firebase services in the renderer process
 * with security best practices for Electron applications.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// Firebase configuration will be injected by the main process via preload script
let firebaseConfig = window.firebaseConfig || {};

let app = null;
let auth = null;
let db = null;
let analytics = null;

/**
 * Initialize Firebase with security best practices
 * @param {Object} config - Firebase configuration object
 * @returns {Object} Initialized Firebase services
 */
function initializeFirebaseServices(config) {
  if (!config || !config.apiKey) {
    console.error('Invalid Firebase configuration provided');
    throw new Error('Firebase configuration is required');
  }

  try {
    // Initialize Firebase app
    app = initializeApp(config);
    
    // Initialize Auth with IndexedDB persistence (more secure than localStorage)
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence
    });
    
    // Initialize Firestore
    db = getFirestore(app);
    
    // Initialize Analytics (only in production and if measurement ID is available)
    if (config.measurementId && typeof window !== 'undefined' && window.location) {
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn('Analytics initialization failed:', error);
      }
    }
    
    console.log('Firebase initialized successfully');
    
    return {
      app,
      auth,
      db,
      analytics
    };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

/**
 * Get initialized Firebase services
 * @returns {Object} Firebase services
 */
function getFirebaseServices() {
  if (!app || !auth || !db) {
    throw new Error('Firebase services not initialized. Call initializeFirebaseServices first.');
  }
  
  return { app, auth, db, analytics };
}

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
function isFirebaseInitialized() {
  return !!(app && auth && db);
}

/**
 * Clean up Firebase resources (call when app is closing)
 */
function cleanupFirebase() {
  // Firebase automatically cleans up when the page unloads
  // This function is for any manual cleanup if needed
  app = null;
  auth = null;
  db = null;
  analytics = null;
}

// Export for use in other modules (ES6 exports for browser)
export {
  initializeFirebaseServices,
  getFirebaseServices,
  isFirebaseInitialized,
  cleanupFirebase
};
