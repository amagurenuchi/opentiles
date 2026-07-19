/**
 * Preload Script for Electron
 * 
 * This script runs before the renderer process and provides a secure bridge
 * between the main process and renderer process for Firebase configuration.
 */

const { contextBridge, ipcRenderer } = require('electron');
require('dotenv').config();

// Load Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
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
