import { SUPABASE_URL } from "./supabase.js";

export function getApiBaseUrl() {
    return `${SUPABASE_URL}/functions/v1/admin-api`;
}
