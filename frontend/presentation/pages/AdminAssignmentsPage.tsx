import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
    assignPatientProfessional,
    endPatientAssignment,
    listPatientAssignments,
    listPatientAssignmentDirectory,
    listProfessionals,
    ApiRequestError,
} from '../../application/managementService';
import type { PatientAssignment, PatientAssignmentSummary, Professional } from '../../domain/models/management';

type AssignmentRow = PatientAssignmentSummary & { history: PatientAssignment[] | null };
const PAGE_SIZE = 25;

function errorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
        if (error.status === 401) return 'La sesión expiró. Inicia sesión nuevamente.';
        if (error.status === 403) return 'Para este módulo se requiere una cuenta de administrador y los permisos PACIENTES/READ, ASIGNACIONES/READ y PROFESSIONALS/READ. Para asignar o finalizar una relación también se necesitan ASIGNACIONES/ASSIGN o ASIGNACIONES/END. La matriz debe estar inicializada en el servidor.';
        if (error.status === 503) return 'El servicio de persistencia no está disponible.';
    }
    return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

export const AdminAssignmentsPage: FC = () => {
    const [rows, setRows] = useState<AssignmentRow[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [professionalDirectory, setProfessionalDirectory] = useState<Professional[]>([]);
    const [selection, setSelection] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [savingPatientId, setSavingPatientId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [patientStatus, setPatientStatus] = useState<'ACTIVO' | 'INACTIVO' | 'TODOS'>('ACTIVO');
    const [assignmentStatus, setAssignmentStatus] = useState<'ACTIVA' | 'FINALIZADA' | 'SIN_ASIGNACION' | 'TODAS'>('TODAS');

    const load = useCallback(async (preserveNotice = false) => {
        setLoading(true);
        setError('');
        if (!preserveNotice) setNotice('');
        try {
            const [directoryPage, directory] = await Promise.all([
                listPatientAssignmentDirectory({ page, size: PAGE_SIZE, patientStatus, assignmentStatus }),
                listProfessionals(),
            ]);
            const eligibleProfessionals = directory.filter((item) => item.accountLinked && item.hasProfile
                && item.accountActive === true && item.profileActive === true);
            const assignmentRows: AssignmentRow[] = directoryPage.items.map((item) => ({ ...item, history: null }));
            setRows(assignmentRows);
            setTotal(directoryPage.total);
            setProfessionalDirectory(directory);
            setProfessionals(eligibleProfessionals);
            setSelection((prior) => {
                const next = { ...prior };
                for (const row of assignmentRows) {
                    const current = row.currentAssignment;
                    const previousEmail = next[row.patient.id];
                    if (!previousEmail || !eligibleProfessionals.some((item) => item.email.toLowerCase() === previousEmail.toLowerCase())) {
                        const currentIsEligible = current && eligibleProfessionals.some((item) => item.email.toLowerCase() === current.professionalEmail.toLowerCase());
                        next[row.patient.id] = currentIsEligible ? current.professionalEmail : '';
                    }
                }
                return next;
            });
        } catch (cause) {
            setRows([]);
            setError(errorMessage(cause));
        } finally {
            setLoading(false);
        }
    }, [page, patientStatus, assignmentStatus]);

    useEffect(() => { void load(); }, [load]);

    const directoryByEmail = useMemo(
        () => new Map(professionals.map((item) => [item.email.toLowerCase(), item])),
        [professionals],
    );
    const assignmentCounts = useMemo(() => ({
        active: rows.filter((item) => item.assignmentState === 'ACTIVE').length,
        pending: rows.filter((item) => item.assignmentState === 'NONE').length,
        finished: rows.filter((item) => item.assignmentState === 'FINALIZED').length,
    }), [rows]);

    const refreshPatientHistory = async (patientId: string) => {
        const history = await listPatientAssignments(patientId);
        setRows((prior) => prior.map((item) => item.patient.id === patientId ? {
            ...item, history,
            currentAssignment: history.find((assignment) => assignment.active) ?? null,
            lastAssignment: [...history].reverse()[0] ?? null,
            assignmentState: history.length === 0 ? 'NONE' : history[history.length - 1]?.active ? 'ACTIVE' : 'FINALIZED',
        } : item));
    };

    const loadHistory = async (patientId: string) => {
        if (rows.find((item) => item.patient.id === patientId)?.history !== null) return;
        try { await refreshPatientHistory(patientId); }
        catch (cause) { setError(errorMessage(cause)); }
    };

    const applyAssignment = async (row: AssignmentRow) => {
        const email = selection[row.patient.id];
        if (!email) return;
        const current = row.currentAssignment;
        const action = current ? 'reasignar este paciente' : 'asignar este paciente';
        if (!window.confirm(`¿Confirmas ${action} a ${directoryByEmail.get(email.toLowerCase())?.name ?? email}? El historial se conservará.`)) return;

        setSavingPatientId(row.patient.id);
        setError('');
        setNotice('');
        try {
            const updatedHistory = await assignPatientProfessional(row.patient.id, email);
            setRows((prior) => prior.map((item) => item.patient.id === row.patient.id ? { ...item, history: updatedHistory,
                currentAssignment: updatedHistory.find((assignment) => assignment.active) ?? null,
                lastAssignment: [...updatedHistory].reverse()[0] ?? null, assignmentState: 'ACTIVE' as const } : item));
            await load(true);
            setRows((prior) => prior.map((item) => item.patient.id === row.patient.id ? { ...item, history: updatedHistory } : item));
            setNotice(`Asignación guardada para ${row.patient.fullName}.`);
        } catch (cause) {
            const outcomeUncertain = !(cause instanceof ApiRequestError) || cause.status >= 500 || cause.outcomeUncertain;
            setError(outcomeUncertain
                ? `${cause instanceof ApiRequestError ? `El servidor respondió HTTP ${cause.status}.` : 'Se perdió la conexión con el servidor.'} No se pudo confirmar el resultado; consulta el historial antes de reintentar.`
                : errorMessage(cause));
            if (outcomeUncertain) {
                try { await refreshPatientHistory(row.patient.id); } catch { /* Preserve the uncertain outcome message. */ }
            }
        } finally {
            setSavingPatientId(null);
        }
    };

    const finishAssignment = async (row: AssignmentRow, current: PatientAssignment) => {
        if (!window.confirm(`¿Finalizar la asignación de ${row.patient.fullName} a ${current.professionalEmail}? El historial se conservará.`)) return;
        setSavingPatientId(row.patient.id);
        setError('');
        setNotice('');
        try {
            const updatedHistory = await endPatientAssignment(row.patient.id);
            setRows((prior) => prior.map((item) => item.patient.id === row.patient.id ? { ...item, history: updatedHistory,
                currentAssignment: null, lastAssignment: [...updatedHistory].reverse()[0] ?? null, assignmentState: 'FINALIZED' as const } : item));
            await load(true);
            setRows((prior) => prior.map((item) => item.patient.id === row.patient.id ? { ...item, history: updatedHistory } : item));
            setNotice(`Asignación finalizada para ${row.patient.fullName}.`);
        } catch (cause) {
            const outcomeUncertain = !(cause instanceof ApiRequestError) || cause.status >= 500 || cause.outcomeUncertain;
            setError(outcomeUncertain
                ? `${cause instanceof ApiRequestError ? `El servidor respondió HTTP ${cause.status}.` : 'Se perdió la conexión con el servidor.'} No se pudo confirmar el resultado; consulta el historial antes de reintentar.`
                : errorMessage(cause));
            if (outcomeUncertain) {
                try { await refreshPatientHistory(row.patient.id); } catch { /* Preserve the uncertain outcome message. */ }
            }
        } finally {
            setSavingPatientId(null);
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#082c3c] via-[#0b5965] to-[#0d8582] p-6 text-white shadow-xl shadow-teal-950/10 sm:p-8">
                <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Coordinación del equipo</p><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Asigna responsables, revisa vínculos activos y conserva el historial de atención.</p></div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">{total} pacientes en esta consulta</span>
                </div>
                <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs text-white/70">Responsable activo (esta página)</p><p className="mt-1 text-2xl font-bold">{loading ? '—' : assignmentCounts.active}</p></div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs text-white/70">Sin asignación</p><p className="mt-1 text-2xl font-bold">{loading ? '—' : assignmentCounts.pending}</p></div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs text-white/70">Relación finalizada</p><p className="mt-1 text-2xl font-bold">{loading ? '—' : assignmentCounts.finished}</p></div>
                </div>
            </div>
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Asignaciones de pacientes</h1>
                <button type="button" onClick={() => void load()} disabled={loading || savingPatientId !== null} className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold text-[#0d7377] disabled:opacity-50">Actualizar listado</button>
                <p className="mt-1 text-sm text-gray-500">Cada operación se vuelve a validar en el backend. El historial anterior se conserva.</p>
            </header>

            <div className="flex flex-wrap gap-3">
                <label className="text-sm">Estado del paciente <select className="ml-2 rounded border p-2" value={patientStatus} onChange={(event) => { setPage(0); setPatientStatus(event.target.value as typeof patientStatus); }}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option><option value="TODOS">Todos</option></select></label>
                <label className="text-sm">Estado de asignación <select className="ml-2 rounded border p-2" value={assignmentStatus} onChange={(event) => { setPage(0); setAssignmentStatus(event.target.value as typeof assignmentStatus); }}><option value="TODAS">Todas</option><option value="ACTIVA">Activa</option><option value="FINALIZADA">Finalizada</option><option value="SIN_ASIGNACION">Sin asignación</option></select></label>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
            {loading && <p role="status" className="text-sm text-gray-600">Cargando pacientes y profesionales...</p>}

            {!loading && !error && rows.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">No hay pacientes para los filtros seleccionados.</p>
            )}
            {!loading && rows.length > 0 && professionals.length === 0 && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No hay cuentas profesionales activas con ficha vinculada en el directorio.</p>
            )}

            <details className="rounded-xl border border-gray-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold">Estado de cuentas y fichas profesionales</summary>
                <ul className="mt-3 space-y-2 text-sm">
                    {professionalDirectory.map((professional) => <li key={professional.email} className="flex flex-wrap justify-between gap-2 border-t pt-2">
                        <span>{professional.name} · {professional.email}</span>
                        <span>Cuenta: {professional.accountActive === null ? 'sin cuenta vinculada' : professional.accountActive ? 'activa' : 'inactiva'} · Ficha: {!professional.hasProfile ? 'inexistente' : professional.profileActive ? 'activa' : 'inactiva'}</span>
                    </li>)}
                    {professionalDirectory.length === 0 && <li className="text-gray-500">No hay profesionales en el directorio.</li>}
                </ul>
            </details>

            <div className="space-y-4">
                {rows.map((row) => {
                    const active = row.currentAssignment;
                    const selectedEmail = selection[row.patient.id] ?? '';
                    const isCurrent = active?.professionalEmail.toLowerCase() === selectedEmail.toLowerCase();
                    return (
                        <article key={row.patient.id} className={`rounded-2xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${row.assignmentState === 'ACTIVE' ? 'border-l-emerald-500' : row.assignmentState === 'FINALIZED' ? 'border-l-slate-400' : 'border-l-amber-400'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-semibold text-gray-900">{row.patient.fullName}</h2>
                                    <p className="mt-1 text-xs text-gray-500">Documento: {row.patient.document} · Paciente {row.patient.active ? 'activo' : 'inactivo'} · {row.assignmentState === 'ACTIVE' ? 'Con asignación activa' : row.assignmentState === 'FINALIZED' ? 'Última asignación finalizada' : 'Sin historial de asignación'}</p>
                                    {active && <p className="mt-2 text-sm text-gray-700">Responsable actual: {directoryByEmail.get(active.professionalEmail.toLowerCase())?.name ?? active.professionalEmail}</p>}
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <label className="text-xs font-semibold text-gray-600">Cuenta profesional
                                        <select aria-label={`Profesional para ${row.patient.fullName}`} className="mt-1 block min-w-56 rounded-lg border p-2 text-sm" value={selectedEmail} onChange={(event) => setSelection((prior) => ({ ...prior, [row.patient.id]: event.target.value }))} disabled={savingPatientId !== null || professionals.length === 0}>
                                            <option value="">Selecciona un profesional</option>
                                            {professionals.map((professional) => <option key={professional.email} value={professional.email}>{professional.name} · {professional.email}</option>)}
                                        </select>
                                    </label>
                                    <button type="button" disabled={!row.patient.active || !selectedEmail || isCurrent || savingPatientId !== null} onClick={() => void applyAssignment(row)} className="rounded-lg bg-[#0d7377] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                                        {savingPatientId === row.patient.id ? 'Guardando…' : active ? 'Reasignar' : 'Asignar'}
                                    </button>
                                    {active && <button type="button" disabled={savingPatientId !== null} onClick={() => void finishAssignment(row, active)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Finalizar</button>}
                                </div>
                            </div>

                            <details className="mt-4 border-t pt-3" onToggle={(event) => { if (event.currentTarget.open) void loadHistory(row.patient.id); }}>
                                <summary className="cursor-pointer text-sm font-semibold text-[#0d7377]">Historial de asignaciones{row.history === null ? '' : ` (${row.history.length})`}</summary>
                                {row.history === null ? <p className="mt-3 text-sm text-gray-500">Abre el historial para consultarlo.</p> : row.history.length === 0 ? <p className="mt-3 text-sm text-gray-500">Aún no hay asignaciones registradas.</p> : (
                                    <ol className="mt-3 space-y-2">
                                        {row.history.map((assignment) => <li key={assignment.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                                            <span>{directoryByEmail.get(assignment.professionalEmail.toLowerCase())?.name ?? assignment.professionalEmail}</span>
                                            <span className="text-gray-600">{assignment.startDate} – {assignment.endDate ?? 'Activa'} · {assignment.active ? 'Activa' : 'Finalizada'}</span>
                                        </li>)}
                                    </ol>
                                )}
                            </details>
                        </article>
                    );
                })}
            </div>
            <nav aria-label="Paginación" className="flex items-center justify-between border-t pt-4 text-sm">
                <span>{total} pacientes</span>
                <div className="flex gap-2"><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-2 disabled:opacity-50">Anterior</button><span className="px-2 py-2">Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button type="button" disabled={(page + 1) * PAGE_SIZE >= total || loading} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-2 disabled:opacity-50">Siguiente</button></div>
            </nav>
        </section>
    );
};

