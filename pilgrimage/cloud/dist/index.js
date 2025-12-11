import express from 'express';
import { createClient } from '@supabase/supabase-js';
const app = express();
app.use(express.json());
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
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
app.post('/sign-url', (req, res) => {
    const { bucket, object, expires } = req.body ?? {};
    if (!bucket || !object) {
        return res.status(422).json({ error: 'bucket and object are required' });
    }
    const expiresInSeconds = typeof expires === 'number' && expires > 0 ? expires : 3600;
    const fakeUrl = `https://example.com/fake-signed-url?bucket=${encodeURIComponent(bucket)}&object=${encodeURIComponent(object)}&expires=${expiresInSeconds}`;
    res.json({ url: fakeUrl });
});
// Create registration via service role (for server-to-server calls)
app.post('/registrations', async (req, res) => {
    if (!requireSupabase(res))
        return;
    const { owner, created_by, name_hi, father_name_hi, address_hi, phone, whatsapp, travel_mode, train_class, health_bp, health_diabetes, emergency_contact_name, emergency_contact_phone, form_image_url, status, } = req.body || {};
    if (!owner || !created_by || !name_hi) {
        return res.status(400).json({ error: 'owner, created_by, and name_hi are required' });
    }
    const { data, error } = await supabase
        .from('yatra_registrations')
        .insert({
        owner,
        created_by,
        name_hi,
        father_name_hi,
        address_hi,
        phone,
        whatsapp,
        travel_mode,
        train_class,
        health_bp,
        health_diabetes,
        emergency_contact_name,
        emergency_contact_phone,
        form_image_url,
        status: status ?? 'submitted',
    })
        .select('id')
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.json({ id: data?.id, status: status ?? 'submitted' });
});
// Stub: process form (mock OCR)
app.post('/process-form', async (req, res) => {
    if (!requireSupabase(res))
        return;
    const { storagePath, owner, created_by } = req.body || {};
    if (!storagePath || !owner || !created_by) {
        return res.status(400).json({ error: 'storagePath, owner, and created_by are required' });
    }
    // Mock extracted data
    const payload = {
        owner,
        created_by,
        name_hi: 'राम कुमार',
        address_hi: 'पुरी, ओडिशा',
        phone: '+919812345678',
        travel_mode: 'train',
        form_image_url: storagePath,
        status: 'needs_review',
    };
    const { data, error } = await supabase
        .from('yatra_registrations')
        .insert(payload)
        .select('id, status')
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    res.json({
        id: data?.id,
        status: data?.status,
        extracted: payload,
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
