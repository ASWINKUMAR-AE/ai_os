const { app, BrowserWindow, ipcMain, shell, dialog, screen, clipboard, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

// Load environment variables
require('dotenv').config();

let mainWindow;
let isRecording = false;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    titleBarStyle: 'hidden',
    frame: false,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Remove the default Electron menu
  Menu.setApplicationMenu(null);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Execute system commands (automation)
ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ success: false, error: error.message, stderr });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
});

// Open external applications
ipcMain.handle('open-app', async (event, appName) => {
  const platform = os.platform();
  let command;

  const appCommands = {
    win32: {
      'chrome': 'start chrome',
      'google chrome': 'start chrome',
      'firefox': 'start firefox',
      'edge': 'start msedge',
      'microsoft edge': 'start msedge',
      'notepad': 'start notepad',
      'calculator': 'start calc',
      'explorer': 'start explorer',
      'file explorer': 'start explorer',
      'vscode': 'start code',
      'visual studio code': 'start code',
      'spotify': 'start spotify',
      'discord': 'start discord',
      'word': 'start winword /w',
      'microsoft word': 'start winword /w',
      'excel': 'start excel',
      'microsoft excel': 'start excel',
      'powerpoint': 'start powerpnt',
      'microsoft powerpoint': 'start powerpnt',
      'outlook': 'start outlook',
      'teams': 'start teams',
      'microsoft teams': 'start teams',
      'cmd': 'start cmd',
      'command prompt': 'start cmd',
      'powershell': 'start powershell',
      'terminal': 'start wt',
      'settings': 'start ms-settings:',
      'control panel': 'start control',
      'whatsapp': 'start whatsapp://'
    },
    darwin: {
      'chrome': 'open -a "Google Chrome"',
      'google chrome': 'open -a "Google Chrome"',
      'firefox': 'open -a Firefox',
      'safari': 'open -a Safari',
      'vscode': 'open -a "Visual Studio Code"',
      'visual studio code': 'open -a "Visual Studio Code"',
      'spotify': 'open -a Spotify',
      'discord': 'open -a Discord',
      'terminal': 'open -a Terminal',
      'finder': 'open -a Finder',
      'word': 'open -a "Microsoft Word"',
      'microsoft word': 'open -a "Microsoft Word"',
      'excel': 'open -a "Microsoft Excel"',
      'microsoft excel': 'open -a "Microsoft Excel"',
      'powerpoint': 'open -a "Microsoft PowerPoint"',
      'microsoft powerpoint': 'open -a "Microsoft PowerPoint"',
      'teams': 'open -a "Microsoft Teams"',
      'microsoft teams': 'open -a "Microsoft Teams"'
    },
    linux: {
      'chrome': 'google-chrome',
      'google chrome': 'google-chrome',
      'firefox': 'firefox',
      'vscode': 'code',
      'visual studio code': 'code',
      'nautilus': 'nautilus',
      'files': 'nautilus',
      'terminal': 'gnome-terminal'
    }
  };

  // Try exact match first
  const normalizedName = appName.toLowerCase().trim();
  command = appCommands[platform]?.[normalizedName];

  // If no exact match, try to open using the name directly
  if (!command) {
    if (platform === 'win32') {
      command = `start "" "${appName}"`;
    } else if (platform === 'darwin') {
      command = `open -a "${appName}"`;
    } else {
      command = appName.toLowerCase().replace(/\s+/g, '-');
    }
  }

  return new Promise((resolve) => {
    exec(command, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        // Trigger split screen behavior if app name is recognized
        if (platform === 'win32') {
          handleWinSplitScreen(appName);
        }
        resolve({ success: true, message: `Opened ${appName}` });
      }
    });
  });
});

