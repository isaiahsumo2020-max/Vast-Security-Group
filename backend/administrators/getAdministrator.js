import { supabase } from "../config/supabase.js";

export async function getAdministrator(userId) {
    const { data, error } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error) {
        console.error("Error loading administrator:", error);
        throw error;
    }

    return data;
}