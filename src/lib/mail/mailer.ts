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
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

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
