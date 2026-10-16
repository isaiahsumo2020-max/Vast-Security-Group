import { getApiBaseUrl } from "../config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "../config/supabase.js";


/* =========================================================
   GET ACTIVE RECRUITMENT POSITIONS
========================================================= */

export async function getActivePositions(){
    const functionUrl = new URL(getApiBaseUrl());
    functionUrl.searchParams.set("path", "/public/recruitment-positions");
    const response = await fetch(functionUrl, {
        headers: { apikey: SUPABASE_ANON_KEY }
    });

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("Unable to read recruitment positions response.");
    }

    if (!response.ok) {
        throw new Error(
            result.message || "Unable to load recruitment positions."
        );
    }

    if (!Array.isArray(result.positions)) {
        throw new Error("The recruitment positions response is invalid.");
    }

    return result.positions;

}