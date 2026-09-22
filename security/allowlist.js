// Shell Command Allowlist & Security Policy for ZetHub AI OS

export const ALLOWED_SHELL_COMMANDS = [
  /^dir(\s+.*)?$/i,
  /^ls(\s+.*)?$/i,
  /^echo(\s+.*)?$/i,
  /^node\s+--version$/i,
  /^npm\s+--version$/i,
  /^git\s+(status|log|branch|version)(\s+.*)?$/i,
  /^tasklist(\s+.*)?$/i,
  /^ipconfig(\s+.*)?$/i,
  /^ping\s+[\w.-]+$/i,
  /^whoami$/i,
  /^hostname$/i,
  /^systeminfo$/i,
  /^ver$/i
];

export const DESTRUCTIVE_ACTION_TYPES = [
  'delete_file',
  'delete_folder',
  'move_file_outside_project',
  'format_drive',
  'edit_registry',
  'kill_process',
  'uninstall_application',
  'send_email',
  'send_message',
  'system_shutdown',
  'system_restart',
  'unauthorized_shell_command'
];

export function isShellCommandAllowed(command) {
  if (!command || typeof command !== 'string') return false;
  const cleanCmd = command.trim();
  return ALLOWED_SHELL_COMMANDS.some(regex => regex.test(cleanCmd));
}

export function requiresUserConfirmation(actionType, parameters = {}, isShellAllowed = true) {
  if (DESTRUCTIVE_ACTION_TYPES.includes(actionType)) {
    return true;
  }
  if (actionType === 'run_shell_command' && !isShellAllowed) {
    return true;
  }
  if (actionType === 'delete_file' || actionType === 'delete_folder') {
    return true;
  }
  return false;
}
