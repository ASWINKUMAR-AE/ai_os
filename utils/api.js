// API Utilities Module
class APIModule {
  constructor() {
    this.baseURL = '';
    this.headers = {};
    this.timeout = 30000;
    this.retries = 3;
    this.retryDelay = 1000;
  }

  // Configure API settings
  configure(config) {
    if (config.baseURL) this.baseURL = config.baseURL;
    if (config.headers) this.headers = { ...this.headers, ...config.headers };
    if (config.timeout) this.timeout = config.timeout;
    if (config.retries !== undefined) this.retries = config.retries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }

  // Make HTTP request with retry logic
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let lastError;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        config.signal = controller.signal;

        const response = await fetch(fullUrl, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse response based on content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }

      } catch (error) {
        lastError = error;
        
        if (attempt < this.retries) {
          console.warn(`Request failed (attempt ${attempt + 1}), retrying...`);
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  // HTTP methods
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  }

  async put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  async patch(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // OpenRouter specific methods
  static createOpenRouterClient(apiKey, model = 'google/gemini-2.0-flash-001') {
    const client = new APIModule();
    client.configure({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai-desktop-assistant.app',
        'X-Title': 'AI Desktop Assistant'
      }
    });
    
    client.model = model;
    return client;
  }

  // OpenRouter chat completion
  async openRouterChat(messages, options = {}) {
    const body = {
      model: this.model || 'google/gemini-2.0-flash-001',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4000,
      stream: options.stream ?? false
    };

    if (options.stream) {
      return this.streamRequest('/chat/completions', body);
    }

    return this.post('/chat/completions', body);
  }

  // Streaming request handler
  async *streamRequest(url, body) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  // Health check
  async healthCheck() {
    try {
      await this.get('/health', { timeout: 5000 });
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // Rate limiting helper
  createRateLimiter(maxRequests = 10, windowMs = 60000) {
    const requests = [];
    
    return async (fn) => {
      const now = Date.now();
      
      // Remove old requests outside window
      while (requests.length > 0 && requests[0] < now - windowMs) {
        requests.shift();
      }
      
      // Check if we can make request
      if (requests.length >= maxRequests) {
        const waitTime = requests[0] + windowMs - now;
        await this.delay(waitTime);
      }
      
      requests.push(now);
      return fn();
    };
  }
}

// Export
const apiModule = new APIModule();
export { APIModule, apiModule };
export default apiModule;
