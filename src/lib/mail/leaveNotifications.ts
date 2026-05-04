import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const },
    requireTLS: true,
    connectionTimeout: 10000,
  });
}

function getFrom(tenantName: string) {
  const user = process.env.SMTP_USER || '';
  return `"${tenantName}" <${user}>`;
}

function getAppUrl() {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  return (url || 'http://localhost:3000').replace(/\/$/, '');
}

export async function sendLeaveDecisionToEmployee(params: {
  toEmail: string;
  employeeName: string;
  tenantName: string;
  decision: 'approved' | 'rejected';
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: string | number;
  remarks?: string | null;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[leave-mail] SMTP not configured; skip employee decision email');
    return;
  }
  const { toEmail, employeeName, tenantName, decision, leaveTypeName, startDate, endDate, totalDays, remarks } = params;
  const app = getAppUrl();
  const subject =
    decision === 'approved'
      ? `Leave approved — ${leaveTypeName}`
      : `Leave not approved — ${leaveTypeName}`;
  const html = `
    <div style="font-family:Segoe UI,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#111827;">Hi ${employeeName},</h2>
      <p style="color:#374151;line-height:1.5;">Your leave request has been <strong>${decision}</strong>.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;color:#374151;">
        <tr><td style="padding:4px 0;"><strong>Type</strong></td><td>${leaveTypeName}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Dates</strong></td><td>${startDate} → ${endDate}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Days</strong></td><td>${totalDays}</td></tr>
        ${remarks ? `<tr><td style="padding:4px 0;vertical-align:top;"><strong>Remarks</strong></td><td>${String(remarks).replace(/</g, '&lt;')}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;"><a href="${app}/leave" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Leave</a></p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">${tenantName}</p>
    </div>`;
  try {
    await getTransport().sendMail({
      from: getFrom(tenantName),
      to: toEmail,
      subject,
      html,
    });
  } catch (e) {
    console.error('[leave-mail] sendLeaveDecisionToEmployee failed', e);
  }
}

export async function sendNewLeaveRequestToManagers(params: {
  managerEmails: string[];
  tenantName: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: string | number;
  reason?: string | null;
}) {
  const { managerEmails, tenantName, employeeName, leaveTypeName, startDate, endDate, totalDays, reason } = params;
  if (!managerEmails.length) {
    console.warn('[leave-mail] No manager emails; skip new-request notifications');
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[leave-mail] SMTP not configured; skip manager new-request email');
    return;
  }
  const app = getAppUrl();
  const subject = `New leave request — ${employeeName}`;
  const html = `
    <div style="font-family:Segoe UI,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#111827;">Leave needs your attention</h2>
      <p style="color:#374151;"><strong>${employeeName}</strong> submitted a leave request.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;color:#374151;">
        <tr><td style="padding:4px 0;"><strong>Type</strong></td><td>${leaveTypeName}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Dates</strong></td><td>${startDate} → ${endDate}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Days</strong></td><td>${totalDays}</td></tr>
        ${reason ? `<tr><td style="padding:4px 0;vertical-align:top;"><strong>Reason</strong></td><td>${String(reason).replace(/</g, '&lt;')}</td></tr>` : ''}
      </table>
      <p><a href="${app}/leave?tab=manage" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Review in Leave</a></p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">${tenantName}</p>
    </div>`;
  try {
    const transport = getTransport();
    for (const to of managerEmails) {
      if (!to?.includes('@')) continue;
      await transport.sendMail({ from: getFrom(tenantName), to, subject, html });
    }
  } catch (e) {
    console.error('[leave-mail] sendNewLeaveRequestToManagers failed', e);
  }
}

export async function sendWfhDecisionToEmployee(params: {
  toEmail: string;
  employeeName: string;
  tenantName: string;
  decision: 'approved' | 'rejected';
  requestDate: string;
  isHalfDay: boolean;
  remarks?: string | null;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[leave-mail] SMTP not configured; skip WFH decision email');
    return;
  }
  const { toEmail, employeeName, tenantName, decision, requestDate, isHalfDay, remarks } = params;
  const app = getAppUrl();
  const dayLabel = isHalfDay ? 'Half day' : 'Full day';
  const subject =
    decision === 'approved' ? 'WFH approved' : 'WFH not approved';
  const html = `
    <div style="font-family:Segoe UI,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#111827;">Hi ${employeeName},</h2>
      <p style="color:#374151;line-height:1.5;">Your work-from-home request has been <strong>${decision}</strong>.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;color:#374151;">
        <tr><td style="padding:4px 0;"><strong>Date</strong></td><td>${requestDate}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Duration</strong></td><td>${dayLabel}</td></tr>
        ${remarks ? `<tr><td style="padding:4px 0;vertical-align:top;"><strong>Remarks</strong></td><td>${String(remarks).replace(/</g, '&lt;')}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;"><a href="${app}/leave?tab=wfh" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Leave</a></p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">${tenantName}</p>
    </div>`;
  try {
    await getTransport().sendMail({
      from: getFrom(tenantName),
      to: toEmail,
      subject,
      html,
    });
  } catch (e) {
    console.error('[leave-mail] sendWfhDecisionToEmployee failed', e);
  }
}

export async function sendNewWfhRequestToManagers(params: {
  managerEmails: string[];
  tenantName: string;
  employeeName: string;
  requestDate: string;
  isHalfDay: boolean;
  reason?: string | null;
}) {
  const { managerEmails, tenantName, employeeName, requestDate, isHalfDay, reason } = params;
  if (!managerEmails.length) {
    console.warn('[leave-mail] No manager emails; skip WFH request notifications');
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[leave-mail] SMTP not configured; skip WFH new-request email');
    return;
  }
  const app = getAppUrl();
  const dayLabel = isHalfDay ? 'Half day' : 'Full day';
  const subject = `New WFH request — ${employeeName}`;
  const html = `
    <div style="font-family:Segoe UI,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#111827;">WFH needs your attention</h2>
      <p style="color:#374151;"><strong>${employeeName}</strong> requested work from home.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;color:#374151;">
        <tr><td style="padding:4px 0;"><strong>Date</strong></td><td>${requestDate}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Duration</strong></td><td>${dayLabel}</td></tr>
        ${reason ? `<tr><td style="padding:4px 0;vertical-align:top;"><strong>Reason</strong></td><td>${String(reason).replace(/</g, '&lt;')}</td></tr>` : ''}
      </table>
      <p><a href="${app}/leave?tab=wfh" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Review WFH</a></p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">${tenantName}</p>
    </div>`;
  try {
    const transport = getTransport();
    for (const to of managerEmails) {
      if (!to?.includes('@')) continue;
      await transport.sendMail({ from: getFrom(tenantName), to, subject, html });
    }
  } catch (e) {
    console.error('[leave-mail] sendNewWfhRequestToManagers failed', e);
  }
}
