import { apiRequest } from "../../backend/services/api.js";
import { getOfficers } from "../../backend/officers/getOfficers.js";
import { getApiBaseUrl } from "../../backend/config/apiUrl.js";
import { SUPABASE_ANON_KEY } from "../../backend/config/supabase.js";
import { confirmAction } from "../auth/confirmDialog.js";

const byId = id => document.getElementById(id);
const pageStatus = byId("certificateStatus");
const certificateCanvas = byId("certificatePreview");
let programs = [];
let batches = [];
let templates = [];
let officers = [];
let certificates = [];
let currentEnrollments = [];
let currentCertificatePage = 0;
const certificatePageSize = 25;
let templateBackgroundPath = "";
const signaturePaths = ["", ""];
let templateLayout = {};
let layoutDrag = null;

function showStatus(message, isError = false) {
    pageStatus.textContent = message;
    pageStatus.className = `form-message${message ? isError ? " error" : " success" : ""}`;
}

function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value || "";
    if (className) {
        cell.className = className;
    }
    row.appendChild(cell);
    return cell;
}

function currentTemplateVersion(template) {
    const versions = [...(template.versions || [])]
        .sort((a, b) => b.version - a.version);
    return versions[0] || null;
}

function renderSelect(select, items, placeholder, valueOf, labelOf) {
    const selectedValue = select.value;
    select.replaceChildren();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);
    for (const item of items) {
        const option = document.createElement("option");
        option.value = valueOf(item);
        option.textContent = labelOf(item);
        select.appendChild(option);
    }
    if ([...select.options].some(option => option.value === selectedValue)) {
        select.value = selectedValue;
    }
}

function renderPrograms() {
    const templateOptions = templates.map(template => ({
        id: template.id,
        name: `${template.name} (v${currentTemplateVersion(template)?.version || template.current_version})`
    }));
    renderSelect(byId("programTemplate"), templateOptions, "No template selected", item => item.id, item => item.name);
    renderSelect(byId("batchProgram"), programs, "Select a program", item => item.id, item => item.name);

    const body = byId("programTableBody");
    body.replaceChildren();
    if (!programs.length) {
        body.innerHTML = '<tr><td colspan="4">No training programs have been created.</td></tr>';
        return;
    }
    for (const program of programs) {
        const row = document.createElement("tr");
        addCell(row, program.name);
        addCell(row, `${program.duration_hours} hours`);
        const template = templates.find(item => item.id === program.certificate_template_id);
        addCell(row, template ? `${template.name} (v${currentTemplateVersion(template)?.version || 1})` : "Not assigned");
        addCell(row, program.is_active ? "Active" : "Inactive");
        body.appendChild(row);
    }
}

function renderBatches() {
    renderSelect(byId("enrollmentBatch"), batches, "Select a batch", item => item.id, item => `${item.name} — ${item.program?.name || "Program"}`);
    const body = byId("batchTableBody");
    body.replaceChildren();
    if (!batches.length) {
        body.innerHTML = '<tr><td colspan="4">No training batches have been created.</td></tr>';
        return;
    }
    for (const batch of batches) {
        const row = document.createElement("tr");
        addCell(row, batch.name);
        addCell(row, batch.program?.name || "Unknown program");
        addCell(row, `${batch.start_date}${batch.completion_date ? ` to ${batch.completion_date}` : ""}`);
        addCell(row, batch.status);
        body.appendChild(row);
    }
}

function renderTemplates() {
    const templateOptions = templates.map(template => ({
        id: template.id,
        name: `${template.name} (v${currentTemplateVersion(template)?.version || 1})`
    }));
    renderSelect(byId("programTemplate"), templateOptions, "No template selected", item => item.id, item => item.name);
    const body = byId("templateTableBody");
    body.replaceChildren();
    if (!templates.length) {
        body.innerHTML = '<tr><td colspan="3">No certificate templates have been created.</td></tr>';
        return;
    }
    for (const template of templates) {
        const row = document.createElement("tr");
        addCell(row, template.name);
        addCell(row, String(currentTemplateVersion(template)?.version || template.current_version));
        const actions = document.createElement("td");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-btn";
        button.textContent = "Edit as new version";
        button.addEventListener("click", () => {
            loadTemplate(template).catch(error =>
                showStatus(error.message || "Unable to load template.", true)
            );
        });
        actions.appendChild(button);
        row.appendChild(actions);
        body.appendChild(row);
    }
}

