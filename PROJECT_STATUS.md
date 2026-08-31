# 🤖 AI Desktop Assistant - Project Status & Details

This document provides a comprehensive report on the current implementation state, directory layout, active configurations, and module architecture of the **AI Desktop Assistant** project.

---

## 📊 1. Current Project Status

The project is a fully-featured, desktop-integrated AI assistant built on **Electron.js**. It successfully integrates system control, task automation, content writing templates, real-time voice interaction, and conversational AI routing.

*   **API Configuration Status**: Fully Configured.
    *   **Provider**: OpenRouter API (`https://openrouter.ai/api/v1`)
    *   **Active Model**: `google/gemini-2.0-flash-001`
    *   **API Key**: Verified and configured locally in `.env`
*   **Operating System Integration**: Powered by native Electron IPC channels executing PowerShell (for window placement/typing emulation) and OS shell commands.
*   **Aesthetics & UI**: Implements a premium, modern dark theme using a responsive, glassmorphic layout, custom animations, custom window frames, and animated waveform visualizers.

---

## 📁 2. Workspace Directory Structure

```
/ai-desktop-app (d:\ai_os)
├── main.js                 # Main Electron process (system command exec, window management, IPC handlers)
├── preload.js              # Secure Electron context isolation bridge
├── package.json            # Scripts, project metadata, and dependency mappings
├── .env                    # Active local environment keys (OpenRouter API key, model, endpoints)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore patterns
├── README.md               # Main onboarding and general description document
├── APP_INFO.md             # Functional and high-level product capability overview
├── QUICKSTART.md           # Simple quick-start guidelines
├── PROJECT_STATUS.md       # [Created] Active project status and module breakdown (this document)
│
├── ai_modules/             # Core Active Modules (imported by the Renderer)
│   ├── ai.js               # Unified AI context, system prompt injection, and JSON action extraction
│   ├── voice.js            # Web Speech API recognition/synthesis with automated backoff logic
│   └── commands.js         # Keyword intent patterns and quick local command router
│
├── modules/                # Core Shared Modules
│   ├── automation.js       # Predefined & custom multi-step workflows (Start Work Mode, Deep Focus, EOD)
│   ├── storage.js          # Local data persistence with optional XOR encryption and backup/restore
│   ├── ai.js               # (Legacy) Simpler AI module without unified prompt structure (Inactive)
│   ├── voice.js            # (Legacy) Simpler voice module without advanced backoff handlers (Inactive)
│   └── commands.js         # Identical copy of commands router
│
├── renderer/               # Frontend UI Subsystem
│   ├── index.html          # Main HTML structure shell
│   ├── style.css           # Glassmorphism dark-theme style definitions and typography
│   └── app.js              # Main renderer controller (view router, streaming response handler, event hooks)
│
└── utils/                  # Shared Utility Files
    └── api.js              # Fetch client wrapper with auto-retry and streaming yield generators
```

---

## 🧠 3. Module & File Architecture

### 🖥️ Main Process (`main.js`)
*   **Window Management**: Controls window constraints (draggable/non-draggable areas), title bar custom styling, and split-screen mode configuration.
*   **Split-Screen Behavior**: When launching an app via the assistant (e.g., Chrome, Notepad, VS Code), it resizes itself to take the left half of the screen and resizes the launched app to take the right half using dynamic PowerShell positioning.
*   **Paste-To-App Emulation**: Provides direct writing injection into target windows by writing content to the clipboard and simulating keystrokes (`Ctrl + V`) via focused PowerShell scripts.
*   **OS Level Handlers**: Implements IPC bridges for folder creation (`create-folder`), file writing (`create-file`), file search (`search-files`), and system power settings (shutdown, restart, sleep, lock).

### 🛡️ Preload Bridge (`preload.js`)
*   Uses `contextBridge` to expose safe, selective APIs to the renderer client (such as environment accessors, system command execution, window controls, and file managers) while keeping `nodeIntegration` disabled.

### 🎨 Frontend UI (`renderer/`)
*   **Visual Style (`renderer/style.css`)**: Defines color tokens, glassmorphism blur layers, custom transitions, font hierarchies, active navigation indicator designs, and specific components (chat bubbles, app chip buttons, typing indicators).
*   **Client Core Logic (`renderer/app.js`)**:
    *   Imports and orchestrates modules from `ai_modules` and `modules`.
    *   Handles UI view switching (Chat, Write, Automation, Voice, Settings).
    *   Manages streaming responses using `marked.js` markdown rendering and `highlight.js` syntax coloring.
    *   Maintains the active linked application state for Direct Mode target injection.

