import nodemailer from "nodemailer";
import { getAppUrl, requireEnv } from "@/utils/env/appEnv";
import { formatPeso } from "@/lib/pricing";
import { formatManilaDateTime } from "@/lib/time";

type BookingEmail = {
  customerName: string;
  endAt: string;
  startAt: string;
  to: string;
  totalAmount: number;
  courtName: string;
};

function getTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_APP_PASSWORD"),
    },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "Dink Lab";
}

function shell(title: string, body: string) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
      <tr>
        <td align="center" style="padding:18px 10px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;margin:0 auto;border:1px solid #e4e4e7;border-radius:18px;background:#ffffff;border-collapse:separate;border-spacing:0;overflow:hidden">
            <tr>
              <td style="padding:30px 24px">
                <p style="margin:0 0 10px;color:#71717a;font-size:12px;letter-spacing:3px;text-transform:uppercase">Dink Lab</p>
                <h1 style="margin:0 0 18px;font-size:32px;line-height:1.16;color:#18181b">${title}</h1>
                ${body}
                <p style="margin:28px 0 0;color:#71717a;font-size:12px;line-height:1.6">This is an automated booking email from Dink Lab.</p>
                <p style="margin:8px 0 0;color:#71717a;font-size:12px;line-height:1.6">Developed by <a href="https://andrewvillalon.online" style="color:#18181b;font-weight:700;text-decoration:none">Andrew R. Villalon</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function bookingRows(booking: BookingEmail) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:22px 0;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0">
      ${row("Court", booking.courtName)}
      ${row("Starts", formatManilaDateTime(booking.startAt))}
      ${row("Ends", formatManilaDateTime(booking.endAt))}
      ${row("Total", formatPeso(booking.totalAmount))}
    </table>
  `;
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="width:34%;padding:15px 16px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:14px;line-height:1.45;vertical-align:top;white-space:nowrap">${label}</td>
      <td style="width:66%;padding:15px 16px;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:15px;line-height:1.45;font-weight:700;text-align:right;vertical-align:top">${value}</td>
    </tr>
  `;
}

export async function sendAcceptanceEmail(booking: BookingEmail) {
  await getTransporter().sendMail({
    from: getFromAddress(),
    to: booking.to,
    subject: "Your Dink Lab booking was accepted",
    text: [
      `Hi ${booking.customerName},`,
      "",
      "Your Dink Lab booking has been accepted.",
      `Court: ${booking.courtName}`,
      `Starts: ${formatManilaDateTime(booking.startAt)}`,
      `Ends: ${formatManilaDateTime(booking.endAt)}`,
      `Total: ${formatPeso(booking.totalAmount)}`,
      "",
      getAppUrl(),
      "Developed by Andrew R. Villalon - https://andrewvillalon.online",
    ].join("\n"),
    html: shell(
      "Booking accepted",
      `
        <p style="margin:0;color:#3f3f46;font-size:16px;line-height:1.7">Hi ${booking.customerName}, your booking has been accepted. Your slot is now reserved.</p>
        ${bookingRows(booking)}
        <a href="${getAppUrl()}" style="display:inline-block;margin-top:4px;border-radius:12px;background:#18181b;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:800">View Dink Lab</a>
      `,
    ),
  });
}

export async function sendReminderEmail(booking: BookingEmail) {
  await getTransporter().sendMail({
    from: getFromAddress(),
    to: booking.to,
    subject: "Reminder: your Dink Lab booking is tomorrow",
    text: [
      `Hi ${booking.customerName},`,
      "",
      "This is a reminder for your upcoming Dink Lab booking.",
      `Court: ${booking.courtName}`,
      `Starts: ${formatManilaDateTime(booking.startAt)}`,
      `Ends: ${formatManilaDateTime(booking.endAt)}`,
      "",
      getAppUrl(),
      "Developed by Andrew R. Villalon - https://andrewvillalon.online",
    ].join("\n"),
    html: shell(
      "Booking reminder",
      `
        <p style="margin:0;color:#3f3f46;font-size:16px;line-height:1.7">Hi ${booking.customerName}, this is your reminder for your upcoming Dink Lab booking.</p>
        ${bookingRows(booking)}
        <a href="${getAppUrl()}" style="display:inline-block;margin-top:4px;border-radius:12px;background:#18181b;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:800">View Dink Lab</a>
      `,
    ),
  });
}
