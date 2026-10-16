import { supabase } from "../config/supabase.js";

export async function logoutAdmin() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        throw error;
    }

    return true;
}