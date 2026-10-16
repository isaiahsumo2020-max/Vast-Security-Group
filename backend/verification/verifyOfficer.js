import { getApiBaseUrl } from "../config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "../config/supabase.js";

const searchButton = document.getElementById("verifyBtn");
const officerInput = document.getElementById("officerID");
const resultBox = document.getElementById("resultBox");
const notFoundBox = document.getElementById("notFoundBox");
const message = document.getElementById("verificationMessage");

async function verifyOfficer() {
    const officerId = officerInput.value.trim().toUpperCase();
    setSectionVisibility(resultBox, false);
    setSectionVisibility(notFoundBox, false);

    if (!/^VSG-\d{4}-\d{3,}$/.test(officerId)) {
        message.textContent = "Enter a valid Officer ID, for example VSG-2026-001.";
        message.className = "verification-message error";
        officerInput.focus();
        return;
    }

    searchButton.disabled = true;
    message.textContent = "Checking the official officer registry...";
    message.className = "verification-message";

    try {
        const functionUrl = new URL(getApiBaseUrl());
        functionUrl.searchParams.set(
            "path",
            `/public/officers/${encodeURIComponent(officerId)}`
        );
        const response = await fetch(functionUrl, {
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        const result = await response.json();

        if (response.status === 404) {
            setSectionVisibility(notFoundBox, true);
            notFoundBox.scrollIntoView({ behavior: "smooth" });
            message.textContent = "";
            return;
        }

        if (!response.ok) {
            throw new Error(result.message || "Unable to verify this officer right now.");
        }

        showOfficer(result.officer);
        message.textContent = "Officer details verified against the current registry.";
        message.className = "verification-message success";
    } catch (error) {
        console.error("Officer verification failed:", error);
        message.textContent = error.message || "Unable to verify this officer right now.";
        message.className = "verification-message error";
    } finally {
        searchButton.disabled = false;
    }
}

function showOfficer(officer) {
    setSectionVisibility(resultBox, true);
    setSectionVisibility(notFoundBox, false);

    const photo = document.getElementById("officerPhoto");
    photo.src = officer.photo || "/assests/images/VAST LOGO.png";
    photo.alt = officer.photo
        ? `Official photo of ${officer.name || "the officer"}`
        : "VAST Security Group logo";

    document.getElementById("officerName").textContent = officer.name || "Not available";
    document.getElementById("officerId").textContent = officer.officer_id || "";
    document.getElementById("officerPosition").textContent = officer.position || "Not specified";
    document.getElementById("officerDepartment").textContent = officer.department || "Not specified";
    document.getElementById("officerEmployment").textContent = officer.employment || "Not specified";
    document.getElementById("officerIssue").textContent = formatDate(officer.issueDate);
    document.getElementById("officerExpiry").textContent = formatDate(officer.expiryDate);

    const badge = document.getElementById("officerStatus");
    badge.textContent = officer.status || "Status unavailable";
    badge.className = "status-badge";
    badge.style.background = officer.status === "Verified Active"
        ? "#198754"
        : officer.status === "Suspended"
            ? "#FFC107"
            : officer.status === "Expired"
                ? "#DC3545"
                : "#6C757D";
    badge.style.color = officer.status === "Suspended" ? "#000" : "#fff";

    document.getElementById("verifyTime").textContent = new Date().toLocaleString();
    document.getElementById("referenceNo").textContent = `VSG-${Date.now()}`;
    resultBox.scrollIntoView({ behavior: "smooth" });
}

function formatDate(value) {
    if (!value) {
        return "Not specified";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString();
}

function setSectionVisibility(section, isVisible) {
    section.style.display = isVisible ? "block" : "none";
    section.classList.toggle("show", isVisible);
}

searchButton.addEventListener("click", verifyOfficer);
officerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        verifyOfficer();
    }
});
