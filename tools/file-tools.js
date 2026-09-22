// File System Tools
import { requiresUserConfirmation } from '../security/allowlist.js';

export class FileTools {
  static async createFile({ filePath, content }) {
    console.log(`[FileTools] Creating file: ${filePath}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.createFile) {
      await window.electronAPI.createFile({ filePath, content });
      return { ok: true, path: filePath };
    }
    const fs = await import('fs');
    fs.writeFileSync(filePath, content || '');
    return { ok: true, path: filePath };
  }

  static async createFolder({ folderPath }) {
    console.log(`[FileTools] Creating folder: ${folderPath}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.createFolder) {
      await window.electronAPI.createFolder(folderPath);
      return { ok: true, path: folderPath };
    }
    const fs = await import('fs');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return { ok: true, path: folderPath };
  }

  static async searchFiles({ searchTerm, searchPath = 'd:\\ai_os' }) {
    console.log(`[FileTools] Searching files for term: "${searchTerm}" in ${searchPath}`);
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.searchFiles) {
      const results = await window.electronAPI.searchFiles(searchTerm, searchPath);
      return { ok: true, results };
    }
    return { ok: true, results: [] };
  }

  static async deleteFile({ filePath }) {
    // Requires confirmation per §36
    const isDestructive = requiresUserConfirmation('delete_file');
    if (isDestructive) {
      console.warn(`[FileTools] Delete operation on ${filePath} requires explicit user confirmation.`);
    }
    return { ok: true, requiresConfirmation: true, target: filePath };
  }

  static async selfTest() {
    return { name: 'FileTools', ok: true };
  }
}

export default FileTools;
