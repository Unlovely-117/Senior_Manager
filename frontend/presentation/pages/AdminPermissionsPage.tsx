import { useEffect, useMemo, useState, type FC } from 'react';
import { ApiRequestError, listRolePermissions, setProfessionalPermission } from '../../application/managementService';
import type { AccountRole, RolePermission } from '../../domain/models/management';

const permissionCells: ReadonlyArray<{ module: string; operations: readonly string[] }> = [
    { module: 'USERS', operations: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
    { module: 'PROFESSIONALS', operations: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
    { module: 'PERMISOS', operations: ['READ', 'UPDATE'] },
    { module: 'PACIENTES', operations: ['READ', 'CREATE', 'UPDATE', 'DEACTIVATE', 'HISTORY_READ'] },
    { module: 'ANTECEDENTES', operations: ['READ', 'CREATE', 'UPDATE'] },
    { module: 'ASIGNACIONES', operations: ['READ', 'ASSIGN', 'END'] },
    { module: 'CITAS', operations: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
    { module: 'EJERCICIOS', operations: ['READ', 'CREATE'] },
];

const approvedPermissionCells: Record<AccountRole, ReadonlySet<string>> = {
    admin: new Set([
        'USERS/READ', 'USERS/CREATE', 'USERS/UPDATE', 'USERS/DELETE',
        'PROFESSIONALS/READ', 'PROFESSIONALS/CREATE', 'PROFESSIONALS/UPDATE', 'PROFESSIONALS/DELETE',
        'PACIENTES/READ', 'PACIENTES/CREATE', 'PACIENTES/UPDATE', 'PACIENTES/DEACTIVATE', 'PACIENTES/HISTORY_READ',
        'ANTECEDENTES/READ', 'ANTECEDENTES/CREATE', 'ANTECEDENTES/UPDATE',
        'ASIGNACIONES/READ', 'ASIGNACIONES/ASSIGN', 'ASIGNACIONES/END', 'PERMISOS/READ',
        'CITAS/READ', 'CITAS/CREATE', 'CITAS/UPDATE', 'CITAS/DELETE', 'EJERCICIOS/READ',
    ]),
    professional: new Set([
        'PACIENTES/READ', 'PACIENTES/HISTORY_READ', 'ANTECEDENTES/READ',
        'CITAS/READ', 'CITAS/CREATE', 'CITAS/UPDATE', 'CITAS/DELETE', 'EJERCICIOS/READ', 'EJERCICIOS/CREATE',
    ]),
};

function errorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
        if (error.status === 401) return 'La sesion expiro. Inicia sesion nuevamente.';
        if (error.status === 403) return 'El backend denego la operacion. Se requiere rol administrador y permiso PERMISOS/READ.';
        if (error.status === 503) return 'La configuracion de permisos o PostgreSQL no esta disponible.';
    }
    return error instanceof Error ? error.message : 'No fue posible consultar los permisos.';
}

export const AdminPermissionsPage: FC = () => {
    const [role, setRole] = useState<AccountRole>('professional');
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

    const configured = useMemo(() => new Map(permissions.map((item) => [`${item.module}/${item.operation}`, item.allowed])), [permissions]);
    const knownCells = useMemo(() => new Set(permissionCells.flatMap(({ module, operations }) => operations.map((operation) => `${module}/${operation}`))), []);
    const additionalDecisions = permissions.filter((item) => !knownCells.has(`${item.module}/${item.operation}`));

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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administracion</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Permisos por rol</h1>
                <p className="mt-1 text-sm text-gray-500">Activa o desactiva funciones disponibles para las cuentas profesionales. Los cambios se guardan en el backend.</p>
            </header>

            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-950">
                Los cambios aplican a todas las cuentas con rol Profesional. El acceso a pacientes permanece limitado a asignaciones vigentes. Los permisos de administrador y las funciones fuera de esta lista no se pueden modificar aqui.
            </div>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            <label className="block max-w-xs text-xs font-semibold text-gray-600">Configuracion del rol
                <select className="mt-1 block w-full rounded-lg border p-2 text-sm" value={role} onChange={(event) => setRole(event.target.value as AccountRole)}>
                    <option value="admin">Administrador (solo consulta)</option>
                    <option value="professional">Profesional (configurable)</option>
                </select>
            </label>
            {loading && <p role="status" className="text-sm text-gray-600">Consultando configuracion de permisos...</p>}
            {!loading && !error && permissions.length === 0 && (
                <p role="status" className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">No hay decisiones configuradas para este rol. Las operaciones sin decision permanecen denegadas.</p>
            )}
            {!loading && !error && <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr><th className="px-4 py-3">Modulo</th><th className="px-4 py-3">Funcion</th><th className="px-4 py-3">Acceso</th><th className="px-4 py-3">Estado actual</th><th className="px-4 py-3">Matriz inicial</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {permissionCells.flatMap(({ module, operations }) => operations.map((operation) => {
                            const key = `${module}/${operation}`;
                            const decision = configured.get(key) ?? false;
                            const editable = role === 'professional' && approvedPermissionCells.professional.has(key);
                            return <tr key={key}>
                                <td className="px-4 py-3 font-semibold text-gray-800">{module}</td>
                                <td className="px-4 py-3 text-gray-700">{operation}</td>
                                <td className="px-4 py-3">
                                    {editable ? <label className="inline-flex cursor-pointer items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={decision}
                                            disabled={savingKey !== ''}
                                            onChange={(event) => void updatePermission(module, operation, event.target.checked)}
                                            aria-label={`${decision ? 'Desactivar' : 'Activar'} ${operation} en ${module}`}
                                        />
                                        <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-teal-600 peer-focus-visible:ring-4 peer-focus-visible:ring-teal-200 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
                                        <span className="text-xs font-semibold text-slate-700">{decision ? 'Activado' : 'Desactivado'}</span>
                                    </label> : <span className="text-xs text-slate-500">{role === 'admin' ? 'Solo consulta' : 'No configurable'}</span>}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{savingKey === key ? 'Guardando...' : decision ? 'Activo en el backend' : 'Denegado en el backend'}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{approvedPermissionCells[role].has(key) ? 'Incluido' : 'No incluido'}</td>
                            </tr>;
                        }))}
                    </tbody>
                </table>
            </div>}
            {!loading && !error && additionalDecisions.length > 0 && <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Otras decisiones devueltas por el backend</h2>
                    <p className="text-sm text-gray-500">Se muestran para revision; no se pueden cambiar desde esta pantalla.</p>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Modulo</th><th className="px-4 py-3">Funcion</th><th className="px-4 py-3">Estado actual</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">{additionalDecisions.map((item) => <tr key={`${item.module}/${item.operation}`}>
                            <td className="px-4 py-3">{item.module}</td><td className="px-4 py-3">{item.operation}</td>
                            <td className="px-4 py-3">{item.allowed ? 'Activo' : 'Denegado'}</td>
                        </tr>)}</tbody>
                    </table>
                </div>
            </section>}
            <p className="text-xs leading-5 text-gray-500">El backend valida cada cambio y lo persiste en PostgreSQL. La consulta y la edicion requieren una sesion de administrador con permiso PERMISOS/READ.</p>
        </section>
    );
};
