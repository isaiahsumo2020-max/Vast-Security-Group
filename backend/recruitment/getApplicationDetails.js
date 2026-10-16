import {
    supabase
} from "../config/supabase.js";


/* =========================================================
   GET SINGLE APPLICATION DETAILS
========================================================= */

export async function getApplicationDetails(
    applicationID
){

    const {

        data: application,

        error: applicationError

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

        .eq(
            "id",
            applicationID
        )

        .single();


    if(applicationError){

        throw applicationError;

    }



    const {

        data: documents,

        error: documentsError

    } = await supabase

        .from(
            "recruitment_documents"
        )

        .select(
            `
            id,
            document_type,
            file_name,
            file_url,
            file_size,
            mime_type,
            is_required,
            created_at
            `
        )

        .eq(
            "application_id",
            applicationID
        )

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if(documentsError){

        throw documentsError;

    }


    return {

        application,

        documents:
            documents || []

    };

}