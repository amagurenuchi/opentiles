'use strict';

// Translation system for OpenTiles
class TranslationSystem {
  constructor() {
    this.translations = {};
    this.songTranslations = {};
    this.currentLanguage = 'en';
    this.supportedLanguages = ['en', 'zh', 'ja'];
    this.translationLoadPromise = null;
    this.languageNames = {
      'en': 'English',
      'zh': '中文',
      'ja': '日本語'
    };
  }

  // Load translations from CSV file
  async loadTranslations() {
    if (this.translationLoadPromise) {
      return this.translationLoadPromise;
    }

    this.translationLoadPromise = (async () => {
      try {
        // Load UI translations
        const response = await fetch('translations.csv');
        const csvText = await response.text();
        this.parseCSV(csvText);
        
        // Load song name translations
        const songResponse = await fetch('language_music.csv');
        const songCsvText = await songResponse.text();
        this.parseSongCSV(songCsvText);
        
        // Load saved language preference
        const savedLang = localStorage.getItem('opentile_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
          this.currentLanguage = savedLang;
        }
        
        return true;
      } catch (error) {
        console.error('Failed to load translations:', error);
        return false;
      }
    })();

    return this.translationLoadPromise;
  }

  // Parse CSV format: key,english,chinese,japanese
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    
    // Create translation object
    this.translations = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const key = values[0];
      
      this.translations[key] = {
        en: values[1] || key,
        zh: values[2] || values[1] || key,
        ja: values[3] || values[1] || key
      };
    }
  }

  // Parse song CSV format: tid,chinese,english,japanese
  parseSongCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    
    // Create song translation object
    this.songTranslations = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const tid = values[0]; // Use original English name as key
      
      this.songTranslations[tid] = {
        en: values[2] || tid, // English column
        zh: values[1] || values[2] || tid, // Chinese column
        ja: values[3] || values[2] || tid  // Japanese column
      };
    }
  }

  // Parse a single CSV line, handling quoted fields
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Get translated string for a key
  t(key, fallback = null) {
    if (!this.translations[key]) {
      return fallback || key;
    }
    
    const translation = this.translations[key][this.currentLanguage];
    return translation || fallback || key;
  }

  // Get localized song name
  getSongName(originalName, fallback = null) {
    if (!this.songTranslations[originalName]) {
      return fallback || originalName;
    }
    
    const translation = this.songTranslations[originalName][this.currentLanguage];
    return translation || fallback || originalName;
  }

  // Get localized artist name
  getArtistName(originalName, fallback = null) {
    if (!originalName) {
      return fallback || '';
    }

    const translationKey = `artist_${originalName}`;
    if (!this.translations[translationKey]) {
      return fallback || originalName;
    }

    const translation = this.translations[translationKey][this.currentLanguage];
    return translation || fallback || originalName;
  }

  // Set current language
  setLanguage(language) {
    if (this.supportedLanguages.includes(language)) {
      this.currentLanguage = language;
      localStorage.setItem('opentile_language', language);
      this.updateUITranslations();
      // Trigger custom event for song translations update
      const event = new CustomEvent('languageChanged', { detail: { language: this.currentLanguage } });
      document.dispatchEvent(event);
      return true;
    }
    return false;
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Get language name for display
  getLanguageName(language) {
    return this.languageNames[language] || language;
  }

  // Update all UI elements with data-i18n attributes
  updateUITranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      const isPlayerNameElement = ['player-name-text', 'player-name-text-home', 'player-name-text-challenges'].includes(element.id);
      const hasSavedPlayerName = Boolean(localStorage.getItem('opentile_playername'));

      if (isPlayerNameElement && hasSavedPlayerName) {
        return;
      }
      
      if (translation) {
        // Update text content
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
          element.setAttribute('placeholder', translation);
        } else {
          element.textContent = translation;
        }
      }
    });

    // Update elements with data-i18n-placeholder attribute
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation) {
        element.setAttribute('placeholder', translation);
      }
    });

    // Update elements with data-i18n-title attribute
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation) {
        element.setAttribute('title', translation);
      }
    });

    // Update elements with data-i18n-aria-label attribute
    const ariaElements = document.querySelectorAll('[data-i18n-aria-label]');
    ariaElements.forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      const translation = this.t(key);
      if (translation) {
        element.setAttribute('aria-label', translation);
      }
    });

    // Update elements with data-i18n-alt attribute
    const altElements = document.querySelectorAll('[data-i18n-alt]');
    altElements.forEach(element => {
      const key = element.getAttribute('data-i18n-alt');
      const translation = this.t(key);
      if (translation) {
        element.setAttribute('alt', translation);
      }
    });
  }
}

// Create global instance
const i18n = new TranslationSystem();

// Auto-load translations on page load
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.loadTranslations();
  i18n.updateUITranslations();

  if (typeof syncTopDockData === 'function') {
    syncTopDockData();
  }
  
  // Set up language selector
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.value = i18n.getCurrentLanguage();
    languageSelector.addEventListener('change', (e) => {
      const selectedLanguage = e.target.value;
      if (i18n.setLanguage(selectedLanguage)) {
        console.log(`Language changed to: ${selectedLanguage}`);
      }
    });
  }
  
  // Listen for language changes to update song displays
  document.addEventListener('languageChanged', () => {
    // Update song lists and displays
    if (typeof renderSongList === 'function') {
      renderSongList();
    }
    if (typeof renderHomeScreen === 'function') {
      renderHomeScreen();
    }
    if (typeof renderFavouriteSongs === 'function') {
      renderFavouriteSongs();
    }
    if (typeof render700PlusSongs === 'function') {
      render700PlusSongs();
    }
    if (typeof populateMusicSelect === 'function') {
      populateMusicSelect();
    }
  });
});