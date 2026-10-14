import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

function emailTemplate({ guideTitle, customerEmail, downloadUrl, successUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Body By Quinn Personalized Guide</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1a17;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px; background-color: #f7f4ef;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(28,26,23,0.08); border: 1px solid #e3dbcd;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #212121; padding: 36px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #d9a763; font-weight: 600;">
                BODY BY QUINN &middot; PERSONALIZED PLANS
              </p>
              <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #ffffff; letter-spacing: -0.5px;">
                Your Custom Plan is Ready
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3b35;">
                Hello,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #3f3b35;">
                Thank you for your order! Your responses have been processed, and we have generated your tailored copy of <strong style="color: #1c1a17;">${guideTitle}</strong>.
              </p>

              <!-- Order Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #efe5db; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e3dbcd;">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #726c62; font-weight: 600;">Document</p>
                    <p style="margin: 0 0 16px; font-size: 17px; font-weight: 600; color: #1c1a17;">${guideTitle}</p>

                    <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #726c62; font-weight: 600;">Format & Delivery</p>
                    <p style="margin: 0; font-size: 14px; color: #3f3b35;">Instant PDF Download &middot; Permanent Access Link</p>
                  </td>
                </tr>
              </table>

              <!-- Main CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: inline-block; padding: 16px 36px; background-color: #b5693f; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 10px; box-shadow: 0 6px 20px rgba(181, 105, 63, 0.35);">
                      Download Your Guide (PDF) &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary link / Access on Web -->
              <p style="margin: 0 0 28px; text-align: center; font-size: 13.5px; color: #726c62;">
                Or view your order page and re-download anytime:<br/>
                <a href="${successUrl}" style="color: #b5693f; text-decoration: underline; word-break: break-all;">
                  ${successUrl}
                </a>
              </p>

              <!-- Helpful Tips -->
              <div style="border-top: 1px solid #ece5d9; padding-top: 24px;">
                <p style="margin: 0 0 12px; font-size: 13.5px; font-weight: 600; color: #1c1a17;">
                  Important tips for getting started:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #726c62; line-height: 1.7;">
                  <li>Save the PDF directly to your mobile device or computer for instant offline access.</li>
                  <li>Carefully review the <strong>Week 1 baseline protocol</strong> before buying new products.</li>
                  <li>Keep this email saved in your records - your link is permanent.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7f4ef; border-top: 1px solid #e3dbcd; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #726c62;">
                Body By Quinn &middot; Personalized Guides Built for Your Life
              </p>
              <p style="margin: 0; font-size: 12px; color: #726c62;">
                Questions or need assistance? Reply directly to this email or visit <a href="https://plans.bodybyquinn.com" style="color: #b5693f; text-decoration: none;">plans.bodybyquinn.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendGuideDeliveryEmail({ toEmail, guideTitle, downloadUrl, successUrl }) {
  if (!toEmail || !toEmail.includes("@")) {
    console.warn("No valid email provided for guide delivery email:", toEmail);
    return;
  }

  const fromName = process.env.FROM_NAME || "Body By Quinn";
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_EMAIL;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail.trim(),
    subject: `Your Personalized ${guideTitle} is Ready (Download Link)`,
    html: emailTemplate({ guideTitle, customerEmail: toEmail, downloadUrl, successUrl }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Guide delivery email sent successfully to", toEmail, "MessageId:", info.messageId);
    return info;
  } catch (err) {
    console.error("Failed to send guide delivery email to", toEmail, err);
    throw err;
  }
}
