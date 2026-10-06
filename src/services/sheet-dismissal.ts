export function createSheetDismissal() {
  let pending: { resolve(): void; reject(error: Error): void } | null = null;
  return {
    wait(close: () => void, nativeDismissal: boolean): Promise<void> {
      if (pending) return Promise.reject(new Error('Sheet dismissal already pending'));
      if (!nativeDismissal) { close(); return Promise.resolve(); }
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        close();
      });
    },
    didDismiss() {
      const completion = pending;
      pending = null;
      completion?.resolve();
    },
    cancel() {
      const completion = pending;
      pending = null;
      completion?.reject(new Error('Import screen closed'));
    },
  };
}
