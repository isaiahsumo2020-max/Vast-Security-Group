import { getApiBaseUrl } from "/backend/config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "/backend/config/supabase.js";

const phoneList = document.getElementById("contactPhoneNumbers");
const emailLink = document.getElementById("contactEmail");
const address = document.getElementById("contactOfficeAddress");
const businessDays = document.getElementById("contactBusinessDays");
const businessHours = document.getElementById("contactBusinessHours");
const status = document.getElementById("contactInfoStatus");

function phoneHref(number) {
    return `tel:${number.replace(/[^\d+]/g, "")}`;
}

function createPhoneLink(number) {
    const link = document.createElement("a");
    link.href = phoneHref(number);
    link.textContent = number;
    link.setAttribute("aria-label", `Call ${number}`);
    return link;
}

function formatTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function updateManagedContact(content) {
    const phoneNumbers = content.contact_phone_numbers
        .split(/\r?\n/)
        .map(number => number.trim())
        .filter(Boolean);

    phoneList.replaceChildren();
    if (phoneNumbers.length) {
        for (const number of phoneNumbers) {
            const item = document.createElement("li");
            item.appendChild(createPhoneLink(number));
            phoneList.appendChild(item);
        }
    } else {
        const empty = document.createElement("li");
        empty.textContent = "Telephone details are currently unavailable.";
        phoneList.appendChild(empty);
    }

    const email = content.contact_email.trim();
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
    address.textContent = content.contact_address.trim();
    businessDays.textContent = content.contact_business_days.trim();
    businessHours.textContent =
        `${formatTime(content.contact_open_time)} - ${formatTime(content.contact_close_time)}`;

    const topPhones = document.getElementById("contactTopPhones");
    const phoneIcon = topPhones.querySelector("i")?.cloneNode(true);
    topPhones.replaceChildren();
    if (phoneIcon) {
        topPhones.appendChild(phoneIcon);
        topPhones.append(" ");
    }
    if (phoneNumbers.length) {
        phoneNumbers.slice(0, 2).forEach((number, index) => {
            if (index) {
                topPhones.append(" | ");
            }
            topPhones.appendChild(createPhoneLink(number));
        });
    } else {
        topPhones.append("Telephone details unavailable");
    }

    const topEmail = document.getElementById("contactTopEmail");
    const emailIcon = topEmail.querySelector("i")?.cloneNode(true);
    topEmail.href = `mailto:${email}`;
    topEmail.replaceChildren();
    if (emailIcon) {
        topEmail.append(emailIcon, " ");
    }
    topEmail.append(email);

    const footer = document.getElementById("footerContactDetails");
    footer.replaceChildren();
    for (const number of phoneNumbers) {
        const paragraph = document.createElement("p");
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-phone";
        icon.setAttribute("aria-hidden", "true");
        paragraph.append(icon, " ", createPhoneLink(number));
        footer.appendChild(paragraph);
    }

    const footerEmail = document.createElement("p");
    const footerEmailIcon = document.createElement("i");
    footerEmailIcon.className = "fa-solid fa-envelope";
    footerEmailIcon.setAttribute("aria-hidden", "true");
    const footerEmailLink = document.createElement("a");
    footerEmailLink.href = `mailto:${email}`;
    footerEmailLink.textContent = email;
    footerEmail.append(footerEmailIcon, " ", footerEmailLink);
    footer.appendChild(footerEmail);

    const footerAddress = document.createElement("p");
    const addressIcon = document.createElement("i");
    addressIcon.className = "fa-solid fa-location-dot";
    addressIcon.setAttribute("aria-hidden", "true");
    footerAddress.append(addressIcon, " ", content.contact_address.trim());
    footer.appendChild(footerAddress);
}

async function loadManagedContact() {
    try {
        const endpoint = new URL(getApiBaseUrl());
        endpoint.searchParams.set("path", "/public/site-content");
        const response = await fetch(endpoint, {
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Unable to load public contact information.");
        }

        const content = result.content || {};
        const requiredKeys = [
            "contact_email",
            "contact_address",
            "contact_business_days",
            "contact_open_time",
            "contact_close_time"
        ];
        if (
            typeof content.contact_phone_numbers !== "string" ||
            requiredKeys.some(key => typeof content[key] !== "string" || !content[key].trim())
        ) {
            throw new Error("Public contact information is incomplete.");
        }
        if (
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(content.contact_open_time) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(content.contact_close_time)
        ) {
            throw new Error("Published business hours are invalid.");
        }

        updateManagedContact(content);
        status.textContent = "";
        status.classList.remove("error");
    } catch (error) {
        console.error("Unable to load managed public contact information:", error);
        status.textContent =
            "Contact details could not be refreshed. The currently displayed information is still available.";
        status.classList.add("error");
    }
}

void loadManagedContact();
