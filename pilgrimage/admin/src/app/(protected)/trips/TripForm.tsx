"use client";

import { useState } from "react";
import { Field, FormSection, Select, TextInput } from "@/components/ui";
import { FormStatusOverlay } from "@/components/GlobalLoading";

type TripFormProps = {
  action: (formData: FormData) => void;
};

export function TripForm({ action }: TripFormProps) {
  const [mode, setMode] = useState<"train" | "air">("train");

  return (
    <FormSection title="Create trip" description="Set up a travel leg for train or flight.">
      <form action={action} className="space-y-6">
        <FormStatusOverlay message="Creating trip..." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mode" htmlFor="mode" required>
            <Select
              id="mode"
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as "train" | "air")}
              required
            >
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field label="Trip name" htmlFor="trip_name" required>
            <TextInput id="trip_name" name="trip_name" required placeholder="e.g., Delhi to Haridwar" />
          </Field>
          <Field label="Journey date" htmlFor="journey_date" required>
            <TextInput id="journey_date" name="journey_date" type="date" required />
          </Field>
          <Field label="Depart at" htmlFor="depart_at">
            <TextInput id="depart_at" name="depart_at" type="datetime-local" />
          </Field>
          <Field label="Arrive at" htmlFor="arrive_at">
            <TextInput id="arrive_at" name="arrive_at" type="datetime-local" />
          </Field>
        </div>

        {mode === "train" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Train number" htmlFor="train_no" required>
              <TextInput id="train_no" name="train_no" required placeholder="e.g., 12345" />
            </Field>
            <Field label="Train name" htmlFor="train_name">
              <TextInput id="train_name" name="train_name" placeholder="Train name" />
            </Field>
            <Field label="From station code" htmlFor="from_station_code" required>
              <TextInput id="from_station_code" name="from_station_code" required placeholder="e.g., NDLS" />
            </Field>
            <Field label="To station code" htmlFor="to_station_code" required>
              <TextInput id="to_station_code" name="to_station_code" required placeholder="e.g., HW" />
            </Field>
            <Field label="From station name" htmlFor="from_station_name">
              <TextInput id="from_station_name" name="from_station_name" placeholder="Station name" />
            </Field>
            <Field label="To station name" htmlFor="to_station_name">
              <TextInput id="to_station_name" name="to_station_name" placeholder="Station name" />
            </Field>
            <Field label="Default class code" htmlFor="default_class_code">
              <TextInput id="default_class_code" name="default_class_code" placeholder="e.g., SL" />
            </Field>
            <Field label="Quota code" htmlFor="quota_code">
              <TextInput id="quota_code" name="quota_code" placeholder="e.g., GN" />
            </Field>
          </div>
        )}

        {mode === "air" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Airline code" htmlFor="airline_code">
              <TextInput id="airline_code" name="airline_code" placeholder="e.g., AI" />
            </Field>
            <Field label="Flight number" htmlFor="flight_no" required>
              <TextInput id="flight_no" name="flight_no" required placeholder="e.g., AI401" />
            </Field>
            <Field label="From airport code" htmlFor="from_airport_code" required>
              <TextInput id="from_airport_code" name="from_airport_code" required placeholder="e.g., DEL" />
            </Field>
            <Field label="To airport code" htmlFor="to_airport_code" required>
              <TextInput id="to_airport_code" name="to_airport_code" required placeholder="e.g., DED" />
            </Field>
          </div>
        )}

        <button type="submit" className="btn-primary">Create trip</button>
      </form>
    </FormSection>
  );
}
