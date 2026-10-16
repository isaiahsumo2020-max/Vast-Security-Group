import { supabase } from "../config/supabase.js";

export async function assignOfficer(assignmentData) {

    const {
        data,
        error
    } = await supabase
        .from("security_post_assignments")
        .insert({

            post_id:
                assignmentData.post_id,

            officer_id:
                assignmentData.officer_id,

            shift_number:
                assignmentData.shift_number,

            assignment_status:
                assignmentData.assignment_status ||
                "Active",

            assigned_date:
                assignmentData.assigned_date ||
                new Date().toISOString().split("T")[0],

            end_date:
                assignmentData.end_date ||
                null,

            notes:
                assignmentData.notes ||
                null

        })
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

        console.error(
            "Error assigning officer:",
            error
        );

        throw error;
    }

    return data;
}