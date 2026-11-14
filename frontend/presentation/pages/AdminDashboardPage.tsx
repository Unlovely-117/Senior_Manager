import { useEffect, useState, type FC } from 'react';
import { listPatients, listProfessionals, listUsers } from '../../application/managementService';
import type { Patient, Professional, UserAccount } from '../../domain/models/management';

type AdminDashboardPageProps = {
    onNavigate: (view: string) => void;
};

export const AdminDashboardPage: FC<AdminDashboardPageProps> = ({ onNavigate }) => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        setIsLoading(true);
        Promise.all([listProfessionals(), listUsers(), listPatients()])
            .then(([professionalList, userList, patientList]) => {
                if (isCurrent) {
                    setProfessionals(professionalList);
                    setUsers(userList);
                    setPatients(patientList);
                    setLoadError('');
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los datos del panel.');
            })
            .finally(() => { if (isCurrent) setIsLoading(false); });
        return () => { isCurrent = false; };
    }, [reloadKey]);

    const professionalAccounts = professionals.filter((professional) => professional.accountLinked);
    const activeProfessionals = professionalAccounts.filter((professional) => professional.active).length;
    const activeUsers = users.filter((user) => user.active).length;
    const activeAdminUsers = users.filter((user) => user.role === 'admin' && user.active).length;
    const stats = [
        { label: 'Profesionales', value: professionalAccounts.length, detail: `${activeProfessionals} activos`, icon: '✚', tint: 'bg-teal-50 text-[#0d7377]', view: 'profesionales' },
        { label: 'Usuarios activos', value: activeUsers, detail: `${users.length - activeUsers} inactivos`, icon: '◉', tint: 'bg-cyan-50 text-cyan-700', view: 'usuarios' },
        { label: 'Administradores activos', value: activeAdminUsers, detail: 'Cuentas activas con rol administrador', icon: '♙', tint: 'bg-indigo-50 text-indigo-700', view: 'usuarios' },
        { label: 'Adultos mayores', value: patients.length, detail: 'Registros activos en la base de datos', icon: '♡', tint: 'bg-amber-50 text-amber-700', view: 'adultos' },
    ];
    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] p-6 text-white shadow-xl shadow-teal-950/10 sm:p-8">
                <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
                <div className="absolute -right-2 -top-8 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
                <div className="relative max-w-2xl">
                    <span className="inline-flex rounded-full border border-teal-100/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-100">Centro de gestión</span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Todo el cuidado, en buenas manos.</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Administra el equipo, revisa las cuentas y mantén organizada la operación de Senior-Manage.</p>
                    <button type="button" onClick={() => onNavigate('profesionales')} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b3545] shadow-md transition hover:-translate-y-0.5 hover:bg-teal-50">
                        Gestionar profesionales <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>

            {loadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>No se pudieron cargar las estadisticas desde la API: {loadError}</span>
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading} className="font-semibold underline disabled:opacity-50">Reintentar</button>
                </div>
            )}
            {!loadError && (
                <div className="flex justify-end">
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:text-[#0d7377] disabled:cursor-wait disabled:opacity-50">
                        {isLoading ? 'Actualizando...' : 'Actualizar estadisticas'}
                    </button>
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <button
                        key={stat.label}
                        type="button"
                        onClick={() => onNavigate(stat.view)}
                        className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-950/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                    >
                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${stat.tint}`} aria-hidden="true">{stat.icon}</span>
                        <span className="mt-4 block text-sm font-medium text-slate-500">{stat.label}</span>
                        <span className={`mt-1 block font-bold tracking-tight text-[#102a36] ${typeof stat.value === 'number' ? 'text-3xl' : 'text-base'}`}>{(isLoading || loadError) && typeof stat.value === 'number' ? '—' : stat.value}</span>
                        <span className="mt-1 block text-xs text-slate-400">{isLoading && typeof stat.value === 'number' ? 'Cargando datos…' : loadError && typeof stat.value === 'number' ? 'No disponible' : stat.detail}</span>
                    </button>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-[#102a36]">Equipo profesional</h2>
                            <p className="mt-1 text-xs text-slate-500">Información actual del directorio</p>
                        </div>
                        <button type="button" onClick={() => onNavigate('profesionales')} className="text-sm font-semibold text-[#0d7377] hover:underline">Ver directorio</button>
                    </div>
                    {isLoading ? (
                        <p className="p-8 text-center text-sm text-slate-500">Cargando directorio…</p>
                    ) : professionalAccounts.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm font-medium text-slate-700">Aún no hay profesionales registrados.</p>
                            <button type="button" onClick={() => onNavigate('profesionales')} className="mt-3 text-sm font-semibold text-[#0d7377] hover:underline">Agregar el primero</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {professionalAccounts.slice(0, 5).map((professional) => (
                                <div key={professional.email} className="flex items-center justify-between gap-4 px-5 py-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-[#0d7377]">
                                            {professional.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{professional.name}</p>
                                            <p className="truncate text-xs text-slate-500">{professional.email}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${professional.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {professional.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h2 className="font-bold text-[#102a36]">Accesos rápidos</h2>
                    <p className="mt-1 text-xs text-slate-500">Continúa con una tarea administrativa</p>
                    <div className="mt-5 space-y-3">
                        <button type="button" onClick={() => onNavigate('usuarios')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-lg text-[#0d7377]" aria-hidden="true">◎</span>
                            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Usuarios y roles</span><span className="mt-0.5 block text-xs text-slate-500">Crea cuentas y controla permisos</span></span>
                            <span className="text-slate-400" aria-hidden="true">→</span>
                        </button>
                        <button type="button" onClick={() => onNavigate('adultos')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-700" aria-hidden="true">♡</span>
                            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Adultos mayores</span><span className="mt-0.5 block text-xs text-slate-500">Consulta el módulo y sus permisos</span></span>
                            <span className="text-slate-400" aria-hidden="true">→</span>
                        </button>
                        <button type="button" onClick={() => onNavigate('citas')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-lg text-cyan-700" aria-hidden="true">◷</span>
                            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Citas médicas</span><span className="mt-0.5 block text-xs text-slate-500">Crear y organizar citas de pacientes</span></span>
                            <span className="text-slate-400" aria-hidden="true">→</span>
                        </button>
                    </div>
                    <p className="mt-5 rounded-xl bg-teal-50 px-3 py-2.5 text-xs leading-5 text-teal-800">Los datos se consultan y guardan en PostgreSQL; el acceso se controla desde la API.</p>
                </section>
            </div>
        </section>
    );
};

export default AdminDashboardPage;
