import aiRouter from '../utils/ai-router.js';
import aiOrchestrator from './orchestrator.js';

// AI Module - OpenRouter API Integration
class AIModule {
  constructor() {
    this.apiKey = null;
    this.model = 'google/gemini-2.0-flash-001';
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.conversationHistory = [];
    this.maxHistory = 50;
    
    // Base prompt template which will be made dynamic
    this.BASE_PROMPT = `You are an AI Desktop Assistant. Your job is to intelligently convert user input into natural conversation, high-quality generated content, or system commands.

---
🎯 CURRENT CONTEXT:
* Current Time: {{TIME}}
* Platform: {{PLATFORM}}
* Active Applications: {{ACTIVE_APPS}}
* Linked Application (Direct Mode): {{LINKED_APP}}

---
📦 OUTPUT FORMAT (STRICT JSON ONLY when action required):
{
  "type": "chat | content | command | workflow",
  "intent": "e.g. write_content, open_app",
  "confidence": 0.0,
  "response": "Brief natural status (e.g. 'Writing your story...')",
  "actions": [
    {
      "action": "openApplication | writeToApp | createFolder | createFile | searchFiles",
      "parameters": {}
    }
  ]
}

---
🧠 CRITICAL RULES FOR CONTENT GENERATION:
1. DEEP WRITING: When asked to "write about", "create a blog", "write a story", etc., you MUST generate the FULL, high-quality text. 
2. ACTION PARAMETERS: For 'writeToApp' actions, the 'content' parameter MUST be the entire generated body of text. DO NOT put status messages like "Writing about..." in the content field.
3. RESPONSE FIELD: Put the short status message (e.g. "I've written your article about Spider-Man.") in the "response" field, NOT in the "actions[0].parameters.content".
4. DIRECT MODE: If "Linked Application" is not "None", ALWAYS prioritize using that app for 'writeToApp' actions.

---
3. COMMAND (SINGLE SYSTEM ACTION)
* openApplication: { "app_name": "chrome" }
* writeToApp: { "app_name": "notepad", "content": "FULL GENERATED CONTENT HERE" }
* createFolder: { "name": "path" }
* createFile: { "path": "path", "content": "content" }
* searchFiles: { "term": "term" }

---
🎯 FINAL BEHAVIOR:
Respond with ONLY the JSON object if actions are required. Be verbose and creative in the 'content' field for all writing tasks.`;
  }

