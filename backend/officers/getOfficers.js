import { apiRequest } from "../services/api.js";

export async function getOfficers() {
    const result = await apiRequest("/officers");
    return result.officers || [];
}