async function loadTemplate(template) {
    const version = currentTemplateVersion(template);
    if (!version) {
        showStatus("This template has no saved version.", true);
        return;
    }
    const config = version.configuration || {};
    byId("templateId").value = template.id;
    byId("templateName").value = template.name;
    byId("templateTitle").value = config.title || "CERTIFICATE OF COMPLETION";
    byId("templateStatement").value = config.completion_statement || "";
    byId("nameFont").value = config.name_font || "Georgia";
    byId("bodyFont").value = config.body_font || "Arial";
    templateLayout = config.layout && typeof config.layout === "object"
        ? structuredClone(config.layout)
        : {};
    templateBackgroundPath = config.background_path || "";
    templateBackgroundPathUrl = templateBackgroundPath
        ? (await signAsset(templateBackgroundPath)).signed_url
        : "";
    const signatories = Array.isArray(config.signatories) ? config.signatories : [];
    for (let index = 0; index < 2; index += 1) {
        const item = signatories[index] || {};
        byId(`signatory${index + 1}Enabled`).checked = item.enabled === true;
        byId(`signatory${index + 1}Name`).value = item.name || "";
        byId(`signatory${index + 1}Title`).value = item.title || "";
        signaturePaths[index] = item.signature_path || "";
        byId(`signatory${index + 1}Image`).value = "";
        byId(`signatory${index + 1}Approved`).checked = false;
        signaturePreviewUrls[index] = item.signature_path
            ? (await signAsset(item.signature_path)).signed_url
            : "";
    }
    byId("templateBackground").value = "";
    byId("saveTemplateButton").textContent = "Save new version";
    renderCertificate({
        officer_name: "Officer Full Name",
        program_name: "Mandatory Security Training",
        duration_hours: 672,
        start_date: "2026-08-01",
        completion_date: "2026-08-31",
        completion_statement: config.completion_statement,
        template_configuration: {
            ...config,
            background_path_url: templateBackgroundPathUrl
        },
        signatories: signatories.map(item => ({
            ...item,
            signature_url: signaturePreviewUrls[signatories.indexOf(item)] || null
        }))
    }, "VSG-TRN-2026-015");
    setTemplateEditing(true);
    byId("printCertificateButton").hidden = true;
    updateFieldStyleControls();
    showStatus(`Loaded ${template.name} version ${version.version}; saving will create a new immutable version.`);
}

function renderEnrollments() {
    const body = byId("enrollmentTableBody");
    body.replaceChildren();
    if (!currentEnrollments.length) {
        body.innerHTML = '<tr><td colspan="5">No officers are enrolled in this batch.</td></tr>';
        return;
    }
    const selectedBatch = batches.find(batch => batch.id === byId("enrollmentBatch").value);
    const program = programs.find(item => item.id === selectedBatch?.program_id);
    const availableTemplates = templates.filter(template =>
        !program?.certificate_template_id || template.id === program.certificate_template_id
    );
    for (const enrollment of currentEnrollments) {
        const row = document.createElement("tr");
        addCell(row, enrollment.officer?.name || "Unknown officer");
        addCell(row, enrollment.officer?.officer_id || "");

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        statusSelect.dataset.enrollmentStatus = enrollment.id;
        for (const status of ["Enrolled", "In Progress", "Completed", "Withdrawn"]) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        }
        statusSelect.value = enrollment.enrollment_status;
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        const dateCell = document.createElement("td");
        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.dataset.completionDate = enrollment.id;
        dateInput.value = enrollment.completion_date || "";
        dateCell.appendChild(dateInput);
        row.appendChild(dateCell);

        const actionCell = document.createElement("td");
        const save = document.createElement("button");
        save.type = "button";
        save.className = "secondary-btn";
        save.textContent = "Save";
        save.addEventListener("click", () => updateEnrollment(enrollment.id));
        actionCell.appendChild(save);
        if (enrollment.enrollment_status === "Completed") {
            const versionSelect = document.createElement("select");
            versionSelect.setAttribute("aria-label", `Template for ${enrollment.officer?.name || "officer"}`);
            for (const template of availableTemplates) {
                const version = currentTemplateVersion(template);
                if (!version) {
                    continue;
                }
                const option = document.createElement("option");
                option.value = version.id;
                option.textContent = `${template.name} (v${version.version})`;
                versionSelect.appendChild(option);
            }
            if (program?.certificate_template_id) {
                const chosen = availableTemplates.find(template => template.id === program.certificate_template_id);
                const version = chosen && currentTemplateVersion(chosen);
                if (version) {
                    versionSelect.value = version.id;
                }
            }
            const issue = document.createElement("button");
            issue.type = "button";
            issue.className = "primary-btn";
            issue.textContent = "Issue";
            issue.disabled = !versionSelect.options.length;
            issue.addEventListener("click", () => issueCertificates([enrollment.id], versionSelect.value));
            const preview = document.createElement("button");
            preview.type = "button";
            preview.className = "secondary-btn";
            preview.textContent = "Preview";
            preview.disabled = !versionSelect.options.length;
            preview.addEventListener("click", () =>
                previewEnrollment(enrollment, selectedBatch, program, versionSelect.value)
            );
            actionCell.append(versionSelect, preview, issue);
        }
        row.appendChild(actionCell);
        body.appendChild(row);
    }
}

