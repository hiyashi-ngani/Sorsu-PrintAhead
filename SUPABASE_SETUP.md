# Supabase Setup Guide for Sorsu: PrintAhead

This document provides instructions for setting up your Supabase project for **Sorsu: PrintAhead** (SorSU-Bulan Campus Printing & Delivery System).

---

## 1. Database Schema Execution

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project named `sorsu-printahead`.
3. Navigate to **SQL Editor** in the left sidebar.
4. Open or copy the contents of `supabase-schema.sql` from this repository.
5. Click **Run** to execute the script.
   - This creates the 5 core tables (`users`, `print_requests`, `delivery_jobs`, `payments`, `notifications`).
   - It sets up foreign key relations, timestamps, indexes, and Row-Level Security (RLS) policies.
   - It seeds default institutional accounts for Student, Staff, and Runner.

---

## 2. Supabase Storage Configuration

1. In the Supabase Dashboard, go to **Storage**.
2. If not automatically created by the SQL script, click **New Bucket**:
   - **Bucket Name**: `print-documents`
   - **Public bucket**: `Off` (Private bucket for student privacy)
   - **Allowed MIME types**: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, image/png, image/jpeg`
   - **File size limit**: `25 MB`
3. Storage policies are already included in `supabase-schema.sql`.

---

## 3. Environment Variables Configuration

In your project root, configure your `.env` file (or set variables in deployment):

```env
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# SorSU Identity Provider & Email Notification Service
SORSU_DOMAIN="sorsu.edu.ph"
EMAIL_NOTIFICATION_SENDER="printahead-noreply@sorsu.edu.ph"
```

> **Note on Resiliency:** If `SUPABASE_URL` is not provided, the Express backend automatically runs with an embedded persistent database engine. All 11 use cases work out-of-the-box seamlessly!
