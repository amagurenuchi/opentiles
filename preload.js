/**
 * Preload Script for Electron
 * 
 * This script runs before the renderer process and provides a secure bridge
 * between the main process and renderer process for Firebase configuration.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Firebase configuration
// Note: Firebase API keys are designed to be safe in client-side code.
// Security is enforced through Firebase Security Rules and Authentication.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDVfDn1YsQqYBUeVqzYb4yvbeacI2Dg9qI',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'piano-tiles-zero.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'piano-tiles-zero',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'piano-tiles-zero.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '726300822730',
  appId: process.env.FIREBASE_APP_ID || '1:726300822730:web:abcdef1234567890'
};

// Expose Firebase configuration to renderer process in a secure way
contextBridge.exposeInMainWorld('firebaseConfig', firebaseConfig);

// Expose safe IPC methods for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get Firebase config (redundant but explicit)
  getFirebaseConfig: () => firebaseConfig,
  
  // Platform information
  platform: process.platform,
  
  // Safe methods for renderer to call
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // File operations (if needed)
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', content, filename),
  
  // Any other safe IPC methods you need
});

// Console log for debugging (remove in production)
console.log('Preload script loaded with Firebase config:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId
});
