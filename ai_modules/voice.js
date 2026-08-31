// Voice Module - Speech Recognition and Text-to-Speech
class VoiceModule {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onListeningStartCallback = null;
    this.onListeningEndCallback = null;
    this.preferredVoice = null;
    this.speechRate = 1;
    this.speechPitch = 1;
    this.continuous = false;
    this.interimResults = true;
    this.language = 'en-US';
    
    // Backoff and restart settings
    this.restartDelay = 150;
    this.maxRestartDelay = 10000; // 10 seconds
    this.lastStartTimestamp = 0;
    this.backoffLevel = 0;
    this.consecutiveFailures = 0;
  }

  // Initialize speech recognition
  initialize() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech Recognition API not supported');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.language;

    this.setupRecognitionHandlers();
    this.loadPreferredVoice();
    return true;
  }

  // Setup recognition event handlers
  setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      if (this.onListeningStartCallback) {
        this.onListeningStartCallback();
      }
    };

    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      this.isListening = false;
      
      if (this.onListeningEndCallback) {
        this.onListeningEndCallback();
      }
      
      // Calculate restart delay based on failure frequency
      const sessionDuration = Date.now() - this.lastStartTimestamp;
      
      if (this.continuous) {
        if (sessionDuration < 2000) { // If it failed in less than 2 seconds
          this.consecutiveFailures++;
          this.restartDelay = Math.min(this.maxRestartDelay, 150 * Math.pow(2, this.consecutiveFailures));
          console.warn(`Voice recognition failed quickly (${sessionDuration}ms). Increasing backoff to ${this.restartDelay}ms (Attempt ${this.consecutiveFailures})`);
          
          if (this.onErrorCallback && this.consecutiveFailures > 2) {
            this.onErrorCallback('backoff-active', this.restartDelay);
          }
        } else {
          // Reset backoff if it lasted a decent amount of time
          this.restartDelay = 150;
          this.consecutiveFailures = 0;
        }

        console.log(`Auto-restarting voice recognition in ${this.restartDelay}ms...`);
        setTimeout(() => {
          if (this.continuous && !this.isListening) {
            this.startListening();
          }
        }, this.restartDelay);
      }
    };

    this.recognition.onresult = (event) => {
      console.log(`Voice recognition result event received (count: ${event.results.length})`);
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          console.log(`Final Transcript: "${transcript}"`);
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          final: finalTranscript,
          interim: interimTranscript,
          isFinal: finalTranscript.length > 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
      this.isListening = false;
    };
  }

  // Start listening
  startListening(options = {}) {
    if (this.isListening) {
      console.log('Voice recognition already listening, skipping start');
      return { success: true };
    }

    if (!this.recognition) {
      if (!this.initialize()) {
        return { error: 'Speech recognition not available' };
      }
    }

    if (options.onResult) this.onResultCallback = options.onResult;
    if (options.onError) this.onErrorCallback = options.onError;
    if (options.onStart) this.onListeningStartCallback = options.onStart;
    if (options.onEnd) this.onListeningEndCallback = options.onEnd;
    if (options.language) this.recognition.lang = options.language;
    if (options.continuous !== undefined) {
      this.continuous = options.continuous;
      this.recognition.continuous = options.continuous;
    }

    this.lastStartTimestamp = Date.now();
    try {
      this.recognition.start();
      return { success: true };
    } catch (error) {
      // Don't log as error if it's already started (race condition)
      if (error.name === 'InvalidStateError' || error.message.includes('already started')) {
        this.isListening = true;
        return { success: true };
      }
      console.error('Failed to start recognition:', error);
      return { error: error.message };
    }
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.continuous = false; // Prevent auto-restart
      this.recognition.stop();
      this.isListening = false;
      return { success: true };
    }
    return { success: false, error: 'Not currently listening' };
  }

  // Toggle listening state
  toggleListening(options = {}) {
    if (this.isListening) {
      return this.stopListening();
    } else {
      return this.startListening(options);
    }
  }

  // Text-to-Speech
  speak(text, options = {}) {
    if (!this.synthesis) {
      return { error: 'Speech synthesis not available' };
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || this.speechRate;
    utterance.pitch = options.pitch || this.speechPitch;
    utterance.volume = options.volume !== undefined ? options.volume : 1;
    utterance.lang = options.language || this.language;

    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      if (options.onError) options.onError(event.error);
    };

    this.synthesis.speak(utterance);
    return { success: true };
  }

  // Stop speaking
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      return { success: true };
    }
    return { success: false };
  }

  // Pause speaking
  pauseSpeaking() {
    if (this.synthesis) {
      this.synthesis.pause();
      return { success: true };
    }
    return { success: false };
  }

  // Resume speaking
  resumeSpeaking() {
    if (this.synthesis) {
      this.synthesis.resume();
      return { success: true };
    }
    return { success: false };
  }

  // Get available voices
  getVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  // Set preferred voice
  setVoice(voiceName) {
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      this.preferredVoice = voice;
      localStorage.setItem('preferred_voice', voiceName);
      return { success: true };
    }
    return { success: false, error: 'Voice not found' };
  }

  // Load preferred voice from storage
  loadPreferredVoice() {
    const savedVoice = localStorage.getItem('preferred_voice');
    if (savedVoice) {
      // Wait for voices to be loaded
      if (this.synthesis.getVoices().length > 0) {
        this.setVoice(savedVoice);
      } else {
        this.synthesis.onvoiceschanged = () => {
          this.setVoice(savedVoice);
        };
      }
    }
  }

  // Set speech rate
  setRate(rate) {
    this.speechRate = Math.max(0.1, Math.min(2, rate));
    localStorage.setItem('speech_rate', this.speechRate);
  }

  // Set speech pitch
  setPitch(pitch) {
    this.speechPitch = Math.max(0, Math.min(2, pitch));
    localStorage.setItem('speech_pitch', this.speechPitch);
  }

  // Set language
  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    localStorage.setItem('speech_language', lang);
  }

  // Check if browser supports voice features
  get isSupported() {
    return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
           'speechSynthesis' in window;
  }

  // Check support details
  checkSupport() {
    return {
      recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      synthesis: 'speechSynthesis' in window
    };
  }

  // Get current state
  getState() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      language: this.language,
      rate: this.speechRate,
      pitch: this.speechPitch,
      hasRecognition: !!this.recognition,
      hasSynthesis: !!this.synthesis
    };
  }

  // Voice command processing with wake word
  async startVoiceAssistant(wakeWord = 'hey assistant', onCommand) {
    this.continuous = true;
    
    return this.startListening({
      continuous: true,
      onResult: (result) => {
        if (result.isFinal && result.final.toLowerCase().includes(wakeWord.toLowerCase())) {
          const command = result.final.toLowerCase().replace(wakeWord.toLowerCase(), '').trim();
          if (command && onCommand) {
            onCommand(command);
          }
        }
      }
    });
  }

  // Quick voice input for a single phrase
  async getVoiceInput(timeout = 30000) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      const cleanup = () => {
        this.stopListening();
        clearTimeout(timeoutId);
      };

      this.startListening({
        continuous: false,
        onResult: (result) => {
          if (result.isFinal) {
            cleanup();
            resolve(result.final);
          }
        },
        onError: (error) => {
          cleanup();
          reject(error);
        }
      });

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Voice input timeout'));
      }, timeout);
    });
  }
}

// Export as singleton
const voiceModule = new VoiceModule();
export default voiceModule;
