"use client";

import { Field, Select } from "@/components/ui";
import type { ImportBucketOption } from "@/lib/importBuckets";

type Props = {
  buckets: ImportBucketOption[];
  value: string;
  onChange: (name: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
  showChips?: boolean;
  helperText?: string;
  emptyLabel?: string;
};

export function ImportBucketSelect({
  buckets,
  value,
  onChange,
  id = "import_bucket",
  label = "Import sheet / bucket",
  required,
  showChips = true,
  helperText = "Pick a sheet from your import buckets. Only yatris with Train + committee reservation go on the CM257.",
  emptyLabel = "— Select bucket —",
}: Props) {
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      helperText={helperText}
    >
      <div className="import-bucket-select">
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">{emptyLabel}</option>
          {buckets.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} — {b.cm257Ready} CM257-ready / {b.total} on sheet
            </option>
          ))}
        </Select>

        {showChips && buckets.length > 0 ? (
          <div className="import-bucket-select__chips" aria-label="Quick pick buckets">
            {buckets.map((b) => {
              const active = value === b.name;
              return (
                <button
                  key={b.name}
                  type="button"
                  className={`import-bucket-chip${active ? " import-bucket-chip--active" : ""}`}
                  onClick={() => onChange(b.name)}
                  title={`${b.cm257Ready} CM257-ready of ${b.total} on sheet`}
                >
                  <span className="import-bucket-chip__name">{b.name}</span>
                  <span className="import-bucket-chip__meta">{b.cm257Ready}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="import-bucket-select__empty text-sm text-[color:var(--muted)]">
            No import sheets yet. Assign{" "}
            <code className="text-xs">source_sheet</code> on the roster or add buckets under Masters.
          </p>
        )}
      </div>
    </Field>
  );
}
