import "server-only";
import { cache } from "react";
import { createClient } from "@/src/utils/supabase/server";

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  scope: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export const getFeatureFlags = cache(async (): Promise<FeatureFlag[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("*").order("key");
  return data ?? [];
});

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  return data?.enabled ?? false;
}
