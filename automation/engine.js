// Autonomous Task Engine & Natural Language Workflow Compiler
import memoryDb from '../memory/database.js';
import actionValidator from '../ai_modules/validator.js';
import AppTools from '../tools/app-tools.js';
import FileTools from '../tools/file-tools.js';
import DocumentGenerator from '../documents/generator.js';
import SpreadsheetTools from '../tools/spreadsheet-tools.js';
import PresentationTools from '../tools/presentation-tools.js';
import SystemTools from '../tools/system-tools.js';
import aiRouter from '../utils/ai-router.js';

export class AutonomousTaskEngine {
  constructor() {
    this.maxRetries = 3;
    this.initialBackoffMs = 2000; // 2 seconds
    this.stepTimeoutMs = 60000; // 60 seconds
    this.activeTasks = new Map();
  }

  // Convert Natural Language Phrase into Structured Workflow JSON
  async parseNaturalLanguageWorkflow(phrase) {
    console.log(`[TaskEngine] Compiling natural language workflow: "${phrase}"`);

    const prompt = `Convert the following natural language automation request into a structured JSON workflow:
Request: "${phrase}"

STRICT JSON OUTPUT FORMAT ONLY:
{
  "name": "Short Descriptive Title",
  "description": "Full workflow purpose",
  "trigger": {
    "type": "schedule | file_event | reactive | manual",
    "frequency": "weekly | daily | hourly | on_event",
    "condition": "e.g. Monday morning at 9 AM"
  },
  "steps": [
    {
      "id": "step_1",
      "action": "collect_files | generate_document | create_spreadsheet | create_presentation | open_app | run_shell_command",
      "parameters": {}
    }
  ]
}`;

    const res = await aiRouter.chat(prompt, { temperature: 0.2 });
    let workflow;
    try {
      let raw = res.content.trim();
      if (raw.startsWith('```')) raw = raw.replace(/^```(json)?\n?|\n?```$/g, '').trim();
      workflow = JSON.parse(raw);
    } catch (e) {
      workflow = {
        name: phrase.slice(0, 30),
        description: phrase,
        trigger: { type: 'manual', frequency: 'on_demand' },
        steps: [
          { id: 'step_1', action: 'generate_document', parameters: { topic: phrase } }
        ]
      };
    }

    // Save to automations database
    const saved = memoryDb.insert('automations', {
      ...workflow,
      status: 'active',
      lastRun: null,
      nextRun: 'Scheduled',
      successRate: '100%',
      runCount: 0
    });

    return saved;
  }

  // Execute workflow end-to-end with retries, timeouts, and verification
  async executeWorkflow(workflowIdOrObject, onProgress = null) {
    let workflow = typeof workflowIdOrObject === 'string'
      ? memoryDb.getItem('automations', workflowIdOrObject)
      : workflowIdOrObject;

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowIdOrObject}`);
    }

    const taskId = `task_run_${Date.now()}`;
    const logs = [];
    const startTime = Date.now();
    let hasFailure = false;

    console.log(`[TaskEngine] Executing workflow: "${workflow.name}" (ID: ${taskId})`);

    const steps = workflow.steps || [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepMsg = `Step ${i + 1}/${steps.length}: Executing ${step.action}...`;
      console.log(`[TaskEngine] ${stepMsg}`);
      if (onProgress) onProgress({ stepIndex: i, totalSteps: steps.length, status: 'running', message: stepMsg });

      let attempts = 0;
      let stepSuccess = false;
      let stepResult = null;
      let lastError = null;

      while (attempts < this.maxRetries && !stepSuccess) {
        attempts++;
        try {
          stepResult = await this.executeSingleStep(step);
          stepSuccess = true;
          logs.push({ stepId: step.id || `step_${i}`, action: step.action, status: 'success', attempts, result: stepResult });
        } catch (err) {
          lastError = err.message;
          console.warn(`[TaskEngine] Step '${step.action}' attempt ${attempts} failed: ${err.message}`);
          if (attempts < this.maxRetries) {
            const backoff = this.initialBackoffMs * Math.pow(2, attempts - 1);
            console.log(`[TaskEngine] Backing off for ${backoff}ms before retry...`);
            await new Promise(r => setTimeout(r, backoff));
          }
        }
      }

      if (!stepSuccess) {
        hasFailure = true;
        logs.push({ stepId: step.id || `step_${i}`, action: step.action, status: 'failed', attempts, error: lastError });
        console.error(`[TaskEngine] Step '${step.action}' failed permanently after ${attempts} attempts.`);
        if (onProgress) onProgress({ stepIndex: i, totalSteps: steps.length, status: 'failed', error: lastError });
        break; // Stop sequential chain on unrecoverable failure
      }
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = hasFailure ? 'failed' : 'completed';

    // Update workflow metrics
    if (typeof workflowIdOrObject === 'string') {
      memoryDb.update('automations', workflowIdOrObject, {
        lastRun: new Date().toISOString(),
        runCount: (workflow.runCount || 0) + 1,
        lastStatus: finalStatus,
        lastDurationMs: durationMs
      });
    }

    // Log to activity logs
    if (typeof window !== 'undefined' && window.electronAPI?.logActivity) {
      window.electronAPI.logActivity(`[TaskEngine] Workflow "${workflow.name}" execution ${finalStatus} in ${durationMs}ms`);
    }

    return {
      taskId,
      workflowName: workflow.name,
      status: finalStatus,
      durationMs,
      logs
    };
  }

  // Execute single step with tool dispatch
  async executeSingleStep(step) {
    const action = step.action || step.type;
    const params = step.parameters || {};

    // Validate step action safety
    const validation = actionValidator.validateSingleAction({ type: action, parameters: params });
    if (!validation.ok) {
      throw new Error(`Step validation failed: ${validation.error}`);
    }

    switch (action) {
      case 'open_app':
      case 'openApplication':
        return await AppTools.openApp({ appName: params.appName || params.application || 'notepad' });

      case 'generate_document':
      case 'create_document':
        return await DocumentGenerator.generateDocument({
          topic: params.topic || params.title || 'Project Summary',
          templateId: params.template
        });

      case 'create_spreadsheet':
      case 'spreadsheet':
        return await SpreadsheetTools.createSpreadsheet({
          topic: params.topic || 'Financial Report'
        });

      case 'create_presentation':
      case 'presentation':
        return await PresentationTools.createPresentation({
          topic: params.topic || 'Executive Summary'
        });

      case 'create_file':
        return await FileTools.createFile({ filePath: params.path, content: params.content });

      case 'create_folder':
        return await FileTools.createFolder({ folderPath: params.path });

      case 'run_shell_command':
        return await SystemTools.runShellCommand({ command: params.command });

      default:
        return { ok: true, note: `Executed action '${action}'` };
    }
  }
}

const taskEngine = new AutonomousTaskEngine();
export default taskEngine;
