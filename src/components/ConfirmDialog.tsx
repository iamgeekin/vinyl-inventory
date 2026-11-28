import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** False when confirming loses nothing, so the button is not drawn as a warning. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function ConfirmDialog({ title, confirmLabel, cancelLabel = 'Cancel', destructive = true, onConfirm, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2 id="dialog-title">{title}</h2>
      <div className="muted">{children}</div>
      <div className="row">
        <button type="button" className="button" autoFocus onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={destructive ? 'button danger' : 'button primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
