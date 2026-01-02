import express from 'express';
import { createClient } from '@supabase/supabase-js';
const app = express();
app.use(express.json());
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
const toBool = (value) => value === true || value === 'true' || value === 1 || value === '1';
const toNullIfBlank = (value) => {
    if (value === undefined || value === null)
        return null;
    if (typeof value === 'string' && value.trim() === '')
        return null;
    return value;
};
function respondError(res, status, code, message, details) {
    return res.status(status).json({ error: { code, message, details } });
}
function extractRole(user) {
    const appMetaRole = user.app_metadata?.role;
    if (typeof appMetaRole === 'string') {
        return appMetaRole;
    }
    return undefined;
}
async function requireAuth(req, res, next) {
    if (!supabase) {
        return respondError(res, 503, 'service_unavailable', 'Supabase not configured');
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : undefined;
    if (!token) {
        return respondError(res, 401, 'unauthorized', 'Missing Bearer token');
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return respondError(res, 401, 'unauthorized', 'Invalid or expired token');
    }
    req.auth = {
        userId: data.user.id,
        role: extractRole(data.user),
        token,
    };
    return next();
}
function requireSupabase(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Supabase not configured' });
        return false;
    }
    return true;
}
app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
});
const VALID_BUCKETS = new Set(['forms', 'photos']);
const MAX_OBJECT_LENGTH = 512;
const DEFAULT_EXPIRES_SECONDS = 600;
function validateObjectPath(bucket, object) {
    if (object.startsWith('/')) {
        return 'object must not start with a slash';
    }
    if (object.includes('..')) {
        return 'object must not contain ".."';
    }
    if (object.length > MAX_OBJECT_LENGTH) {
        return `object must be <= ${MAX_OBJECT_LENGTH} characters`;
    }
    if (bucket === 'forms' && !object.startsWith('forms/')) {
        return 'forms bucket objects must start with "forms/"';
    }
    if (bucket === 'photos' && !object.startsWith('photos/')) {
        return 'photos bucket objects must start with "photos/"';
    }
    return undefined;
}
app.post('/sign-url', requireAuth, async (req, res) => {
    if (!supabase) {
        return respondError(res, 503, 'service_unavailable', 'Supabase not configured');
    }
    const { bucket, object, action = 'upload', expiresIn } = req.body ?? {};
    if (!bucket || !VALID_BUCKETS.has(bucket)) {
        return respondError(res, 422, 'invalid_request', 'bucket must be "forms" or "photos"');
    }
    if (!object || typeof object !== 'string') {
        return respondError(res, 422, 'invalid_request', 'object is required');
    }
    const objectError = validateObjectPath(bucket, object);
    if (objectError) {
        return respondError(res, 422, 'invalid_request', objectError);
    }
    if (action !== 'upload' && action !== 'download') {
        return respondError(res, 422, 'invalid_request', 'action must be "upload" or "download"');
    }
    const expiresSeconds = typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0
        ? Math.floor(expiresIn)
        : DEFAULT_EXPIRES_SECONDS;
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000).toISOString();
    try {
        if (action === 'upload') {
            const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(object, { upsert: true });
            if (error || !data?.signedUrl) {
                return respondError(res, 500, 'sign_url_error', 'Failed to create signed upload URL', error?.message);
            }
            return res.json({ signedUrl: data.signedUrl, bucket, object, action, expiresAt });
        }
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(object, expiresSeconds);
        if (error || !data?.signedUrl) {
            return respondError(res, 500, 'sign_url_error', 'Failed to create signed download URL', error?.message);
        }
        return res.json({ signedUrl: data.signedUrl, bucket, object, action, expiresAt });
    }
    catch (err) {
        return respondError(res, 500, 'sign_url_error', 'Failed to create signed URL', err);
    }
});
// Create registration via service role (for server-to-server calls)
app.post('/registrations', async (req, res) => {
    if (!requireSupabase(res))
        return;
    const body = req.body || {};
    const { owner, created_by, name_hi, address_hi, phone } = body;
    if (!owner || !created_by || !name_hi || !address_hi || !phone) {
        return res.status(400).json({ error: 'owner, created_by, name_hi, address_hi, and phone are required' });
    }
    if (body.declaration_accepted !== true) {
        return res.status(400).json({ error: 'declaration_accepted must be true' });
    }
    const signedAt = (typeof body.declaration_signed_at === 'string' && body.declaration_signed_at) || new Date().toISOString();
    const { data: newId, error: createError } = await supabase.rpc('fn_create_registration', {
        p_owner: owner,
        p_created_by: created_by,
        p_name_hi: name_hi,
        p_address_hi: address_hi,
        p_phone: phone,
        p_declaration_accepted: true,
        p_declaration_signed_at: signedAt,
    });
    if (createError || !newId) {
        return res.status(400).json({ error: createError?.message || 'Failed to create registration' });
    }
    const healthHeart = toBool(body.health_heart);
    const healthBp = toBool(body.health_bp);
    const healthDiabetes = toBool(body.health_diabetes);
    const healthAsthma = toBool(body.health_asthma);
    const healthOther = toNullIfBlank(body.health_other);
    const status = body.status ?? 'submitted';
    const patch = {
        receipt_no: toNullIfBlank(body.receipt_no),
        father_name_hi: toNullIfBlank(body.father_name_hi),
        aadhaar_no: toNullIfBlank(body.aadhaar_no),
        address_hi,
        phone,
        whatsapp: toNullIfBlank(body.whatsapp),
        dob: toNullIfBlank(body.dob),
        age_years: toNullIfBlank(body.age_years),
        height_cm: toNullIfBlank(body.height_cm),
        weight_kg: toNullIfBlank(body.weight_kg),
        travel_mode: toNullIfBlank(body.travel_mode),
        train_class: toNullIfBlank(body.train_class),
        reservation_by: toNullIfBlank(body.reservation_by),
        health_heart: healthHeart,
        health_heart_meds: healthHeart ? toNullIfBlank(body.health_heart_meds) : null,
        health_bp: healthBp,
        health_bp_meds: healthBp ? toNullIfBlank(body.health_bp_meds) : null,
        health_diabetes: healthDiabetes,
        health_diabetes_meds: healthDiabetes ? toNullIfBlank(body.health_diabetes_meds) : null,
        health_asthma: healthAsthma,
        health_asthma_meds: healthAsthma ? toNullIfBlank(body.health_asthma_meds) : null,
        health_other: healthOther,
        health_other_meds: healthOther ? toNullIfBlank(body.health_other_meds) : null,
        emergency_contact_name: toNullIfBlank(body.emergency_contact_name),
        emergency_contact_father_name: toNullIfBlank(body.emergency_contact_father_name),
        emergency_contact_age_years: toNullIfBlank(body.emergency_contact_age_years),
        emergency_contact_address: toNullIfBlank(body.emergency_contact_address),
        emergency_contact_phone: toNullIfBlank(body.emergency_contact_phone),
        photo_url: toNullIfBlank(body.photo_url),
        form_image_url: toNullIfBlank(body.form_image_url),
        attended_badarinath_2024: toBool(body.attended_badarinath_2024),
        sadhu_sant_category: toBool(body.sadhu_sant_category),
        declaration_accepted: true,
        declaration_signed_at: signedAt,
        status,
    };
    const { error: updateError } = await supabase.rpc('fn_update_registration', {
        p_id: newId,
        p_patch: patch,
    });
    if (updateError) {
        return res.status(400).json({ error: updateError.message, id: newId });
    }
    return res.json({ id: newId, status });
});
// Stub: process form (mock OCR)
app.post('/process-form', async (req, res) => {
    if (!requireSupabase(res))
        return;
    const { storagePath, owner, created_by, registrationId } = req.body || {};
    if (!storagePath) {
        return res.status(400).json({ error: 'storagePath is required' });
    }
    const extractedAt = new Date().toISOString();
    const mockMedical = {
        heart: { flag: false, meds: null },
        bp: { flag: true, meds: 'Amlodipine' },
        diabetes: { flag: true, meds: 'Metformin' },
        asthma: { flag: false, meds: null },
        other: { flag: true, condition: 'Allergy', meds: 'Cetirizine' },
    };
    const mockPatch = {
        receipt_no: 'R-MOCK-001',
        name_hi: 'राम कुमार',
        father_name_hi: 'शिव प्रसाद',
        address_hi: 'पुरी, ओडिशा',
        aadhaar_no: '123456789012',
        phone: '+919812345678',
        whatsapp: '+919812345678',
        dob: '1985-01-01',
        age_years: 40,
        height_cm: 170.2,
        weight_kg: 68.5,
        travel_mode: 'train',
        train_class: 'III AC',
        reservation_by: 'committee',
        health_heart: mockMedical.heart.flag,
        health_heart_meds: mockMedical.heart.meds,
        health_bp: mockMedical.bp.flag,
        health_bp_meds: mockMedical.bp.meds,
        health_diabetes: mockMedical.diabetes.flag,
        health_diabetes_meds: mockMedical.diabetes.meds,
        health_asthma: mockMedical.asthma.flag,
        health_asthma_meds: mockMedical.asthma.meds,
        health_other: mockMedical.other.condition,
        health_other_meds: mockMedical.other.meds,
        emergency_contact_name: 'मोहन',
        emergency_contact_father_name: 'शिव',
        emergency_contact_age_years: 42,
        emergency_contact_address: 'कटक, ओडिशा',
        emergency_contact_phone: '+919800000001',
        form_image_url: storagePath,
        attended_badarinath_2024: true,
        sadhu_sant_category: false,
        declaration_accepted: true,
        declaration_signed_at: extractedAt,
        status: 'needs_review',
    };
    const rawJson = {
        source: 'mock-ocr',
        extracted_at: extractedAt,
        medical: mockMedical,
        travel: { mode: mockPatch.travel_mode, reservation_by: mockPatch.reservation_by },
        emergency: {
            name: mockPatch.emergency_contact_name,
            father_name: mockPatch.emergency_contact_father_name,
            age_years: mockPatch.emergency_contact_age_years,
            address: mockPatch.emergency_contact_address,
            phone: mockPatch.emergency_contact_phone,
        },
        additional: {
            attended_badarinath_2024: mockPatch.attended_badarinath_2024,
            sadhu_sant_category: mockPatch.sadhu_sant_category,
        },
    };
    let targetId = registrationId;
    if (!targetId) {
        if (!owner || !created_by) {
            return res.status(400).json({ error: 'owner and created_by are required when creating a new registration' });
        }
        const { data: newId, error: createError } = await supabase.rpc('fn_create_registration', {
            p_owner: owner,
            p_created_by: created_by,
            p_name_hi: mockPatch.name_hi,
            p_address_hi: mockPatch.address_hi,
            p_phone: mockPatch.phone,
            p_declaration_accepted: true,
            p_declaration_signed_at: mockPatch.declaration_signed_at,
        });
        if (createError || !newId) {
            return res.status(400).json({ error: createError?.message || 'Failed to create registration' });
        }
        targetId = newId;
    }
    const { error: updateError } = await supabase.rpc('fn_update_registration', {
        p_id: targetId,
        p_patch: { ...mockPatch, raw_json: rawJson },
    });
    if (updateError) {
        return res.status(400).json({ error: updateError.message });
    }
    res.json({
        id: targetId,
        status: mockPatch.status,
        extracted: mockPatch,
        raw_json: rawJson,
    });
});
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
    console.log(`API Middleware listening on port ${port}`);
});
