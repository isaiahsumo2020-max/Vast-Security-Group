import {
    supabase,
    SUPABASE_ANON_KEY
} from "../config/supabase.js";
import { getApiBaseUrl } from "../config/apiUrl.js";

export async function getCurrentSession() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        throw error;
    }

    return session;
}

export async function getCurrentAdmin() {
    const session = await getCurrentSession();

    if (!session?.user) {
        return null;
    }

    let response;

    try {
        const functionUrl = new URL(getApiBaseUrl());
        functionUrl.searchParams.set("path", "/auth/session");

        response = await fetch(functionUrl, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`
            }
        });
    } catch (error) {
        console.error("Administrator session request failed:", error);
        throw new Error(
            "The Supabase admin function could not be reached. Verify that the admin-api Edge Function is deployed to the configured Supabase project."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error("Unable to verify administrator access.");
    }

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "The Supabase admin-api Edge Function is not deployed to the configured project yet."
                : result.message || "Unable to verify administrator access."
        );
    }

    return {
        user: result.user,
        profile: result.profile
    };
}