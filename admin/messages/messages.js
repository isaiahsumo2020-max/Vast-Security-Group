import { apiRequest } from "../../backend/services/api.js";

const tableBody = document.getElementById("messagesTableBody");
const statusElement = document.getElementById("messagesStatus");
const searchInput = document.getElementById("messageSearch");
const statusFilter = document.getElementById("messageStatusFilter");
const refreshButton = document.getElementById("refreshMessagesBtn");

let messages = [];

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
    statusElement.classList.toggle("success", Boolean(message) && !isError);
}

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    row.appendChild(cell);
    return cell;
}

function renderMessages() {
    tableBody.replaceChildren();
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const filtered = messages.filter(message => {
        const searchable = [
            message.name,
            message.email,
            message.phone,
            message.subject,
            message.message
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(query) &&
            (!selectedStatus || message.status === selectedStatus);
    });

    if (!filtered.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = messages.length
            ? "No messages match these filters."
            : "No contact messages have been received.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    for (const message of filtered) {
        const row = document.createElement("tr");
        const dateCell = addCell(row, new Date(message.created_at).toLocaleString());
        dateCell.className = "message-date-cell";

        const senderCell = document.createElement("td");
        const senderName = document.createElement("strong");
        senderName.textContent = message.name;
        senderCell.appendChild(senderName);
        const email = document.createElement("a");
        email.href = `mailto:${encodeURIComponent(message.email)}`;
        email.textContent = message.email;
        email.className = "message-email";
        senderCell.appendChild(document.createElement("br"));
        senderCell.appendChild(email);
        if (message.phone) {
            const phone = document.createElement("span");
            phone.textContent = message.phone;
            phone.className = "message-phone";
            senderCell.appendChild(document.createElement("br"));
            senderCell.appendChild(phone);
        }
        row.appendChild(senderCell);

        addCell(row, message.subject);
        const messageCell = document.createElement("td");
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Read";
        const body = document.createElement("p");
        body.textContent = message.message;
        details.append(summary, body);
        messageCell.appendChild(details);
        row.appendChild(messageCell);

        const statusCell = document.createElement("td");
        const select = document.createElement("select");
        select.className = "message-status-select";
        select.setAttribute("aria-label", `Status for message from ${message.name}`);
        for (const status of ["New", "In Progress", "Resolved"]) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            option.selected = message.status === status;
            select.appendChild(option);
        }
        statusCell.appendChild(select);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        const updateButton = document.createElement("button");
        updateButton.type = "button";
        updateButton.className = "action-btn edit-btn";
        updateButton.dataset.id = message.id;
        updateButton.textContent = "Save";
        actionCell.appendChild(updateButton);
        row.appendChild(actionCell);
    }
}

async function loadMessages() {
    refreshButton.disabled = true;
    tableBody.innerHTML = '<tr><td colspan="6">Loading messages…</td></tr>';
    setStatus("");

    try {
        const result = await apiRequest("/contact-messages");
        messages = result.messages || [];
        setStatus(`${messages.length} message${messages.length === 1 ? "" : "s"} loaded.`);
        renderMessages();
    } catch (error) {
        console.error("Unable to load contact messages:", error);
        setStatus(error.message || "Unable to load contact messages.", true);
        tableBody.innerHTML = '<tr><td colspan="6">Messages could not be loaded.</td></tr>';
    } finally {
        refreshButton.disabled = false;
    }
}

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-id]");
    if (!button) {
        return;
    }
    const row = button.closest("tr");
    const select = row.querySelector("select");
    const original = messages.find(message => message.id === button.dataset.id);
    if (!original || !select) {
        setStatus("This message could not be found. Refresh the list.", true);
        return;
    }
    if (select.value === original.status) {
        setStatus("No status change to save.");
        return;
    }

    button.disabled = true;
    try {
        await apiRequest(`/contact-messages/${encodeURIComponent(original.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status: select.value })
        });
        original.status = select.value;
        setStatus("Message status updated.");
        renderMessages();
    } catch (error) {
        console.error("Unable to update message status:", error);
        setStatus(error.message || "Unable to update message status.", true);
        button.disabled = false;
    }
});

searchInput.addEventListener("input", renderMessages);
statusFilter.addEventListener("change", renderMessages);
refreshButton.addEventListener("click", loadMessages);

await loadMessages();