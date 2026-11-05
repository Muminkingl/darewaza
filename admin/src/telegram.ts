interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  HapticFeedback?: { impactOccurred: (style: 'light' | 'medium') => void; notificationOccurred: (type: 'success' | 'error') => void };
  BackButton?: { show: () => void; hide: () => void; onClick: (callback: () => void) => void; offClick: (callback: () => void) => void };
}
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }
export const telegram = window.Telegram?.WebApp;

export class ApiError extends Error { constructor(public status: number, message: string, public data: Record<string, unknown> = {}) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(`/api/${path}`, {
      ...options, cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `tma ${telegram?.initData || ''}`, ...options.headers },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body == null) throw new ApiError(response.ok ? 502 : response.status, body?.error || 'پەیوەندییەکە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدە.', body || {});
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? 408 : 0, 'پەیوەندییەکە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدە.');
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
