import { apiRequest } from "../../backend/services/api.js";
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

let items = [];
let currentMediaUrl = "";
let currentMediaType = "";
let currentCoverUrl = "";
let isSaving = false;
const previewObjectUrls = new Map();

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
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
}

function startEditing(item) {
    itemIdInput.value = item.id;
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

async function uploadAsset(file, kind) {
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    const result = await apiRequest("/gallery/assets", {
        method: "POST",
        body: formData
    });
    if (!result.success || typeof result.assetUrl !== "string" || !result.assetUrl) {
        throw new Error("The server did not confirm the media upload.");
    }
    return result;
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

    isSaving = true;
    saveButton.disabled = true;
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

        setStatus(formStatus, selectedMedia || selectedCover
            ? "Uploading media…"
            : "Saving gallery item…");
        let mediaUrl = currentMediaUrl;
        let coverImageUrl = currentCoverUrl;
        if (selectedMedia) {
            const uploaded = await uploadAsset(selectedMedia, "media");
            mediaUrl = uploaded.assetUrl;
            currentMediaUrl = mediaUrl;
            currentMediaType = uploaded.mediaType;
            mediaFileInput.value = "";
        }
        if (selectedCover) {
            const uploaded = await uploadAsset(selectedCover, "cover");
            coverImageUrl = uploaded.assetUrl;
            currentCoverUrl = coverImageUrl;
            coverFileInput.value = "";
        }

        const body = getFormData(mediaUrl, mediaType, coverImageUrl);
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
        resetForm();
        const itemsRefreshed = await loadItems();
        if (itemsRefreshed) {
            setStatus(
                listStatus,
                `"${savedItem.title}" ${existingItem ? "updated" : "added"}.`
            );
        } else {
            setStatus(
                formStatus,
                `"${savedItem.title}" was saved, but the gallery list could not be refreshed. Use Refresh to reload it.`,
                true
            );
        }
    } catch (error) {
        console.error("Unable to save gallery item:", error);
        setStatus(
            formStatus,
            error.message || "Unable to save gallery item. Please try again.",
            true
        );
    } finally {
        isSaving = false;
        saveButton.disabled = false;
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

cancelButton.addEventListener("click", resetForm);
refreshButton.addEventListener("click", loadItems);
await loadItems();
