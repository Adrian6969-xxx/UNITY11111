/*
  # Mentawai Medical System - Initial Schema

  ## Overview
  Full schema for the Mentawai Smart Healthcare integrated platform covering:
  1. User roles (nakes/admin/public)
  2. Patient medical records (RME)
  3. Triage/ML classification results with ICD-10 codes
  4. Audit trail for medicolegal compliance
  5. Epidemiology disease alerts and statistics
  6. Literacy/education content with dynamic priority control

  ## Tables
  - `profiles` - Extended user data with roles
  - `patients` - Patient registry
  - `medical_records` - Electronic Medical Records (RME)
  - `triage_results` - ML classification outputs with ICD-10
  - `audit_trails` - Medicolegal action log
  - `disease_stats` - Epidemiology aggregated data per region
  - `disease_alerts` - Active outbreak alerts from Sektor 3
  - `literacy_content` - Education articles/videos for Sektor 4
  - `referrals` - Rujukan records to RSUD

  ## Security
  - RLS enabled on all tables
  - Role-based access: authenticated nakes, admin, public
*/

-- Profiles table extending auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'nakes' CHECK (role IN ('nakes', 'admin', 'public')),
  faskes_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Patients registry
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nik text UNIQUE,
  full_name text NOT NULL,
  birth_date date,
  gender text CHECK (gender IN ('L', 'P')),
  address text DEFAULT '',
  bpjs_number text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nakes can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

CREATE POLICY "Nakes can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

-- Electronic Medical Records (RME)
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  visit_date timestamptz DEFAULT now(),
  blood_pressure text DEFAULT '',
  temperature numeric(4,1),
  respiratory_rate integer,
  chief_complaint text NOT NULL DEFAULT '',
  symptom_duration text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triaged', 'completed', 'referred', 'tele_expert')),
  icd10_code text DEFAULT '',
  icd10_description text DEFAULT '',
  bpjs_claimed boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nakes can view medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

CREATE POLICY "Nakes can insert medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

CREATE POLICY "Nakes can update own medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

-- Triage ML results
CREATE TABLE IF NOT EXISTS triage_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES medical_records(id) ON DELETE CASCADE,
  icd10_code text NOT NULL,
  icd10_description text NOT NULL,
  probability numeric(5,2),
  recommendation text DEFAULT '',
  basis_rule text DEFAULT 'PPK Kemenkes',
  ml_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE triage_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nakes can view triage results"
  ON triage_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

CREATE POLICY "Nakes can insert triage results"
  ON triage_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

-- Audit Trail for medicolegal compliance
CREATE TABLE IF NOT EXISTS audit_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES medical_records(id),
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_name text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit trails"
  ON audit_trails FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Nakes can insert audit trails"
  ON audit_trails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES medical_records(id) ON DELETE CASCADE,
  referral_type text NOT NULL CHECK (referral_type IN ('tele_expert', 'physical')),
  reason text NOT NULL DEFAULT '',
  destination text DEFAULT 'RSUD Tuapejat',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'resolved')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nakes can view referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

CREATE POLICY "Nakes can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('nakes', 'admin'))
  );

-- Disease statistics per region (for heatmap and Sektor 3)
CREATE TABLE IF NOT EXISTS disease_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  disease_name text NOT NULL,
  icd10_code text DEFAULT '',
  case_count integer DEFAULT 0,
  period_month integer,
  period_year integer,
  data_source text DEFAULT 'Faskes Internal',
  lat numeric(9,6),
  lng numeric(9,6),
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disease_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view disease stats"
  ON disease_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert disease stats"
  ON disease_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Public anon can view disease stats for heatmap"
  ON disease_stats FOR SELECT
  TO anon
  USING (true);

-- Disease alerts from admin (triggers Sektor 4 dynamic content)
CREATE TABLE IF NOT EXISTS disease_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_name text NOT NULL,
  icd10_code text DEFAULT '',
  alert_level text DEFAULT 'warning' CHECK (alert_level IN ('info', 'warning', 'critical')),
  message text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE disease_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active alerts"
  ON disease_alerts FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view all alerts"
  ON disease_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert alerts"
  ON disease_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update alerts"
  ON disease_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Literacy content (dynamic, controlled by Sektor 3)
