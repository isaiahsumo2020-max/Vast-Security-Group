import { getCurrentAdmin } from "../../backend/auth/session.js";
import { addOfficer } from "../../backend/officers/addOfficer.js";
import { deleteOfficer } from "../../backend/officers/deleteOfficer.js";
import { editOfficer } from "../../backend/officers/editOfficer.js";
import { getOfficers } from "../../backend/officers/getOfficers.js";
import { apiRequest } from "../../backend/services/api.js";
import { confirmAction } from "../auth/confirmDialog.js";
import {
    previewImageFile,
    validateImageFile
} from "../js/uploadPhoto.js";

const elements = {
    addButton: document.getElementById("addOfficerBtn"),
    editor: document.getElementById("officerEditor"),
    editorTitle: document.getElementById("officerEditorTitle"),
    form: document.getElementById("officerForm"),
    formMessage: document.getElementById("officerFormMessage"),
    saveButton: document.getElementById("saveOfficerBtn"),
    cancelButton: document.getElementById("cancelOfficerBtn"),
    tableBody: document.getElementById("officerTableBody"),
    search: document.getElementById("officerSearch"),
    statusFilter: document.getElementById("statusFilter"),
    status: document.getElementById("officerStatus"),
    detailSection: document.getElementById("officerDetailSection"),
    detailTitle: document.getElementById("officerDetailTitle"),
    detailStatus: document.getElementById("officerDetailStatus"),
    detailContent: document.getElementById("officerDetailContent"),
    closeDetailsButton: document.getElementById("closeOfficerDetailsBtn"),
    photo: document.getElementById("officerPhoto"),
    photoPreview: document.getElementById("officerPhotoPreview")
};

const fieldIds = {
    officer_id: "officerId",
    name: "officerName",
    phone: "officerPhone",
    email: "officerEmail",
    gender: "officerGender",
    position: "officerPosition",
    department: "officerDepartment",
    employment: "officerEmployment",
    status: "officerStatusInput",
    issueDate: "officerIssueDate",
    expiryDate: "officerExpiryDate"
};

let officers = [];
let permissions = {};
let editingOfficerId = null;

function can(permission) {
    return permissions.all === true || permissions[permission] === true;
}

function setMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
}

function openEditor(officer = null) {
    editingOfficerId = officer?.officer_id || null;
    elements.form.reset();
    elements.formMessage.textContent = "";
    elements.photoPreview.hidden = true;
    elements.photoPreview.removeAttribute("src");
    document.getElementById("officerId").value = editingOfficerId || "";

    if (officer) {
        for (const [field, id] of Object.entries(fieldIds)) {
            if (field === "officer_id") {
                continue;
            }
            const value = officer[field] ?? (
                field === "issueDate"
                    ? officer.issue_date
                    : field === "expiryDate"
                        ? officer.expiry_date
                        : ""
            );
            document.getElementById(id).value = value || "";
        }
        if (officer.photo) {
            elements.photoPreview.src = officer.photo;
            elements.photoPreview.hidden = false;
        }
        elements.editorTitle.textContent = `Edit Officer ${officer.officer_id}`;
        elements.saveButton.textContent = "Update Officer";
    } else {
        elements.editorTitle.textContent = "Add Officer";
        elements.saveButton.textContent = "Save Officer";
    }

    elements.editor.hidden = false;
    elements.editor.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("officerName").focus();
}

function closeEditor() {
    elements.editor.hidden = true;
    elements.form.reset();
    elements.formMessage.textContent = "";
    elements.photoPreview.hidden = true;
    elements.photoPreview.removeAttribute("src");
    editingOfficerId = null;
}

function getSearchMatches() {
    const query = elements.search.value.trim().toLowerCase();
    const selectedStatus = elements.statusFilter.value;

    return officers.filter(officer => {
        const searchable = [
            officer.officer_id,
            officer.name,
            officer.email,
            officer.phone,
            officer.position,
            officer.department
        ].filter(Boolean).join(" ").toLowerCase();

        return searchable.includes(query) &&
            (!selectedStatus || officer.status === selectedStatus);
    });
}

function addCell(row, value, className) {
    const cell = document.createElement("td");
    if (className) {
        cell.className = className;
    }
    cell.textContent = value || "-";
    row.appendChild(cell);
    return cell;
}

function formatFieldLabel(field) {
    return field
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}

