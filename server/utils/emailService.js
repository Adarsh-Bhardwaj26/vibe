const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailTemplates = {
  verification: (name, url) => ({
    subject: 'Verify your Vibe account ✨',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 36px; font-weight: 800;">Vibe 🌟</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Connect. Share. Inspire.</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #a78bfa;">Welcome, ${name}! 👋</h2>
          <p style="color: #ccc; line-height: 1.6;">You're just one click away from joining the Vibe community. Verify your email to get started.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 13px;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      </div>
    `,
  }),
  resetPassword: (name, url) => ({
    subject: 'Reset your Vibe password 🔑',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 36px; font-weight: 800;">Vibe 🔑</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #f97316;">Password Reset, ${name}</h2>
          <p style="color: #ccc; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you didn't request this, your account is safe — just ignore this email.</p>
        </div>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
  const { subject, html } = emailTemplates.verification(name, url);
  return sendEmail({ to: email, subject, html });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const { subject, html } = emailTemplates.resetPassword(name, url);
  return sendEmail({ to: email, subject, html });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
