import { useMemo, useState, type FC } from 'react';

type DoseStatus = 'Pendiente' | 'Administrado';

type MedicationDose = {
    id: number;
    resident: string;
    medicine: string;
    dosage: string;
    time: string;
    status: DoseStatus;
};

const initialDoses: MedicationDose[] = [
    { id: 1, resident: 'Elena Rodríguez', medicine: 'Losartán', dosage: '50 mg · 1 tableta', time: '08:00', status: 'Pendiente' },
    { id: 2, resident: 'Jorge Castillo', medicine: 'Metformina', dosage: '850 mg · 1 tableta', time: '08:30', status: 'Administrado' },
    { id: 3, resident: 'Marta Salazar', medicine: 'Vitamina D', dosage: '1000 UI · 1 cápsula', time: '12:00', status: 'Pendiente' },
    { id: 4, resident: 'Roberto Díaz', medicine: 'Acetaminofén', dosage: '500 mg · según indicación', time: '14:00', status: 'Pendiente' },
];

export const MedicationsPage: FC = () => {
    const [doses, setDoses] = useState(initialDoses);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DoseStatus>('all');
    const [notice, setNotice] = useState('');

    const filteredDoses = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return doses.filter((dose) => {
            const matchesSearch = [dose.resident, dose.medicine, dose.dosage]
                .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
            return matchesSearch && (statusFilter === 'all' || dose.status === statusFilter);
        });
    }, [doses, search, statusFilter]);

    const toggleDoseStatus = (dose: MedicationDose) => {
        const nextStatus: DoseStatus = dose.status === 'Pendiente' ? 'Administrado' : 'Pendiente';
        setDoses((current) => current.map((item) =>
            item.id === dose.id ? { ...item, status: nextStatus } : item,
        ));
        setNotice(`${dose.medicine} para ${dose.resident}: ${nextStatus.toLocaleLowerCase()}.`);
    };

    const pendingCount = doses.filter((dose) => dose.status === 'Pendiente').length;

    return (
        <section className="space-y-6 p-5 sm:p-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0d7377]">Atención profesional</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Control de medicamentos</h1>
                <p className="mt-1 text-sm text-gray-500">Consulta las dosis programadas y registra su administración.</p>
            </div>

            {notice && <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Dosis programadas</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{doses.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Pendientes</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Administradas</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">{doses.length - pendingCount}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
                <label className="flex-1">
                    <span className="sr-only">Buscar medicamentos</span>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-teal-100" placeholder="Buscar por residente o medicamento" value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
                <label>
                    <span className="sr-only">Filtrar dosis por estado</span>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0d7377] sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                        <option value="all">Todos los estados</option>
                        <option value="Pendiente">Pendientes</option>
                        <option value="Administrado">Administradas</option>
                    </select>
                </label>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Adulto mayor</th>
                                <th className="px-5 py-3 font-semibold">Medicamento y dosis</th>
                                <th className="px-5 py-3 font-semibold">Hora</th>
                                <th className="px-5 py-3 font-semibold">Estado</th>
                                <th className="px-5 py-3 font-semibold">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredDoses.map((dose) => (
                                <tr key={dose.id}>
                                    <td className="px-5 py-4 font-medium text-gray-900">{dose.resident}</td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-gray-800">{dose.medicine}</p>
                                        <p className="text-xs text-gray-500">{dose.dosage}</p>
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">{dose.time}</td>
                                    <td className="px-5 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dose.status === 'Administrado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {dose.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button type="button" onClick={() => toggleDoseStatus(dose)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dose.status === 'Pendiente' ? 'bg-[#0d7377] text-white hover:bg-teal-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                            {dose.status === 'Pendiente' ? 'Marcar administrado' : 'Deshacer registro'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredDoses.length === 0 && (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">No hay dosis que coincidan con esos filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">Datos y registros de demostración; verifica siempre la indicación clínica antes de administrar una dosis. Los cambios no se guardan en el backend.</p>
            </div>
        </section>
    );
};

export default MedicationsPage;
