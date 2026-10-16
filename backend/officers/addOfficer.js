import { supabase } from "../config/supabase.js";
import { apiRequest } from "../services/api.js";

async function uploadOfficerPhoto(file, officerId) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${officerId}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
        .from("officer-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
        throw error;
    }

    return supabase.storage.from("officer-photos").getPublicUrl(fileName)
        .data.publicUrl;
}

async function removeUploadedPhoto(photoUrl) {
    const fileName = new URL(photoUrl).pathname.split("/").pop();
    if (!fileName) {
        return;
    }

    const { error } = await supabase.storage
        .from("officer-photos")
        .remove([fileName]);

    if (error) {
        console.error("Unable to remove uploaded officer photo:", error);
    }
}

export async function addOfficer(officerData, photoFile = null) {
    const result = await apiRequest("/officers", {
        method: "POST",
        body: JSON.stringify({ officer: officerData })
    });
    let officer = result.officer;

    if (!photoFile) {
        return officer;
    }

    let photoUrl;
    try {
        photoUrl = await uploadOfficerPhoto(photoFile, officer.officer_id);
        const update = await apiRequest(
            `/officers/${encodeURIComponent(officer.officer_id)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    officer: { ...officerData, photo: photoUrl }
                })
            }
        );
        officer = update.officer;
        return officer;
    } catch (error) {
        if (photoUrl) {
            await removeUploadedPhoto(photoUrl);
        }

        try {
            await apiRequest(
                `/officers/${encodeURIComponent(officer.officer_id)}`,
                { method: "DELETE" }
            );
        } catch (rollbackError) {
            console.error(
                "Unable to roll back officer after photo upload failed:",
                rollbackError
            );
            throw new Error(
                `Officer record was created but photo upload failed and the record could not be removed: ${rollbackError.message}`
            );
        }

        throw error;
    }
}
