import { supabase } from "../config/supabase.js";


export async function addClient(clientData) {

    const {
        data,
        error
    } = await supabase

        .from("clients")

        .insert({

            client_name:
                clientData.client_name,

            contact_person:
                clientData.contact_person || null,

            phone:
                clientData.phone || null,

            email:
                clientData.email || null,

            address:
                clientData.address || null,

            county:
                clientData.county || null,

            business_type:
                clientData.business_type || null,

            notes:
                clientData.notes || null,

            status:
                clientData.status || "Active"

        })

        .select()

        .single();


    if (error) {

        console.error(
            "Error adding client:",
            error
        );

        throw error;

    }


    return data;

}