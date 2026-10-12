import { useMemo, useState, type FC } from 'react';

type Resident = {
    id: number;
    name: string;
    age: number;
    carePlan: string;
    professional: string;
    nextAppointment: string;
    status: 'Estable' | 'Seguimiento';
};

const residents: Resident[] = [
    { id: 1, name: 'Elena Rodríguez', age: 82, carePlan: 'Movilidad y equilibrio', professional: 'Laura Méndez', nextAppointment: '12 oct, 10:00', status: 'Seguimiento' },
    { id: 2, name: 'Jorge Castillo', age: 76, carePlan: 'Rehabilitación de marcha', professional: 'Carlos Pérez', nextAppointment: '13 oct, 11:30', status: 'Estable' },
    { id: 3, name: 'Marta Salazar', age: 89, carePlan: 'Movilidad y fortalecimiento', professional: 'Laura Méndez', nextAppointment: '14 oct, 09:00', status: 'Estable' },
    { id: 4, name: 'Roberto Díaz', age: 80, carePlan: 'Ejercicios terapéuticos', professional: 'Carlos Pérez', nextAppointment: '15 oct, 14:00', status: 'Seguimiento' },
];

type ElderlyPageProps = {
    isAdmin?: boolean;
};

export const ElderlyPage: FC<ElderlyPageProps> = ({ isAdmin = false }) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Resident['status']>('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const filteredResidents = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return residents.filter((resident) => {
            const matchesSearch = [resident.name, resident.carePlan, resident.professional]
                .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
            return matchesSearch && (statusFilter === 'all' || resident.status === statusFilter);
        });
    }, [search, statusFilter]);

    return (
        <section className="space-y-6 p-5 sm:p-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0d7377]">{isAdmin ? 'Administración' : 'Atención profesional'}</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">{isAdmin ? 'Adultos mayores' : 'Mis adultos mayores'}</h1>
                <p className="mt-1 text-sm text-gray-500">
                    {isAdmin ? 'Directorio de residentes y profesionales responsables.' : 'Residentes asignados a tu equipo de atención.'}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Residentes en la lista</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{residents.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">En seguimiento</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{residents.filter((resident) => resident.status === 'Seguimiento').length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Próximas atenciones</p>
                    <p className="mt-1 text-2xl font-bold text-[#0d7377]">{residents.length}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
                <label className="flex-1">
                    <span className="sr-only">Buscar adultos mayores</span>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-teal-100" placeholder="Buscar por nombre, plan de atención o profesional" value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
                <label>
                    <span className="sr-only">Filtrar por estado de atención</span>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0d7377] sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                        <option value="all">Todos los estados</option>
                        <option value="Estable">Estable</option>
                        <option value="Seguimiento">En seguimiento</option>
                    </select>
                </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {filteredResidents.map((resident) => {
                    const isExpanded = selectedId === resident.id;
                    return (
                        <article key={resident.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-gray-900">{resident.name}</h2>
                                    <p className="mt-1 text-sm text-gray-500">{resident.age} años · {resident.carePlan}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${resident.status === 'Estable' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {resident.status}
                                </span>
                            </div>
                            <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                                <p><span className="text-gray-500">Profesional:</span> <span className="font-medium text-gray-800">{resident.professional}</span></p>
                                <p><span className="text-gray-500">Próxima atención:</span> <span className="font-medium text-gray-800">{resident.nextAppointment}</span></p>
                            </div>
                            {isExpanded && (
                                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                                    Plan activo: {resident.carePlan}. La información clínica detallada se conectará al expediente cuando esté disponible el servicio de datos.
                                </div>
                            )}
                            <button type="button" aria-expanded={isExpanded} onClick={() => setSelectedId(isExpanded ? null : resident.id)} className="mt-4 text-sm font-semibold text-[#0d7377] hover:underline">
                                {isExpanded ? 'Ocultar resumen' : 'Ver resumen'}
                            </button>
                        </article>
                    );
                })}
                {filteredResidents.length === 0 && (
                    <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 lg:col-span-2">No se encontraron adultos mayores con esos filtros.</p>
                )}
            </div>
            <p className="text-xs text-gray-500">Datos de demostración. No representan un expediente clínico ni se guardan en el backend.</p>
        </section>
    );
};

export default ElderlyPage;
