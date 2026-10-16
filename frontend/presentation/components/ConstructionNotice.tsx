import type { FC, ReactNode } from 'react';

type ConstructionNoticeProps = {
    title: string;
    description: string;
    children?: ReactNode;
};

export const ConstructionNotice: FC<ConstructionNoticeProps> = ({ title, description, children }) => (
    <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8" aria-labelledby="construction-title">
        <header>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Atención profesional</p>
            <h1 id="construction-title" className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </header>
        <div className="overflow-hidden rounded-[28px] border border-amber-200/70 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-amber-300 via-amber-400 to-teal-500" />
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:p-8">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-700" aria-hidden="true">◷</span>
                <div className="max-w-3xl">
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">En construcción</span>
                    <h2 className="mt-3 text-xl font-bold text-[#102a36]">Estamos preparando este módulo</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description} Esta sección estará disponible cuando se complete su conexión con el servidor y se validen sus datos.</p>
                    {children && <div className="mt-5">{children}</div>}
                </div>
            </div>
        </div>
    </section>
);
