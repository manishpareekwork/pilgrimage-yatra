"use client";

import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import React, { useEffect, useMemo, useState } from "react";
import { FormSection } from "@/components/ui";

type UploadKind = "photo" | "form";

type Props = {
  registrationId: string;
  initialPhotoPath?: string | null;
  initialFormPath?: string | null;
  orchestratorUrl?: string;
};

type UploadState = {
  uploading: boolean;
  error: string | null;
  photoPath: string | null;
  formPath: string | null;
  photoPreview: string | null;
  formPreview: string | null;
};

const MAX_OBJECT_LENGTH = 512;

export function UploadControls({
  registrationId,
  initialPhotoPath,
  initialFormPath,
  orchestratorUrl,
}: Props) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [state, setState] = useState<UploadState>({
    uploading: false,
    error: null,
    photoPath: initialPhotoPath || null,
    formPath: initialFormPath || null,
    photoPreview: null,
    formPreview: null,
  });

  const hasOrchestrator = Boolean(orchestratorUrl);

  useEffect(() => {
    const loadPreview = async (path: string | null, kind: UploadKind) => {
      if (!path || !orchestratorUrl) return;
      try {
        const url = await signUrl("download", path.startsWith("photos/") ? "photos" : "forms", path);
        setState((prev) => ({
          ...prev,
          [`${kind}Preview`]: url,
        }) as UploadState);
      } catch {
        // ignore preview failure
      }
    };
    void loadPreview(state.photoPath, "photo");
    void loadPreview(state.formPath, "form");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestratorUrl]);

  const signUrl = async (action: "upload" | "download", bucket: "forms" | "photos", object: string) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      throw new Error("Not authenticated");
    }
    const res = await fetch(`${orchestratorUrl}/sign-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        object,
        action,
        expiresIn: 600,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || "Failed to get signed URL");
    }
    const json = await res.json();
    return json.signedUrl as string;
  };

  const buildPath = (kind: UploadKind) =>
    kind === "photo"
      ? `photos/registrations/${registrationId}/photo.jpg`
      : `forms/registrations/${registrationId}/form.jpg`;

  const handleUpload = async (kind: UploadKind, file: File) => {
    if (!hasOrchestrator) {
      setState((prev) => ({ ...prev, error: "Orchestrator URL not configured." }));
      return;
    }

    const bucket = kind === "photo" ? "photos" : "forms";
    const object = buildPath(kind);

    setState((prev) => ({ ...prev, uploading: true, error: null }));

    try {
      const uploadUrl = await signUrl("upload", bucket, object);
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) {
        throw new Error("Upload failed");
      }

      const prevPath = kind === "photo" ? state.photoPath : state.formPath;

      const column = kind === "photo" ? "photo_url" : "form_image_url";
      const { error } = await supabase.rpc("fn_update_registration", {
        p_id: registrationId,
        p_patch: { [column]: object },
      });
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      const actor = session.session?.user.id;
      if (actor) {
        await supabase.rpc("fn_create_review", {
          p_registration_id: registrationId,
          p_action: "edit",
          p_diff: { event: `${kind}_upload`, prev: prevPath, next: object },
          p_actor: actor,
        });
      }

      const downloadUrl = await signUrl("download", bucket, object);

      setState((prev) => ({
        ...prev,
        uploading: false,
        [`${kind}Path`]: object,
        [`${kind}Preview`]: downloadUrl,
      }) as UploadState);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: err instanceof Error ? err.message : "Upload failed",
      }));
    }
  };

  const onFileChange = (kind: UploadKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(kind, file);
    e.target.value = "";
  };

  const renderCard = (kind: UploadKind, label: string) => {
    const pathKey = `${kind}Path` as const;
    const previewKey = `${kind}Preview` as const;
    const path = state[pathKey];
    const preview = state[previewKey];
    const accent = kind === "photo" ? "bg-indigo-500" : "bg-amber-500";

    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">
              {label}
            </p>
            <p className="text-sm text-slate-400">
              Private bucket ({kind === "photo" ? "photos" : "forms"}). Signed URL upload.
            </p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="file"
              accept={kind === "photo" ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf"}
              className="hidden"
              onChange={onFileChange(kind)}
              disabled={state.uploading || !hasOrchestrator}
            />
            <span
              className={`px-3 py-2 rounded-xl text-sm font-semibold text-white ${accent} hover:opacity-90 cursor-pointer flex items-center gap-2`}
            >
              {state.uploading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload"
              )}
            </span>
          </label>
        </div>
        <div className="text-xs text-slate-500 mb-2">
          Associated with Registration ID: <span className="font-mono text-slate-200">{registrationId}</span>
        </div>
        {preview ? (
          <div className="rounded-lg overflow-hidden border border-slate-800/60">
            <img src={preview} alt={`${label} preview`} className="w-full max-h-56 object-cover" />
          </div>
        ) : path ? (
          <div className="text-sm text-slate-300">
            Uploaded: <code className="text-xs text-slate-400">{path}</code>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No file uploaded yet.</div>
        )}
      </div>
    );
  };

  return (
    <FormSection title="Uploads" description="Photo + form image uploads.">
      <div className="space-y-4">
        {!hasOrchestrator && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.
          </div>
        )}
        {state.error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {state.error}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {renderCard("photo", "Upload Photo")}
          {renderCard("form", "Upload Form Image")}
        </div>
      </div>
    </FormSection>
  );
}
