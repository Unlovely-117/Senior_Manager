import { useCallback, useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { createAppointment, listAppointments, listPatients, listProfessionals, updateAppointment } from '../../application/managementService';
import type { ClinicalRecord } from '../../infrastructure/managementApi';
import type { Patient, Professional } from '../../domain/models/management';
import { ConfirmDialog } from '../components/ConfirmDialog';

type Props = { onNavigate?: (view: string) => void; isAdmin?: boolean };

const listDateFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

function formatAppointmentDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : listDateFormatter.format(date);
}

function statusBadge(status: string): { label: string; className: string } {
    if (status === 'CANCELADA') return { label: 'Cancelada', className: 'bg-red-50 text-red-700' };
    if (status === 'COMPLETADA') return { label: 'Completada', className: 'bg-emerald-50 text-emerald-700' };
    if (status === 'PROGRAMADA') return { label: 'Programada', className: 'bg-sky-50 text-sky-700' };
    return { label: status || 'Sin estado', className: 'bg-slate-100 text-slate-600' };
}

export const AdminAppointmentsPage: FC<Props> = ({ isAdmin = true }) => {
    const [items, setItems] = useState<ClinicalRecord[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [pendingCancel, setPendingCancel] = useState<ClinicalRecord | null>(null);

    const requestSeq = useRef(0);
    const reload = useCallback(async () => {
        const requestId = ++requestSeq.current;
        setLoading(true); setError('');
        try {
            const data = await listAppointments();
            if (requestId !== requestSeq.current) return;
            setItems(data);
            if (isAdmin) {
                const [patientList, professionalList] = await Promise.all([listPatients(), listProfessionals()]);
                if (requestId !== requestSeq.current) return;
                setPatients(patientList);
                setProfessionals(professionalList.filter((item) => item.active && item.accountLinked && item.id !== null));
            } else {
                const patientList = await listPatients();
                if (requestId !== requestSeq.current) return;
                setPatients(patientList);
            }
        } catch (cause) { if (requestId === requestSeq.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las citas.'); }
        finally { if (requestId === requestSeq.current) setLoading(false); }
    }, [isAdmin]);
    useEffect(() => {
        void reload();
        return () => { requestSeq.current += 1; }; // Ignore responses from superseded reloads.
    }, [reload]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const form = event.currentTarget; setSaving(true); setError(''); setNotice('');
        const data = new FormData(event.currentTarget);
        const dateValue = String(data.get('date'));
        const selectedDate = new Date(dateValue);
        if (Number.isNaN(selectedDate.getTime())) { setError('Selecciona una fecha y hora válida.'); setSaving(false); return; }
        if (selectedDate.getTime() < Date.now() - 60000) { setError('No se puede crear una cita en el pasado. Elige una fecha y hora futura.'); setSaving(false); return; }
        try {
            await createAppointment({ patientId: String(data.get('patientId')), professionalId: isAdmin ? String(data.get('professionalId')) : undefined, date: selectedDate.toISOString(), item: String(data.get('reason')).trim() });
            setNotice('Cita creada y guardada.'); form.reset(); await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la cita.'); }
        finally { setSaving(false); }
    };

    const cancel = async (appointment: ClinicalRecord) => {
        setSavingId(appointment.id); setError('');
        try { await updateAppointment(appointment.id, { status: 'CANCELADA' }); setNotice('Cita cancelada.'); await reload(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cancelar la cita.'); }
        finally { setSavingId(null); }
    };

    const complete = async (appointment: ClinicalRecord) => {
        setSavingId(appointment.id); setError('');
        try { await updateAppointment(appointment.id, { status: 'COMPLETADA' }); setNotice('Cita marcada como completada.'); await reload(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cita.'); }
        finally { setSavingId(null); }
    };

    const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    return <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
        <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Agenda</p><h1 className="mt-2 text-3xl font-bold text-[#102a36]">Citas médicas</h1><p className="mt-2 text-sm text-slate-500">{isAdmin ? 'Administra citas guardadas en PostgreSQL.' : 'Gestiona citas de pacientes con asignación activa a tu cuenta.'}</p></header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Paciente<select required name="patientId" className="mt-1 w-full rounded-xl border p-3 text-sm"><option value="">Selecciona</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
            {isAdmin && <label className="text-sm font-semibold text-slate-700">Profesional<select required name="professionalId" className="mt-1 w-full rounded-xl border p-3 text-sm"><option value="">Selecciona</option>{professionals.filter((p) => p.id !== null).map((p) => <option key={p.id ?? p.email} value={p.id ?? ''}>{p.name}</option>)}</select></label>}
            <label className="text-sm font-semibold text-slate-700">Fecha y hora<input required type="datetime-local" name="date" min={minDate} className="mt-1 w-full rounded-xl border p-3 text-sm" /></label>
            <label className="text-sm font-semibold text-slate-700">Motivo<input required maxLength={500} name="reason" className="mt-1 w-full rounded-xl border p-3 text-sm" /></label>
            <button disabled={saving || patients.length === 0 || (isAdmin && professionals.length === 0)} className="rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Guardando…' : 'Crear cita'}</button>
        </form>
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><h2 className="border-b p-5 font-bold text-[#102a36]">Agenda registrada</h2>{loading ? <p className="p-6 text-center text-sm text-slate-500">Cargando…</p> : items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No hay citas registradas.</p> : <div className="divide-y">{items.map((item) => { const status = item.estado ?? item.notes ?? 'PROGRAMADA'; const badge = statusBadge(status); return (
            <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                    <p className="font-semibold text-slate-800">{item.patientName} · {item.item}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatAppointmentDate(item.date)} {item.professionalName ? `· ${item.professionalName}` : ''}</p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                </div>
                {status === 'PROGRAMADA' && <div className="flex gap-2">
                    <button type="button" disabled={savingId !== null} onClick={() => void complete(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50">Completar</button>
                    <button type="button" disabled={savingId !== null} onClick={() => setPendingCancel(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancelar</button>
                </div>}
            </article>
        ); })}</div>}</section>
        <ConfirmDialog
            open={pendingCancel !== null}
            title="Cancelar cita"
            message={pendingCancel ? `¿Cancelar la cita de ${pendingCancel.patientName}?` : ''}
            danger
            onConfirm={() => { const appointment = pendingCancel; setPendingCancel(null); if (appointment) void cancel(appointment); }}
            onCancel={() => setPendingCancel(null)}
        />
    </section>;
};
export default AdminAppointmentsPage;
