import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import {
    createUser,
    deleteUser,
    listUsers,
    setUserRole,
    setUserStatus,
    updateUser,
} from '../../application/managementService';
import type { AccountRole, UserAccount } from '../../domain/models/management';

type UserForm = {
    name: string;
    email: string;
    role: AccountRole;
    password: string;
};

type UsersPageProps = {
    currentUserEmail: string;
};

const emptyForm: UserForm = { name: '', email: '', role: 'professional', password: '' };
const inputClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10';

export const UsersPage: FC<UsersPageProps> = ({ currentUserEmail }) => {
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | AccountRole>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [draft, setDraft] = useState<UserForm>(emptyForm);
    const [formError, setFormError] = useState('');
    const [requestError, setRequestError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const refreshUsers = async () => {
        const result = await listUsers();
        setUsers(result);
        setRequestError('');
    };

    useEffect(() => {
        let isCurrent = true;
        listUsers()
            .then((items) => {
                if (isCurrent) {
                    setUsers(items);
                    setRequestError('');
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setRequestError(error instanceof Error ? error.message : 'No se pudo cargar la lista de usuarios.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });
        return () => { isCurrent = false; };
    }, []);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return users.filter((user) => {
            const matchesSearch = user.name.toLocaleLowerCase().includes(normalizedSearch)
                || user.email.toLocaleLowerCase().includes(normalizedSearch);
            return matchesSearch && (roleFilter === 'all' || user.role === roleFilter);
        });
    }, [users, search, roleFilter]);

    const openCreateForm = () => {
        setIsFormOpen(true);
        setEditingEmail(null);
        setDraft(emptyForm);
        setFormError('');
        setNotice('');
    };

    const openEditForm = (user: UserAccount) => {
        setIsFormOpen(true);
        setEditingEmail(user.email);
        setDraft({ name: user.name, email: user.email, role: user.role, password: '' });
        setFormError('');
        setNotice('');
    };

    const saveUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');
        setRequestError('');
        try {
            const name = draft.name.trim();
            const email = draft.email.trim().toLocaleLowerCase();
            if (editingEmail === null) {
                await createUser({ name, email, role: draft.role, password: draft.password });
                setNotice('La cuenta se creó correctamente.');
            } else {
                await updateUser(editingEmail, { name, email });
                if (draft.role !== users.find((user) => user.email === editingEmail)?.role) {
                    await setUserRole(email, draft.role);
                }
                setNotice('La cuenta se actualizó correctamente.');
            }
            await refreshUsers();
            setIsFormOpen(false);
            setEditingEmail(null);
            setDraft(emptyForm);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo guardar la cuenta.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (user: UserAccount) => {
        setNotice('');
        setRequestError('');
        try {
            await setUserStatus(user.email, !user.active);
            await refreshUsers();
            setNotice(`La cuenta de ${user.name} quedó ${user.active ? 'inactiva' : 'activa'}.`);
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
        }
    };

    const removeUser = async (user: UserAccount) => {
        if (!window.confirm(`¿Eliminar la cuenta de ${user.name}? Esta acción no se puede deshacer.`)) {
            return;
        }
        setNotice('');
        setRequestError('');
        try {
            await deleteUser(user.email);
            await refreshUsers();
            setNotice('La cuenta se eliminó correctamente.');
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.');
        }
    };

    const activeCount = users.filter((user) => user.active).length;
    const administrators = users.filter((user) => user.role === 'admin').length;

    return (
        <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Administración</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Usuarios y roles</h1>
                    <p className="mt-2 text-sm text-gray-500">Gestiona las cuentas y permisos de acceso de la plataforma.</p>
                </div>
                <button type="button" onClick={openCreateForm} className="rounded-xl bg-[#0d7377] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800">
                    Agregar usuario
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas registradas</p>
                    <p className="mt-2 text-3xl font-bold text-[#102a36]">{users.length}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Cuentas activas</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Administradores</p>
                    <p className="mt-2 text-3xl font-bold text-[#0d7377]">{administrators}</p>
                </article>
            </div>

            {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
            {requestError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{requestError}</span>
                    <button type="button" onClick={() => { setIsLoading(true); void refreshUsers().catch((error: unknown) => setRequestError(error instanceof Error ? error.message : 'No se pudo cargar la lista de usuarios.')).finally(() => setIsLoading(false)); }} className="font-semibold underline">Reintentar</button>
                </div>
            )}

            {isFormOpen && (
                <form onSubmit={saveUser} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0d7377]">Cuentas de acceso</p>
                            <h2 className="mt-1 text-lg font-bold text-[#102a36]">{editingEmail === null ? 'Crear usuario' : 'Editar usuario'}</h2>
                        </div>
                        <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                    </div>
                    {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Nombre completo
                            <input required maxLength={100} className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Correo electrónico
                            <input required type="email" maxLength={120} className={inputClass} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                        </label>
                        {editingEmail === null && (
                            <label className="space-y-1.5 text-xs font-semibold text-gray-600">Contraseña inicial
                                <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
                            </label>
                        )}
                        <label className="space-y-1.5 text-xs font-semibold text-gray-600">Rol
                            <select className={inputClass} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as AccountRole })}>
                                <option value="professional">Profesional</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </label>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">La contraseña inicial se guarda con hash en el backend y no se vuelve a mostrar.</p>
                    <button type="submit" disabled={isSaving} className="mt-5 rounded-xl bg-[#0d7377] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">
                        {isSaving ? 'Guardando…' : editingEmail === null ? 'Crear cuenta' : 'Guardar cambios'}
                    </button>
                </form>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Buscar usuarios</span>
                        <input className={inputClass} placeholder="Buscar por nombre o correo electrónico" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </label>
                    <label>
                        <span className="sr-only">Filtrar por rol</span>
                        <select className={inputClass} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
                            <option value="all">Todos los roles</option>
                            <option value="admin">Administradores</option>
                            <option value="professional">Profesionales</option>
                        </select>
                    </label>
                </div>
                {isLoading ? (
                    <p className="p-10 text-center text-sm text-gray-500">Cargando usuarios…</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                            <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold">Usuario</th>
                                    <th className="px-5 py-3.5 font-semibold">Rol</th>
                                    <th className="px-5 py-3.5 font-semibold">Estado</th>
                                    <th className="px-5 py-3.5 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => {
                                    const isCurrentUser = user.email.toLocaleLowerCase() === currentUserEmail.toLocaleLowerCase();
                                    return (
                                        <tr key={user.email} className="transition hover:bg-teal-50/30">
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">{user.name}{isCurrentUser && <span className="ml-2 text-xs font-medium text-[#0d7377]">Tú</span>}</p>
                                                <p className="mt-1 text-xs text-gray-500">{user.email}</p>
                                            </td>
                                            <td className="px-5 py-4 text-gray-700">{user.role === 'admin' ? 'Administrador' : 'Profesional'}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {user.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="space-x-3 whitespace-nowrap px-5 py-4">
                                                <button type="button" disabled={isCurrentUser} onClick={() => openEditForm(user)} className="font-semibold text-[#0d7377] hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline">Editar</button>
                                                <button type="button" disabled={isCurrentUser} onClick={() => void toggleStatus(user)} className="font-medium text-gray-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline">{user.active ? 'Desactivar' : 'Activar'}</button>
                                                <button type="button" disabled={isCurrentUser} onClick={() => void removeUser(user)} className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline">Eliminar</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredUsers.length === 0 && (
                                    <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-500">{requestError ? 'No se pudo cargar la lista de usuarios.' : 'No se encontraron usuarios con esos filtros.'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">Los cambios se guardan en el backend. Para proteger el acceso, no puedes modificar ni eliminar tu propia cuenta desde aquí.</p>
            </div>
        </section>
    );
};

export default UsersPage;
