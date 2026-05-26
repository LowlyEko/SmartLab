// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,                          // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Format a time value (Date object, ISO string, or "HH:MM") to "HH:MM AM/PM".
 * Prisma returns DateTime fields as JS Date objects.
 */
function fmtTime(val) {
  if (!val) return '--';
  let d;
  if (val instanceof Date) {
    d = val;
  } else {
    const s = String(val);
    d = s.includes('T') ? new Date(s) : new Date(`1970-01-01T${s}`);
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format a date value (Date object or ISO string) to "Month Day, Year".
 * Prisma returns DateTime fields as JS Date objects.
 */
function fmtDate(val) {
  if (!val) return '--';
  const d = val instanceof Date ? val : new Date(String(val));
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * Send a reservation-submitted notification to the professor.
 *
 * @param {object} reservation  The full reservation object returned by Prisma.
 * @param {object} student      { first_name, last_name, student_id }
 */
async function sendProfessorNotification(reservation, student) {
  const profEmail = reservation.prof_email;
  if (!profEmail) return;   // nothing to do if no email on record

  const resId     = `RES-${String(reservation.reservation_id).padStart(3, '0')}`;
  const profName  = reservation.prof_name || 'Professor';
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_id;

  // Build item lists for the email body
  const apparatus  = (reservation.reservation_apparatus || [])
    .map(a => `• ${a.inventory_apparatus?.apparatus_name || 'Apparatus'} × ${a.quantity}`).join('\n');
  const equipment  = (reservation.reservation_equipment || [])
    .map(e => `• ${e.inventory_equipment?.equipment_name || 'Equipment'} × ${e.quantity}`).join('\n');
  const glassware  = (reservation.reservation_glassware || [])
    .map(g => `• ${g.inventory_glassware?.glassware || 'Glassware'} × ${g.quantity}`).join('\n');
  const supplies   = (reservation.reservation_supplies  || [])
    .map(s => `• ${s.inventory_supplies?.supplies_name || 'Supply'} × ${s.quantity}`).join('\n');
  const chemicals  = (reservation.chemical_items || [])
    .map(c => `• ${c.chemical?.chemical_name || 'Chemical'} × ${c.quantity}`).join('\n');
  const equipLog   = reservation.equipment_log
    ? reservation.equipment_log.split(',').map(n => `• ${n.trim()}`).join('\n')
    : '';

  const allItems = [apparatus, equipment, glassware, supplies, chemicals, equipLog]
    .filter(Boolean).join('\n') || '  (No items listed)';

  const members = (reservation.members || []).map(m => `• ${m.name}`).join('\n') || '  (None listed)';

  const timeRange = reservation.time_end
    ? `${fmtTime(reservation.time_start)} – ${fmtTime(reservation.time_end)}`
    : fmtTime(reservation.time_start);

  const textBody = `
Dear ${profName},

A lab reservation request has been submitted by your student and is awaiting your awareness.

──────────────────────────────────────
  RESERVATION DETAILS
──────────────────────────────────────
  ID              : ${resId}
  Student         : ${studentName} (${student.student_id || 'N/A'})
  Subject         : ${reservation.subject}
  Type            : ${reservation.type || '—'}
  Course / Section: ${reservation.course_year_section || '—'}
  Group No.       : ${reservation.group_number ?? '—'}
  Date Needed     : ${fmtDate(reservation.date_borrowed)}
  Time            : ${timeRange}
  Status          : ${reservation.status}

──────────────────────────────────────
  EQUIPMENT & MATERIALS REQUESTED
──────────────────────────────────────
${allItems}

──────────────────────────────────────
  GROUP MEMBERS
──────────────────────────────────────
${members}

${reservation.notes ? `Notes: ${reservation.notes}\n` : ''}
──────────────────────────────────────
This is an automated notification from the SmartLab Reservation System.
Please do not reply to this email.
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header  { background: #1a5276; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p  { color: #aad4f5; margin: 4px 0 0; font-size: 13px; }
    .body    { padding: 28px 32px; color: #333; }
    .body p  { line-height: 1.7; }
    .badge   { display:inline-block; background:#fef9e7; color:#b7770d; border:1px solid #f0c040; border-radius:6px; padding:3px 10px; font-size:13px; font-weight:600; }
    table    { width: 100%; border-collapse: collapse; margin: 18px 0; }
    th       { background: #eaf2fb; text-align: left; padding: 8px 12px; font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: .5px; }
    td       { padding: 8px 12px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
    td:first-child { color: #555; width: 45%; }
    td:last-child  { color: #111; font-weight: 500; }
    .section-title { font-size: 13px; font-weight: 700; color: #1a5276; text-transform: uppercase; letter-spacing: .6px; margin: 22px 0 8px; }
    ul       { margin: 4px 0 0 18px; padding: 0; }
    li       { font-size: 14px; line-height: 1.8; color: #333; }
    .footer  { background: #f9f9f9; padding: 16px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>&#128203; Lab Reservation Request</h1>
    <p>SmartLab Reservation System &nbsp;|&nbsp; Automated Notification</p>
  </div>
  <div class="body">
    <p>Dear <strong>${profName}</strong>,</p>
    <p>A lab reservation request has been submitted by your student and is currently <span class="badge">Pending Review</span>.</p>

    <div class="section-title">Reservation Details</div>
    <table>
      <tr><td>Reservation ID</td><td>${resId}</td></tr>
      <tr><td>Student</td><td>${studentName}${student.student_id ? ` (${student.student_id})` : ''}</td></tr>
      <tr><td>Subject</td><td>${reservation.subject}</td></tr>
      <tr><td>Type</td><td style="text-transform:capitalize;">${reservation.type || '—'}</td></tr>
      <tr><td>Course / Section</td><td>${reservation.course_year_section || '—'}</td></tr>
      <tr><td>Group No.</td><td>${reservation.group_number ?? '—'}</td></tr>
      <tr><td>Date Needed</td><td>${fmtDate(reservation.date_borrowed)}</td></tr>
      <tr><td>Time</td><td>${timeRange}</td></tr>
    </table>

    <div class="section-title">Equipment &amp; Materials Requested</div>
    <ul>
      ${allItems.split('\n').map(line => `<li>${line.replace(/^•\s*/, '')}</li>`).join('')}
    </ul>

    <div class="section-title">Group Members</div>
    <ul>
      ${members.split('\n').map(line => `<li>${line.replace(/^•\s*/, '')}</li>`).join('')}
    </ul>

    ${reservation.notes ? `<div class="section-title">Notes</div><p style="background:#fffbea;padding:10px 14px;border-left:3px solid #f0c040;border-radius:4px;font-size:14px;">${reservation.notes}</p>` : ''}
  </div>
  <div class="footer">
    This is an automated notification from the SmartLab Reservation System. Please do not reply to this email.
  </div>
</div>
</body>
</html>
`.trim();

  await transporter.sendMail({
    from:    `"SmartLab Reservations" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
    to:      profEmail,
    subject: `[SmartLab] Lab Reservation Request — ${resId} (${reservation.subject})`,
    text:    textBody,
    html:    htmlBody,
  });

  console.log(`[MAILER] Professor notification sent to ${profEmail} for ${resId}`);
}

module.exports = { sendProfessorNotification };