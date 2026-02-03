import * as os from 'os';
import * as path from 'path';
import { AgentProvider, normalizeProjectPath } from './AgentProvider';

export class AntigravityProvider implements AgentProvider {
  id: 'antigravity' = 'antigravity';
  displayNameKey = 'agent.antigravity';

  getGlobalPaths(): string[] {
    return [path.join(os.homedir(), '.gemini', 'antigravity')];
  }

  getProjectPaths(workspaceRoot: string): string[] {
    return [
      normalizeProjectPath(workspaceRoot, '.agent'),
      normalizeProjectPath(workspaceRoot, 'GEMINI.md')
    ];
  }

  getDefaultExcludes(): string[] {
    return [
      // Antigravity internal - NOT needed for sync (both root and nested)
      'antigravity-browser-profile/**',
      '**/browser_recordings/**',
      '**/code_tracker/**',
      '**/context_state/**',
      '**/implicit/**',
      '**/playground/**',

      // Config files that are machine-specific
      '**/browserAllowlist.txt',
      '**/browserOnboardingStatus.txt',
      '**/installation_id',
      '**/user_settings.pb',

      // OAuth and credentials
      'google_accounts.json',
      'oauth_creds.json',
      '**/credentials.json',
      '**/secrets.json',
      '**/*.key',
      '**/*.pem',

      // Large binary files
      '**/*.webm',
      '**/*.mp4',
      '**/*.mov',
      '**/*.webp',

      // Temp/log files (NOT *.pb - conversations are .pb files!)
      '**/*.log',
      '**/node_modules/',

      // System files
      '.DS_Store',
      'Thumbs.db',

      // Git internals (handled by git itself, but just in case)
      '.git/'
    ];
  }

  getIgnoreFileName(): string {
    return '.antigravityignore';
  }
}
