import type { AccountRole, AuthenticatedUser, Patient, PatientAssignment, PatientAssignmentPage, PatientHistory, Professional, ProfessionalSelfProfile, RolePermission, UserAccount } from '../domain/models/management';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl
    ? configuredApiBaseUrl.replace(/\/$/, '')
    : import.meta.env.DEV
        ? '/api'
        : null;
const TOKEN_KEY = 'senior-manage-session-token';

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

interface ApiMessage {
    message?: string;
    error?: string;
}

export class ApiRequestError extends Error {
    constructor(public readonly status: number, message: string, public readonly outcomeUncertain = false) {
        super(message);
        this.name = 'ApiRequestError';
    }
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
    if (!API_BASE_URL) {
        throw new ApiRequestError(0, 'La aplicación no tiene configurada la URL de la API (VITE_API_URL).');
    }
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

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        // Keep the HTTP status available to callers even for an empty/non-JSON error response.
    }
    if (!response.ok) {
        if (response.status === 401 && token) {
            sessionStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new Event('senior-manage:session-expired'));
        }
        const errorPayload = payload !== null && typeof payload === 'object' ? payload as ApiMessage : {};
        throw new ApiRequestError(response.status, errorPayload.error ?? 'No fue posible completar la solicitud.');
    }
    if (payload === undefined || payload === null || typeof payload !== 'object') {
        throw new ApiRequestError(response.status, 'La API devolvió una respuesta vacía o inválida.', true);
    }
    return payload as T;
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

export function getMyProfessionalProfile(): Promise<ProfessionalSelfProfile> {
    return request('/mi-perfil-profesional');
}

export async function submitMyProfessionalProfile(values: Omit<ProfessionalSelfProfile, 'exists' | 'verificationStatus' | 'reviewNote' | 'name' | 'email'>): Promise<void> {
    await request<ApiMessage>('/mi-perfil-profesional', { method: 'PUT', values });
}

export async function reviewProfessionalProfile(document: string, status: 'VERIFICADA' | 'REQUIERE_CAMBIOS', note: string): Promise<void> {
    await request<ApiMessage>(`/profesionales/${encodeURIComponent(document)}/verificacion`, {
        method: 'PATCH', values: { status, note },
    });
}

export async function createProfessional(values: { document: string; email: string; phone: string; specialty: string; licenseNumber: string; education: string; experience: string; biography: string }): Promise<void> {
    await request<ApiMessage>('/profesionales', { method: 'POST', values: { ...values, email: normalizeEmail(values.email) } });
}

