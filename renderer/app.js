// Main App - Renderer Process
import aiModule from '../ai_modules/ai.js';
import voiceModule from '../ai_modules/voice.js';
import commandEngine from '../ai_modules/commands.js';
import automationModule from '../modules/automation.js';
import storageModule from '../modules/storage.js';
import memoryDb from '../memory/database.js';
import MigrationManager from '../memory/migration.js';
import ProjectManager from '../projects/manager.js';
import TaskManager from '../tasks/manager.js';
import taskEngine from '../automation/engine.js';

// App State
const state = {
  currentView: 'chat',  // Start with chat view
  isGenerating: false,
  voiceEnabled: true,
  autoTTS: false,
  activeApps: [],       // Track opened applications
  linkedApp: null,      // App currently connected to chat input
  currentWriterType: 'blog',
  conversations: new Map()
};

// Utility Functions
function showToast(title, message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global handler for opening files from search results
window.openFile = async (path) => {
  try {
    showToast('Opening', `Launching ${path.split('\\').pop().split('/').pop()}...`, 'info');
    const result = await window.electronAPI.openPath(path);
    if (!result.success) {
      showToast('Error', `Could not open file: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast('Error', `System error: ${error.message}`, 'error');
  }
};

// Active Apps Management
function renderActiveApps() {
  const activeAppsBar = document.getElementById('activeAppsBar');
  if (!activeAppsBar) return;
  
  activeAppsBar.innerHTML = '';
  
    state.activeApps.forEach((app) => {
      const isLinked = state.linkedApp === app;
      const chip = document.createElement('div');
      chip.className = `app-chip ${isLinked ? 'linked' : ''}`;
      
      const icon = `
        <svg class="app-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
        </svg>
      `;
      
      const name = document.createElement('span');
      const displayName = app.charAt(0).toUpperCase() + app.slice(1);
      name.textContent = displayName;
      
      const linkBtn = document.createElement('button');
      linkBtn.className = 'app-chip-link';
      linkBtn.title = isLinked ? 'Disconnect from Chat' : 'Connect Chat to this App';
      linkBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;">
           <path d="M10 13a5 5 0 0 0 7.54.54l3.58-3.58a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
           <path d="M14 11a5 5 0 0 0-7.54-.54l-3.58 3.58a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
        </svg>
      `;
      
      linkBtn.onclick = (e) => {
        e.stopPropagation();
        if (state.linkedApp && state.linkedApp.toLowerCase() === app.toLowerCase()) {
          state.linkedApp = null;
          showToast('Chat Disconnected', `Unlinked from ${displayName}`, 'info');
        } else {
          state.linkedApp = app.toLowerCase();
          showToast('Direct Mode Active', `Chat input will now type directly into ${displayName}`, 'success');
        }
        renderActiveApps();
        updateChatInputStyle();
      };

      const removeBtn = document.createElement('button');
      removeBtn.className = 'app-chip-remove';
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;
      
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        if (state.linkedApp === app) state.linkedApp = null;
        state.activeApps = state.activeApps.filter(a => a !== app);
        renderActiveApps();
        updateChatInputStyle();
      };
      
      chip.onclick = () => {
        window.electronAPI.openApp(app);
        showToast(`Refocusing ${displayName}...`, `Window layout restored.`, 'info');
      };
      
      chip.innerHTML = icon;
      chip.appendChild(name);
      chip.appendChild(linkBtn);
      chip.appendChild(removeBtn);
      activeAppsBar.appendChild(chip);
    });
  }

  function updateChatInputStyle() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    if (state.linkedApp) {
      chatInput.placeholder = `Connected to ${state.linkedApp.charAt(0).toUpperCase() + state.linkedApp.slice(1)} - Type to write directly...`;
      chatInput.classList.add('direct-mode');
    } else {
      chatInput.placeholder = "Type a message or ask for a task...";
      chatInput.classList.remove('direct-mode');
    }
  }

function addActiveApp(appName) {
  const normalized = appName.toLowerCase().trim();
  if (!state.activeApps.includes(normalized)) {
    state.activeApps.push(normalized);
  }
  // Auto-link the most recently opened application
  state.linkedApp = normalized;
  renderActiveApps();
  updateChatInputStyle();
}

// Initialize App
async function startApp() {
  window.switchView = switchView;
  window.sendChatMessage = sendChatMessage;
  window.checkAPIStatus = checkAPIStatus;
  window.showToast = showToast;

  if (window._appInitialized) return;
  window._appInitialized = true;

  await initializeApp();
  setupNavigation();
  setupChatView();
  setupVoiceView();
  setupWriterView();
  setupAutomationView();
  setupWorkflowsView();
  setupWindowControls();
  setupSettingsView();
  setupCommandPalette();
  setupConfirmationModal();
  loadSavedSettings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

async function initializeApp() {
  // Run migration manager to convert legacy stores
  MigrationManager.migrate();

  // Initialize voice module
  voiceModule.initialize();
  
  // Check API status
  checkAPIStatus();
  
  // Load conversation history
  const savedConversation = storageModule.get('current_conversation', []);
  if (savedConversation.length > 0) {
    restoreChatMessages(savedConversation);
  }
}

function setupCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  const suggestions = document.querySelectorAll('#commandPaletteSuggestions .suggestion-item');

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
      if (modal.style.display === 'flex') input.focus();
    } else if (e.key === 'Escape' && modal.style.display === 'flex') {
      modal.style.display = 'none';
    }
  });

  input?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      if (val) {
        modal.style.display = 'none';
        input.value = '';
        switchView('chat');
        sendChatMessage(val);
      }
    }
  });

  suggestions.forEach(item => {
    item.addEventListener('click', () => {
      const cmd = item.dataset.cmd;
      modal.style.display = 'none';
      switchView('chat');
      sendChatMessage(cmd);
    });
  });
}

