// AI Orchestrator - Central Brain of ZetHub AI Desktop OS
import aiRouter from '../utils/ai-router.js';

export class AIOrchestrator {
  constructor() {
    this.intents = [
      'CHAT', 'QUESTION', 'SYSTEM_COMMAND', 'FILE_OPERATION', 
      'DOCUMENT_CREATION', 'DOCUMENT_EDIT', 'SPREADSHEET', 'PRESENTATION', 
      'EMAIL', 'MESSAGE', 'WEB_RESEARCH', 'CODE', 
      'AUTOMATION', 'MULTI_STEP_TASK', 'VOICE_COMMAND', 'SCHEDULED_TASK'
    ];
  }

  // Fast-path local keyword & regex intent detection to eliminate network latency for trivial requests
  detectFastPathIntent(input) {
    const clean = input.trim().toLowerCase();

    if (/^(?:hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i.test(clean)) {
      return {
        intent: 'CHAT',
        confidence: 0.99,
        goal: 'Respond to greeting',
        actions: [{ type: 'quick_response', parameters: { text: "Hello! I am your ZetHub AI Desktop OS Assistant. How can I help you today?" } }],
        requires_confirmation: false
      };
    }

    if (/^(?:who are you|what is your name|what can you do|help)\b/i.test(clean)) {
      return {
        intent: 'CHAT',
        confidence: 0.99,
        goal: 'Explain AI capabilities',
        actions: [{ type: 'quick_response', parameters: { text: "I am ZetHub AI, your autonomous desktop employee. I can launch applications, write documents, generate spreadsheets & presentations, automate desktop workflows, and search files." } }],
        requires_confirmation: false
      };
    }

    if (clean === 'time' || clean.includes('current time')) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 1.0,
        goal: 'Display current system time',
        actions: [{ type: 'quick_response', parameters: { text: `Current time is ${new Date().toLocaleTimeString()}` } }],
        requires_confirmation: false
      };
    }

