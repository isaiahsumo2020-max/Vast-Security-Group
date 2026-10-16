import {
    supabase
} from "../config/supabase.js";


/* =========================================================
   GET APPLICANT COMMUNICATIONS
========================================================= */

export async function getApplicantCommunications(
    applicationID
){

    const {

        data,

        error

    } = await supabase

        .from(
            "recruitment_communications"
        )

        .select("*")

        .eq(
            "application_id",
            applicationID
        )

        .order(
            "scheduled_date",
            {
                ascending: false
            }
        );


    if(error){

        console.error(
            "Error loading communications:",
            error
        );

        throw error;

    }


    return data || [];

}



/* =========================================================
   ADD COMMUNICATION
========================================================= */

export async function addCommunication(
    communicationData
){

    const {

        data,

        error

    } = await supabase

        .from(
            "recruitment_communications"
        )

        .insert(
            communicationData
        )

        .select()

        .single();


    if(error){

        console.error(
            "Error creating communication:",
            error
        );

        throw error;

    }


    return data;

}



/* =========================================================
   UPDATE COMMUNICATION
========================================================= */

export async function updateCommunication(
    communicationID,
    updates
){

    const {

        data,

        error

    } = await supabase

        .from(
            "recruitment_communications"
        )

        .update({

            ...updates,

            updated_at:
                new Date()
                .toISOString()

        })

        .eq(
            "id",
            communicationID
        )

        .select()

        .single();


    if(error){

        console.error(
            "Error updating communication:",
            error
        );

        throw error;

    }


    return data;

}