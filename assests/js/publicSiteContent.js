import { getApiBaseUrl } from "/backend/config/apiUrl.js";
import {
    SUPABASE_ANON_KEY,
    SUPABASE_URL
} from "/backend/config/supabase.js";

function isApprovedImageUrl(value) {
    try {
        const imageUrl = new URL(value, window.location.origin);
        const projectUrl = new URL(SUPABASE_URL);
        return (
            imageUrl.origin === window.location.origin &&
                imageUrl.pathname.startsWith("/assests/images/") ||
            imageUrl.origin === projectUrl.origin &&
                imageUrl.pathname.startsWith(
                    "/storage/v1/object/public/vsg-website-assets/"
                )
        );
    } catch {
        return false;
    }
}

async function loadPublicSiteContent() {
    try {
        const endpoint = new URL(getApiBaseUrl());
        endpoint.searchParams.set("path", "/public/site-content");
        const response = await fetch(endpoint, {
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Unable to load website settings.");
        }

        const content = result.content || {};
        const siteName = content.site_name;
        if (typeof siteName === "string" && siteName.trim()) {
            for (const title of document.querySelectorAll("[data-site-content-title]")) {
                title.textContent = siteName.trim();
            }
        }

        for (const element of document.querySelectorAll(
            "[data-site-content-image]"
        )) {
            const url = content[element.dataset.siteContentImage];
            if (typeof url !== "string" || !isApprovedImageUrl(url)) {
                continue;
            }

            if (element instanceof HTMLLinkElement) {
                element.href = url;
            } else if (element instanceof HTMLImageElement) {
                element.src = url;
                element.hidden = false;
            }
        }

        for (const element of document.querySelectorAll(
            "[data-site-content-text]"
        )) {
            const text = content[element.dataset.siteContentText];
            if (typeof text === "string" && text.length) {
                element.textContent = text;
            }
        }

        for (const banner of document.querySelectorAll("[data-site-banner]")) {
            const url = content[banner.dataset.siteBanner];
            if (typeof url !== "string" || !isApprovedImageUrl(url)) {
                continue;
            }

            const overlay = banner.classList.contains("hero")
                ? "linear-gradient(rgba(11, 35, 65, .90), rgba(11, 35, 65, .88))"
                : "linear-gradient(rgba(11, 35, 65, .82), rgba(11, 35, 65, .82))";
            banner.style.backgroundImage =
                `${overlay}, url("${new URL(url, window.location.origin).href}")`;
            banner.style.backgroundSize = "cover";
            banner.style.backgroundPosition = "center";
        }
    } catch (error) {
        console.error(
            "Unable to load managed public website content; using page defaults:",
            error
        );
    }
}

void loadPublicSiteContent();