function renderCertificate(snapshot, certificateId, certificate = {}) {
    const config = {
        ...(snapshot.template_configuration || {}),
        background_url: snapshot.background_url ||
            snapshot.template_configuration?.background_url ||
            "",
        background_path_url: snapshot.template_configuration?.background_path_url || ""
    };
    const nameFont = ["Arial", "Georgia", "Times New Roman"].includes(config.name_font || snapshot.name_font)
        ? (config.name_font || snapshot.name_font)
        : "Georgia";
    const bodyFont = ["Arial", "Georgia", "Times New Roman"].includes(config.body_font || snapshot.body_font)
        ? (config.body_font || snapshot.body_font)
        : "Arial";
    certificateCanvas.replaceChildren();
    certificateCanvas.dataset.editable = "false";
    certificateCanvas.classList.toggle("has-background", Boolean(config.background_url || config.background_path_url));
    certificateCanvas.style.backgroundImage = config.background_url || config.background_path_url
        ? `url("${config.background_url || config.background_path_url}")`
        : "";
    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) {
            node.textContent = text;
        }
        certificateCanvas.appendChild(node);
        return node;
    };

    const watermark = el("img", "certificate-watermark");
    watermark.src = "/assests/images/VAST%20LOGO.png";
    watermark.alt = "";
    const logo = el("img", "certificate-logo");
    logo.src = "/assests/images/VAST%20LOGO.png";
    logo.alt = "VAST Security Group";
    const title = el("h2", "certificate-title", config.title || snapshot.title || "CERTIFICATE OF COMPLETION");
    title.dataset.layoutField = "title";
    title.style.fontFamily = bodyFont;
    const awarded = el("div", "certificate-awarded", "Awarded TO");
    awarded.dataset.layoutField = "awarded";
    const recipient = el("div", "certificate-recipient", snapshot.officer_name || "Officer Full Name");
    recipient.dataset.layoutField = "recipient";
    recipient.style.fontFamily = nameFont;
    el("div", "certificate-training", "");
    const training = certificateCanvas.querySelector(".certificate-training");
    training.dataset.layoutField = "training";
    training.append("for successfully completing the ");
    const hours = document.createElement("strong");
    hours.textContent = `${snapshot.duration_hours || 0} hours`;
    training.append(hours, ` ${snapshot.program_name || "Training Program"} Program offered by VAST Security Group.`);
    const statement = el("div", "certificate-statement", snapshot.completion_statement ||
        "The participant has demonstrated dedication, discipline, and commitment throughout the training period.");
    statement.dataset.layoutField = "statement";
    const completion = el("div", "certificate-completion-date", "");
    completion.dataset.layoutField = "completion";
    completion.style.fontFamily = bodyFont;
    const completionHeading = document.createElement("strong");
    completionHeading.textContent = "DATE OF COMPLETION";
    const completionDate = document.createElement("span");
    completionDate.textContent = snapshot.start_date
        ? `${formatDate(snapshot.start_date)} - ${formatDate(snapshot.completion_date || snapshot.end_date)}`
        : formatDate(snapshot.completion_date || snapshot.end_date);
    completion.append(completionHeading, completionDate);
    const medal = el("div", "certificate-medal");
    const medalLogo = document.createElement("img");
    medalLogo.src = "/assests/images/VAST%20LOGO.png";
    medalLogo.alt = "";
    medal.appendChild(medalLogo);
    const id = el("div", "certificate-id", `CERTIFICATE ID.\n${certificateId || "Assigned on issue"}`);
    id.dataset.layoutField = "certificateId";
    id.style.whiteSpace = "pre-line";
    const signatures = el("div", "certificate-signatories");
    const signatoryList = Array.isArray(snapshot.signatories) ? snapshot.signatories : [];
    for (const signatory of signatoryList.filter(item => item.enabled === true).slice(0, 2)) {
        const signature = document.createElement("div");
        signature.className = "certificate-signatory";
        if (signatory.signature_url) {
            const image = document.createElement("img");
            image.src = signatory.signature_url;
            image.alt = `${signatory.name || "Authorized signatory"} signature`;
            signature.appendChild(image);
        }
        const name = document.createElement("strong");
        name.textContent = signatory.name || "";
        const role = document.createElement("span");
        role.textContent = signatory.title || "";
        signature.append(name, role);
        signatures.appendChild(signature);
    }
    const qr = el("div", "certificate-qr");
    qr.hidden = !certificateId;
    qr.setAttribute("aria-label", "Certificate verification QR code");
    const verificationUrl = `${window.location.origin}/certificate-verification.html?id=${encodeURIComponent(certificateId || "")}`;
    if (window.QRCode && certificateId) {
        new window.QRCode(qr, {
            text: verificationUrl,
            width: 80,
            height: 80,
            correctLevel: window.QRCode.CorrectLevel.M
        });
    }
    title.dataset.certificateIssuedAt = certificate.issued_at || "";
    const layout = config.layout || snapshot.layout || {};
    for (const [key, element] of Object.entries({
        title,
        awarded,
        recipient,
        training,
        statement,
        completion,
        certificateId: id
    })) {
        const position = layout[key];
        if (!position || typeof position !== "object") {
            continue;
        }
        element.style.left = `${position.x}%`;
        element.style.top = `${position.y}%`;
        element.style.width = `${position.width}%`;
        if (position.height) {
            element.style.height = `${position.height}%`;
        }
        if (position.font_size) {
            element.style.fontSize = `${position.font_size}px`;
        }
        if (position.font_family) {
            element.style.fontFamily = position.font_family;
        }
        if (position.font_weight) {
            element.style.fontWeight = position.font_weight;
        }
        if (position.italic !== undefined) {
            element.style.fontStyle = position.italic ? "italic" : "normal";
        }
        if (position.line_height) {
            element.style.lineHeight = String(position.line_height);
        }
        if (position.color) {
            element.style.color = position.color;
        }
        if (position.align) {
            element.style.textAlign = position.align;
        }
        if (position.visible === false) {
            element.style.display = "none";
        }
    }
}

