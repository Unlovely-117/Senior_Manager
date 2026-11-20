import { useEffect, useMemo, useState, type FC } from 'react';
import { listAppointments, listExercisePlans, listPatients } from '../../application/managementService';
import type { ClinicalRecord, ExercisePlan } from '../../infrastructure/managementApi';
import type { Patient } from '../../domain/models/management';

type ProfessionalDashboardPageProps = {
    onNavigate?: (view: string) => void;
};

export const ProfessionalDashboardPage: FC<ProfessionalDashboardPageProps> = ({ onNavigate }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<ClinicalRecord[]>([]);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let current = true;
        setLoading(true);
        setError('');
        Promise.allSettled([listPatients(), listAppointments(), listExercisePlans()])
            .then(([patientsRes, appointmentsRes, plansRes]) => {
                if (!current) return;
                if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value);
                if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value);
                if (plansRes.status === 'fulfilled') setPlans(plansRes.value);

                if (patientsRes.status === 'rejected' && appointmentsRes.status === 'rejected' && plansRes.status === 'rejected') {
                    const reason = patientsRes.reason;
                    setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los datos de tu panel.');
                }
            })
            .finally(() => {
                if (current) setLoading(false);
            });
        return () => { current = false; };
    }, []);

    const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans]);
    const scheduledAppointments = useMemo(
        () => appointments.filter((item) => item.notes === 'PROGRAMADA' || item.notes === 'EN_PROGRESO'),
        [appointments],
    );
    const patientsWithRoutines = useMemo(
        () => new Set(activePlans.map((plan) => plan.patientId)).size,
        [activePlans],
    );

    const summaryCards = [
        {
            label: 'Pacientes asignados',
            value: patients.length,
            detail: 'Adultos mayores bajo tu seguimiento',
            tint: 'bg-teal-50 text-[#0d7377]',
            view: 'mis-pacientes',
        },
        {
            label: 'Sesiones programadas',
            value: scheduledAppointments.length,
            detail: `${appointments.length} citas o sesiones totales`,
            tint: 'bg-cyan-50 text-cyan-700',
            view: 'agenda',
        },
        {
            label: 'Ejercicios en rutinas activas',
            value: activePlans.length,
            detail: `Distribuidos en ${patientsWithRoutines} ${patientsWithRoutines === 1 ? 'paciente' : 'pacientes'}`,
            tint: 'bg-emerald-50 text-emerald-700',
            view: 'ejercicios',
        },
    ];

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="rounded-[28px] bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] p-6 text-white shadow-xl sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Atención profesional</p>
                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Mi panel</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75">
                    Resumen general de tus adultos mayores asignados, sesiones o citas programadas y rutinas de ejercicio activas.
                </p>
            </div>

            {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    No se pudieron cargar los datos: {error}
                </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                {summaryCards.map((card) => (
                    <button
                        key={card.label}
                        type="button"
                        onClick={() => onNavigate?.(card.view)}
                        className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-950/5"
                    >
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${card.tint}`}>
                            {card.label}
                        </span>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-[#102a36]">
                            {loading ? '—' : card.value}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {loading ? 'Consultando información…' : card.detail}
                        </p>
                    </button>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-[#102a36]">Mis pacientes</h2>
                            <p className="mt-1 text-xs text-slate-500">Asignaciones activas</p>
                        </div>
                        {onNavigate && (
                            <button type="button" onClick={() => onNavigate('mis-pacientes')} className="text-xs font-semibold text-[#0d7377] hover:underline">
                                Ver todos
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <p role="status" className="p-6 text-center text-sm text-slate-500">Cargando pacientes…</p>
                    ) : patients.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No tienes pacientes con asignación activa.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {patients.slice(0, 6).map((patient) => (
                                <article key={patient.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">{patient.fullName}</p>
                                        <p className="mt-0.5 text-xs text-slate-500">Documento: {patient.document}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Asignado</span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-[#102a36]">Sesiones y citas</h2>
                            <p className="mt-1 text-xs text-slate-500">Agenda reciente y programada</p>
                        </div>
                        {onNavigate && (
                            <button type="button" onClick={() => onNavigate('agenda')} className="text-xs font-semibold text-[#0d7377] hover:underline">
                                Ver agenda
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <p role="status" className="p-6 text-center text-sm text-slate-500">Cargando sesiones…</p>
                    ) : appointments.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No hay sesiones o citas registradas.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {appointments.slice(0, 6).map((appointment) => (
                                <article key={appointment.id} className="px-5 py-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-800">{appointment.patientName}</p>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            appointment.notes === 'PROGRAMADA'
                                                ? 'bg-cyan-50 text-cyan-800'
                                                : appointment.notes === 'EN_PROGRESO'
                                                    ? 'bg-amber-50 text-amber-800'
                                                    : appointment.notes === 'COMPLETADA'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {appointment.notes === 'EN_PROGRESO' ? 'EN PROGRESO' : appointment.notes}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-slate-600">{appointment.item}</p>
                                    <time className="mt-0.5 block text-[11px] text-slate-400">{new Date(appointment.date).toLocaleString()}</time>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-[#102a36]">Rutinas activas</h2>
                            <p className="mt-1 text-xs text-slate-500">Ejercicios asignados vigentes</p>
                        </div>
                        {onNavigate && (
                            <button type="button" onClick={() => onNavigate('ejercicios')} className="text-xs font-semibold text-[#0d7377] hover:underline">
                                Ir a rutinas
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <p role="status" className="p-6 text-center text-sm text-slate-500">Cargando rutinas…</p>
                    ) : activePlans.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No hay rutinas activas asignadas.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {activePlans.slice(0, 6).map((plan) => (
                                <article key={plan.id} className="px-5 py-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-800">{plan.exerciseName}</p>
                                        <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                                            {plan.category}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-slate-600">{plan.patientName} · {plan.frequency}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
};

export default ProfessionalDashboardPage;
