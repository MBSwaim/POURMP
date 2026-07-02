import { getSetting } from './db'

export interface DeliveryPayload {
  message: string
  recipientPhone: string
  recipientEmail: string
}

/**
 * Delivery order: in-app (the notifications row itself — already persisted by the time this
 * runs) → SMS → Email backup. SMS and Email are off by default and are no-op stubs until a
 * provider is wired in; toggled in Settings.
 */
export function deliverNotification(payload: DeliveryPayload): void {
  if (getSetting('notif_sms_enabled', 'false') === 'true' && payload.recipientPhone) {
    sendSmsStub(payload.recipientPhone, payload.message)
  }
  if (getSetting('notif_email_enabled', 'false') === 'true' && payload.recipientEmail) {
    sendEmailStub(payload.recipientEmail, payload.message)
  }
}

// TODO: replace with a real Twilio client (accountSid/authToken/from number via env vars).
function sendSmsStub(phone: string, message: string): void {
  console.log(`[SMS stub] → ${phone}: ${message}`)
}

// TODO: replace with a real email provider (e.g. Resend/SendGrid).
function sendEmailStub(email: string, message: string): void {
  console.log(`[Email stub] → ${email}: ${message}`)
}
