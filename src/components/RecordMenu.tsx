import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { VinylRecord } from '../data/types';
import { useApp } from '../state/AppContext';
import { ConfirmDialog } from './ConfirmDialog';
import { Cover } from './Cover';

interface Actions {
  /** The menu that a long press on a record opens. */
  openMenu: (record: VinylRecord) => void;
  /** Asks before deleting. */
  askDelete: (record: VinylRecord) => void;
}

const RecordActions = createContext<Actions | null>(null);

export function useRecordActions(): Actions {
  const actions = useContext(RecordActions);
  if (!actions) throw new Error('useRecordActions must be used inside RecordMenuProvider');
  return actions;
}

function Menu({ record, onClose, onDelete }: { record: VinylRecord; onClose: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // The menu itself, so that no choice looks picked out before one is made.
    dialog?.focus();
    return () => dialog?.close();
  }, []);
  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <dialog
      ref={ref}
      className="menu"
      tabIndex={-1}
      aria-label={`${record.title} by ${record.artist}`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // A press outside closes it. Pressing, not clicking: lifting the finger that
      // opened the menu would otherwise close it at once.
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="menu-preview">
        <Cover record={record} alt="" />
        <p className="menu-title">{record.title}</p>
        <p className="muted small">{[record.artist, record.year].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="menu-list">
        <button type="button" onClick={() => go(`/record/${record.id}`)}>Open</button>
        <button type="button" onClick={() => go(`/record/${record.id}/edit`)}>Edit</button>
        <button type="button" className="destructive" onClick={onDelete}>Delete</button>
      </div>
    </dialog>
  );
}

export function RecordMenuProvider({ children }: { children: ReactNode }) {
  const { repo } = useApp();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<{ kind: 'menu' | 'delete'; record: VinylRecord } | null>(null);
  // Going back with the phone's own swipe leaves nothing open behind.
  useEffect(() => setOpen(null), [pathname]);

  const actions = useMemo<Actions>(
    () => ({
      openMenu: (record) => setOpen({ kind: 'menu', record }),
      askDelete: (record) => setOpen({ kind: 'delete', record }),
    }),
    [],
  );
  const close = () => setOpen(null);

  return (
    <RecordActions.Provider value={actions}>
      {children}
      {open?.kind === 'menu' && (
        <Menu record={open.record} onClose={close} onDelete={() => actions.askDelete(open.record)} />
      )}
      {open?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this record?"
          confirmLabel="Delete"
          onCancel={close}
          onConfirm={() => { close(); repo.deleteRecord(open.record.id); }}
        >
          “{open.record.title}” by {open.record.artist} will be permanently removed from your collection.
        </ConfirmDialog>
      )}
    </RecordActions.Provider>
  );
}
