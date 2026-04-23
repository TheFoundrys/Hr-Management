import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/verify?token=${token}`;

  const mailOptions = {
    from: `"The Foundrys HR" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Action Required: Verify Your HR Account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2980b9;">Welcome to The Foundrys HR, ${name}!</h2>
        <p>An account has been prepared for you. To activate your access, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2980b9; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 13px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">If you didn't expect this email, please ignore it.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendResetPasswordEmail(email: string, name: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"The Foundrys HR" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Security: Reset Your HR Portal Password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #e74c3c;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset the password for your HR Portal account. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset My Password</a>
        </div>
        <p style="color: #666; font-size: 13px;">If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">The Foundrys • Institutional Security Department</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendOnboardingInvite(email: string, name: string, tempPassword: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/verify?token=${token}`;

  const mailOptions = {
    from: `"The Foundrys HR" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to The Foundrys! Important Login Information',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 16px; color: #1c1e21;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">Welcome to the Team, ${name}!</h2>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
          We share your excitement as you join The Foundrys. Your HR Portal account is ready for you to access your dashboard, attendance, and payroll information.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Temporary Credentials</h3>
          <p style="margin: 10px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 10px 0; font-size: 15px;"><strong>Temp Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${verifyUrl}" style="padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block;">Verify & Set Your Password</a>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #6b7280; font-style: italic;">
          <strong>Security:</strong> Clicking the link above will verify your account and allow you to set your own private password.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
          The Foundrys HR System &bull; Institutional Administration<br/>
          This is an automated message, please do not reply.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

