import { Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DATE_TIME_FORMAT, formatUtcDateTime, formatUtcScheduleLine } from '@/lib/dateTime';
import { escapeHtml } from '@/lib/printHtml';
import { format } from 'date-fns';

export interface MinutesPrintTask {
  title: string;
  assignee: string;
  due?: string | null;
  priority: string;
  category: string;
  type: string;
  company: string;
  /** Task created from this item at finalize. */
  taskNo?: number | null;
}

export interface MinutesPrintData {
  meetingCode: string;
  title: string;
  status: string;
  finalized: boolean;
  category: string;
  type: string;
  mode: string;
  location: string;
  taskCompany: string;
  start?: string | null;
  end?: string | null;
  durationMinutes?: number | null;
  minutesUrl?: string | null;
  remarks?: string | null;
  preparedBy?: { name: string; date?: string | null } | null;
  finalizedBy?: { name: string; date?: string | null } | null;
  participants: Array<{ name: string; type: string; organisation: string; designation: string; email: string; contact: string }>;
  discussions: Array<{ topic: string; summary: string; decision: string; remarks: string; tasks: MinutesPrintTask[] }>;
  /** Hide the Type column / value when the app hides task types. */
  hideType: boolean;
  printedBy: string;
  printedAt: Date;
}

const dash = (v?: string | null) => (v && v.trim() ? v : '—');
const discussionRef = (i: number) => `D${i + 1}`;
const taskRef = (di: number, ti: number) => `T${di + 1}.${ti + 1}`;

function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

// Plain render helpers rather than components: this module exports a builder, not components.
function detail(label: string, value?: string | null) {
  return (
    <div className="detail" key={label}>
      <dt>{label}</dt>
      <dd>{dash(value)}</dd>
    </div>
  );
}