function renderOfficerDetails(officer, assignments) {
    elements.detailContent.replaceChildren();

    if (officer.photo) {
        const photo = document.createElement("img");
        photo.className = "officer-detail-photo";
        photo.src = officer.photo;
        photo.alt = `${officer.name || "Officer"} identification photo`;
        photo.loading = "lazy";
        elements.detailContent.appendChild(photo);
    }

    const details = document.createElement("dl");
    details.className = "officer-detail-fields";
    for (const [field, value] of Object.entries(officer)) {
        if (field === "photo") {
            continue;
        }

        const item = document.createElement("div");
        const label = document.createElement("dt");
        label.textContent = formatFieldLabel(field);
        const detail = document.createElement("dd");
        detail.textContent = value === null || value === undefined || value === ""
            ? "—"
            : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);
        item.append(label, detail);
        details.appendChild(item);
    }
    elements.detailContent.appendChild(details);

    const assignmentHeading = document.createElement("h3");
    assignmentHeading.textContent = "Post assignments";
    elements.detailContent.appendChild(assignmentHeading);
    if (!assignments.length) {
        const empty = document.createElement("p");
        empty.textContent = "No post assignments are recorded for this officer.";
        elements.detailContent.appendChild(empty);
        return;
    }

    const assignmentList = document.createElement("div");
    assignmentList.className = "officer-assignment-list";
    for (const assignment of assignments) {
        const card = document.createElement("article");
        card.className = "officer-assignment-card";
        const post = assignment.post || {};
        const title = document.createElement("h4");
        title.textContent = post.post_name || "Security post";
        card.appendChild(title);

        const assignmentDetails = document.createElement("dl");
        assignmentDetails.className = "officer-detail-fields";
        for (const [labelText, value] of [
            ["Location", [post.location, post.county].filter(Boolean).join(", ")],
            ["Post status", post.status],
            ["Shift", assignment.shift_number],
            ["Assignment status", assignment.assignment_status],
            ["Assigned date", assignment.assigned_date],
            ["End date", assignment.end_date],
            ["Notes", assignment.notes]
        ]) {
            const item = document.createElement("div");
            const label = document.createElement("dt");
            label.textContent = labelText;
            const detail = document.createElement("dd");
            detail.textContent = value === null || value === undefined || value === ""
                ? "—"
                : String(value);
            item.append(label, detail);
            assignmentDetails.appendChild(item);
        }
        card.appendChild(assignmentDetails);
        assignmentList.appendChild(card);
    }
    elements.detailContent.appendChild(assignmentList);
}

async function viewOfficer(officer) {
    elements.detailSection.hidden = false;
    elements.detailTitle.textContent = `${officer.name || "Officer"} — ${officer.officer_id}`;
    elements.detailContent.replaceChildren();
    setMessage(elements.detailStatus, "Loading officer details...");
    elements.detailSection.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const result = await apiRequest(
            `/officers/${encodeURIComponent(officer.officer_id)}`
        );
        renderOfficerDetails(result.officer, result.assignments || []);
        setMessage(elements.detailStatus, "");
    } catch (error) {
        console.error("Unable to load officer details:", error);
        setMessage(
            elements.detailStatus,
            error.message || "Unable to load officer details.",
            true
        );
    }
}

function renderOfficers() {
    elements.tableBody.replaceChildren();
    const visibleOfficers = getSearchMatches();

    if (!visibleOfficers.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = officers.length
            ? "No officers match these filters."
            : "No officer records yet.";
        row.appendChild(cell);
        elements.tableBody.appendChild(row);
        return;
    }

    for (const officer of visibleOfficers) {
        const row = document.createElement("tr");
        addCell(row, officer.officer_id);
        const nameCell = addCell(row, officer.name);
        nameCell.classList.add("officer-name-cell");
        addCell(row, officer.position);
        addCell(row, officer.department);

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.textContent = officer.status || "Unknown";
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionsCell = document.createElement("td");
        actionsCell.className = "officer-actions";

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "action-btn view-btn";
        viewButton.dataset.action = "view";
        viewButton.dataset.id = officer.officer_id;
        viewButton.textContent = "View";
        actionsCell.appendChild(viewButton);

        if (can("officers_edit")) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "action-btn edit-btn";
            editButton.dataset.action = "edit";
            editButton.dataset.id = officer.officer_id;
            editButton.textContent = "Edit";
            actionsCell.appendChild(editButton);
        }

        if (can("officers_delete")) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "action-btn delete-btn";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = officer.officer_id;
            deleteButton.textContent = "Delete";
            actionsCell.appendChild(deleteButton);
        }

        row.appendChild(actionsCell);
        elements.tableBody.appendChild(row);
    }
}

