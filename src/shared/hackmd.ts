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

export async function publishToHackMD(
  title: string,
  content: string,
  token: string,
): Promise<HackMDPublishResult> {
  const response = await fetch('https://api.hackmd.io/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content,
      readPermission: 'guest',
      writePermission: 'owner',
      commentPermission: 'disabled',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HackMD ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as { id?: string; publishLink?: string };
  const editLink = data.id ? `https://hackmd.io/${data.id}` : '';
  const publishLink = data.publishLink || (data.id ? `https://hackmd.io/@/${data.id}/publish` : '');
  if (!publishLink) throw new Error('HackMD response missing publish link');
  return { publishLink, editLink };
}
