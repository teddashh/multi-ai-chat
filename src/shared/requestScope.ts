export function shouldStopActiveRequest(
  activeRequestId: string | undefined,
  activeWorkflowId: string | undefined,
  requestedRequestId: string | undefined,
  requestedWorkflowId: string | undefined,
): boolean {
  const scoped = requestedRequestId !== undefined || requestedWorkflowId !== undefined;
  return !scoped || (requestedRequestId === activeRequestId && requestedWorkflowId === activeWorkflowId);
}

export function shouldStopContentRequest(
  waitingForResponse: boolean,
  activeRequestId: string | undefined,
  activeWorkflowId: string | undefined,
  failedRequestId: string | undefined,
  failedWorkflowId: string | undefined,
  requestedRequestId: string | undefined,
  requestedWorkflowId: string | undefined,
): boolean {
  const scoped = requestedRequestId !== undefined || requestedWorkflowId !== undefined;
  if (!scoped) return true;
  if (waitingForResponse) {
    return requestedRequestId === activeRequestId && requestedWorkflowId === activeWorkflowId;
  }
  const hasFailedRequest = failedRequestId !== undefined || failedWorkflowId !== undefined;
  return hasFailedRequest
    && requestedRequestId === failedRequestId
    && requestedWorkflowId === failedWorkflowId;
}

export function isActiveContentRequest(
  disposed: boolean,
  runtimeState: unknown,
  currentRuntimeState: unknown,
  waitingForResponse: boolean,
  activeRequestId: string | undefined,
  requestedRequestId: string | undefined,
): boolean {
  return !disposed
    && runtimeState === currentRuntimeState
    && waitingForResponse
    && activeRequestId === requestedRequestId;
}