function setTemplateEditing(enabled) {
    certificateCanvas.dataset.editable = String(enabled);
    certificateCanvas.querySelectorAll("[data-layout-field]").forEach(field => {
        field.tabIndex = enabled ? 0 : -1;
        field.setAttribute("aria-label", enabled
            ? `Drag to reposition ${field.dataset.layoutField}; drag the lower-right corner to resize`
            : field.dataset.layoutField);
    });
}

function updateFieldStyleControls() {
    const key = byId("layoutField").value;
    const existing = templateLayout[key] || {};
    byId("layoutFont").value = existing.font_family || (
        key === "recipient" ? byId("nameFont").value : byId("bodyFont").value
    );
    byId("layoutFontSize").value = existing.font_size || 18;
    byId("layoutFontWeight").value = existing.font_weight || "400";
    byId("layoutColor").value = existing.color || "#111111";
    byId("layoutAlign").value = existing.align || "center";
    byId("layoutLineHeight").value = existing.line_height || 1.2;
    byId("layoutItalic").checked = existing.italic === true;
    byId("layoutVisible").checked = existing.visible !== false;
}

function currentFieldGeometry(key) {
    const field = certificateCanvas.querySelector(`[data-layout-field="${key}"]`);
    if (!field) {
        throw new Error("Preview the template before formatting its fields.");
    }
    const canvasRect = certificateCanvas.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    return {
        x: Math.round(((fieldRect.left - canvasRect.left) / canvasRect.width) * 1000) / 10,
        y: Math.round(((fieldRect.top - canvasRect.top) / canvasRect.height) * 1000) / 10,
        width: Math.round((fieldRect.width / canvasRect.width) * 1000) / 10,
        height: Math.round((fieldRect.height / canvasRect.height) * 1000) / 10
    };
}

function applySelectedFieldStyle() {
    const key = byId("layoutField").value;
    const position = {
        ...(templateLayout[key] || currentFieldGeometry(key)),
        font_family: byId("layoutFont").value,
        font_size: Number(byId("layoutFontSize").value),
        font_weight: byId("layoutFontWeight").value,
        italic: byId("layoutItalic").checked,
        color: byId("layoutColor").value,
        align: byId("layoutAlign").value,
        line_height: Number(byId("layoutLineHeight").value),
        visible: byId("layoutVisible").checked
    };
    templateLayout[key] = position;
    const field = certificateCanvas.querySelector(`[data-layout-field="${key}"]`);
    field.style.fontFamily = position.font_family;
    field.style.fontSize = `${position.font_size}px`;
    field.style.fontWeight = position.font_weight;
    field.style.fontStyle = position.italic ? "italic" : "normal";
    field.style.color = position.color;
    field.style.textAlign = position.align;
    field.style.lineHeight = String(position.line_height);
    field.style.display = position.visible ? "" : "none";
    setTemplateEditing(true);
}

certificateCanvas.addEventListener("pointerdown", event => {
    if (certificateCanvas.dataset.editable !== "true") {
        return;
    }
    const field = event.target.closest("[data-layout-field]");
    if (!field) {
        return;
    }
    const canvasRect = certificateCanvas.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const resize = event.clientX >= fieldRect.right - 16 &&
        event.clientY >= fieldRect.bottom - 16;
    layoutDrag = {
        field,
        key: field.dataset.layoutField,
        resize,
        startX: event.clientX,
        startY: event.clientY,
        x: fieldRect.left - canvasRect.left,
        y: fieldRect.top - canvasRect.top,
        width: fieldRect.width,
        height: fieldRect.height,
        canvasWidth: canvasRect.width,
        canvasHeight: canvasRect.height
    };
    field.setPointerCapture(event.pointerId);
    event.preventDefault();
});

