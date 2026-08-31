// AI Module - OpenRouter API Integration
class AIModule {
  constructor() {
    this.apiKey = null;
    this.model = 'google/gemini-2.0-flash-001';
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.conversationHistory = [];
    this.maxHistory = 50;
  }

  async initialize() {
    this.apiKey = await window.electronAPI.getEnv('OPENROUTER_API_KEY');
    const model = await window.electronAPI.getEnv('OPENROUTER_MODEL');
    if (model) this.model = model;
    
    // Load conversation history from storage
    this.loadHistory();
  }

  // Main chat function with streaming support
  async chat(message, onStream = null, systemPrompt = null) {
    if (!this.apiKey) {
      await this.initialize();
    }

    if (!this.apiKey || this.apiKey === 'your_openrouter_api_key_here') {
      return { error: 'API key not configured. Please set OPENROUTER_API_KEY in .env file' };
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

  // Regular non-streaming chat
  async regularChat(messages) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-desktop-assistant.app',
        'X-Title': 'AI Desktop Assistant'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Save to history
    this.addToHistory(messages[messages.length - 1].content, content);

    return { content, data };
  }

  // Streaming chat for real-time responses
  async streamChat(messages, onStream) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-desktop-assistant.app',
        'X-Title': 'AI Desktop Assistant'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onStream(delta, fullContent);
            }
          } catch (e) {
            // Ignore parse errors for malformed chunks
          }
        }
      }
    }

    // Save to history
    this.addToHistory(messages[messages.length - 1].content, fullContent);

    return { content: fullContent };
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
      localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  // Load history from localStorage
  loadHistory() {
    try {
      const saved = localStorage.getItem('ai_conversation_history');
      if (saved) {
        this.conversationHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
    localStorage.removeItem('ai_conversation_history');
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

  // Quick commands processing
  async processQuickCommand(command, context = {}) {
    const systemPrompt = `You are a helpful AI assistant. Process this quick command efficiently.`;
    return await this.chat(command, null, systemPrompt);
  }
}

// Export as singleton
const aiModule = new AIModule();
export default aiModule;
