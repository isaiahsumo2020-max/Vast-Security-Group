import { getApiBaseUrl } from "/backend/config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "/backend/config/supabase.js";

const itemGrid = document.getElementById("publicGalleryItems");
const status = document.getElementById("publicGalleryStatus");
const dialog = document.getElementById("galleryDialog");
const dialogMedia = document.getElementById("galleryDialogMedia");
const closeDialogButton = document.getElementById("closeGalleryDialog");

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

function createCard(item) {
    const card = document.createElement("article");
    card.className = "public-gallery-card";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "public-gallery-card-open";
    openButton.setAttribute("aria-label", `View ${item.title}`);

    const imageFrame = document.createElement("span");
    imageFrame.className = "public-gallery-card-image";
    const coverUrl = item.cover_image_url ||
        (item.media_type === "image" ? item.media_url : "");
    if (coverUrl) {
        const image = document.createElement("img");
        image.src = coverUrl;
        image.alt = "";
        image.loading = "lazy";
        imageFrame.appendChild(image);
    } else {
        imageFrame.classList.add("public-gallery-card-placeholder");
        const icon = document.createElement("i");
        icon.className = item.media_type === "video"
            ? "fa-solid fa-circle-play"
            : "fa-solid fa-image";
        icon.setAttribute("aria-hidden", "true");
        imageFrame.appendChild(icon);
    }

    const mediaBadge = document.createElement("span");
    mediaBadge.className = "public-gallery-media-badge";
    mediaBadge.innerHTML = item.media_type === "video"
        ? '<i class="fa-solid fa-play" aria-hidden="true"></i> Video'
        : '<i class="fa-solid fa-camera" aria-hidden="true"></i> Photo';
    imageFrame.appendChild(mediaBadge);
    openButton.appendChild(imageFrame);

    const content = document.createElement("span");
    content.className = "public-gallery-card-content";
    const date = document.createElement("span");
    date.className = "public-gallery-card-date";
    date.textContent = formatDate(item.event_date);
    const title = document.createElement("strong");
    title.textContent = item.title;
    const preview = document.createElement("span");
    preview.className = "public-gallery-card-preview";
    preview.textContent = item.preview;
    const link = document.createElement("span");
    link.className = "public-gallery-card-link";
    link.textContent = "View story";
    content.append(date, title, preview, link);
    openButton.appendChild(content);
    openButton.addEventListener("click", () => showDetails(item));
    card.appendChild(openButton);
    return card;
}

function showDetails(item) {
    dialogMedia.replaceChildren();
    if (item.media_type === "video") {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = item.media_url;
        if (item.cover_image_url) {
            video.poster = item.cover_image_url;
        }
        video.setAttribute("aria-label", item.title);
        dialogMedia.appendChild(video);
    } else {
        const image = document.createElement("img");
        image.src = item.media_url;
        image.alt = item.caption || item.title;
        image.loading = "eager";
        dialogMedia.appendChild(image);
    }

    document.getElementById("galleryDialogTitle").textContent = item.title;
    document.getElementById("galleryDialogDate").textContent = formatDate(item.event_date);
    const caption = document.getElementById("galleryDialogCaption");
    caption.textContent = item.caption || item.preview;
    caption.hidden = !item.caption && !item.preview;
    const detailsSection = document.getElementById("galleryDialogDetailsSection");
    document.getElementById("galleryDialogDetails").textContent = item.event_details || "";
    detailsSection.hidden = !item.event_details;
    const messageSection = document.getElementById("galleryDialogMessageSection");
    document.getElementById("galleryDialogMessage").textContent = item.message || "";
    messageSection.hidden = !item.message;
    dialog.showModal();
}

async function loadGallery() {
    status.textContent = "Loading company stories…";
    status.classList.remove("error");
    try {
        const endpoint = new URL(getApiBaseUrl());
        endpoint.searchParams.set("path", "/public/gallery");
        const response = await fetch(endpoint, {
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Unable to load the company gallery.");
        }

        itemGrid.replaceChildren();
        const items = result.items || [];
        if (!items.length) {
            status.textContent = "Our gallery is being prepared. Please check back soon.";
            return;
        }

        items.forEach(item => itemGrid.appendChild(createCard(item)));
        status.textContent = "";
    } catch (error) {
        console.error("Unable to load public gallery:", error);
        status.textContent = error.message || "Unable to load the company gallery.";
        status.classList.add("error");
    }
}

closeDialogButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
    if (event.target === dialog) {
        dialog.close();
    }
});
dialog.addEventListener("close", () => {
    const video = dialogMedia.querySelector("video");
    if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
    }
    dialogMedia.replaceChildren();
});

await loadGallery();
