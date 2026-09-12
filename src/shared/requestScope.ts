export function shouldStopActiveRequest(
  activeRequestId: string | undefined,
  activeWorkflowId: string | undefined,
  requestedRequestId: string | undefined,
  requestedWorkflowId: string | undefined,
): boolean {
  const scoped = requestedRequestId !== undefined || requestedWorkflowId !== undefined;
  return !scoped || (requestedRequestId === activeRequestId && requestedWorkflowId === activeWorkflowId);
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
