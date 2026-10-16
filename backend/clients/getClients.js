import { supabase } from "../config/supabase.js";


export async function getClients() {

    const {
        data,
        error
    } = await supabase

        .from("clients")

        .select("*")

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Error loading clients:",
            error
        );

        throw error;

    }


    return data || [];

}