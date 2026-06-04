import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'nakes' | 'admin' | 'public';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  faskes_name: string;
  created_at: string;
}

export interface Patient {
  id: string;
  nik: string;
  full_name: string;
  birth_date: string;
  gender: 'L' | 'P';
  address: string;
  bpjs_number: string;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  visit_date: string;
  blood_pressure: string;
  temperature: number;
  respiratory_rate: number;
  chief_complaint: string;
  symptom_duration: string;
  notes: string;
  status: 'pending' | 'triaged' | 'completed' | 'referred' | 'tele_expert';
  icd10_code: string;
  icd10_description: string;
  bpjs_claimed: boolean;
  created_by: string;
  created_at: string;
}

export interface TriageResult {
  id: string;
  record_id: string;
  icd10_code: string;
  icd10_description: string;
  probability: number;
  recommendation: string;
  basis_rule: string;
  ml_version: string;
  created_at: string;
}

export interface DiseaseStats {
  id: string;
  region: string;
  disease_name: string;
  icd10_code: string;
  case_count: number;
  period_month: number;
  period_year: number;
  data_source: string;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface DiseaseAlert {
  id: string;
  disease_name: string;
  icd10_code: string;
  alert_level: 'info' | 'warning' | 'critical';
  message: string;
  is_active: boolean;
  created_at: string;
}

export interface LiteracyContent {
  id: string;
  title: string;
  content_type: 'article' | 'video' | 'infographic' | 'directory';
  category: string;
  body_html: string;
  thumbnail_url: string;
  video_url: string;
  is_featured: boolean;
  is_active: boolean;
  priority_order: number;
  related_alert_id: string | null;
  created_at: string;
}
