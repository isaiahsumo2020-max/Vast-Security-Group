import { supabase } from "../config/supabase.js";

export async function updateAssignment(assignmentId, updates) {

    // Get the existing assignment
    const { data: existing, error: existingError } = await supabase
        .from("security_post_assignments")
        .select("id, post_id, officer_id")
        .eq("id", assignmentId)
        .single();

    if (existingError) {
        console.error("Error loading assignment:", existingError);
        throw existingError;
    }

    // Check whether this officer already has this shift
    const { data: duplicate, error: duplicateError } = await supabase
        .from("security_post_assignments")
        .select("id")
        .eq("post_id", existing.post_id)
        .eq("officer_id", existing.officer_id)
        .eq("shift_number", Number(updates.shift_number))
        .neq("id", assignmentId)
        .maybeSingle();

    if (duplicateError) {
        console.error("Error checking assignment conflict:", duplicateError);
        throw duplicateError;
    }

    if (duplicate) {
        throw new Error(
            "This officer is already assigned to this shift."
        );
    }

    const { data, error } = await supabase
        .from("security_post_assignments")
        .update({
            shift_number: Number(updates.shift_number),
            assignment_status:
                updates.assignment_status || "Active",
            assigned_date:
                updates.assigned_date || null,
            end_date:
                updates.end_date || null,
            notes:
                updates.notes || null,
            updated_at:
                new Date().toISOString()
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
        console.error("Error updating assignment:", error);
        throw error;
    }

    return data;
}