window.addEventListener("pointermove", event => {
    if (!layoutDrag) {
        return;
    }
    const dx = event.clientX - layoutDrag.startX;
    const dy = event.clientY - layoutDrag.startY;
    const x = layoutDrag.resize
        ? layoutDrag.x
        : Math.max(0, Math.min(layoutDrag.canvasWidth - layoutDrag.width, layoutDrag.x + dx));
    const y = layoutDrag.resize
        ? layoutDrag.y
        : Math.max(0, Math.min(layoutDrag.canvasHeight - layoutDrag.height, layoutDrag.y + dy));
    const width = layoutDrag.resize
        ? Math.min(layoutDrag.canvasWidth - x, Math.max(50, layoutDrag.width + dx))
        : layoutDrag.width;
    const height = layoutDrag.resize
        ? Math.min(layoutDrag.canvasHeight - y, Math.max(24, layoutDrag.height + dy))
        : layoutDrag.height;
    const field = layoutDrag.field;
    field.style.left = `${(x / layoutDrag.canvasWidth) * 100}%`;
    field.style.top = `${(y / layoutDrag.canvasHeight) * 100}%`;
    field.style.width = `${(width / layoutDrag.canvasWidth) * 100}%`;
    field.style.height = `${(height / layoutDrag.canvasHeight) * 100}%`;
});

window.addEventListener("pointerup", () => {
    if (!layoutDrag) {
        return;
    }
    const { field, key, canvasWidth, canvasHeight } = layoutDrag;
    const canvasRect = certificateCanvas.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    templateLayout[key] = {
        x: Math.round(((fieldRect.left - canvasRect.left) / canvasWidth) * 1000) / 10,
        y: Math.round(((fieldRect.top - canvasRect.top) / canvasHeight) * 1000) / 10,
        width: Math.round((fieldRect.width / canvasWidth) * 1000) / 10,
        height: Math.round((fieldRect.height / canvasHeight) * 1000) / 10
    };
    layoutDrag = null;
});

byId("layoutField").addEventListener("change", updateFieldStyleControls);
byId("applyFieldStyle").addEventListener("click", () => {
    try {
        applySelectedFieldStyle();
        showStatus("Field formatting updated in the template preview.");
    } catch (error) {
        showStatus(error.message, true);
    }
});

function formatDate(value) {
    if (!value) {
        return "Not specified";
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

async function loadEnrollments() {
    const batchId = byId("enrollmentBatch").value;
    currentEnrollments = [];
    if (!batchId) {
        renderEnrollments();
        return;
    }
    const result = await apiRequest(`/training/enrollments?batch_id=${encodeURIComponent(batchId)}`);
    currentEnrollments = result.enrollments || [];
    renderEnrollments();
}

async function updateEnrollment(enrollmentId) {
    try {
        const enrollmentStatus = document.querySelector(`[data-enrollment-status="${CSS.escape(enrollmentId)}"]`).value;
        const completionDate = document.querySelector(`[data-completion-date="${CSS.escape(enrollmentId)}"]`).value;
        await apiRequest(`/training/enrollments/${encodeURIComponent(enrollmentId)}`, {
            method: "PATCH",
            body: JSON.stringify({ enrollment_status: enrollmentStatus, completion_date: completionDate })
        });
        showStatus("Enrollment saved.");
        await loadEnrollments();
    } catch (error) {
        showStatus(error.message || "Unable to update enrollment.", true);
    }
}

async function uploadAsset(file, assetType, managementApproved = false) {
    const form = new FormData();
    form.append("file", file);
    form.append("asset_type", assetType);
    if (managementApproved) {
        form.append("management_approved", "true");
    }
    return apiRequest("/certificates/assets", { method: "POST", body: form });
}

async function signAsset(path) {
    return apiRequest("/certificates/assets/sign", {
        method: "POST",
        body: JSON.stringify({ path })
    });
}

async function templateConfiguration() {
    if (byId("templateBackground").files[0]) {
        const uploaded = await uploadAsset(byId("templateBackground").files[0], "background");
        templateBackgroundPath = uploaded.path;
        templateBackgroundPathUrl = uploaded.signed_url;
    }
    const signatories = [];
    for (let index = 0; index < 2; index += 1) {
        const slot = index + 1;
        const image = byId(`signatory${slot}Image`).files[0];
        if (image) {
            if (!byId(`signatory${slot}Approved`).checked) {
                throw new Error(`Confirm management approval for signature slot ${slot}.`);
            }
            const uploaded = await uploadAsset(image, "signature", true);
            signaturePaths[index] = uploaded.path;
            signaturePreviewUrls[index] = uploaded.signed_url;
        }
        signatories.push({
            enabled: byId(`signatory${slot}Enabled`).checked,
            name: byId(`signatory${slot}Name`).value.trim(),
            title: byId(`signatory${slot}Title`).value.trim(),
            signature_path: signaturePaths[index]
        });
    }
    return {
        title: byId("templateTitle").value.trim(),
        completion_statement: byId("templateStatement").value.trim(),
        name_font: byId("nameFont").value,
        body_font: byId("bodyFont").value,
        background_path: templateBackgroundPath,
        layout: templateLayout,
        signatories
    };
}

let templateBackgroundPathUrl = "";
const signaturePreviewUrls = ["", ""];

async function saveTemplate(event) {
    event.preventDefault();
    const button = byId("saveTemplateButton");
    button.disabled = true;
    try {
        const configuration = await templateConfiguration();
        const templateId = byId("templateId").value;
        const endpoint = templateId
            ? `/training/templates/${encodeURIComponent(templateId)}`
            : "/training/templates";
        const result = await apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify({
                name: byId("templateName").value.trim(),
                configuration
            })
        });
        showStatus(templateId
            ? `Saved immutable template version ${result.version.version}.`
            : "Certificate template created.");
        await loadData();
        if (!templateId) {
            await loadTemplate(templates.find(item => item.id === result.template.id));
        }
    } catch (error) {
        showStatus(error.message || "Unable to save certificate template.", true);
    } finally {
        button.disabled = false;
    }
}

