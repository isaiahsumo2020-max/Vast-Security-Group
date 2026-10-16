import { apiRequest } from "../services/api.js";

export async function deleteApplication(applicationID) {
    if (!applicationID) {
        throw new Error("Application ID is required.");
    }

    return apiRequest(
        `/recruitment-applications/${encodeURIComponent(applicationID)}`,
        { method: "DELETE" }
    );
}
