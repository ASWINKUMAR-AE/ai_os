// Safe Action Validator - Enforces security and validation before action execution
import { isShellCommandAllowed, requiresUserConfirmation } from '../security/allowlist.js';

export class ActionValidator {
  constructor(registeredToolNames = []) {
    this.registeredToolNames = new Set(registeredToolNames);
  }

  isShellAllowed(command) {
    return isShellCommandAllowed(command);
  }

  isPathSafe(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return false;
    if (targetPath.includes('..') || targetPath.toLowerCase().includes('system32')) return false;
    return true;
  }

  setRegisteredTools(toolNames) {
    this.registeredToolNames = new Set(toolNames);
  }

  validatePlan(plan) {
    if (!plan || typeof plan !== 'object') {
      return { ok: false, error: 'Invalid plan structure' };
    }

    const validatedActions = [];
    let requiresConfirmationOverall = false;

    for (const action of (plan.actions || [])) {
      const validation = this.validateSingleAction(action);
      if (!validation.ok) {
        return { ok: false, error: `Action '${action.type}' failed validation: ${validation.error}` };
      }
      if (validation.requiresConfirmation) {
        requiresConfirmationOverall = true;
      }
      validatedActions.push(validation.action);
    }

    return {
      ok: true,
      plan: {
        ...plan,
        actions: validatedActions,
        requires_confirmation: plan.requires_confirmation || requiresConfirmationOverall
      }
    };
  }

  validateSingleAction(action) {
    if (!action || !action.type) {
      return { ok: false, error: 'Action missing required field "type"' };
    }

    const type = action.type;
    const params = action.parameters || {};

    // 1. Tool registry check (if registry initialized)
    if (this.registeredToolNames.size > 0 && !this.registeredToolNames.has(type)) {
      // Allow core system fallback actions
      const coreSystemActions = ['quick_response', 'clear_chat', 'chat_response', 'open_app', 'write_to_app', 'create_file', 'create_folder', 'search_files', 'system_control', 'create_document', 'run_workflow'];
      if (!coreSystemActions.includes(type)) {
        return { ok: false, error: `Action type '${type}' is not registered in tool system` };
      }
    }

    // 2. Shell command allowlist enforcement
    if (type === 'run_shell_command') {
      const cmd = params.command || params.cmd;
      const isAllowed = isShellCommandAllowed(cmd);
      if (!isAllowed) {
        return { 
          ok: false, 
          error: `Shell command '${cmd}' violates security policy and is not on the allowlist` 
        };
      }
    }

    // 3. Force confirmation check
    const isDestructive = requiresUserConfirmation(type, params);
    const validatedAction = {
      ...action,
      requires_confirmation: action.requires_confirmation || isDestructive
    };

    return {
      ok: true,
      action: validatedAction,
      requiresConfirmation: isDestructive
    };
  }
}

const actionValidator = new ActionValidator();
export default actionValidator;