CREATE TABLE IF NOT EXISTS literacy_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_type text DEFAULT 'article' CHECK (content_type IN ('article', 'video', 'infographic', 'directory')),
  category text DEFAULT 'general',
  body_html text DEFAULT '',
  thumbnail_url text DEFAULT '',
  video_url text DEFAULT '',
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  priority_order integer DEFAULT 0,
  related_alert_id uuid REFERENCES disease_alerts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE literacy_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active literacy content"
  ON literacy_content FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view all literacy content"
  ON literacy_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert literacy content"
  ON literacy_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update literacy content"
  ON literacy_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Seed: Disease heatmap data for Mentawai islands
INSERT INTO disease_stats (region, disease_name, icd10_code, case_count, period_month, period_year, lat, lng, severity, data_source)
VALUES
  ('Siberut Utara', 'ISPA', 'J06.9', 142, 5, 2026, -1.2833, 98.9167, 'high', 'Faskes Internal'),
  ('Siberut Selatan', 'Diare', 'A09', 87, 5, 2026, -1.5833, 99.0833, 'medium', 'Faskes Internal'),
  ('Sipora Utara', 'Malaria', 'B54', 34, 5, 2026, -2.1667, 99.6167, 'high', 'Faskes Internal'),
  ('Sipora Selatan', 'Hipertensi', 'I10', 56, 5, 2026, -2.3333, 99.7333, 'medium', 'Faskes Internal'),
  ('Pagai Utara', 'ISPA', 'J06.9', 98, 5, 2026, -2.6167, 100.1333, 'medium', 'Faskes Internal'),
  ('Pagai Selatan', 'Diare', 'A09', 124, 5, 2026, -3.0167, 100.3167, 'critical', 'Faskes Internal'),
  ('Tuapejat', 'Dengue', 'A97', 22, 5, 2026, -2.2000, 99.6500, 'medium', 'Faskes Internal'),
  ('Muara Siberut', 'TB Paru', 'A15', 19, 5, 2026, -1.5500, 99.1833, 'medium', 'Faskes Internal')
ON CONFLICT DO NOTHING;

-- Seed: Active disease alert
INSERT INTO disease_alerts (disease_name, icd10_code, alert_level, message, is_active)
VALUES (
  'Diare Akut',
  'A09',
  'critical',
  'Peningkatan signifikan kasus diare akut terdeteksi di wilayah Pagai Selatan. Waspada kontaminasi air bersih. Segera terapkan protokol higienitas.',
  true
) ON CONFLICT DO NOTHING;

-- Seed: Literacy content
INSERT INTO literacy_content (title, content_type, category, body_html, is_featured, priority_order, thumbnail_url)
VALUES
  (
    'Cara Membuat Oralit di Rumah untuk Mengatasi Diare',
    'article',
    'diare',
    '<h2>Bahan yang Dibutuhkan</h2><p>1 liter air matang, 6 sendok teh gula, 1/2 sendok teh garam.</p><h2>Cara Membuat</h2><p>Campurkan semua bahan hingga larut sempurna. Minum sedikit-sedikit setiap 5-10 menit.</p><h2>Kapan Harus ke Puskesmas?</h2><p>Jika diare berlangsung lebih dari 3 hari, ada darah, atau anak tampak lemas dan tidak mau minum.</p>',
    true,
    1,
    'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg'
  ),
  (
    'Panduan Lengkap Berobat via Puskesmas Digital Mentawai',
    'video',
    'sistem',
    '<p>Tutorial lengkap cara menggunakan sistem puskesmas digital baru di Kepulauan Mentawai.</p>',
    true,
    2,
    'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg'
  ),
  (
    'Mengenal Gejala Malaria dan Cara Mencegahnya',
    'article',
    'malaria',
    '<h2>Gejala Utama</h2><p>Demam tinggi, menggigil, berkeringat, sakit kepala, nyeri otot. Gejala muncul 10-15 hari setelah gigitan nyamuk.</p><h2>Pencegahan</h2><p>Gunakan kelambu saat tidur, pakai lotion anti nyamuk, dan singkirkan genangan air di sekitar rumah.</p>',
    false,
    3,
    'https://images.pexels.com/photos/5863405/pexels-photo-5863405.jpeg'
  ),
  (
    'Pertolongan Pertama ISPA pada Anak',
    'article',
    'ispa',
    '<h2>Tanda-tanda ISPA</h2><p>Batuk, pilek, demam, hidung tersumbat, napas cepat.</p><h2>Yang Harus Dilakukan di Rumah</h2><p>Pastikan anak banyak minum, bersihkan hidung, dan jaga suhu ruangan tetap nyaman.</p>',
    false,
    4,
    'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg'
  )
ON CONFLICT DO NOTHING;
