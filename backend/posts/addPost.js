import { supabase } from "../config/supabase.js";


export async function addPost(postData) {

    const {
        data,
        error
    } = await supabase

        .from("security_posts")

        .insert({

            client_id:
                postData.client_id || null,

            post_name:
                postData.post_name,

            location:
                postData.location,

            county:
                postData.county || null,

            required_officers:
                postData.required_officers || 1,

            shift_system:
                postData.shift_system || "2 Shifts",

            shift_one_start:
                postData.shift_one_start || null,

            shift_one_end:
                postData.shift_one_end || null,

            shift_two_start:
                postData.shift_two_start || null,

            shift_two_end:
                postData.shift_two_end || null,

            shift_three_start:
                postData.shift_three_start || null,

            shift_three_end:
                postData.shift_three_end || null,

            post_supervisor_id:
                postData.post_supervisor_id || null,

            service_start_date:
                postData.service_start_date || null,

            service_end_date:
                postData.service_end_date || null,

            status:
                postData.status || "Active",

            special_instructions:
                postData.special_instructions || null

        })

        .select()

        .single();


    if (error) {

        console.error(
            "Error adding security post:",
            error
        );

        throw error;

    }


    return data;

}