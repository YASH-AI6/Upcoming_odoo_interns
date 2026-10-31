import nodemailer from "nodemailer";
import { env } from "../config/env";

const getTransporter = async () => {
  if (env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }

  // Use test account fallback if no explicit SMTP provided
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const transporter = await getTransporter();

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. This link is valid for 30 minutes and can only be used once:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `
  });
};

export const sendInvoiceEmail = async (
  email: string,
  invoiceNumber: string,
  pdfBuffer: Buffer
): Promise<void> => {
  const transporter = await getTransporter();

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: `Your Invoice ${invoiceNumber}`,
    text: `Please find attached your invoice ${invoiceNumber}.`,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });
};
