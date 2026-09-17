type ApiErrorListener = (message: string) => void;

const listeners = new Set<ApiErrorListener>();

export function subscribeApiErrors(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishApiError(message: string): void {
  for (const listener of listeners) {
    listener(message);
  }
}
