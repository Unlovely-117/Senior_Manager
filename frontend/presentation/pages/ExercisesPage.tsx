import { useCallback, useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import {
    ApiRequestError,
    assignExercisePlan,
    createExerciseCatalogItem,
    listAllExerciseCatalog,
    listExerciseCatalog,
    listExerciseFollowUps,
    listExercisePlans,
    listPatientHistory,
    listPatients,
    updateExerciseCatalogItem,
    updateExercisePlan,
} from '../../application/managementService';
import type { ClinicalRecord, ExerciseCatalogItem, ExercisePlan } from '../../infrastructure/managementApi';
import type { Patient, PatientHistory } from '../../domain/models/management';

type Props = { readOnly?: boolean };
type PlanDraft = { frequency: string; sets: string; repetitions: string; durationMinutes: string; notes: string };

const emptyCatalogDraft = { name: '', category: 'Movilidad', description: '', restrictions: '' };
const emptyPlanDraft: PlanDraft = { frequency: '', sets: '', repetitions: '', durationMinutes: '', notes: '' };
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';
const exerciseCategories = ['Movilidad', 'Fuerza', 'Equilibrio', 'Resistencia', 'Flexibilidad', 'Respiración', 'Coordinación'] as const;

export const ExercisesPage: FC<Props> = ({ readOnly = false }) => {
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [history, setHistory] = useState<ClinicalRecord[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allCatalog, setAllCatalog] = useState<ExerciseCatalogItem[]>([]);
    const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
    const [patientId, setPatientId] = useState('');
    const [exerciseId, setExerciseId] = useState('');
    const [planCategoryFilter, setPlanCategoryFilter] = useState('Todas');
    const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todas');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [routinePatientFilter, setRoutinePatientFilter] = useState('ALL');
    const [routineStatusFilter, setRoutineStatusFilter] = useState<'active' | 'historical' | 'all'>('active');

    const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);
    const [patientHistoryLoading, setPatientHistoryLoading] = useState(false);
    const [patientHistoryError, setPatientHistoryError] = useState('');

    const [catalogDraft, setCatalogDraft] = useState(emptyCatalogDraft);
    const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
    const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlanDraft);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [savingCatalog, setSavingCatalog] = useState(false);
    const [savingPlan, setSavingPlan] = useState(false);
    const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

    const pendingExerciseIdRef = useRef<string | null>(null);
    const catalogFormRef = useRef<HTMLFormElement | null>(null);
    const planFormRef = useRef<HTMLFormElement | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [currentPlans, completed, fullCatalog, assignedPatients] = await Promise.all([
                listExercisePlans(),
                listExerciseFollowUps(),
                listAllExerciseCatalog(),
                readOnly ? Promise.resolve([] as Patient[]) : listPatients(),
            ]);
            setPlans(currentPlans);
            setHistory(completed);
            setAllCatalog(fullCatalog);
            setPatients(assignedPatients);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los ejercicios.');
        } finally {
            setLoading(false);
        }
    }, [readOnly]);

    useEffect(() => { void reload(); }, [reload]);

    useEffect(() => {
        if (!patientId) {
            setCatalog([]);
            setExerciseId('');
            setPatientHistory([]);
            setPatientHistoryError('');
            setPatientHistoryLoading(false);
            return;
        }
        let current = true;
        const targetExerciseId = pendingExerciseIdRef.current;
        pendingExerciseIdRef.current = null;
        if (!targetExerciseId) {
            setExerciseId('');
        }
        setCatalogLoading(true);
        setPatientHistoryLoading(true);
        setPatientHistoryError('');
        setError('');

        listExerciseCatalog(patientId)
            .then((items) => {
                if (!current) return;
                setCatalog(items);
                if (targetExerciseId) {
                    setExerciseId(targetExerciseId);
                }
            })
            .catch((cause: unknown) => {
                if (current) setError(cause instanceof Error ? cause.message : 'No se pudo revisar el catálogo clínico.');
            })
            .finally(() => {
                if (current) setCatalogLoading(false);
            });

        listPatientHistory(patientId)
            .then((items) => {
                if (current) setPatientHistory(items);
            })
            .catch((cause: unknown) => {
                if (!current) return;
                setPatientHistory([]);
                if (cause instanceof ApiRequestError && cause.status === 403) {
                    setPatientHistoryError('La consulta detallada de antecedentes está restringida por permisos.');
                } else {
                    setPatientHistoryError(cause instanceof Error ? cause.message : 'No fue posible consultar los antecedentes.');
                }
            })
            .finally(() => {
                if (current) setPatientHistoryLoading(false);
            });

        return () => { current = false; };
    }, [patientId]);

    const availableCategories = useMemo(() => {
        const set = new Set<string>(exerciseCategories);
        allCatalog.forEach((item) => {
            if (item.category.trim()) set.add(item.category.trim());
        });
        if (catalogDraft.category.trim()) set.add(catalogDraft.category.trim());
        return Array.from(set);
    }, [allCatalog, catalogDraft.category]);

    const categoryCounts = useMemo(() => {
        const counts = new Map<string, number>();
        allCatalog.forEach((item) => {
            const cat = item.category.trim();
            counts.set(cat, (counts.get(cat) ?? 0) + 1);
        });
        return counts;
    }, [allCatalog]);

    const filteredCatalog = useMemo(() => {
        const normalizedQuery = catalogSearch.trim().toLocaleLowerCase();
        return allCatalog.filter((item) => {
            const matchesCategory = catalogCategoryFilter === 'Todas' || item.category === catalogCategoryFilter;
            const matchesSearch = !normalizedQuery
                || item.name.toLocaleLowerCase().includes(normalizedQuery)
                || item.description.toLocaleLowerCase().includes(normalizedQuery)
                || item.alerts.some((alert) => alert.toLocaleLowerCase().includes(normalizedQuery));
            return matchesCategory && matchesSearch;
        });
    }, [allCatalog, catalogCategoryFilter, catalogSearch]);

    const filteredPlanCatalog = useMemo(() => (
        catalog.filter((item) => planCategoryFilter === 'Todas' || item.category === planCategoryFilter)
    ), [catalog, planCategoryFilter]);

    const selectedExercise = catalog.find((item) => item.id === exerciseId);
    const blockedExercises = catalog.filter((item) => item.blocked);

    const routinePatientOptions = useMemo(() => {
        const map = new Map<string, string>();
        patients.forEach((p) => map.set(p.id, p.fullName));
        plans.forEach((p) => {
            if (!map.has(p.patientId)) map.set(p.patientId, p.patientName);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [patients, plans]);

    const activePlanCount = useMemo(() => plans.filter((p) => p.active).length, [plans]);
    const historicalPlanCount = useMemo(() => plans.filter((p) => !p.active).length, [plans]);

    const groupedRoutines = useMemo(() => {
        const filtered = plans.filter((plan) => {
            const matchesPatient = routinePatientFilter === 'ALL' || plan.patientId === routinePatientFilter;
            const matchesStatus = routineStatusFilter === 'all'
                || (routineStatusFilter === 'active' && plan.active)
                || (routineStatusFilter === 'historical' && !plan.active);
            return matchesPatient && matchesStatus;
        });
        const groups = new Map<string, { patientId: string; patientName: string; items: ExercisePlan[] }>();
        filtered.forEach((plan) => {
            const existing = groups.get(plan.patientId);
            if (existing) {
                existing.items.push(plan);
            } else {
                groups.set(plan.patientId, { patientId: plan.patientId, patientName: plan.patientName, items: [plan] });
            }
        });
        return Array.from(groups.values());
    }, [plans, routinePatientFilter, routineStatusFilter]);

    const submitCatalogExercise = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingCatalog(true);
        setError('');
        setNotice('');
        try {
            const payload = {
                name: catalogDraft.name.trim(),
                category: catalogDraft.category,
                description: catalogDraft.description.trim(),
                restrictions: catalogDraft.restrictions.trim(),
            };
            const result = editingCatalogId
                ? await updateExerciseCatalogItem(editingCatalogId, payload)
                : await createExerciseCatalogItem(payload);
            const wasEditing = Boolean(editingCatalogId);
            setCatalogDraft(emptyCatalogDraft);
            setEditingCatalogId(null);
            await reload();
            if (patientId) {
                setCatalog(await listExerciseCatalog(patientId));
            }
            setNotice(result.message || (wasEditing ? 'Ejercicio del catálogo actualizado.' : 'Ejercicio creado en el catálogo.'));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar el ejercicio en el catálogo.');
        } finally {
            setSavingCatalog(false);
        }
    };

    const beginEditCatalog = (item: ExerciseCatalogItem) => {
        setEditingCatalogId(item.id);
        setCatalogDraft({
            name: item.name,
            category: item.category,
            description: item.description,
            restrictions: item.alerts.join(', '),
        });
        setError('');
        setNotice('');
        catalogFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEditCatalog = () => {
        setEditingCatalogId(null);
        setCatalogDraft(emptyCatalogDraft);
    };

    const submitPlan = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingPlanId && (!selectedExercise || selectedExercise.blocked)) return;
        if (editingPlanId && selectedExercise?.blocked) return;
        setSavingPlan(true);
        setError('');
        setNotice('');
        try {
            if (editingPlanId) {
                await updateExercisePlan(editingPlanId, {
                    frequency: planDraft.frequency.trim(),
                    sets: planDraft.sets.trim(),
                    repetitions: planDraft.repetitions.trim(),
                    durationMinutes: planDraft.durationMinutes.trim(),
                    notes: planDraft.notes.trim(),
                });
                setNotice('Parámetros de la rutina actualizados.');
                setEditingPlanId(null);
            } else if (selectedExercise) {
                await assignExercisePlan({
                    patientId,
                    exerciseId: selectedExercise.id,
                    frequency: planDraft.frequency.trim(),
                    sets: planDraft.sets.trim(),
                    repetitions: planDraft.repetitions.trim(),
                    durationMinutes: planDraft.durationMinutes.trim(),
                    notes: planDraft.notes.trim(),
                });
                setNotice('Ejercicio agregado a la rutina del paciente.');
            }
            setExerciseId('');
            setPlanDraft(emptyPlanDraft);
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar la rutina del paciente.');
        } finally {
            setSavingPlan(false);
        }
    };

    const beginEditPlan = (plan: ExercisePlan) => {
        setEditingPlanId(plan.id);
        setPlanCategoryFilter('Todas');
        setPlanDraft({
            frequency: plan.frequency,
            sets: plan.sets !== null ? String(plan.sets) : '',
            repetitions: plan.repetitions !== null ? String(plan.repetitions) : '',
            durationMinutes: plan.durationMinutes !== null ? String(plan.durationMinutes) : '',
            notes: plan.notes ?? '',
        });
        setError('');
        setNotice('');
        if (patientId === plan.patientId) {
            setExerciseId(plan.exerciseId);
        } else {
            pendingExerciseIdRef.current = plan.exerciseId;
            setPatientId(plan.patientId);
        }
        planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEditPlan = () => {
        setEditingPlanId(null);
        setExerciseId('');
        setPlanDraft(emptyPlanDraft);
    };

    const togglePlanActive = async (plan: ExercisePlan, nextActive: boolean) => {
        setUpdatingPlanId(plan.id);
        setError('');
        setNotice('');
        try {
            await updateExercisePlan(plan.id, { active: nextActive });
            await reload();
            setNotice(nextActive
                ? `"${plan.exerciseName}" reactivado en la rutina de ${plan.patientName}.`
                : `"${plan.exerciseName}" pasó al historial de rutinas de ${plan.patientName}.`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado de la rutina.');
        } finally {
            setUpdatingPlanId(null);
        }
    };

    const addExerciseForPatient = (targetPatientId: string) => {
        setEditingPlanId(null);
        setPlanDraft(emptyPlanDraft);
        setPlanCategoryFilter('Todas');
        setExerciseId('');
        setPatientId(targetPatientId);
        planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <header className="rounded-3xl bg-gradient-to-r from-[#083447] via-[#0b6670] to-[#087f79] p-6 text-white shadow-lg shadow-teal-950/10 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Actividad física segura</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ejercicios y rutinas</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                    Administra el banco de ejercicios por categorías, consulta los antecedentes clínicos de cada adulto mayor, recibe alertas de contraindicación y construye o ajusta sus rutinas.
                </p>
            </header>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

            {!readOnly && (
                <form ref={catalogFormRef} onSubmit={(event) => void submitCatalogExercise(event)} className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingCatalogId ? 'Modificar ejercicio del catálogo' : 'Registrar nuevo ejercicio en el catálogo'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {editingCatalogId
                                    ? 'Actualiza el nombre, categoría, guía técnica o alertas clínicas de este ejercicio.'
                                    : 'Registra nuevos ejercicios reutilizables con su guía técnica y alertas clínicas opcionales.'}
                            </p>
                        </div>
                        {editingCatalogId && (
                            <button type="button" onClick={cancelEditCatalog} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                                Cancelar edición
                            </button>
                        )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-slate-700">Nombre del ejercicio
                            <input
                                required
                                maxLength={120}
                                value={catalogDraft.name}
                                onChange={(event) => setCatalogDraft((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Ej.: Elevación de talones con apoyo"
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Categoría
                            <select
                                required
                                value={catalogDraft.category}
                                onChange={(event) => setCatalogDraft((current) => ({ ...current, category: event.target.value }))}
                                className={inputClass}
                            >
                                {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                        </label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Descripción / guía técnica
                        <textarea
                            required
                            maxLength={500}
                            rows={3}
                            value={catalogDraft.description}
                            onChange={(event) => setCatalogDraft((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Describe postura inicial, ejecución segura y criterios de pausa"
                            className={inputClass}
                        />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Contraindicaciones / alertas clínicas opcionales (separadas por coma)
                        <input
                            maxLength={1000}
                            value={catalogDraft.restrictions}
                            onChange={(event) => setCatalogDraft((current) => ({ ...current, restrictions: event.target.value }))}
                            placeholder="Ej.: fractura, vertigo, hipertension no controlada"
                            className={inputClass}
                        />
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={savingCatalog || !catalogDraft.name.trim() || !catalogDraft.description.trim()}
                            className="rounded-xl bg-[#0d7377] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingCatalog ? 'Guardando…' : editingCatalogId ? 'Guardar cambios del ejercicio' : 'Crear ejercicio en el catálogo'}
                        </button>
                        {editingCatalogId && (
                            <button type="button" onClick={cancelEditCatalog} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            )}

            {!readOnly && (
                <form ref={planFormRef} onSubmit={(event) => void submitPlan(event)} className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingPlanId ? 'Modificar ejercicio en la rutina' : 'Crear rutina y agregar ejercicios al paciente'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {editingPlanId
                                    ? 'Ajusta la frecuencia, carga, duración o indicaciones según la evolución del paciente.'
                                    : 'Selecciona un adulto mayor para revisar sus antecedentes, filtrar por categoría y configurar cada ejercicio de su rutina.'}
                            </p>
                        </div>
                        {editingPlanId && (
                            <button type="button" onClick={cancelEditPlan} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                                Cancelar modificación
                            </button>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-semibold text-slate-700">Paciente
                            <select
                                required
                                value={patientId}
                                disabled={Boolean(editingPlanId)}
                                onChange={(event) => {
                                    setPatientId(event.target.value);
                                    setExerciseId('');
                                }}
                                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                                <option value="">Selecciona un paciente</option>
                                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}
                            </select>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Filtrar por categoría
                            <select
                                value={planCategoryFilter}
                                disabled={!patientId || Boolean(editingPlanId)}
                                onChange={(event) => {
                                    setPlanCategoryFilter(event.target.value);
                                    setExerciseId('');
                                }}
                                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                                <option value="Todas">Todas las categorías</option>
                                {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Ejercicio del catálogo
                            <select
                                required
                                value={exerciseId}
                                onChange={(event) => setExerciseId(event.target.value)}
                                disabled={!patientId || catalogLoading || Boolean(editingPlanId)}
                                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                                <option value="">{catalogLoading ? 'Revisando antecedentes…' : 'Selecciona un ejercicio'}</option>
                                {filteredPlanCatalog.map((exercise) => (
                                    <option key={exercise.id} value={exercise.id} disabled={exercise.blocked}>
                                        {exercise.blocked ? '⚠ ' : ''}{exercise.name} · {exercise.category}{exercise.blocked ? ' · contraindicado' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {patientId && (
                        <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-bold text-slate-900">Antecedentes clínicos del paciente</h3>
                                {!patientHistoryLoading && !patientHistoryError && (
                                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
                                        {patientHistory.length} {patientHistory.length === 1 ? 'registro' : 'registros'}
                                    </span>
                                )}
                            </div>
                            {patientHistoryLoading ? (
                                <p className="mt-2 text-xs text-slate-500">Consultando antecedentes clínicos…</p>
                            ) : patientHistoryError ? (
                                <p className="mt-2 text-xs text-amber-800">{patientHistoryError}</p>
                            ) : patientHistory.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500">El paciente no registra antecedentes clínicos previos en su ficha.</p>
                            ) : (
                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {patientHistory.map((item) => (
                                        <li key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                                            <p className="font-semibold text-slate-900">{item.type} · {item.date}</p>
                                            <p className="mt-0.5 text-slate-600">{item.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {selectedExercise && (
                        <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
                            <strong>{selectedExercise.category} — {selectedExercise.name}:</strong> {selectedExercise.description}
                        </p>
                    )}

                    {patientId && blockedExercises.length > 0 && (
                        <aside role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                            <h3 className="font-bold">Alertas de contraindicación clínica</h3>
                            <p className="mt-1 text-sm leading-6">Algunos antecedentes coinciden con restricciones del catálogo. Estos ejercicios quedan bloqueados en esta prescripción.</p>
                            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                {blockedExercises.map((exercise) => (
                                    <li key={exercise.id} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-sm">
                                        <strong>{exercise.name}</strong>
                                        <span className="block text-xs text-amber-800">Coincidencia: {exercise.alerts.join(', ')}</span>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-sm font-semibold text-slate-700">Frecuencia
                            <input
                                required
                                name="frequency"
                                maxLength={120}
                                value={planDraft.frequency}
                                onChange={(event) => setPlanDraft((current) => ({ ...current, frequency: event.target.value }))}
                                placeholder="Ej.: 3 veces por semana"
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Series (opcional)
                            <input
                                name="sets"
                                type="number"
                                min="1"
                                max="20"
                                value={planDraft.sets}
                                onChange={(event) => setPlanDraft((current) => ({ ...current, sets: event.target.value }))}
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Repeticiones (opcional)
                            <input
                                name="repetitions"
                                type="number"
                                min="1"
                                max="200"
                                value={planDraft.repetitions}
                                onChange={(event) => setPlanDraft((current) => ({ ...current, repetitions: event.target.value }))}
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Duración en minutos (opcional)
                            <input
                                name="durationMinutes"
                                type="number"
                                min="1"
                                max="240"
                                value={planDraft.durationMinutes}
                                onChange={(event) => setPlanDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                                className={inputClass}
                            />
                        </label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Indicaciones del profesional (opcional)
                        <textarea
                            name="notes"
                            maxLength={2000}
                            rows={3}
                            value={planDraft.notes}
                            onChange={(event) => setPlanDraft((current) => ({ ...current, notes: event.target.value }))}
                            className={inputClass}
                            placeholder="Apoyos, supervisión u observaciones acordadas con el paciente"
                        />
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={
                                savingPlan
                                || !patientId
                                || !planDraft.frequency.trim()
                                || catalogLoading
                                || (!editingPlanId && (!selectedExercise || selectedExercise.blocked))
                                || (Boolean(editingPlanId) && Boolean(selectedExercise?.blocked))
                            }
                            className="rounded-xl bg-[#0d7377] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingPlan ? 'Guardando…' : editingPlanId ? 'Guardar cambios en rutina' : 'Agregar ejercicio a la rutina'}
                        </button>
                        {editingPlanId && (
                            <button type="button" onClick={cancelEditPlan} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="space-y-4 border-b border-slate-100 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Catálogo de ejercicios disponibles ({filteredCatalog.length} de {allCatalog.length})</h2>
                            <p className="mt-1 text-sm text-slate-500">Filtra por categoría o busca por nombre para encontrar y actualizar ejercicios rápidamente.</p>
                        </div>
                        <label className="w-full sm:w-72">
                            <span className="sr-only">Buscar ejercicio en el catálogo</span>
                            <input
                                value={catalogSearch}
                                onChange={(event) => setCatalogSearch(event.target.value)}
                                placeholder="Buscar por nombre, descripción o alerta…"
                                className={inputClass}
                            />
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar catálogo por categoría">
                        <button
                            type="button"
                            onClick={() => setCatalogCategoryFilter('Todas')}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                catalogCategoryFilter === 'Todas'
                                    ? 'bg-[#0d7377] text-white shadow-sm'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-[#0d7377]'
                            }`}
                        >
                            Todas ({allCatalog.length})
                        </button>
                        {availableCategories.map((category) => {
                            const count = categoryCounts.get(category) ?? 0;
                            if (count === 0 && catalogCategoryFilter !== category) return null;
                            const isSelected = catalogCategoryFilter === category;
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setCatalogCategoryFilter(category)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                        isSelected
                                            ? 'bg-[#0d7377] text-white shadow-sm'
                                            : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-[#0d7377]'
                                    }`}
                                >
                                    {category} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
                {loading && allCatalog.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">Cargando catálogo…</p>
                ) : filteredCatalog.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                        {allCatalog.length === 0 ? 'Aún no hay ejercicios registrados en el catálogo.' : 'No se encontraron ejercicios con los filtros aplicados.'}
                    </p>
                ) : (
                    <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCatalog.map((item) => (
                            <article key={item.id} className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">{item.category}</span>
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => beginEditCatalog(item)}
                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#0d7377] transition hover:border-teal-300 hover:bg-teal-50"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="mt-2 font-bold text-slate-900">{item.name}</h3>
                                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
                                </div>
                                {item.alerts.length > 0 && (
                                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                                        <strong>Alertas clínicas:</strong> {item.alerts.join(', ')}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="space-y-4 border-b border-slate-100 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Rutinas de ejercicio por paciente</h2>
                            <p className="mt-1 text-sm text-slate-500">Consulta las rutinas vigentes o el historial de prescripciones anteriores por cada adulto mayor.</p>
                        </div>
                        <label className="w-full sm:w-64">
                            <span className="sr-only">Filtrar rutinas por paciente</span>
                            <select
                                value={routinePatientFilter}
                                onChange={(event) => setRoutinePatientFilter(event.target.value)}
                                className={inputClass}
                            >
                                <option value="ALL">Todos los pacientes</option>
                                {routinePatientOptions.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado de rutina">
                        <button
                            type="button"
                            onClick={() => setRoutineStatusFilter('active')}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                routineStatusFilter === 'active'
                                    ? 'bg-[#0d7377] text-white shadow-sm'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-[#0d7377]'
                            }`}
                        >
                            Rutinas activas ({activePlanCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setRoutineStatusFilter('historical')}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                routineStatusFilter === 'historical'
                                    ? 'bg-[#0d7377] text-white shadow-sm'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-[#0d7377]'
                            }`}
                        >
                            Historial ({historicalPlanCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setRoutineStatusFilter('all')}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                routineStatusFilter === 'all'
                                    ? 'bg-[#0d7377] text-white shadow-sm'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-[#0d7377]'
                            }`}
                        >
                            Todas ({plans.length})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="p-6 text-center text-sm text-slate-500">Cargando rutinas…</p>
                ) : groupedRoutines.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                        {plans.length === 0
                            ? 'Aún no hay rutinas registradas.'
                            : 'No hay ejercicios en rutinas con el filtro actual.'}
                    </p>
                ) : (
                    <div className="space-y-4 p-5">
                        {groupedRoutines.map((group) => (
                            <article key={group.patientId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{group.patientName}</h3>
                                        <p className="text-xs text-slate-500">{group.items.length} {group.items.length === 1 ? 'ejercicio en esta vista' : 'ejercicios en esta vista'}</p>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => addExerciseForPatient(group.patientId)}
                                            className="rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0d7377] transition hover:bg-teal-50"
                                        >
                                            + Agregar ejercicio a su rutina
                                        </button>
                                    )}
                                </header>
                                <div className="divide-y divide-slate-100">
                                    {group.items.map((plan) => (
                                        <div key={plan.id} className="p-5 transition hover:bg-teal-50/30">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-bold text-slate-900">{plan.exerciseName}</p>
                                                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">{plan.category}</span>
                                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {plan.active ? 'Activa' : 'Histórica'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm text-slate-700">
                                                        Frecuencia: <strong>{plan.frequency}</strong>
                                                        {plan.sets !== null && ` · ${plan.sets} series`}
                                                        {plan.repetitions !== null && ` · ${plan.repetitions} repeticiones`}
                                                        {plan.durationMinutes !== null && ` · ${plan.durationMinutes} min`}
                                                    </p>
                                                    {plan.notes && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{plan.notes}</p>}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <time className="text-xs text-slate-500">{new Date(plan.date).toLocaleString()}</time>
                                                    {!readOnly && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => beginEditPlan(plan)}
                                                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#0d7377] transition hover:bg-teal-50"
                                                            >
                                                                Modificar parámetros
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={updatingPlanId === plan.id}
                                                                onClick={() => void togglePlanActive(plan, !plan.active)}
                                                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                                                    plan.active
                                                                        ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                                                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                                                }`}
                                                            >
                                                                {updatingPlanId === plan.id
                                                                    ? 'Actualizando…'
                                                                    : plan.active
                                                                        ? 'Finalizar en rutina'
                                                                        : 'Reactivar en rutina'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {history.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <h2 className="border-b border-slate-100 p-5 font-bold text-slate-900">Seguimiento de actividades realizadas</h2>
                    <div className="divide-y divide-slate-100">
                        {history.map((item) => (
                            <article key={item.id} className="p-5">
                                <p className="font-semibold text-slate-800">{item.patientName} · {item.item}</p>
                                <time className="mt-1 block text-xs text-slate-500">{new Date(item.date).toLocaleString()}</time>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.notes}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                El catálogo ofrece movimientos generales. Las alertas se basan en texto de antecedentes y no reemplazan la valoración clínica. Revisa siempre las restricciones y adapta el plan al paciente.
            </p>
        </section>
    );
};

export default ExercisesPage;
