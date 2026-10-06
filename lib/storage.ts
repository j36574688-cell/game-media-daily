// 瀏覽器 localStorage 小工具：讀寫失敗（無痕模式、空間滿）都不會讓頁面壞掉。

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 空間不足時放棄這次寫入；下次狀態變動會再試
  }
}

/** 只保留最新的 limit 筆（Map 依插入順序）。 */
export function trimRecord<V>(record: Record<string, V>, limit: number): Record<string, V> {
  const keys = Object.keys(record);
  if (keys.length <= limit) return record;
  const out: Record<string, V> = {};
  for (const k of keys.slice(keys.length - limit)) out[k] = record[k];
  return out;
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
