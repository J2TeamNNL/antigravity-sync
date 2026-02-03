import * as os from 'os';
import * as path from 'path';
import { AgentProvider, normalizeProjectPath } from './AgentProvider';

export class CursorProvider implements AgentProvider {
  id: 'cursor' = 'cursor';
  displayNameKey = 'agent.cursor';

  getGlobalPaths(): string[] {
    return [path.join(os.homedir(), '.cursor')];
  }

  getProjectPaths(workspaceRoot: string): string[] {
    return [
      normalizeProjectPath(workspaceRoot, '.cursor'),
      normalizeProjectPath(workspaceRoot, '.cursorrules')
    ];
  }

  getDefaultExcludes(): string[] {
    return [
      '.DS_Store',
      'Thumbs.db',
      '.git/',
      '**/node_modules/',
      '**/*.log'
    ];
  }
}
