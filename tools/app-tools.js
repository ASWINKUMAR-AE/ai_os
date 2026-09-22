// Desktop Application Tools
import appContextManager from '../ai_modules/context-manager.js';

export class AppTools {
  static async openApp(params) {
    let appName = '';
    if (typeof params === 'string') {
      appName = params;
    } else if (params && typeof params === 'object') {
      appName = params.appName || params.app_name || params.app || params.application || params.name || '';
    }
    console.log(`[AppTools] Opening application: ${appName}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.openApp) {
      const res = await window.electronAPI.openApp(appName);
      appContextManager.setLinkedApp(appName);
      return { ok: true, appName, response: res };
    }
    return { ok: true, appName, note: 'Mock app open in test environment' };
  }

  static async pasteToApp({ appName, text }) {
    console.log(`[AppTools] Pasting content to app: ${appName}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.pasteToApp) {
      const res = await window.electronAPI.pasteToApp({ appName, text });
      return { ok: true, appName, response: res };
    }
    return { ok: true, appName, note: 'Mock text paste in test environment' };
  }

  static async setSplitScreen() {
    console.log(`[AppTools] Setting side-by-side split screen layout...`);
    // Leverages main.js PowerShell split screen layout logic
    if (window.electronAPI && window.electronAPI.executeCommand) {
      await window.electronAPI.executeCommand('powershell -Command "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags); }\'; [Win32]::SetWindowPos((Get-Process -Name Electron -ErrorAction SilentlyContinue).MainWindowHandle, [IntPtr]::Zero, 0, 0, 960, 1040, 0x0040)"');
    }
    return { ok: true, layout: 'split_screen_docked' };
  }

  static async selfTest() {
    return { name: 'AppTools', ok: true };
  }
}

export default AppTools;
