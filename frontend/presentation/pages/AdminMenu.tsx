import React from 'react';

interface AdminMenuProps {
    currentView: string;
    onSelectView: (view: string) => void;
}

const items = [
    { id: 'panel', label: 'Resumen', icon: '▦' },
    { id: 'profesionales', label: 'Profesionales', icon: '✚' },
    { id: 'adultos', label: 'Adultos mayores', icon: '♡' },
    { id: 'citas', label: 'Citas médicas', icon: '◷' },
    { id: 'usuarios', label: 'Usuarios y roles', icon: '◎' },
];

export const AdminMenu: React.FC<AdminMenuProps> = ({ currentView, onSelectView }) => (
    <nav aria-label="Menú de administración" className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:overflow-visible md:px-4 md:py-6">
        {items.map((item) => {
            const isActive = currentView === item.id;
            return (
                <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelectView(item.id)}
                    className={`group flex min-w-[132px] shrink-0 items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition md:min-w-0 ${
                        isActive
                            ? 'bg-white text-[#0b3545] shadow-lg shadow-slate-950/15'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg transition ${
                        isActive ? 'bg-teal-50 text-[#0d7377]' : 'bg-white/10 text-teal-100 group-hover:bg-white/15'
                    }`} aria-hidden="true">
                        {item.icon}
                    </span>
                    <span className="leading-tight">{item.label}</span>
                </button>
            );
        })}
    </nav>
);
