import { supabase } from "../config/supabase.js";

export async function getAssignments(postId) {

    const {
        data,
        error
    } = await supabase
        .from("security_post_assignments")
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
        .eq("post_id", postId)
        .order("shift_number", {
            ascending: true
        });

    if (error) {

        console.error(
            "Error loading assignments:",
            error
        );

        throw error;
    }

    return data || [];
}