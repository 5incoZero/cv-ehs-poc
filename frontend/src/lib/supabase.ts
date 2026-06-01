import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type Alert = {
  id: string;
  violation_type: string;
  confidence: number;
  camera_id: string | null;
  created_at: string;
  snapshot_b64?: string;
};
