import { useStudioStore } from '../state/studioStore';

export function ToastHost() {
  const toasts = useStudioStore((state) => state.toasts);
  const dismissToast = useStudioStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-label="App status">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" className={`toast toast-${toast.tone}`} onClick={() => dismissToast(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>
  );
}
