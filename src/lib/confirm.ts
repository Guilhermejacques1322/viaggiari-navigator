import { toast } from "sonner";

/**
 * Promise-based confirmation usando sonner toast.
 * Substitui `window.confirm()` que é bloqueado dentro do iframe da preview
 * (sandbox sem allow-modals → confirm() retorna false silenciosamente).
 */
export function confirmAction(
  message: string,
  opts?: { confirmLabel?: string; cancelLabel?: string; description?: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const id = toast(message, {
      description: opts?.description,
      duration: 15000,
      action: {
        label: opts?.confirmLabel ?? "Confirmar",
        onClick: () => {
          done(true);
          toast.dismiss(id);
        },
      },
      cancel: {
        label: opts?.cancelLabel ?? "Cancelar",
        onClick: () => {
          done(false);
          toast.dismiss(id);
        },
      },
      onDismiss: () => done(false),
      onAutoClose: () => done(false),
    });
  });
}
