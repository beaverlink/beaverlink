import nodemailer from 'nodemailer'

const frontendURL = process.env.FRONTEND_URL

interface PasswordResetEmail {
  email: string
  token: string
}

function smtpIsConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM,
  )
}

export async function sendPasswordResetEmail({
  email,
  token,
}: PasswordResetEmail): Promise<void> {
  if (!smtpIsConfigured()) {
    // Deliberately do not log or expose reset tokens/links.
    console.warn(
      'Password reset email not sent: SMTP is not configured',
    )
    return
  }

  if (!frontendURL) {
    throw new Error('FRONTEND_URL is not configured')
  }

  const resetURL = new URL('/reset-password', frontendURL)
  resetURL.searchParams.set('token', token)

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your BeaverLink password',
    text: `Reset your BeaverLink password using this link:\n${resetURL.toString()}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
  })
}
