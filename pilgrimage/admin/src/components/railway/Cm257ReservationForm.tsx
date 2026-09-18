import type { Cm257FormDraft } from "@/lib/railwayReservation/types";
import { IR_CLASS_CODES } from "@/lib/railwayReservation/mapRegistration";
import "./cm257-print.css";

export type Cm257Template = "a4" | "a5";

const ClassCheckbox = ({ code, selected }: { code: string; selected: boolean }) => (
  <span className="cm257-class-item">
    <span className={`cm257-box${selected ? " cm257-box--checked" : ""}`} aria-hidden />
    {code}
  </span>
);

const CheckItem = ({ label, checked }: { label: string; checked?: boolean }) => (
  <span className="cm257-check-item">
    <span className={`cm257-box${checked ? " cm257-box--checked" : ""}`} aria-hidden />
    <span>{label}</span>
  </span>
);

export function Cm257ReservationForm({
  draft,
  template = "a4",
  sheetClassName = "",
}: {
  draft: Cm257FormDraft;
  /** `a4` = full sheet; `a5` = platform slip 148×210 mm (native CSS, no image). */
  template?: Cm257Template;
  sheetClassName?: string;
}) {
  const { journey, passengers, applicant } = draft;
  const filledCount = passengers.filter((p) => p.nameOnTicket.trim()).length;
  const templateClass = template === "a5" ? "cm257-sheet--template-a5" : "cm257-sheet--template-a4";

  return (
    <article
      className={`cm257-sheet ${templateClass}${sheetClassName ? ` ${sheetClassName}` : ""}`}
      aria-label="Reservation Cancellation Requisition Form CM257"
    >
      {draft.formLabel ? <div className="cm257-form-label">{draft.formLabel}</div> : null}

      <header className="cm257-header">
        <div className="cm257-header__hindi">भारतीय रेल</div>
        <div className="cm257-header__english">INDIAN RAILWAYS</div>
        <div className="cm257-header__english cm257-header__title-line">
          RESERVATION / CANCELLATION REQUISITION FORM
        </div>
        <div className="cm257-header__subtitle">(To be filled in by the applicant in BLOCK LETTERS)</div>
        <div className="cm257-form-no">Form No. CM257</div>
      </header>

      <div className="cm257-body">
        <p className="cm257-block-hint">Journey details</p>

        <div className="cm257-row">
          <span className="cm257-label">Train No. &amp; Name</span>
          <span className="cm257-field cm257-field--lg">{journey.trainNoAndName}</span>
        </div>

        <div className="cm257-row">
          <span className="cm257-label">Date of Journey (DD/MM/YY)</span>
          <span className="cm257-field cm257-field--sm">{journey.journeyDate}</span>
          <span className="cm257-label">No. of berths / seats</span>
          <span className="cm257-field cm257-field--sm">{journey.berthCount || String(filledCount)}</span>
        </div>

        <div className="cm257-label">Class</div>
        <div className="cm257-classes" aria-label="Class of travel">
          {IR_CLASS_CODES.map((code) => (
            <ClassCheckbox key={code} code={code} selected={journey.classCode === code} />
          ))}
        </div>

        <div className="cm257-row">
          <span className="cm257-label">From (Station)</span>
          <span className="cm257-field">{journey.fromStation}</span>
          <span className="cm257-label">To (Station)</span>
          <span className="cm257-field">{journey.toStation}</span>
        </div>

        <div className="cm257-row">
          <span className="cm257-label">Boarding at (if different)</span>
          <span className="cm257-field">{journey.boardingStation}</span>
          <span className="cm257-label">Reservation upto</span>
          <span className="cm257-field">{journey.reservationUpto}</span>
        </div>

        <p className="cm257-section-title">Passenger details (maximum 6 per form)</p>

        <table className="cm257-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Name of passenger (BLOCK LETTERS)</th>
              <th>Sex</th>
              <th>Age</th>
              <th>Concession*</th>
              <th>Berth / seat preference</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((pax) => (
              <tr key={pax.serialNo}>
                <td className="cm257-center">{pax.serialNo}</td>
                <td className="cm257-pax-name">{pax.nameOnTicket}</td>
                <td className="cm257-center">{pax.sex}</td>
                <td className="cm257-center">{pax.age}</td>
                <td className="cm257-center">{pax.concession}</td>
                <td className="cm257-center">{pax.berthPreference}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="cm257-footnote">
          * Concession codes as per Railway rules. Age proof / ID may be required at the counter.
        </p>

        <p className="cm257-section-title">If choice of berth is NOT available</p>
        <div className="cm257-checklist">
          <CheckItem label="Travel without berth" />
          <CheckItem label="Any one lower berth" />
          <CheckItem label="All middle berths" />
          <CheckItem label="All upper berths" />
          <CheckItem label="All side lower berths" />
          <CheckItem label="Book if all berths in same coach not available" />
          <CheckItem label="No choice" checked={!draft.choiceIfBerthNotAvailable} />
        </div>

        <div className="cm257-row cm257-row--wrap">
          <span className="cm257-label">Vikalp scheme</span>
          <CheckItem label="Yes" checked={draft.vikalpOptIn === true} />
          <CheckItem label="No" checked={draft.vikalpOptIn === false} />
          <span className="cm257-label cm257-label--spaced">Meal (Rajdhani / Shatabdi / Duronto)</span>
          <span className="cm257-field cm257-field--md">{draft.mealPreference}</span>
        </div>

        <section className="cm257-applicant" aria-label="Applicant details">
          <p className="cm257-section-title cm257-section-title--flush">Applicant (contact person)</p>
          <div className="cm257-row">
            <span className="cm257-label">Name</span>
            <span className="cm257-field">{applicant.name}</span>
          </div>
          <div className="cm257-label">Full address</div>
          <div className="cm257-applicant-address">{applicant.address}</div>
          <div className="cm257-row cm257-row--tight">
            <span className="cm257-label">Telephone / Mobile</span>
            <span className="cm257-field">{applicant.phone}</span>
            <span className="cm257-label">Date</span>
            <span className="cm257-field cm257-field--sm">{applicant.date}</span>
            <span className="cm257-label">Signature</span>
            <span className="cm257-field cm257-field--lg" />
          </div>
        </section>

        <section className="cm257-office" aria-label="For office use only">
          <p className="cm257-office-title">FOR OFFICE USE ONLY</p>
          <div className="cm257-office-grid">
            <div>
              <span className="cm257-label">PNR / Transaction No.</span>
              <div className="cm257-office-cell" />
            </div>
            <div>
              <span className="cm257-label">Amount / Mode</span>
              <div className="cm257-office-cell" />
            </div>
            <div>
              <span className="cm257-label">Counter signature &amp; stamp</span>
              <div className="cm257-office-cell" />
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
