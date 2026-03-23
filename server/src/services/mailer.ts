import nodemailer from 'nodemailer';

let transport: nodemailer.Transporter | null = null;

export function isMailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transport;
}

export async function sendReport(to: string, subject: string, htmlBody: string): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error('SMTP nicht konfiguriert');
  }
  await getTransport().sendMail({
    from: process.env.SMTP_FROM ?? 'Fairstand <noreply@fairstand.godsapp.de>',
    to,
    subject,
    html: htmlBody,
  });
}
