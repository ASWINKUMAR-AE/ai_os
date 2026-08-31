// Storage Module - Local Data Management
class StorageModule {
  constructor() {
    this.prefix = 'ai_assistant_';
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.encryptionKey = null;
  }

  // Initialize with optional encryption
  async initialize(options = {}) {
    if (options.encryption) {
      this.encryptionKey = options.encryptionKey;
    }
    return true;
  }

  // Generate storage key with prefix
  _key(key) {
    return this.prefix + key;
  }

  // Save data to localStorage
  set(key, value, options = {}) {
    try {
      const storageKey = this._key(key);
      let data = value;

      // Handle different data types
      if (typeof value === 'object') {
        data = JSON.stringify(value);
      }

      // Encrypt if enabled
      if (options.encrypt && this.encryptionKey) {
        data = this._encrypt(data);
      }

      localStorage.setItem(storageKey, data);

      // Update cache
      this._setCache(key, value);

      return { success: true };
    } catch (error) {
      console.error('Storage set error:', error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve data from localStorage
  get(key, defaultValue = null) {
    try {
      // Check cache first
      const cached = this._getCache(key);
      if (cached !== undefined) {
        return cached;
      }

      const storageKey = this._key(key);
      let data = localStorage.getItem(storageKey);

      if (data === null) {
        return defaultValue;
      }

      // Decrypt if needed
      if (this._isEncrypted(data)) {
        data = this._decrypt(data);
      }

      // Try to parse JSON
      try {
        data = JSON.parse(data);
      } catch (e) {
        // Return as string if not valid JSON
      }

      // Update cache
      this._setCache(key, data);

      return data;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  // Remove item from storage
  remove(key) {
    try {
      const storageKey = this._key(key);
      localStorage.removeItem(storageKey);
      this._deleteCache(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if key exists
  has(key) {
    return localStorage.getItem(this._key(key)) !== null;
  }

  // Get all keys with prefix
  keys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  // Clear all data with prefix
  clear() {
    const keysToRemove = this.keys();
    for (const key of keysToRemove) {
      this.remove(key);
    }
    this.cache.clear();
    return { success: true, cleared: keysToRemove.length };
  }

  // Get storage size
  size() {
    return this.keys().length;
  }

  // Get storage usage in bytes
  usage() {
    let total = 0;
    for (const key of this.keys()) {
      const value = localStorage.getItem(this._key(key));
      total += key.length + (value ? value.length : 0);
    }
    return total * 2; // Approximate bytes (UTF-16)
  }

  // Cache management
  _setCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  _getCache(key) {
    return this.cache.get(key);
  }

  _deleteCache(key) {
    this.cache.delete(key);
  }

  _clearCache() {
    this.cache.clear();
  }

  // Simple XOR encryption (for basic security)
  _encrypt(text) {
    if (!this.encryptionKey) return text;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
    }
    return 'enc:' + btoa(result);
  }

  _decrypt(text) {
    if (!this.encryptionKey || !text.startsWith('enc:')) return text;
    text = text.slice(4);
    text = atob(text);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
    }
    return result;
  }

  _isEncrypted(text) {
    return typeof text === 'string' && text.startsWith('enc:');
  }

  // Conversation management
  saveConversation(id, messages) {
    const conversations = this.get('conversations', {});
    conversations[id] = {
      messages,
      updated: new Date().toISOString()
    };
    return this.set('conversations', conversations);
  }

  getConversation(id) {
    const conversations = this.get('conversations', {});
    return conversations[id] || null;
  }

  getAllConversations() {
    const conversations = this.get('conversations', {});
    return Object.entries(conversations).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  deleteConversation(id) {
    const conversations = this.get('conversations', {});
    delete conversations[id];
    return this.set('conversations', conversations);
  }

  // Settings management
  saveSettings(settings) {
    return this.set('settings', settings);
  }

  getSettings(defaults = {}) {
    return this.get('settings', defaults);
  }

  updateSetting(key, value) {
    const settings = this.get('settings', {});
    settings[key] = value;
    return this.set('settings', settings);
  }

  // API key management (secure storage)
  saveAPIKey(provider, key) {
    return this.set(`apikey_${provider}`, key, { encrypt: true });
  }

  getAPIKey(provider) {
    return this.get(`apikey_${provider}`);
  }

  deleteAPIKey(provider) {
    return this.remove(`apikey_${provider}`);
  }

  // Export/Import
  exportAll() {
    const data = {};
    for (const key of this.keys()) {
      data[key] = this.get(key);
    }
    return JSON.stringify(data, null, 2);
  }

  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
      }
      return { success: true, imported: Object.keys(data).length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Backup to file
  async backupToFile() {
    const data = this.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    
    try {
      // Use Electron's save dialog
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: `ai_assistant_backup_${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (!result.canceled && result.filePath) {
        // Write file using Node.js fs through main process
        const fs = require('fs');
        fs.writeFileSync(result.filePath, data);
        return { success: true, path: result.filePath };
      }
      return { success: false, error: 'User cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Restore from file
  async restoreFromFile() {
    try {
      const result = await window.electronAPI.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const fs = require('fs');
        const data = fs.readFileSync(result.filePaths[0], 'utf8');
        return this.importAll(data);
      }
      return { success: false, error: 'User cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Session storage (in-memory only)
  sessionSet(key, value) {
    this._setCache(key, value);
  }

  sessionGet(key, defaultValue = null) {
    return this._getCache(key) ?? defaultValue;
  }

  sessionRemove(key) {
    this._deleteCache(key);
  }

  // Watch for changes
  watch(key, callback) {
    const storageKey = this._key(key);
    
    const handler = (event) => {
      if (event.key === storageKey) {
        callback(event.newValue, event.oldValue);
      }
    };

    window.addEventListener('storage', handler);
    
    // Return unsubscribe function
    return () => window.removeEventListener('storage', handler);
  }
}

// Export as singleton
const storageModule = new StorageModule();
export default storageModule;
