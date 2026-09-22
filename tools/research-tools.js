// Research & File Intelligence Agent
import aiRouter from '../utils/ai-router.js';

export class ResearchTools {
  static async analyzeFiles({ searchPath = 'd:\\ai_os', searchTerm = '' }) {
    console.log(`[ResearchTools] Analyzing files in ${searchPath}...`);

    let fileList = [];
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.searchFiles) {
      fileList = await window.electronAPI.searchFiles(searchTerm || '*', searchPath);
    }

    const fileSummary = fileList.map(f => `- ${f.name} (${f.sizeBytes || 0} bytes)`).join('\n');

    const prompt = `Analyze the following file structure and prepare a concise research summary:
Files Found:
${fileSummary || 'No specific files listed.'}

Provide:
1. Executive Overview of local files
2. Key Topics Detected
3. Actionable Next Steps`;

    const res = await aiRouter.chat(prompt, { temperature: 0.5 });
    return {
      ok: true,
      filesAnalyzed: fileList.length,
      summary: res.content
    };
  }

  static async summarizePageContent(urlOrText) {
    const prompt = `Summarize the following content into bullet points highlighting core facts:
"${urlOrText.slice(0, 3000)}"`;

    const res = await aiRouter.chat(prompt, { temperature: 0.3 });
    return {
      ok: true,
      summary: res.content
    };
  }

  static async selfTest() {
    return { name: 'ResearchTools', ok: true };
  }
}

export default ResearchTools;
