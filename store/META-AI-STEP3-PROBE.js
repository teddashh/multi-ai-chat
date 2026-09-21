// Optional diagnostic snippet: run in this extension's service-worker DevTools.
// Observes runtime events and reads Meta DOM metadata; never sends/clicks/types.
// Finish with: copy(JSON.stringify(await metaStep3Probe.stop(), null, 2))
(async () => {
  if (!globalThis.chrome?.runtime?.onMessage || !chrome.scripting?.executeScript) {
    throw new Error('Run this snippet in the unpacked extension service-worker DevTools.');
  }
  await globalThis.metaStep3Probe?.stop();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const events = [];
  const pending = new Set();
  let droppedEvents = 0;
  let stopped = false;
  let lastMetaTabId;

  function readMetaDom() {
    // Recheck the host in case the tab navigated since the runtime message.
    if (location.protocol !== 'https:' || !['meta.ai', 'www.meta.ai'].includes(location.hostname)) {
      return { navigatedAway: true };
    }
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    };
    const usable = (element) => !element.closest('[inert], [disabled], [readonly], [aria-disabled="true"], [aria-readonly="true"], [aria-hidden="true"]');
    const stops = [...document.querySelectorAll('[data-testid="composer-stop-button"], button[aria-label="Stop"]')].filter(visible);
    const inputs = [...document.querySelectorAll('[data-testid="composer-input"], input[aria-label="Ask Meta AI"], textarea[data-ecto-composer-prehydration-input]')].filter(visible);
    const answers = [...document.querySelectorAll('[data-message-item]:not([data-user-message]), [data-testid="assistant-message"]')];
    return {
      stopVisible: stops.length > 0,
      stopUsable: stops.some(usable),
      composers: inputs.map((element) => ({
        tag: element.tagName,
        contenteditable: element.getAttribute('contenteditable'),
        usable: usable(element),
        characters: (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value : element.textContent ?? '').length,
      })),
      assistantNodes: answers.length,
      latestAssistantCharacters: (answers.at(-1)?.textContent ?? '').length,
    };
  }

  function record(row, tabId) {
    if (events.length >= 250) { droppedEvents++; return; }
    row.atMs = Date.now() - startedMs;
    events.push(row);
    if (tabId === undefined) return;
    const sample = chrome.scripting.executeScript({ target: { tabId }, func: readMetaDom })
      .then(([frame]) => {
        row.sampleDelayMs = Date.now() - startedMs - row.atMs;
        row.dom = frame?.result ?? null;
      })
      .catch(() => { row.domUnavailable = true; })
      .finally(() => pending.delete(sample));
    pending.add(sample);
  }

  function onMessage(message, sender) {
    if (stopped) return false;
    if (message.action === 'CANCEL_WORKFLOW' && lastMetaTabId !== undefined) {
      record({ action: message.action, workflowId: message.payload?.workflowId }, lastMetaTabId);
      return false;
    }
    if (message.provider !== 'meta' || !sender.tab?.id) return false;
    let url;
    try { url = new URL(sender.tab.url); } catch { return false; }
    if (url.protocol !== 'https:' || !['meta.ai', 'www.meta.ai'].includes(url.hostname)) return false;
    if (!['STATUS_REPORT', 'RESPONSE_CHUNK', 'RESPONSE_DONE'].includes(message.action)) return false;
    lastMetaTabId = sender.tab.id;
    const row = { action: message.action };
    if (message.action === 'STATUS_REPORT') {
      row.ready = message.payload?.loggedIn ?? null;
    } else {
      row.requestId = message.requestId;
      row.workflowId = message.workflowId;
      row.characters = typeof message.payload === 'string' ? message.payload.length : null;
      row.errorLike = typeof message.payload === 'string' && message.payload.startsWith('[Error:');
    }
    record(row, lastMetaTabId);
    return false; // Never consume the workflow's reply channel.
  }

  const snapshot = () => structuredClone({
    startedAt, extensionVersion: chrome.runtime.getManifest().version,
    pendingSamples: pending.size, droppedEvents, events,
  });
  globalThis.metaStep3Probe = {
    snapshot,
    async stop() {
      stopped = true;
      chrome.runtime.onMessage.removeListener(onMessage);
      await Promise.allSettled([...pending]);
      return snapshot();
    },
  };
  chrome.runtime.onMessage.addListener(onMessage);
  return 'Meta Step3 observer started. Run the prompts through the actual Side Panel; stop() returns metadata only.';
})();
