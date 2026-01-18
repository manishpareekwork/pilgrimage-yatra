"use client";

import { useGlobalLoading } from "@/components/GlobalLoading";
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

export function UploadControls({
  registrationId,
  initialPhotoPath,
  initialFormPath,
  orchestratorUrl,
}: Props) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { startLoading } = useGlobalLoading();
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
    const stopLoading = startLoading(kind === "photo" ? "Uploading photo..." : "Uploading form...");

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
    } finally {
      stopLoading();
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
    const isImage =
      Boolean(preview) && (kind === "photo" || Boolean(path && /\.(png|jpe?g)$/i.test(path)));
    const isDisabled = state.uploading || !hasOrchestrator;

    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
            {isImage && preview ? (
              <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
            ) : (
              <svg viewBox="0 0 20 20" className="h-6 w-6 text-[color:var(--muted)]" aria-hidden="true">
                <path
                  d="M3 5.5h14v9H3z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="9" r="1.2" fill="currentColor" />
                <path
                  d="M4.5 13l3-2.5 2.5 2 3-3 2.5 2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[color:var(--ink)]">{label}</div>
            <div className="text-xs text-[color:var(--muted)]">
              Private bucket ({kind === "photo" ? "photos" : "forms"}). Signed URL upload.
            </div>
          </div>
          <label
            className={`btn-secondary inline-flex min-h-[32px] items-center text-[12px] ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="file"
              accept={kind === "photo" ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf"}
              className="sr-only"
              onChange={onFileChange(kind)}
              disabled={isDisabled}
            />
            {state.uploading ? "Uploading..." : "Upload"}
          </label>
        </div>
        <div className="mt-2 text-[11px] text-[color:var(--subtle)]">
          {path ? (
            <span className="truncate">
              Stored: <span className="font-mono">{path}</span>
            </span>
          ) : (
            "No file uploaded yet."
          )}
        </div>
      </div>
    );
  };

  return (
    <FormSection title="Uploads" description="Photo + form image uploads." className="yatri-detail-section">
      <div className="space-y-4">
        {!hasOrchestrator && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
            Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.
          </div>
        )}
        {state.error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-200">
            {state.error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {renderCard("photo", "Photo")}
          {renderCard("form", "Form Image")}
        </div>
      </div>
    </FormSection>
  );
}
