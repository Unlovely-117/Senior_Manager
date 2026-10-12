import React, { useState } from 'react';
import { AdminMenu } from '../pages/AdminMenu';
import { ProfessionalMenu } from '../pages/ProfessionalMenu';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ProfessionalDashboardPage } from '../pages/ProfessionalDashboardPage';
import { ProfessionalsPage } from '../pages/ProfessionalsPage';
import { UsersPage } from '../pages/UsersPage';
import { ElderlyPage } from '../pages/ElderlyPage';
import { MedicationsPage } from '../pages/MedicationsPage';

export const AppRouter: React.FC = () => {
    const [role, setRole] = useState<'admin' | 'professional' | null>(null);
    const [currentView, setCurrentView] = useState('panel');

    const renderCurrentView = () => {
        if (role === 'admin') {
            switch (currentView) {
                case 'panel':
                    return <AdminDashboardPage />;
                case 'profesionales':
                    return <ProfessionalsPage />;
                case 'adultos':
                    return <ElderlyPage isAdmin />;
                case 'usuarios':
                    return <UsersPage />;
                default:
                    return (
                        <div className="p-8">
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900">Citas médicas</h3>
                                <p className="mt-2 text-sm text-gray-500">Esta vista estará disponible cuando se integre el módulo de citas.</p>
                            </div>
                        </div>
                    );
            }
        }

        if (role === 'professional') {
            switch (currentView) {
                case 'mi-panel':
                    return <ProfessionalDashboardPage />;
                case 'mis-pacientes':
                    return <ElderlyPage />;
                case 'medicamentos':
                    return <MedicationsPage />;
                default:
                    return (
                        <div className="p-8">
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900">Agenda y citas</h3>
                                <p className="mt-2 text-sm text-gray-500">Esta vista estará disponible cuando se integre el módulo de citas.</p>
                            </div>
                        </div>
                    );
            }
        }

        return null;
    };

    if (!role) {
        return (
            <main className="relative isolate min-h-screen overflow-x-hidden bg-[#f4f8f8] text-gray-900 md:h-screen md:min-h-0 md:overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377]" />
                <div className="absolute -right-28 top-24 -z-10 h-96 w-96 rounded-full border border-white/10" />
                <div className="absolute -right-8 top-44 -z-10 h-56 w-56 rounded-full border border-white/10" />

                <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 md:h-full md:min-h-0">
                    <header className="flex shrink-0 items-center justify-between py-4">
                        <div className="flex items-center gap-3 text-white">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                                    <path d="M12 20.25s-7.5-4.35-7.5-10.1a4.15 4.15 0 0 1 7.5-2.43 4.15 4.15 0 0 1 7.5 2.43c0 5.75-7.5 10.1-7.5 10.1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                    <path d="M8.5 12h2l1.1-2.2 1.5 4.4 1.1-2.2h1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-bold tracking-tight">Senior-Manage</p>
                                <p className="text-xs text-white/65">Cuidado que conecta</p>
                            </div>
                        </div>
                        <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 sm:inline-flex">
                            <span className="h-2 w-2 rounded-full bg-emerald-300" />
                            Plataforma de gestión geriátrica
                        </span>
                    </header>

                    <div className="grid min-h-0 flex-1 items-center gap-6 py-4 md:grid-cols-2 md:gap-6 xl:gap-12">
                        <section className="max-w-2xl text-white">
                            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-100/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-100">
                                <span aria-hidden="true">✦</span>
                                Atención y bienestar
                            </span>
                            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
                                Un mejor cuidado
                                <span className="block text-teal-200">empieza aquí.</span>
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                                Organiza la atención, acompaña a cada adulto mayor y mantén a tu equipo conectado desde un solo lugar.
                            </p>

                            <div className="mt-6 hidden max-w-xl gap-3 sm:grid sm:grid-cols-2">
                                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-300/15 text-lg text-teal-100" aria-hidden="true">♡</span>
                                    <div>
                                        <p className="text-xs font-semibold">Cuidado centrado</p>
                                        <p className="mt-1 text-[11px] leading-4 text-slate-300">Seguimiento organizado para cada residente.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-lg text-cyan-100" aria-hidden="true">⌘</span>
                                    <div>
                                        <p className="text-xs font-semibold">Equipo conectado</p>
                                        <p className="mt-1 text-[11px] leading-4 text-slate-300">Herramientas para una gestión coordinada.</p>
                                    </div>
                                </div>
                            </div>

                        </section>

                        <section className="mx-auto w-full max-w-md md:ml-auto" aria-labelledby="welcome-heading">
                            <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_-24px_rgba(4,30,42,0.35)] sm:p-6">
                                <div className="mb-5">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-xl text-[#0d7377]" aria-hidden="true">✦</div>
                                    <p className="text-sm font-semibold text-[#0d7377]">Bienvenido</p>
                                    <h2 id="welcome-heading" className="mt-1 text-xl font-bold tracking-tight text-gray-900">¿Cómo deseas ingresar?</h2>
                                    <p className="mt-1 text-xs leading-5 text-gray-500">Selecciona tu perfil para acceder a tus herramientas.</p>
                                </div>

                                <div className="space-y-2.5">
                                    <button
                                        onClick={() => { setRole('admin'); setCurrentView('panel'); }}
                                        className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/60 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d7377] text-white shadow-md shadow-teal-900/15" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                                <path d="M4 19.5h16M6.5 16V9.5h11V16M9 9.5V6h6v3.5M9 12.5h2M13 12.5h2M9 15h2M13 15h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold text-gray-900">Administrador</span>
                                            <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">Gestiona usuarios, profesionales y atención.</span>
                                        </span>
                                        <span className="text-xl text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#0d7377]" aria-hidden="true">→</span>
                                    </button>

                                    <button
                                        onClick={() => { setRole('professional'); setCurrentView('mi-panel'); }}
                                        className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50/60 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#079bb5] text-white shadow-md shadow-cyan-900/15" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                                <path d="M12 20s-7-4.1-7-9.4A3.8 3.8 0 0 1 12 8.4a3.8 3.8 0 0 1 7 2.2C19 15.9 12 20 12 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                                <path d="M8 12h2l1-2 1.5 4 1-2H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold text-gray-900">Profesional</span>
                                            <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">Consulta residentes y seguimiento de cuidados.</span>
                                        </span>
                                        <span className="text-xl text-gray-300 transition group-hover:translate-x-1 group-hover:text-cyan-700" aria-hidden="true">→</span>
                                    </button>
                                </div>

                            </div>
                        </section>
                    </div>

                    <footer className="flex shrink-0 items-center justify-between border-t border-white/10 py-3 text-[10px] text-white/60">
                        <span>© 2026 Senior-Manage · Gestión geriátrica</span>
                        <span className="hidden sm:inline">Más organización para un cuidado más humano.</span>
                    </footer>
                </div>
            </main>
        );
    }

    return (
        <div className="bg-gray-100 font-sans h-screen flex overflow-hidden">
            <aside className="w-64 bg-[#0b132b] text-white flex flex-col justify-between">
                <div>
                    <div className="flex items-center space-x-3 p-6 border-b border-gray-800">
                        <div className="bg-[#00b4d8] text-white p-2 rounded-lg font-bold">+</div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Senior-Manage</h1>
                            <span className="text-xs text-gray-400">Gestión geriátrica</span>
                        </div>
                    </div>
                    {role === 'admin' ? (
                        <AdminMenu currentView={currentView} onSelectView={setCurrentView} />
                    ) : (
                        <ProfessionalMenu currentView={currentView} onSelectView={setCurrentView} />
                    )}
                </div>
                <div className="p-4 border-t border-gray-800 flex justify-between items-center text-xs">
                    <span className="text-gray-400 uppercase">Rol: {role}</span>
                    <button onClick={() => setRole(null)} className="text-red-400 hover:underline">Salir</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">
                        {currentView.replace('-', ' ')}
                    </h2>
                </header>

                {renderCurrentView()}
            </main>
        </div>
    );
};

export default AppRouter;