import { supabase } from "../config/supabase.js";

export async function getApplicationStatus(trackingCode) {
    const { data, error } = await supabase.rpc(
        "get_recruitment_application_status",
        { tracking_code_input: trackingCode }
    );

    if (error) {
        throw error;
    }

    return data?.[0] || null;
}