export async function updateProfessional(document: string, values: { name: string; email: string; phone: string; specialty: string; licenseNumber: string; education: string; experience: string; biography: string }): Promise<void> {
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

export async function setUserPassword(email: string, password: string): Promise<void> {
    await request<ApiMessage>(`/usuarios/${encodeURIComponent(normalizeEmail(email))}/password`, {
        method: 'PUT', values: { password },
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

export function listPatients(): Promise<Patient[]> { return request('/pacientes'); }
export function listHistoricalPatients(): Promise<Patient[]> { return request('/pacientes/historicos'); }
export function listPatientAssignments(patientId: string): Promise<PatientAssignment[]> {
    return request(`/pacientes/${encodeURIComponent(patientId)}/asignacion`);
}

export function listPatientAssignmentDirectory(filters: {
    page?: number;
    size?: number;
    patientStatus?: 'ACTIVO' | 'INACTIVO' | 'TODOS';
    assignmentStatus?: 'ACTIVA' | 'FINALIZADA' | 'SIN_ASIGNACION' | 'TODAS';
} = {}): Promise<PatientAssignmentPage> {
    const query = new URLSearchParams();
    query.set('page', String(filters.page ?? 0));
    query.set('size', String(filters.size ?? 25));
    query.set('patientStatus', filters.patientStatus ?? 'ACTIVO');
    query.set('assignmentStatus', filters.assignmentStatus ?? 'TODAS');
    return request<PatientAssignmentPage>(`/pacientes/asignaciones?${query.toString()}`);
}

export function listRolePermissions(role: AccountRole): Promise<RolePermission[]> {
    return request(`/permisos/${encodeURIComponent(role)}`);
}
export async function setProfessionalPermission(module: string, operation: string, allowed: boolean): Promise<void> {
    await request<ApiMessage>(`/permisos/professional/${encodeURIComponent(module)}/${encodeURIComponent(operation)}`, {
        method: 'PUT', values: { allowed },
    });
}
export function assignPatientProfessional(patientId: string, professionalEmail: string): Promise<PatientAssignment[]> {
    return request(`/pacientes/${encodeURIComponent(patientId)}/asignacion`, {
        method: 'PUT', values: { professionalEmail: normalizeEmail(professionalEmail) },
    });
}
export function endPatientAssignment(patientId: string): Promise<PatientAssignment[]> {
    return request(`/pacientes/${encodeURIComponent(patientId)}/asignacion`, { method: 'DELETE' });
}

export function createPatient(values: Omit<Patient, 'id' | 'active'>): Promise<Patient> {
    return request('/pacientes', { method: 'POST', values: patientForm(values) });
}
export function updatePatient(id: string, values: Omit<Patient, 'id' | 'active'>): Promise<Patient> {
    return request(`/pacientes/${encodeURIComponent(id)}`, { method: 'PUT', values: patientForm(values) });
}
export async function deactivatePatient(id: string): Promise<void> {
    await request<ApiMessage>(`/pacientes/${encodeURIComponent(id)}/estado`, { method: 'PATCH', values: {} });
}
export function listPatientHistory(id: string): Promise<PatientHistory[]> {
    return request(`/pacientes/${encodeURIComponent(id)}/antecedentes`);
}
export function createPatientHistory(id: string, values: Omit<PatientHistory, 'id' | 'patientId'>): Promise<PatientHistory> {
    return request(`/pacientes/${encodeURIComponent(id)}/antecedentes`, { method: 'POST', values });
}
export function updatePatientHistory(id: string, values: Omit<PatientHistory, 'id' | 'patientId'>): Promise<PatientHistory> {
    return request(`/antecedentes/${encodeURIComponent(id)}`, { method: 'PUT', values });
}

export interface ClinicalRecord { id: string; patientId: string; patientName: string; professionalId?: string; professionalName?: string; date: string; item: string; notes: string; }
export interface ExerciseCatalogItem { id: string; name: string; category: string; description: string; blocked: boolean; alerts: string[]; }
export interface ExercisePlan { id: string; patientId: string; patientName: string; exerciseId: string; exerciseName: string; category: string; frequency: string; sets: number | null; repetitions: number | null; durationMinutes: number | null; notes: string; date: string; }
export function listAppointments(): Promise<ClinicalRecord[]> { return request('/citas'); }
export function createAppointment(values: { patientId: string; professionalId?: string; date: string; item: string }): Promise<ApiMessage> {
    return request('/citas', { method: 'POST', values });
}
export function updateAppointment(id: string, values: { date?: string; item?: string; status?: string }): Promise<ApiMessage> {
    return request(`/citas/${encodeURIComponent(id)}`, { method: 'PUT', values });
}
export function listExerciseFollowUps(): Promise<ClinicalRecord[]> { return request('/ejercicios'); }
export function createExerciseFollowUp(values: { patientId: string; item: string; notes: string }): Promise<ApiMessage> {
    return request('/ejercicios', { method: 'POST', values });
}
export function listExerciseCatalog(patientId: string): Promise<ExerciseCatalogItem[]> {
    return request(`/ejercicios/catalogo/${encodeURIComponent(patientId)}`);
}
export function listExercisePlans(): Promise<ExercisePlan[]> { return request('/ejercicios/planes'); }
export function assignExercisePlan(values: { patientId: string; exerciseId: string; frequency: string; sets: string; repetitions: string; durationMinutes: string; notes: string }): Promise<ApiMessage> {
    return request('/ejercicios/planes', { method: 'POST', values });
}

function patientForm(values: Omit<Patient, 'id' | 'active'>): Record<string, string> {
    return {
        fullName: values.fullName,
        document: values.document,
        birthDate: values.birthDate ?? '',
        phone: values.phone ?? '',
        address: values.address ?? '',
        observations: values.observations ?? '',
    };
}
