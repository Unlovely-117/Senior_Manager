import React from 'react';

interface ProfessionalMenuProps {
    currentView: string;
    onSelectView: (view: string) => void;
}

const items = [
    { id: 'mi-panel', label: 'Mi panel', icon: '⌂', status: '' },
    { id: 'mis-pacientes', label: 'Adultos mayores', icon: '♡', status: '' },
    { id: 'agenda', label: 'Agenda y citas', icon: '◷', status: '' },
    { id: 'ejercicios', label: 'Ejercicios', icon: '↗', status: '' },
    { id: 'mi-ficha', label: 'Mi ficha profesional', icon: '▤', status: '' },
];

export const ProfessionalMenu: React.FC<ProfessionalMenuProps> = ({ currentView, onSelectView }) => (
    <nav aria-label="Menú profesional" className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:overflow-visible md:px-4 md:py-6">
        {items.map((item) => {
            const active = currentView === item.id;
            return (
                <button key={item.id} type="button" aria-current={active ? 'page' : undefined}
                    onClick={() => onSelectView(item.id)}
                    className={`group flex min-w-[145px] shrink-0 items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition md:min-w-0 ${active ? 'bg-white text-[#0b3545] shadow-lg shadow-slate-950/15' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${active ? 'bg-teal-50 text-[#0d7377]' : 'bg-white/10 text-teal-100'}`} aria-hidden="true">{item.icon}</span>
                    <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
                    {item.status && <span className="hidden rounded-full bg-amber-100/15 px-2 py-1 text-[9px] font-semibold leading-tight text-amber-100 lg:inline">Próximamente</span>}
                </button>
            );
        })}
    </nav>
);
