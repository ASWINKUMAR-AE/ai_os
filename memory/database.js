// ZetHub Memory & Persistence Database Engine
export class MemoryDatabase {
  constructor() {
    this.storageKeyPrefix = 'zethub_db_';
    this.collections = [
      'settings',
      'memory',
      'projects',
      'tasks',
      'automations',
      'documents',
      'templates',
      'conversations',
      'activity_logs'
    ];
    this.data = {};
    this.init();
  }

  init() {
    for (const col of this.collections) {
      let stored = null;
      if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem(this.storageKeyPrefix + col);
      }
      if (stored) {
        try {
          this.data[col] = JSON.parse(stored);
        } catch (e) {
          this.data[col] = col === 'settings' ? {} : [];
        }
      } else {
        this.data[col] = col === 'settings' ? this.getDefaultSettings() : [];
      }
    }
  }

  getDefaultSettings() {
    return {
      aiProvider: 'hosit',
      hositUrl: 'http://106.51.21.4:8000/api/chat',
      openRouterModel: 'google/gemini-2.0-flash-001',
      voiceSpeed: 1.0,
      voicePitch: 1.0,
      theme: 'dark',
      proactiveAI: true,
      autoConfirmSafeActions: true
    };
  }

  saveCollection(colName) {
    if (this.collections.includes(colName)) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKeyPrefix + colName, JSON.stringify(this.data[colName]));
      }
      if (typeof window !== 'undefined' && window.electronAPI?.saveDocument && colName !== 'conversations') {
        // Asynchronously persist non-sensitive collections to disk
        window.electronAPI.saveDocument({
          title: `db_${colName}.json`,
          content: JSON.stringify(this.data[colName], null, 2),
          format: 'json'
        }).catch(() => {});
      }
    }
  }

  // Generic CRUD operations
  getCollection(colName) {
    return this.data[colName] || [];
  }

  getItem(colName, id) {
    const col = this.getCollection(colName);
    if (Array.isArray(col)) {
      return col.find(item => item.id === id);
    }
    return col[id];
  }

  insert(colName, item) {
    const col = this.getCollection(colName);
    if (!Array.isArray(col)) return null;

    const newItem = {
      id: item.id || `${colName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    };

    col.unshift(newItem);
    this.saveCollection(colName);
    return newItem;
  }

  update(colName, id, updates) {
    const col = this.getCollection(colName);
    if (!Array.isArray(col)) return false;

    const index = col.findIndex(item => item.id === id);
    if (index === -1) return false;

    col[index] = {
      ...col[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveCollection(colName);
    return col[index];
  }

  delete(colName, id) {
    const col = this.getCollection(colName);
    if (!Array.isArray(col)) return false;

    const index = col.findIndex(item => item.id === id);
    if (index === -1) return false;

    col.splice(index, 1);
    this.saveCollection(colName);
    return true;
  }

  clearCollection(colName) {
    if (this.collections.includes(colName)) {
      this.data[colName] = colName === 'settings' ? this.getDefaultSettings() : [];
      this.saveCollection(colName);
    }
  }

  getRecordCountSummary() {
    const counts = {};
    for (const col of this.collections) {
      const val = this.data[col];
      counts[col] = Array.isArray(val) ? val.length : Object.keys(val || {}).length;
    }
    return counts;
  }
}

const memoryDb = new MemoryDatabase();
export default memoryDb;
