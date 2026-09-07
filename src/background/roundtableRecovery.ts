import type {
  AIProvider,
  RoundtableRoles,
  StepRecoveryAction,
  StepRecoveryDecision,
  StepRecoveryRequest,
} from '../shared/types';

export const SKIP_RESPONSE = '(no response — skipped)';
// Keep this below Chrome's five-minute extension event lifetime so the timeout can
// reject and reset the provider before the service worker itself is reclaimed.
export const STEP_RECOVERY_DECISION_TIMEOUT_MS = 240_000;

export class ProviderRequestError extends Error {
  readonly provider: AIProvider;
  readonly workflowId: string;
  readonly requestId: string;

  constructor(provider: AIProvider, workflowId: string, requestId: string, reason: unknown) {
    super(reason instanceof Error ? reason.message : String(reason));
    this.name = 'ProviderRequestError';
    this.provider = provider;
    this.workflowId = workflowId;
    this.requestId = requestId;
  }
}

export interface RoundtableHistoryItem {
  name: string;
  round: number;
  text: string;
}

interface PendingRecovery {
  token: object;
  request: StepRecoveryRequest;
  resolve: (action: StepRecoveryAction) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class StepRecoveryCoordinator {
  private pending: PendingRecovery | undefined;
  private readonly createId: () => string;
  private readonly timeoutMs: number;

  constructor(
    createId: () => string = () => crypto.randomUUID(),
    timeoutMs = STEP_RECOVERY_DECISION_TIMEOUT_MS,
  ) {
    this.createId = createId;
    this.timeoutMs = timeoutMs;
  }

  waitForDecision(
    request: Omit<StepRecoveryRequest, 'recoveryId'>,
    notify: (request: StepRecoveryRequest) => void,
    timeoutReason: Error = new Error('Step recovery decision timed out'),
  ): Promise<StepRecoveryAction> {
    this.cancel(undefined, new DOMException('Step recovery superseded', 'AbortError'));
    const recoveryRequest: StepRecoveryRequest = { ...request, recoveryId: this.createId() };
    return new Promise((resolve, reject) => {
      const token = {};
      const timer = setTimeout(() => {
        if (this.pending?.token !== token) return;
        this.pending = undefined;
        reject(timeoutReason);
      }, this.timeoutMs);
      this.pending = { token, request: recoveryRequest, resolve, reject, timer };
      try {
        notify(recoveryRequest);
      } catch (error) {
        clearTimeout(timer);
        if (this.pending?.token === token) this.pending = undefined;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  resolve(decision: unknown): boolean {
    const pending = this.pending;
    if (!pending || !isStepRecoveryDecision(decision) || !sameRecovery(pending.request, decision)) return false;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.resolve(decision.action);
    return true;
  }

  rebindClient(workflowId: string, sessionId: string, clientId: string): StepRecoveryRequest | undefined {
    const pending = this.pending;
    if (!pending || pending.request.workflowId !== workflowId || pending.request.sessionId !== sessionId) return undefined;
    pending.request = { ...pending.request, recoveryId: this.createId(), clientId };
    return { ...pending.request };
  }

  cancel(workflowId?: string, reason: Error = new DOMException('Workflow cancelled', 'AbortError')): boolean {
    const pending = this.pending;
    if (!pending || (workflowId !== undefined && pending.request.workflowId !== workflowId)) return false;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.reject(reason);
    return true;
  }

  current(): StepRecoveryRequest | undefined {
    return this.pending ? { ...this.pending.request } : undefined;
  }
}

export async function transferStepRecoveryOwnership(
  current: StepRecoveryRequest,
  nextClientId: string,
  rotateOwnership: () => StepRecoveryRequest | undefined,
  revokePreviousOwner: (previous: StepRecoveryRequest) => Promise<void>,
  isStillCurrent: (rebound: StepRecoveryRequest) => boolean,
): Promise<StepRecoveryRequest | undefined> {
  if (current.clientId === nextClientId) return current;
  const rebound = rotateOwnership();
  if (!rebound) return undefined;
  await revokePreviousOwner(current);
  return isStillCurrent(rebound) ? rebound : undefined;
}

export class StepRecoveryReplayCoordinator {
  private tail: Promise<void> = Promise.resolve();

  publish(request: StepRecoveryRequest, notify: (request: StepRecoveryRequest) => void): boolean {
    notify(request);
    return true;
  }

  async replay(
    loadRequest: () => Promise<StepRecoveryRequest | undefined>,
    notify: (request: StepRecoveryRequest) => void,
  ): Promise<boolean> {
    const previous = this.tail;
    let release = () => {};
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const request = await loadRequest();
      return request ? this.publish(request, notify) : false;
    } finally {
      release();
    }
  }
}

export interface RoundtableWorkflowDependencies {
  checkAborted: (workflowId: string) => void;
  providerName: (participant: AIProvider) => string;
  buildPrompt: (text: string, round: number, participantName: string, history: RoundtableHistoryItem[]) => string;
  sendStatus: (round: number, participant: AIProvider) => Promise<void>;
  createRequestId: (participant: AIProvider, workflowId: string) => string;
  sendRoleAssignment: (participant: AIProvider, labelKey: string, requestId: string) => Promise<void>;
  sendAndWait: (participant: AIProvider, prompt: string, workflowId: string, requestId: string) => Promise<string>;
  requestRecovery: (
    participant: AIProvider,
    error: unknown,
    workflowId: string,
    failedRequestId: string,
  ) => Promise<StepRecoveryAction>;
  resetProvider: (participant: AIProvider, failedRequestId: string, workflowId: string) => Promise<void>;
  cancelWorkflow: (workflowId: string) => Promise<void>;
}

export async function runRoundtableWorkflow(
  text: string,
  roles: RoundtableRoles,
  workflowId: string,
  dependencies: RoundtableWorkflowDependencies,
): Promise<RoundtableHistoryItem[]> {
  const participants: AIProvider[] = [roles.first, roles.second, roles.third, roles.fourth];
  const history: RoundtableHistoryItem[] = [];
  for (let round = 1; round <= 5; round += 1) {
    for (const participant of participants) {
      dependencies.checkAborted(workflowId);
      await dependencies.sendStatus(round, participant);
      dependencies.checkAborted(workflowId);
      const labelKey = `round.${round}`;
      const participantName = dependencies.providerName(participant);
      const prompt = dependencies.buildPrompt(text, round, participantName, history);
      const response = await runRecoverableRoundtableStep(participant, prompt, workflowId, labelKey, dependencies);
      history.push({ name: participantName, round, text: response });
    }
  }
  return history;
}

async function runRecoverableRoundtableStep(
  participant: AIProvider,
  prompt: string,
  workflowId: string,
  labelKey: string,
  dependencies: RoundtableWorkflowDependencies,
): Promise<string> {
  for (;;) {
    dependencies.checkAborted(workflowId);
    const requestId = dependencies.createRequestId(participant, workflowId);
    await dependencies.sendRoleAssignment(participant, labelKey, requestId);
    dependencies.checkAborted(workflowId);
    try {
      return await dependencies.sendAndWait(participant, prompt, workflowId, requestId);
    } catch (error) {
      if (!(error instanceof ProviderRequestError)) throw error;
      dependencies.checkAborted(workflowId);
      let action: StepRecoveryAction;
      try {
        action = await dependencies.requestRecovery(participant, error, workflowId, requestId);
      } catch (decisionError) {
        if (!(decisionError instanceof DOMException && decisionError.name === 'AbortError')) {
          await dependencies.resetProvider(participant, requestId, workflowId);
        }
        throw decisionError;
      }
      dependencies.checkAborted(workflowId);
      await dependencies.resetProvider(participant, requestId, workflowId);
      dependencies.checkAborted(workflowId);
      if (action === 'skip') return SKIP_RESPONSE;
      if (action === 'retry') continue;
      await dependencies.cancelWorkflow(workflowId);
      throw new DOMException('Workflow cancelled', 'AbortError');
    }
  }
}

function sameRecovery(request: StepRecoveryRequest, decision: StepRecoveryDecision): boolean {
  return request.recoveryId === decision.recoveryId
    && request.workflowId === decision.workflowId
    && request.sessionId === decision.sessionId
    && request.clientId === decision.clientId
    && request.provider === decision.provider
    && request.failedRequestId === decision.failedRequestId;
}

function isRecoveryAction(action: unknown): action is StepRecoveryAction {
  return action === 'retry' || action === 'skip' || action === 'cancel';
}

export function isStepRecoveryDecision(value: unknown): value is StepRecoveryDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as Partial<StepRecoveryDecision>;
  return typeof decision.recoveryId === 'string'
    && typeof decision.workflowId === 'string'
    && typeof decision.sessionId === 'string'
    && typeof decision.clientId === 'string'
    && isProvider(decision.provider)
    && typeof decision.failedRequestId === 'string'
    && isRecoveryAction(decision.action);
}

function isProvider(value: unknown): value is AIProvider {
  return value === 'chatgpt' || value === 'claude' || value === 'gemini' || value === 'grok';
}
