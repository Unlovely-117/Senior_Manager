import type { AccountRole, AuthenticatedUser, Professional, UserAccount } from '../domain/models/management';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080/api').replace(/\/$/, '');
const TOKEN_KEY = 'senior-manage-session-token';

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

interface ApiMessage {
    message?: string;
    error?: string;
}

function formBody(values: Record<string, string | boolean>): URLSearchParams {
    const body = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => body.set(key, String(value)));
    return body;
}

async function request<T>(
    path: string,
    options: { method?: string; values?: Record<string, string | boolean>; authenticated?: boolean } = {},
): Promise<T> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = new Headers();
    let body: URLSearchParams | undefined;

    if (options.values) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        body = formBody(options.values);
    }
    if (options.authenticated !== false && token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body,
    });

    const payload = await response.json() as T & ApiMessage;
    if (!response.ok) {
        if (response.status === 401 && token) {
            sessionStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new Event('senior-manage:session-expired'));
        }
        throw new Error(payload.error ?? 'No fue posible completar la solicitud.');
    }
    return payload;
}

export async function signIn(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await request<AuthenticatedUser>('/auth/login', {
        method: 'POST',
        values: { email: normalizeEmail(email), password },
        authenticated: false,
    });
    sessionStorage.setItem(TOKEN_KEY, user.token);
    return user;
}

export async function restoreSession(): Promise<Omit<AuthenticatedUser, 'token'> | null> {
    if (!sessionStorage.getItem(TOKEN_KEY)) {
        return null;
    }
    return request<Omit<AuthenticatedUser, 'token'>>('/auth/me');
}

export async function signOut(): Promise<void> {
    try {
        await request<ApiMessage>('/auth/logout', { method: 'POST' });
    } finally {
        sessionStorage.removeItem(TOKEN_KEY);
    }
}

export async function changePassword(password: string, confirmation: string): Promise<void> {
    await request<ApiMessage>('/auth/change-password', {
        method: 'POST',
        values: { password, confirmation },
    });
}

export function listProfessionals(): Promise<Professional[]> {
    return request('/profesionales');
}

export async function createProfessional(values: { document: string; email: string; phone: string }): Promise<void> {
    await request<ApiMessage>('/profesionales', { method: 'POST', values: { ...values, email: normalizeEmail(values.email) } });
}

export async function updateProfessional(document: string, values: { name: string; email: string; phone: string }): Promise<void> {
    await request<ApiMessage>(`/profesionales/${encodeURIComponent(document)}`, {
        method: 'PUT',
        values: { ...values, email: normalizeEmail(values.email) },
    });
}

export async function linkProfessional(document: string, email: string): Promise<void> {
    await request<ApiMessage>(`/profesionales/${encodeURIComponent(document)}/cuenta`, {
        method: 'PATCH',
        values: { email: normalizeEmail(email) },
    });
}

export async function setProfessionalStatus(document: string, active: boolean): Promise<void> {
    await request<ApiMessage>(`/profesionales/${encodeURIComponent(document)}/estado`, {
        method: 'PATCH',
        values: { active },
    });
}

export async function deleteProfessional(document: string): Promise<void> {
    await request<ApiMessage>(`/profesionales/${encodeURIComponent(document)}`, { method: 'DELETE' });
}

export async function deleteProfessionalAccount(email: string): Promise<void> {
    await request<ApiMessage>(`/profesionales/cuenta/${encodeURIComponent(normalizeEmail(email))}`, {
        method: 'DELETE',
    });
}

export function listUsers(): Promise<UserAccount[]> {
    return request('/usuarios');
}

export async function createUser(values: { name: string; email: string; password: string; role: AccountRole }): Promise<void> {
    await request<ApiMessage>('/usuarios', { method: 'POST', values: { ...values, email: normalizeEmail(values.email) } });
}

export async function updateUser(email: string, values: { name: string; email: string }): Promise<void> {
    await request<ApiMessage>(`/usuarios/${encodeURIComponent(normalizeEmail(email))}`, {
        method: 'PUT',
        values: { ...values, email: normalizeEmail(values.email) },
    });
}

export async function setUserRole(email: string, role: AccountRole): Promise<void> {
    await request<ApiMessage>(`/usuarios/${encodeURIComponent(email)}/rol`, { method: 'PATCH', values: { role } });
}

export async function setUserStatus(email: string, active: boolean): Promise<void> {
    await request<ApiMessage>(`/usuarios/${encodeURIComponent(email)}/estado`, {
        method: 'PATCH',
        values: { active },
    });
}

export async function deleteUser(email: string): Promise<void> {
    await request<ApiMessage>(`/usuarios/${encodeURIComponent(email)}`, { method: 'DELETE' });
}
