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
        <table className="cm257-grid cm257-grid--journey" aria-label="Journey details">
          <colgroup>
            <col className="cm257-col-label" />
            <col className="cm257-col-value" />
            <col className="cm257-col-label" />
            <col className="cm257-col-value" />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={4} className="cm257-grid-section">
                Journey details
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Train No. &amp; Name</td>
              <td colSpan={3} className="cm257-cell-value">
                {journey.trainNoAndName}
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Date of Journey (DD/MM/YY)</td>
              <td className="cm257-cell-value cm257-cell-value--short">{journey.journeyDate}</td>
              <td className="cm257-cell-label">No. of berths / seats</td>
              <td className="cm257-cell-value cm257-cell-value--short">
                {journey.berthCount || String(filledCount)}
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Class</td>
              <td colSpan={3} className="cm257-cell-value cm257-cell-value--classes">
                {IR_CLASS_CODES.map((code) => (
                  <ClassCheckbox key={code} code={code} selected={journey.classCode === code} />
                ))}
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">From (Station)</td>
              <td className="cm257-cell-value">{journey.fromStation}</td>
              <td className="cm257-cell-label">To (Station)</td>
              <td className="cm257-cell-value">{journey.toStation}</td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Boarding at (if different)</td>
              <td className="cm257-cell-value">{journey.boardingStation}</td>
              <td className="cm257-cell-label">Reservation upto</td>
              <td className="cm257-cell-value">{journey.reservationUpto}</td>
            </tr>
          </tbody>
        </table>

        <table className="cm257-grid cm257-grid--passengers" aria-label="Passenger details">
          <colgroup>
            <col className="cm257-col-sno" />
            <col className="cm257-col-name" />
            <col className="cm257-col-sex" />
            <col className="cm257-col-age" />
            <col className="cm257-col-conc" />
            <col className="cm257-col-berth" />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={6} className="cm257-grid-section">
                Passenger details (maximum 6 per form)
              </th>
            </tr>
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
              <tr key={pax.serialNo} className="cm257-pax-row">
                <td className="cm257-cell-center">{pax.serialNo}</td>
                <td className="cm257-cell-name">{pax.nameOnTicket}</td>
                <td className="cm257-cell-center">{pax.sex}</td>
                <td className="cm257-cell-center">{pax.age}</td>
                <td className="cm257-cell-center">{pax.concession}</td>
                <td className="cm257-cell-center">{pax.berthPreference}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="cm257-footnote">
          * Concession codes as per Railway rules. Age proof / ID may be required at the counter.
        </p>

        <table className="cm257-grid cm257-grid--choices" aria-label="Berth preferences if unavailable">
          <tbody>
            <tr>
              <td colSpan={2} className="cm257-grid-section">
                If choice of berth is NOT available
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-check">
                <CheckItem label="Travel without berth" />
              </td>
              <td className="cm257-cell-check">
                <CheckItem label="Any one lower berth" />
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-check">
                <CheckItem label="All middle berths" />
              </td>
              <td className="cm257-cell-check">
                <CheckItem label="All upper berths" />
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-check">
                <CheckItem label="All side lower berths" />
              </td>
              <td className="cm257-cell-check">
                <CheckItem label="Book if all berths in same coach not available" />
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="cm257-cell-check">
                <CheckItem label="No choice" checked={!draft.choiceIfBerthNotAvailable} />
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Vikalp scheme</td>
              <td className="cm257-cell-value">
                <CheckItem label="Yes" checked={draft.vikalpOptIn === true} />
                <span className="cm257-inline-gap" />
                <CheckItem label="No" checked={draft.vikalpOptIn === false} />
                <span className="cm257-inline-gap cm257-inline-gap--wide" />
                <span className="cm257-cell-label cm257-cell-label--inline">Meal (Rajdhani / Shatabdi / Duronto)</span>
                <span className="cm257-cell-inline-value">{draft.mealPreference}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="cm257-grid cm257-grid--applicant" aria-label="Applicant details">
          <tbody>
            <tr>
              <td colSpan={4} className="cm257-grid-section">
                Applicant (contact person)
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Name</td>
              <td colSpan={3} className="cm257-cell-value">
                {applicant.name}
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Full address</td>
              <td colSpan={3} className="cm257-cell-value cm257-cell-value--address">
                {applicant.address}
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Telephone / Mobile</td>
              <td className="cm257-cell-value">{applicant.phone}</td>
              <td className="cm257-cell-label">Date</td>
              <td className="cm257-cell-value cm257-cell-value--short">{applicant.date}</td>
            </tr>
            <tr>
              <td className="cm257-cell-label">Signature</td>
              <td colSpan={3} className="cm257-cell-value cm257-cell-value--signature" />
            </tr>
          </tbody>
        </table>

        <table className="cm257-grid cm257-grid--office" aria-label="For office use only">
          <tbody>
            <tr>
              <td colSpan={3} className="cm257-grid-section cm257-grid-section--office">
                FOR OFFICE USE ONLY
              </td>
            </tr>
            <tr>
              <td className="cm257-cell-label">PNR / Transaction No.</td>
              <td className="cm257-cell-label">Amount / Mode</td>
              <td className="cm257-cell-label">Counter signature &amp; stamp</td>
            </tr>
            <tr className="cm257-office-data-row">
              <td className="cm257-cell-value cm257-cell-value--office" />
              <td className="cm257-cell-value cm257-cell-value--office" />
              <td className="cm257-cell-value cm257-cell-value--office" />
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
