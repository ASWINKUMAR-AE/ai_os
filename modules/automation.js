// Automation Module - Task and System Automation
class AutomationModule {
  constructor() {
    this.workflows = new Map();
    this.runningWorkflows = new Set();
    this.activityLog = [];
    this.maxLogEntries = 100;
    this.loadWorkflows();
    this.loadActivityLog();
  }

  // Execute a system command
  async executeCommand(command) {
    const result = await window.electronAPI.executeCommand(command);
    this.logActivity(`Executed command: ${command}`, result.success ? 'success' : 'error');
    return result;
  }

  // Open an application
  async openApp(appName) {
    const result = await window.electronAPI.openApp(appName);
    this.logActivity(`Opened application: ${appName}`, result.success ? 'success' : 'error');
    return { ...result, appName };
  }

  // Create a folder
  async createFolder(folderPath) {
    const result = await window.electronAPI.createFolder(folderPath);
    this.logActivity(`Created folder: ${folderPath}`, result.success ? 'success' : 'error');
    return result;
  }

  // Search for files
  async searchFiles(searchTerm, searchPath) {
    const result = await window.electronAPI.searchFiles(searchTerm, searchPath);
    this.logActivity(`Searched files for: ${searchTerm}`, result.success ? 'success' : 'error');
    return result;
  }

  // System control (shutdown, restart, sleep, lock)
  async systemControl(action) {
    const result = await window.electronAPI.systemControl(action);
    this.logActivity(`System ${action}`, result.success ? 'success' : 'error');
    return result;
  }

  // Open URL in default browser
  async openURL(url) {
    const result = await window.electronAPI.openExternal(url);
    this.logActivity(`Opened URL: ${url}`, result.success ? 'success' : 'error');
    return result;
  }

  // Parse and execute natural language command
  async parseNaturalCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    // Compound AI Writing commands (e.g., "In Word : write about Iron Man")
    const compoundPatterns = [
      /(?:in|on)\s+(.+?)\s*[:|write|create|about]\s+(.+)$/i,
      /write\s+(?:about\s+)?(.+?)\s+in\s+(.+)$/i
    ];

