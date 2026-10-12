import React from 'react';

interface ProfessionalMenuProps {
    currentView: string;
    onSelectView: (view: string) => void;
}

export const ProfessionalMenu: React.FC<ProfessionalMenuProps> = ({ currentView, onSelectView }) => {
    const items = [
        { id: 'mi-panel', label: 'Mi Panel', icon: '🏠' },
        { id: 'mis-pacientes', label: 'Adultos mayores', icon: '👴' },
        { id: 'agenda', label: 'Mi Agenda y Citas', icon: '📅' },
        { id: 'medicamentos', label: 'Control de Medicamentos', icon: '💊' },
    ];

    return (
        <nav className="p-4 space-y-2">
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition text-sm font-medium ${
                        currentView === item.id ? 'bg-[#00b4d8] text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
};