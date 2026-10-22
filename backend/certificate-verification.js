import { getApiBaseUrl } from "./config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "./config/supabase.js";

const form = document.getElementById("certificateVerifyForm");
const input = document.getElementById("certificateId");
const message = document.getElementById("certificateVerifyMessage");
const resultSection = document.getElementById("certificateResult");
const verifyButton = document.getElementById("verifyCertificateButton");
const certificateCanvas = document.getElementById("certificatePreview");
const certificatePattern = /^VSG-TRN-\d{4}-\d{3,}$/i;

function text(id, value) {
    document.getElementById(id).textContent = value || "Not specified";
}

function formatDate(value) {
    if (!value) {
        return "Not specified";
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function displayCertificate(certificate) {
    const snapshot = certificate.snapshot || {};
    const revoked = certificate.status === "Revoked";
    const badge = document.getElementById("certificateStatusBadge");
    badge.textContent = revoked ? "REVOKED" : "VALID";
    badge.classList.toggle("revoked", revoked);
    document.getElementById("certificateResultTitle").textContent =
        revoked ? "Certificate revoked" : "Certificate verified";
    const revocationMessage = document.getElementById("revocationMessage");
    revocationMessage.hidden = !revoked;
    revocationMessage.textContent = certificate.revocation_message || "";
    text("resultCertificateId", certificate.certificate_id);
    text("resultOfficerName", snapshot.officer_name);
    text("resultProgramName", snapshot.program_name);
    text("resultDuration", snapshot.duration_hours ? `${snapshot.duration_hours} hours` : "");
    text("resultCompletionDate", formatDate(snapshot.completion_date));
    text("resultIssueDate", formatDate(certificate.issued_at?.slice(0, 10)));
    renderCertificate(snapshot, certificate.certificate_id, certificate);
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCertificate(snapshot, certificateId, certificate) {
    const config = {
        background_url: snapshot.background_url || "",
        title: snapshot.title || "CERTIFICATE OF COMPLETION",
        name_font: ["Arial", "Georgia", "Times New Roman"].includes(snapshot.name_font)
            ? snapshot.name_font
            : "Georgia",
        body_font: ["Arial", "Georgia", "Times New Roman"].includes(snapshot.body_font)
            ? snapshot.body_font
            : "Arial"
    };
    certificateCanvas.replaceChildren();
    certificateCanvas.classList.toggle("has-background", Boolean(config.background_url));
    certificateCanvas.style.backgroundImage = config.background_url
        ? `url("${config.background_url}")`
        : "";

    const add = (tag, className, value) => {
        const element = document.createElement(tag);
        element.className = className;
        if (value !== undefined) {
            element.textContent = value;
        }
        certificateCanvas.appendChild(element);
        return element;
    };

    const watermark = add("img", "certificate-watermark");
    watermark.src = "/assests/images/VAST%20LOGO.png";
    watermark.alt = "";
    watermark.loading = "eager";
    const logo = add("img", "certificate-logo");
    logo.src = "/assests/images/VAST%20LOGO.png";
    logo.alt = "VAST Security Group";
    logo.loading = "eager";
    const title = add("h2", "certificate-title", config.title);
    title.style.fontFamily = config.body_font;
    add("div", "certificate-awarded", "Awarded TO");
    const recipient = add("div", "certificate-recipient", snapshot.officer_name);
    recipient.style.fontFamily = config.name_font;
    const training = add("div", "certificate-training", "");
    training.append(
        "for successfully completing the ",
        Object.assign(document.createElement("strong"), {
            textContent: `${snapshot.duration_hours || 0} hours`
        }),
        ` ${snapshot.program_name || "Training Program"} Program offered by VAST Security Group.`
    );
    add("div", "certificate-statement", snapshot.completion_statement ||
        "The participant has demonstrated dedication, discipline, and commitment throughout the training period.");
    const completion = add("div", "certificate-completion-date", "");
    completion.style.fontFamily = config.body_font;
    const heading = document.createElement("strong");
    heading.textContent = "DATE OF COMPLETION";
    const date = document.createElement("span");
    date.textContent = snapshot.start_date
        ? `${formatDate(snapshot.start_date)} - ${formatDate(snapshot.completion_date)}`
        : formatDate(snapshot.completion_date);
    completion.append(heading, date);
    const medal = add("div", "certificate-medal");
    const medalLogo = document.createElement("img");
    medalLogo.src = "/assests/images/VAST%20LOGO.png";
    medalLogo.alt = "";
    medal.appendChild(medalLogo);
    const id = add("div", "certificate-id", `CERTIFICATE ID.\n${certificateId}`);
    id.style.whiteSpace = "pre-line";
    const signatories = add("div", "certificate-signatories", "");
    for (const signatory of (snapshot.signatories || []).slice(0, 2)) {
        const area = document.createElement("div");
        area.className = "certificate-signatory";
        if (signatory.signature_url) {
            const image = document.createElement("img");
            image.src = signatory.signature_url;
            image.alt = `${signatory.name || "Authorized signatory"} signature`;
            area.appendChild(image);
        }
        const name = document.createElement("strong");
        name.textContent = signatory.name || "";
        const title = document.createElement("span");
        title.textContent = signatory.title || "";
        area.append(name, title);
        signatories.appendChild(area);
    }
    const qr = add("div", "certificate-qr", "");
    if (window.QRCode) {
        const verifyUrl = new URL("/certificate-verification.html", window.location.origin);
        verifyUrl.searchParams.set("id", certificateId);
        new window.QRCode(qr, {
            text: verifyUrl.toString(),
            width: 80,
            height: 80,
            correctLevel: window.QRCode.CorrectLevel.M
        });
    }
    const layoutElements = {
        title: certificateCanvas.querySelector(".certificate-title"),
        awarded: certificateCanvas.querySelector(".certificate-awarded"),
        recipient,
        training,
        statement: certificateCanvas.querySelector(".certificate-statement"),
        completion,
        certificateId: id
    };
    for (const [fieldName, element] of Object.entries(layoutElements)) {
        const position = snapshot.layout?.[fieldName];
        if (!position) {
            continue;
        }
        element.style.left = `${position.x}%`;
        element.style.top = `${position.y}%`;
        element.style.width = `${position.width}%`;
        element.style.height = `${position.height}%`;
        if (position.font_family) element.style.fontFamily = position.font_family;
        if (position.font_size) element.style.fontSize = `${position.font_size}px`;
        if (position.font_weight) element.style.fontWeight = position.font_weight;
        if (position.italic !== undefined) element.style.fontStyle = position.italic ? "italic" : "normal";
        if (position.line_height) element.style.lineHeight = String(position.line_height);
        if (position.color) element.style.color = position.color;
        if (position.align) element.style.textAlign = position.align;
        if (position.visible === false) element.style.display = "none";
    }
}

async function verifyCertificate(event) {
    event.preventDefault();
    const certificateId = input.value.trim().toUpperCase();
    resultSection.hidden = true;
    message.textContent = "";
    message.className = "verification-message";
    if (!certificatePattern.test(certificateId)) {
        message.textContent = "Enter a Certificate ID such as VSG-TRN-2026-015.";
        message.classList.add("error");
        input.focus();
        return;
    }
    verifyButton.disabled = true;
    message.textContent = "Checking the official certificate register…";
    try {
        const endpoint = new URL(getApiBaseUrl());
        endpoint.searchParams.set("path", `/public/certificates/${encodeURIComponent(certificateId)}`);
        const response = await fetch(endpoint, {
            headers: { apikey: SUPABASE_ANON_KEY }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(response.status === 404
                ? "No officially issued certificate was found with that ID."
                : result.message || "Unable to verify this certificate right now.");
        }
        displayCertificate(result.certificate);
        message.textContent = "This result was matched against the current VAST Security Group database.";
    } catch (error) {
        message.textContent = error.message || "Unable to verify this certificate right now.";
        message.classList.add("error");
    } finally {
        verifyButton.disabled = false;
    }
}

form.addEventListener("submit", verifyCertificate);
document.getElementById("printVerifiedCertificate").addEventListener("click", async () => {
    try {
        await Promise.all(
            [...certificateCanvas.querySelectorAll("img")].map(image => image.decode())
        );
    } catch {
        message.textContent = "A certificate image could not be loaded. Refresh before printing.";
        message.classList.add("error");
        return;
    }
    document.body.classList.add("print-certificate");
    window.addEventListener("afterprint", () =>
        document.body.classList.remove("print-certificate"),
    { once: true });
    window.print();
});

const idFromUrl = new URLSearchParams(window.location.search).get("id");
if (idFromUrl) {
    input.value = idFromUrl;
    form.requestSubmit();
}
