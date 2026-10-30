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

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `tma ${telegram?.initData || ''}`, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.error || 'Unable to connect. Please try again.');
  return body;
}
