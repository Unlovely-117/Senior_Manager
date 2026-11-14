import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { getMyProfessionalProfile, submitMyProfessionalProfile } from '../../application/managementService';
import { ApiValidationError } from '../../infrastructure/managementApi';
import type { ProfessionalSelfProfile } from '../../domain/models/management';

const emptyProfile: ProfessionalSelfProfile = {
    exists: false, name: '', document: '', email: '', phone: '', specialty: '', licenseNumber: '',
    education: '', experience: '', biography: '', verificationStatus: 'SIN_PRESENTAR', reviewNote: '',
};
const inputClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10';
const phonePattern = '[+]?[0-9]{7,15}';

/** Removes anything that is not a digit (dots, spaces or dashes typed while writing a cédula). */
export function sanitizeDigits(value: string): string {
    return value.replace(/[^\d]/g, '').slice(0, 15);
}

function normalizePhone(value: string): string {
    return value.replace(/\s+/g, '').slice(0, 16);
}

function statusText(status: ProfessionalSelfProfile['verificationStatus']): string {
    if (status === 'VERIFICADA') return 'Ficha verificada';
    if (status === 'PENDIENTE') return 'Pendiente de revisión';
    if (status === 'REQUIERE_CAMBIOS') return 'Necesita correcciones';
    return 'Aún no enviada';
}

