export class WorkflowStartGate {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release = () => {};
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

export function assertCurrentWorkflow(
  workflowId: string,
  activeWorkflowId: string | undefined,
  workflowAborted: boolean,
): void {
  if (workflowAborted || activeWorkflowId !== workflowId) {
    throw new DOMException('Workflow cancelled', 'AbortError');
  }
}
