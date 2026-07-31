// 錯誤訊息要從 content script 經背景走到側邊欄，中途還會被包成 Error 物件再丟出，
// 所以在路上只帶可序列化的鍵值，到側邊欄才用 t() 翻成使用者的語言。
export const ERROR_MARKER = '⚠️';

const PREFIX = 'i18n:';

export interface ErrorInfo {
  key: string;
  params?: Record<string, string | number>;
}

export function encodeError(key: string, params?: Record<string, string | number>): string {
  return PREFIX + JSON.stringify({ key, params });
}

export function decodeError(text: string): ErrorInfo | null {
  const start = text.indexOf(PREFIX);
  if (start < 0) return null;
  const raw = text.slice(start + PREFIX.length);
  // JSON 物件一定以 } 結尾；取最後一個，才不會被 detail 裡的 } 提早切斷
  const end = raw.lastIndexOf('}');
  if (end < 0) return null;
  try {
    const info = JSON.parse(raw.slice(0, end + 1)) as ErrorInfo;
    return typeof info?.key === 'string' ? info : null;
  } catch {
    return null;
  }
}
