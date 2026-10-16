import { apiRequest } from "../../backend/services/api.js";

const tableBody = document.getElementById("auditTableBody");
const statusElement = document.getElementById("auditStatus");
const searchInput = document.getElementById("auditSearch");
const entityFilter = document.getElementById("auditEntityFilter");
const refreshButton = document.getElementById("refreshAuditBtn");

let auditLogs = [];

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
}

function renderAuditLogs() {
    tableBody.replaceChildren();
    const query = searchInput.value.trim().toLowerCase();
    const selectedEntity = entityFilter.value;
    const filtered = auditLogs.filter(entry => {
        const searchable = [
            entry.actor_name,
            entry.actor_email,
            entry.action,
            entry.entity_type,
            entry.entity_id,
            JSON.stringify(entry.details || {})
        ].join(" ").toLowerCase();
        return searchable.includes(query) &&
            (!selectedEntity || entry.entity_type === selectedEntity);
    });

    if (!filtered.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = auditLogs.length
            ? "No audit entries match this filter."
            : "No administrative activity has been recorded yet.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    for (const entry of filtered) {
        const row = document.createElement("tr");
        const date = document.createElement("td");
        date.textContent = new Date(entry.created_at).toLocaleString();
        row.appendChild(date);

        const actor = document.createElement("td");
        actor.textContent = entry.actor_email
            ? `${entry.actor_name} (${entry.actor_email})`
            : entry.actor_name;
        row.appendChild(actor);

        const action = document.createElement("td");
        action.textContent = entry.action.replaceAll(".", " ");
        row.appendChild(action);

        const record = document.createElement("td");
        record.textContent = `${entry.entity_type}${entry.entity_id ? ` — ${entry.entity_id}` : ""}`;
        row.appendChild(record);

        const detailsCell = document.createElement("td");
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "View";
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(entry.details || {}, null, 2);
        details.append(summary, pre);
        detailsCell.appendChild(details);
        row.appendChild(detailsCell);
        tableBody.appendChild(row);
    }
}

function populateEntityFilter() {
    const existing = entityFilter.value;
    const types = [...new Set(auditLogs.map(entry => entry.entity_type))]
        .filter(Boolean)
        .sort();
    entityFilter.replaceChildren(new Option("All record types", ""));
    for (const type of types) {
        entityFilter.add(new Option(
            type.replaceAll("_", " "),
            type
        ));
    }
    entityFilter.value = types.includes(existing) ? existing : "";
}

async function loadAuditLogs() {
    refreshButton.disabled = true;
    tableBody.innerHTML = '<tr><td colspan="5">Loading audit log…</td></tr>';
    setStatus("");
    try {
        const result = await apiRequest("/audit-logs");
        auditLogs = result.auditLogs || [];
        populateEntityFilter();
        setStatus(`Showing up to 250 recent entries (${auditLogs.length} loaded).`);
        renderAuditLogs();
    } catch (error) {
        console.error("Unable to load audit log:", error);
        setStatus(error.message || "Unable to load the audit log.", true);
        tableBody.innerHTML = '<tr><td colspan="5">The audit log could not be loaded.</td></tr>';
    } finally {
        refreshButton.disabled = false;
    }
}

searchInput.addEventListener("input", renderAuditLogs);
entityFilter.addEventListener("change", renderAuditLogs);
refreshButton.addEventListener("click", loadAuditLogs);

await loadAuditLogs();