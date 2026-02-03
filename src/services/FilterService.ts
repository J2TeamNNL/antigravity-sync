/**
 * FilterService - Handles file filtering for sensitive data protection
 */
import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';

export class FilterService {
  private ig: Ignore;
  private basePath: string;
  private ignoreFileName?: string;

  constructor(basePath: string, customPatterns: string[] = [], ignoreFileName?: string) {
    this.basePath = basePath;
    this.ignoreFileName = ignoreFileName;
    this.ig = ignore();

    if (customPatterns.length > 0) {
      this.ig.add(customPatterns);
    }

    this.loadIgnoreFile();
  }

  /**
   * Load custom ignore patterns from ignore file if configured
   */
  private loadIgnoreFile(): void {
    if (!this.ignoreFileName) {
      return;
    }

    const ignoreFilePath = path.join(this.basePath, this.ignoreFileName);

    if (fs.existsSync(ignoreFilePath)) {
      const content = fs.readFileSync(ignoreFilePath, 'utf-8');
      const patterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      if (patterns.length > 0) {
        this.ig.add(patterns);
      }
    }
  }

  /**
   * Check if a file should be ignored
   */
  shouldIgnore(relativePath: string): boolean {
    return this.ig.ignores(relativePath);
  }

  /**
   * Filter a list of files, returning only those that should be synced
   */
  filterFiles(files: string[]): string[] {
    return files.filter(file => !this.shouldIgnore(file));
  }

  /**
   * Get all files that should be synced from the gemini directory
   */
  async getFilesToSync(): Promise<string[]> {
    const files: string[] = [];
    await this.walkDirectory(this.basePath, '', files);
    return files;
  }

  /**
   * Recursively walk directory and collect non-ignored files
   */
  private async walkDirectory(basePath: string, relativePath: string, files: string[]): Promise<void> {
    const currentPath = path.join(basePath, relativePath);

    if (!fs.existsSync(currentPath)) {
      return;
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

      // Check if should be ignored
      if (this.shouldIgnore(entryRelativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(basePath, entryRelativePath, files);
      } else {
        files.push(entryRelativePath);
      }
    }
  }
}
