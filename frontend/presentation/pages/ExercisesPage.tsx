import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import {
    assignExercisePlan,
    listExerciseCatalog,
    listExerciseFollowUps,
    listExercisePlans,
    listPatients,
} from '../../application/managementService';
import type { ClinicalRecord, ExerciseCatalogItem, ExercisePlan } from '../../infrastructure/managementApi';
import type { Patient } from '../../domain/models/management';

type Props = { readOnly?: boolean };
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

export const ExercisesPage: FC<Props> = ({ readOnly = false }) => {
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [history, setHistory] = useState<ClinicalRecord[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
    const [patientId, setPatientId] = useState('');
    const [exerciseId, setExerciseId] = useState('');
    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [currentPlans, completed, assignedPatients] = await Promise.all([
                listExercisePlans(), listExerciseFollowUps(), readOnly ? Promise.resolve([] as Patient[]) : listPatients(),
            ]);
            setPlans(currentPlans); setHistory(completed); setPatients(assignedPatients);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los ejercicios.'); }
        finally { setLoading(false); }
    }, [readOnly]);
    useEffect(() => { void reload(); }, [reload]);

    useEffect(() => {
        if (!patientId) { setCatalog([]); setExerciseId(''); return; }
        let current = true;
        setCatalogLoading(true); setError(''); setExerciseId('');
        listExerciseCatalog(patientId)
            .then((items) => { if (current) setCatalog(items); })
            .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : 'No se pudo revisar el catálogo clínico.'); })
            .finally(() => { if (current) setCatalogLoading(false); });
        return () => { current = false; };
    }, [patientId]);

    const selectedExercise = catalog.find((item) => item.id === exerciseId);
    const blockedExercises = catalog.filter((item) => item.blocked);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedExercise || selectedExercise.blocked) return;
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setSaving(true); setError(''); setNotice('');
        try {
            await assignExercisePlan({
                patientId,
                exerciseId: selectedExercise.id,
                frequency: String(form.get('frequency')).trim(),
                sets: String(form.get('sets') ?? ''),
                repetitions: String(form.get('repetitions') ?? ''),
                durationMinutes: String(form.get('durationMinutes') ?? ''),
                notes: String(form.get('notes') ?? '').trim(),
            });
            setNotice('Ejercicio agregado al plan del paciente.');
            setExerciseId('');
            formElement.reset();
            await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo asignar el ejercicio.'); }
        finally { setSaving(false); }
    };

    return <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
        <header className="rounded-3xl bg-gradient-to-r from-[#083447] via-[#0b6670] to-[#087f79] p-6 text-white shadow-lg shadow-teal-950/10 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Actividad física segura</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ejercicios</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Consulta el catálogo, revisa las alertas asociadas a los antecedentes y agrega ejercicios al plan del paciente.</p>
        </header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        {!readOnly && <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            <div><h2 className="text-lg font-bold text-slate-900">Agregar ejercicio al plan</h2><p className="mt-1 text-sm text-slate-500">La frecuencia y la carga deben ser definidas por el profesional tratante según su valoración.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Paciente asignado
                    <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className={inputClass}>
                        <option value="">Selecciona un paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}
                    </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">Ejercicio del catálogo
                    <select required value={exerciseId} onChange={(event) => setExerciseId(event.target.value)} disabled={!patientId || catalogLoading} className={inputClass}>
                        <option value="">{catalogLoading ? 'Revisando antecedentes…' : 'Selecciona un ejercicio'}</option>
                        {catalog.map((exercise) => <option key={exercise.id} value={exercise.id} disabled={exercise.blocked}>{exercise.blocked ? '⚠ ' : ''}{exercise.name} · {exercise.category}{exercise.blocked ? ' · revisar alerta' : ''}</option>)}
                    </select>
                </label>
            </div>
            {selectedExercise && <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm leading-6 text-teal-950"><strong>{selectedExercise.category}:</strong> {selectedExercise.description}</p>}
            {patientId && blockedExercises.length > 0 && <aside role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <h3 className="font-bold">Revisión clínica necesaria</h3>
                <p className="mt-1 text-sm leading-6">Algunos antecedentes coinciden con restricciones del catálogo. Estos ejercicios no se pueden asignar desde esta pantalla; solicita valoración del profesional tratante.</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">{blockedExercises.map((exercise) => <li key={exercise.id} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-sm"><strong>{exercise.name}</strong><span className="block text-xs text-amber-800">Coincidencia: {exercise.alerts.join(', ')}</span></li>)}</ul>
            </aside>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-semibold text-slate-700">Frecuencia
                    <input required name="frequency" maxLength={120} placeholder="Ej.: según plan semanal" className={inputClass} />
                </label>
                <label className="text-sm font-semibold text-slate-700">Series (opcional)
                    <input name="sets" type="number" min="1" max="20" className={inputClass} />
                </label>
                <label className="text-sm font-semibold text-slate-700">Repeticiones (opcional)
                    <input name="repetitions" type="number" min="1" max="200" className={inputClass} />
                </label>
                <label className="text-sm font-semibold text-slate-700">Duración en minutos (opcional)
                    <input name="durationMinutes" type="number" min="1" max="240" className={inputClass} />
                </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">Indicaciones del profesional (opcional)
                <textarea name="notes" maxLength={2000} rows={3} className={inputClass} placeholder="Apoyos, supervisión u observaciones acordadas con el paciente" />
            </label>
            <button type="submit" disabled={saving || !patientId || !selectedExercise || selectedExercise.blocked || catalogLoading} className="rounded-xl bg-[#0d7377] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando…' : 'Agregar al plan'}</button>
        </form>}

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Planes de ejercicio activos</h2><p className="mt-1 text-sm text-slate-500">Se muestran solo los planes permitidos para tu cuenta.</p></div>
            {loading ? <p className="p-6 text-center text-sm text-slate-500">Cargando planes…</p> : plans.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Aún no hay ejercicios asignados.</p> : <div className="divide-y divide-slate-100">{plans.map((plan) => <article key={plan.id} className="p-5 transition hover:bg-teal-50/30">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{plan.exerciseName}</p><p className="mt-1 text-sm text-teal-800">{plan.patientName} · {plan.category}</p></div><time className="text-xs text-slate-500">{new Date(plan.date).toLocaleString()}</time></div>
                <p className="mt-3 text-sm text-slate-700">Frecuencia: <strong>{plan.frequency}</strong>{plan.sets !== null && ` · ${plan.sets} series`}{plan.repetitions !== null && ` · ${plan.repetitions} repeticiones`}{plan.durationMinutes !== null && ` · ${plan.durationMinutes} min`}</p>
                {plan.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{plan.notes}</p>}
            </article>)}</div>}
        </section>

        {history.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><h2 className="border-b border-slate-100 p-5 font-bold text-slate-900">Seguimiento de actividades realizadas</h2><div className="divide-y divide-slate-100">{history.map((item) => <article key={item.id} className="p-5"><p className="font-semibold text-slate-800">{item.patientName} · {item.item}</p><time className="mt-1 block text-xs text-slate-500">{new Date(item.date).toLocaleString()}</time><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.notes}</p></article>)}</div></section>}
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">El catálogo ofrece movimientos generales. Las alertas se basan en texto de antecedentes y no reemplazan la valoración clínica. Revisa siempre las restricciones y adapta el plan al paciente.</p>
    </section>;
};
export default ExercisesPage;
