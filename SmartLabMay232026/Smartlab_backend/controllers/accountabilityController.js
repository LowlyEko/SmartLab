// controllers/accountabilityController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ============================================================
//  EMAIL TRANSPORTER
// ============================================================

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================================
//  HELPERS
// ============================================================

function safeDate(value, fieldName) {
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid date for field: ${fieldName}`);
  return d;
}

function safeTime(value, fieldName) {
  if (!value) return null;

  const str = String(value).trim().toLowerCase();

  const twelveHourMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/);
  if (twelveHourMatch) {
    let hours   = parseInt(twelveHourMatch[1], 10);
    const mins  = twelveHourMatch[2];
    const ampm  = twelveHourMatch[3];

    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours  = 0;

    const iso = `1970-01-01T${String(hours).padStart(2, '0')}:${mins}:00`;
    const d   = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid time for field: ${fieldName}`);
    return d;
  }

  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourMatch) {
    const iso = `1970-01-01T${str.length === 5 ? str + ':00' : str}`;
    const d   = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid time for field: ${fieldName}`);
    return d;
  }

  throw new Error(`Unrecognised time format for field: ${fieldName} (got "${value}")`);
}

// ============================================================
//  EMAIL HELPERS
// ============================================================

/**
 * Returns the next email_stage after the current one.
 * none → student → professor → dean → resolved
 */
function nextStage(current) {
  const flow = ['none', 'student', 'professor', 'dean', 'resolved'];
  const idx  = flow.indexOf(current);
  return idx === -1 || idx === flow.length - 1 ? null : flow[idx + 1];
}

/**
 * Human-readable label for each stage — used in staff status display.
 * "Kinsa na ang need mag sign off"
 */
function stageLabel(stage) {
  switch (stage) {
    case 'none':      return 'Not yet notified';
    case 'student':   return 'Waiting for Student';
    case 'professor': return 'Waiting for Professor';
    case 'dean':      return 'Waiting for Dean';
    case 'resolved':  return 'Dean Signed — Pending Closure';
    default:          return stage;
  }
}

/**
 * Build the email body for each stage.
 */
function buildEmail(stage, record, signOffUrl) {
  const studentName  = record.student_name || record.student?.first_name + ' ' + record.student?.last_name || 'Student';
  const subject      = record.subject      || 'N/A';
  const materials    = record.materials_broken || 'N/A';
  const deadline     = record.deadline ? new Date(record.deadline).toLocaleDateString() : 'N/A';
  const profName     = record.prof_name || 'Professor';

  const baseInfo = `
    <p><b>Student:</b> ${studentName}</p>
    <p><b>Subject:</b> ${subject}</p>
    <p><b>Materials Broken:</b> ${materials}</p>
    <p><b>Deadline:</b> ${deadline}</p>
  `;

  if (stage === 'student') {
    return {
      subject: `[SmartLab] Accountability Notice - Action Required`,
      html: `
        <h2>SmartLab Accountability Notice</h2>
        <p>Dear ${studentName},</p>
        <p>You have an accountability record that requires your acknowledgment.</p>
        ${baseInfo}
        <p>Please click the button below to acknowledge this record:</p>
        <a href="${signOffUrl}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Acknowledge Record
        </a>
        <p style="margin-top:20px;color:#666;">If you believe this is an error, please contact the laboratory staff.</p>
      `,
    };
  }

  if (stage === 'professor') {
    return {
      subject: `[SmartLab] Accountability Sign-Off Required - ${studentName}`,
      html: `
        <h2>SmartLab - Professor Sign-Off Required</h2>
        <p>Dear ${profName},</p>
        <p>One of your students has an accountability record that requires your sign-off.</p>
        ${baseInfo}
        <p>Please click the button below to review and sign off:</p>
        <a href="${signOffUrl}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Sign Off
        </a>
      `,
    };
  }

  if (stage === 'dean') {
    return {
      subject: `[SmartLab] Accountability Sign-Off Required (Dean) - ${studentName}`,
      html: `
        <h2>SmartLab - Dean Sign-Off Required</h2>
        <p>Dear Dean,</p>
        <p>The following accountability record has been acknowledged by the student and signed off by the professor. Your final sign-off is required.</p>
        ${baseInfo}
        <p><b>Professor:</b> ${profName}</p>
        <p>Please click the button below to review and sign off:</p>
        <a href="${signOffUrl}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Sign Off as Dean
        </a>
      `,
    };
  }

  return null;
}

// ============================================================
//  SHARED INCLUDE
// ============================================================

const FULL_INCLUDE = {
  student:     { select: { user_id: true, student_id: true, first_name: true, last_name: true, section: true, college: true } },
  reservation: { select: { reservation_id: true, subject: true, date_borrowed: true, group_number: true } },
  receiver:    { select: { admin_id: true, first_name: true, last_name: true } },
  members:     { select: { id: true, member_name: true, member_order: true }, orderBy: { member_order: 'asc' } },
};

// ============================================================
//  STUDENT ENDPOINTS
// ============================================================

exports.getMyAccountability = async (req, res) => {
  try {
    const where = req.user.student_id
      ? { student_id: req.user.student_id }
      : { student: { user_id: req.user.user_id } };

    const records = await prisma.accountability.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    // Attach human-readable stage label for the frontend
    const withLabel = records.map(r => ({
      ...r,
      stage_label: stageLabel(r.email_stage),
    }));

    success(res, withLabel);
  } catch (err) {
    error(res, err.message);
  }
};

// ============================================================
//  ADMIN / STAFF ENDPOINTS
// ============================================================

exports.getAllRecords = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      include: FULL_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    // Attach human-readable stage label so staff can see "Kinsa na ang need mag sign off"
    const withLabel = records.map(r => ({
      ...r,
      stage_label: stageLabel(r.email_stage),
    }));

    success(res, withLabel);
  } catch (err) {
    error(res, err.message);
  }
};

exports.createRecord = async (req, res) => {
  try {
    const {
      reservation_id,
      date_borrowed,
      member_name,
      materials_broken,
      prof_name,
      prof_email,
      subject,
      time_start,
      time_end,
      program_course_section,
      deadline,
      remarks,
      members = [],
    } = req.body;

    let student_id   = req.user.is_staff ? (req.body.student_id || null) : (req.user.student_id || null);
    let student_name = req.body.student_name?.trim() || null;

    if (!member_name?.trim())
      return error(res, 'member_name is required', 400);
    if (!materials_broken?.trim())
      return error(res, 'materials_broken is required', 400);
    if (!prof_name?.trim())
      return error(res, 'prof_name is required', 400);
    if (!subject?.trim())
      return error(res, 'subject is required', 400);
    if (!program_course_section?.trim())
      return error(res, 'program_course_section is required', 400);
    if (!date_borrowed)
      return error(res, 'date_borrowed is required', 400);

    if (student_id) {
      const student = await prisma.student.findUnique({ where: { student_id } });
      if (!student) return error(res, `Student ${student_id} not found`, 404);
    }

    const record = await prisma.accountability.create({
      data: {
        student_id:             student_id,
        student_name:           student_name,
        reservation_id:         reservation_id ? parseInt(reservation_id) : null,
        date_borrowed:          safeDate(date_borrowed, 'date_borrowed'),
        member_name:            member_name.trim(),
        materials_broken:       materials_broken.trim(),
        prof_name:              prof_name.trim(),
        prof_email:             prof_email?.trim() || null,
        subject:                subject.trim(),
        time_start:             safeTime(time_start, 'time_start'),
        time_end:               safeTime(time_end,   'time_end'),
        program_course_section: program_course_section.trim(),
        deadline:               deadline ? safeDate(deadline, 'deadline') : null,
        remarks:                remarks?.trim() || null,
        members: {
          create: members
            .filter(m => m?.name?.trim())
            .map((m, i) => ({ member_name: m.name.trim(), member_order: m.order ?? i })),
        },
      },
      include: FULL_INCLUDE,
    });

    // ── Auto-notify professor immediately after record is created ──
    const recipientEmail = prof_email?.trim();
    if (recipientEmail) {
      try {
        const token      = crypto.randomBytes(32).toString('hex');
        const signOffUrl = `${process.env.FRONTEND_URL}/accountability-signoff.html?token=${token}&stage=professor`;
        const emailContent = buildEmail('professor', record, signOffUrl);

        await transporter.sendMail({
          from:    process.env.MAIL_FROM,
          to:      recipientEmail,
          subject: emailContent.subject,
          html:    emailContent.html,
        });

        // Advance email_stage to 'professor' and save token
        await prisma.accountability.update({
          where: { accountability_id: record.accountability_id },
          data: {
            email_stage:      'professor',
            prof_email:       recipientEmail,
            feedback_token:   token,
            last_notified_at: new Date(),
          },
        });

        record.email_stage = 'professor';
      } catch (mailErr) {
        // Don't fail the whole request if email fails — just log it
        console.error('Auto-notify professor email failed:', mailErr.message);
      }
    }

    success(res, { ...record, stage_label: stageLabel(record.email_stage) }, 'Accountability record created successfully', 201);
  } catch (err) {
    if (!err.clientVersion) return error(res, err.message, 400);
    console.error('Create Accountability Error:', err);
    error(res, 'Failed to create record. Please check your inputs.');
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      student_name,
      reservation_id,
      date_borrowed,
      member_name,
      materials_broken,
      prof_name,
      prof_email,
      subject,
      time_start,
      time_end,
      program_course_section,
      deadline,
      remarks,
      date_replaced,
      received_by,
      members,
    } = req.body;

    const data = {};
    if (student_id             !== undefined) data.student_id             = student_id             || null;
    if (student_name           !== undefined) data.student_name           = student_name?.trim()   || null;
    if (reservation_id         !== undefined) data.reservation_id         = reservation_id ? parseInt(reservation_id) : null;
    if (date_borrowed          !== undefined) data.date_borrowed          = safeDate(date_borrowed, 'date_borrowed');
    if (member_name            !== undefined) data.member_name            = member_name.trim();
    if (materials_broken       !== undefined) data.materials_broken       = materials_broken.trim();
    if (prof_name              !== undefined) data.prof_name              = prof_name.trim();
    if (prof_email             !== undefined) data.prof_email             = prof_email?.trim() || null;
    if (subject                !== undefined) data.subject                = subject.trim();
    if (time_start             !== undefined) data.time_start             = safeTime(time_start, 'time_start');
    if (time_end               !== undefined) data.time_end               = safeTime(time_end,   'time_end');
    if (program_course_section !== undefined) data.program_course_section = program_course_section.trim();
    if (deadline               !== undefined) data.deadline               = deadline ? safeDate(deadline, 'deadline') : null;
    if (remarks                !== undefined) data.remarks                = remarks?.trim()         || null;
    if (date_replaced          !== undefined) data.date_replaced          = date_replaced ? safeDate(date_replaced, 'date_replaced') : null;
    if (received_by            !== undefined) data.received_by            = received_by ? parseInt(received_by) : null;

    if (Array.isArray(members)) {
      data.members = {
        deleteMany: {},
        create: members
          .filter(m => m?.name?.trim())
          .map((m, i) => ({ member_name: m.name.trim(), member_order: m.order ?? i })),
      };
    }

    const record = await prisma.accountability.update({
      where:   { accountability_id: parseInt(id) },
      data,
      include: FULL_INCLUDE,
    });

    success(res, record, 'Record updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    if (!err.clientVersion) return error(res, err.message, 400);
    console.error('Update Accountability Error:', err);
    error(res, 'Failed to update record. Please check your inputs.');
  }
};

exports.resolveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, received_by } = req.body;

    const record = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        date_replaced: new Date(),
        received_by:   received_by ? parseInt(received_by) : req.user.admin_id || null,
        remarks:       remarks?.trim() || 'Resolved',
        resolved:      true,
        resolved_at:   new Date(),
        email_stage:   'resolved',
      },
      include: FULL_INCLUDE,
    });

    success(res, record, 'Accountability record resolved successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    error(res, err.message);
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.accountability.delete({
      where: { accountability_id: parseInt(id) },
    });

    success(res, { accountability_id: parseInt(id) }, 'Record deleted successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    console.error('Delete Accountability Error:', err);
    error(res, err.message);
  }
};

// ============================================================
//  NOTIFY - Send email to next person in the chain
//  POST /api/accountability/:id/notify
//  Body: { to_email: "prof@email.com" }  ← required for professor/dean stages
// ============================================================

exports.notifyNext = async (req, res) => {
  try {
    const { id }       = req.params;
    const { to_email } = req.body;

    const record = await prisma.accountability.findUnique({
      where:   { accountability_id: parseInt(id) },
      include: FULL_INCLUDE,
    });

    if (!record) return error(res, 'Record not found', 404);
    if (record.resolved) return error(res, 'Record is already resolved', 400);

    // Cooldown check — prevent spamming emails
    const cooldownHours = parseInt(process.env.NOTIFY_COOLDOWN_HOURS || '24');
    if (record.last_notified_at) {
      const hoursSince = (Date.now() - new Date(record.last_notified_at).getTime()) / 1000 / 3600;
      if (hoursSince < cooldownHours) {
        const remaining = Math.ceil(cooldownHours - hoursSince);
        return error(res, `Already notified recently. Please wait ${remaining} more hour(s) before re-sending.`, 429);
      }
    }

    // Determine the next stage
    const targetStage = nextStage(record.email_stage);
    if (!targetStage || targetStage === 'resolved') {
      return error(res, 'No further notifications needed. All parties have signed off.', 400);
    }

    // Generate a unique sign-off token
    const token    = crypto.randomBytes(32).toString('hex');
    const signOffUrl = `${process.env.FRONTEND_URL}/accountability-signoff.html?token=${token}&stage=${targetStage}`;

    // Determine recipient email
    let recipientEmail = to_email?.trim();
    if (!recipientEmail) {
      // For student stage, try to get their email from the student record
      if (targetStage === 'student' && record.student?.email) {
        recipientEmail = record.student.email;
      } else {
        return error(res, `Please provide the recipient email (to_email) for the ${targetStage} stage.`, 400);
      }
    }

    // Build email content
    const emailContent = buildEmail(targetStage, record, signOffUrl);
    if (!emailContent) return error(res, 'Could not build email for this stage.', 500);

    // Send email
    await transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      recipientEmail,
      subject: emailContent.subject,
      html:    emailContent.html,
    });

    // Update the record: advance stage, save token and timestamp
    const updated = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        email_stage:      targetStage,
        feedback_token:   token,
        last_notified_at: new Date(),
        // Save prof email when notifying professor
        ...(targetStage === 'professor' ? { prof_email: recipientEmail } : {}),
      },
      include: FULL_INCLUDE,
    });

    success(res, {
      ...updated,
      stage_label: stageLabel(updated.email_stage),
    }, `Email sent to ${targetStage}. Stage is now: ${stageLabel(targetStage)}`);

  } catch (err) {
    console.error('Notify Error:', err);
    error(res, 'Failed to send notification email. Check your SMTP settings.');
  }
};

// ============================================================
//  SIGN-OFF - Called when someone clicks the link in the email
//  GET /api/accountability/signoff?token=xxx&stage=professor
// ============================================================

exports.handleSignOff = async (req, res) => {
  try {
    const { token, stage } = req.query;

    if (!token || !stage) return error(res, 'Invalid sign-off link.', 400);

    const record = await prisma.accountability.findFirst({
      where: { feedback_token: token },
    });

    if (!record) return error(res, 'Sign-off link is invalid or has already been used.', 404);
    if (record.resolved) return error(res, 'This record has already been resolved.', 400);
    if (record.email_stage !== stage) return error(res, 'This sign-off link is no longer valid for the current stage.', 400);

    // Record the sign-off timestamp depending on stage
    const updateData = {
      feedback_token: null, // invalidate token after use
    };

    if (stage === 'professor') {
      updateData.prof_responded_at = new Date();
      updateData.prof_response     = 'Signed off via email link';
    }

    if (stage === 'dean') {
      // Dean is the final sign-off — advance to resolved
      updateData.email_stage = 'resolved';
    }

    const updated = await prisma.accountability.update({
      where: { accountability_id: record.accountability_id },
      data:  updateData,
      include: FULL_INCLUDE,
    });

    // ── Auto-send to next stage after sign-off ──
    let autoEmailSent = false;
    if (stage === 'professor') {
      // Professor signed off → auto-send to Dean
      const deanEmail = process.env.DEAN_EMAIL?.trim();
      if (deanEmail) {
        try {
          const deanToken    = crypto.randomBytes(32).toString('hex');
          const deanSignOffUrl = `${process.env.FRONTEND_URL}/accountability-signoff.html?token=${deanToken}&stage=dean`;
          const emailContent = buildEmail('dean', updated, deanSignOffUrl);

          await transporter.sendMail({
            from:    process.env.MAIL_FROM,
            to:      deanEmail,
            subject: emailContent.subject,
            html:    emailContent.html,
          });

          await prisma.accountability.update({
            where: { accountability_id: record.accountability_id },
            data: {
              email_stage:      'dean',
              feedback_token:   deanToken,
              last_notified_at: new Date(),
            },
          });

          autoEmailSent = true;
        } catch (mailErr) {
          console.error('Auto-notify dean email failed:', mailErr.message);
        }
      } else {
        console.warn('DEAN_EMAIL not set in .env — skipping auto-notify to dean.');
      }
    }

    res.json({
      success: true,
      message: `Thank you! Your sign-off has been recorded.${autoEmailSent ? ' The Dean has been notified.' : ' The SmartLab staff will proceed with the next step.'}`,
      stage_label: stageLabel(autoEmailSent ? 'dean' : updated.email_stage),
    });

  } catch (err) {
    console.error('Sign-off Error:', err);
    error(res, 'Something went wrong processing your sign-off.');
  }
};

// ============================================================
//  DROPDOWN HELPERS
// ============================================================

exports.getStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where:   { is_active: true },
      select:  { user_id: true, student_id: true, first_name: true, last_name: true, section: true },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });
    success(res, students);
  } catch (err) {
    error(res, err.message);
  }
};

exports.getReservations = async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      select: {
        reservation_id: true,
        subject:        true,
        date_borrowed:  true,
        group_number:   true,
        student_id:     true,
        student: { select: { first_name: true, last_name: true } },
      },
      orderBy: { date_borrowed: 'desc' },
    });
    success(res, reservations);
  } catch (err) {
    error(res, err.message);
  }
};