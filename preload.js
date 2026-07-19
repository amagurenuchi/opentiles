/**
 * Preload Script for Electron
 * 
 * This script runs before the renderer process and provides a secure bridge
 * between the main process and renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // Safe methods for renderer to call
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // File operations (if needed)
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', content, filename),
  
  // Any other safe IPC methods you need
});