function resetTemplate() {
    byId("templateForm").reset();
    byId("templateId").value = "";
    byId("templateTitle").value = "CERTIFICATE OF COMPLETION";
    byId("templateStatement").value = "The participant has demonstrated dedication, discipline, and commitment throughout the training period.";
    byId("saveTemplateButton").textContent = "Create template";
    templateBackgroundPath = "";
    templateBackgroundPathUrl = "";
    templateLayout = {};
    signaturePaths.fill("");
    signaturePreviewUrls.fill("");
    setTemplateEditing(false);
}

async function issueCertificates(enrollmentIds, templateVersionId) {
    if (!templateVersionId) {
        showStatus("Select a certificate template before issuing.", true);
        return;
    }
    try {
        const result = await apiRequest("/certificates/issue", {
            method: "POST",
            body: JSON.stringify({
                enrollment_ids: enrollmentIds,
                template_version_id: templateVersionId
            })
        });
        showStatus(result.failed?.length
            ? `${result.message} ${result.failed.length} enrollment(s) could not be issued.`
            : result.message);
        await Promise.all([loadEnrollments(), loadCertificates()]);
    } catch (error) {
        showStatus(error.message || "Unable to issue certificate.", true);
    }
}

async function previewEnrollment(enrollment, batch, program, templateVersionId) {
    try {
        const template = templates.find(item =>
            (item.versions || []).some(version => version.id === templateVersionId)
        );
        const version = template?.versions?.find(item => item.id === templateVersionId);
        if (!template || !version) {
            throw new Error("The selected certificate template version is unavailable.");
        }
        const configuration = version.configuration || {};
        const backgroundUrl = configuration.background_path
            ? (await signAsset(configuration.background_path)).signed_url
            : "";
        const signatories = await Promise.all(
            (Array.isArray(configuration.signatories) ? configuration.signatories : [])
                .filter(item => item.enabled === true)
                .map(async item => ({
                    ...item,
                    signature_url: item.signature_path
                        ? (await signAsset(item.signature_path)).signed_url
                        : null
                }))
        );
        renderCertificate({
            officer_name: enrollment.officer?.name,
            program_name: program?.name,
            duration_hours: program?.duration_hours,
            start_date: batch?.start_date,
            completion_date: enrollment.completion_date || batch?.completion_date,
            completion_statement: configuration.completion_statement,
            title: configuration.title,
            name_font: configuration.name_font,
            body_font: configuration.body_font,
            layout: configuration.layout,
            background_url: backgroundUrl,
            signatories,
            template_configuration: {
                ...configuration,
                background_path_url: backgroundUrl
            }
        }, "");
        setTemplateEditing(false);
        byId("printCertificateButton").hidden = true;
        certificateCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
        showStatus(`Preview for ${enrollment.officer?.name || "officer"}; the Certificate ID is assigned when issued.`);
    } catch (error) {
        showStatus(error.message || "Unable to preview this certificate.", true);
    }
}

function certificateMatches(certificate, query, status) {
    return (!status || certificate.status === status) &&
        (!query || [
            certificate.certificate_id,
            certificate.officer?.name,
            certificate.officer?.officer_id,
            certificate.program?.name
        ].filter(Boolean).join(" ").toLowerCase().includes(query));
}

