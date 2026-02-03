import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';
import { ConfigService } from './ConfigService';
import { getAllProviders } from '../providers';

export interface ProjectSyncStatus {
  hasWorkspace: boolean;
  isGitRepo: boolean;
  rootPath?: string;
  files: string[];
  totalFiles: number;
  message?: string;
}

const MAX_LISTED_FILES = 50;

export class ProjectSyncService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  async getStatus(): Promise<ProjectSyncStatus> {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      return {
        hasWorkspace: false,
        isGitRepo: false,
        files: [],
        totalFiles: 0,
        message: 'No workspace open'
      };
    }

    const rootPath = workspace.uri.fsPath;
    const projectPaths = this.getEnabledProjectPaths(rootPath);

    if (projectPaths.length === 0) {
      return {
        hasWorkspace: true,
        isGitRepo: false,
        rootPath,
        files: [],
        totalFiles: 0,
        message: 'No project paths enabled'
      };
    }

    const isGitRepo = this.isGitRepository(rootPath);

    if (isGitRepo) {
      const files = await this.getGitChangedFiles(rootPath, projectPaths);
      return {
        hasWorkspace: true,
        isGitRepo: true,
        rootPath,
        files: files.slice(0, MAX_LISTED_FILES),
        totalFiles: files.length
      };
    }

    const files = this.listFilesFromPaths(rootPath, projectPaths);

    return {
      hasWorkspace: true,
      isGitRepo: false,
      rootPath,
      files: files.slice(0, MAX_LISTED_FILES),
      totalFiles: files.length,
      message: 'Workspace is not a Git repository'
    };
  }

  private getEnabledProjectPaths(rootPath: string): string[] {
    const enabledAgents = this.configService.getEnabledAgents();
    const providers = getAllProviders();
    const projectPaths: string[] = [];

    for (const provider of providers) {
      if (!enabledAgents.includes(provider.id)) {
        continue;
      }
      const pathSettings = this.configService.getAgentPathSettings(provider.id);
      if (!pathSettings.projectEnabled) {
        continue;
      }
      projectPaths.push(...provider.getProjectPaths(rootPath));
    }

    return projectPaths;
  }

  private isGitRepository(rootPath: string): boolean {
    return fs.existsSync(path.join(rootPath, '.git'));
  }

  private async getGitChangedFiles(rootPath: string, projectPaths: string[]): Promise<string[]> {
    const git = simpleGit({ baseDir: rootPath, maxConcurrentProcesses: 1, trimmed: true });
    const raw = await git.raw(['status', '--porcelain']);
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const relativeTargets = projectPaths.map(p => this.normalizeRelativePath(rootPath, p));

    const files: string[] = [];
    for (const line of lines) {
      const filePath = this.parseGitStatusLine(line);
      if (!filePath) {
        continue;
      }

      const normalized = filePath.replace(/\\/g, '/');
      if (this.matchesProjectPath(normalized, relativeTargets)) {
        files.push(normalized);
      }
    }

    return Array.from(new Set(files));
  }

  private parseGitStatusLine(line: string): string | null {
    if (line.length < 3) {
      return null;
    }

    let filePath = line.slice(3).trim();
    if (!filePath) {
      return null;
    }

    if (filePath.includes('->')) {
      const parts = filePath.split('->');
      filePath = parts[parts.length - 1].trim();
    }

    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }

    return filePath;
  }

  private normalizeRelativePath(rootPath: string, absolutePath: string): string {
    return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
  }

  private matchesProjectPath(filePath: string, targets: string[]): boolean {
    for (const target of targets) {
      if (!target) {
        continue;
      }
      const normalizedTarget = target.replace(/\\/g, '/');
      if (filePath === normalizedTarget) {
        return true;
      }
      if (filePath.startsWith(`${normalizedTarget}/`)) {
        return true;
      }
    }
    return false;
  }

  private listFilesFromPaths(rootPath: string, projectPaths: string[]): string[] {
    const files: string[] = [];

    for (const projectPath of projectPaths) {
      if (!fs.existsSync(projectPath)) {
        continue;
      }
      const stat = fs.statSync(projectPath);
      if (stat.isFile()) {
        files.push(this.normalizeRelativePath(rootPath, projectPath));
        continue;
      }
      this.walkDirectory(rootPath, projectPath, files);
      if (files.length >= MAX_LISTED_FILES) {
        break;
      }
    }

    return files;
  }

  private walkDirectory(rootPath: string, dirPath: string, files: string[]): void {
    if (files.length >= MAX_LISTED_FILES) {
      return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.walkDirectory(rootPath, fullPath, files);
      } else {
        files.push(this.normalizeRelativePath(rootPath, fullPath));
        if (files.length >= MAX_LISTED_FILES) {
          return;
        }
      }
    }
  }
}