### 🤖 Active AI Modules (`ai_modules/` & `modules/`)
1.  **`ai_modules/ai.js` (Active AI Engine)**:
    *   Constructs dynamic system prompts based on current runtime parameters (current time, OS platform, active applications, linked window).
    *   Uses a **Unified AI Reasoning** prompt model designed to return strict JSON instructions whenever a command, writing target, or automation sequence is needed.
    *   Includes a JSON extraction and cleanup parsing mechanism.
2.  **`ai_modules/voice.js` (Active Speech System)**:
    *   Translates speech inputs into command text streams using `webkitSpeechRecognition`.
    *   Implements an **exponential backoff restart** algorithm (from 150ms up to 10s delay) to handle brief micro-disconnections or API crashes without breaking hands-free continuous listening.
    *   Controls TTS readback rate, volume, pitch, and voice selection.
3.  **`ai_modules/commands.js` (Active Command Router)**:
    *   Uses regex pattern weighting to classify user queries into categories (`CHAT`, `TASK`, `AUTOMATION`, `WRITING`, `MESSAGE`).
    *   Implements instant local command bypasses (e.g., `time`, `date`, `help`, `clear`, `status`) to avoid API network latency.
4.  **`modules/automation.js` (Active Workflow Engine)**:
    *   Executes sequential macro instructions like opening folders, delay times, launching apps, system locks, or popup notifications.
    *   Includes presets: *Start Work Mode*, *Deep Focus*, *End of Day*.
5.  **`modules/storage.js` (Active Persistence Engine)**:
    *   Manages user settings, conversation history backups, API keys, and workflow profiles.
    *   Uses local file dialogues (`showSaveDialog`, `showOpenDialog`) to perform local file system export/import tasks.
    *   Supports lightweight XOR key encryption to obfuscate keys or credentials.

---

## 🛠️ 4. Build Scripts & Dependency Configuration

The application is structured inside `package.json` with scripts targeting developer testing and multi-platform packaging:

*   **Execution Commands**:
    *   `npm start`: Runs the Electron app in standard user mode.
    *   `npm run dev`: Runs Electron with chromium DevTools opened automatically.
*   **Builder Commands** (uses `electron-builder` configuration in `package.json`):
    *   `npm run build`: Compiles production package for the current OS.
    *   `npm run build:win`: Packages Windows installer files (`nsis` format with custom icons).
    *   `npm run build:mac`: Packages macOS disk image installers (`dmg` format).
    *   `npm run build:linux`: Packages portable Linux images (`AppImage` format).
*   **Key Node Dependencies**:
    *   `dotenv` (Config loading)
    *   `docx` & `exceljs` & `pptxgenjs` (File structures and generation APIs)
    *   `node-record-lpcm16` & `speech-to-text` (Alternative local voice processing hookups)

---

## 📈 5. Implemented Features & Design Highlights

| Feature Area | Implementation Mechanics | User Benefit / Experience |
| :--- | :--- | :--- |
| **Direct Mode (App Link)** | PowerShell window focusing + active app tracking + clipboard auto-injection. | AI can write directly into active workspace windows (e.g., VS Code, Word, Notepad) like a virtual typist. |
| **Split-Screen Layout** | Custom Win32 screen dimensions script via PowerShell. | Side-by-side view where the Assistant stays docked on the left, and launched apps align on the right. |
| **Command Engine Routing** | RegEx intent mapping + confidence scoring. | Instantly redirects system queries to local commands while sending conversational queries to Gemini. |
| **Voice Continuancy** | Automated retry + exponential delay backoff. | Prevents constant crashes of voice input, yielding a resilient hands-free voice control experience. |
| **Workflow Macros** | Sequence-based step engine with UI status outputs. | Performs compound tasks (like launching developer workspace tools) with one click. |
| **Data Encryption & Backups** | XOR obfuscation + JSON export file generation. | Local configurations and chats remain secure and can be moved between computers. |

---

## 🚀 6. Next Steps & Development Roadmap

1.  **Refactor Legacy Files**: Clean up unused legacy copies in the root of the `modules/` directory (specifically `modules/ai.js` and `modules/voice.js`) to prevent developer confusion.
2.  **Model Configuration Panel**: Expose model selection directly in the Settings view to switch between Google Gemini, Claude, and GPT models dynamically without modifying the `.env` file manually.
3.  **Local LLM Fallback**: Implement local routing to Ollama/LM Studio servers when there is no internet access.
4.  **Custom Key Configuration**: Provide custom hotkeys in Electron to summon or minimize the assistant globally.
