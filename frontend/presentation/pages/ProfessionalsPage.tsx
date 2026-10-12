import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import {
    createProfessional,
    deleteProfessional,
    deleteProfessionalAccount,
    linkProfessional,
    listProfessionals,
    setProfessionalStatus,
    updateProfessional,
} from '../../application/managementService';
import type { Professional } from '../../domain/models/management';

type ProfessionalForm = {
    name: string;
    document: string;
    email: string;
    phone: string;
};

const emptyForm: ProfessionalForm = { name: '', document: '', email: '', phone: '' };
const inputClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10';

export const ProfessionalsPage: FC = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState<string | null>(null);
    const [selectedAccountEmail, setSelectedAccountEmail] = useState('');
    const [linkTargets, setLinkTargets] = useState<Record<string, string>>({});
    const [draft, setDraft] = useState<ProfessionalForm>(emptyForm);
    const [formError, setFormError] = useState('');
    const [requestError, setRequestError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const refreshProfessionals = async () => {
        setProfessionals(await listProfessionals());
    };

    useEffect(() => {
        let isCurrent = true;
        listProfessionals()
            .then((items) => {
                if (isCurrent) {
                    setProfessionals(items);
                    setRequestError('');
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setRequestError(error instanceof Error ? error.message : 'No se pudo cargar el directorio.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });
        return () => { isCurrent = false; };
    }, []);

    const accountOnlyProfessionals = professionals.filter(
        (professional) => professional.accountLinked && !professional.hasProfile,
    );
    const unlinkedProfiles = professionals.filter((professional) => !professional.accountLinked);
    const linkedProfiles = professionals.filter(
        (professional) => professional.accountLinked && professional.hasProfile,
    );

    const filteredProfessionals = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return professionals.filter((professional) => {
            const matchesSearch = [
                professional.name,
                professional.document,
                professional.email,
                professional.phone,
            ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' && professional.active)
                || (statusFilter === 'inactive' && !professional.active);
            return matchesSearch && matchesStatus;
        });
    }, [professionals, search, statusFilter]);

    const openCreateForm = (professional?: Professional) => {
        const account = professional ?? accountOnlyProfessionals[0];
        setIsFormOpen(true);
        setEditingDocument(null);
        setSelectedAccountEmail(account?.email ?? '');
        setDraft({
            ...emptyForm,
            name: account?.name ?? '',
            email: account?.email ?? '',
        });
        setFormError('');
        setNotice('');
    };

    const openEditForm = (professional: Professional) => {
        setIsFormOpen(true);
        setEditingDocument(professional.document);
        setSelectedAccountEmail('');
        setDraft({
            name: professional.name,
            document: professional.document,
            email: professional.email,
            phone: professional.phone,
        });
        setFormError('');
        setNotice('');
    };

    const saveProfessional = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');
        setRequestError('');
        try {
            if (editingDocument === null) {
                await createProfessional({
                    document: draft.document.trim(),
                    email: selectedAccountEmail,
                    phone: draft.phone.trim(),
                });
                setNotice('Ficha profesional creada y vinculada a la cuenta.');
            } else {
                await updateProfessional(editingDocument, {
                    name: draft.name.trim(),
                    email: draft.email.trim(),
                    phone: draft.phone.trim(),
                });
                setNotice('Datos de la ficha profesional actualizados.');
            }
            await refreshProfessionals();
            setIsFormOpen(false);
            setEditingDocument(null);
            setDraft(emptyForm);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo guardar la ficha profesional.');
        } finally {
            setIsSaving(false);
        }
    };

    const attachProfile = async (professional: Professional) => {
        const email = linkTargets[professional.document];
        if (!email) {
            return;
        }
        setRequestError('');
        setNotice('');
        try {
            await linkProfessional(professional.document, email);
            await refreshProfessionals();
            setNotice(`La ficha de ${professional.name} quedó vinculada a la cuenta seleccionada.`);
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo vincular la ficha profesional.');
        }
    };

    const toggleStatus = async (professional: Professional) => {
        setRequestError('');
        setNotice('');
        try {
            await setProfessionalStatus(professional.document, !professional.active);
            await refreshProfessionals();
            setNotice(`${professional.name}: estado de la cuenta actualizado.`);
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo actualizar el estado.');
        }
    };

    const removeProfessional = async (professional: Professional) => {
        const confirmation = professional.accountLinked
            ? professional.hasProfile
                ? `¿Eliminar por completo a ${professional.name}? Se borrarán su ficha profesional y su cuenta de acceso.`
                : `¿Eliminar la cuenta profesional de ${professional.name}?`
            : `¿Eliminar la ficha profesional de ${professional.name}?`;
        if (!window.confirm(confirmation)) {
            return;
        }
        setRequestError('');
        setNotice('');
        try {
            if (professional.hasProfile) {
                await deleteProfessional(professional.document);
            } else {
                await deleteProfessionalAccount(professional.email);
            }
            await refreshProfessionals();
            setNotice(professional.accountLinked
                ? `Se eliminó por completo a ${professional.name}, incluida su cuenta de acceso.`
                : `Se eliminó la ficha de ${professional.name}.`);
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo eliminar la ficha profesional.');
        }
    };

    const activeAccounts = professionals.filter(
        (professional) => professional.accountLinked && professional.active,
    ).length;
    const professionalAccounts = professionals.filter((professional) => professional.accountLinked).length;

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Profesionales</h1>
                    <p className="mt-2 text-sm text-gray-500">Las cuentas vienen de usuarios; aquí se completan y vinculan sus fichas profesionales.</p>
                </div>
                <button
                    type="button"
                    onClick={() => openCreateForm()}
                    disabled={accountOnlyProfessionals.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span aria-hidden="true">+</span> Completar ficha profesional
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas profesionales</p>
                    <p className="mt-2 text-3xl font-bold text-[#102a36]">{isLoading ? '—' : professionalAccounts}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas activas</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{isLoading ? '—' : activeAccounts}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Fichas por vincular</p>
                    <p className="mt-2 text-3xl font-bold text-amber-700">{isLoading ? '—' : unlinkedProfiles.length}</p>
                </article>
            </div>

            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-950">
                <strong>Datos TXT:</strong> las cuentas y sus roles se leen de <code>usuarios.txt</code>; documento y teléfono se leen de <code>profesionales.txt</code>. Las fichas sin coincidencia se muestran aparte para vincularlas manualmente.
            </div>

            {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
            {requestError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{requestError}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoading(true);
                            setRequestError('');
                            refreshProfessionals()
                                .catch((error: unknown) => setRequestError(error instanceof Error ? error.message : 'No se pudo cargar el directorio.'))
                                .finally(() => setIsLoading(false));
                        }}
                        className="font-semibold underline"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {isFormOpen && (
                <form onSubmit={saveProfessional} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0d7377]">Directorio</p>
                            <h2 className="mt-1 text-lg font-bold text-[#102a36]">{editingDocument === null ? 'Completar ficha profesional' : 'Editar ficha profesional'}</h2>
                        </div>
                        <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                    </div>
                    {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                    {editingDocument === null ? (
                        <div className="mb-4">
                            <label className="space-y-1.5 text-xs font-semibold text-gray-600">
                                Cuenta profesional
                                <select
                                    required
                                    className={inputClass}
                                    value={selectedAccountEmail}
                                    onChange={(event) => {
                                        const account = accountOnlyProfessionals.find((item) => item.email === event.target.value);
                                        setSelectedAccountEmail(event.target.value);
                                        setDraft({
                                            ...draft,
                                            name: account?.name ?? '',
                                            email: account?.email ?? '',
                                        });
                                    }}
                                >
                                    <option value="">Selecciona una cuenta sin ficha</option>
                                    {accountOnlyProfessionals.map((account) => (
                                        <option key={account.email} value={account.email}>{account.name} · {account.email}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Nombre de la cuenta
                            <input required maxLength={100} readOnly={editingDocument === null || linkedProfiles.some((professional) => professional.document === editingDocument)} className={`${inputClass} read-only:cursor-not-allowed read-only:opacity-70`} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Documento
                            <input required maxLength={40} disabled={editingDocument !== null} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`} value={draft.document} onChange={(event) => setDraft({ ...draft, document: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Correo de la cuenta
                            <input type="text" maxLength={120} readOnly className={`${inputClass} read-only:cursor-not-allowed read-only:opacity-70`} value={draft.email} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Teléfono
                            <input required type="tel" maxLength={40} className={inputClass} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                        </label>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">La cuenta y el rol se administran en Usuarios y roles. Esta ficha guarda únicamente los datos profesionales complementarios.</p>
                    <button type="submit" disabled={isSaving || (editingDocument === null && !selectedAccountEmail)} className="mt-5 rounded-xl bg-[#0d7377] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">
                        {isSaving ? 'Guardando…' : editingDocument === null ? 'Guardar ficha' : 'Guardar cambios'}
                    </button>
                </form>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Buscar profesionales</span>
                        <input className={inputClass} placeholder="Buscar por nombre, documento, correo o teléfono" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </label>
                    <label>
                        <span className="sr-only">Filtrar por estado</span>
                        <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                            <option value="all">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </label>
                </div>
                {isLoading ? (
                    <p className="p-10 text-center text-sm text-gray-500">Cargando profesionales…</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                            <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold">Profesional / cuenta</th>
                                    <th className="px-5 py-3.5 font-semibold">Datos de ficha</th>
                                    <th className="px-5 py-3.5 font-semibold">Estado y vínculo</th>
                                    <th className="px-5 py-3.5 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProfessionals.map((professional) => (
                                    <tr key={professional.accountLinked ? `account:${professional.email}` : `profile:${professional.document}`} className="transition hover:bg-teal-50/30">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900">{professional.name}</p>
                                            <p className="mt-1 text-xs text-gray-500">{professional.email}</p>
                                        </td>
                                        <td className="px-5 py-4 text-gray-600">
                                            <p>{professional.document ? `Documento ${professional.document}` : 'Sin ficha profesional'}</p>
                                            <p className="mt-1 text-xs text-gray-500">{professional.phone || 'Teléfono no registrado'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${professional.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {professional.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                            <p className={`mt-2 text-xs font-medium ${professional.accountLinked ? 'text-teal-700' : 'text-amber-700'}`}>
                                                {professional.accountLinked ? professional.hasProfile ? 'Cuenta y ficha vinculadas' : 'Cuenta sin ficha' : 'Ficha sin cuenta vinculada'}
                                            </p>
                                        </td>
                                        <td className="min-w-[250px] space-y-2 px-5 py-4">
                                            {professional.accountLinked && !professional.hasProfile ? (
                                                <button type="button" onClick={() => openCreateForm(professional)} className="font-semibold text-[#0d7377] hover:underline">Completar ficha</button>
                                            ) : null}
                                            {!professional.accountLinked ? (
                                                <div className="flex items-center gap-2">
                                                    <label>
                                                        <span className="sr-only">Cuenta para vincular a {professional.name}</span>
                                                        <select className={`${inputClass} min-w-40`} value={linkTargets[professional.document] ?? ''} onChange={(event) => setLinkTargets({ ...linkTargets, [professional.document]: event.target.value })}>
                                                            <option value="">Seleccionar cuenta</option>
                                                            {accountOnlyProfessionals.map((account) => (
                                                                <option key={account.email} value={account.email}>{account.name} · {account.email}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <button type="button" disabled={!linkTargets[professional.document]} onClick={() => void attachProfile(professional)} className="font-semibold text-[#0d7377] hover:underline disabled:cursor-not-allowed disabled:opacity-50">Vincular</button>
                                                </div>
                                            ) : null}
                                            {professional.hasProfile || professional.accountLinked ? (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 whitespace-nowrap">
                                                    {professional.hasProfile ? (
                                                        <button type="button" onClick={() => openEditForm(professional)} className="font-semibold text-[#0d7377] hover:underline">Editar ficha</button>
                                                    ) : null}
                                                    {professional.accountLinked && professional.hasProfile ? (
                                                        <button type="button" onClick={() => void toggleStatus(professional)} className="font-medium text-gray-600 hover:underline">
                                                            {professional.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => void removeProfessional(professional)}
                                                        className="font-medium text-red-600 hover:underline"
                                                    >
                                                        {professional.accountLinked ? 'Eliminar profesional' : 'Eliminar ficha'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                                {filteredProfessionals.length === 0 && (
                                    <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-500">{requestError ? 'No se pudo cargar el directorio.' : 'No se encontraron registros con esos filtros.'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">Al eliminar un profesional vinculado, se borran tanto su ficha como su cuenta de acceso.</p>
            </div>
        </section>
    );
};

export default ProfessionalsPage;
