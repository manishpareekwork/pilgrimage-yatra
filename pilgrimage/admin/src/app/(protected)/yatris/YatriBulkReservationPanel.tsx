"use client";

import { useState, useTransition } from "react";
import { Field, Select, TextInput } from "@/components/ui";
import { TRAIN_CLASS_OPTIONS } from "@/lib/trainClasses";
import {
  bulkUpdateYatriReservations,
  type BulkReservationInput,
} from "./bulkReservationAction";

type Props = {
  selectedIds: string[];
  onDone: () => void;
  onClearSelection: () => void;
};

export function YatriBulkReservationPanel({ selectedIds, onDone, onClearSelection }: Props) {
  const [travelMode, setTravelMode] = useState<BulkReservationInput["travel_mode"]>("");
  const [trainClass, setTrainClass] = useState("");
  const [reservationBy, setReservationBy] = useState<BulkReservationInput["reservation_by"]>("");
  const [sourceSheet, setSourceSheet] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyPresetCommitteeTrain = () => {
    setTravelMode("train");
    setReservationBy("committee");
    setTrainClass(TRAIN_CLASS_OPTIONS[2] ?? "");
  };

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await bulkUpdateYatriReservations({
        ids: selectedIds,
        travel_mode: travelMode,
        train_class: travelMode === "train" ? trainClass : "",
        reservation_by: reservationBy,
        source_sheet: sourceSheet,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Updated ${result.updated} yatri(s).`);
      onDone();
    });
  };

  return (
    <div className="bulk-reservation card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--ink)]">Bulk reservation details</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {selectedIds.length} selected — only filled fields are written. Use for committee train / import
            sheets (SFS-1, etc.).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={applyPresetCommitteeTrain}>
            Preset: committee train
          </button>
          <button type="button" className="btn-secondary" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Travel mode" htmlFor="bulk_travel_mode">
          <Select
            id="bulk_travel_mode"
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value as BulkReservationInput["travel_mode"])}
          >
            <option value="">— leave unchanged —</option>
            <option value="train">Train</option>
            <option value="air">Air</option>
          </Select>
        </Field>
        <Field label="Reservation by" htmlFor="bulk_reservation_by">
          <Select
            id="bulk_reservation_by"
            value={reservationBy}
            onChange={(e) =>
              setReservationBy(e.target.value as BulkReservationInput["reservation_by"])
            }
          >
            <option value="">— leave unchanged —</option>
            <option value="committee">Committee (CM257)</option>
            <option value="self">Self</option>
          </Select>
        </Field>
        <Field
          label="Train class"
          htmlFor="bulk_train_class"
          helperText={travelMode !== "train" ? "Set travel mode to Train to apply class" : undefined}
        >
          <Select
            id="bulk_train_class"
            value={trainClass}
            disabled={travelMode !== "train"}
            onChange={(e) => setTrainClass(e.target.value)}
          >
            <option value="">— leave unchanged —</option>
            {TRAIN_CLASS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Import sheet / bucket" htmlFor="bulk_source_sheet">
          <TextInput
            id="bulk_source_sheet"
            value={sourceSheet}
            onChange={(e) => setSourceSheet(e.target.value)}
            placeholder="e.g. SFS-1 (optional)"
          />
        </Field>
      </div>

      {message && (
        <p
          className={`text-sm ${message.startsWith("Updated") ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500"}`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : `Apply to ${selectedIds.length} yatri(s)`}
        </button>
      </div>
    </div>
  );
}
