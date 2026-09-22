// System Control & Power Tools
import { isShellCommandAllowed, requiresUserConfirmation } from '../security/allowlist.js';

export class SystemTools {
  static async systemControl({ action }) {
    console.log(`[SystemTools] System power action: ${action}`);
    if (['shutdown', 'restart'].includes(action)) {
      const isDestructive = requiresUserConfirmation(`system_${action}`);
      return { ok: true, requiresConfirmation: isDestructive, action };
    }
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.systemControl) {
      await window.electronAPI.systemControl(action);
    }
    return { ok: true, action };
  }

  static async runShellCommand({ command }) {
    const isAllowed = isShellCommandAllowed(command);
    if (!isAllowed) {
      throw new Error(`Security Exception: Command '${command}' is not on the shell allowlist.`);
    }

    console.log(`[SystemTools] Executing allowed shell command: ${command}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.executeCommand) {
      const output = await window.electronAPI.executeCommand(command);
      return { ok: true, output };
    }
    return { ok: true, output: 'Executed in test env' };
  }

  static async selfTest() {
    const testAllowed = isShellCommandAllowed('node --version');
    const testForbidden = isShellCommandAllowed('rm -rf /');
    return { name: 'SystemTools', ok: testAllowed && !testForbidden };
  }
}

export default SystemTools;
