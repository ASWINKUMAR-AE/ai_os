# 🤖 AI Desktop Assistant

A powerful, full-featured AI-powered desktop application built with **Electron.js** featuring modern UI/UX, voice control, task automation, and intelligent chat capabilities.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🎙️ Voice Control
- Speech-to-text recognition using Web Speech API
- Text-to-speech synthesis with customizable voice settings
- Continuous listening mode for hands-free operation
- Real-time voice visualizer with animated waveforms

### 💬 AI Chat System
- ChatGPT-like conversational interface
- Streaming responses for real-time feedback
- Markdown support with syntax highlighting for code
- Conversation history with export functionality
- Smart message actions (copy, speak, regenerate)

### ✍️ AI Content Writer
- Blog post generator
- Code generator with syntax highlighting
- Email composer with tone selection
- Social media content creator
- Resume/CV generator
- Customizable tone (professional, casual, technical, humorous)

### 🤖 Task Automation
- Natural language command processing
- Open applications (Chrome, VS Code, Spotify, etc.)
- Create folders and manage files
- Search files across the system
- System control (shutdown, restart, sleep, lock screen)
- Activity logging

### ⚙️ Workflow Automation
- Create custom automated workflows
- Preset workflows (Start Work Mode, Deep Focus, End of Day)
- Multi-step automation sequences
- Visual workflow builder
- Workflow execution with progress tracking

### 🧠 Smart Command Engine
- Intent detection and classification
- Automatic routing to appropriate modules
- Command suggestions and autocomplete
- Context-aware processing

### 🔐 Security & Privacy
- Secure API key storage
- Local data persistence with encryption option
- Export/Import data functionality
- Clear data option for privacy

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **OpenRouter API Key** - [Get one here](https://openrouter.ai/keys)

### Installation

1. **Clone or extract the project:**
   ```bash
   cd ai-desktop-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   OPENROUTER_MODEL=google/gemini-2.0-flash-001
   ```

4. **Start the application:**
   ```bash
   npm start
   ```
   
   For development mode with DevTools:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```
/ai-desktop-app
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── package.json         # Project configuration
├── .env.example         # Environment variables template
├── .env                 # Your API keys (not in git)
├── modules/             # Core modules
│   ├── ai.js           # OpenRouter AI integration
│   ├── voice.js        # Speech recognition & synthesis
│   ├── automation.js   # Task automation engine
│   ├── commands.js     # Smart command routing
│   └── storage.js      # Local data management
├── utils/               # Utility functions
│   └── api.js          # API utilities
├── renderer/            # Frontend UI
│   ├── index.html      # Main HTML
│   ├── style.css       # Dark theme styles
│   └── app.js          # Renderer logic
└── assets/              # App icons and images
```

---

## 🎨 UI/UX Design

The application features a modern dark theme inspired by VS Code and Notion:
- **Dark theme** with carefully selected color palette
- **Sidebar navigation** for easy module switching
- **Responsive layout** that works on different screen sizes
- **Smooth animations** and transitions
- **Code syntax highlighting** with highlight.js

---

## 🔧 Configuration

### AI Models Supported
The app works with any OpenRouter model:
- `google/gemini-2.0-flash-001` (default)
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4o`
- `meta-llama/llama-3.2-70b-instruct`

### Voice Settings
Customize voice settings in the Voice panel:
- Language selection (English, Spanish, French, German, Japanese, Chinese)
- Speech rate (0.5x - 2.0x)
- Speech pitch (0.5 - 2.0)
- Continuous listening mode

---

## 💡 Usage Examples

### Chat Commands
- `"What can you help me with?"` - General assistance
- `"Explain quantum computing"` - Educational queries
- `"Write a Python script to parse JSON"` - Code help

### Task Automation
- `"Open Chrome"` - Launch applications
- `"Create folder Projects"` - File management
- `"Search for invoices"` - File search
- `"Shutdown computer"` - System control

### Content Writing
- `"Write a blog post about AI trends"`
- `"Generate code for a React button component"`
- `"Write a professional email to my boss"`
- `"Create a tweet about my product launch"`

### Workflows
- `"Start work mode"` - Opens VS Code, Chrome, sets focus
- `"Run deep focus workflow"` - Enables distraction-free environment
- `"End of day routine"` - Backup and shutdown sequence

---

## 🛠️ Development

### Building for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the app |
| `npm run dev` | Run with DevTools |
| `npm run build` | Build for production |
| `npm run build:win` | Build Windows installer |
| `npm run build:mac` | Build macOS DMG |
| `npm run build:linux` | Build Linux AppImage |

---

## 🔒 Security Notes

- API keys are stored locally in `.env` file (never commit this)
- Preload script provides secure context isolation
- No sensitive data is transmitted except to OpenRouter API
- Local storage data can be encrypted (optional)

---

## 🐛 Troubleshooting

### Voice not working?
- Ensure your browser/OS supports Web Speech API
- Check microphone permissions
- Try using Chrome/Edge for best compatibility

### API errors?
- Verify your OpenRouter API key is correct
- Check your internet connection
- Ensure you have API credits on OpenRouter

### App won't start?
- Check Node.js version (v18+)
- Delete `node_modules` and run `npm install` again
- Check console for error messages

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional AI model integrations
- More automation commands
- Plugin system architecture
- Voice recognition improvements
- UI/UX enhancements

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- AI powered by [OpenRouter](https://openrouter.ai/)
- Icons from [Lucide](https://lucide.dev/)
- Code highlighting by [highlight.js](https://highlightjs.org/)
- Markdown rendering by [marked](https://marked.js.org/)

---

**Enjoy your AI Desktop Assistant! 🎉**
