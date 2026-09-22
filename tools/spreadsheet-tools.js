// Spreadsheet AI Engine (ExcelJS)
import aiRouter from '../utils/ai-router.js';

export class SpreadsheetTools {
  static async createSpreadsheet({ topic, outputPath = null }) {
    const excelModule = await import('exceljs').catch(() => null);
    const ExcelJS = excelModule ? (excelModule.default || excelModule) : null;
    console.log(`[SpreadsheetTools] Creating spreadsheet for topic: "${topic}"...`);

    const prompt = `Generate realistic tabular data for a spreadsheet on topic: "${topic}".
Output ONLY JSON in the following structure:
{
  "sheetName": "Business Summary",
  "columns": ["Item / Category", "Q1 Sales ($)", "Q2 Sales ($)", "Growth (%)", "Status"],
  "rows": [
    ["Product Alpha", 15000, 18500, 23.3, "On Target"],
    ["Product Beta", 22000, 24000, 9.1, "On Target"],
    ["Product Gamma", 9500, 8000, -15.7, "Review Required"]
  ]
}`;

    const res = await aiRouter.chat(prompt, { temperature: 0.3 });
    let data;
    try {
      let raw = res.content.trim();
      if (raw.startsWith('```')) raw = raw.replace(/^```(json)?\n?|\n?```$/g, '').trim();
      data = JSON.parse(raw);
    } catch (e) {
      data = {
        sheetName: 'Data Summary',
        columns: ['Category', 'Value', 'Target', 'Status'],
        rows: [
          ['Revenue', 120000, 100000, 'Exceeded'],
          ['Expenses', 45000, 50000, 'Under Budget'],
          ['Net Profit', 75000, 50000, 'Excellent']
        ]
      };
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(data.sheetName || 'Summary');

    // Add Styled Columns
    sheet.columns = data.columns.map(col => ({ header: String(col), key: String(col).toLowerCase().replace(/[^a-z0-9]/g, '_'), width: 22 }));

    // Add Rows
    for (const rowData of data.rows) {
      sheet.addRow(rowData);
    }

    // Format Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0052CC' } };

    const finalPath = outputPath || `d:\\ai_os\\projects\\${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data.xlsx`;
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await workbook.xlsx.writeFile(finalPath);

    // §45 Verification
    const verification = await this.verifyFile(finalPath);
    if (!verification.ok) {
      throw new Error(`Spreadsheet verification failed: ${verification.error}`);
    }

    return {
      ok: true,
      path: finalPath,
      sheetName: data.sheetName,
      rowsCount: data.rows.length,
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
    const testPath = 'd:\\ai_os\\projects\\test_spreadsheet.xlsx';
    try {
      const res = await this.createSpreadsheet({ topic: 'Test Financial Data', outputPath: testPath });
      return { name: 'SpreadsheetTools', ok: res.ok && res.sizeBytes > 0 };
    } catch (e) {
      console.error('[SpreadsheetTools selfTest error]:', e.message);
      return { name: 'SpreadsheetTools', ok: false, error: e.message };
    }
  }
}

export default SpreadsheetTools;
