// ZetHub Memory Center Manager
import memoryDb from './database.js';

export class MemoryManager {
  static getMemoryContext() {
    const memoryItems = memoryDb.getCollection('memory');
    const preferences = memoryDb.getCollection('settings');
    const recentProjects = memoryDb.getCollection('projects').slice(0, 5);
    const recentTasks = memoryDb.getCollection('tasks').slice(0, 5);

    let contextSummary = `USER PREFERENCES & MEMORY:\n`;
    if (memoryItems.length > 0) {
      contextSummary += memoryItems.map(m => `- ${m.key}: ${m.value}`).join('\n') + '\n';
    }
    if (recentProjects.length > 0) {
      contextSummary += `RECENT PROJECTS: ${recentProjects.map(p => p.name).join(', ')}\n`;
    }
    if (recentTasks.length > 0) {
      contextSummary += `ACTIVE TASKS: ${recentTasks.map(t => t.title).join(', ')}\n`;
    }

    return contextSummary;
  }

  static remember(key, value, category = 'user_preference') {
    const memoryCol = memoryDb.getCollection('memory');
    const existing = memoryCol.find(m => m.key.toLowerCase() === key.toLowerCase());
    if (existing) {
      return memoryDb.update('memory', existing.id, { value, category });
    } else {
      return memoryDb.insert('memory', { key, value, category });
    }
  }

  static forget(keyOrId) {
    const memoryCol = memoryDb.getCollection('memory');
    const item = memoryCol.find(m => m.id === keyOrId || m.key.toLowerCase() === keyOrId.toLowerCase());
    if (item) {
      return memoryDb.delete('memory', item.id);
    }
    return false;
  }

  static clearAllMemory() {
    memoryDb.clearCollection('memory');
    return true;
  }

  static getMemoryDetails() {
    return {
      preferences: memoryDb.getCollection('settings'),
      memoryItems: memoryDb.getCollection('memory'),
      projects: memoryDb.getCollection('projects'),
      automations: memoryDb.getCollection('automations'),
      tasks: memoryDb.getCollection('tasks')
    };
  }
}

export default MemoryManager;