async function loadOfficers() {
    elements.tableBody.innerHTML = '<tr><td colspan="6">Loading officers…</td></tr>';
    try {
        officers = await getOfficers();
        setMessage(elements.status, `${officers.length} officer record${officers.length === 1 ? "" : "s"} loaded.`);
        renderOfficers();
    } catch (error) {
        console.error("Unable to load officers:", error);
        setMessage(elements.status, error.message || "Unable to load officers.", true);
        elements.tableBody.innerHTML = '<tr><td colspan="6">Officer records could not be loaded.</td></tr>';
    }
}

elements.addButton.addEventListener("click", () => openEditor());
elements.cancelButton.addEventListener("click", closeEditor);
elements.closeDetailsButton.addEventListener("click", () => {
    elements.detailSection.hidden = true;
    elements.detailContent.replaceChildren();
    setMessage(elements.detailStatus, "");
});
elements.search.addEventListener("input", renderOfficers);
elements.statusFilter.addEventListener("change", renderOfficers);

elements.photo.addEventListener("change", () => {
    try {
        const file = validateImageFile(elements.photo.files[0]);
        previewImageFile(file, elements.photoPreview);
        setMessage(elements.formMessage, "");
    } catch (error) {
        elements.photo.value = "";
        setMessage(elements.formMessage, error.message, true);
    }
});

elements.tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const officer = officers.find(item => item.officer_id === button.dataset.id);
    if (!officer) {
        setMessage(elements.status, "That officer record is no longer available. Reload the list.", true);
        return;
    }

    if (button.dataset.action === "view") {
        await viewOfficer(officer);
        return;
    }

    if (button.dataset.action === "edit") {
        openEditor(officer);
        return;
    }

    if (button.dataset.action === "delete") {
        const confirmed = await confirmAction({
            title: "Delete officer?",
            message: `Permanently delete officer ${officer.name} (${officer.officer_id})? This cannot be undone.`,
            confirmLabel: "Delete officer",
            destructive: true
        });
        if (!confirmed) {
            return;
        }

        button.disabled = true;
        try {
            await deleteOfficer(officer.officer_id);
            await loadOfficers();
        } catch (error) {
            console.error("Unable to delete officer:", error);
            setMessage(elements.status, error.message || "Unable to delete officer.", true);
            button.disabled = false;
        }
    }
});

elements.form.addEventListener("submit", async event => {
    event.preventDefault();
    elements.saveButton.disabled = true;
    setMessage(elements.formMessage, "");

    try {
        const photoFile = validateImageFile(elements.photo.files[0]);
        const officerData = {
            name: document.getElementById("officerName").value.trim(),
            phone: document.getElementById("officerPhone").value.trim(),
            email: document.getElementById("officerEmail").value.trim(),
            gender: document.getElementById("officerGender").value,
            position: document.getElementById("officerPosition").value.trim(),
            department: document.getElementById("officerDepartment").value.trim(),
            employment: document.getElementById("officerEmployment").value,
            status: document.getElementById("officerStatusInput").value,
            issueDate: document.getElementById("officerIssueDate").value,
            expiryDate: document.getElementById("officerExpiryDate").value
        };

        if (editingOfficerId) {
            const confirmed = await confirmAction({
                title: "Save officer changes?",
                message: `Update ${officerData.name}'s officer record with these details?`,
                confirmLabel: "Save changes"
            });
            if (!confirmed) {
                return;
            }
            await editOfficer(editingOfficerId, officerData, photoFile);
            setMessage(elements.formMessage, "Officer updated successfully.");
        } else {
            const created = await addOfficer(officerData, photoFile);
            setMessage(elements.formMessage, `Officer ${created.officer_id} added successfully.`);
        }

        await loadOfficers();
        closeEditor();
    } catch (error) {
        console.error("Unable to save officer:", error);
        setMessage(elements.formMessage, error.message || "Unable to save officer.", true);
    } finally {
        elements.saveButton.disabled = false;
    }
});

try {
    const admin = await getCurrentAdmin();
    if (!admin) {
        window.location.replace("../login.html");
    } else {
        permissions = admin.profile.permissions || {};
        const isSuperAdmin = admin.profile.role === "Super Admin";
        if (!isSuperAdmin && !can("officers_create")) {
            elements.addButton.hidden = true;
        }
        await loadOfficers();
    }
} catch (error) {
    console.error("Unable to initialize officer management:", error);
    setMessage(elements.status, error.message || "Unable to verify administrator access.", true);
}