import { apiRequest } from "../../backend/services/api.js";
import { confirmAction } from "../auth/confirmDialog.js";

const serviceForm = document.getElementById("serviceForm");
const serviceIdInput = document.getElementById("serviceId");
const serviceTitleInput = document.getElementById("serviceTitle");
const serviceDescriptionInput = document.getElementById("serviceDescription");
const serviceIconInput = document.getElementById("serviceIcon");
const serviceOrderInput = document.getElementById("serviceOrder");
const serviceActiveInput = document.getElementById("serviceActive");
const serviceFormHeading = document.getElementById("serviceFormHeading");
const serviceFormStatus = document.getElementById("serviceFormStatus");
const servicesStatus = document.getElementById("servicesStatus");
const tableBody = document.getElementById("servicesTableBody");
const saveButton = document.getElementById("saveServiceBtn");
const cancelButton = document.getElementById("cancelServiceEditBtn");
const refreshButton = document.getElementById("refreshServicesBtn");

let services = [];

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
}

function resetForm() {
    serviceForm.reset();
    serviceIdInput.value = "";
    serviceIconInput.value = "fa-shield-halved";
    serviceOrderInput.value = "0";
    serviceActiveInput.checked = true;
    serviceFormHeading.textContent = "Add Service";
    saveButton.textContent = "Add Service";
    cancelButton.hidden = true;
    setStatus(serviceFormStatus, "");
}

function makeCell(row, text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
}

function startEditing(service) {
    serviceIdInput.value = service.id;
    serviceTitleInput.value = service.title;
    serviceDescriptionInput.value = service.description;
    serviceIconInput.value = service.icon || "fa-shield-halved";
    serviceOrderInput.value = String(service.display_order || 0);
    serviceActiveInput.checked = service.is_active;
    serviceFormHeading.textContent = "Edit Service";
    saveButton.textContent = "Save Changes";
    cancelButton.hidden = false;
    setStatus(serviceFormStatus, "");
    serviceForm.scrollIntoView({ behavior: "smooth", block: "start" });
    serviceTitleInput.focus();
}

function renderServices() {
    tableBody.replaceChildren();
    if (!services.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No services have been added.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    for (const service of services) {
        const row = document.createElement("tr");
        makeCell(row, String(service.display_order));
        const titleCell = makeCell(row, service.title);
        titleCell.className = "officer-name-cell";

        const description = makeCell(row, service.description);
        description.className = "service-description-cell";

        const visibility = makeCell(row, service.is_active ? "Visible" : "Hidden");
        visibility.className = service.is_active ? "service-visible" : "service-hidden";

        const actions = document.createElement("td");
        for (const [action, label, className] of [
            ["edit", "Edit", "edit-btn"],
            ["delete", "Delete", "delete-btn"]
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `action-btn ${className}`;
            button.dataset.action = action;
            button.dataset.id = service.id;
            button.textContent = label;
            actions.appendChild(button);
        }
        row.appendChild(actions);
        tableBody.appendChild(row);
    }
}

async function loadServices() {
    refreshButton.disabled = true;
    tableBody.innerHTML = '<tr><td colspan="5">Loading services…</td></tr>';
    setStatus(servicesStatus, "");
    try {
        const result = await apiRequest("/services");
        services = result.services || [];
        renderServices();
        setStatus(servicesStatus, `${services.length} service${services.length === 1 ? "" : "s"} loaded.`);
    } catch (error) {
        console.error("Unable to load website services:", error);
        setStatus(servicesStatus, error.message || "Unable to load services.", true);
        tableBody.innerHTML = '<tr><td colspan="5">Services could not be loaded.</td></tr>';
    } finally {
        refreshButton.disabled = false;
    }
}

serviceForm.addEventListener("submit", async event => {
    event.preventDefault();
    setStatus(serviceFormStatus, "");
    const displayOrder = Number(serviceOrderInput.value);

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
        setStatus(serviceFormStatus, "Display order must be zero or a positive whole number.", true);
        saveButton.disabled = false;
        return;
    }

    const body = {
        title: serviceTitleInput.value.trim(),
        description: serviceDescriptionInput.value.trim(),
        icon: serviceIconInput.value.trim(),
        display_order: displayOrder,
        is_active: serviceActiveInput.checked
    };
    const serviceId = serviceIdInput.value;

    if (serviceId && !await confirmAction({
        title: "Save service changes?",
        message: `Update "${body.title}" with the current details?`,
        confirmLabel: "Save changes"
    })) {
        return;
    }

    saveButton.disabled = true;
    try {
        await apiRequest(
            serviceId ? `/services/${encodeURIComponent(serviceId)}` : "/services",
            {
                method: serviceId ? "PATCH" : "POST",
                body: JSON.stringify(body)
            }
        );
        resetForm();
        await loadServices();
        setStatus(servicesStatus, serviceId ? "Service updated." : "Service added.");
    } catch (error) {
        console.error("Unable to save website service:", error);
        setStatus(serviceFormStatus, error.message || "Unable to save service.", true);
    } finally {
        saveButton.disabled = false;
    }
});

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const service = services.find(item => item.id === button.dataset.id);
    if (!service) {
        setStatus(servicesStatus, "This service is no longer available. Refresh the list.", true);
        return;
    }

    if (button.dataset.action === "edit") {
        startEditing(service);
        return;
    }

    if (!await confirmAction({
        title: "Delete service?",
        message: `Permanently delete "${service.title}"? This cannot be undone.`,
        confirmLabel: "Delete service",
        destructive: true
    })) {
        return;
    }

    button.disabled = true;
    try {
        await apiRequest(`/services/${encodeURIComponent(service.id)}`, {
            method: "DELETE"
        });
        if (serviceIdInput.value === service.id) {
            resetForm();
        }
        await loadServices();
        setStatus(servicesStatus, "Service deleted.");
    } catch (error) {
        console.error("Unable to delete website service:", error);
        setStatus(servicesStatus, error.message || "Unable to delete service.", true);
        button.disabled = false;
    }
});

cancelButton.addEventListener("click", resetForm);
refreshButton.addEventListener("click", loadServices);

await loadServices();