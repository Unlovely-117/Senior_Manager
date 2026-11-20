import { useCallback, useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import {
    ApiRequestError,
    createAppointment,
    listAppointments,
    listMyPermissions,
    listPatients,
    listProfessionals,
    updateAppointment,
} from '../../application/managementService';
import type { ClinicalRecord } from '../../infrastructure/managementApi';
import type { Patient, Professional, RolePermission } from '../../domain/models/management';

type Props = { onNavigate?: (view: string) => void; isAdmin?: boolean };

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10';

function formatLocalDateTimeMin(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalIsoWithOffset(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = pad(Math.floor(absOffset / 60));
    const offsetMins = pad(absOffset % 60);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${offsetHours}:${offsetMins}`;
}

function statusMeta(status: string): { label: string; style: string } {
    if (status === 'EN_PROGRESO') return { label: 'En progreso', style: 'border-amber-200 bg-amber-50 text-amber-800' };
    if (status === 'COMPLETADA') return { label: 'Completada', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
    if (status === 'CANCELADA') return { label: 'Cancelada', style: 'border-slate-200 bg-slate-100 text-slate-600' };
    return { label: 'Programada', style: 'border-cyan-200 bg-cyan-50 text-cyan-800' };
}

export const AdminAppointmentsPage: FC<Props> = ({ isAdmin = true }) => {
    const [items, setItems] = useState<ClinicalRecord[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [myPermissions, setMyPermissions] = useState<RolePermission[] | null>(null);
    const [appointmentsRestricted, setAppointmentsRestricted] = useState(false);
    const [patientsRestricted, setPatientsRestricted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [appointmentsError, setAppointmentsError] = useState('');
    const [notice, setNotice] = useState('');

    const permMap = useMemo(
        () => new Map((myPermissions ?? []).map((item) => [`${item.module}/${item.operation}`, item.allowed])),
        [myPermissions],
    );
    const canReadAppointments = isAdmin || (permMap.get('CITAS/READ') ?? true);
    const canCreateAppointments = isAdmin || (permMap.get('CITAS/CREATE') ?? true);
    const canUpdateAppointments = isAdmin || (permMap.get('CITAS/UPDATE') ?? true);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        setAppointmentsError('');
        setAppointmentsRestricted(false);
        setPatientsRestricted(false);

        const permissionsPromise = isAdmin
            ? Promise.resolve([] as RolePermission[])
            : listMyPermissions();

        const [permsRes, appointmentsRes, patientsRes, professionalsRes] = await Promise.allSettled([
            permissionsPromise,
            listAppointments(),
            listPatients(),
            isAdmin ? listProfessionals() : Promise.resolve([] as Professional[]),
        ]);

        if (!isAdmin && permsRes.status === 'fulfilled') {
            setMyPermissions(permsRes.value);
        }

        if (appointmentsRes.status === 'fulfilled') {
            setItems(appointmentsRes.value);
        } else {
            setItems([]);
            const reason = appointmentsRes.reason;
            if (reason instanceof ApiRequestError && reason.status === 403) {
                setAppointmentsRestricted(true);
            } else {
                setAppointmentsError(reason instanceof Error ? reason.message : 'No se pudieron cargar las citas.');
            }
        }

        if (patientsRes.status === 'fulfilled') {
            setPatients(patientsRes.value);
        } else {
            setPatients([]);
            const reason = patientsRes.reason;
            if (reason instanceof ApiRequestError && reason.status === 403) {
                setPatientsRestricted(true);
            } else {
                setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los pacientes.');
            }
        }

        if (isAdmin && professionalsRes.status === 'fulfilled') {
            setProfessionals(professionalsRes.value.filter((item) => item.active && item.accountLinked));
        }

        setLoading(false);
    }, [isAdmin]);

    useEffect(() => { void reload(); }, [reload]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setError('');
        setNotice('');

        const data = new FormData(form);
        const patientId = String(data.get('patientId') ?? '').trim();
        const professionalId = String(data.get('professionalId') ?? '').trim();
        const rawDate = String(data.get('date') ?? '').trim();
        const reason = String(data.get('reason') ?? '').trim();

        if (!patientId || (isAdmin && !professionalId) || !rawDate || !reason) {
            setError('Completa todos los campos obligatorios (*) para programar la cita.');
            return;
        }
        const parsedDate = new Date(rawDate);
        if (Number.isNaN(parsedDate.getTime())) {
            setError('Selecciona una fecha y hora válida.');
            return;
        }
        if (parsedDate.getTime() < Date.now() - 60_000) {
            setError('No se pueden programar citas en días u horas pasadas. Selecciona el día actual o una fecha posterior.');
            return;
        }
        const hours = parsedDate.getHours();
        const minutes = parsedDate.getMinutes();
        if (hours < 7 || hours > 20 || (hours === 20 && minutes > 0)) {
            setError('El horario de la cita debe estar entre las 7:00 a. m. y las 8:00 p. m.');
            return;
        }
        const targetMinute = Math.floor(parsedDate.getTime() / 60_000);
        const hasConflict = items.some((existing) => {
            if (existing.notes !== 'PROGRAMADA' && existing.notes !== 'EN_PROGRESO') return false;
            if (isAdmin && existing.professionalId !== professionalId) return false;
            return Math.floor(new Date(existing.date).getTime() / 60_000) === targetMinute;
        });
        if (hasConflict) {
            setError('El profesional seleccionado ya tiene una cita asignada en ese mismo día y hora. Elige otro horario disponible.');
            return;
        }

        setSaving(true);
        try {
            await createAppointment({
                patientId,
                professionalId: isAdmin ? professionalId : undefined,
                date: toLocalIsoWithOffset(parsedDate),
                item: reason,
            });
            setNotice('Cita creada y guardada.');
            form.reset();
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar la cita.');
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (appointment: ClinicalRecord, nextStatus: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA') => {
        if (nextStatus === 'CANCELADA' && !window.confirm(`¿Cancelar la cita de ${appointment.patientName}?`)) {
            return;
        }
        setError('');
        setNotice('');
        setUpdatingId(appointment.id);
        try {
            await updateAppointment(appointment.id, { status: nextStatus });
            setNotice(
                nextStatus === 'EN_PROGRESO'
                    ? 'Cita puesta en progreso.'
                    : nextStatus === 'COMPLETADA'
                        ? 'Cita marcada como completada.'
                        : 'Cita cancelada.',
            );
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cita.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Agenda</p>
                <h1 className="mt-2 text-3xl font-bold text-[#102a36]">Citas médicas</h1>
                <p className="mt-2 text-sm text-slate-500">
                    {isAdmin
                        ? 'Administra citas guardadas en PostgreSQL.'
                        : 'Agenda y gestiona el progreso de citas para tus pacientes con asignación activa.'}
                </p>
            </header>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

            {canCreateAppointments ? (
                <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <h2 className="text-lg font-bold text-[#102a36]">Programar nueva cita</h2>
                        <p className="mt-1 text-xs text-slate-500">Los campos marcados con * son obligatorios.</p>
                    </div>
                    {patientsRestricted && (
                        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2">
                            El permiso para consultar pacientes está deshabilitado para tu rol; no se pueden listar pacientes disponibles.
                        </p>
                    )}
                    <label className="text-sm font-semibold text-slate-700">
                        Paciente *
                        <select required name="patientId" className={inputClass}>
                            <option value="">Selecciona un paciente</option>
                            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </label>
                    {isAdmin && (
                        <label className="text-sm font-semibold text-slate-700">
                            Profesional *
                            <select required name="professionalId" className={inputClass}>
                                <option value="">Selecciona un profesional</option>
                                {professionals.map((p) => <option key={p.id} value={p.id ?? ''}>{p.name}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="text-sm font-semibold text-slate-700">
                        Fecha y hora *
                        <input required type="datetime-local" name="date" min={formatLocalDateTimeMin()} className={inputClass} />
                        <span className="mt-1 block text-xs font-normal text-slate-500">Horario permitido: 7:00 a. m. a 8:00 p. m. (día actual o posterior).</span>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        Motivo *
                        <input required maxLength={500} name="reason" placeholder="Ej.: Control geriátrico mensual" className={inputClass} />
                    </label>
                    <button
                        type="submit"
                        disabled={saving || patients.length === 0 || (isAdmin && professionals.length === 0)}
                        className="rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                    >
                        {saving ? 'Guardando…' : 'Crear cita'}
                    </button>
                </form>
            ) : (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    La creación de nuevas citas está restringida para tu rol por la configuración de permisos.
                </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <h2 className="border-b border-slate-100 p-5 font-bold text-[#102a36]">Agenda registrada</h2>
                {loading ? (
                    <p className="p-6 text-center text-sm text-slate-500">Cargando citas…</p>
                ) : !canReadAppointments || appointmentsRestricted ? (
                    <p role="status" className="p-6 text-sm text-amber-900">
                        La consulta de la agenda registrada está restringida para tu rol por la configuración de permisos. Aún puedes crear nuevas citas arriba si tu rol lo tiene autorizado.
                    </p>
                ) : appointmentsError ? (
                    <p role="alert" className="p-6 text-sm text-red-700">{appointmentsError}</p>
                ) : items.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">No hay citas registradas.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {items.map((item) => {
                            const badge = statusMeta(item.notes);
                            const isOpen = item.notes === 'PROGRAMADA' || item.notes === 'EN_PROGRESO';
                            const canOperate = canUpdateAppointments && item.patientActive !== false && isOpen;
                            return (
                                <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">{item.patientName} · {item.item}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {new Date(item.date).toLocaleString()} {item.professionalName ? `· ${item.professionalName}` : ''}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.style}`}>
                                                {badge.label}
                                            </span>
                                            {item.patientActive === false && (
                                                <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                                    Paciente inactivo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {canOperate && (
                                        <div className="flex flex-wrap gap-2">
                                            {item.notes === 'PROGRAMADA' && (
                                                <button
                                                    type="button"
                                                    disabled={updatingId === item.id}
                                                    onClick={() => void changeStatus(item, 'EN_PROGRESO')}
                                                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                                                >
                                                    Poner en progreso
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={updatingId === item.id}
                                                onClick={() => void changeStatus(item, 'COMPLETADA')}
                                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                            >
                                                Completar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={updatingId === item.id}
                                                onClick={() => void changeStatus(item, 'CANCELADA')}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                            >
                                                Cancelar / Terminar
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </section>
    );
};

export default AdminAppointmentsPage;