    if (clean === 'date' || clean.includes('current date')) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 1.0,
        goal: 'Display current system date',
        actions: [{ type: 'quick_response', parameters: { text: `Today is ${new Date().toLocaleDateString()}` } }],
        requires_confirmation: false
      };
    }

    if (clean === 'clear' || clean === 'clear chat') {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 1.0,
        goal: 'Clear chat window',
        actions: [{ type: 'clear_chat', parameters: {} }],
        requires_confirmation: false
      };
    }

    // Direct app launching
    const appMatch = clean.match(/^(?:open|launch|start)\s+([a-z0-9\s]+)$/i);
    if (appMatch) {
      const appName = appMatch[1].trim();
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 0.98,
        goal: `Open application ${appName}`,
        actions: [{ type: 'open_app', parameters: { appName } }],
        requires_confirmation: false
      };
    }

    // Direct system power controls
    if (/^(?:shutdown|power off)\s+(?:computer|pc|system)?$/i.test(clean)) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 0.99,
        goal: 'Shutdown computer',
        actions: [{ type: 'system_control', parameters: { action: 'shutdown' } }],
        requires_confirmation: true
      };
    }

    if (/^(?:restart|reboot)\s+(?:computer|pc|system)?$/i.test(clean)) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 0.99,
        goal: 'Restart computer',
        actions: [{ type: 'system_control', parameters: { action: 'restart' } }],
        requires_confirmation: true
      };
    }

    if (/^(?:lock|lock screen)\b/i.test(clean)) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 1.0,
        goal: 'Lock workstation',
        actions: [{ type: 'system_control', parameters: { action: 'lock' } }],
        requires_confirmation: false
      };
    }

    // Fast-path Document Creation (Word / DOCX)
    if (/\b(?:create|generate|make)\s+(?:a\s+)?(?:word\s+doc(?:ument)?|docx|report)\b/i.test(clean)) {
      return {
        intent: 'DOCUMENT_CREATION',
        confidence: 0.95,
        goal: 'Generate Word document',
        actions: [{ type: 'generate_document', parameters: { topic: clean } }],
        requires_confirmation: false
      };
    }

    // Fast-path Spreadsheet Creation (Excel / XLSX)
    if (/\b(?:create|generate|make)\s+(?:an?\s+)?(?:excel|spreadsheet|tracker)\b/i.test(clean)) {
      return {
        intent: 'SPREADSHEET',
        confidence: 0.95,
        goal: 'Generate Excel spreadsheet',
        actions: [{ type: 'create_spreadsheet', parameters: { topic: clean } }],
        requires_confirmation: false
      };
    }

    // Fast-path Presentation Creation (PowerPoint / PPTX)
    if (/\b(?:create|generate|make)\s+(?:a\s+)?(?:powerpoint|presentation|deck|slides)\b/i.test(clean)) {
      return {
        intent: 'PRESENTATION',
        confidence: 0.95,
        goal: 'Generate PowerPoint presentation',
        actions: [{ type: 'create_presentation', parameters: { topic: clean } }],
        requires_confirmation: false
      };
    }

    // Fast-path File Operations
    if (/\b(?:show|list|find|search)\s+(?:me\s+)?(?:the\s+)?files\b/i.test(clean)) {
      return {
        intent: 'FILE_OPERATION',
        confidence: 0.95,
        goal: 'Search files',
        actions: [{ type: 'search_files', parameters: { searchPath: '.' } }],
        requires_confirmation: false
      };
    }

    if (/\b(?:delete|remove)\s+(?:this|the)\s+file\b/i.test(clean)) {
      return {
        intent: 'FILE_OPERATION',
        confidence: 0.95,
        goal: 'Delete file',
        actions: [{ type: 'delete_file', parameters: {} }],
        requires_confirmation: true
      };
    }

    // Fast-path Shell Commands
    if (/\b(?:run|execute)\s+(?:this\s+)?(?:safe\s+)?(?:shell|cmd|command)\b/i.test(clean)) {
      return {
        intent: 'SYSTEM_COMMAND',
        confidence: 0.95,
        goal: 'Run shell command',
        actions: [{ type: 'run_shell_command', parameters: { command: clean } }],
        requires_confirmation: false
      };
    }

    // Fast-path Web Research
    if (/\b(?:search|find|research)\s+(?:for\s+)?information\b/i.test(clean)) {
      return {
        intent: 'WEB_RESEARCH',
        confidence: 0.95,
        goal: 'Web research',
        actions: [{ type: 'research_files', parameters: { query: clean } }],
        requires_confirmation: false
      };
    }

    return null; // Fall through to AI reasoning
  }

  async classifyIntent(userMessage, context = {}) {
    return this.processRequest(userMessage, context);
  }

  // Orchestrate request processing
  async processRequest(userMessage, context = {}) {
    const startTime = Date.now();

    // 1. Check local fast-path
    const fastPath = this.detectFastPathIntent(userMessage);
    if (fastPath) {
      this.logOrchestration(userMessage, fastPath, Date.now() - startTime, 'fastpath');
      return fastPath;
    }

    // 2. AI Reasoning Classification Prompt
    const systemPrompt = `You are the central AI Orchestrator for ZetHub AI Desktop OS.
Your job is to analyze user requests and output a structured JSON plan.

CATEGORIES (Pick EXACTLY ONE intent):
CHAT, QUESTION, SYSTEM_COMMAND, FILE_OPERATION, DOCUMENT_CREATION, DOCUMENT_EDIT, SPREADSHEET, PRESENTATION, EMAIL, MESSAGE, WEB_RESEARCH, CODE, AUTOMATION, MULTI_STEP_TASK, VOICE_COMMAND, SCHEDULED_TASK

CONTEXT:
* Current Time: ${context.currentTime || new Date().toLocaleString()}
* Platform: ${context.platform || (typeof window !== 'undefined' ? window.electronAPI?.platform : 'win32') || 'win32'}
* Active Application: ${context.linkedApp || context.activeApp || 'None'}

STRICT JSON OUTPUT FORMAT ONLY (NO MARKDOWN WRAPPERS):
{
  "intent": "CATEGORY_NAME",
  "confidence": 0.95,
  "goal": "Clear summary of user goal",
  "actions": [
    {
      "type": "action_type_name",
      "parameters": {}
    }
  ],
  "requires_confirmation": false,
  "explanation": "Brief status for the user"
}

Actions Supported:
- open_app: { "appName": "name" }
- write_to_app: { "appName": "name", "content": "..." }
- create_file: { "path": "path", "content": "..." }
- create_folder: { "path": "path" }
- search_files: { "searchTerm": "term" }
- system_control: { "action": "shutdown|restart|sleep|lock" }
- create_document: { "template": "business_proposal", "topic": "..." }
- run_workflow: { "workflowName": "name" }
- chat_response: { "text": "..." }`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await aiRouter.chat(messages, { temperature: 0.2 });
      const plan = this.parseAndValidatePlan(response.content, userMessage);
      this.logOrchestration(userMessage, plan, Date.now() - startTime, 'ai_reasoning');
      return plan;
    } catch (err) {
      console.error('[AIOrchestrator] AI classification failed:', err);
      // Safe fallback plan
      const fallbackPlan = {
        intent: 'CHAT',
        confidence: 0.5,
        goal: 'Conversational response fallback',
        actions: [{ type: 'chat_response', parameters: { prompt: userMessage } }],
        requires_confirmation: false,
        error: err.message
      };
      this.logOrchestration(userMessage, fallbackPlan, Date.now() - startTime, 'error_fallback');
      return fallbackPlan;
    }
  }

  // Parse and validate structured JSON plan
  parseAndValidatePlan(rawContent, originalMessage) {
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(json)?\n?|\n?```$/g, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Attempt substring extraction
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(jsonStr.substring(start, end + 1));
        } catch (e2) {}
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        intent: 'CHAT',
        confidence: 0.6,
        goal: 'General chat response',
        actions: [{ type: 'chat_response', parameters: { text: rawContent } }],
        requires_confirmation: false
      };
    }

    // Ensure fields conform to schema
    const intent = this.intents.includes(parsed.intent) ? parsed.intent : 'CHAT';
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];

    return {
      intent,
      confidence,
      goal: parsed.goal || originalMessage,
      actions,
      requires_confirmation: !!parsed.requires_confirmation,
      explanation: parsed.explanation || parsed.response || null
    };
  }

  logOrchestration(message, plan, durationMs, source) {
    const logEntry = `[Orchestrator:${source}] "${message}" -> ${plan.intent} (Conf: ${plan.confidence}) in ${durationMs}ms`;
    console.log(logEntry);
    if (typeof window !== 'undefined' && window.electronAPI?.logActivity) {
      window.electronAPI.logActivity(logEntry);
    }
  }
}

const aiOrchestrator = new AIOrchestrator();
export default aiOrchestrator;
