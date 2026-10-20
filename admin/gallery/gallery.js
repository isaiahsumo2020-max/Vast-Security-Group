import { apiRequest } from "../../backend/services/api.js";
import { getCurrentSession } from "../../backend/auth/session.js";
import {
    SUPABASE_ANON_KEY,
    SUPABASE_URL
} from "../../backend/config/supabase.js";
import { confirmAction } from "../auth/confirmDialog.js";

const galleryForm = document.getElementById("galleryForm");
const itemIdInput = document.getElementById("galleryItemId");
const titleInput = document.getElementById("galleryTitle");
const dateInput = document.getElementById("galleryDate");
const mediaTypeInput = document.getElementById("galleryMediaType");
const mediaFileInput = document.getElementById("galleryMediaFile");
const coverFileInput = document.getElementById("galleryCoverFile");
const mediaPreview = document.getElementById("galleryMediaPreview");
const coverPreview = document.getElementById("galleryCoverPreview");
const previewInput = document.getElementById("galleryPreview");
const captionInput = document.getElementById("galleryCaption");
const eventDetailsInput = document.getElementById("galleryEventDetails");
const messageInput = document.getElementById("galleryMessage");
const publishedInput = document.getElementById("galleryPublished");
const formHeading = document.getElementById("galleryFormHeading");
const formStatus = document.getElementById("galleryFormStatus");
const listStatus = document.getElementById("galleryListStatus");
const itemList = document.getElementById("galleryAdminItems");
const saveButton = document.getElementById("saveGalleryItemBtn");
const cancelButton = document.getElementById("cancelGalleryEditBtn");
const refreshButton = document.getElementById("refreshGalleryBtn");
const uploadProgress = document.getElementById("galleryUploadProgress");
const uploadProgressBar = document.getElementById("galleryUploadProgressBar");
const uploadProgressText = document.getElementById("galleryUploadProgressText");

let items = [];
let currentMediaUrl = "";
let currentMediaType = "";
let currentCoverUrl = "";
let isSaving = false;
let creationRequestId = "";
const previewObjectUrls = new Map();
const pendingUploadTickets = new Map();
const stagedAssetUrls = new Set();
const maxMediaSizes = {
    image: 10 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    cover: 10 * 1024 * 1024
};
const supportedMediaTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime"
]);
const tusChunkSize = 6 * 1024 * 1024;

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
}

function setUploadProgress(message, percentage) {
    uploadProgress.hidden = false;
    uploadProgressText.textContent = message;
    uploadProgressBar.value = Math.max(0, Math.min(100, percentage));
}