function section(no: number, title: string, children: ReactNode) {
  return (
    <section key={no}>
      <h2>
        <span className="sec-no">{no}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function renderMinutes(data: MinutesPrintData) {
  const start = formatUtcScheduleLine(data.start);
  const end = formatUtcScheduleLine(data.end);
  const sameDay = start.date === end.date;
  const when = data.start
    ? `${start.date}, ${start.time}${data.end ? ` – ${sameDay ? end.time : `${end.date}, ${end.time}`}` : ''}`
    : '';
  const duration = formatDuration(data.durationMinutes);
  const allTasks = data.discussions.flatMap((d, di) => d.tasks.map((t, ti) => ({ ...t, di, ti, topic: d.topic })));

  return (
    <main>
      {!data.finalized ? <div className="watermark" aria-hidden>DRAFT</div> : null}

      <header className="doc-head">
        <div>
          <h1>Minutes of Meeting</h1>
        </div>
        <table className="ref">
          <tbody>
            <tr>
              <th>Reference</th>
              <td>{dash(data.meetingCode)}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span className={data.finalized ? 'status final' : 'status'}>{dash(data.status)}</span>
              </td>
            </tr>
            <tr>
              <th>Meeting date</th>
              <td>{dash(data.start ? start.date : '')}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <p className="meeting-title">{dash(data.title)}</p>

      {section(1, "Meeting Details", <>
        <dl className="details">
          {detail('Date & time', when + (duration ? ` (${duration})` : ''))}
          {detail('Meeting mode', data.mode)}
          {detail('Location', data.location)}
          {detail('Company', data.taskCompany)}
          {detail('Category', data.category)}
          {!data.hideType ? detail('Type', data.type) : null}
          {detail('Prepared by', data.preparedBy?.name)}
          {detail(
            'Finalized by',
            data.finalizedBy?.name
              ? `${data.finalizedBy.name}${data.finalizedBy.date ? `, ${formatUtcDateTime(data.finalizedBy.date)}` : ''}`
              : ''
          )}
          {data.minutesUrl ? detail('Recording / minutes link', data.minutesUrl) : null}
        </dl>
      </>)}

      {section(2, `Attendees (${data.participants.length})`, <>
        {data.participants.length ? (
          // One comma-separated line: name (phone, email). Names stay bold; contact details only when known.
          <p className="attendees">
            {data.participants.map((p, i) => {
              const contact = [p.contact, p.email].map((x) => x.trim()).filter(Boolean).join(', ');
              return (
                <Fragment key={i}>
                  <span className="attendee">
                    <span className="strong">{dash(p.name)}</span>
                    {contact ? <span className="contact"> ({contact})</span> : null}
                  </span>
                  {i < data.participants.length - 1 ? ', ' : ''}
                </Fragment>
              );
            })}
          </p>
        ) : (
          <p className="empty">No attendees recorded.</p>
        )}
      </>)}

      {section(3, "Discussions & Outcomes", <>
        {data.discussions.length ? (
          <table className="grid">
            <thead>
              <tr>
                <th className="c-ref">Ref</th>
                <th className="c-topic">Topic / Agenda</th>
                <th>Discussion</th>
                <th className="c-outcome">Outcome / Decision</th>
                <th className="c-links">Action items</th>
              </tr>
            </thead>
            <tbody>
              {data.discussions.map((d, di) => (
                <tr key={di}>
                  <td className="c-ref strong">{discussionRef(di)}</td>
                  <td className="strong">{dash(d.topic)}</td>
                  <td className="pre">
                    {dash(d.summary)}
                    {d.remarks ? <span className="note">Remarks: {d.remarks}</span> : null}
                  </td>
                  <td className="pre">{dash(d.decision)}</td>
                  <td className="c-links">
                    {d.tasks.length ? d.tasks.map((_, ti) => taskRef(di, ti)).join(', ') : 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">No discussion points recorded.</p>
        )}
      </>)}

      {section(4, `Action Items / Tasks (${allTasks.length})`, <>
        {allTasks.length ? (
          <>
            <p className="hint">Each task is linked to the discussion point it came from (see section 3).</p>
            <table className="grid">
              <thead>
                <tr>
                  <th className="c-ref">Ref</th>
                  <th className="c-task">Task</th>
                  <th className="c-from">From discussion</th>
                  <th>Assigned to</th>
                  <th className="c-due">Due</th>
                  <th>Priority</th>
                  <th>{data.hideType ? 'Category' : 'Category / Type'}</th>
                  <th className="c-taskno">Task No.</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map((t) => (
                  <tr key={`${t.di}-${t.ti}`}>
                    <td className="c-ref strong">{taskRef(t.di, t.ti)}</td>
                    <td>
                      <span className="strong">{dash(t.title)}</span>
                      {t.company ? <span className="note">Company: {t.company}</span> : null}
                    </td>
                    <td className="c-from">
                      <span className="strong">{discussionRef(t.di)}</span> · {dash(t.topic)}
                    </td>
                    <td>{dash(t.assignee)}</td>
                    <td className="c-due">{t.due ? formatUtcDateTime(t.due) : '—'}</td>
                    <td>{dash(t.priority)}</td>
                    <td>{dash(data.hideType ? t.category : [t.category, t.type].filter(Boolean).join(' / '))}</td>
                    <td className="c-taskno">{t.taskNo ? `#${t.taskNo}` : data.finalized ? '—' : 'On finalize'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty">No action items recorded.</p>
        )}
      </>)}

      {data.remarks?.trim()
        ? section(5, 'Remarks', <p className="pre remarks">{data.remarks}</p>)
        : null}

      <section className="signoff">
        <div className="sign">
          <div className="sign-line" />
          <p className="strong">Prepared by: {dash(data.preparedBy?.name)}</p>
          <p>Date: {data.preparedBy?.date ? formatUtcScheduleLine(data.preparedBy.date).date : '________________'}</p>
        </div>
        <div className="sign">
          <div className="sign-line" />
          <p className="strong">Approved by: {data.finalizedBy?.name || '________________'}</p>
          <p>Date: {data.finalizedBy?.date ? formatUtcScheduleLine(data.finalizedBy.date).date : '________________'}</p>
        </div>
      </section>
    </main>
  );
}

const STYLES = `
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #111827; }
  body { font: 9.5pt/1.45 "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { position: relative; }
  .watermark { position: fixed; top: 42%; left: 0; right: 0; text-align: center; font-size: 110pt; font-weight: 800; letter-spacing: 12pt; color: rgba(17,24,39,0.06); transform: rotate(-28deg); z-index: 0; pointer-events: none; }
  .doc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16pt; border-bottom: 2pt solid #1e3a5f; padding-bottom: 8pt; }
  h1 { margin: 0; font-size: 18pt; font-weight: 700; letter-spacing: 0.2pt; }
  .ref { border-collapse: collapse; font-size: 8.5pt; }
  .ref th { text-align: left; font-weight: 600; color: #4b5563; padding: 1.5pt 8pt 1.5pt 0; white-space: nowrap; }
  .ref td { padding: 1.5pt 0; font-weight: 600; }
  .status { display: inline-block; padding: 0 5pt; border: 0.75pt solid #9ca3af; border-radius: 3pt; }
  .status.final { border-color: #047857; color: #047857; }
  .meeting-title { margin: 10pt 0 2pt; font-size: 13pt; font-weight: 700; }
  section { margin-top: 12pt; position: relative; z-index: 1; }
  h2 { margin: 0 0 5pt; padding-bottom: 2pt; font-size: 10.5pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.4pt; border-bottom: 0.75pt solid #cbd5e1; break-after: avoid; }
  .sec-no { color: #64748b; }
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 3pt 18pt; margin: 0; }
  .detail { display: grid; grid-template-columns: 34mm 1fr; gap: 6pt; break-inside: avoid; }
  .detail dt { color: #4b5563; font-weight: 600; }
  .detail dd { margin: 0; word-break: break-word; }
  table.grid { width: 100%; border-collapse: collapse; table-layout: auto; }
  .grid th, .grid td { border: 0.75pt solid #cbd5e1; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  .grid thead th { background: #eef2f7; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3pt; color: #334155; }
  .grid tr { break-inside: avoid; }
  .grid thead { display: table-header-group; }
  .c-no { width: 7mm; text-align: center; }
  .c-ref { width: 11mm; white-space: nowrap; }
  .c-topic { width: 22%; }
  .c-outcome { width: 24%; }
  .c-links { width: 18mm; }
  .c-task { width: 28%; }
  .c-from { width: 18%; }
  .c-due { white-space: nowrap; }
  .c-taskno { white-space: nowrap; }
  .strong { font-weight: 600; }
  .pre { white-space: pre-wrap; word-break: break-word; }
  .note { display: block; margin-top: 2pt; color: #4b5563; font-size: 8.5pt; }
  .hint { margin: 0 0 4pt; color: #4b5563; font-size: 8.5pt; }
  .empty { margin: 0; color: #6b7280; font-style: italic; }
  .remarks { margin: 0; }
  .attendees { margin: 0; line-height: 1.6; }
  /* One attendee never splits across lines (unless it is longer than a line); lines wrap between attendees. */
  .attendee { display: inline-block; max-width: 100%; }
  .attendee .contact { color: #4b5563; }
  .signoff { display: grid; grid-template-columns: 1fr 1fr; gap: 28pt; margin-top: 28pt; break-inside: avoid; }
  .sign p { margin: 2pt 0 0; }
  .sign-line { height: 26pt; border-bottom: 0.75pt solid #111827; margin-bottom: 4pt; }
  @media screen { body { max-width: 210mm; margin: 0 auto; padding: 16mm 14mm; } }
`;

/** Full HTML document for printing the meeting notes as minutes of meeting. */
export function buildMeetingMinutesHtml(data: MinutesPrintData): string {
  const body = renderToStaticMarkup(renderMinutes(data));
  const title = `Minutes of Meeting${data.meetingCode ? ` ${data.meetingCode}` : ''} - ${data.title || 'Meeting'}`;
  const footerLeft = `${data.meetingCode || data.title || 'Minutes of Meeting'} · Printed ${format(data.printedAt, DATE_TIME_FORMAT)}${data.printedBy ? ` by ${data.printedBy}` : ''}`;
  // Page numbers in the page margin (Chromium, Safari). A CSS string inside <style>: quotes, backslashes
  // and "<" (no "</style>" from a meeting title) are escaped.
  const cssString = (s: string) =>
    `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3C ').replace(/[\r\n]+/g, ' ')}"`;
  const pageMargin = `@page { @bottom-left { content: ${cssString(footerLeft)}; font: 7.5pt "Segoe UI", Arial, sans-serif; color: #6b7280; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt "Segoe UI", Arial, sans-serif; color: #6b7280; } }`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLES}${pageMargin}</style></head><body>${body}</body></html>`;
}