    for (const pattern of compoundPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        let appName, instruction;
        if (pattern.source.startsWith('(?:in|on)')) {
          appName = match[1].trim();
          instruction = match[2].trim();
        } else {
          instruction = match[1].trim();
          appName = match[2].trim();
        }
        return { success: true, type: 'COMPOUND_AI', appName, instruction };
      }
    }

    // Open app commands - improved to handle multi-word names
    const openPatterns = [
      /open\s+(.+?)(?:\s+please)?$/i,
      /launch\s+(.+?)(?:\s+please)?$/i,
      /start\s+(.+?)(?:\s+please)?$/i
    ];

    for (const pattern of openPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const appName = match[1].trim();
        return await this.openApp(appName);
      }
    }

    // Create folder commands
    const folderPatterns = [
      /create\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["']?(.+?)["']?$/i,
      /make\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["']?(.+?)["']?$/i,
      /new\s+folder\s+["']?(.+?)["']?/i
    ];

    for (const pattern of folderPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const folderName = match[1].trim();
        const homeDir = await this.getHomeDirectory();
        const folderPath = `${homeDir}/${folderName}`;
        return await this.createFolder(folderPath);
      }
    }

    // Search commands
    const searchPatterns = [
      /search\s+(?:for\s+)?["']?(.+?)["']?(?:\s+in\s+(.+))?$/i,
      /find\s+(?:files?\s+)?(?:named\s+)?["']?(.+?)["']?/i
    ];

    for (const pattern of searchPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const searchTerm = match[1];
        const searchPath = match[2];
        return await this.searchFiles(searchTerm, searchPath);
      }
    }

    // System control commands
    const systemPatterns = {
      shutdown: /(?:shutdown|turn\s+off|power\s+off)\s+(?:the\s+)?(?:computer|pc|system)?/i,
      restart: /(?:restart|reboot)\s+(?:the\s+)?(?:computer|pc|system)?/i,
      sleep: /(?:sleep|suspend|hibernate)\s+(?:the\s+)?(?:computer|pc|system)?/i,
      lock: /(?:lock|lockdown)\s+(?:the\s+)?(?:computer|pc|screen)?/i
    };

    for (const [action, pattern] of Object.entries(systemPatterns)) {
      if (pattern.test(lowerCommand)) {
        return await this.systemControl(action);
      }
    }

    // URL commands
    const urlPattern = /(?:open|go\s+to|visit)\s+(?:url\s+)?["']?((?:https?:\/\/)?[^\s"']+)/i;
    const urlMatch = lowerCommand.match(urlPattern);
    if (urlMatch) {
      let url = urlMatch[1];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return await this.openURL(url);
    }

    return { 
      success: false, 
      error: 'Command not recognized. Try: open [app], create folder [name], search [term], shutdown, restart, sleep, lock' 
    };
  }

  // Create a workflow
  createWorkflow(name, steps) {
    const workflow = {
      id: Date.now().toString(),
      name,
      steps,
      created: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    };

    this.workflows.set(workflow.id, workflow);
    this.saveWorkflows();
    return workflow;
  }

  // Get all workflows
  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  // Get a specific workflow
  getWorkflow(id) {
    return this.workflows.get(id);
  }

  // Delete a workflow
  deleteWorkflow(id) {
    const deleted = this.workflows.delete(id);
    if (deleted) this.saveWorkflows();
    return deleted;
  }

  // Update a workflow
  updateWorkflow(id, updates) {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    Object.assign(workflow, updates);
    this.saveWorkflows();
    return workflow;
  }

  // Execute a workflow
  async runWorkflow(workflowId, onStep = null) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    this.runningWorkflows.add(workflowId);
    const results = [];

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        if (onStep) {
          onStep({ step: i + 1, total: workflow.steps.length, action: step.action, status: 'running' });
        }

        let result;
        switch (step.type) {
          case 'open_app':
            result = await this.openApp(step.params.app);
            break;
          case 'open_url':
            result = await this.openURL(step.params.url);
            break;
          case 'create_folder':
            result = await this.createFolder(step.params.path);
            break;
          case 'command':
            result = await this.executeCommand(step.params.command);
            break;
          case 'system':
            result = await this.systemControl(step.params.action);
            break;
          case 'search':
            result = await this.searchFiles(step.params.term, step.params.path);
            break;
          case 'delay':
            await this.delay(step.params.ms);
            result = { success: true };
            break;
          case 'notification':
            this.showNotification(step.params.title, step.params.message);
            result = { success: true };
            break;
          default:
            result = { success: false, error: `Unknown step type: ${step.type}` };
        }

        results.push({ step: i + 1, action: step.action, result });

        if (onStep) {
          onStep({ step: i + 1, total: workflow.steps.length, action: step.action, status: result.success ? 'completed' : 'error', result });
        }

        // Stop workflow on error if configured
        if (!result.success && step.stopOnError) {
          break;
        }
      }

      workflow.lastRun = new Date().toISOString();
      workflow.runCount++;
      this.saveWorkflows();
      this.logActivity(`Executed workflow: ${workflow.name}`, 'success');

      return { success: true, results };
    } catch (error) {
      this.logActivity(`Workflow failed: ${workflow.name} - ${error.message}`, 'error');
      return { success: false, error: error.message, results };
    } finally {
      this.runningWorkflows.delete(workflowId);
    }
  }

  // Predefined workflows
  getPresetWorkflows() {
    return [
      {
        name: 'Start Work Mode',
        description: 'Opens essential work applications',
        steps: [
          { type: 'open_app', action: 'Open VS Code', params: { app: 'vscode' } },
          { type: 'open_app', action: 'Open Chrome', params: { app: 'chrome' } },
          { type: 'delay', action: 'Wait 2 seconds', params: { ms: 2000 } },
          { type: 'notification', action: 'Show notification', params: { title: 'Work Mode', message: 'Work environment ready!' } }
        ]
      },
      {
        name: 'Deep Focus',
    description: 'Creates distraction-free environment',
        steps: [
          { type: 'notification', action: 'Focus notification', params: { title: 'Deep Focus', message: 'Starting 25-minute focus session' } },
          { type: 'open_app', action: 'Open music app', params: { app: 'spotify' } },
          { type: 'delay', action: 'Wait 1 second', params: { ms: 1000 } }
        ]
      },
      {
        name: 'End of Day',
        description: 'Closes work and backs up',
        steps: [
          { type: 'notification', action: 'EOD notification', params: { title: 'End of Day', message: 'Wrapping up work session' } },
          { type: 'delay', action: 'Wait 5 seconds', params: { ms: 5000 } },
          { type: 'command', action: 'Backup command', params: { command: 'echo "Backup completed"' } }
        ]
      }
    ];
  }

  // Create workflow from preset
  createFromPreset(presetName) {
    const preset = this.getPresetWorkflows().find(p => p.name === presetName);
    if (preset) {
      return this.createWorkflow(preset.name, preset.steps);
    }
    return null;
  }

  // Helper: Delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper: Show notification
  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  }

  // Get home directory
  async getHomeDirectory() {
    const platform = window.electronAPI.platform;
    if (platform === 'win32') {
      const result = await window.electronAPI.executeCommand('echo %USERPROFILE%');
      return result.output?.trim() || 'C:\\Users\\User';
    } else {
      const result = await window.electronAPI.executeCommand('echo $HOME');
      return result.output?.trim() || '/home/user';
    }
  }

  // Activity logging
  logActivity(action, status = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      status
    };

    this.activityLog.unshift(entry);
    if (this.activityLog.length > this.maxLogEntries) {
      this.activityLog = this.activityLog.slice(0, this.maxLogEntries);
    }

    this.saveActivityLog();
    
    // Also log to main process
    window.electronAPI.logActivity(action);
  }

  getActivityLog(limit = 50) {
    return this.activityLog.slice(0, limit);
  }

  clearActivityLog() {
    this.activityLog = [];
    localStorage.removeItem('automation_activity_log');
  }

  // Persistence
  saveWorkflows() {
    try {
      const data = JSON.stringify(Array.from(this.workflows.entries()));
      localStorage.setItem('automation_workflows', data);
    } catch (e) {
      console.error('Failed to save workflows:', e);
    }
  }

  loadWorkflows() {
    try {
      const saved = localStorage.getItem('automation_workflows');
      if (saved) {
        const entries = JSON.parse(saved);
        this.workflows = new Map(entries);
      }
    } catch (e) {
      console.error('Failed to load workflows:', e);
    }
  }

  saveActivityLog() {
    try {
      localStorage.setItem('automation_activity_log', JSON.stringify(this.activityLog));
    } catch (e) {
      console.error('Failed to save activity log:', e);
    }
  }

  loadActivityLog() {
    try {
      const saved = localStorage.getItem('automation_activity_log');
      if (saved) {
        this.activityLog = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load activity log:', e);
    }
  }
}

// Export as singleton
const automationModule = new AutomationModule();
export default automationModule;
