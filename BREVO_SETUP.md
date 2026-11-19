# Brevo Email Provider Setup for Sorsu: PrintAhead

This guide details how to connect [Brevo](https://www.brevo.com/) (formerly Sendinblue) as the official transactional email provider for **Sorsu: PrintAhead** (SorSU-Bulan Campus).

---

## 1. Obtain Your Brevo API Key

1. Sign up or log into [Brevo](https://app.brevo.com/).
2. In the top-right account menu, navigate to **SMTP & API** (or go to `https://app.brevo.com/settings/keys/api`).
3. Under the **API Keys** tab, click **Generate a new API key**.
4. Name the key (e.g., `sorsu-printahead-production`).
5. Copy the generated key (it starts with `xkeysib-...`).

---

## 2. Configure Your Verified Sender in Brevo

1. In Brevo, go to **Senders, Domains & Dedicated IPs** &rarr; **Senders**.
2. Add your sender email (e.g. `printahead-noreply@sorsu.edu.ph` or your verified university domain email).
3. Complete the email verification link sent by Brevo.

---

## 3. Configure Environment Variables

Add the following variables to your `.env` file (or host environment variables):

```env
# Brevo Transactional Email Configuration
BREVO_API_KEY="xkeysib-your-actual-api-key-here"
BREVO_SENDER_EMAIL="your-verified-sender@domain.com"
BREVO_SENDER_NAME="SorSU: PrintAhead (Bulan Campus)"
```

---

## 4. How It Works

- When `BREVO_API_KEY` is present, all status transitions (**Pending Review**, **Reviewed / Awaiting Payment**, **Printing**, **Ready for Delivery**, **Out for Delivery**, **Completed**, and **Cancelled**) are dispatched in real time via Brevo's REST API endpoint (`https://api.brevo.com/v3/smtp/email`).
- The emails include university maroon branding, formatted tabular details, and unique reference tracking.
- Every email sent via Brevo generates a verifiable `messageId` that is recorded in the **Email Notifications (UC5)** audit outbox log.
- If `BREVO_API_KEY` is not yet configured, the system operates in **Simulation / Standby Mode**, recording all outbound emails in the audit log so you can test all workflows without disruptions.

---

## 5. Troubleshooting: "api key is not authorized for resource 'transactional.email'"

If you encounter this error from Brevo:
```json
{"message":"api key is not authorized for resource \"transactional.email\"","code":"permission_denied"}
```

### Cause:
The Brevo API key was generated with restricted or custom scopes that do not include the **Transactional Emails** permission (e.g. only Marketing or Contacts permissions were checked), or your Brevo account has not yet enabled Transactional Emails.

### Resolution Steps:
1. Log into your [Brevo Dashboard](https://app.brevo.com/).
2. Click your account name at the top right &rarr; select **SMTP & API**.
3. Under the **API Keys** tab:
   - Click **Generate a new API key**.
   - Make sure to check **Full Access** or explicitly check the **Transactional** &rarr; **Transactional Email** permission checkbox.
4. Copy the new API key (`xkeysib-...`).
5. Update `BREVO_API_KEY` in your environment / secrets.
6. Also verify that your sender email address (under **Senders, Domains & Dedicated IPs** &rarr; **Senders**) is verified by Brevo.

