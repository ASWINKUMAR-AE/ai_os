// Comprehensive System Verification Test Suite (ZetHub AI OS)
import providerManager, { HositProvider, OpenRouterProvider, LocalProvider } from '../utils/provider-manager.js';
import aiOrchestrator from '../ai_modules/orchestrator.js';
import actionValidator from '../ai_modules/validator.js';
import memoryDb from '../memory/database.js';
import MigrationManager from '../memory/migration.js';
import ProjectManager from '../projects/manager.js';
import TaskManager from '../tasks/manager.js';
import DocumentGenerator from '../documents/generator.js';
import SpreadsheetTools from '../tools/spreadsheet-tools.js';
import PresentationTools from '../tools/presentation-tools.js';
import AppTools from '../tools/app-tools.js';
import FileTools from '../tools/file-tools.js';
import SystemTools from '../tools/system-tools.js';
import ResearchTools from '../tools/research-tools.js';
import taskEngine from '../automation/engine.js';

export async function runAllSystemTests() {
  console.log('\n======================================================');
  console.log('🧪 ZETHUB AI OS — COMPREHENSIVE SYSTEM VERIFICATION');
  console.log('======================================================\n');

  const results = {
    providers: false,
    orchestrator: false,
    security: false,
    migration: false,
    projectWorkspace: false,
    taskPlanner: false,
    documents: false,
    spreadsheet: false,
    presentation: false,
    taskEngine: false,
    tools: false
  };

  // 1. AI Provider System Health Check
  console.log('--- 1. Testing AI Provider System ---');
  try {
    const hosit = new HositProvider({ apiUrl: 'http://106.51.21.4:8000/api/chat', userId: 'verify_user' });
    const openRouter = new OpenRouterProvider({ apiKey: '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' });
    providerManager.registerProvider('hosit', hosit);
    providerManager.registerProvider('openrouter', openRouter);
    providerManager.setActiveProvider('hosit');

    const hositHealth = await hosit.healthCheck();
    console.log('Hosit Provider Health:', hositHealth.status);
    results.providers = hositHealth.status === 'healthy';
  } catch (e) {
    console.error('Provider test failed:', e.message);
  }

  // 2. AI Orchestrator Test
  console.log('\n--- 2. Testing AI Orchestrator ---');
  try {
    const fastTime = aiOrchestrator.detectFastPathIntent('time');
    const fastApp = aiOrchestrator.detectFastPathIntent('open Chrome');
    console.log('Fast-path Intent "time":', fastTime?.intent === 'SYSTEM_COMMAND' ? 'PASS' : 'FAIL');
    console.log('Fast-path Intent "open Chrome":', fastApp?.intent === 'SYSTEM_COMMAND' ? 'PASS' : 'FAIL');

    const aiPlan = await aiOrchestrator.processRequest('Prepare my weekly business report');
    console.log('AI Reasoning Plan Intent:', aiPlan.intent);
    results.orchestrator = !!aiPlan.intent;
  } catch (e) {
    console.error('Orchestrator test failed:', e.message);
  }

  // 3. Security & Safe Action Validation Test
  console.log('\n--- 3. Testing Security & Validator ---');
  try {
    const valSafe = actionValidator.validateSingleAction({ type: 'create_file', parameters: { path: 'test.txt' } });
    const valUnsafe = actionValidator.validateSingleAction({ type: 'delete_file', parameters: { path: 'test.txt' } });
    const valShellBlocked = actionValidator.validateSingleAction({ type: 'run_shell_command', parameters: { command: 'rm -rf /' } });

    console.log('Safe action allowed:', valSafe.ok);
    console.log('Destructive action confirmation forced:', valUnsafe.requiresConfirmation);
    console.log('Dangerous shell command blocked:', !valShellBlocked.ok);

    results.security = valSafe.ok && valUnsafe.requiresConfirmation && !valShellBlocked.ok;
  } catch (e) {
    console.error('Security test failed:', e.message);
  }

  // 4. Memory & Storage Migration Test
  console.log('\n--- 4. Testing Memory & Migration ---');
  try {
    const mig = MigrationManager.migrate();
    console.log('Migration status:', mig.success ? 'PASS' : 'FAIL');
    console.log('Post-migration counts:', mig.afterCounts);
    results.migration = mig.success;
  } catch (e) {
    console.error('Migration test failed:', e.message);
  }

  // 5. Project Workspace & Tasks Test
  console.log('\n--- 5. Testing Project Workspace & Task Planner ---');
  try {
    const proj = ProjectManager.createProject('ZetHub Marketing Platform', 'AI marketing campaign platform');
    ProjectManager.setActiveProject(proj.id);
    const activeProj = ProjectManager.resolveActiveProject();
    console.log('Project creation & resolution:', activeProj?.name === 'ZetHub Marketing Platform' ? 'PASS' : 'FAIL');

    const task = TaskManager.createTask('Launch Website', 'Prepare launch assets', 'high', null, proj.id);
    console.log('Task creation:', task.title === 'Launch Website' ? 'PASS' : 'FAIL');

    results.projectWorkspace = !!activeProj;
    results.taskPlanner = !!task;
  } catch (e) {
    console.error('Project/Task test failed:', e.message);
  }

  // 6. Document Studio DOCX Generation & §45 Verification
  console.log('\n--- 6. Testing DOCX Generation & §45 Verification ---');
  try {
    const docPath = 'd:\\ai_os\\projects\\verification_project_report.docx';
    const docRes = await DocumentGenerator.generateDocument({
      topic: 'ZetHub AI Operating System',
      templateId: 'project_report',
      outputPath: docPath
    });

    console.log('DOCX Created:', docRes.ok, '| Size:', docRes.sizeBytes, 'bytes');
    results.documents = docRes.ok && docRes.sizeBytes > 0;
  } catch (e) {
    console.error('DOCX generation test failed:', e.message);
  }

  // 7. Spreadsheet AI & §45 Verification
  console.log('\n--- 7. Testing Spreadsheet AI (ExcelJS) & §45 Verification ---');
  try {
    const xlsxRes = await SpreadsheetTools.selfTest();
    console.log('Spreadsheet self-test:', xlsxRes.ok ? 'PASS' : 'FAIL');
    results.spreadsheet = xlsxRes.ok;
  } catch (e) {
    console.error('Spreadsheet test failed:', e.message);
  }

  // 8. Presentation AI & §45 Verification
  console.log('\n--- 8. Testing Presentation AI (PptxGenJS) & §45 Verification ---');
  try {
    const pptxRes = await PresentationTools.selfTest();
    console.log('Presentation self-test:', pptxRes.ok ? 'PASS' : 'FAIL');
    results.presentation = pptxRes.ok;
  } catch (e) {
    console.error('Presentation test failed:', e.message);
  }

  // 9. Autonomous Task Engine Test
  console.log('\n--- 9. Testing Autonomous Task Engine ---');
  try {
    const wf = await taskEngine.parseNaturalLanguageWorkflow('Every Monday morning prepare my weekly status report');
    console.log('NL Workflow compilation:', wf.name ? 'PASS' : 'FAIL');

    const execRes = await taskEngine.executeWorkflow(wf);
    console.log('Workflow execution status:', execRes.status);
    results.taskEngine = execRes.status === 'completed';
  } catch (e) {
    console.error('Task Engine test failed:', e.message);
  }

  // 10. Desktop Tools Self-Tests
  console.log('\n--- 10. Testing Desktop Tool Suite Self-Tests ---');
  try {
    const appT = await AppTools.selfTest();
    const fileT = await FileTools.selfTest();
    const sysT = await SystemTools.selfTest();
    const resT = await ResearchTools.selfTest();

    const allToolsOk = appT.ok && fileT.ok && sysT.ok && resT.ok;
    console.log('Tools suite self-test:', allToolsOk ? 'PASS' : 'FAIL');
    results.tools = allToolsOk;
  } catch (e) {
    console.error('Tools test failed:', e.message);
  }

  console.log('\n======================================================');
  console.log('📊 FINAL SYSTEM VERIFICATION SUMMARY');
  console.log('======================================================');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

export default runAllSystemTests;