function setupConfirmationModal() {
  const modal = document.getElementById('confirmationModal');
  const cancelBtn = document.getElementById('cancelConfirmBtn');
  const proceedBtn = document.getElementById('proceedConfirmBtn');

  cancelBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
    if (window._currentActionReject) window._currentActionReject('User cancelled action');
  });

  proceedBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
    if (window._currentActionResolve) window._currentActionResolve(true);
  });
}

async function checkAPIStatus() {
  const statusDot = document.querySelector('#apiStatus .status-dot');
  const statusText = document.querySelector('#apiStatus span:last-child');
  
  if (statusDot && statusText) {
    statusDot.classList.remove('offline');
    statusDot.classList.add('online');
    statusText.textContent = 'API Ready (HOSIT)';
  }
}

// Navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(viewName) {
  let targetView = document.getElementById(`${viewName}View`);
  
  // If target view container does not exist in DOM, safely keep chat view active
  if (!targetView) {
    targetView = document.getElementById('chatView');
    viewName = 'chat';
  }

  state.currentView = viewName;
  
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show selected view
  targetView.classList.add('active');

  // Update active class on sidebar items
  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.dataset.view === viewName) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });
  
  // Special handling for specific views
  if (viewName === 'workflows') {
    loadWorkflows();
  } else if (viewName === 'automation') {
    loadActivityLog();
  }
}

// Chat View
function setupChatView() {
  const chatInput = document.getElementById('chatInput');
  const chatInputContainer = document.getElementById('chatInputContainer'); // Need to check if this exists or use a parent
  const sendBtn = document.getElementById('sendBtn');
  const chatVoiceBtn = document.getElementById('chatVoiceBtn');
  const clearChat = document.getElementById('clearChat');
  const exportChat = document.getElementById('exportChat');
  
  // Send message
  sendBtn.addEventListener('click', () => sendChatMessage());
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
  });
  
  // Voice input
  chatVoiceBtn.addEventListener('click', () => {
    toggleChatVoiceInput();
  });
  
  // Clear chat
  clearChat.addEventListener('click', () => {
    if (confirm('Clear all chat messages?')) {
      document.getElementById('chatMessages').innerHTML = `
        <div class="welcome-message">
          <h3>Chat Cleared</h3>
          <p>Start a new conversation!</p>
        </div>
      `;
      aiModule.clearHistory();
      storageModule.remove('current_conversation');
    }
  });
  
  // Export chat
  exportChat.addEventListener('click', () => {
    exportChatHistory();
  });
}

