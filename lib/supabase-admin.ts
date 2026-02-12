/**
 * lib/supabase-admin.ts
 * 서버 사이드 Supabase 클라이언트 (Service Role Key)
 */
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
