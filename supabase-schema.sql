-- ========================================================================
-- Sorsu: PrintAhead - Supabase Database Schema & Storage Configuration
-- Campus: Sorsogon State University (SorSU) - Bulan Campus
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role_type AS ENUM ('admin', 'student', 'print_shop_staff', 'student_runner');

CREATE TYPE print_status_type AS ENUM (
  'Pending Review',
  'Reviewed / Awaiting Payment',
  'Printing',
  'Ready for Delivery',
  'Out for Delivery',
  'Completed',
  'Cancelled'
);

CREATE TYPE delivery_status_type AS ENUM (
  'Assigned',
  'Out for Delivery',
  'Delivered'
);

CREATE TYPE payment_status_type AS ENUM (
  'Pending',
  'Confirmed'
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role_type NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email & role for quick auth lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 1B. PRINTING SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.print_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  operating_hours VARCHAR(100) DEFAULT '7:30 AM - 5:00 PM',
  contact_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRINT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.print_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.print_shops(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  room_number VARCHAR(100) NOT NULL,
  instruction_message TEXT,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT DEFAULT 0,
  status print_status_type NOT NULL DEFAULT 'Pending Review',
  print_price NUMERIC(10, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_requests_student_id ON public.print_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_print_requests_status ON public.print_requests(status);
CREATE INDEX IF NOT EXISTS idx_print_requests_reference ON public.print_requests(reference_number);

-- 4. DELIVERY JOBS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  print_request_id UUID NOT NULL REFERENCES public.print_requests(id) ON DELETE CASCADE,
  runner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_status delivery_status_type NOT NULL DEFAULT 'Out for Delivery',
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_request ON public.delivery_jobs(print_request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_runner ON public.delivery_jobs(runner_id);

-- 5. PAYMENTS TABLE (Strictly Cash on Delivery)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  print_request_id UUID NOT NULL REFERENCES public.print_requests(id) ON DELETE CASCADE,
  runner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
  payment_status payment_status_type NOT NULL DEFAULT 'Confirmed',
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_request ON public.payments(print_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_runner ON public.payments(runner_id);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  print_request_id UUID REFERENCES public.print_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- 7. SUPABASE STORAGE: BUCKET FOR DOCUMENTS
-- Run in Supabase SQL editor to create the storage bucket:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print-documents',
  'print-documents',
  false,
  26214400, -- 25MB max
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own profile or staff/runners can read related profiles"
  ON public.users FOR SELECT
  USING (true);

-- Print requests table policies
-- Students can only access their own requests
CREATE POLICY "Students can view own requests"
  ON public.print_requests FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('print_shop_staff', 'student_runner'))
  );

-- Students can insert their own print request
CREATE POLICY "Students can insert print request"
  ON public.print_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
  );

-- Students can cancel only their own eligible request before printing
CREATE POLICY "Students can cancel eligible request"
  ON public.print_requests FOR UPDATE
  USING (
    student_id = auth.uid() AND status IN ('Pending Review', 'Reviewed / Awaiting Payment')
  );

-- Staff can update print request status and price
CREATE POLICY "Staff can update request status and price"
  ON public.print_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'print_shop_staff')
  );

-- Runners can update request status when claiming or completing
CREATE POLICY "Runners can update request status on delivery"
  ON public.print_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student_runner')
  );

-- Delivery Jobs Policies
CREATE POLICY "Delivery jobs visibility"
  ON public.delivery_jobs FOR SELECT
  USING (
    runner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('print_shop_staff', 'student'))
  );

CREATE POLICY "Runners can claim delivery jobs"
  ON public.delivery_jobs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student_runner')
  );

-- Payments Policies
CREATE POLICY "Payments visibility"
  ON public.payments FOR SELECT
  USING (true);

CREATE POLICY "Runners can confirm cash payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student_runner')
  );

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Storage bucket access policies
CREATE POLICY "Authenticated users can upload print documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'print-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Staff, runners, and owners can view document"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'print-documents');

-- 9. INITIAL SEED DATA FOR SORSU-BULAN CAMPUS
INSERT INTO public.print_shops (id, name, location, operating_hours, contact_email, is_active) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'SorSU-Bulan Main Print Shop', 'Ground Floor, Administration Building', '7:30 AM - 5:00 PM (Mon-Fri)', 'staff.printshop@sorsu.edu.ph', true),
  ('b2222222-2222-2222-2222-222222222222', 'IT Building Print Kiosk', 'Lobby, IT & Computer Studies Building', '8:00 AM - 4:30 PM (Mon-Fri)', 'kiosk.it@sorsu.edu.ph', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, full_name, email, role) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Campus System Administrator', 'admin@sorsu.edu.ph', 'admin'),
  ('a1111111-1111-1111-1111-111111111111', 'Juan Dela Cruz', 'juan.delacruz@sorsu.edu.ph', 'student'),
  ('a2222222-2222-2222-2222-222222222222', 'Maria Santos (Print Shop)', 'staff.printshop@sorsu.edu.ph', 'print_shop_staff'),
  ('a3333333-3333-3333-3333-333333333333', 'Carlos Reyes (Runner)', 'carlos.runner@sorsu.edu.ph', 'student_runner')
ON CONFLICT (email) DO NOTHING;