export const ProfessionalProfilePage: FC = () => {
    const [profile, setProfile] = useState(emptyProfile);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const requestSeq = useRef(0);

    const reload = async () => {
        const requestId = ++requestSeq.current;
        setLoading(true);
        setError('');
        try { setProfile(await getMyProfessionalProfile()); }
        catch (cause) { if (requestId === requestSeq.current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar tu ficha profesional.'); }
        finally { if (requestId === requestSeq.current) setLoading(false); }
    };

    useEffect(() => {
        void reload();
        return () => { requestSeq.current += 1; }; // Ignore responses from superseded reloads.
    }, []);

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true); setError(''); setNotice(''); setFieldErrors({});
        try {
            await submitMyProfessionalProfile({
                document: sanitizeDigits(profile.document), phone: normalizePhone(profile.phone), specialty: profile.specialty.trim(),
                licenseNumber: profile.licenseNumber.trim(), education: profile.education.trim(),
                experience: profile.experience.trim(), biography: profile.biography.trim(),
            });
            setProfile(await getMyProfessionalProfile());
            setNotice('Ficha enviada. El administrador debe verificarla antes de que figure como aprobada.');
        } catch (cause) {
            if (cause instanceof ApiValidationError && Object.keys(cause.fieldErrors).length > 0) {
                setFieldErrors(cause.fieldErrors);
                setError(cause.message);
            } else {
                setError(cause instanceof Error ? cause.message : 'No se pudo enviar tu ficha.');
            }
        }
        finally { setSaving(false); }
    };

    const update = (field: keyof ProfessionalSelfProfile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
    const fieldError = (field: string): string | undefined => fieldErrors[field];
    const describedBy = (field: string) => fieldError(field) ? `${field}-profile-error` : undefined;
    const renderFieldError = (field: string) => {
        const message = fieldError(field);
        if (!message) return null;
        return <p id={`${field}-profile-error`} className="mt-1 text-xs font-medium text-red-700" role="alert">{message}</p>;
    };
    const statusStyle = profile.verificationStatus === 'VERIFICADA'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : profile.verificationStatus === 'REQUIERE_CAMBIOS'
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-cyan-200 bg-cyan-50 text-cyan-950';

    return (
        <section className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d7377]">Mi espacio profesional</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a36]">Mi ficha profesional</h1>
                <p className="mt-2 text-sm leading-6 text-gray-500">Completa tus datos profesionales y envíalos al administrador para su verificación.</p>
            </header>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
            {loading ? <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-600">Cargando ficha...</p> : <>
                <section className={`rounded-2xl border p-4 ${statusStyle}`} aria-live="polite">
                    <p className="font-semibold">Estado: {statusText(profile.verificationStatus)}</p>
                    <p className="mt-1 text-sm opacity-80">{profile.verificationStatus === 'VERIFICADA'
                        ? 'El administrador ya revisó y aprobó estos datos.'
                        : profile.verificationStatus === 'PENDIENTE'
                            ? 'Puedes actualizar la ficha; cada envío nuevo vuelve a quedar pendiente.'
                            : 'Completa los datos y vuelve a enviarlos para una nueva revisión.'}</p>
                    {profile.reviewNote && <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm"><strong>Nota del administrador:</strong> {profile.reviewNote}</p>}
                </section>
                <form onSubmit={(event) => void save(event)} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                    <section className="space-y-4" aria-labelledby="identity-heading">
                        <div><h2 id="identity-heading" className="text-lg font-bold text-[#102a36]">Identificación y contacto</h2><p className="mt-1 text-sm text-slate-500">El nombre y correo provienen de tu cuenta de acceso.</p></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-gray-600">Nombre completo<input className={inputClass} value={profile.name} readOnly /></label>
                            <label className="text-xs font-semibold text-gray-600">Correo de acceso<input className={inputClass} value={profile.email} readOnly /></label>
                            <label className="text-xs font-semibold text-gray-600">Cédula
                                <input required inputMode="numeric" pattern="[0-9]{5,15}" maxLength={15} aria-describedby={describedBy('document')} className={inputClass} value={profile.document} onChange={(event) => update('document', sanitizeDigits(event.target.value))} />
                                {renderFieldError('document')}
                            </label>
                            <label className="text-xs font-semibold text-gray-600">Teléfono
                                <input required inputMode="tel" type="tel" maxLength={16} pattern={phonePattern} aria-describedby={describedBy('phone')} className={inputClass} value={profile.phone} onChange={(event) => update('phone', normalizePhone(event.target.value))} />
                                {renderFieldError('phone')}
                            </label>
                        </div>
                    </section>
                    <section className="space-y-4 border-t border-gray-100 pt-5" aria-labelledby="credentials-heading">
                        <div><h2 id="credentials-heading" className="text-lg font-bold text-[#102a36]">Información profesional</h2><p className="mt-1 text-sm text-slate-500">Incluye datos que permitan al administrador validar tu perfil.</p></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-gray-600">Profesión o especialidad<input required maxLength={120} className={inputClass} value={profile.specialty} onChange={(event) => update('specialty', event.target.value)} placeholder="Ej.: Enfermería geriátrica" /></label>
                            <label className="text-xs font-semibold text-gray-600">Número de tarjeta o registro profesional<input required maxLength={100} className={inputClass} value={profile.licenseNumber} onChange={(event) => update('licenseNumber', event.target.value)} /></label>
                        </div>
                        <label className="block text-xs font-semibold text-gray-600">Formación académica
                            <textarea required maxLength={300} rows={2} className={inputClass} value={profile.education} onChange={(event) => update('education', event.target.value)} placeholder="Títulos, institución y año" />
                        </label>
                        <label className="block text-xs font-semibold text-gray-600">Experiencia relevante
                            <textarea maxLength={2000} rows={3} className={inputClass} value={profile.experience} onChange={(event) => update('experience', event.target.value)} placeholder="Experiencia relacionada con la atención de adultos mayores" />
                            <span className="mt-1 block text-right text-[11px] text-gray-400">{profile.experience.length}/2000</span>
                        </label>
                        <label className="block text-xs font-semibold text-gray-600">Presentación profesional
                            <textarea maxLength={2000} rows={3} className={inputClass} value={profile.biography} onChange={(event) => update('biography', event.target.value)} placeholder="Un breve resumen sobre tu perfil" />
                            <span className="mt-1 block text-right text-[11px] text-gray-400">{profile.biography.length}/2000</span>
                        </label>
                    </section>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                        <p className="max-w-xl text-xs leading-5 text-slate-500">Al enviar, el administrador podrá verificar los datos o solicitar correcciones. No ingreses información clínica de pacientes aquí.</p>
                        <button type="submit" disabled={saving} className="rounded-xl bg-[#0d7377] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">{saving ? 'Enviando...' : profile.exists ? 'Guardar y enviar a revisión' : 'Enviar ficha a revisión'}</button>
                    </div>
                </form>
            </>}
        </section>
    );
};
