import { useEffect, useMemo, useState, type FC } from 'react';
import { ApiRequestError, listRolePermissions, setProfessionalPermission } from '../../application/managementService';
import type { AccountRole, RolePermission } from '../../domain/models/management';

type PermissionDefinition = {
    module: string;
    moduleLabel: string;
    operation: string;
    operationLabel: string;
    professionalConfigurable: boolean;
};

const permissionCatalog: ReadonlyArray<PermissionDefinition> = [
    { module: 'USERS', moduleLabel: 'Usuarios y roles', operation: 'READ', operationLabel: 'Consultar usuarios', professionalConfigurable: false },
    { module: 'USERS', moduleLabel: 'Usuarios y roles', operation: 'CREATE', operationLabel: 'Crear usuarios', professionalConfigurable: false },
    { module: 'USERS', moduleLabel: 'Usuarios y roles', operation: 'UPDATE', operationLabel: 'Editar usuarios, roles y contraseñas', professionalConfigurable: false },
    { module: 'USERS', moduleLabel: 'Usuarios y roles', operation: 'DELETE', operationLabel: 'Eliminar usuarios', professionalConfigurable: false },
    { module: 'PROFESSIONALS', moduleLabel: 'Directorio de profesionales', operation: 'READ', operationLabel: 'Consultar directorio', professionalConfigurable: false },
    { module: 'PROFESSIONALS', moduleLabel: 'Directorio de profesionales', operation: 'CREATE', operationLabel: 'Crear ficha profesional', professionalConfigurable: false },
    { module: 'PROFESSIONALS', moduleLabel: 'Directorio de profesionales', operation: 'UPDATE', operationLabel: 'Editar y verificar fichas', professionalConfigurable: false },
    { module: 'PROFESSIONALS', moduleLabel: 'Directorio de profesionales', operation: 'DELETE', operationLabel: 'Eliminar profesional', professionalConfigurable: false },
    { module: 'ASIGNACIONES', moduleLabel: 'Asignaciones de pacientes', operation: 'READ', operationLabel: 'Consultar asignaciones', professionalConfigurable: false },
    { module: 'ASIGNACIONES', moduleLabel: 'Asignaciones de pacientes', operation: 'ASSIGN', operationLabel: 'Asignar profesional a paciente', professionalConfigurable: false },
    { module: 'ASIGNACIONES', moduleLabel: 'Asignaciones de pacientes', operation: 'END', operationLabel: 'Finalizar asignación', professionalConfigurable: false },
    { module: 'PERMISOS', moduleLabel: 'Roles y permisos', operation: 'READ', operationLabel: 'Consultar matriz de permisos', professionalConfigurable: false },
    { module: 'PERMISOS', moduleLabel: 'Roles y permisos', operation: 'UPDATE', operationLabel: 'Modificar permisos del profesional', professionalConfigurable: false },
    { module: 'PACIENTES', moduleLabel: 'Adultos mayores / Pacientes', operation: 'READ', operationLabel: 'Consultar pacientes', professionalConfigurable: true },
    { module: 'PACIENTES', moduleLabel: 'Adultos mayores / Pacientes', operation: 'CREATE', operationLabel: 'Registrar nuevo paciente', professionalConfigurable: true },
    { module: 'PACIENTES', moduleLabel: 'Adultos mayores / Pacientes', operation: 'UPDATE', operationLabel: 'Editar datos del paciente', professionalConfigurable: true },
    { module: 'PACIENTES', moduleLabel: 'Adultos mayores / Pacientes', operation: 'DEACTIVATE', operationLabel: 'Desactivar registro de paciente', professionalConfigurable: false },
    { module: 'PACIENTES', moduleLabel: 'Adultos mayores / Pacientes', operation: 'HISTORY_READ', operationLabel: 'Consultar pacientes históricos/inactivos', professionalConfigurable: true },
    { module: 'ANTECEDENTES', moduleLabel: 'Antecedentes clínicos', operation: 'READ', operationLabel: 'Consultar antecedentes', professionalConfigurable: true },
    { module: 'ANTECEDENTES', moduleLabel: 'Antecedentes clínicos', operation: 'CREATE', operationLabel: 'Registrar antecedente', professionalConfigurable: true },
    { module: 'ANTECEDENTES', moduleLabel: 'Antecedentes clínicos', operation: 'UPDATE', operationLabel: 'Editar antecedente', professionalConfigurable: true },
    { module: 'CITAS', moduleLabel: 'Agenda y citas médicas', operation: 'READ', operationLabel: 'Consultar agenda de citas', professionalConfigurable: true },
    { module: 'CITAS', moduleLabel: 'Agenda y citas médicas', operation: 'CREATE', operationLabel: 'Programar nueva cita', professionalConfigurable: true },
    { module: 'CITAS', moduleLabel: 'Agenda y citas médicas', operation: 'UPDATE', operationLabel: 'Completar o cancelar cita', professionalConfigurable: true },
    { module: 'EJERCICIOS', moduleLabel: 'Ejercicios y planes', operation: 'READ', operationLabel: 'Consultar catálogo y planes', professionalConfigurable: true },
    { module: 'EJERCICIOS', moduleLabel: 'Ejercicios y planes', operation: 'CREATE', operationLabel: 'Crear ejercicios y asignar planes', professionalConfigurable: true },
];

const professionalCatalog = permissionCatalog.filter((item) => item.professionalConfigurable);

function errorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
        if (error.status === 401) return 'La sesión expiró. Inicia sesión nuevamente.';
        if (error.status === 403) return 'El backend denegó la operación. Se requiere rol administrador.';
        if (error.status === 503) return 'La configuración de permisos o PostgreSQL no está disponible.';
    }
    return error instanceof Error ? error.message : 'No fue posible consultar los permisos.';
}

export const AdminPermissionsPage: FC = () => {
    const [role, setRole] = useState<AccountRole>('admin');
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingKey, setSavingKey] = useState('');

    useEffect(() => {
        let current = true;
        setLoading(true);
        setError('');
        listRolePermissions(role)
            .then((result) => { if (current) setPermissions(result); })
            .catch((cause: unknown) => { if (current) { setPermissions([]); setError(errorMessage(cause)); } })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [role]);

    const configured = useMemo(
        () => new Map(permissions.map((item) => [`${item.module}/${item.operation}`, item.allowed])),
        [permissions],
    );

    const visiblePermissions = role === 'admin' ? permissionCatalog : professionalCatalog;

    const updatePermission = async (module: string, operation: string, allowed: boolean) => {
        const key = `${module}/${operation}`;
        setSavingKey(key);
        setError('');
        try {
            await setProfessionalPermission(module, operation, allowed);
            setPermissions((current) => {
                const exists = current.some((item) => item.module === module && item.operation === operation);
                return exists
                    ? current.map((item) => item.module === module && item.operation === operation ? { ...item, allowed } : item)
                    : [...current, { module, operation, allowed }];
            });
        } catch (cause) {
            setError(errorMessage(cause));
        } finally {
            setSavingKey('');
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Roles y permisos</h1>
                <p className="mt-1 text-sm text-gray-500">El Administrador conserva control total del sistema; los permisos operativos del Profesional son configurables.</p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="Seleccionar rol">
                <button
                    type="button"
                    aria-pressed={role === 'admin'}
                    onClick={() => setRole('admin')}
                    className={`rounded-2xl border p-5 text-left transition ${role === 'admin'
                        ? 'border-[#0d7377] bg-teal-50/70 shadow-sm ring-2 ring-[#0d7377]/20'
                        : 'border-slate-200 bg-white hover:border-teal-300'}`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-[#102a36]">Administrador</span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            Acceso total · {permissionCatalog.length} permisos
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Privilegios máximos permanentes sobre usuarios, profesionales, asignaciones, permisos y módulos clínicos.</p>
                </button>
                <button
                    type="button"
                    aria-pressed={role === 'professional'}
                    onClick={() => setRole('professional')}
                    className={`rounded-2xl border p-5 text-left transition ${role === 'professional'
                        ? 'border-[#0d7377] bg-teal-50/70 shadow-sm ring-2 ring-[#0d7377]/20'
                        : 'border-slate-200 bg-white hover:border-teal-300'}`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-[#102a36]">Profesional</span>
                        <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                            Configurable · {professionalCatalog.length} permisos
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Solo funciones clínicas sobre pacientes con asignación vigente, ajustables mediante interruptores.</p>
                </button>
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-950">
                {role === 'admin'
                    ? 'El rol Administrador dispone de acceso total permanente a todas las funciones del sistema y mantiene siempre mayor jerarquía que el Profesional.'
                    : 'Los cambios aplican a todas las cuentas con rol Profesional y se guardan inmediatamente en PostgreSQL. El acceso clínico siempre queda acotado a los pacientes asignados vigentes.'}
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {loading && <p role="status" className="text-sm text-gray-600">Consultando configuración de permisos...</p>}

            {!loading && !error && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Módulo</th>
                                <th className="px-4 py-3">Operación</th>
                                <th className="px-4 py-3">Acceso</th>
                                <th className="px-4 py-3">Estado actual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visiblePermissions.map((item) => {
                                const key = `${item.module}/${item.operation}`;
                                const decision = role === 'admin' ? true : (configured.get(key) ?? false);
                                return (
                                    <tr key={key}>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-800">{item.moduleLabel}</p>
                                            <span className="text-[11px] font-medium text-gray-400">{item.module}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-gray-700">{item.operationLabel}</p>
                                            <span className="text-[11px] font-medium text-gray-400">{item.operation}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {role === 'admin' ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                                    Siempre activo
                                                </span>
                                            ) : (
                                                <label className="inline-flex cursor-pointer items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={decision}
                                                        disabled={savingKey !== ''}
                                                        onChange={(event) => void updatePermission(item.module, item.operation, event.target.checked)}
                                                        aria-label={`${decision ? 'Desactivar' : 'Activar'} ${item.operationLabel} en ${item.moduleLabel}`}
                                                    />
                                                    <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-teal-600 peer-focus-visible:ring-4 peer-focus-visible:ring-teal-200 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
                                                    <span className="text-xs font-semibold text-slate-700">{decision ? 'Activado' : 'Desactivado'}</span>
                                                </label>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {role === 'admin'
                                                ? 'Acceso total permanente'
                                                : savingKey === key
                                                    ? 'Guardando...'
                                                    : decision
                                                        ? 'Activo en el backend'
                                                        : 'Desactivado en el backend'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-xs leading-5 text-gray-500">
                El backend valida la jerarquía de administrador y persiste la configuración del rol Profesional en PostgreSQL.
            </p>
        </section>
    );
};