function renderCertificates() {
    const body = byId("certificateTableBody");
    body.replaceChildren();
    const query = byId("certificateSearch").value.trim().toLowerCase();
    const status = byId("certificateStatusFilter").value;
    const filtered = certificates.filter(item => certificateMatches(item, query, status));
    const pageCount = Math.max(1, Math.ceil(filtered.length / certificatePageSize));
    currentCertificatePage = Math.min(currentCertificatePage, pageCount - 1);
    const pageItems = filtered.slice(
        currentCertificatePage * certificatePageSize,
        (currentCertificatePage + 1) * certificatePageSize
    );
    if (!filtered.length) {
        body.innerHTML = '<tr><td colspan="6">No certificates match the current filters.</td></tr>';
        updateCertificatePagination(filtered.length, pageCount);
        return;
    }
    for (const certificate of pageItems) {
        const row = document.createElement("tr");
        addCell(row, certificate.certificate_id);
        addCell(row, certificate.officer?.name || certificate.snapshot?.officer_name);
        addCell(row, certificate.program?.name || certificate.snapshot?.program_name);
        addCell(row, certificate.status, `certificate-status-${certificate.status.toLowerCase()}`);
        addCell(row, certificate.issued_at ? formatDate(certificate.issued_at.slice(0, 10)) : "Not issued");
        const actions = document.createElement("td");
        actions.className = "certificate-table-actions";
        const print = document.createElement("button");
        print.type = "button";
        print.textContent = "Preview / Print";
        print.addEventListener("click", () => showIssuedCertificate(certificate));
        actions.appendChild(print);
        const verify = document.createElement("a");
        verify.href = `/certificate-verification.html?id=${encodeURIComponent(certificate.certificate_id)}`;
        verify.target = "_blank";
        verify.rel = "noopener";
        verify.textContent = "Verify";
        actions.appendChild(verify);
        const reissue = document.createElement("button");
        reissue.type = "button";
        reissue.textContent = "Reissue";
        reissue.addEventListener("click", () => reissueCertificate(certificate));
        actions.appendChild(reissue);
        if (certificate.status === "Issued") {
            const revoke = document.createElement("button");
            revoke.type = "button";
            revoke.textContent = "Revoke";
            revoke.addEventListener("click", () => revokeCertificate(certificate));
            actions.appendChild(revoke);
        }
        row.appendChild(actions);
        body.appendChild(row);
    }
    updateCertificatePagination(filtered.length, pageCount);
}

function updateCertificatePagination(total, pages) {
    const status = byId("certificatePageStatus");
    status.textContent = `${total ? currentCertificatePage * certificatePageSize + 1 : 0}-${Math.min((currentCertificatePage + 1) * certificatePageSize, total)} of ${total}`;
    byId("previousCertificatePage").disabled = currentCertificatePage <= 0;
    byId("nextCertificatePage").disabled = currentCertificatePage >= pages - 1;
}

async function fetchPublicCertificate(certificateId) {
    const url = new URL(getApiBaseUrl());
    url.searchParams.set("path", `/public/certificates/${encodeURIComponent(certificateId)}`);
    const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Unable to load certificate.");
    }
    return result.certificate;
}

async function showIssuedCertificate(certificate) {
    try {
        const publicRecord = await fetchPublicCertificate(certificate.certificate_id);
        renderCertificate(publicRecord.snapshot, publicRecord.certificate_id, publicRecord);
        certificateCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
        byId("printCertificateButton").hidden = false;
        byId("printCertificateButton").onclick = () => {
            document.body.classList.add("print-certificate");
            window.addEventListener("afterprint", () => document.body.classList.remove("print-certificate"), { once: true });
            window.print();
        };
    } catch (error) {
        showStatus(error.message || "Unable to display certificate.", true);
    }
}

async function revokeCertificate(certificate) {
    const confirmed = await confirmAction(
        `Revoke certificate ${certificate.certificate_id}? You will be asked to provide a reason.`
    );
    if (!confirmed) {
        return;
    }
    const reason = window.prompt("Enter the reason for revocation:");
    if (!reason?.trim()) {
        showStatus("Revocation cancelled: a reason is required.", true);
        return;
    }
    try {
        await apiRequest(`/certificates/${encodeURIComponent(certificate.id)}/revoke`, {
            method: "POST",
            body: JSON.stringify({ reason })
        });
        showStatus(`Certificate ${certificate.certificate_id} was revoked.`);
        await loadCertificates();
    } catch (error) {
        showStatus(error.message || "Unable to revoke certificate.", true);
    }
}

async function reissueCertificate(certificate) {
    const confirmed = await confirmAction(
        `Create a new certificate ID for ${certificate.officer?.name || certificate.snapshot?.officer_name}? The old certificate record will remain unchanged.`
    );
    if (!confirmed) {
        return;
    }
    const program = programs.find(item => item.id === certificate.program_id);
    const template = templates.find(item =>
        item.id === (program?.certificate_template_id || certificate.snapshot?.template_id)
    );
    const templateVersion = template
        ? currentTemplateVersion(template)
        : null;
    const templateVersionId = templateVersion?.id || certificate.template_version_id;
    try {
        await apiRequest("/certificates/reissue", {
            method: "POST",
            body: JSON.stringify({
                enrollment_id: certificate.enrollment_id,
                template_version_id: templateVersionId,
                reissued_from: certificate.id
            })
        });
        showStatus("Certificate reissued with a new ID; the prior record was preserved.");
        await loadCertificates();
    } catch (error) {
        showStatus(error.message || "Unable to reissue certificate.", true);
    }
}

