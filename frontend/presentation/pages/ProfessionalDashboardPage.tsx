import React from 'react';

export const ProfessionalDashboardPage: React.FC = () => {
    return (
        <div className="p-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Panel de Atención Profesional</h3>
                <p className="text-sm text-gray-500 mb-6">Supervisión y control diario de residentes asignados.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-600 font-semibold">Pacientes Asignados</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">14</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-600 font-semibold">Citas para Hoy</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">5</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-sm text-amber-600 font-semibold">Medicamentos Pendientes</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalDashboardPage;