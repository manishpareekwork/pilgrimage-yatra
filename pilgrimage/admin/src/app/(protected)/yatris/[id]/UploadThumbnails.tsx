"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner } from "@/components/ui";

type Props = {
  registrationId: string;
  photoPath?: string | null;
  formPath?: string | null;
  orchestratorUrl?: string;
};

type PreviewState = {
  photo: string | null;
  form: string | null;
};

type PathState = {
  photo: string | null;
  form: string | null;
};

const isImageFile = (value?: string | null) => {
  if (!value) return false;
  const clean = value.split("?")[0];
  return /\.(png|jpe?g|webp|gif)$/i.test(clean);
};

export function UploadThumbnails({ registrationId, photoPath, formPath, orchestratorUrl }: Props) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [previews, setPreviews] = useState<PreviewState>({ photo: null, form: null });
  const [paths, setPaths] = useState<PathState>({
    photo: photoPath ?? null,
    form: formPath ?? null,
  });
  const [uploadingKind, setUploadingKind] = useState<"photo" | "form" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasOrchestrator = Boolean(orchestratorUrl);

  const signUrl = async (action: "upload" | "download", bucket: "forms" | "photos", object: string) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token || !orchestratorUrl) {
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

  useEffect(() => {
    setPaths({
      photo: photoPath ?? null,
      form: formPath ?? null,
    });
  }, [photoPath, formPath]);

  useEffect(() => {
    let isActive = true;
    const resolvePreview = async (kind: "photo" | "form", path?: string | null) => {
      if (!path) return;
      if (path.startsWith("http")) {
        if (isActive) {
          setPreviews((prev) => ({ ...prev, [kind]: path }));
        }
        return;
      }
      if (!orchestratorUrl) return;
      const bucket = path.startsWith("photos/") ? "photos" : "forms";
      try {
        const signedUrl = await signUrl("download", bucket, path);
        if (!isActive) return;
        setPreviews((prev) => ({ ...prev, [kind]: signedUrl }));
      } catch {
        // ignore preview failures
      }
    };

    void resolvePreview("photo", paths.photo);
    void resolvePreview("form", paths.form);

    return () => {
      isActive = false;
    };
  }, [paths, orchestratorUrl]);

  const buildUploadPath = (kind: "photo" | "form") =>
    kind === "photo"
      ? `photos/registrations/${registrationId}/photo.jpg`
      : `forms/registrations/${registrationId}/form.jpg`;

  const handleUpload = async (kind: "photo" | "form", file: File) => {
    if (!hasOrchestrator) {
      setUploadError("Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.");
      return;
    }
    setUploadingKind(kind);
    setUploadError(null);
    const bucket = kind === "photo" ? "photos" : "forms";
    const object = buildUploadPath(kind);

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
          p_diff: { event: `${kind}_upload`, next: object },
          p_actor: actor,
        });
      }

      const downloadUrl = await signUrl("download", bucket, object);
      setPaths((prev) => ({ ...prev, [kind]: object }));
      setPreviews((prev) => ({ ...prev, [kind]: downloadUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKind(null);
    }
  };

  const onFileChange = (kind: "photo" | "form") => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(kind, file);
    event.target.value = "";
  };

  const items: Array<{
    key: "photo" | "form";
    label: string;
    path: string | null;
    preview: string | null;
    accept: string;
  }> = [
    {
      key: "photo",
      label: "Photo",
      path: paths.photo,
      preview: previews.photo,
      accept: "image/jpeg,image/png,image/webp",
    },
    {
      key: "form",
      label: "Form",
      path: paths.form,
      preview: previews.form,
      accept: "image/jpeg,image/png,image/webp,application/pdf",
    },
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => {
          const isUploading = uploadingKind === item.key;
          const isDisabled = isUploading || uploadingKind !== null;
          const previewUrl = item.preview || (item.path?.startsWith("http") ? item.path : null);
          const showImage = isImageFile(item.path) || isImageFile(previewUrl);
          return (
            <label
              key={item.key}
              className={`upload-thumb ${isDisabled ? "upload-thumb--disabled" : ""}`}
              title={hasOrchestrator ? `Upload ${item.label}` : "Uploads unavailable"}
            >
              {showImage && previewUrl ? (
                <img src={previewUrl} alt={`${item.label} thumbnail`} className="upload-thumb-image" />
              ) : (
                <div className="upload-thumb-placeholder" aria-label={`${item.label} placeholder`}>
                  {isUploading ? (
                    <>
                      <ChakraSpinner className="h-5 w-5" title="Uploading" />
                      <span>Uploading</span>
                    </>
                  ) : (
                    <>
                      <div className="relative flex items-center justify-center">
                        <ChakraSpinner
                          className="h-5 w-5 text-[color:var(--muted)]"
                          animate={false}
                          title="Add upload"
                        />
                        <svg viewBox="0 0 20 20" className="upload-thumb-plus absolute" aria-hidden="true">
                          <path
                            d="M10 4v12M4 10h12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <span>Add {item.label}</span>
                    </>
                  )}
                </div>
              )}
              <input
                type="file"
                accept={item.accept}
                className="sr-only"
                disabled={isDisabled}
                onChange={onFileChange(item.key)}
              />
            </label>
          );
        })}
      </div>
      {!hasOrchestrator && (
        <div className="text-xs text-amber-600">Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.</div>
      )}
      {uploadError && <div className="text-xs text-rose-500">{uploadError}</div>}
    </div>
  );
}
