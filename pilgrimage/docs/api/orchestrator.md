# Orchestrator API (Cloud)

Base URL (local): `http://localhost:8080`  
Base URL (prod Render): `https://pilgrimage-yatra.onrender.com`

Buckets `forms` and `photos` are **private**. Only the orchestrator uses the service role; clients send Supabase access tokens.

## Environment (server)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (do not expose to web/mobile)
- `SUPABASE_JWT_SECRET` (optional; for JWT verification if not using Supabase Auth introspection)
- `ALLOWED_ORIGINS` (comma-separated)
- `PORT` (optional, defaults to 8080)

## Health check
```bash
curl -X GET http://localhost:8080/healthz
```
Response: `{"ok":true}`

## Sign URL
`POST /sign-url`  
Auth: `Authorization: Bearer <Supabase access_token>`

```bash
ACCESS_TOKEN="ey..."
curl -X POST http://localhost:8080/sign-url \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "forms",
    "object": "forms/<user-id>/raw-form-<timestamp>.jpg",
    "action": "upload",
    "expiresIn": 600
  }'
```

Response:
```json
{
  "signedUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/forms/forms/<user-id>/raw-form-<timestamp>.jpg?...",
  "bucket": "forms",
  "object": "forms/<user-id>/raw-form-<timestamp>.jpg",
  "action": "upload",
  "expiresAt": "2025-12-20T07:12:34.000Z"
}
```

Validation:
- `bucket` must be `forms` or `photos`.
- `object` must not start with `/`, not contain `..`, length <= 512.
- Prefix rules: `forms/…` for forms bucket, `photos/…` for photos bucket.

### Uploading with the signed URL
```bash
SIGNED_URL="https://..."
curl -X PUT "$SIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --upload-file ./sample.jpg
```

### Downloading
Request a download URL:
```bash
curl -X POST http://localhost:8080/sign-url \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "photos",
    "object": "photos/user-123/thumb.jpg",
    "action": "download",
    "expiresIn": 300
  }'
```
Then fetch:
```bash
curl "$SIGNED_URL" -o ./downloaded.jpg
```
