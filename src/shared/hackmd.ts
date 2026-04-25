const TOKEN_KEY = 'hackmd_token';

export async function getHackMDToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return (result[TOKEN_KEY] as string | undefined) || null;
}

export async function setHackMDToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearHackMDToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY);
}

export interface HackMDPublishResult {
  publishLink: string;
  editLink: string;
}

// Routes the actual HTTP request through the service worker because Chrome
// MV3 extension pages (sidepanel/popup) still hit CORS preflight even with
// host_permissions, but service workers bypass it.
export async function publishToHackMD(
  title: string,
  content: string,
  token: string,
): Promise<HackMDPublishResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'PUBLISH_HACKMD', payload: { token, title, content } },
      (response: { ok: boolean; result?: HackMDPublishResult; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error('No response from background'));
          return;
        }
        if (!response.ok) {
          reject(new Error(response.error || 'Unknown HackMD error'));
          return;
        }
        if (!response.result) {
          reject(new Error('HackMD response missing result'));
          return;
        }
        resolve(response.result);
      },
    );
  });
}
