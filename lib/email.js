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
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your Body By Quinn Personalized Guide</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f7f4ef; }

    @media only screen and (max-width: 600px) {
      .outer-wrap { padding: 12px 8px !important; }
      .email-card { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .header-cell { padding: 28px 20px !important; }
      .header-title { font-size: 21px !important; }
      .body-cell { padding: 28px 20px !important; }
      .summary-box { padding: 16px 18px !important; }
      .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 16px 20px !important; }
      .footer-cell { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1a17;">
  <table width="100%" cellpadding="0" cellspacing="0" class="outer-wrap" style="padding: 36px 12px; background-color: #f7f4ef;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="600" cellpadding="0" cellspacing="0" class="email-card" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 32px rgba(28,26,23,0.08); border: 1px solid #e3dbcd;">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-cell" style="background-color: #212121; padding: 34px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #d9a763; font-weight: 600;">
                BODY BY QUINN &middot; PERSONALIZED PLANS
              </p>
              <h1 class="header-title" style="margin: 0; font-size: 24px; font-weight: 500; color: #ffffff; letter-spacing: -0.5px;">
                Your Custom Plan is Ready
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="body-cell" style="padding: 38px 40px;">
              <p style="margin: 0 0 14px; font-size: 15.5px; line-height: 1.6; color: #3f3b35;">
                Hello,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #3f3b35;">
                Thank you for your order. Your questionnaire responses have been processed, and your tailored copy of <strong style="color: #1c1a17;">${guideTitle}</strong> has been generated and is ready for download.
              </p>

              <!-- Order Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" class="summary-box" style="background-color: #efe5db; border-radius: 12px; padding: 18px 22px; margin-bottom: 26px; border: 1px solid #e3dbcd;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #726c62; font-weight: 600;">Document</p>
                    <p style="margin: 0 0 14px; font-size: 16.5px; font-weight: 600; color: #1c1a17;">${guideTitle}</p>

                    <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #726c62; font-weight: 600;">Delivery & Access</p>
                    <p style="margin: 0; font-size: 13.5px; color: #3f3b35;">Instant PDF Download &middot; Permanent Online Reference</p>
                  </td>
                </tr>
              </table>

              <!-- Main CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" class="cta-button" style="display: inline-block; padding: 15px 36px; background-color: #b5693f; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 10px; box-shadow: 0 6px 18px rgba(181, 105, 63, 0.3);">
                      Download Your Guide (PDF) &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary Link -->
              <p style="margin: 0 0 28px; text-align: center; font-size: 13px; color: #726c62; line-height: 1.6;">
                You can also view your verified order page online:<br/>
                <a href="${successUrl}" style="color: #b5693f; text-decoration: underline; word-break: break-all;">
                  ${successUrl}
                </a>
              </p>

              <!-- Helpful Tips -->
              <div style="border-top: 1px solid #ece5d9; padding-top: 22px;">
                <p style="margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: #1c1a17;">
                  Key steps for getting started:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #726c62; line-height: 1.7;">
                  <li>Save the PDF directly to your files or mobile device for convenient offline access.</li>
                  <li>Review the <strong>Week 1 baseline protocol</strong> before buying new products.</li>
                  <li>Keep this email in your records; your download link remains permanently available.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-cell" style="background-color: #f7f4ef; border-top: 1px solid #e3dbcd; padding: 22px 32px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #726c62;">
                Body By Quinn &middot; Personalized Guides
              </p>
              <p style="margin: 0; font-size: 12px; color: #726c62;">
                Need help or have questions? Contact us at <a href="mailto:support@bodybyquinn.com" style="color: #b5693f; text-decoration: none;">support@bodybyquinn.com</a>
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

  const fromName = process.env.FROM_NAME || "Quins";
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