async function sendChatMessage(message = null) {
  const chatInput = document.getElementById('chatInput');
  const text = message || chatInput.value.trim();
  
  if (!text || state.isGenerating) return;
  
  // Add user message
  addMessageToChat('user', text);
  
  // Clear input
  if (!message) {
    chatInput.value = '';
    chatInput.style.height = 'auto';
  }
  
  // Show typing indicator
  document.getElementById('typingIndicator').classList.add('active');
  state.isGenerating = true;
  
  try {
    // 1. Fast Command Rule - If starts with "/", do NOT process with AI
    if (text.startsWith('/')) {
      const command = await commandEngine.process(text.slice(1));
      let response;
      
      switch (command.route) {
        case 'TASK': response = await handleTaskCommand(command); break;
        case 'AUTOMATION': response = await handleAutomationCommand(command); break;
        case 'WRITING': response = await handleWritingCommand(command); break;
        default: response = { content: "Unknown or unsupported fast command." }; break;
      }
      
      if (response && response.content) {
        addMessageToChat('assistant', response.content);
      }
      return;
    }

    // 2. Unified AI Processing (Core Objective)
    const context = {
      currentTime: new Date().toLocaleString(),
      platform: window.electronAPI.platform || 'windows',
      activeApps: state.activeApps,
      linkedApp: state.linkedApp
    };
    const result = await aiModule.processUnifiedInput(text, context);
    
    // Check if AI returned an error
    if (result.error) {
      addMessageToChat('assistant', `❌ AI Processing Error: ${result.error}`);
      return;
    }

    // Show the AI's natural language response first
    if (result.response) {
      addMessageToChat('assistant', result.response);
    }

    // Execute System Actions if they exist and confidence is high
    if (result.actions && result.actions.length > 0 && result.confidence >= 0.75) {
      const summary = await executeUnifiedActions(result.actions);
      if (summary) {
        addMessageToChat('system', summary);
      }
    } else if (state.linkedApp && (result.type === 'content' || result.type === 'writing' || text.toLowerCase().includes('write'))) {
      // Fallback: If AI didn't return an action but we are in Direct Mode and intent is writing
      // Prioritize structured content, but if we only have response, ensure it's not a status message
      const contentToPush = result.content || result.response;
      
      // Safety filter: Don't push if it looks like a status message (e.g. "Writing...", "Generating...")
      const isStatusMessage = contentToPush && typeof contentToPush === 'string' && 
                             (contentToPush.toLowerCase().includes('writing about') || 
                              contentToPush.toLowerCase().includes('generating content') ||
                              contentToPush.length < 50); // Real content is usually longer

      // Only push if it's NOT a raw JSON string (protection against failed parsing)
      if (contentToPush && typeof contentToPush === 'string' && !contentToPush.trim().startsWith('{') && !isStatusMessage) {
        showToast('Direct Mode', `Pushing content to ${state.linkedApp}...`, 'info');
        await window.electronAPI.pasteToApp(state.linkedApp, contentToPush);
        addMessageToChat('system', `✅ Content automatically sent to ${state.linkedApp}`);
      }
    } else if (result.confidence < 0.75) {
      console.log('Action execution skipped due to low confidence:', result.confidence);
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    addMessageToChat('assistant', `Error: ${error.message}`);
  } finally {
    document.getElementById('typingIndicator').classList.remove('active');
    state.isGenerating = false;
  }
}

async function streamChatResponse(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  messageDiv.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">Assistant</span>
        <span class="message-time">${formatTime(new Date())}</span>
      </div>
      <div class="message-body"><span class="streaming-content"></span></div>
      <div class="message-actions">
        <button class="message-action" onclick="copyMessage(this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
        <button class="message-action" onclick="regenerateMessage(this, '${escapeHtml(text)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Regenerate
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('chatMessages').appendChild(messageDiv);
  scrollToBottom();
  
  const contentSpan = messageDiv.querySelector('.streaming-content');
  let fullContent = '';
  
  try {
    await aiModule.chat(text, (delta, full) => {
      fullContent = full;
      contentSpan.textContent = full;
      scrollToBottom();
    });
    
    // Final render with markdown
    contentSpan.innerHTML = renderMarkdown(fullContent);
    if (typeof hljs !== 'undefined') {
      try {
        hljs.highlightAll();
      } catch (e) {
        console.log('highlight.js not loaded yet');
      }
    }
    
    // Save to conversation history
    saveConversation();
    
    return { content: fullContent };
  } catch (error) {
    contentSpan.textContent = `Error: ${error.message}`;
    throw error;
  }
}

function addMessageToChat(role, content, actions = null) {
  const chatMessages = document.getElementById('chatMessages');
  
  // Remove welcome message if present
  const welcome = chatMessages.querySelector('.welcome-message');
  if (welcome) welcome.remove();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const isUser = role === 'user';
  const avatar = isUser ? 'You' : 'AI';
  const author = isUser ? 'You' : 'Assistant';
  
  // System messages (action results) contain HTML/buttons - render directly
  // User messages are escaped for security
  // Assistant messages go through markdown renderer
  let renderedContent;
  if (role === 'system') {
    renderedContent = content; // Already formatted HTML from executeUnifiedActions
  } else if (isUser) {
    renderedContent = escapeHtml(content);
  } else {
    renderedContent = renderMarkdown(content);
  }
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${author}</span>
        <span class="message-time">${formatTime(new Date())}</span>
      </div>
      <div class="message-body">${renderedContent}</div>
      ${!isUser ? `
        <div class="message-actions">
          <button class="message-action" onclick="copyMessage(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <button class="message-action" onclick="speakMessage(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Speak
          </button>
        </div>
      ` : ''}
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  
    if (!isUser && typeof hljs !== 'undefined') {
      try {
        hljs.highlightAll();
      } catch (e) {
        console.log('highlight.js not loaded yet');
      }
    }
  
  scrollToBottom();
  saveConversation();
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined') {
    let html = marked.parse(text);
    
    // Post-process: Replace [[OPEN:path]] with interactive buttons
    // This bypasses markdown escaping for specific, safe UI actions
    html = html.replace(/\[\[OPEN:(.*?)\]\]/g, (match, path) => {
      return `<button class="btn-search-open" onclick="window.openFile('${path}')">📂 Open File</button>`;
    });
    
    return html;
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveConversation() {
  const messages = [];
  document.querySelectorAll('.message').forEach(msg => {
    const role = msg.classList.contains('user') ? 'user' : 'assistant';
    const content = msg.querySelector('.message-body').textContent;
    messages.push({ role, content });
  });
  
  storageModule.set('current_conversation', messages);
}

function restoreChatMessages(messages) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';
  
  messages.forEach(msg => {
    addMessageToChat(msg.role, msg.content);
  });
}

function exportChatHistory() {
  const messages = storageModule.get('current_conversation', []);
  if (messages.length === 0) {
    showToast('No messages', 'Chat history is empty', 'warning');
    return;
  }
  
  let content = '# AI Assistant Chat History\n\n';
  content += `Date: ${new Date().toLocaleString()}\n\n`;
  content += '---\n\n';
  
  messages.forEach(msg => {
    content += `**${msg.role === 'user' ? 'You' : 'Assistant'}:**\n${msg.content}\n\n`;
  });
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-history-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Exported', 'Chat history downloaded', 'success');
}

async function handleAIAction(aiAction) {
  let responseText = '';
  const { action } = aiAction;

  switch (action) {
    case 'open_app':
      const appName = aiAction.app;
      await window.electronAPI.openApp(appName);
      addActiveApp(appName);
      responseText = `🚀 Opening ${appName}...`;
      break;
      
    case 'write_to_app':
      const targetApp = aiAction.app;
      const content = aiAction.content;
      
      // 1. Open App if not already in activeApps
      if (!state.activeApps.includes(targetApp.toLowerCase().trim())) {
        await window.electronAPI.openApp(targetApp);
        addActiveApp(targetApp);
        // Wait for app to be ready
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // 2. Paste to app
      showToast('AI Task', `Writing to ${targetApp}...`, 'info');
      await window.electronAPI.pasteToApp(targetApp, content);
      responseText = `✅ Generated content and wrote it into ${targetApp}.`;
      break;
      
    case 'create_folder':
      const folderResult = await automationModule.createFolder(aiAction.path);
      responseText = folderResult.success ? `✅ Created folder: ${aiAction.path}` : `❌ Error: ${folderResult.error}`;
      break;

        default:
          responseText = "I understood your request but couldn't execute it.";
      }
      return { content: responseText };
    }
async function executeUnifiedActions(actions) {
  let summaries = [];
  
  // 3. COMMAND (SINGLE SYSTEM ACTION)
  // * openApplication: { "app_name": "chrome" }
  // * createFolder: { "name": "D:/Projects" } (use full paths; MUST be absolute if user specifies a drive/location)
  // * createFile: { "path": "D:/sdf/aswin.txt", "content": "" } (create file; if user says 'on D:/sdf/', use that as the folder; 'content' should be empty string unless specified)
  // * searchFiles: { "term": "search query" }
  // * shutdownPC / restartPC: {}
  
  for (const item of actions) {
    const { action, parameters } = item;
    let success = false;
    let msg = '';

    try {
      switch (action) {
        case 'openApplication': {
          const targetApp = parameters?.app_name || parameters?.appName || parameters?.app || parameters?.application || parameters?.name || (typeof parameters === 'string' ? parameters : 'notepad');
          const appRes = await window.electronAPI.openApp(targetApp);
          success = appRes.success;
          msg = success ? `🚀 Opened ${targetApp}` : `❌ Failed to open ${targetApp}: ${appRes.error}`;
          if (success) addActiveApp(targetApp);
          break;
        }

        case 'writeToApp':
        case 'write_to_app': {
          // Priority: 1. AI specified app (if it's not a default), 2. Linked app, 3. AI specified app (default)
          let targetApp = parameters.app_name || parameters.app;
          const content = parameters.content || parameters.text;
          
          if (state.linkedApp && (!targetApp || targetApp.toLowerCase() === 'word' || targetApp.toLowerCase() === 'notepad')) {
            targetApp = state.linkedApp;
          } else if (!targetApp) {
            targetApp = 'notepad'; // Final default
          }

          if (targetApp && content) {
            if (!state.activeApps.includes(targetApp.toLowerCase().trim())) {
              showToast('Auto-opening', `Opening ${targetApp} for writing...`, 'info');
              await window.electronAPI.openApp(targetApp);
              addActiveApp(targetApp);
              await new Promise(r => setTimeout(r, 4500));
            }
            showToast('AI Writing', `Typing into ${targetApp}...`, 'info');
            const res = await window.electronAPI.pasteToApp(targetApp, content);
            success = res.success;
            msg = success ? `✅ Sent content to ${targetApp}` : `❌ Failed to write to ${targetApp}: ${res.error}`;
          } else {
            msg = `❌ Missing app or content for write action`;
          }
          break;
        }

        case 'createFolder': {
          const folderInput = parameters.name || parameters.path;
          const folderRes = await window.electronAPI.createFolder(folderInput);
          success = folderRes.success;
          msg = success ? `📁 ${folderRes.message}` : `❌ Failed to create folder: ${folderRes.error}`;
          break;
        }

        case 'createFile': {
          const filePath = parameters.path || parameters.name;
          const fileContent = parameters.content || '';
          const fileRes = await window.electronAPI.createFile(filePath, fileContent);
          success = fileRes.success;
          msg = success 
            ? `<div>📄 ${fileRes.message}</div>` 
            : `<div>❌ Failed to create file: ${fileRes.error}</div>`;
          break;
        }

        case 'saveDocument': {
          const docContent = parameters.content || "";
          const saveRes = await window.electronAPI.saveDocument(
            parameters.title || 'Note', 
            docContent, 
            parameters.format || 'txt'
          );
          success = saveRes.success;
          msg = success ? `💾 Document saved successfully` : `❌ Failed to save document: ${saveRes.error}`;
          break;
        }

        case 'shutdownPC':
          await window.electronAPI.systemControl('shutdown');
          msg = '⚙️ Executing system shutdown...';
          break;

        case 'restartPC':
          await window.electronAPI.systemControl('restart');
          msg = '⚙️ Executing system restart...';
          break;

        case 'searchFiles': {
          const searchTerm = parameters.term || parameters.query || parameters.name;
          const searchRes = await window.electronAPI.searchFiles(searchTerm);
          success = searchRes.success;
          if (success && searchRes.results && searchRes.results.length > 0) {
            const total = searchRes.results.length;
            const displayed = searchRes.results.slice(0, 5);
            const rows = displayed.map(f => {
              const fileName = f.path.split('\\').pop().split('/').pop();
              const escapedPath = f.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `<div style="margin:6px 0;padding:8px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
  <div style="overflow:hidden;">
    <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${escapeHtml(fileName)}</div>
    <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.path)}</div>
  </div>
  <button class="btn-search-open" onclick="window.openFile('${escapedPath}')">📂 Open</button>
</div>`;
            }).join('');

            msg = `<div><strong>✅ Found ${total} files matching "${escapeHtml(searchTerm)}":</strong>${total > 5 ? ` <span style="color:var(--text-muted);font-size:12px;">(showing top 5)</span>` : ''}</div>${rows}${total > 5 ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);">...and ${total - 5} more.</div>` : ''}`;
          } else if (success) {
            msg = `<div>🔍 No files found for "${escapeHtml(searchTerm)}".</div>`;
          } else {
            msg = `<div>❌ Search failed: ${escapeHtml(searchRes.error)}</div>`;
          }
          break;
        }

        case 'adjustVolume':
          msg = `🔊 Adjusted volume to ${parameters.level || 'target'}`;
          break;

        default:
          console.warn('Unknown AI action:', action);
          continue;
      }
    } catch (err) {
      msg = `❌ Action error (${action}): ${err.message}`;
    }

    if (msg) summaries.push(msg);
  }

  return summaries.join('\n');
}

// Command Handlers
async function handleTaskCommand(command) {
  const result = await automationModule.parseNaturalCommand(command.input);
  
  let responseText = '';
  if (result.success) {
    if (result.type === 'COMPOUND_AI') {
      const { appName, instruction } = result;
      responseText = `🚀 Opening ${appName} and writing about ${instruction}...`;
      
      // 1. Open App
      await window.electronAPI.openApp(appName);
      addActiveApp(appName);
      
      // 2. Generate Content
      showToast('AI Generating', `Writing content for ${appName}...`, 'info');
      const aiResult = await aiModule.generateContent('blog', instruction, {
        tone: 'professional',
        length: 'medium'
      });
      
      if (aiResult.content) {
        // 3. Paste to App
        showToast('Writing', `Pasting content into ${appName}...`, 'info');
        // Small delay to ensure Word is ready
        setTimeout(async () => {
          await window.electronAPI.pasteToApp(appName, aiResult.content);
        }, 3000);
        
        responseText = `✅ Generated content about "${instruction}" and sent it to ${appName}.`;
      } else {
        responseText = `❌ Failed to generate content: ${aiResult.error}`;
      }
    } else {
      responseText = `✅ ${result.message || 'Task completed successfully'}`;
      
      // Add to Active Apps bar if an app was opened
      if (result.appName) {
        addActiveApp(result.appName);
      }
    }

    if (result.results) {
      responseText += '\n\n**Found:**';
      result.results.slice(0, 5).forEach(file => {
        responseText += `\n- ${file.name}`;
      });
    }
  } else {
    responseText = `❌ ${result.error || 'Failed to execute task'}`;
  }
  
  return { content: responseText };
}

async function handleAutomationCommand(command) {
  const { workflowName } = command.params;
  
  if (workflowName) {
    const workflows = automationModule.getWorkflows();
    const workflow = workflows.find(w => w.name.toLowerCase().includes(workflowName.toLowerCase()));
    
    if (workflow) {
      const result = await automationModule.runWorkflow(workflow.id);
      return {
        content: result.success 
          ? `✅ Workflow "${workflow.name}" executed successfully!\n\nCompleted ${result.results.length} steps.`
          : `❌ Workflow failed: ${result.error}`
      };
    }
  }
  
  return {
    content: `I can help you with workflows. Try:\n- "Start work mode"\n- "Run deep focus workflow"\n- "Create a new workflow"`
  };
}

async function handleWritingCommand(command) {
  const { contentType, topic, tone } = command.params;
  
  if (!topic) {
    return {
      content: 'What would you like me to write about? Please provide a topic or subject.'
    };
  }
  
  const result = await aiModule.generateContent(contentType || 'blog', topic, {
    tone: tone || 'professional',
    length: 'medium'
  });
  
  return { content: result.content || result.error };
}

// Voice Input
function toggleChatVoiceInput() {
  const btn = document.getElementById('chatVoiceBtn');
  
  if (voiceModule.isListening) {
    voiceModule.stopListening();
    btn.classList.remove('listening');
  } else {
    btn.classList.add('listening');
    
    voiceModule.startListening({
      onResult: (result) => {
        const chatInput = document.getElementById('chatInput');
        chatInput.value = result.final || result.interim;
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
        
        if (result.isFinal) {
          btn.classList.remove('listening');
          setTimeout(() => sendChatMessage(), 500);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        btn.classList.remove('listening');
        showToast('Voice Error', error, 'error');
      }
    });
  }
}

// Voice View
function setupVoiceView() {
  const voiceBtn = document.getElementById('voiceBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const voiceWaves = document.querySelector('.voice-waves');
  const interimText = document.getElementById('interimText');
  const finalText = document.getElementById('finalText');
  const speechRate = document.getElementById('speechRate');
  const speechPitch = document.getElementById('speechPitch');
  const voiceLanguage = document.getElementById('voiceLanguage');
  const continuousListening = document.getElementById('continuousListening');

  if (!voiceModule.isSupported) {
    voiceStatus.textContent = 'Voice not supported in this browser';
    voiceBtn.disabled = true;
    return;
  }

  voiceBtn.addEventListener('click', () => {
    if (voiceModule.isListening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  });

  function startVoiceListening() {
    voiceModule.startListening({
      continuous: continuousListening?.checked || false,
      onStart: () => {
        console.log('UI: Recognition active');
        voiceWaves.classList.add('active');
        voiceBtn.style.background = 'var(--accent-danger)';
        voiceStatus.textContent = 'Listening... Speak now';
      },
      onEnd: () => {
        console.log('UI: Recognition inactive');
        voiceWaves.classList.remove('active');
        voiceBtn.style.background = '';
        voiceStatus.textContent = 'Click to start listening';
      },
      onResult: (result) => {
        console.log(`UI: Result received - Interim: "${result.interim}", Final: "${result.final}"`);
        interimText.textContent = result.interim;
        if (result.isFinal) {
          finalText.textContent = result.final;
          interimText.textContent = '';
          processVoiceCommand(result.final);
        }
      },
      onError: (error, value) => {
        console.warn('UI: Voice error event:', error, value);
        
        // Critical errors that should stop the listening process
        const criticalErrors = ['not-allowed', 'service-not-allowed', 'language-not-supported'];
        
        if (criticalErrors.includes(error)) {
          voiceStatus.textContent = `Error: ${error}`;
          stopVoiceListening();
        } else if (error === 'backoff-active') {
          // If we are in backoff, tell the user we are waiting
          const seconds = (value / 1000).toFixed(1);
          voiceStatus.textContent = `Connection Issue - Retrying in ${seconds}s...`;
          voiceWaves.classList.remove('active');
        } else {
          // Provide visual feedback that we are trying to restart
          voiceStatus.textContent = 'Reconnecting...';
          console.log(`UI: Recovery from error "${error}" initiated.`);
        }
      }
    });
  }

  function stopVoiceListening() {
    voiceModule.stopListening();
    // UI updates are now handled by onEnd callback
  }

  // Voice settings

  // Voice settings
  if (speechRate) {
    speechRate.addEventListener('input', (e) => {
      voiceModule.setRate(e.target.value);
      document.getElementById('rateValue').textContent = e.target.value;
    });
  }

  if (speechPitch) {
    speechPitch.addEventListener('input', (e) => {
      voiceModule.setPitch(e.target.value);
      document.getElementById('pitchValue').textContent = e.target.value;
    });
  }

  if (voiceLanguage) {
    voiceLanguage.addEventListener('change', (e) => {
      voiceModule.setLanguage(e.target.value);
    });
  }

  // Auto-start listening if in voice view after a short delay
  if (state.currentView === 'voice') {
    setTimeout(() => {
      // Check again after delay to ensure user hasn't switched views
      if (state.currentView === 'voice') {
        console.log('Auto-starting voice recognition...');
        startVoiceListening();
      }
    }, 1000);
  }
}

async function processVoiceCommand(command) {
  showToast('Voice Command', `Processing: "${command}"`, 'info');
  
  // Send to chat
  await sendChatMessage(command);
}

// Writer View
function setupWriterView() {
  const templateBtns = document.querySelectorAll('.template-btn');
  const generateBtn = document.getElementById('generateBtn');
  const writerVoiceBtn = document.getElementById('writerVoiceBtn');
  const writerOutput = document.getElementById('writerOutput');
  
  // Template selection
  templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      templateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentWriterType = btn.dataset.type;
    });
  });

  // Segmented control handling
  const segmentedControls = document.querySelectorAll('.segmented-control');
  segmentedControls.forEach(control => {
    const segments = control.querySelectorAll('.segment');
    segments.forEach(segment => {
      segment.addEventListener('click', () => {
        segments.forEach(s => s.classList.remove('active'));
        segment.classList.add('active');
      });
    });
  });


  
  // Generate content
  generateBtn.addEventListener('click', async () => {
    const prompt = document.getElementById('writerPrompt').value.trim();
    if (!prompt) {
      showToast('Empty Prompt', 'Please enter a topic or description', 'warning');
      return;
    }
    
    // Get tone and length from segmented controls
    const toneActive = document.querySelector('#toneSelector .segment.active');
    const lengthActive = document.querySelector('#lengthSelector .segment.active');
    
    const tone = toneActive ? toneActive.dataset.value : 'professional';
    const length = lengthActive ? lengthActive.dataset.value : 'medium';
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Generating...
    `;
    
    try {
      const result = await aiModule.generateContent(state.currentWriterType, prompt, {
        tone,
        length
      });
      
      writerOutput.innerHTML = formatWriterResult(state.currentWriterType, result.content);

      showToast('Success', 'Content generated successfully', 'success');
      
    } catch (error) {
      showToast('Error', error.message, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Generate
      `;
    }
  });
  
  // Voice input
  writerVoiceBtn.addEventListener('click', () => {
    if (voiceModule.isListening) {
      voiceModule.stopListening();
      writerVoiceBtn.classList.remove('listening');
    } else {
      writerVoiceBtn.classList.add('listening');
      voiceModule.startListening({
        onResult: (result) => {
          document.getElementById('writerPrompt').value = result.final || result.interim;
          if (result.isFinal) {
            writerVoiceBtn.classList.remove('listening');
          }
        }
      });
    }
  });
}

function formatWriterResult(type, content) {
  const firstLine = content.split('\n')[0].replace(/[#*]/g, '').trim();
  const body = content.split('\n').slice(1).join('\n').trim() || content;
  
  const actionsHtml = `
    <div class="content-footer-actions">
      <button class="btn-secondary" onclick="copyWriterContent()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
      <button class="btn-secondary" onclick="downloadWriterContent()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>
  `;


  if (type === 'email') {
    return `
      <div class="generated-content-wrapper">
        <div class="writer-format-email">
          <div class="email-header">
            <div class="email-field"><label>From:</label><span>AI Assistant</span></div>
            <div class="email-field"><label>To:</label><span>[Recipient]</span></div>
            <div class="email-field"><label>Subject:</label><span>${firstLine}</span></div>
          </div>
          <div class="email-body content-body">${renderMarkdown(body)}</div>
        </div>
        ${actionsHtml}
      </div>
    `;
  } else if (type === 'code') {
    const lang = firstLine.toLowerCase() || 'javascript';
    return `
      <div class="generated-content-wrapper">
        <div class="writer-format-code">
          <div class="code-window-header">
            <div class="code-tab">
              <svg class="code-tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M2 13.5V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V13.5" />
                <path d="M20 4H10.5L8.5 2H4C2.9 2 2 2.9 2 4V13.5H22V6C22 4.9 21.1 4 20 4Z" />
              </svg>
              <span>generated_script.${lang === 'python' ? 'py' : (lang === 'html' ? 'html' : 'js')}</span>
            </div>
          </div>
          <div class="code-content content-body">
            <pre><code class="language-${lang}">${escapeHtml(content)}</code></pre>
          </div>
        </div>
        ${actionsHtml}
      </div>
    `;
  } else {
    return `
      <div class="generated-content-wrapper">
        <div class="writer-format-standard">
          <div class="doc-title">${firstLine}</div>
          <div class="doc-body content-body">${renderMarkdown(body)}</div>
        </div>
        ${actionsHtml}
      </div>
    `;
  }
}


// Automation View
function setupAutomationView() {
  const automationInput = document.getElementById('automationInput');
  const executeCommand = document.getElementById('executeCommand');
  const quickBtns = document.querySelectorAll('.quick-btn');
  
  executeCommand.addEventListener('click', async () => {
    const command = automationInput.value.trim();
    if (!command) return;
    
    await executeAutomationCommand(command);
    automationInput.value = '';
  });
  
  automationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand.click();
    }
  });
  
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      executeAutomationCommand(cmd);
    });
  });
}

async function executeAutomationCommand(command) {
  const result = await automationModule.parseNaturalCommand(command);
  
  if (result.success) {
    showToast('Success', result.message || 'Command executed', 'success');
  } else {
    showToast('Error', result.error || 'Command failed', 'error');
  }
  
  loadActivityLog();
}

function loadActivityLog() {
  const log = automationModule.getActivityLog(20);
  const container = document.getElementById('activityLog');
  
  if (log.length === 0) {
    container.innerHTML = '<p class="log-placeholder">No recent activity</p>';
    return;
  }
  
  container.innerHTML = log.map(item => `
    <div class="activity-item">
      <div class="activity-status ${item.status}"></div>
      <div class="activity-content">${item.action}</div>
      <div class="activity-time">${formatTime(new Date(item.timestamp))}</div>
    </div>
  `).join('');
}

// Workflows View
function setupWorkflowsView() {
  const createWorkflow = document.getElementById('createWorkflow');
  
  createWorkflow.addEventListener('click', () => {
    showWorkflowBuilder();
  });
}

function loadWorkflows() {
  // Load preset workflows
  const presets = automationModule.getPresetWorkflows();
  const presetContainer = document.getElementById('presetWorkflows');
  
  presetContainer.innerHTML = presets.map(preset => `
    <div class="workflow-card">
      <h5>${preset.name}</h5>
      <p>${preset.description}</p>
      <div class="workflow-steps">${preset.steps.length} steps</div>
      <div class="workflow-actions">
        <button class="btn-primary" onclick="createPresetWorkflow('${preset.name}')">Create</button>
        <button class="btn-secondary" onclick="runPresetWorkflow('${preset.name}')">Run</button>
      </div>
    </div>
  `).join('');
  
  // Load custom workflows
  const customWorkflows = automationModule.getWorkflows();
  const customContainer = document.getElementById('customWorkflows');
  
  if (customWorkflows.length === 0) {
    customContainer.innerHTML = '<p class="empty-state">No custom workflows yet. Create one to get started!</p>';
  } else {
    customContainer.innerHTML = customWorkflows.map(wf => `
      <div class="workflow-card">
        <h5>${wf.name}</h5>
        <p>Created: ${new Date(wf.created).toLocaleDateString()}</p>
        <div class="workflow-steps">${wf.steps.length} steps • Run ${wf.runCount} times</div>
        <div class="workflow-actions">
          <button class="btn-primary" onclick="runWorkflow('${wf.id}')">Run</button>
          <button class="btn-secondary" onclick="editWorkflow('${wf.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteWorkflow('${wf.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }
}

function showWorkflowBuilder() {
  // Simplified workflow creation
  const name = prompt('Enter workflow name:');
  if (!name) return;
  
  const workflow = automationModule.createWorkflow(name, [
    { type: 'notification', action: 'Start workflow', params: { title: name, message: 'Workflow started!' } }
  ]);
  
  showToast('Created', `Workflow "${name}" created`, 'success');
  loadWorkflows();
}

// Settings View
function setupSettingsView() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKey = document.getElementById('saveApiKey');
  const aiModel = document.getElementById('aiModel');
  const themeSelect = document.getElementById('themeSelect');
  const fontSize = document.getElementById('fontSize');
  const ttsEnabled = document.getElementById('ttsEnabled');
  const autoTTS = document.getElementById('autoTTS');
  const exportData = document.getElementById('exportData');
  const importData = document.getElementById('importData');
  const clearData = document.getElementById('clearData');
  const openrouterLink = document.getElementById('openrouterLink');
  
  // Load saved API key (masked)
  try {
    const key = storageModule.get('api_key_openrouter', '');
    if (key && apiKeyInput) {
      apiKeyInput.value = key;
    }
  } catch (e) {}
  
  saveApiKey?.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      storageModule.set('api_key_openrouter', key);
      showToast('Saved', 'API key saved securely', 'success');
      checkAPIStatus();
    }
  });
  
  aiModel.addEventListener('change', () => {
    storageModule.updateSetting('aiModel', aiModel.value);
    aiModule.model = aiModel.value;
  });
  
  themeSelect.addEventListener('change', () => {
    storageModule.updateSetting('theme', themeSelect.value);
    applyTheme(themeSelect.value);
  });
  
  fontSize.addEventListener('change', () => {
    storageModule.updateSetting('fontSize', fontSize.value);
    applyFontSize(fontSize.value);
  });
  
  ttsEnabled.addEventListener('change', () => {
    state.voiceEnabled = ttsEnabled.checked;
    storageModule.updateSetting('ttsEnabled', ttsEnabled.checked);
  });
  
  autoTTS.addEventListener('change', () => {
    state.autoTTS = autoTTS.checked;
    storageModule.updateSetting('autoTTS', autoTTS.checked);
  });
  
  exportData.addEventListener('click', async () => {
    const result = await storageModule.backupToFile();
    if (result.success) {
      showToast('Exported', 'Data exported successfully', 'success');
    } else {
      showToast('Error', result.error, 'error');
    }
  });
  
  importData.addEventListener('click', async () => {
    const result = await storageModule.restoreFromFile();
    if (result.success) {
      showToast('Imported', `Imported ${result.imported} items`, 'success');
      loadSavedSettings();
    } else {
      showToast('Error', result.error, 'error');
    }
  });
  
  clearData.addEventListener('click', () => {
    if (confirm('This will delete ALL saved data. Are you sure?')) {
      storageModule.clear();
      localStorage.clear();
      showToast('Cleared', 'All data has been cleared', 'warning');
    }
  });
  
  openrouterLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal('https://openrouter.ai/keys');
  });
}

function loadSavedSettings() {
  const settings = storageModule.getSettings({
    aiModel: 'google/gemini-2.0-flash-001',
    theme: 'dark',
    fontSize: 'medium',
    ttsEnabled: true,
    autoTTS: false
  });
  
  document.getElementById('aiModel').value = settings.aiModel;
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('ttsEnabled').checked = settings.ttsEnabled;
  document.getElementById('autoTTS').checked = settings.autoTTS;
  
  state.voiceEnabled = settings.ttsEnabled;
  state.autoTTS = settings.autoTTS;
  aiModule.model = settings.aiModel;
  
  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);
}

function applyTheme(theme) {
  // Theme switching logic would go here
  // For now, we keep the default dark theme
}

function applyFontSize(size) {
  const sizes = {
    small: '13px',
    medium: '14px',
    large: '16px'
  };
  document.body.style.fontSize = sizes[size];
}

// Global functions for HTML onclick handlers
window.copyMessage = function(button) {
  const content = button.closest('.message-content').querySelector('.message-body').textContent;
  navigator.clipboard.writeText(content);
  showToast('Copied', 'Message copied to clipboard', 'success');
};

window.speakMessage = function(button) {
  const content = button.closest('.message-content').querySelector('.message-body').textContent;
  const result = voiceModule.speak(content);
  if (result.error) {
    showToast('Voice Error', result.error, 'error');
  } else {
    showToast('Speaking', 'Reading message aloud...', 'info', 2000);
  }
};

window.regenerateMessage = async function(button, originalMessage) {
  // Remove current message and regenerate
  const message = button.closest('.message');
  message.remove();
  
  // Show typing indicator
  document.getElementById('typingIndicator').classList.add('active');
  state.isGenerating = true;
  
  try {
    await streamChatResponse(originalMessage);
  } finally {
    document.getElementById('typingIndicator').classList.remove('active');
    state.isGenerating = false;
  }
};

window.copyWriterContent = function() {
  const container = document.querySelector('.content-body');
  if (!container) return;
  const content = container.textContent;
  navigator.clipboard.writeText(content);
  showToast('Copied', 'Content copied to clipboard', 'success');
};

window.downloadWriterContent = function() {
  const container = document.querySelector('.content-body');
  if (!container) return;
  const content = container.textContent;
  const type = state.currentWriterType;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-content-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

window.createPresetWorkflow = function(presetName) {
  const workflow = automationModule.createFromPreset(presetName);
  if (workflow) {
    showToast('Created', `Workflow "${presetName}" created from preset`, 'success');
    loadWorkflows();
  }
};

window.runPresetWorkflow = async function(presetName) {
  const workflows = automationModule.getWorkflows();
  const workflow = workflows.find(w => w.name === presetName);
  
  if (workflow) {
    showToast('Running', `Executing "${presetName}"...`, 'info');
    const result = await automationModule.runWorkflow(workflow.id, (step) => {
      console.log('Step:', step);
    });
    
    if (result.success) {
      showToast('Success', `Workflow completed with ${result.results.length} steps`, 'success');
    } else {
      showToast('Error', result.error, 'error');
    }
    
    loadWorkflows();
  }
};

window.runWorkflow = async function(workflowId) {
  showToast('Running', 'Executing workflow...', 'info');
  const result = await automationModule.runWorkflow(workflowId);
  
  if (result.success) {
    showToast('Success', 'Workflow completed successfully', 'success');
  } else {
    showToast('Error', result.error, 'error');
  }
  
  loadWorkflows();
};

window.editWorkflow = function(workflowId) {
  // Simple edit - would expand to full builder in production
  const workflow = automationModule.getWorkflow(workflowId);
  const newName = prompt('Edit workflow name:', workflow.name);
  if (newName && newName !== workflow.name) {
    automationModule.updateWorkflow(workflowId, { name: newName });
    showToast('Updated', 'Workflow name updated', 'success');
    loadWorkflows();
  }
};

window.deleteWorkflow = function(workflowId) {
  if (confirm('Delete this workflow?')) {
    automationModule.deleteWorkflow(workflowId);
    showToast('Deleted', 'Workflow deleted', 'warning');
    loadWorkflows();
  }
};

// Window Control Handlers
function setupWindowControls() {
  const closeBtn = document.getElementById('closeBtn');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const maximizeBtn = document.getElementById('maximizeBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.electronAPI.windowClose();
    });
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      window.electronAPI.windowMinimize();
    });
  }

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      window.electronAPI.windowMaximize();
    });
  }
}

// Global Command Palette Shortcut (Ctrl + Space)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code === 'Space') {
    e.preventDefault();
    const modal = document.getElementById('commandPaletteModal');
    if (modal) {
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
      if (modal.style.display === 'flex') {
        document.getElementById('commandPaletteInput')?.focus();
      }
    }
  }
});

// Expose state for debugging
window.aiAssistantState = state;

