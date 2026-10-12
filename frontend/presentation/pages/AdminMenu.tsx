import React from 'react';

interface AdminMenuProps {
    currentView: string;
    onSelectView: (view: string) => void;
}

export const AdminMenu: React.FC<AdminMenuProps> = ({ currentView, onSelectView }) => {
    const items = [
        { id: 'panel', label: 'Panel', icon: '📊' },
        { id: 'profesionales', label: 'Profesionales', icon: '👨‍⚕️' },
        { id: 'adultos', label: 'Adultos mayores', icon: '👴' },
        { id: 'citas', label: 'Citas médicas', icon: '📅' },
        { id: 'usuarios', label: 'Usuarios y roles', icon: '👥' },
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