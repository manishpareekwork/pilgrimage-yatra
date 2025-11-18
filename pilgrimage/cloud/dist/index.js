import express from 'express';
const app = express();
app.use(express.json());
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
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
    console.log(`API Middleware listening on port ${port}`);
});