// Helper for split screen management on Windows
async function handleWinSplitScreen(appName) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
  
  // Position Assistant on the Left
  if (mainWindow) {
    mainWindow.setBounds({
      x: 0,
      y: 0,
      width: Math.floor(screenWidth / 2),
      height: screenHeight
    });
  }

  // App Mapping (Process & Window Titles)
  const appMapping = {
    'chrome': { title: 'Chrome', process: 'chrome' },
    'google chrome': { title: 'Chrome', process: 'chrome' },
    'firefox': { title: 'Firefox', process: 'firefox' },
    'edge': { title: 'Edge', process: 'msedge' },
    'microsoft edge': { title: 'Edge', process: 'msedge' },
    'notepad': { title: 'Notepad', process: 'notepad' },
    'calculator': { title: 'Calculator', process: 'CalculatorApp' },
    'vscode': { title: 'Code', process: 'Code' },
    'visual studio code': { title: 'Code', process: 'Code' },
    'word': { title: 'Word', process: 'winword' },
    'microsoft word': { title: 'Word', process: 'winword' },
    'excel': { title: 'Excel', process: 'excel' },
    'microsoft excel': { title: 'Excel', process: 'excel' },
    'powerpoint': { title: 'PowerPoint', process: 'powerpnt' },
    'microsoft powerpoint': { title: 'PowerPoint', process: 'powerpnt' },
    'cmd': { title: 'Prompt', process: 'cmd' },
    'powershell': { title: 'PowerShell', process: 'powershell' },
    'whatsapp': { title: 'WhatsApp', process: 'WhatsApp' }
  };

  const appInfo = appMapping[appName.toLowerCase().trim()] || { title: appName, process: appName };
  const appX = Math.floor(screenWidth / 2);
  const appWidth = Math.floor(screenWidth / 2);

  // Use a temporary script file to avoid quoting issues
  const scriptPath = path.join(app.getPath('userData'), 'move_window.ps1');
  
  const psScriptContent = `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class User32 {
        [DllImport("user32.dll")]
        public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern bool IsZoomed(IntPtr hWnd);
      }
"@

    $title = "${appInfo.title}"
    $procName = "${appInfo.process}"
    $retries = 15 # Wait up to 15 seconds
    $found = $false

    Write-Host "Searching for Process: $procName OR Title: $title"

    while ($retries -gt 0 -and -not $found) {
        $p = Get-Process | Where-Object { ($_.ProcessName -like "*$procName*" -or $_.MainWindowTitle -like "*$title*") -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($p) {
            $handle = $p.MainWindowHandle
            Write-Host "Found window for process $($p.ProcessName). Handle: $handle"
            
            # Restore if maximized
            if ([User32]::IsZoomed($handle)) {
                Write-Host "Window is maximized. Restoring..."
                [User32]::ShowWindow($handle, 9)
                Start-Sleep -Milliseconds 500
            }
            
            # Final Move
            $result = [User32]::MoveWindow($handle, ${appX}, 0, ${appWidth}, ${screenHeight}, $true)
            [User32]::SetForegroundWindow($handle)
            Write-Host "Window move result: $result"
            $found = $true
        } else {
            $retries--
            Start-Sleep -Milliseconds 1000
        }
    }
  `;

  try {
    fs.writeFileSync(scriptPath, psScriptContent);
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (stdout) console.log('PS Output:', stdout);
      if (stderr) console.error('PS Error:', stderr);
      // Clean up
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    });
  } catch (err) {
    console.error('Failed to execute window move script:', err);
  }
}

