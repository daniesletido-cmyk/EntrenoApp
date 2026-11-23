export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: "athlete" | "coach" | "owner";
  
  // Parámetros Fisiológicos y VAM
  weight_kg: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  vam_pace: string;
  vam_sec_km: number;
  
  // Objetivos y Planificación
  target_distance: string; // '10K' | '21K' | '42K' | 'Fitness'
  target_date: string | null;
  target_pace: string | null;
  days_per_week: number;
  disciplines: string[];
  
  // Conector Universal
  webhook_token: string;
  
  // Estado de Onboarding
  onboarded: boolean;
  
  created_at: string;
  updated_at: string;
}
