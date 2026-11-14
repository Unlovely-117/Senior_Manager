import React, { useEffect, useState, type FormEvent } from 'react';
import { restoreSession, signIn, signOut } from '../../application/managementService';
import type { AccountRole, AuthenticatedUser } from '../../domain/models/management';
import { AdminMenu } from '../pages/AdminMenu';
import { AdminAppointmentsPage } from '../pages/AdminAppointmentsPage';
import { ProfessionalMenu } from '../pages/ProfessionalMenu';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ProfessionalDashboardPage } from '../pages/ProfessionalDashboardPage';
import { ProfessionalsPage } from '../pages/ProfessionalsPage';
import { UsersPage } from '../pages/UsersPage';
import { ElderlyPage } from '../pages/ElderlyPage';
import { ExercisesPage } from '../pages/ExercisesPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { AdminAssignmentsPage } from '../pages/AdminAssignmentsPage';
import { AdminPermissionsPage } from '../pages/AdminPermissionsPage';
import { ProfessionalProfilePage } from '../pages/ProfessionalProfilePage';
import { BrandMark } from '../components/BrandMark';

export const AppRouter: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try { return localStorage.getItem('senior-manage-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
    });
    const [session, setSession] = useState<Omit<AuthenticatedUser, 'token'> | null>(null);
    const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [sessionNotice, setSessionNotice] = useState('');
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isRestoringSession, setIsRestoringSession] = useState(true);
    const [currentView, setCurrentView] = useState('panel');
    const role = session?.role ?? null;

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem('senior-manage-theme', theme); } catch { /* Keep the selection for this session. */ }
    }, [theme]);
    const themeButton = <button type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800">{theme === 'light' ? '◐ Oscuro' : '☀ Claro'}</button>;

    useEffect(() => {
        let isCurrent = true;
        const handleSessionExpired = () => {
            setSession(null);
            setSelectedRole(null);
            setPassword('');
            setSessionNotice('');
            setLoginError('Tu sesión expiró. Inicia sesión nuevamente.');
        };

        window.addEventListener('senior-manage:session-expired', handleSessionExpired);
        restoreSession()
            .then((restoredSession) => {
                if (isCurrent && restoredSession) {
                    setSession(restoredSession);
                    setCurrentView(restoredSession.role === 'admin' ? 'panel' : 'mi-ficha');
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setLoginError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsRestoringSession(false);
                }
            });

        return () => {
            isCurrent = false;
            window.removeEventListener('senior-manage:session-expired', handleSessionExpired);
        };
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [selectedRole]);

    const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedRole) {
            return;
        }

        setIsSigningIn(true);
        setLoginError('');
        setSessionNotice('');
        try {
            const authenticatedUser = await signIn(email.trim(), password);
            if (authenticatedUser.role !== selectedRole) {
                await signOut();
                setLoginError('El rol de esta cuenta no coincide con el perfil seleccionado. Elige el perfil correcto e intenta de nuevo.');
                return;
            }

            setSession({
                email: authenticatedUser.email,
                name: authenticatedUser.name,
                role: authenticatedUser.role,
                mustChangePassword: authenticatedUser.mustChangePassword,
            });
            setCurrentView(authenticatedUser.role === 'admin' ? 'panel' : 'mi-ficha');
            setPassword('');
        } catch (error) {
            setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setSessionNotice('Sesión cerrada correctamente.');
            setLoginError('');
        } catch (error) {
            setSessionNotice('');
            setLoginError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión en el servidor.');
        } finally {
            setSession(null);
            setSelectedRole(null);
            setEmail('');
            setPassword('');
            setCurrentView('panel');
        }
    };

    const renderCurrentView = () => {
        if (role === 'admin') {
            switch (currentView) {
                case 'panel':
                    return <AdminDashboardPage onNavigate={setCurrentView} />;
                case 'profesionales':
                    return <ProfessionalsPage />;
                case 'adultos':
                    return <ElderlyPage isAdmin />;
                case 'usuarios':
                    return <UsersPage currentUserEmail={session?.email ?? ''} />;
                case 'asignaciones':
                    return <AdminAssignmentsPage />;
                case 'permisos':
                    return <AdminPermissionsPage />;
                case 'citas':
                    return <AdminAppointmentsPage onNavigate={setCurrentView} />;
                case 'ejercicios':
                    return <ExercisesPage readOnly />;
                default:
                    return <AdminDashboardPage onNavigate={setCurrentView} />;
            }
        }

        if (role === 'professional') {
            switch (currentView) {
                case 'mi-panel':
                    return <ProfessionalDashboardPage />;
                case 'mis-pacientes':
                    return <ElderlyPage />;
                case 'ejercicios':
                    return <ExercisesPage />;
                case 'agenda':
                    return <AdminAppointmentsPage isAdmin={false} />;
                case 'mi-ficha':
                    return <ProfessionalProfilePage />;
                default:
                    return <ProfessionalDashboardPage />;
            }
        }

        return null;
    };

    if (role && session?.mustChangePassword) {
        return (
            <ChangePasswordPage
                name={session.name}
                onChanged={() => setSession((currentSession) =>
                    currentSession ? { ...currentSession, mustChangePassword: false } : currentSession
                )}
            />
        );
    }

    if (isRestoringSession) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#071b2c] text-white">
                <p role="status" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm">Verificando sesión…</p>
            </main>
        );
    }

    if (!role) {
        return (
            <main className="relative isolate min-h-screen overflow-x-hidden bg-[#f4f8f8] text-gray-900 md:h-screen md:min-h-0 md:overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377]" />
                <div className="absolute -right-28 top-24 -z-10 h-96 w-96 rounded-full border border-white/10" />
                <div className="absolute -right-8 top-44 -z-10 h-56 w-56 rounded-full border border-white/10" />

                <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 md:h-full md:min-h-0">
                    <header className="flex shrink-0 items-center justify-between py-4">
                        <div className="flex items-center gap-3 text-white">
                            {themeButton}
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

                    <div className="grid min-h-0 flex-1 items-start gap-6 py-4 md:grid-cols-2 md:gap-6 xl:gap-12">
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
                            <div className="min-h-[380px] rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_-24px_rgba(4,30,42,0.35)] sm:p-6">
                                <div className="mb-5">
                                    {!selectedRole && <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-xl text-[#0d7377]" aria-hidden="true">✦</div>}
                                    <p className="text-sm font-semibold text-[#0d7377]">{selectedRole ? 'Acceso seguro' : 'Bienvenido'}</p>
                                    <h2 id="welcome-heading" className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                                        {selectedRole ? `Iniciar sesión · ${selectedRole === 'admin' ? 'Administrador' : 'Profesional'}` : '¿Cómo deseas ingresar?'}
                                    </h2>
                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                        {selectedRole ? 'Ingresa las credenciales de tu cuenta autorizada.' : 'Selecciona tu perfil y luego inicia sesión para continuar.'}
                                    </p>
                                </div>

                                {selectedRole ? (
                                    <form onSubmit={handleSignIn} className="space-y-4">
                                        {loginError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{loginError}</p>}
                                        <label className="block space-y-1.5 text-xs font-semibold text-gray-700">
                                            Correo electrónico
                                            <input
                                                type="email"
                                                required
                                                autoComplete="username"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value.toLowerCase())}
                                                placeholder="nombre@ejemplo.com"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                            />
                                        </label>
                                        <label className="block space-y-1.5 text-xs font-semibold text-gray-700">
                                            Contraseña
                                            <input
                                                type="password"
                                                required
                                                autoComplete="current-password"
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                placeholder="Tu contraseña"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={isSigningIn}
                                            className="w-full rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {isSigningIn ? 'Validando acceso…' : 'Iniciar sesión'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedRole(null); setLoginError(''); setPassword(''); }}
                                            className="w-full rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                                        >
                                            Cambiar perfil
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-2.5">
                                        {sessionNotice && <p role="status" aria-live="polite" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{sessionNotice}</p>}
                                        {loginError && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{loginError}</p>}
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedRole('admin'); setCurrentView('panel'); setLoginError(''); setSessionNotice(''); }}
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
                                            type="button"
                                            onClick={() => { setSelectedRole('professional'); setCurrentView('mi-panel'); setLoginError(''); setSessionNotice(''); }}
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
                                )}

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

    if (role === 'admin') {
        const viewTitles: Record<string, string> = {
            panel: 'Panel de administración',
            profesionales: 'Profesionales',
            adultos: 'Adultos mayores',
            citas: 'Citas médicas',
            usuarios: 'Usuarios y roles',
            asignaciones: 'Asignaciones de pacientes',
            permisos: 'Permisos por rol',
            ejercicios: 'Ejercicios',
        };

        return (
            <div className="min-h-screen bg-[#f2f7f7] text-slate-900">
                <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 md:flex-row md:gap-5 md:p-5 lg:gap-6 lg:p-6">
                    <aside className="shrink-0 overflow-hidden bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] text-white shadow-xl shadow-teal-950/10 md:flex md:w-60 md:flex-col md:rounded-[28px] lg:w-64">
                        <div className="flex items-center justify-between px-5 pb-2 pt-5 md:px-6 md:pb-0 md:pt-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner ring-1 ring-white/20"><BrandMark className="h-7 w-7" /></div>
                                <div className="min-w-0">
                                    <h1 className="whitespace-nowrap text-[17px] font-bold leading-none tracking-normal">Senior<span className="text-teal-200">-Manage</span></h1>
                                    <p className="mt-2 text-[11px] font-medium tracking-wide text-white/65">Gestión geriátrica</p>
                                </div>
                            </div>
                        </div>
                        <div className="hidden px-6 pt-7 md:block">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/65">Espacio de trabajo</p>
                            <p className="mt-1 text-sm font-semibold text-white/90">Administración</p>
                        </div>
                        <AdminMenu currentView={currentView} onSelectView={setCurrentView} />
                        <div className="hidden border-t border-white/10 p-4 md:mt-auto md:block">
                            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-200/15 text-sm font-bold text-teal-100" aria-hidden="true">
                                    {session?.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{session?.name}</p>
                                    <p className="truncate text-xs text-white/55">{session?.email}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => void handleSignOut()} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
                                <span aria-hidden="true" className="mr-2">↪</span> Cerrar sesión
                            </button>
                        </div>
                    </aside>

                    <main className="flex min-w-0 flex-1 flex-col">
                        <header className="mx-4 flex items-center justify-between gap-4 rounded-2xl border border-white bg-white/90 px-5 py-4 shadow-sm shadow-slate-900/[0.03] md:mx-0 md:rounded-[22px] md:px-6">
                            {themeButton}
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d7377]">Senior-Manage · Administración</p>
                                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-[#102a36] sm:text-xl">{viewTitles[currentView] ?? 'Administración'}</h2>
                                <p className="mt-1 hidden text-xs text-slate-500 sm:block">Hola, {session?.name}. Gestiona el equipo y la operación desde aquí.</p>
                            </div>
                            <button type="button" onClick={() => void handleSignOut()} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-[#0d7377] md:hidden">
                                Salir
                            </button>
                            <span className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Sesión activa
                            </span>
                        </header>
                        <div className="min-h-0 flex-1">{renderCurrentView()}</div>
                        <footer className="px-5 pb-5 pt-2 text-center text-[11px] text-slate-400 md:px-2">
                            © 2026 Senior-Manage · Cuidado que conecta
                        </footer>
                    </main>
                </div>
            </div>
        );
    }

    const professionalTitles: Record<string, string> = {
        'mi-panel': 'Mi panel',
        'mis-pacientes': 'Adultos mayores',
        agenda: 'Agenda y citas',
        ejercicios: 'Ejercicios',
        'mi-ficha': 'Mi ficha profesional',
    };

    return (
        <div className="min-h-screen bg-[#f2f7f7] text-slate-900">
            <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 md:flex-row md:gap-5 md:p-5 lg:gap-6 lg:p-6">
                <aside className="shrink-0 overflow-hidden bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] text-white shadow-xl shadow-teal-950/10 md:flex md:w-60 md:flex-col md:rounded-[28px] lg:w-64">
                    <div className="flex items-center justify-between px-5 pb-2 pt-5 md:px-6 md:pb-0 md:pt-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20"><BrandMark className="h-7 w-7" /></div>
                            <div className="min-w-0"><h1 className="whitespace-nowrap text-[17px] font-bold leading-none tracking-normal">Senior<span className="text-teal-200">-Manage</span></h1><p className="mt-2 text-[11px] font-medium tracking-wide text-white/65">Gestión geriátrica</p></div>
                        </div>
                    </div>
                    <div className="hidden px-6 pt-7 md:block"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/65">Espacio de trabajo</p><p className="mt-1 text-sm font-semibold text-white/90">Atención profesional</p></div>
                    <ProfessionalMenu currentView={currentView} onSelectView={setCurrentView} />
                    <div className="hidden border-t border-white/10 p-4 md:mt-auto md:block">
                        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-200/15 text-sm font-bold text-teal-100" aria-hidden="true">{session?.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase()}</span>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{session?.name}</p><p className="truncate text-xs text-white/55">{session?.email}</p></div>
                        </div>
                        <button type="button" onClick={() => void handleSignOut()} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">Cerrar sesión</button>
                    </div>
                </aside>
                <main className="flex min-w-0 flex-1 flex-col">
                    <header className="mx-4 flex items-center justify-between gap-4 rounded-2xl border border-white bg-white/90 px-5 py-4 shadow-sm shadow-slate-900/[0.03] md:mx-0 md:rounded-[22px] md:px-6">
                        {themeButton}
                        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d7377]">Senior-Manage · Atención profesional</p><h2 className="mt-1 truncate text-lg font-bold tracking-tight text-[#102a36] sm:text-xl">{professionalTitles[currentView] ?? 'Atención profesional'}</h2><p className="mt-1 hidden text-xs text-slate-500 sm:block">Hola, {session?.name}. Aquí tienes tu espacio de trabajo.</p></div>
                        <button type="button" onClick={() => void handleSignOut()} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-[#0d7377] md:hidden">Salir</button>
                        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Sesión activa</span>
                    </header>
                    <div className="min-h-0 flex-1">{renderCurrentView()}</div>
                    <footer className="px-5 pb-5 pt-2 text-center text-[11px] text-slate-400 md:px-2">© 2026 Senior-Manage · Cuidado que conecta</footer>
                </main>
            </div>
        </div>
    );
};

export default AppRouter;
