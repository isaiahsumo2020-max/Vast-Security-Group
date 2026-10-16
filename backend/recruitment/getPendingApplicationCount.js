import { supabase } from "../config/supabase.js";

export async function getPendingApplicationCount() {
    const { count, error } = await supabase
        .from("recruitment_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending");

    if (error) {
        console.error("Error loading pending application count:", error);
        throw error;
    }

    return count ?? 0;
}
