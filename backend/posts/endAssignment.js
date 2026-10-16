import { supabase } from "../config/supabase.js";

export async function endAssignment(assignmentId, endDate = null) {
    const { data, error } = await supabase
        .from("security_post_assignments")
        .update({
            assignment_status: "Ended",
            end_date: endDate || new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString()
        })
        .eq("id", assignmentId)
        .select(`
            *,
            officers (
                id,
                officer_id,
                name,
                phone,
                position,
                department,
                status
            )
        `)
        .single();

    if (error) {
        console.error("Error ending assignment:", error);
        throw error;
    }

    return data;
}