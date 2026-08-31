// Smart Command Engine - Intent Detection and Command Routing
class CommandEngine {
  constructor() {
    this.commands = new Map();
    this.intentPatterns = {
      CHAT: {
        patterns: [
          /^(?:hi|hello|hey|greetings)/i,
          /^(?:what|how|why|when|where|who|can|could|would|will)/i,
          /\?$/,
          /explain|tell me about|describe|what is|how to/i
        ],
        weight: 1
      },
      TASK: {
        patterns: [
          /\b(?:open|launch|start)\s+\w+/i,
          /\b(?:close|exit|quit|stop)\s+\w+/i,
          /\b(?:create|make|new)\s+(?:folder|file|directory)/i,
          /\b(?:search|find|look\s+for)\s+/i,
          /\b(?:delete|remove|move|copy)\s+/i,
          /\b(?:shutdown|restart|sleep|lock)\b/i
        ],
        weight: 2
      },
      AUTOMATION: {
        patterns: [
          /\b(?:workflow|automation|routine|sequence)/i,
          /\b(?:run|execute|perform)\s+(?:workflow|automation)/i,
          /\b(?:start|begin)\s+(?:work|focus|deep\s+work|coding)/i,
          /\b(?:end\s+of\s+day|wrap\s+up|finish\s+work)/i,
          /\b(?:morning|routine|daily)\s+(?:routine|workflow)/i
        ],
        weight: 2
      },
      WRITING: {
        patterns: [
          /\b(?:write|generate|create|draft)\s+(?:a\s+)?(?:blog|article|post|essay)/i,
          /\b(?:write|compose|draft)\s+(?:an?\s+)?(?:email|message)/i,
          /\b(?:generate|write)\s+(?:code|script|function)/i,
          /\b(?:create|write)\s+(?:social\s+media|tweet|post)/i,
          /\b(?:write|create|update)\s+(?:resume|cv|cover\s+letter)/i,
          /\b(?:summarize|rewrite|paraphrase|improve|edit)\b/i
        ],
        weight: 2
      },
      MESSAGE: {
        patterns: [
          /\b(?:reply\s+to|respond\s+to|answer)\b/i,
          /\b(?:generate|suggest)\s+(?:a\s+)?reply/i,
          /\b(?:what\s+should\s+i\s+say|how\s+should\s+i\s+respond)/i,
          /\b(?:email|message)\s+reply/i
        ],
        weight: 1
      }
    };

    this.contextWeights = {
      currentApp: null,
      lastIntent: null,
      conversationMode: 'general'
    };

    this.setupDefaultCommands();
  }

  // Setup default command handlers
  setupDefaultCommands() {
    // Quick commands that don't need AI
    this.registerCommand('time', () => {
      return { type: 'quick', response: `Current time is ${new Date().toLocaleTimeString()}` };
    });

    this.registerCommand('date', () => {
      return { type: 'quick', response: `Today is ${new Date().toLocaleDateString()}` };
    });

    this.registerCommand('help', () => {
      return { 
        type: 'quick', 
        response: `Available commands:
• Chat: Ask me anything
• Tasks: "Open Chrome", "Create folder", "Search files"
• Writing: "Write a blog about...", "Generate code for..."
• Automation: "Start work mode", "Run workflow"
• System: "Shutdown", "Restart", "Lock screen"` 
      };
    });

    this.registerCommand('clear', () => {
      return { type: 'action', action: 'clear_chat', response: 'Chat history cleared' };
    });

    this.registerCommand('status', () => {
      return { 
        type: 'quick', 
        response: `System Status:
• Platform: ${window.electronAPI.platform}
• Time: ${new Date().toLocaleTimeString()}
• Voice: ${'webkitSpeechRecognition' in window ? 'Available' : 'Not Available'}
• Speech: ${'speechSynthesis' in window ? 'Available' : 'Not Available'}`
      };
    });
  }

  // Register a custom command
  registerCommand(name, handler) {
    this.commands.set(name.toLowerCase(), handler);
  }

  // Unregister a command
  unregisterCommand(name) {
    return this.commands.delete(name.toLowerCase());
  }

