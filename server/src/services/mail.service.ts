import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@projectmanagement.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to log links directly to the console during development/SMTP failure
const logDevEmailBackup = (email: string, url: string, type: string) => {
  console.log('\n==================================================');
  console.log(`[DEV EMAIL BACKUP] ${type} link for ${email}:`);
  console.log(url);
  console.log('==================================================\n');
};

// Create SMTP transport (only if config exists and isn't placeholder, otherwise console log in dev)
const getTransporter = () => {
  const isPlaceholder = SMTP_USER && SMTP_USER.includes('your_smtp_username_here');
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && !isPlaceholder) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return null;
};

/**
 * Sends an email verification link to the user.
 */
export const sendVerificationEmail = async (email: string, name: string, token: string): Promise<void> => {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  const transporter = getTransporter();

  const subject = 'Verify your email address';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
      <h2 style="color: #0f172a;">Welcome to ProjectFlow, ${name}!</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">If the button above doesn't work, copy and paste this link in your browser:</p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject,
        html,
      });
      console.log(`[Email] Verification email sent to ${email}`);
    } catch (err) {
      console.error(`[Email SMTP Error] Failed to send verification mail to ${email}:`, err);
      logDevEmailBackup(email, verifyUrl, 'Verification');
    }
  } else {
    logDevEmailBackup(email, verifyUrl, 'Verification');
  }
};

/**
 * Sends a password reset recovery link to the user.
 */
export const sendPasswordResetEmail = async (email: string, name: string, token: string): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const transporter = getTransporter();

  const subject = 'Reset your password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
      <h2 style="color: #0f172a;">Hello, ${name}</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to choose a new password. This link is valid for 1 hour:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">If you did not request a password reset, you can safely ignore this email.</p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject,
        html,
      });
      console.log(`[Email] Password reset email sent to ${email}`);
    } catch (err) {
      console.error(`[Email SMTP Error] Failed to send password reset mail to ${email}:`, err);
      logDevEmailBackup(email, resetUrl, 'Password Reset');
    }
  } else {
    logDevEmailBackup(email, resetUrl, 'Password Reset');
  }
};
