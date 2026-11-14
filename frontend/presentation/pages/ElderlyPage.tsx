import { useCallback, useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import {
    ApiRequestError,
    createPatient,
    createPatientHistory,
    deactivatePatient,
    listMyPermissions,
    listPatientHistory,
    listPatients,
    listHistoricalPatients,
    updatePatient,
    updatePatientHistory,
} from '../../application/managementService';
import type { Patient, PatientHistory, RolePermission } from '../../domain/models/management';

type Props = { isAdmin?: boolean };
type PatientForm = Omit<Patient, 'id' | 'active'>;

const DOCUMENT_REGEX = /^\d{6,10}$/;
const PHONE_REGEX = /^\d{7,10}$/;

const emptyPatient: PatientForm = {
    fullName: '', document: '', birthDate: null, phone: null, address: null, observations: null,
};

function formatBirthDate(value: string | null): string {
    if (!value) return 'No registrada';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function validatePatientForm(value: PatientForm): string | null {
    if (!value.fullName || !value.document || !value.birthDate || !value.phone) {
        return 'Todos los campos obligatorios (nombre completo, documento, fecha de nacimiento y teléfono) deben completarse.';
    }
    if (value.fullName.length < 3 || value.fullName.length > 120) {
        return 'El nombre completo debe tener entre 3 y 120 caracteres.';
    }
    if (!DOCUMENT_REGEX.test(value.document)) {
        return 'El documento de identidad (cédula) debe contener solo números entre 6 y 10 dígitos.';
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.birthDate);
    if (!match) {
        return 'La fecha de nacimiento debe usar el formato AAAA-MM-DD.';
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
        return 'La fecha de nacimiento no es válida.';
    }
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (birth > todayStart) {
        return 'La fecha de nacimiento no puede ser una fecha futura.';
    }
    const minSeniorBirth = new Date(today.getFullYear() - 60, today.getMonth(), today.getDate());
    const maxAgeBirth = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    if (birth > minSeniorBirth) {
        return 'La fecha de nacimiento no es válida: el paciente debe ser un adulto mayor (entre 60 y 120 años) y no puede ser una fecha futura.';
    }
    if (birth < maxAgeBirth) {
        return 'La fecha de nacimiento excede el rango máximo permitido (120 años).';
    }
    if (!PHONE_REGEX.test(value.phone)) {
        return 'El número de teléfono debe contener solo números (entre 7 y 10 dígitos).';
    }
    return null;
}

export const ElderlyPage: FC<Props> = ({ isAdmin = false }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [myPermissions, setMyPermissions] = useState<RolePermission[] | null>(null);
    const [showHistorical, setShowHistorical] = useState(false);
    const [selected, setSelected] = useState<Patient | null>(null);
    const [history, setHistory] = useState<PatientHistory[]>([]);
    const [form, setForm] = useState<PatientForm>(emptyPatient);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [historyNotice, setHistoryNotice] = useState('');
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [historyType, setHistoryType] = useState('');
    const [historyDescription, setHistoryDescription] = useState('');
    const [historyDate, setHistoryDate] = useState('');

    useEffect(() => {
        if (isAdmin) {
            setMyPermissions(null);
            return;
        }
        let active = true;
        listMyPermissions()
            .then((items) => { if (active) setMyPermissions(items); })
            .catch(() => { if (active) setMyPermissions([]); });
        return () => { active = false; };
    }, [isAdmin]);

    const permMap = useMemo(
        () => new Map((myPermissions ?? []).map((item) => [`${item.module}/${item.operation}`, item.allowed])),
        [myPermissions],
    );
    const canCreatePatient = isAdmin || (permMap.get('PACIENTES/CREATE') ?? true);
    const canUpdatePatient = isAdmin || (permMap.get('PACIENTES/UPDATE') ?? true);
    const canReadHistory = isAdmin || (permMap.get('ANTECEDENTES/READ') ?? true);
    const canCreateHistory = isAdmin || (permMap.get('ANTECEDENTES/CREATE') ?? true);
    const canUpdateHistory = isAdmin || (permMap.get('ANTECEDENTES/UPDATE') ?? false);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = showHistorical ? await listHistoricalPatients() : await listPatients();
            setPatients(result);
            setSelected((current) => current ? result.find((item) => item.id === current.id) ?? null : null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No fue posible consultar los pacientes.');
        } finally {
            setLoading(false);
        }
    }, [showHistorical]);

    useEffect(() => { void reload(); }, [reload]);

    useEffect(() => {
        setEditingHistoryId(null);
        setHistoryType('');
        setHistoryDescription('');
        setHistoryDate('');
        setHistoryNotice('');
        if (!selected) {
            setHistory([]);
            setHistoryError('');
            setHistoryLoading(false);
            return;
        }
        if (!canReadHistory) {
            setHistory([]);
            setHistoryLoading(false);
            setHistoryError('El acceso a los antecedentes clínicos de este paciente está restringido por la configuración de permisos.');
            return;
        }
        let active = true;
        setHistory([]);
        setHistoryLoading(true);
        setHistoryError('');
        listPatientHistory(selected.id)
            .then((items) => { if (active) setHistory(items); })
            .catch((cause: unknown) => {
                if (!active) return;
                if (cause instanceof ApiRequestError && cause.status === 403) {
                    setHistoryError('El acceso a los antecedentes clínicos de este paciente está restringido por la configuración de permisos.');
                } else {
                    setHistoryError(cause instanceof Error ? cause.message : 'No fue posible consultar los antecedentes.');
                }
            })
            .finally(() => { if (active) setHistoryLoading(false); });
        return () => { active = false; };
    }, [selected?.id, canReadHistory]);

    const submitPatient = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setNotice('');
        const data = new FormData(event.currentTarget);
        const value: PatientForm = {
            fullName: String(data.get('fullName') ?? '').trim(),
            document: String(data.get('document') ?? '').trim(),
            birthDate: String(data.get('birthDate') ?? '').trim() || null,
            phone: String(data.get('phone') ?? '').trim() || null,
            address: String(data.get('address') ?? '').trim() || null,
            observations: String(data.get('observations') ?? '').trim() || null,
        };
        const validationError = validatePatientForm(value);
        if (validationError) {
            setError(validationError);
            return;
        }
        setSaving(true);
        try {
            if (editing && selected) {
                await updatePatient(selected.id, value);
                setNotice('Paciente actualizado.');
            } else {
                await createPatient(value);
                setNotice('Paciente registrado.');
            }
            setForm(emptyPatient);
            setEditing(false);
            setSelected(null);
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No fue posible guardar el paciente.');
        } finally { setSaving(false); }
    };

    const beginEdit = (patient: Patient) => {
        setSelected(patient);
        setEditing(true);
        setError('');
        setNotice('');
        setForm({
            fullName: patient.fullName,
            document: patient.document,
            birthDate: patient.birthDate,
            phone: patient.phone,
            address: patient.address,
            observations: patient.observations,
        });
    };

    const deactivate = async (patient: Patient) => {
        if (!window.confirm(`¿Desactivar a ${patient.fullName}? Sus antecedentes se conservarán.`)) return;
        setError(''); setNotice('');
        try { await deactivatePatient(patient.id); setNotice('Paciente desactivado; sus antecedentes se conservaron.'); await reload(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible desactivar el paciente.'); }
    };

    const submitHistory = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selected) return;
        setSaving(true);
        setHistoryError('');
        setHistoryNotice('');
        try {
            const payload = { type: historyType.trim(), description: historyDescription.trim(), date: historyDate };
            if (editingHistoryId) {
                await updatePatientHistory(editingHistoryId, payload);
                setHistoryNotice('Antecedente actualizado.');
            } else {
                await createPatientHistory(selected.id, payload);
                setHistoryNotice('Antecedente registrado.');
            }
            setEditingHistoryId(null);
            setHistoryType('');
            setHistoryDescription('');
            setHistoryDate('');
            setHistory(await listPatientHistory(selected.id));
        } catch (cause) {
            setHistoryError(cause instanceof Error ? cause.message : 'No fue posible guardar el antecedente.');
        } finally {
            setSaving(false);
        }
    };

    const beginEditHistory = (item: PatientHistory) => {
        setEditingHistoryId(item.id);
        setHistoryType(item.type);
        setHistoryDescription(item.description);
        setHistoryDate(item.date);
        setHistoryError('');
        setHistoryNotice('');
    };

    const showPatientForm = editing ? canUpdatePatient : canCreatePatient;
    const showHistoryForm = Boolean(selected?.active && canReadHistory && (editingHistoryId ? canUpdateHistory : canCreateHistory));

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">{isAdmin ? 'Administración' : 'Atención profesional'}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Adultos mayores</h1>
                <p className="mt-1 text-sm text-gray-500">Registros conectados a la API de pacientes.</p>
                <button type="button" className="mt-3 rounded-lg border px-3 py-2 text-sm" onClick={() => setShowHistorical((value) => !value)}>
                    {showHistorical ? 'Volver a pacientes activos' : 'Consultar historico de pacientes inactivos'}
                </button>
            </header>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
            {loading && <p role="status" className="text-sm text-gray-600">Cargando pacientes…</p>}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
                <div className="space-y-3">
                    {!loading && patients.length === 0 && !error && <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">{showHistorical ? 'No hay pacientes inactivos autorizados para consultar.' : 'No hay pacientes activos registrados.'}</p>}
                    {patients.map((patient) => (
                        <article key={patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                            <button type="button" className="text-left" onClick={() => { setSelected(patient); setEditing(false); }}>
                                <span className="block font-semibold text-gray-900">{patient.fullName}</span>
                                <span className="text-sm text-gray-500">Documento: {patient.document} · {patient.active ? 'Activo' : 'Inactivo'}</span>
                            </button>
                            <div className="flex gap-2">
                                <button type="button" className="rounded-lg border px-3 py-2 text-sm font-medium text-[#0d7377] hover:bg-teal-50" onClick={() => { setSelected(patient); setEditing(false); }}>Abrir ficha</button>
                                {patient.active && canUpdatePatient && <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => beginEdit(patient)}>Editar</button>}
                                {isAdmin && patient.active && <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700" onClick={() => void deactivate(patient)}>Desactivar</button>}
                            </div>
                        </article>
                    ))}
                </div>

                <div className="space-y-6">
                    {showPatientForm ? (
                        <form noValidate onSubmit={(event) => void submitPatient(event)} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                            <h2 className="text-lg font-semibold">{editing ? 'Actualizar paciente' : 'Registrar paciente'}</h2>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Nombres completos *
                                <input name="fullName" required placeholder="Nombres completos" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Documento de identidad (cédula) *
                                <input name="document" required inputMode="numeric" placeholder="Solo números (6 a 10 dígitos)" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Fecha de nacimiento *
                                <input name="birthDate" required type="date" value={form.birthDate ?? ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value || null })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Teléfono *
                                <input name="phone" required inputMode="tel" placeholder="Solo números (7 a 10 dígitos)" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Dirección (opcional)
                                <input name="address" placeholder="Dirección (opcional)" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value || null })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <label className="block space-y-1 text-xs font-semibold text-gray-700">
                                Observaciones (opcional)
                                <textarea name="observations" placeholder="Observaciones (opcional)" value={form.observations ?? ''} onChange={(e) => setForm({ ...form, observations: e.target.value || null })} className="w-full rounded-lg border p-2 text-sm font-normal" />
                            </label>
                            <div className="flex gap-2">
                                <button disabled={saving} className="rounded-lg bg-[#0d7377] px-4 py-2 text-white disabled:opacity-50">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar'}</button>
                                {editing && <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { setEditing(false); setForm(emptyPatient); }}>Cancelar</button>}
                            </div>
                        </form>
                    ) : !isAdmin && !editing && (
                        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            El registro de nuevos pacientes está restringido para tu rol por la configuración de permisos.
                        </div>
                    )}

                    {selected && <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <header className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                            <div><p className="text-[11px] font-bold uppercase tracking-wider text-[#0d7377]">Ficha del paciente</p><h2 className="mt-1 text-xl font-bold text-[#102a36]">{selected.fullName}</h2></div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${selected.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selected.active ? 'Activo' : 'Inactivo'}</span>
                        </header>
                        <section aria-labelledby="patient-data-heading">
                            <h3 id="patient-data-heading" className="mb-3 text-sm font-semibold text-slate-800">Datos personales y contacto</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                <div><dt className="text-xs text-slate-500">Documento de identidad</dt><dd className="mt-0.5 text-sm font-medium text-slate-800">{selected.document || 'No registrado'}</dd></div>
                                <div><dt className="text-xs text-slate-500">Fecha de nacimiento</dt><dd className="mt-0.5 text-sm font-medium text-slate-800">{formatBirthDate(selected.birthDate)}</dd></div>
                                <div><dt className="text-xs text-slate-500">Telefono</dt><dd className="mt-0.5 text-sm font-medium text-slate-800">{selected.phone || 'No registrado'}</dd></div>
                                <div><dt className="text-xs text-slate-500">Direccion</dt><dd className="mt-0.5 text-sm font-medium text-slate-800">{selected.address || 'No registrada'}</dd></div>
                            </dl>
                        </section>
                        <section className="rounded-xl bg-slate-50 p-3" aria-labelledby="patient-observations-heading">
                            <h3 id="patient-observations-heading" className="text-xs font-semibold text-slate-600">Observaciones generales</h3>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">{selected.observations || 'No hay observaciones registradas.'}</p>
                        </section>
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Antecedentes clinicos</h3>
                                <p className="mt-1 text-xs text-gray-500">Eventos y antecedentes registrados para este paciente.</p>
                            </div>
                            {historyError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{historyError}</div>}
                            {historyNotice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{historyNotice}</div>}
                            {historyLoading && <p role="status" className="text-sm text-gray-600">Cargando antecedentes…</p>}
                            {!historyLoading && !historyError && canReadHistory && history.length === 0 && <p className="text-sm text-gray-600">No hay antecedentes registrados.</p>}
                            {!historyLoading && !historyError && canReadHistory && history.length > 0 && (
                                <ul className="space-y-3">
                                    {history.map((item) => (
                                        <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3">
                                            <div>
                                                <p className="font-medium">{item.type} · {item.date}</p>
                                                <p className="text-sm text-gray-700">{item.description}</p>
                                            </div>
                                            {selected.active && canUpdateHistory && (
                                                <button type="button" className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white" onClick={() => beginEditHistory(item)}>
                                                    Editar
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selected.active && canReadHistory && !canCreateHistory && !editingHistoryId && !historyError && (
                                <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                    El registro de nuevos antecedentes está restringido por la configuración de permisos.
                                </p>
                            )}
                            {showHistoryForm && (
                                <form onSubmit={(event) => void submitHistory(event)} className="space-y-2 border-t pt-4">
                                    <h4 className="font-medium">{editingHistoryId ? 'Actualizar antecedente' : 'Agregar antecedente'}</h4>
                                    <input required placeholder="Tipo" value={historyType} onChange={(e) => setHistoryType(e.target.value)} className="w-full rounded-lg border p-2" />
                                    <textarea required placeholder="Descripción" value={historyDescription} onChange={(e) => setHistoryDescription(e.target.value)} className="w-full rounded-lg border p-2" />
                                    <input required type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="w-full rounded-lg border p-2" />
                                    <div className="flex gap-2">
                                        <button disabled={saving} className="rounded-lg border px-4 py-2 disabled:opacity-50">{editingHistoryId ? 'Guardar cambios' : 'Guardar antecedente'}</button>
                                        {editingHistoryId && (
                                            <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { setEditingHistoryId(null); setHistoryType(''); setHistoryDescription(''); setHistoryDate(''); }}>
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </section>}
                </div>
            </div>
        </section>
    );
};
