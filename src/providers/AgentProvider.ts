import * as path from 'path';

export type AgentId = 'antigravity' | 'cursor' | 'windsurf';

export interface AgentProvider {
  id: AgentId;
  displayNameKey: string;
  getGlobalPaths(): string[];
  getProjectPaths(workspaceRoot: string): string[];
  getDefaultExcludes(): string[];
  getIgnoreFileName?(): string | undefined;
}

export function normalizeProjectPath(workspaceRoot: string, relativePath: string): string {
  return path.join(workspaceRoot, relativePath);
}
