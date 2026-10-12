import React from 'react';

export const AdminDashboardPage: React.FC = () => {
    return (
        <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-gray-900">48</p>
                        <p className="text-sm text-gray-500">Profesionales</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-[#00b4d8] rounded-xl text-xl">👨‍⚕️</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-gray-900">41</p>
                        <p className="text-sm text-gray-500">Activos</p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl text-xl">✅</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-gray-900">7</p>
                        <p className="text-sm text-gray-500">Inactivos</p>
                    </div>
                    <div className="p-3 bg-gray-50 text-gray-600 rounded-xl text-xl">🚫</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-gray-900">5</p>
                        <p className="text-sm text-gray-500">Roles</p>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl text-xl">🛡️</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Profesionales recientes</h3>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="pb-3 font-medium">PROFESIONAL</th>
                                <th className="pb-3 font-medium">ESPECIALIDAD</th>
                                <th className="pb-3 font-medium">ROL</th>
                                <th className="pb-3 font-medium">ESTADO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            <tr>
                                <td className="py-3 flex items-center space-x-3">
                                    <span className="w-8 h-8 bg-teal-800 text-white rounded-full flex items-center justify-center text-xs font-bold">LM</span>
                                    <span>Dra. Laura Mejía</span>
                                </td>
                                <td>Geriatría</td>
                                <td><span className="bg-cyan-50 text-[#00b4d8] px-2.5 py-1 rounded-full text-xs font-semibold">Médico</span></td>
                                <td><span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-semibold">Activo</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Usuarios por rol</h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <div className="flex justify-between mb-1 text-gray-600"><span>Enfermería</span><span className="font-semibold">20</span></div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-[#00b4d8] h-full w-[80%]"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;