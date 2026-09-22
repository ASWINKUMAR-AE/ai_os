// Provider Abstraction Layer for AI Desktop Assistant / ZetHub OS

export class BaseAIProvider {
  constructor(name) {
    this.name = name;
  }
  async chat(messages, options = {}) {
    throw new Error('chat() method not implemented');
  }
  async stream(messages, onStream, options = {}) {
    throw new Error('stream() method not implemented');
  }
  async healthCheck() {
    return { status: 'unknown' };
  }
  async getModels() {
    return [];
  }
}

// 1. Hosit AI API Provider
export class HositProvider extends BaseAIProvider {
  constructor(config = {}) {
    super('hosit');
    this.apiUrl = config.apiUrl || 'http://106.51.21.4:8000/api/chat';
    this.userId = config.userId || 'desktop_user_123';
  }

  async chat(messages, options = {}) {
    // Format messages array or single query string into Hosit expected format
    let lastUserMessage = '';
    let contextStr = options.context || '';

    if (Array.isArray(messages)) {
      const userMsgs = messages.filter(m => m.role === 'user');
      lastUserMessage = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
      const sysMsgs = messages.filter(m => m.role === 'system');
      if (sysMsgs.length > 0 && !contextStr) {
        contextStr = sysMsgs.map(m => m.content).join('\n');
      }
    } else if (typeof messages === 'string') {
      lastUserMessage = messages;
    }

    const payload = {
      message: lastUserMessage,
      user_id: options.userId || this.userId,
      context: contextStr || 'ZetHub AI OS Context'
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hosit API error HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.status === 'success' || data.ai_response) {
      return {
        content: data.ai_response || data.message || '',
        raw: data,
        provider: this.name
      };
    } else {
      throw new Error(data.message || 'Hosit API returned unsuccessful status');
    }
  }

  async stream(messages, onStream, options = {}) {
    // Fall back to chat for non-streaming endpoints, simulating stream delta
    const result = await this.chat(messages, options);
    if (onStream && result.content) {
      const chunkSize = 15;
      for (let i = 0; i < result.content.length; i += chunkSize) {
        const chunk = result.content.slice(i, i + chunkSize);
        onStream(chunk, result.content.slice(0, i + chunkSize));
        await new Promise(r => setTimeout(r, 20));
      }
    }
    return result;
  }

  async healthCheck() {
    try {
      const res = await this.chat('ping', { context: 'healthcheck' });
      return { status: 'healthy', provider: this.name, response: res.content ? 'ok' : 'empty' };
    } catch (err) {
      return { status: 'unhealthy', provider: this.name, error: err.message };
    }
  }

  async getModels() {
    return ['hosit-default-model'];
  }
}

// 2. OpenRouter Provider
export class OpenRouterProvider extends BaseAIProvider {
  constructor(config = {}) {
    super('openrouter');
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'google/gemini-2.0-flash-001';
    this.apiUrl = config.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not set');
    }

    const formattedMessages = Array.isArray(messages)
      ? messages
      : [{ role: 'user', content: messages }];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zethub-ai-os.app',
        'X-Title': 'ZetHub AI Desktop OS'
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    return { content, raw: data, provider: this.name };
  }

  async stream(messages, onStream, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not set');
    }

    const formattedMessages = Array.isArray(messages)
      ? messages
      : [{ role: 'user', content: messages }];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zethub-ai-os.app',
        'X-Title': 'ZetHub AI Desktop OS'
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
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
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              if (onStream) onStream(delta, fullContent);
            }
          } catch (e) {
            // ignore chunk parse errors
          }
        }
      }
    }

    return { content: fullContent, provider: this.name };
  }

  async healthCheck() {
    try {
      if (!this.apiKey) return { status: 'unconfigured', provider: this.name };
      return { status: 'healthy', provider: this.name };
    } catch (err) {
      return { status: 'unhealthy', provider: this.name, error: err.message };
    }
  }

  async getModels() {
    return [
      'google/gemini-2.0-flash-001',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'meta-llama/llama-3.2-70b-instruct'
    ];
  }
}

// 3. Local LLM Provider (Ollama / LM Studio)
export class LocalProvider extends BaseAIProvider {
  constructor(config = {}) {
    super('local');
    this.apiUrl = config.apiUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3';
  }

  async chat(messages, options = {}) {
    const formattedMessages = Array.isArray(messages)
      ? messages
      : [{ role: 'user', content: messages }];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: formattedMessages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      raw: data,
      provider: this.name
    };
  }

  async stream(messages, onStream, options = {}) {
    return this.chat(messages, options);
  }

  async healthCheck() {
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      return { status: res.ok ? 'healthy' : 'unhealthy', provider: this.name };
    } catch (err) {
      return { status: 'unhealthy', provider: this.name, error: err.message };
    }
  }

  async getModels() {
    return ['llama3', 'mistral', 'qwen'];
  }
}

// Provider Manager Singleton Container
export class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProviderName = 'hosit'; // Default provider
  }

  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  setActiveProvider(name) {
    if (!name) return false;
    const lower = String(name).toLowerCase();
    if (this.providers.has(lower)) {
      this.activeProviderName = lower;
      console.log(`[ProviderManager] Active AI Provider set to: ${name}`);
      return true;
    }
    console.warn(`[ProviderManager] Provider '${name}' not registered.`);
    return false;
  }

  getActiveProvider() {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      // Fallback to first available provider
      const first = this.providers.values().next().value;
      if (!first) throw new Error('No AI Providers configured');
      return first;
    }
    return provider;
  }

  // Execute chat with automatic fallback
  async chat(messages, options = {}) {
    const primary = this.getActiveProvider();
    try {
      return await primary.chat(messages, options);
    } catch (primaryErr) {
      console.warn(`[ProviderManager] Primary provider '${primary.name}' failed: ${primaryErr.message}. Attempting fallback...`);
      for (const [name, provider] of this.providers.entries()) {
        if (name !== primary.name) {
          try {
            console.log(`[ProviderManager] Trying fallback provider: ${name}`);
            const result = await provider.chat(messages, options);
            return result;
          } catch (fallbackErr) {
            console.warn(`[ProviderManager] Fallback provider '${name}' failed: ${fallbackErr.message}`);
          }
        }
      }
      throw new Error(`All AI providers failed. Primary error: ${primaryErr.message}`);
    }
  }

  // Execute stream with fallback
  async stream(messages, onStream, options = {}) {
    const primary = this.getActiveProvider();
    try {
      return await primary.stream(messages, onStream, options);
    } catch (primaryErr) {
      console.warn(`[ProviderManager] Primary stream '${primary.name}' failed: ${primaryErr.message}. Falling back...`);
      for (const [name, provider] of this.providers.entries()) {
        if (name !== primary.name) {
          try {
            return await provider.stream(messages, onStream, options);
          } catch (e) {}
        }
      }
      throw primaryErr;
    }
  }

  async healthCheckAll() {
    const results = {};
    for (const [name, provider] of this.providers.entries()) {
      results[name] = await provider.healthCheck();
    }
    return results;
  }
}

const providerManager = new ProviderManager();
export default providerManager;