function fileSignature(file) {
    return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function getUploadErrorMessage(error) {
    const statusCode = error.originalResponse?.getStatus?.();
    if (statusCode === 401 || statusCode === 403) {
        return "Upload permission was denied. Sign in again or ask an administrator to grant website settings permission.";
    }
    if (statusCode === 413) {
        return "Storage rejected this file because it exceeds the configured upload limit.";
    }
    if (statusCode === 0 || !statusCode) {
        return "The upload was interrupted by a network problem. Check your connection and retry; the upload can resume.";
    }
    const responseBody = error.originalResponse?.getBody?.();
    if (typeof responseBody === "string" && responseBody) {
        try {
            const details = JSON.parse(responseBody);
            if (typeof details.message === "string") {
                return details.message;
            }
        } catch {
            return `Storage upload failed (HTTP ${statusCode}): ${responseBody}`;
        }
    }
    return error.message || `Storage upload failed (HTTP ${statusCode}).`;
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
}

function updateFilePreview(file, image, kind) {
    const previousUrl = previewObjectUrls.get(image);
    if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
        previewObjectUrls.delete(image);
    }

    if (kind === "media" && file?.type.startsWith("video/")) {
        image.hidden = true;
        image.removeAttribute("src");
        return;
    }

    if (!file) {
        image.hidden = true;
        image.removeAttribute("src");
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrls.set(image, objectUrl);
    image.src = objectUrl;
    image.hidden = false;
}

function resetForm() {
    galleryForm.reset();
    itemIdInput.value = "";
    creationRequestId = "";
    currentMediaUrl = "";
    currentMediaType = "";
    currentCoverUrl = "";
    mediaPreview.hidden = true;
    mediaPreview.removeAttribute("src");
    coverPreview.hidden = true;
    coverPreview.removeAttribute("src");
    updateFilePreview(null, mediaPreview, "media");
    updateFilePreview(null, coverPreview, "cover");
    mediaTypeInput.disabled = false;
    mediaFileInput.required = true;
    coverFileInput.required = false;
    formHeading.textContent = "Add Gallery Item";
    saveButton.textContent = "Add Gallery Item";
    cancelButton.hidden = true;
    setStatus(formStatus, "");
    uploadProgress.hidden = true;
    uploadProgressBar.value = 0;
    uploadProgressText.textContent = "";
    pendingUploadTickets.clear();
    stagedAssetUrls.clear();
}

async function cleanupStagedAssets() {
    if (stagedAssetUrls.size) {
        await apiRequest("/gallery/assets", {
            method: "DELETE",
            body: JSON.stringify({ asset_urls: [...stagedAssetUrls] })
        });
    }
    stagedAssetUrls.clear();
    for (const ticket of pendingUploadTickets.values()) {
        sessionStorage.removeItem(ticket.storageKey);
    }
    pendingUploadTickets.clear();
}

function startEditing(item) {
    itemIdInput.value = item.id;
    creationRequestId = "";
    titleInput.value = item.title;
    dateInput.value = item.event_date;
    mediaTypeInput.value = item.media_type;
    previewInput.value = item.preview;
    captionInput.value = item.caption || "";
    eventDetailsInput.value = item.event_details || "";
    messageInput.value = item.message || "";
    publishedInput.checked = item.is_published;
    currentMediaUrl = item.media_url;
    currentMediaType = item.media_type;
    currentCoverUrl = item.cover_image_url || "";
    mediaFileInput.value = "";
    coverFileInput.value = "";
    mediaFileInput.required = false;
    coverFileInput.required = false;
    mediaTypeInput.disabled = true;
    updateFilePreview(null, mediaPreview, "media");
    updateFilePreview(null, coverPreview, "cover");
    mediaPreview.hidden = item.media_type === "video";
    if (item.media_type === "image") {
        mediaPreview.src = item.media_url;
    }
    coverPreview.src = item.cover_image_url || "";
    coverPreview.hidden = !item.cover_image_url;
    formHeading.textContent = "Edit Gallery Item";
    saveButton.textContent = "Save Changes";
    cancelButton.hidden = false;
    setStatus(formStatus, "");
    galleryForm.scrollIntoView({ behavior: "smooth", block: "start" });
    titleInput.focus();
}

function createItemCard(item) {
    const card = document.createElement("article");
    card.className = "gallery-admin-item";

    const thumbnail = document.createElement("div");
    thumbnail.className = "gallery-admin-thumbnail";
    const imageUrl = item.cover_image_url ||
        (item.media_type === "image" ? item.media_url : "");
    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        thumbnail.appendChild(image);
    } else {
        thumbnail.textContent = item.media_type === "video" ? "VIDEO" : "PHOTO";
    }

    const details = document.createElement("div");
    details.className = "gallery-admin-item-details";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const meta = document.createElement("p");
    meta.textContent = `${formatDate(item.event_date)} · ${item.media_type === "video" ? "Video" : "Photo"} · ${item.is_published ? "Published" : "Unpublished"}`;
    const summary = document.createElement("p");
    summary.textContent = item.preview;
    details.append(title, meta, summary);

    const actions = document.createElement("div");
    actions.className = "gallery-admin-item-actions";
    for (const [action, label, className] of [
        ["edit", "Edit", "edit-btn"],
        ["delete", "Delete", "delete-btn"]
    ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `action-btn ${className}`;
        button.dataset.action = action;
        button.dataset.id = item.id;
        button.textContent = label;
        actions.appendChild(button);
    }

    card.append(thumbnail, details, actions);
    return card;
}

function renderItems() {
    itemList.replaceChildren();
    if (!items.length) {
        const empty = document.createElement("p");
        empty.textContent = "No gallery items have been added.";
        itemList.appendChild(empty);
        return;
    }

    items.forEach(item => itemList.appendChild(createItemCard(item)));
}

async function loadItems() {
    refreshButton.disabled = true;
    itemList.textContent = "Loading gallery items…";
    setStatus(listStatus, "");
    try {
        const result = await apiRequest("/gallery");
        if (!result.success || !Array.isArray(result.items)) {
            throw new Error("The server returned an invalid gallery item list.");
        }
        items = result.items;
        renderItems();
        setStatus(listStatus, `${items.length} gallery item${items.length === 1 ? "" : "s"} loaded.`);
    } catch (error) {
        console.error("Unable to load gallery items:", error);
        setStatus(
            listStatus,
            "Unable to load gallery items. Check your connection and administrator access, then try again.",
            true
        );
        itemList.textContent = "Gallery items could not be loaded.";
        return false;
    } finally {
        refreshButton.disabled = false;
    }
    return true;
}

async function uploadAsset(file, kind, onProgress) {
    if (!window.tus?.Upload) {
        throw new Error("The resumable upload library could not be loaded. Refresh the page and try again.");
    }

    const session = await getCurrentSession();
    if (!session?.access_token || !session.user?.id) {
        throw new Error("Your administrator session expired. Sign in again before uploading.");
    }

    const signature = fileSignature(file);
    const storageKey = `vast-gallery-upload:${session.user.id}:${kind}:${signature}`;
    let ticket = pendingUploadTickets.get(kind);
    let isResuming = Boolean(ticket?.signature === signature);
    if (ticket?.signature !== signature) {
        if (ticket) {
            sessionStorage.removeItem(ticket.storageKey);
        }
        const extensions = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "video/mp4": "mp4",
            "video/webm": "webm",
            "video/quicktime": "mov"
        };
        const savedObjectPath = sessionStorage.getItem(storageKey);
        const validPath = savedObjectPath &&
            new RegExp(`^${kind}/[0-9a-f-]+\\.${extensions[file.type]}$`, "i")
                .test(savedObjectPath);
        isResuming = Boolean(validPath);
        let objectPath = validPath ? savedObjectPath : "";
        if (!objectPath) {
            sessionStorage.removeItem(storageKey);
            const result = await apiRequest("/gallery/assets", {
                method: "POST",
                body: JSON.stringify({
                    kind,
                    content_type: file.type,
                    size: file.size
                })
            });
            if (!result.success || typeof result.objectPath !== "string") {
                throw new Error("The server did not authorize the gallery upload.");
            }
            objectPath = result.objectPath;
            sessionStorage.setItem(storageKey, objectPath);
        }
        ticket = { signature, objectPath, storageKey };
        pendingUploadTickets.set(kind, ticket);
    }

    const storageUrl = new URL(SUPABASE_URL);
    storageUrl.hostname = storageUrl.hostname.replace(
        ".supabase.co",
        ".storage.supabase.co"
    );
    const endpoint = `${storageUrl.origin}/storage/v1/upload/resumable`;
    const fingerprint = `${ticket.objectPath}:${file.size}:${file.lastModified}`;
    const path = ticket.objectPath
        .split("/")
        .map(segment => encodeURIComponent(segment))
        .join("/");
    const assetUrl =
        `${SUPABASE_URL}/storage/v1/object/public/vsg-gallery-assets/${path}`;
    if (isResuming) {
        const storedUploadResponse = await fetch(assetUrl, {
            method: "HEAD",
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        if (storedUploadResponse.ok) {
            pendingUploadTickets.delete(kind);
            sessionStorage.removeItem(ticket.storageKey);
            return {
                assetUrl,
                mediaType: file.type.startsWith("video/") ? "video" : "image"
            };
        }
        if (storedUploadResponse.status !== 404) {
            throw new Error(
                `Unable to verify whether the previous upload completed (HTTP ${storedUploadResponse.status}).`
            );
        }
    }

    return new Promise((resolve, reject) => {
        const upload = new window.tus.Upload(file, {
            endpoint,
            chunkSize: tusChunkSize,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            removeFingerprintOnSuccess: true,
            uploadDataDuringCreation: true,
            fingerprint: () => Promise.resolve(fingerprint),
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`
            },
            metadata: {
                bucketName: "vsg-gallery-assets",
                objectName: ticket.objectPath,
                contentType: file.type,
                cacheControl: "3600"
            },
            onError: error => reject(new Error(getUploadErrorMessage(error), { cause: error })),
            onProgress: (uploaded, total) => {
                onProgress(total ? uploaded / total : 0);
            },
            onSuccess: () => {
                pendingUploadTickets.delete(kind);
                sessionStorage.removeItem(ticket.storageKey);
                resolve({
                    assetUrl,
                    mediaType: file.type.startsWith("video/") ? "video" : "image"
                });
            }
        });

        upload.findPreviousUploads().then(previousUploads => {
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0]);
            }
            upload.start();
        }).catch(reject);
    });
}

function getFormData(mediaUrl, mediaType, coverImageUrl) {
    return {
        title: titleInput.value.trim(),
        event_date: dateInput.value,
        preview: previewInput.value.trim(),
        caption: captionInput.value.trim(),
        event_details: eventDetailsInput.value.trim(),
        message: messageInput.value.trim(),
        media_type: mediaType,
        media_url: mediaUrl,
        cover_image_url: coverImageUrl || null,
        is_published: publishedInput.checked
    };
}

galleryForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (isSaving) {
        return;
    }

    const itemId = itemIdInput.value;
    const existingItem = items.find(item => item.id === itemId);
    const selectedMedia = mediaFileInput.files[0];
    const selectedCover = coverFileInput.files[0];
    const mediaType = selectedMedia
        ? (selectedMedia.type.startsWith("video/") ? "video" : "image")
        : currentMediaType || existingItem?.media_type || mediaTypeInput.value;
    const willHaveCover = selectedCover || currentCoverUrl;

    if (!itemId && !selectedMedia && !currentMediaUrl) {
        setStatus(formStatus, "Choose a photo or video to upload.", true);
        mediaFileInput.focus();
        return;
    }
    if (mediaType === "video" && !willHaveCover) {
        setStatus(formStatus, "Videos require a cover image thumbnail.", true);
        coverFileInput.focus();
        return;
    }
    if (selectedMedia && !selectedMedia.type.startsWith("image/") &&
        !selectedMedia.type.startsWith("video/")) {
        setStatus(formStatus, "Choose a supported photo or video file.", true);
        return;
    }
    if (selectedMedia && !supportedMediaTypes.has(selectedMedia.type)) {
        setStatus(formStatus, "Use a JPEG, PNG, WebP, MP4, WebM, or MOV file.", true);
        return;
    }
    if (selectedCover && !["image/jpeg", "image/png", "image/webp"].includes(selectedCover.type)) {
        setStatus(formStatus, "Use a JPEG, PNG, or WebP cover image.", true);
        return;
    }
    const mediaFileSizeLimit = mediaType === "video"
        ? maxMediaSizes.video
        : maxMediaSizes.image;
    if (selectedMedia && selectedMedia.size > mediaFileSizeLimit) {
        setStatus(
            formStatus,
            mediaType === "video"
                ? "Videos must be no larger than 100 MB."
                : "Images must be no larger than 10 MB.",
            true
        );
        return;
    }
    if (selectedCover && selectedCover.size > maxMediaSizes.cover) {
        setStatus(formStatus, "Cover images must be no larger than 10 MB.", true);
        return;
    }

    isSaving = true;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    let uploadInProgress = false;
    let cleanupWarning = false;
    try {
        const bodyPreview = getFormData(
            currentMediaUrl,
            mediaType,
            currentCoverUrl
        );
        if (itemId && !await confirmAction({
            title: "Save gallery changes?",
            message: `Update "${bodyPreview.title}" with the current details?`,
            confirmLabel: "Save changes"
        })) {
            return;
        }

        const uploadFiles = [
            selectedMedia ? { file: selectedMedia, kind: "media" } : null,
            selectedCover ? { file: selectedCover, kind: "cover" } : null
        ].filter(Boolean);
        const totalUploadBytes = uploadFiles.reduce(
            (total, entry) => total + entry.file.size,
            0
        );
        let completedBytes = 0;
        let mediaUrl = currentMediaUrl;
        let coverImageUrl = currentCoverUrl;
        if (uploadFiles.length) {
            uploadInProgress = true;
            setStatus(formStatus, "");
            for (const entry of uploadFiles) {
                setUploadProgress(
                    `Preparing ${entry.kind === "media" && mediaType === "video" ? "video" : "file"} upload…`,
                    totalUploadBytes ? completedBytes / totalUploadBytes * 100 : 0
                );
                const uploaded = await uploadAsset(entry.file, entry.kind, fraction => {
                    const percentage = Math.round(fraction * 100);
                    const overall = totalUploadBytes
                        ? (completedBytes + entry.file.size * fraction) /
                            totalUploadBytes * 100
                        : 0;
                    setUploadProgress(
                        `Uploading ${entry.file.name} (${percentage}%)`,
                        overall
                    );
                });

                if (entry.kind === "media") {
                    mediaUrl = uploaded.assetUrl;
                    currentMediaUrl = mediaUrl;
                    currentMediaType = uploaded.mediaType;
                    stagedAssetUrls.add(mediaUrl);
                    mediaFileInput.value = "";
                } else {
                    coverImageUrl = uploaded.assetUrl;
                    currentCoverUrl = coverImageUrl;
                    stagedAssetUrls.add(coverImageUrl);
                    coverFileInput.value = "";
                }
                completedBytes += entry.file.size;
            }
            setUploadProgress("Upload complete. Saving gallery details…", 100);
        }

        const body = getFormData(mediaUrl, mediaType, coverImageUrl);
        if (!itemId) {
            if (!creationRequestId) {
                creationRequestId = crypto.randomUUID();
            }
            body.client_request_id = creationRequestId;
        }
        setStatus(formStatus, "Saving gallery details…");
        const result = await apiRequest(
            itemId ? `/gallery/${encodeURIComponent(itemId)}` : "/gallery",
            {
                method: itemId ? "PATCH" : "POST",
                body: JSON.stringify(body)
            }
        );
        const savedItem = result.item;
        if (!result.success || !savedItem?.id || typeof savedItem.title !== "string") {
            throw new Error("The server did not confirm that the gallery item was saved.");
        }
        try {
            await cleanupStagedAssets();
        } catch (error) {
            console.error("Gallery item was saved, but unused uploads could not be removed:", error);
            cleanupWarning = true;
        }
        resetForm();
        const itemsRefreshed = await loadItems();
        if (itemsRefreshed) {
            setStatus(
                listStatus,
                cleanupWarning
                    ? `"${savedItem.title}" ${existingItem ? "updated" : "added"}, but unused upload cleanup failed. Contact an administrator if unused media remains in storage.`
                    : `"${savedItem.title}" ${existingItem ? "updated" : "added"}.`,
                cleanupWarning
            );
        } else {
            setStatus(
                formStatus,
                cleanupWarning
                    ? `"${savedItem.title}" was saved, but the gallery list could not be refreshed and unused upload cleanup failed.`
                    : `"${savedItem.title}" was saved, but the gallery list could not be refreshed. Use Refresh to reload it.`,
                true
            );
        }
    } catch (error) {
        console.error("Unable to save gallery item:", error);
        if (uploadInProgress) {
            setUploadProgress(`Upload failed: ${error.message || "Please retry."}`, uploadProgressBar.value);
        }
        setStatus(
            formStatus,
            error.message || "Unable to save gallery item. Please try again.",
            true
        );
    } finally {
        isSaving = false;
        saveButton.disabled = false;
        cancelButton.disabled = false;
    }
});

itemList.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    const item = items.find(entry => entry.id === button.dataset.id);
    if (!item) {
        setStatus(listStatus, "This gallery item is no longer available. Refresh the list.", true);
        return;
    }
    if (button.dataset.action === "edit") {
        try {
            await cleanupStagedAssets();
        } catch (error) {
            console.error("Unable to clean up unsaved gallery uploads:", error);
            setStatus(
                formStatus,
                error.message || "Unable to clean up unsaved uploads. Try again before editing another item.",
                true
            );
            return;
        }
        startEditing(item);
        return;
    }

    if (!await confirmAction({
        title: "Delete gallery item?",
        message: `Permanently delete "${item.title}" and its uploaded media?`,
        confirmLabel: "Delete item",
        destructive: true
    })) {
        return;
    }

    button.disabled = true;
    try {
        await apiRequest(`/gallery/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        if (itemIdInput.value === item.id) {
            resetForm();
        }
        await loadItems();
        setStatus(listStatus, `"${item.title}" deleted.`);
    } catch (error) {
        console.error("Unable to delete gallery item:", error);
        setStatus(listStatus, error.message || "Unable to delete gallery item.", true);
        button.disabled = false;
    }
});

mediaTypeInput.addEventListener("change", () => {
    if (mediaTypeInput.value !== "video" || coverFileInput.files[0] || currentCoverUrl) {
        setStatus(formStatus, "");
    }
});
mediaFileInput.addEventListener("change", () => {
    const file = mediaFileInput.files[0];
    updateFilePreview(file, mediaPreview, "media");
    if (file) {
        mediaTypeInput.value = file.type.startsWith("video/") ? "video" : "image";
    }
});
coverFileInput.addEventListener("change", () => {
    updateFilePreview(coverFileInput.files[0], coverPreview, "cover");
});

cancelButton.addEventListener("click", async () => {
    cancelButton.disabled = true;
    try {
        await cleanupStagedAssets();
        resetForm();
    } catch (error) {
        console.error("Unable to clean up unsaved gallery uploads:", error);
        setStatus(
            formStatus,
            error.message || "Unable to clean up unused uploads. Try Cancel Edit again.",
            true
        );
    } finally {
        cancelButton.disabled = false;
    }
});
refreshButton.addEventListener("click", loadItems);
await loadItems();
