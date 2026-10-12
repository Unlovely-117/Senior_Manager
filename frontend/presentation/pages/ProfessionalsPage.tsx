import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import {
    createProfessional,
    deleteProfessional,
    listProfessionals,
    setProfessionalStatus,
    updateProfessional,
} from '../../application/managementService';
import type { Professional } from '../../domain/models/management';

type ProfessionalForm = Omit<Professional, 'active'>;

const emptyForm: ProfessionalForm = { name: '', document: '', email: '', phone: '' };
const inputClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10';

export const ProfessionalsPage: FC = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState<string | null>(null);
    const [draft, setDraft] = useState<ProfessionalForm>(emptyForm);
    const [formError, setFormError] = useState('');
    const [requestError, setRequestError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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

    const openCreateForm = () => {
        setIsFormOpen(true);
        setEditingDocument(null);
        setDraft(emptyForm);
        setFormError('');
        setNotice('');
    };

    const openEditForm = (professional: Professional) => {
        setIsFormOpen(true);
        setEditingDocument(professional.document);
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
                    name: draft.name.trim(),
                    document: draft.document.trim(),
                    email: draft.email.trim(),
                    phone: draft.phone.trim(),
                });
                setNotice('Profesional registrado.');
            } else {
                await updateProfessional(editingDocument, {
                    name: draft.name.trim(),
                    email: draft.email.trim(),
                    phone: draft.phone.trim(),
                });
                setNotice('Datos del profesional actualizados.');
            }
            setProfessionals(await listProfessionals());
            setIsFormOpen(false);
            setEditingDocument(null);
            setDraft(emptyForm);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo guardar el profesional.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (professional: Professional) => {
        setRequestError('');
        setNotice('');
        try {
            await setProfessionalStatus(professional.document, !professional.active);
            setProfessionals(await listProfessionals());
            setNotice(`${professional.name}: estado actualizado.`);
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo actualizar el estado.');
        }
    };

    const removeProfessional = async (professional: Professional) => {
        if (!window.confirm(`¿Eliminar a ${professional.name} del directorio?`)) {
            return;
        }
        setRequestError('');
        setNotice('');
        try {
            await deleteProfessional(professional.document);
            setProfessionals(await listProfessionals());
            setNotice('Profesional eliminado.');
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo eliminar el profesional.');
        }
    };

    const activeCount = professionals.filter((professional) => professional.active).length;

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Profesionales</h1>
                    <p className="mt-2 text-sm text-gray-500">Administra el directorio y el acceso del equipo de atención.</p>
                </div>
                <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800">
                    <span aria-hidden="true">+</span> Agregar profesional
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">En el directorio</p>
                    <p className="mt-2 text-3xl font-bold text-[#102a36]">{professionals.length}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas activas</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas inactivas</p>
                    <p className="mt-2 text-3xl font-bold text-gray-500">{professionals.length - activeCount}</p>
                </article>
            </div>

            {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
            {requestError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{requestError}</span>
                    <button type="button" onClick={() => { setIsLoading(true); setRequestError(''); listProfessionals().then(setProfessionals).catch((error: unknown) => setRequestError(error instanceof Error ? error.message : 'No se pudo cargar el directorio.')).finally(() => setIsLoading(false)); }} className="font-semibold underline">Reintentar</button>
                </div>
            )}

            {isFormOpen && (
                <form onSubmit={saveProfessional} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0d7377]">Directorio</p>
                            <h2 className="mt-1 text-lg font-bold text-[#102a36]">{editingDocument === null ? 'Registrar profesional' : 'Editar profesional'}</h2>
                        </div>
                        <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                    </div>
                    {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Nombre completo
                            <input required maxLength={100} className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Documento
                            <input required maxLength={40} disabled={editingDocument !== null} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`} value={draft.document} onChange={(event) => setDraft({ ...draft, document: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Correo electrónico
                            <input required type="email" maxLength={120} className={inputClass} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Teléfono
                            <input required type="tel" maxLength={40} className={inputClass} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                        </label>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">La entidad actual no guarda especialidad; el formulario incluye los campos persistidos por el backend.</p>
                    <button type="submit" disabled={isSaving} className="mt-5 rounded-xl bg-[#0d7377] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">
                        {isSaving ? 'Guardando…' : editingDocument === null ? 'Guardar profesional' : 'Guardar cambios'}
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
                                    <th className="px-5 py-3.5 font-semibold">Profesional</th>
                                    <th className="px-5 py-3.5 font-semibold">Contacto</th>
                                    <th className="px-5 py-3.5 font-semibold">Estado</th>
                                    <th className="px-5 py-3.5 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProfessionals.map((professional) => (
                                    <tr key={professional.document} className="transition hover:bg-teal-50/30">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900">{professional.name}</p>
                                            <p className="mt-1 text-xs text-gray-500">Documento {professional.document}</p>
                                        </td>
                                        <td className="px-5 py-4 text-gray-600">
                                            <p>{professional.email}</p>
                                            <p className="mt-1 text-xs text-gray-500">{professional.phone}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${professional.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {professional.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="space-x-3 whitespace-nowrap px-5 py-4">
                                            <button type="button" onClick={() => openEditForm(professional)} className="font-semibold text-[#0d7377] hover:underline">Editar</button>
                                            <button type="button" onClick={() => void toggleStatus(professional)} className="font-medium text-gray-600 hover:underline">
                                                {professional.active ? 'Desactivar' : 'Activar'}
                                            </button>
                                            <button type="button" onClick={() => void removeProfessional(professional)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProfessionals.length === 0 && (
                                    <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-500">{requestError ? 'No se pudo cargar el directorio.' : 'No se encontraron profesionales con esos filtros.'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">Los cambios se guardan en el archivo de profesionales del backend.</p>
            </div>
        </section>
    );
};

export default ProfessionalsPage;
