import { useEffect, useState } from 'react';
import { listPatients } from '../../application/managementService';
import type { Patient } from '../../domain/models/management';

export const ProfessionalDashboardPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let current = true;
        listPatients()
            .then((items) => { if (current) setPatients(items); })
            .catch((cause: unknown) => {
                if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus pacientes.');
            })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, []);

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="rounded-[28px] bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] p-6 text-white shadow-xl sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Atención profesional</p>
                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Mi panel</h1>
                <p className="mt-2 text-sm text-white/75">Consulta los pacientes que tienes asignados actualmente.</p>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">No se pudieron cargar los datos: {error}</p>}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div><h2 className="font-bold text-[#102a36]">Mis pacientes</h2><p className="mt-1 text-xs text-slate-500">Asignaciones activas registradas en el sistema</p></div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-[#0d7377]">{loading ? '…' : patients.length}</span>
                </div>
                {loading ? <p role="status" className="p-8 text-center text-sm text-slate-500">Cargando pacientes…</p>
                    : error ? null
                    : patients.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No tienes pacientes con asignación activa.</p>
                    : <div className="divide-y divide-slate-100">{patients.map((patient) => <article key={patient.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{patient.fullName}</p><p className="mt-1 text-xs text-slate-500">Documento: {patient.document}</p></div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Asignado</span>
                    </article>)}</div>}
            </section>
        </section>
    );
};

export default ProfessionalDashboardPage;
