import {
    supabase
} from "../config/supabase.js";


/* =========================================================
   GET ALL RECRUITMENT APPLICATIONS
========================================================= */

export async function getApplications(){

    const {

        data,

        error

    } = await supabase

        .from(
            "recruitment_applications"
        )

        .select(
            `
            id,
            full_name,
            phone,
            email,
            gender,
            address,
            county,
            position_id,
            position_name,
            application_letter_type,
            application_letter_text,
            photo_url,
            status,
            admin_notes,
            created_at,
            updated_at
            `
        )

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if(error){

        console.error(
            "Error loading applications:",
            error
        );

        throw error;

    }


    return data || [];

}