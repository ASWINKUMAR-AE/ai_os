// ZetHub Project Workspace Manager
import memoryDb from '../memory/database.js';

export class ProjectManager {
  static getProjects() {
    return memoryDb.getCollection('projects');
  }

  static createProject(name, description = '', path = '') {
    const project = {
      name,
      description,
      path: path || `d:\\ai_os\\projects\\${name.toLowerCase().replace(/\s+/g, '_')}`,
      status: 'active',
      files: [],
      notes: [],
      tasks: [],
      documents: [],
      automations: [],
      aiContext: `Project: ${name}. ${description}`
    };
    return memoryDb.insert('projects', project);
  }

  static setActiveProject(projectId) {
    const projects = memoryDb.getCollection('projects');
    for (const p of projects) {
      memoryDb.update('projects', p.id, { isActive: p.id === projectId });
    }
    const active = projects.find(p => p.id === projectId);
    if (active && typeof window !== 'undefined' && window.electronAPI?.logActivity) {
      window.electronAPI.logActivity(`[ProjectManager] Activated project: ${active.name}`);
    }
    return active;
  }

  static resolveActiveProject(context = {}) {
    const projects = memoryDb.getCollection('projects');
    if (projects.length === 0) return null;

    // 1. Explicitly selected active project
    const activeSelected = projects.find(p => p.isActive);
    if (activeSelected) return activeSelected;

    // 2. Matching VS Code or working directory context
    if (context.workingDir) {
      const match = projects.find(p => p.path && context.workingDir.toLowerCase().includes(p.path.toLowerCase()));
      if (match) return match;
    }

    // 3. Fallback to most recently updated project
    return projects[0];
  }

  static addDocumentToProject(projectId, docInfo) {
    const project = memoryDb.getItem('projects', projectId);
    if (!project) return false;

    const documents = Array.isArray(project.documents) ? project.documents : [];
    documents.unshift({
      id: `doc_${Date.now()}`,
      title: docInfo.title || docInfo.filename,
      path: docInfo.path,
      createdAt: new Date().toISOString()
    });

    return memoryDb.update('projects', projectId, { documents });
  }
}

export default ProjectManager;
