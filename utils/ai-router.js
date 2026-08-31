// AI Router - Dynamically initializes and manages provider instances for ZetHub OS
import providerManager, { HositProvider, OpenRouterProvider, LocalProvider } from './provider-manager.js';

class AIRouter {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Safely fetch environment variables via Electron bridge if available
      let hositUrl = 'http://106.51.21.4:8000/api/chat';
      let hositUser = 'user123';
      let openRouterKey = null;
      let openRouterModel = 'google/gemini-2.0-flash-001';
      let activeProviderEnv = 'hosit';

      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getEnv) {
        hositUrl = (await window.electronAPI.getEnv('HOSIT_API_URL')) || hositUrl;
        hositUser = (await window.electronAPI.getEnv('HOSIT_USER_ID')) || hositUser;
        openRouterKey = await window.electronAPI.getEnv('OPENROUTER_API_KEY');
        openRouterModel = (await window.electronAPI.getEnv('OPENROUTER_MODEL')) || openRouterModel;
        activeProviderEnv = (await window.electronAPI.getEnv('AI_PROVIDER')) || activeProviderEnv;
      }

      // Register Hosit Provider
      const hosit = new HositProvider({ apiUrl: hositUrl, userId: hositUser });
      providerManager.registerProvider('hosit', hosit);

      // Register OpenRouter Provider
      const openRouter = new OpenRouterProvider({ apiKey: openRouterKey, model: openRouterModel });
      providerManager.registerProvider('openrouter', openRouter);

      // Register Local Provider
      const local = new LocalProvider();
      providerManager.registerProvider('local', local);

      // Set active provider from config (defaulting to Hosit or OpenRouter if key exists)
      if (activeProviderEnv) {
        providerManager.setActiveProvider(activeProviderEnv);
      } else if (openRouterKey && openRouterKey !== 'your_openrouter_api_key_here') {
        providerManager.setActiveProvider('openrouter');
      } else {
        providerManager.setActiveProvider('hosit');
      }

      this.initialized = true;
      console.log(`[AIRouter] Initialized successfully. Active Provider: ${providerManager.activeProviderName}`);
    } catch (err) {
      console.error('[AIRouter] Initialization error:', err);
    }
  }

  async chat(messages, options = {}) {
    if (!this.initialized) await this.initialize();
    return providerManager.chat(messages, options);
  }

  async stream(messages, onStream, options = {}) {
    if (!this.initialized) await this.initialize();
    return providerManager.stream(messages, onStream, options);
  }

  async setProvider(providerName) {
    if (!this.initialized) await this.initialize();
    return providerManager.setActiveProvider(providerName);
  }

  getProviderManager() {
    return providerManager;
  }
}

const aiRouter = new AIRouter();
export default aiRouter;
