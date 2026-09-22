// ZetHub Data Migration Manager
import memoryDb from './database.js';

export class MigrationManager {
  static migrate() {
    const beforeCounts = memoryDb.getRecordCountSummary();
    console.log('[Migration] Starting migration. Pre-migration counts:', beforeCounts);

    let migratedItems = 0;

    // 1. Migrate conversation history
    const oldHistory = typeof localStorage !== 'undefined' ? (localStorage.getItem('ai_assistant_history') || localStorage.getItem('chatHistory')) : null;
    if (oldHistory) {
      try {
        const historyArray = JSON.parse(oldHistory);
        if (Array.isArray(historyArray)) {
          const currentConvs = memoryDb.getCollection('conversations');
          if (currentConvs.length === 0) {
            for (const item of historyArray) {
              memoryDb.insert('conversations', {
                role: item.role || (item.user ? 'user' : 'assistant'),
                content: item.content || item.text || '',
                timestamp: item.timestamp || new Date().toISOString()
              });
              migratedItems++;
            }
          }
        }
      } catch (e) {
        console.warn('[Migration] Error migrating old history:', e.message);
      }
    }

    // 2. Migrate custom workflows
    const oldWorkflows = typeof localStorage !== 'undefined' ? (localStorage.getItem('ai_assistant_workflows') || localStorage.getItem('customWorkflows')) : null;
    if (oldWorkflows) {
      try {
        const wfList = JSON.parse(oldWorkflows);
        if (Array.isArray(wfList)) {
          const currentWfs = memoryDb.getCollection('automations');
          for (const wf of wfList) {
            if (!currentWfs.some(w => w.name === wf.name)) {
              memoryDb.insert('automations', wf);
              migratedItems++;
            }
          }
        }
      } catch (e) {}
    }

    // 3. Migrate user preferences
    const oldSettings = typeof localStorage !== 'undefined' ? localStorage.getItem('ai_assistant_settings') : null;
    if (oldSettings) {
      try {
        const parsed = JSON.parse(oldSettings);
        const currentSettings = memoryDb.getCollection('settings');
        memoryDb.data.settings = { ...currentSettings, ...parsed };
        memoryDb.saveCollection('settings');
      } catch (e) {}
    }

    const afterCounts = memoryDb.getRecordCountSummary();
    console.log(`[Migration] Completed successfully. Migrated ${migratedItems} records. Post-migration counts:`, afterCounts);

    return {
      success: true,
      migratedItems,
      beforeCounts,
      afterCounts
    };
  }
}

export default MigrationManager;
