import { useEffect, useRef, type FC } from 'react';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    danger = false,
    onConfirm,
    onCancel,
}) => {
    const confirmRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!open) return;
        confirmRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="text-lg font-bold text-[#102a36]">{title}</h2>
                <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${
                            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0d7377] hover:bg-teal-800'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
