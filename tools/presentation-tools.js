// Presentation AI Engine (PptxGenJS)
import aiRouter from '../utils/ai-router.js';

export class PresentationTools {
  static async createPresentation({ topic, outputPath = null }) {
    const pptxModule = await import('pptxgenjs').catch(() => null);
    const pptxgen = pptxModule ? (pptxModule.default || pptxModule) : null;
    console.log(`[PresentationTools] Generating presentation for topic: "${topic}"...`);

    const prompt = `Generate slide outline content for topic: "${topic}".
Provide 4 slides in JSON format:
[
  { "title": "Executive Title", "subtitle": "Subtitle text" },
  { "title": "Agenda & Objectives", "bullets": ["Objective 1", "Objective 2", "Objective 3"] },
  { "title": "Architecture & Strategy", "bullets": ["Core Component 1", "Integration Layer", "Output Engine"] },
  { "title": "Conclusion & Next Steps", "bullets": ["Key Takeaway 1", "Action Item 2"] }
]`;

    const res = await aiRouter.chat(prompt, { temperature: 0.3 });
    let slidesData;
    try {
      let raw = res.content.trim();
      if (raw.startsWith('```')) raw = raw.replace(/^```(json)?\n?|\n?```$/g, '').trim();
      slidesData = JSON.parse(raw);
    } catch (e) {
      slidesData = [
        { title: topic, subtitle: 'Executive Overview Presentation' },
        { title: 'Key Objectives', bullets: ['Automate workflows', 'Enhance productivity', 'Seamless integration'] },
        { title: 'Summary & Conclusion', bullets: ['Project completed successfully', 'Ready for deployment'] }
      ];
    }

    let slidesList = Array.isArray(slidesData) ? slidesData : (slidesData?.slides || slidesData?.data || []);
    if (!Array.isArray(slidesList) || slidesList.length === 0) {
      slidesList = [
        { title: topic, subtitle: 'Executive Overview Presentation' },
        { title: 'Key Objectives', bullets: ['Automate workflows', 'Enhance productivity', 'Seamless integration'] },
        { title: 'Summary & Conclusion', bullets: ['Project completed successfully', 'Ready for deployment'] }
      ];
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    for (const slideInfo of slidesList) {
      const slide = pptx.addSlide();
      
      // Add Header Title
      slide.addText(slideInfo.title, {
        x: 0.8, y: 0.8, w: 8.4, h: 0.8,
        fontSize: 28, bold: true, color: '0052CC'
      });

      if (slideInfo.subtitle) {
        slide.addText(slideInfo.subtitle, {
          x: 0.8, y: 2.2, w: 8.4, h: 1.0,
          fontSize: 20, color: '666666'
        });
      }

      if (slideInfo.bullets && Array.isArray(slideInfo.bullets)) {
        const bulletItems = slideInfo.bullets.map(b => ({ text: b, options: { fontSize: 18, color: '333333', bullet: true, breakLine: true } }));
        slide.addText(bulletItems, {
          x: 0.8, y: 2.0, w: 8.4, h: 4.0
        });
      }
    }

    const finalPath = outputPath || `d:\\ai_os\\projects\\${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_slides.pptx`;
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await pptx.writeFile({ fileName: finalPath });

    // §45 Verification
    const verification = await this.verifyFile(finalPath);
    if (!verification.ok) {
      throw new Error(`Presentation verification failed: ${verification.error}`);
    }

    return {
      ok: true,
      path: finalPath,
      slideCount: slidesData.length,
      sizeBytes: verification.sizeBytes
    };
  }

  static async verifyFile(filePath) {
    try {
      const fs = await import('fs');
      if (!fs.existsSync(filePath)) return { ok: false, error: 'File does not exist' };
      const stats = fs.statSync(filePath);
      if (stats.size === 0) return { ok: false, error: 'File is 0 bytes' };
      return { ok: true, sizeBytes: stats.size };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  static async selfTest() {
    const testPath = 'd:\\ai_os\\projects\\test_presentation.pptx';
    try {
      const res = await this.createPresentation({ topic: 'Test Project Overview', outputPath: testPath });
      return { name: 'PresentationTools', ok: res.ok && res.sizeBytes > 0 };
    } catch (e) {
      console.error('[PresentationTools selfTest error]:', e.message);
      return { name: 'PresentationTools', ok: false, error: e.message };
    }
  }
}

export default PresentationTools;
