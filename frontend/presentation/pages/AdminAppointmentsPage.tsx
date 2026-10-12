import type { FC } from 'react';

type AdminAppointmentsPageProps = {
    onNavigate: (view: string) => void;
};

export const AdminAppointmentsPage: FC<AdminAppointmentsPageProps> = ({ onNavigate }) => (
    <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Citas médicas</h1>
            <p className="mt-2 text-sm text-slate-500">Consulta y coordina la agenda general de atención.</p>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071b2c] via-[#0b3545] to-[#0d7377] p-6 text-white shadow-xl shadow-teal-950/10 sm:p-8">
            <div className="flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-start">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-100" aria-hidden="true">◷</span>
                <div>
                    <span className="inline-flex rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100">Próximamente</span>
                    <h2 className="mt-3 text-xl font-bold sm:text-2xl">La agenda todavía no está conectada</h2>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                        Este proyecto aún no incluye un modelo ni un servicio de citas en el backend. Para evitar mostrar citas ficticias como datos reales, esta sección queda identificada como prototipo hasta que se integre el módulo.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={() => onNavigate('profesionales')} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b3545] transition hover:bg-teal-50">
                            Ver profesionales
                        </button>
                        <button type="button" onClick={() => onNavigate('adultos')} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
                            Ver adultos mayores
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#102a36]">Qué hace falta para habilitar la agenda</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-500">
                    <li className="flex gap-2"><span className="text-[#0d7377]" aria-hidden="true">✓</span> Definir citas, horarios y profesionales responsables.</li>
                    <li className="flex gap-2"><span className="text-[#0d7377]" aria-hidden="true">✓</span> Añadir operaciones protegidas en la API.</li>
                    <li className="flex gap-2"><span className="text-[#0d7377]" aria-hidden="true">✓</span> Conectar agenda, filtros y cambios persistentes.</li>
                </ul>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#102a36]">Mientras tanto</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Puedes administrar el directorio del equipo y los usuarios desde los módulos que ya están conectados al backend.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => onNavigate('profesionales')} className="text-sm font-semibold text-[#0d7377] hover:underline">Administrar profesionales →</button>
                    <button type="button" onClick={() => onNavigate('usuarios')} className="text-sm font-semibold text-[#0d7377] hover:underline">Administrar usuarios →</button>
                </div>
            </article>
        </div>
    </section>
);

export default AdminAppointmentsPage;
