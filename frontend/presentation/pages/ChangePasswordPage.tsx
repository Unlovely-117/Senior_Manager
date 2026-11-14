import React, { useState, type FormEvent } from 'react';
import { changePassword } from '../../application/managementService';

interface ChangePasswordPageProps {
    name: string;
    onChanged: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ name, onChanged }) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (password !== confirmation) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsSaving(true);
        try {
            await changePassword(password, confirmation);
            onChanged();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'No se pudo cambiar la contraseña.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] px-5 py-10">
            <section className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-7 shadow-2xl sm:p-9">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-[#0d7377]" aria-hidden="true">🔐</div>
                <p className="text-sm font-semibold text-[#0d7377]">Hola, {name}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Crea tu contraseña personal</h1>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                    Para proteger tu cuenta, debes cambiar la contraseña temporal antes de continuar.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
                    <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                        Nueva contraseña
                        <input
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                        />
                        <span className="block text-xs font-normal text-gray-500">Usa al menos 8 caracteres.</span>
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                        Confirma la nueva contraseña
                        <input
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-wait disabled:opacity-60"
                    >
                        {isSaving ? 'Guardando…' : 'Guardar contraseña y continuar'}
                    </button>
                </form>
            </section>
        </main>
    );
};
