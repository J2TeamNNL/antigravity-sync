import * as os from 'os';
import * as path from 'path';
import { AgentProvider, normalizeProjectPath } from './AgentProvider';

export class WindsurfProvider implements AgentProvider {
  id: 'windsurf' = 'windsurf';
  displayNameKey = 'agent.windsurf';

  getGlobalPaths(): string[] {
    return [path.join(os.homedir(), '.codeium', 'windsurf')];
  }

  getProjectPaths(workspaceRoot: string): string[] {
    return [normalizeProjectPath(workspaceRoot, '.windsurf')];
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
