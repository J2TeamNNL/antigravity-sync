import { AgentProvider, AgentId } from './AgentProvider';
import { AntigravityProvider } from './AntigravityProvider';
import { CursorProvider } from './CursorProvider';
import { WindsurfProvider } from './WindsurfProvider';

const PROVIDERS: AgentProvider[] = [
  new AntigravityProvider(),
  new CursorProvider(),
  new WindsurfProvider()
];

export function getAllProviders(): AgentProvider[] {
  return [...PROVIDERS];
}

export function getProvider(id: AgentId): AgentProvider | undefined {
  return PROVIDERS.find(provider => provider.id === id);
}

export { AgentProvider, AgentId };
