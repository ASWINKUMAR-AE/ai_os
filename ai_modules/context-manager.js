// Application-Aware Context Manager & Application Registry (Direct Mode 2.0)
export class ApplicationContextManager {
  constructor() {
    this.registry = new Map([
      ['word', { names: ['word', 'microsoft word', 'ms word', 'winword'], exe: 'WINWORD.EXE', role: 'document_editor' }],
      ['excel', { names: ['excel', 'microsoft excel', 'ms excel'], exe: 'EXCEL.EXE', role: 'spreadsheet_editor' }],
      ['powerpoint', { names: ['powerpoint', 'ppt', 'microsoft powerpoint'], exe: 'POWERPNT.EXE', role: 'presentation_editor' }],
      ['vscode', { names: ['vscode', 'code', 'visual studio code'], exe: 'Code.exe', role: 'code_editor' }],
      ['chrome', { names: ['chrome', 'google chrome'], exe: 'chrome.exe', role: 'browser' }],
      ['notepad', { names: ['notepad', 'text editor'], exe: 'notepad.exe', role: 'text_editor' }],
      ['terminal', { names: ['terminal', 'powershell', 'cmd', 'bash'], exe: 'powershell.exe', role: 'command_line' }],
      ['explorer', { names: ['explorer', 'file explorer'], exe: 'explorer.exe', role: 'file_manager' }]
    ]);

    this.activeAppName = null;
    this.linkedAppName = null; // Direct mode link
  }

  setLinkedApp(appName) {
    this.linkedAppName = appName;
    console.log(`[AppContext] Linked application set to: ${appName}`);
  }

  clearLinkedApp() {
    this.linkedAppName = null;
  }

  registerCustomApp(id, aliases, executable, role = 'general') {
    this.registry.set(id.toLowerCase(), {
      names: aliases.map(a => a.toLowerCase()),
      exe: executable,
      role
    });
  }

  getAppInfo(appName) {
    if (!appName) return null;
    const clean = appName.toLowerCase();
    for (const [id, info] of this.registry.entries()) {
      if (id === clean || info.names.includes(clean) || info.exe.toLowerCase() === clean) {
        return { id, ...info };
      }
    }
    return { id: clean, names: [clean], exe: `${clean}.exe`, role: 'general' };
  }

  getContextPrompt(targetAppName = null) {
    const appToUse = targetAppName || this.linkedAppName || this.activeAppName;
    const info = this.getAppInfo(appToUse);

    if (!info) return 'General Desktop Assistant Context';

    switch (info.role) {
      case 'document_editor':
        return `ACTIVE APP: Microsoft Word / Document Editor. Focus on document formatting, report generation, grammar improvement, cover pages, and DOCX structures.`;
      case 'code_editor':
        return `ACTIVE APP: VS Code / Code Editor. Focus on code generation, debugging, refactoring, file inspection, and developer workflows.`;
      case 'spreadsheet_editor':
        return `ACTIVE APP: Microsoft Excel / Spreadsheet. Focus on data cleaning, formulas, table formatting, KPI calculation, and chart generation.`;
      case 'presentation_editor':
        return `ACTIVE APP: PowerPoint / Presentation. Focus on slide structure, executive summaries, agenda creation, and speaker notes.`;
      case 'browser':
        return `ACTIVE APP: Web Browser. Focus on web research, page summarization, information extraction, and link navigation.`;
      default:
        return `ACTIVE APP: ${appToUse}. Focus on desktop task execution and app-specific automation.`;
    }
  }
}

const appContextManager = new ApplicationContextManager();
export default appContextManager;