async function loadCertificates() {
    const result = await apiRequest("/certificates");
    certificates = result.certificates || [];
    renderCertificates();
}

async function loadData() {
    const [programResult, batchResult, templateResult, officerResult] = await Promise.all([
        apiRequest("/training/programs"),
        apiRequest("/training/batches"),
        apiRequest("/training/templates"),
        getOfficers()
    ]);
    programs = programResult.programs || [];
    batches = batchResult.batches || [];
    templates = templateResult.templates || [];
    officers = officerResult || [];
    renderPrograms();
    renderBatches();
    renderTemplates();

    const officerSelect = byId("enrollmentOfficers");
    officerSelect.replaceChildren();
    for (const officer of officers) {
        const option = document.createElement("option");
        option.value = officer.id;
        option.textContent = `${officer.name} (${officer.officer_id})`;
        officerSelect.appendChild(option);
    }
    await loadCertificates();
    if (byId("enrollmentBatch").value) {
        await loadEnrollments();
    }
}

byId("programForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        await apiRequest("/training/programs", {
            method: "POST",
            body: JSON.stringify({
                name: byId("programName").value.trim(),
                duration_hours: Number(byId("programHours").value),
                description: byId("programDescription").value.trim(),
                certificate_template_id: byId("programTemplate").value || null
            })
        });
        event.currentTarget.reset();
        showStatus("Training program created.");
        await loadData();
    } catch (error) {
        showStatus(error.message || "Unable to create training program.", true);
    }
});

byId("batchForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        await apiRequest("/training/batches", {
            method: "POST",
            body: JSON.stringify({
                program_id: byId("batchProgram").value,
                name: byId("batchName").value.trim(),
                start_date: byId("batchStart").value,
                completion_date: byId("batchCompletion").value || null,
                description: byId("batchDescription").value.trim()
            })
        });
        event.currentTarget.reset();
        showStatus("Training batch created.");
        await loadData();
    } catch (error) {
        showStatus(error.message || "Unable to create training batch.", true);
    }
});

byId("enrollmentForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        const officerIds = [...byId("enrollmentOfficers").selectedOptions].map(option => option.value);
        await apiRequest("/training/enrollments", {
            method: "POST",
            body: JSON.stringify({ batch_id: byId("enrollmentBatch").value, officer_ids: officerIds })
        });
        showStatus(`${officerIds.length} officer${officerIds.length === 1 ? "" : "s"} enrolled.`);
        await loadEnrollments();
    } catch (error) {
        showStatus(error.message || "Unable to enroll officers.", true);
    }
});

byId("templateForm").addEventListener("submit", saveTemplate);
byId("enrollmentBatch").addEventListener("change", () => {
    loadEnrollments().catch(error => showStatus(error.message || "Unable to load enrollments.", true));
});
byId("certificateSearch").addEventListener("input", () => {
    currentCertificatePage = 0;
    renderCertificates();
});
byId("certificateStatusFilter").addEventListener("change", () => {
    currentCertificatePage = 0;
    renderCertificates();
});
byId("refreshCertificates").addEventListener("click", () => {
    loadCertificates().catch(error => showStatus(error.message || "Unable to refresh certificates.", true));
});
byId("previousCertificatePage").addEventListener("click", () => {
    currentCertificatePage -= 1;
    renderCertificates();
});
byId("nextCertificatePage").addEventListener("click", () => {
    currentCertificatePage += 1;
    renderCertificates();
});
byId("previewTemplateButton").addEventListener("click", async () => {
    try {
        const configuration = await templateConfiguration();
        renderCertificate({
            officer_name: "Officer Full Name",
            program_name: "Mandatory Security Training",
            duration_hours: 672,
            start_date: "2026-08-01",
            completion_date: "2026-08-31",
            completion_statement: configuration.completion_statement,
            template_configuration: {
                ...configuration,
                background_path_url: templateBackgroundPathUrl
            },
            signatories: configuration.signatories.map((item, index) => ({
                ...item,
                signature_url: signaturePreviewUrls[index]
            }))
        }, "VSG-TRN-2026-015");
        setTemplateEditing(true);
        byId("printCertificateButton").hidden = true;
        updateFieldStyleControls();
        showStatus("Preview updated with sample certificate data.");
    } catch (error) {
        showStatus(error.message || "Unable to preview template.", true);
    }
});
byId("clearTemplateButton").addEventListener("click", () => {
    resetTemplate();
    showStatus("");
});

loadData().catch(error => {
    console.error("Certificate management data load failed:", error);
    showStatus(error.message || "Certificate management data could not be loaded.", true);
});