  async initialize() {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getEnv) {
      this.apiKey = await window.electronAPI.getEnv('OPENROUTER_API_KEY');
    }
    await aiRouter.initialize();
    this.loadHistory();
  }

  async orchestrate(message, context = {}) {
    return await aiOrchestrator.processRequest(message, context);
  }

  // Main chat function with streaming support
  async chat(message, onStream = null, systemPrompt = null) {
    if (!aiRouter.initialized) {
      await this.initialize();
    }

    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history
    messages.push(...this.conversationHistory.slice(-10));

    // Add current message
    messages.push({ role: 'user', content: message });

    try {
      if (onStream) {
        return await this.streamChat(messages, onStream);
      } else {
        return await this.regularChat(messages);
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      return { error: error.message };
    }
  }

  // Regular non-streaming chat using provider router
  async regularChat(messages) {
    const result = await aiRouter.chat(messages);
    const content = result.content;

    // Save to history
    const userMsg = Array.isArray(messages) ? messages[messages.length - 1].content : messages;
    this.addToHistory(userMsg, content);

    return { content, data: result.raw };
  }

  // Streaming chat using provider router
  async streamChat(messages, onStream) {
    const result = await aiRouter.stream(messages, onStream);
    const userMsg = Array.isArray(messages) ? messages[messages.length - 1].content : messages;
    this.addToHistory(userMsg, result.content);

    return { content: result.content };
  }

  // Add message pair to history
  addToHistory(userMessage, aiResponse) {
    this.conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: aiResponse }
    );

    // Trim history if too long
    if (this.conversationHistory.length > this.maxHistory * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory * 2);
    }

    this.saveHistory();
  }

  // Save history to localStorage
  saveHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
      }
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  // Load history from localStorage
  loadHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('ai_conversation_history');
        if (saved) {
          this.conversationHistory = JSON.parse(saved);
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ai_conversation_history');
    }
  }

  // Get conversation history
  getHistory() {
    return this.conversationHistory;
  }

  // Content generation with specific templates
  async generateContent(type, prompt, options = {}) {
    const templates = {
      blog: `Write a blog post about: ${prompt}\n\nTone: ${options.tone || 'professional'}\nTarget audience: ${options.audience || 'general'}\nWord count: ${options.length || '500-800'}`,
      
      code: `Generate code for: ${prompt}\n\nLanguage: ${options.language || 'JavaScript'}\nInclude comments: ${options.comments !== false ? 'Yes' : 'No'}\nStyle: ${options.style || 'clean and efficient'}`,
      
      email: `Write an email about: ${prompt}\n\nTone: ${options.tone || 'professional'}\nRecipient: ${options.recipient || 'colleague'}\nPurpose: ${options.purpose || 'information'}`,
      
      social: `Create social media content about: ${prompt}\n\nPlatform: ${options.platform || 'general'}\nTone: ${options.tone || 'engaging'}\nInclude hashtags: ${options.hashtags !== false ? 'Yes' : 'No'}`,
      
      resume: `Generate a resume section for: ${prompt}\n\nStyle: ${options.style || 'professional'}\nIndustry: ${options.industry || 'general'}\nExperience level: ${options.experience || 'mid-level'}`,
      
      message: `Generate a message reply for: ${prompt}\n\nContext: ${options.context || 'casual conversation'}\nTone: ${options.tone || 'friendly'}\nLength: ${options.length || 'medium'}`
    };

    const fullPrompt = templates[type] || prompt;
    return await this.chat(fullPrompt);
  }

  // Intent detection for smart routing
  async detectIntent(message) {
    const intentPrompt = `Analyze the following user message and classify it into ONE of these categories:
- CHAT: General conversation, questions, advice
- TASK: System commands (open apps, create files, search)
- AUTOMATION: Complex workflows or sequences
- WRITING: Content creation (blog, email, code, etc.)
- MESSAGE: Message/email reply generation

User message: "${message}"

Respond with ONLY the category name.`;

    try {
      const result = await this.chat(intentPrompt, null, 'You are an intent classifier. Respond with only the category name.');
      const intent = result.content?.trim().toUpperCase() || 'CHAT';
      return intent.includes('TASK') ? 'TASK' : 
             intent.includes('AUTOMATION') ? 'AUTOMATION' :
             intent.includes('WRITING') ? 'WRITING' :
             intent.includes('MESSAGE') ? 'MESSAGE' : 'CHAT';
    } catch (error) {
      return 'CHAT';
    }
  }

  // Extract structured system actions from natural language
  async extractAction(message, activeApps = []) {
    const prompt = `Based on the user's message and the current "Active Apps", decide if I should perform a system action.
    
Current Active Apps: ${activeApps.join(', ')}

Possible Actions:
- open_app: { "action": "open_app", "app": "name" }
- write_to_app: { "action": "write_to_app", "app": "name", "content": "..." }
- search_files: { "action": "search_files", "term": "..." }
- create_folder: { "action": "create_folder", "path": "..." }
- none: { "action": "none" }

Rules:
1. If an app is already open and the user says "write", "generate", or "create content", assume the target is the active app.
2. If multiple apps are open, pick the most relevant one (Word/Notepad for text, Chrome for web).
3. If no app is open and the user says "write", default to "word".
4. Respond ONLY with valid JSON. No conversation.

User Message: "${message}"`;

    const instructions = "You are a system action extractor. Respond only with JSON.";
    
    try {
      const result = await this.chat(prompt, null, instructions);
      const jsonStr = result.content?.trim() || '{"action": "none"}';
      // Strip markdown code blocks if AI included them
      const cleanJson = jsonStr.replace(/^```json|```$/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Action extraction failed:', error);
      return { action: "none" };
    }
  }

  // Generate dynamic system prompt based on current context
  getDynamicPrompt(context = {}) {
    const time = context.currentTime || new Date().toLocaleString();
    const platform = context.platform || 'Unknown';
    const activeApps = (context.activeApps && context.activeApps.length > 0) 
      ? context.activeApps.join(', ') 
      : 'None';
    const linkedApp = context.linkedApp || 'None';

    return this.BASE_PROMPT
      .replace('{{TIME}}', time)
      .replace('{{PLATFORM}}', platform)
      .replace('{{ACTIVE_APPS}}', activeApps)
      .replace('{{LINKED_APP}}', linkedApp);
  }

  // New Unified AI Core Processing
  async processUnifiedInput(message, context = {}) {
    if (!aiRouter.initialized) {
      await this.initialize();
    }
    
    try {
      const plan = await aiOrchestrator.processRequest(message, context);
      
      const actions = (plan.actions || []).map(act => {
        let type = act.type || act.action || '';
        if (type === 'open_app' || type === 'openApp') type = 'openApplication';
        if (type === 'write_to_app' || type === 'writeToApp') type = 'writeToApp';
        if (type === 'create_file' || type === 'createFile') type = 'createFile';
        if (type === 'create_folder' || type === 'createFolder') type = 'createFolder';
        if (type === 'search_files' || type === 'searchFiles') type = 'searchFiles';
        if (type === 'system_control' || type === 'systemControl') type = 'systemControl';
        if (type === 'create_document' || type === 'createDocument') type = 'createDocument';
        if (type === 'run_workflow' || type === 'runWorkflow') type = 'runWorkflow';
        
        return {
          action: type,
          parameters: act.parameters || {}
        };
      });

      if (plan.intent === 'CHAT' && (!actions.length || actions[0].action === 'chat_response' || actions[0].action === 'quick_response')) {
        let responseText = '';
        if (actions.length > 0 && actions[0].parameters && actions[0].parameters.text) {
          responseText = actions[0].parameters.text;
        } else if (plan.explanation || plan.response) {
          responseText = plan.explanation || plan.response;
        } else {
          const chatResult = await this.chat(message);
          responseText = chatResult.content || 'I am ready to assist you.';
        }

        return {
          type: 'chat',
          intent: 'CHAT',
          confidence: plan.confidence || 0.95,
          response: responseText,
          actions: []
        };
      }

      return {
        type: plan.intent ? plan.intent.toLowerCase() : 'task',
        intent: plan.intent || 'TASK',
        confidence: plan.confidence || 0.95,
        response: plan.explanation || plan.goal || `Executing task: ${message}`,
        actions: actions,
        content: plan.explanation || ''
      };
    } catch (error) {
      console.error('Unified Processing Error:', error);
      const fallbackChat = await this.chat(message);
      return {
        type: 'chat',
        intent: 'CHAT',
        confidence: 0.8,
        response: fallbackChat.content || `Processed: ${message}`,
        actions: []
      };
    }
  }

  // Quick commands processing
  async processQuickCommand(command, context = {}) {
    const systemPrompt = `You are a helpful AI assistant. Process this quick command efficiently.`;
    return await this.chat(command, null, systemPrompt);
  }
}

// Export as singleton
const aiModule = new AIModule();
export default aiModule;
