export function shouldStopActiveRequest(
  activeRequestId: string | undefined,
  activeWorkflowId: string | undefined,
  requestedRequestId: string | undefined,
  requestedWorkflowId: string | undefined,
): boolean {
  const scoped = requestedRequestId !== undefined || requestedWorkflowId !== undefined;
  return !scoped || (requestedRequestId === activeRequestId && requestedWorkflowId === activeWorkflowId);
}
