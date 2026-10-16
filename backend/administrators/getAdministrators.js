import { supabase } from "../config/supabase.js";

export async function getAdministrators() {
    const { data, error } = await supabase
        .from("admin_profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading administrators:", error);
        throw error;
    }

    return data || [];
}