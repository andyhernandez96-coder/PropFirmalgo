import type { Question } from '../../shared/schema';

export class ApiError extends Error {
  constructor(public errors: string[], public status: number) {
    super(errors.join('; '));
  }
}

const OFFLINE_MESSAGE = 'Cannot reach the local server. Is "npm run dev" still running in the terminal?';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError([OFFLINE_MESSAGE], 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errors = Array.isArray(body?.errors) ? body.errors : [`Server answered with HTTP ${res.status}`];
    throw new ApiError(errors, res.status);
  }
  return body as T;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  invalid: { index: number; errors: string[] }[];
}

export interface InboxLogEntry {
  file: string;
  at: string;
  status: 'imported' | 'failed';
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
  movedTo: string;
}

export const api = {
  info: () => request<{ dataDir: string; inboxDir: string }>('/info'),
  questions: () => request<{ questions: Question[] }>('/questions'),
  importQuestions: (questions: unknown[]) =>
    request<ImportResult>('/questions/import', { method: 'POST', body: JSON.stringify(questions) }),
  updateQuestion: (id: string, question: unknown) =>
    request<{ question: Question }>(`/questions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(question),
    }),
  deleteQuestion: (id: string) => request<void>(`/questions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  inboxLog: () => request<{ inboxDir: string; entries: InboxLogEntry[] }>('/inbox/log'),
};

export function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.errors.join(' · ');
  return err instanceof Error ? err.message : String(err);
}
