import { supabase } from "../config/supabase.js";
import { apiRequest } from "../services/api.js";

function getFileNameFromUrl(photoUrl) {
    if (!photoUrl) {
        return null;
    }

    try {
        return new URL(photoUrl).pathname.split("/").pop() || null;
    } catch {
        return null;
    }
}

async function uploadNewPhoto(file, officerId) {
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

async function deletePhoto(photoUrl) {
    const fileName = getFileNameFromUrl(photoUrl);
    if (!fileName) {
        return;
    }

    const { error } = await supabase.storage
        .from("officer-photos")
        .remove([fileName]);

    if (error) {
        console.error("Unable to remove officer photo:", error);
    }
}

export async function editOfficer(officerId, officerData, newPhotoFile = null) {
    const result = await apiRequest("/officers");
    const existingOfficer = result.officers?.find(
        officer => officer.officer_id === officerId
    );

    if (!existingOfficer) {
        throw new Error("Officer not found.");
    }

    const photoUrl = newPhotoFile
        ? await uploadNewPhoto(newPhotoFile, officerId)
        : existingOfficer.photo || null;

    try {
        const update = await apiRequest(
            `/officers/${encodeURIComponent(officerId)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    officer: { ...officerData, photo: photoUrl }
                })
            }
        );

        if (newPhotoFile && existingOfficer.photo) {
            await deletePhoto(existingOfficer.photo);
        }

        return update.officer;
    } catch (error) {
        if (newPhotoFile && photoUrl) {
            await deletePhoto(photoUrl);
        }
        throw error;
    }
}