  // Detect intent from user input
  detectIntent(input) {
    const scores = {};
    const lowerInput = input.toLowerCase();

    // Check for exact command match first
    const commandName = lowerInput.split(' ')[0];
    if (this.commands.has(commandName)) {
      return { intent: 'COMMAND', command: commandName, confidence: 1 };
    }

    // Score each intent category
    for (const [intent, config] of Object.entries(this.intentPatterns)) {
      scores[intent] = 0;
      
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          scores[intent] += config.weight;
        }
      }
    }

    // Context adjustments
    if (this.contextWeights.lastIntent) {
      scores[this.contextWeights.lastIntent] += 0.5;
    }

    // Find highest scoring intent
    let maxScore = 0;
    let detectedIntent = 'CHAT';

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;

    return { intent: detectedIntent, confidence, scores };
  }

  // Parse command for parameters
  parseParameters(input, intent) {
    const params = {};
    const lowerInput = input.toLowerCase();

    switch (intent) {
      case 'TASK':
        // Extract app name
        const appMatch = input.match(/(?:open|launch|start)\s+(\w+)/i);
        if (appMatch) params.app = appMatch[1];

        // Extract folder name
        const folderMatch = input.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["']?(.+?)["']?/i);
        if (folderMatch) params.folderName = folderMatch[1];

        // Extract search term
        const searchMatch = input.match(/(?:search|find)\s+(?:for\s+)?["']?(.+?)["']?(?:\s+in\s+(.+))?$/i);
        if (searchMatch) {
          params.searchTerm = searchMatch[1];
          params.searchPath = searchMatch[2];
        }
        break;

      case 'WRITING':
        // Extract content type
        if (/blog|article|post/i.test(input)) params.contentType = 'blog';
        else if (/email|message/i.test(input)) params.contentType = 'email';
        else if (/code|script|function/i.test(input)) params.contentType = 'code';
        else if (/social|tweet/i.test(input)) params.contentType = 'social';
        else if (/resume|cv/i.test(input)) params.contentType = 'resume';

        // Extract tone
        if (/formal|professional/i.test(input)) params.tone = 'formal';
        else if (/casual|friendly|informal/i.test(input)) params.tone = 'casual';
        else if (/technical|detailed/i.test(input)) params.tone = 'technical';
        else if (/humorous|funny/i.test(input)) params.tone = 'humorous';

        // Extract topic (everything after "about" or "for")
        const topicMatch = input.match(/(?:about|for|on)\s+(.+?)(?:\s+(?:tone|style|format)|$)/i);
        if (topicMatch) params.topic = topicMatch[1].trim();
        break;

      case 'AUTOMATION':
        // Extract workflow name
        const workflowMatch = input.match(/(?:run|execute|start)\s+(?:workflow|automation|routine)?\s*(.+)/i);
        if (workflowMatch) params.workflowName = workflowMatch[1].trim();
        break;

      case 'MESSAGE':
        // Extract message context
        const contextMatch = input.match(/(?:context|about|regarding)\s+(.+)/i);
        if (contextMatch) params.context = contextMatch[1];
        break;
    }

    return params;
  }

  // Process user input and route to appropriate handler
  async process(input, context = {}) {
    const startTime = Date.now();

    // Detect intent
    const detection = this.detectIntent(input);
    const params = this.parseParameters(input, detection.intent);

    // Update context
    this.contextWeights.lastIntent = detection.intent;

    // Build result
    const result = {
      input,
      intent: detection.intent,
      confidence: detection.confidence,
      params,
      processingTime: 0,
      route: null,
      action: null
    };

    // Route to appropriate handler
    switch (detection.intent) {
      case 'COMMAND':
        result.route = 'COMMAND';
        const command = this.commands.get(input.split(' ')[0].toLowerCase());
        if (command) {
          const commandResult = await command(params);
          result.action = commandResult;
        }
        break;

      case 'TASK':
        result.route = 'TASK';
        result.action = { type: 'task', params };
        break;

      case 'AUTOMATION':
        result.route = 'AUTOMATION';
        result.action = { type: 'automation', params };
        break;

      case 'WRITING':
        result.route = 'WRITING';
        result.action = { type: 'writing', params };
        break;

      case 'MESSAGE':
        result.route = 'MESSAGE';
        result.action = { type: 'message', params };
        break;

      default:
        result.route = 'CHAT';
        result.action = { type: 'chat' };
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  // Get command suggestions based on partial input
  getSuggestions(partial) {
    const suggestions = [];
    const lowerPartial = partial.toLowerCase();

    // Check registered commands
    for (const [name, handler] of this.commands) {
      if (name.startsWith(lowerPartial)) {
        suggestions.push({ type: 'command', value: name });
      }
    }

    // Common task patterns
    const taskSuggestions = [
      { pattern: /open/, suggestion: 'open [app name]' },
      { pattern: /create/, suggestion: 'create folder [name]' },
      { pattern: /search/, suggestion: 'search [term]' },
      { pattern: /write/, suggestion: 'write a [blog/email/code] about [topic]' },
      { pattern: /run/, suggestion: 'run workflow [name]' },
      { pattern: /shutdown/, suggestion: 'shutdown computer' },
      { pattern: /restart/, suggestion: 'restart computer' }
    ];

    for (const task of taskSuggestions) {
      if (task.pattern.test(lowerPartial)) {
        suggestions.push({ type: 'pattern', value: task.suggestion });
      }
    }

    return suggestions.slice(0, 5);
  }

  // Batch process multiple inputs
  async batchProcess(inputs) {
    const results = [];
    for (const input of inputs) {
      results.push(await this.process(input));
    }
    return results;
  }

  // Export configuration
  exportConfig() {
    return {
      commands: Array.from(this.commands.keys()),
      intentPatterns: this.intentPatterns,
      contextWeights: this.contextWeights
    };
  }

  // Import configuration
  importConfig(config) {
    if (config.intentPatterns) {
      Object.assign(this.intentPatterns, config.intentPatterns);
    }
    if (config.contextWeights) {
      Object.assign(this.contextWeights, config.contextWeights);
    }
  }

  // Add custom intent pattern
  addIntentPattern(intent, pattern, weight = 1) {
    if (!this.intentPatterns[intent]) {
      this.intentPatterns[intent] = { patterns: [], weight };
    }
    this.intentPatterns[intent].patterns.push(pattern);
  }

  // Set context weight
  setContext(contextType, value) {
    this.contextWeights[contextType] = value;
  }

  // Get current context
  getContext() {
    return { ...this.contextWeights };
  }

  // Clear context
  clearContext() {
    this.contextWeights = {
      currentApp: null,
      lastIntent: null,
      conversationMode: 'general'
    };
  }
}

// Export as singleton
const commandEngine = new CommandEngine();
export default commandEngine;
