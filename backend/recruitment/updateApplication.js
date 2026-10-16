import {
    supabase
} from "../config/supabase.js";


/* =========================================================
   UPDATE APPLICATION
========================================================= */

export async function updateApplication(
    applicationID,
    updates
){

    const {

        data,

        error

    } = await supabase

        .from(
            "recruitment_applications"
        )

        .update({

            ...updates,

            updated_at:
                new Date()
                .toISOString()

        })

        .eq(
            "id",
            applicationID
        )

        .select()

        .single();


    if(error){

        console.error(
            "Error updating application:",
            error
        );

        throw error;

    }


    return data;

}