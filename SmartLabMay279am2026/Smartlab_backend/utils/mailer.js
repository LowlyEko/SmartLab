// utils/mailer.js
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

function fmtDate(val) {
  if (!val) return '--';
  const d = val instanceof Date ? val : new Date(String(val));
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Send a reservation-submitted notification to the professor with a sign-off link.
 * Matches the same pattern as accountability sign-off emails.
 *
 * @param {object} reservation  Full reservation object from Prisma
 * @param {object} student      { first_name, last_name, student_id }
 * @param {object} prisma       Prisma client (needed to store the token)
 */
async function sendProfessorNotification(reservation, student, prisma) {
  const profEmail = reservation.prof_email;
  if (!profEmail) return;

  // Generate and persist a sign-off token (same as accountability feedback_token)
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.reservation.update({
    where: { reservation_id: reservation.reservation_id },
    data:  { prof_token: token },
  });

  const BACKEND_URL  = process.env.BACKEND_URL  || `http://localhost:${process.env.PORT || 5000}`;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

  const signOffUrl = `${FRONTEND_URL}/prof-signoff.html?token=${token}`;

  const resId      = `RES-${String(reservation.reservation_id).padStart(3, '0')}`;
  const profName   = reservation.prof_name || 'Professor';
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_id;

  // Build item list
  const apparatus = (reservation.reservation_apparatus || [])
    .map(a => `• ${a.inventory_apparatus?.apparatus_name || 'Apparatus'} × ${a.quantity}`).join('\n');
  const equipment = (reservation.reservation_equipment || [])
    .map(e => `• ${e.inventory_equipment?.equipment_name || 'Equipment'} × ${e.quantity}`).join('\n');
  const glassware = (reservation.reservation_glassware || [])
    .map(g => `• ${g.inventory_glassware?.glassware || 'Glassware'} × ${g.quantity}`).join('\n');
  const supplies  = (reservation.reservation_supplies  || [])
    .map(s => `• ${s.inventory_supplies?.supplies_name || 'Supply'} × ${s.quantity}`).join('\n');
  const chemicals = (reservation.chemical_items || [])
    .map(c => `• ${c.chemical?.chemical_name || 'Chemical'} × ${c.quantity}`).join('\n');
  const equipLog  = reservation.equipment_log
    ? reservation.equipment_log.split(',').map(n => `• ${n.trim()}`).join('\n') : '';

  const allItems = [apparatus, equipment, glassware, supplies, chemicals, equipLog]
    .filter(Boolean).join('\n') || '  (No items listed)';

  const members = (reservation.members || []).map(m => `• ${m.name}`).join('\n') || '  (None listed)';

  const timeRange = reservation.time_end
    ? `${fmtTime(reservation.time_start)} – ${fmtTime(reservation.time_end)}`
    : fmtTime(reservation.time_start);

  const itemsHtml = allItems.split('\n')
    .map(l => `<li>${l.replace(/^•\s*/, '')}</li>`).join('');
  const membersHtml = members.split('\n')
    .map(l => `<li>${l.replace(/^•\s*/, '')}</li>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f0f4f8; margin:0; padding:0; }
    .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.09); }
    .header  { background:#1a5276; padding:28px 32px; }
    .header h1 { color:#fff; margin:0; font-size:20px; font-weight:700; }
    .header p  { color:#aad4f5; margin:4px 0 0; font-size:13px; }
    .body    { padding:28px 32px; color:#333; }
    .body p  { line-height:1.7; font-size:14px; }
    table    { width:100%; border-collapse:collapse; margin:16px 0; }
    th       { background:#eaf2fb; text-align:left; padding:8px 12px; font-size:11px; color:#555; text-transform:uppercase; letter-spacing:.5px; }
    td       { padding:8px 12px; font-size:14px; border-bottom:1px solid #f0f0f0; }
    td:first-child { color:#555; width:45%; }
    td:last-child  { color:#111; font-weight:500; }
    .section-title { font-size:12px; font-weight:700; color:#1a5276; text-transform:uppercase; letter-spacing:.6px; margin:20px 0 6px; }
    ul { margin:4px 0 0 18px; padding:0; }
    li { font-size:14px; line-height:1.8; color:#333; }
    .signoff-box { text-align:center; background:#f0f7ff; border:1px solid #bee3f8; border-radius:8px; padding:24px; margin:24px 0 8px; }
    .signoff-box p { margin:0 0 16px; font-size:14px; color:#2d3748; }
    .btn-signoff { display:inline-block; background:#205e38; color:#fff; padding:13px 36px; border-radius:7px; text-decoration:none; font-size:15px; font-weight:700; }
    .signoff-box small { display:block; margin-top:12px; font-size:12px; color:#718096; }
    .footer { background:#f9f9f9; padding:14px 32px; font-size:12px; color:#aaa; border-top:1px solid #eee; text-align:center; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📋 Lab Reservation — Sign-Off Required</h1>
    <p>SmartLab Reservation System &nbsp;|&nbsp; Professor Notification</p>
  </div>
  <div class="body">
    <p>Dear <strong>${profName}</strong>,</p>
    <p>One of your students has submitted a lab reservation request. Please review the details below and sign off using the button.</p>

    <div class="section-title">Reservation Details</div>
    <table>
      <tr><td>Reservation ID</td><td>${resId}</td></tr>
      <tr><td>Student</td><td>${studentName} (${student.student_id || 'N/A'})</td></tr>
      <tr><td>Subject</td><td>${reservation.subject}</td></tr>
      <tr><td>Type</td><td style="text-transform:capitalize;">${reservation.type || '—'}</td></tr>
      <tr><td>Course / Section</td><td>${reservation.course_year_section || '—'}</td></tr>
      <tr><td>Group No.</td><td>${reservation.group_number ?? '—'}</td></tr>
      <tr><td>Date Needed</td><td>${fmtDate(reservation.date_borrowed)}</td></tr>
      <tr><td>Time</td><td>${timeRange}</td></tr>
      <tr><td>Status</td><td>${reservation.status}</td></tr>
    </table>

    <div class="section-title">Equipment &amp; Materials Requested</div>
    <ul>${itemsHtml}</ul>

    <div class="section-title">Group Members</div>
    <ul>${membersHtml}</ul>

    <div class="signoff-box">
      <p><strong>Please sign off to acknowledge this reservation request.</strong></p>
      <a href="${signOffUrl}" class="btn-signoff">✅ Sign Off</a>
      <small>This link is unique to this request. You only need to click it once.</small>
    </div>
  </div>
  <div class="footer">SmartLab Reservation System — Automated Notification</div>
</div>
</body>
</html>`.trim();

  await transporter.sendMail({
    from:    `"SmartLab Reservations" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
    to:      profEmail,
    subject: `[SmartLab] Sign-Off Required — ${resId} (${reservation.subject})`,
    html,
  });

  console.log(`[MAILER] Professor sign-off email sent to ${profEmail} for ${resId}`);
}

module.exports = { sendProfessorNotification };