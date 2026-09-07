export interface WorkflowScope {
  workflowId: string;
  sessionId: string;
  clientId: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createWorkflowScope(
  sessionId: string,
  clientId: string,
  createId: () => string = () => crypto.randomUUID(),
): WorkflowScope {
  const workflowId = createId();
  if (!isValidWorkflowId(workflowId)) throw new Error('Unable to create a valid workflow id');
  return { workflowId, sessionId, clientId };
}

export function createWorkflowCancellation(
  sessionId: string,
  clientId: string,
  workflowId: string | undefined,
): WorkflowScope | undefined {
  return workflowId ? { workflowId, sessionId, clientId } : undefined;
}

export function isValidWorkflowId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function activeCancellationTarget(
  cancelledWorkflowId: string,
  activeWorkflowId: string | undefined,
): string | undefined {
  return cancelledWorkflowId === activeWorkflowId ? activeWorkflowId : undefined;
}

export function rebindWorkflowScope(
  scope: WorkflowScope | undefined,
  workflowId: string,
  sessionId: string,
  clientId: string,
): WorkflowScope | undefined {
  if (!scope || scope.workflowId !== workflowId || scope.sessionId !== sessionId) return undefined;
  return { ...scope, clientId };
}

export class WorkflowIdRegistry {
  private readonly claimed = new Set<string>();

  claim(value: unknown): value is string {
    if (!isValidWorkflowId(value) || this.claimed.has(value)) return false;
    this.claimed.add(value);
    return true;
  }
}

export class WorkflowLifecycleRegistry {
  private readonly ids = new WorkflowIdRegistry();
  private readonly scopes = new Map<string, WorkflowScope>();
  private readonly cancelled = new Set<string>();
  private readonly revokedRecoveryClients = new Map<string, Set<string>>();

  register(scope: WorkflowScope): boolean {
    if (!scope.sessionId || !scope.clientId || !this.ids.claim(scope.workflowId)) return false;
    this.scopes.set(scope.workflowId, { ...scope });
    return true;
  }

  requestCancellation(value: unknown): WorkflowScope | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as Partial<WorkflowScope>;
    const registered = typeof candidate.workflowId === 'string' ? this.scopes.get(candidate.workflowId) : undefined;
    if (!registered
      || candidate.workflowId !== registered.workflowId
      || candidate.sessionId !== registered.sessionId
      || candidate.clientId !== registered.clientId) return undefined;
    this.cancelled.add(registered.workflowId);
    return { ...registered };
  }

  assertCanStart(workflowId: string): void {
    if (this.cancelled.has(workflowId)) throw new DOMException('Workflow cancelled', 'AbortError');
  }

  rebind(workflowId: string, sessionId: string, clientId: string): WorkflowScope | undefined {
    const rebound = rebindWorkflowScope(this.scopes.get(workflowId), workflowId, sessionId, clientId);
    if (!rebound) return undefined;
    this.scopes.set(workflowId, rebound);
    return { ...rebound };
  }

  canOwnRecovery(workflowId: string, clientId: string): boolean {
    return !this.revokedRecoveryClients.get(workflowId)?.has(clientId);
  }

  revokeRecoveryOwner(workflowId: string, clientId: string): void {
    const revoked = this.revokedRecoveryClients.get(workflowId) ?? new Set<string>();
    revoked.add(clientId);
    this.revokedRecoveryClients.set(workflowId, revoked);
  }

  current(workflowId: string): WorkflowScope | undefined {
    const scope = this.scopes.get(workflowId);
    return scope ? { ...scope } : undefined;
  }

  finish(workflowId: string): void {
    this.scopes.delete(workflowId);
    this.cancelled.delete(workflowId);
    this.revokedRecoveryClients.delete(workflowId);
  }
}
