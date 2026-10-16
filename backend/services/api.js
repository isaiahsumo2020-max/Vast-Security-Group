import { getCurrentSession } from "../auth/session.js";
import { getApiBaseUrl } from "../config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "../config/supabase.js";

export async function apiRequest(endpoint, options = {}) {
    const session = await getCurrentSession();

    if (!session?.access_token) {
        throw new Error("Authentication required.");
    }

    const functionUrl = new URL(getApiBaseUrl());
    functionUrl.searchParams.set("path", endpoint);

    const headers = {
        ...(options.headers || {}),
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
    };
    const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

    if (isFormData) {
        delete headers["Content-Type"];
        delete headers["content-type"];
    } else {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(functionUrl, {
        ...options,
        headers
    });

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Request failed."
        );
    }

    return result;
}