import { supabase } from "../config/supabase.js";


export async function getPosts() {

    const {
        data,
        error
    } = await supabase

        .from("security_posts")

        .select(`
            *,
            clients (
                id,
                client_name,
                contact_person,
                phone,
                email
            )
        `)

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Error loading security posts:",
            error
        );

        throw error;

    }


    return data || [];

}