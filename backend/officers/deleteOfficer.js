import { supabase } from "../config/supabase.js";
import { apiRequest } from "../services/api.js";

export async function deleteOfficer(officerId) {
    if (!officerId) {
        throw new Error("Officer ID is required.");
    }

    const result = await apiRequest(
        `/officers/${encodeURIComponent(officerId)}`,
        { method: "DELETE" }
    );
    const photoUrl = result.officer?.photo;

    if (photoUrl) {
        let fileName;
        try {
            fileName = new URL(photoUrl).pathname.split("/").pop();
        } catch (error) {
            console.error("Unable to parse officer photo URL:", error);
        }

        if (fileName) {
            const { error } = await supabase.storage
                .from("officer-photos")
                .remove([fileName]);

            if (error) {
                console.error(
                    "Officer was deleted, but the photo could not be removed:",
                    error
                );
                throw new Error(
                    "Officer was deleted, but the photo could not be removed from storage."
                );
            }
        }
    }

    return {
        success: true,
        officerID: result.officer.officer_id,
        name: result.officer.name
    };
}
