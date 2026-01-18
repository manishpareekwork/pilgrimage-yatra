"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { PageHeader } from "@/components/ui";
import { UploadThumbnails } from "./UploadThumbnails";
import { QuickEditForm } from "./QuickEditForm";

type Registration = ComponentProps<typeof QuickEditForm>["registration"];

type Props = {
  registration: Registration;
  orchestratorUrl?: string;
  created?: boolean;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB");
};

export function YatriDetailClient({ registration, orchestratorUrl, created = false }: Props) {
  const [showRequiredOnly, setShowRequiredOnly] = useState(false);

  return (
    <div className="yatri-detail space-y-6">
      <div className="space-y-2">
        <div className="relative">
          <PageHeader
            className="relative z-30 overflow-visible yatris-hero yatri-detail-hero"
            title={registration.name_hi || "Registration"}
            actions={
              <div className="header-actions flex flex-wrap items-center gap-2">
                <button type="submit" form="quick-edit-form" className="btn-primary inline-flex items-center">
                  Save changes
                </button>
                <Link
                  href={`/print/id-cards?ids=${registration.id}`}
                  target="_blank"
                  className="btn-secondary inline-flex items-center"
                >
                  Print ID Card
                </Link>
                <Link href="/yatris" className="btn-secondary inline-flex items-center">
                  Back to list
                </Link>
              </div>
            }
          />
          <div className="detail-thumbs">
            <UploadThumbnails
              registrationId={registration.id}
              photoPath={registration.photo_url}
              formPath={registration.form_image_url}
              orchestratorUrl={orchestratorUrl}
            />
            <div className="flex min-w-[200px] flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--muted)] shadow-sm">
              <label className="flex items-center gap-2 text-xs font-semibold text-[color:var(--ink)]">
                <input
                  type="checkbox"
                  checked={showRequiredOnly}
                  onChange={(event) => setShowRequiredOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                />
                <span>Show required fields only</span>
              </label>
            </div>
          </div>
        </div>
        <div className="detail-meta flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
          <span className="detail-pill detail-pill--neutral">ID: {registration.id}</span>
          <span className="detail-pill detail-pill--neutral">Created: {formatDateTime(registration.created_at)}</span>
        </div>
      </div>

      {created && (
        <div className="card border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          Registration created.
        </div>
      )}

      <div className="space-y-6">
        <QuickEditForm
          registration={registration}
          formId="quick-edit-form"
          showRequiredOnly={showRequiredOnly}
        />
      </div>
    </div>
  );
}