// Paste to application - focus and send Ctrl+V
ipcMain.handle('paste-to-app', async (event, { appName, text }) => {
  // 1. Write to clipboard
  clipboard.writeText(text);

  // 2. PowerShell to focus window and paste
  const appMapping = {
    'word': 'winword',
    'microsoft word': 'winword',
    'notepad': 'notepad',
    'chrome': 'chrome',
    'google chrome': 'chrome',
    'vscode': 'Code',
    'visual studio code': 'Code',
    'excel': 'excel',
    'microsoft excel': 'excel',
    'powerpoint': 'powerpnt',
    'microsoft powerpoint': 'powerpnt',
    'calculator': 'calc',
    'explorer': 'explorer',
    'teams': 'teams',
    'whatsapp': 'WhatsApp'
  };

  const procName = appMapping[appName.toLowerCase().trim()] || appName;
  const scriptName = `paste_text_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`;
  const scriptPath = path.join(app.getPath('userData'), scriptName);
  
  const psScript = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class User32 {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    }
"@
    $procName = "${procName}"
    $retries = 15
    $found = $false

    while ($retries -gt 0 -and -not $found) {
        $p = Get-Process | Where-Object { ($_.ProcessName -like "*$procName*" -or $_.MainWindowTitle -like "*$procName*") -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($p) {
            $handle = $p.MainWindowHandle
            # Restore if minimized and bring to front
            [User32]::ShowWindow($handle, 9) # 9 = Restore
            [User32]::SetForegroundWindow($handle)
            Start-Sleep -Milliseconds 800
            
            # Send keys more reliably
            $wshell = New-Object -ComObject WScript.Shell
            $wshell.SendKeys('^v')
            $found = $true
        } else {
            $retries--
            Start-Sleep -Milliseconds 1000
        }
    }
  `;

  try {
    fs.writeFileSync(scriptPath, psScript);
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    exec(command, () => {
       if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// File system operations
ipcMain.handle('create-folder', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') {
    return { success: false, error: 'Invalid folder path provided' };
  }

  try {
    // Resolve relative paths to home directory
    let fullPath = folderPath;
    if (!path.isAbsolute(folderPath)) {
      fullPath = path.join(os.homedir(), 'Documents', folderPath);
    }

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true, message: `Created folder: ${fullPath}` };
    }
    return { success: false, error: `Folder already exists at: ${fullPath}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create a file (empty or with content)
ipcMain.handle('create-file', async (event, { filePath, content }) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Invalid file path provided' };
  }

  try {
    let fullPath = filePath;

    // Resolve relative paths — default to My Documents
    if (!path.isAbsolute(filePath)) {
      fullPath = path.join(os.homedir(), 'Documents', filePath);
    }

    // Normalize slashes (handles D://sdf/ style paths)
    fullPath = path.normalize(fullPath);

    // Ensure parent directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file (create empty if no content)
    fs.writeFileSync(fullPath, content || '', 'utf8');
    return { success: true, message: `Created file: ${fullPath}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save document with content
ipcMain.handle('save-document', async (event, { title, content, format }) => {
  const options = {
    title: `Save ${title || 'Document'}`,
    defaultPath: path.join(os.homedir(), 'Documents', `${title || 'document'}.${format || 'txt'}`),
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  };

  if (format === 'docx') options.filters.unshift({ name: 'Word Document', extensions: ['docx'] });
  if (format === 'pdf') options.filters.unshift({ name: 'PDF Document', extensions: ['pdf'] });
  if (format === 'txt') options.filters.unshift({ name: 'Text File', extensions: ['txt'] });

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, options);
  
  if (canceled || !filePath) return { success: false, error: 'Save canceled' };

  try {
    fs.writeFileSync(filePath, content);
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-files', async (event, searchTerm, searchPath) => {
  try {
    const results = [];
    const searchDir = searchPath || os.homedir();

    function searchInDir(dir, term) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (item.toLowerCase().includes(term.toLowerCase())) {
          results.push({ name: item, path: fullPath, isDirectory: stat.isDirectory() });
        }

        if (stat.isDirectory() && !item.startsWith('.') && results.length < 50) {
          try {
            searchInDir(fullPath, term);
          } catch (e) {
            // Skip directories we can't access
          }
        }
      }
    }

    searchInDir(searchDir, searchTerm);
    return { success: true, results: results.slice(0, 20) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open file path with default application
ipcMain.handle('open-path', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Invalid file path' };
  }
  
  try {
    const error = await shell.openPath(filePath);
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// System control
ipcMain.handle('system-control', async (event, action) => {
  const platform = os.platform();
  let command;

  const commands = {
    win32: {
      shutdown: 'shutdown /s /t 0',
      restart: 'shutdown /r /t 0',
      sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
      lock: 'rundll32.exe user32.dll,LockWorkStation'
    },
    darwin: {
      shutdown: 'sudo shutdown -h now',
      restart: 'sudo shutdown -r now',
      sleep: 'pmset sleepnow',
      lock: '/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend'
    },
    linux: {
      shutdown: 'systemctl poweroff',
      restart: 'systemctl reboot',
      sleep: 'systemctl suspend',
      lock: 'gnome-screensaver-command -l || loginctl lock-session'
    }
  };

  command = commands[platform]?.[action];

  if (!command) {
    return { success: false, error: `Action '${action}' not supported on ${platform}` };
  }

  return new Promise((resolve) => {
    exec(command, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, message: `Executed: ${action}` });
      }
    });
  });
});

// Open external link
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Show save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Show open dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Get app data path
ipcMain.handle('get-app-data-path', async () => {
  return app.getPath('userData');
});

// Get environment variable
ipcMain.handle('get-env', async (event, key) => {
  return process.env[key];
});

// Log activity
ipcMain.handle('log-activity', async (event, activity) => {
  const logPath = path.join(app.getPath('userData'), 'activity.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${activity}\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
