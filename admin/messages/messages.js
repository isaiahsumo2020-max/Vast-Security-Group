import { getCurrentAdmin } from "../../backend/auth/session.js";
import { apiRequest } from "../../backend/services/api.js";
import { confirmAction } from "../auth/confirmDialog.js";

const tableBody = document.getElementById("messagesTableBody");
const statusElement = document.getElementById("messagesStatus");
const searchInput = document.getElementById("messageSearch");
const statusFilter = document.getElementById("messageStatusFilter");
const refreshButton = document.getElementById("refreshMessagesBtn");
const detailsDialog = document.getElementById("messageDetailsDialog");
const closeDetailsButton = document.getElementById("closeMessageDetailsBtn");
const workflowStatuses = ["New", "In Progress", "Resolved"];

let messages = [];
let canManageMessages = false;

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
    statusElement.classList.toggle("success", Boolean(message) && !isError);
}

function textValue(value, fallback = "") {
    return typeof value === "string"
        ? value
        : value === null || value === undefined
            ? fallback
            : String(value);
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleString();
}

function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = textValue(value, "-") || "-";
    if (className) {
        cell.className = className;
    }
    row.appendChild(cell);
    return cell;
}

function normalizeMessage(message, index) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
        console.error("Contact message API returned an invalid row at index", index);
        return {
            id: "",
            name: "",
            email: "",
            phone: null,
            subject: "",
            message: "",
            status: "",
            is_read: false,
            created_at: null,
            updated_at: null
        };
    }

    return {
        id: textValue(message.id),
        name: textValue(message.name),
        email: textValue(message.email),
        phone: textValue(message.phone),
        subject: textValue(message.subject),
        message: textValue(message.message),
        status: textValue(message.status),
        is_read: message.is_read === true,
        created_at: message.created_at || null,
        updated_at: message.updated_at || null
    };
}

function getFilteredMessages() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    return messages.filter(message => {
        const searchable = [
            message.name,
            message.email,
            message.phone,
            message.subject,
            message.message
        ].join(" ").toLowerCase();
        return searchable.includes(query) &&
            (!selectedStatus || message.status === selectedStatus);
    });
}

function createActionButton(label, action, message, className = "secondary-btn") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.dataset.id = message.id;
    button.textContent = label;
    button.disabled = !message.id;
    return button;
}

function renderMessages() {
    tableBody.replaceChildren();
    const filtered = getFilteredMessages();

    if (!filtered.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = messages.length
            ? "No messages match these filters."
            : "No contact messages have been received.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        setStatus(messages.length
            ? `0 of ${messages.length} messages shown.`
            : "0 messages loaded.");
        return;
    }

    let displayedCount = 0;
    for (const message of filtered) {
        const row = document.createElement("tr");
        row.dataset.messageId = message.id;
        if (!message.is_read) {
            row.classList.add("message-unread-row");
        }

        addCell(row, formatDate(message.created_at), "message-date-cell");

        const senderCell = document.createElement("td");
        const senderName = document.createElement("strong");
        senderName.textContent = message.name || "Unknown sender";
        senderCell.appendChild(senderName);
        if (message.email) {
            const email = document.createElement("a");
            email.href = `mailto:${encodeURIComponent(message.email)}`;
            email.textContent = message.email;
            email.className = "message-email";
            senderCell.append(document.createElement("br"), email);
        }
        if (message.phone) {
            const phone = document.createElement("span");
            phone.textContent = message.phone;
            phone.className = "message-phone";
            senderCell.append(document.createElement("br"), phone);
        }
        row.appendChild(senderCell);

        addCell(row, message.subject || "No subject");
        const messageCell = document.createElement("td");
        const preview = document.createElement("p");
        preview.className = "message-row-preview";
        preview.textContent = message.message || "No message content.";
        messageCell.appendChild(preview);
        row.appendChild(messageCell);

        const statusCell = document.createElement("td");
        const select = document.createElement("select");
        select.className = "message-status-select";
        select.dataset.statusSelect = "";
        select.setAttribute(
            "aria-label",
            `Status for message from ${message.name || "unknown sender"}`
        );
        for (const value of workflowStatuses) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            option.selected = message.status === value;
            select.appendChild(option);
        }
        if (message.status && !workflowStatuses.includes(message.status)) {
            const option = document.createElement("option");
            option.value = message.status;
            option.textContent = message.status;
            option.selected = true;
            select.appendChild(option);
        }
        select.disabled = !message.id || !workflowStatuses.includes(message.status);
        statusCell.appendChild(select);
        row.appendChild(statusCell);

        const updateCell = document.createElement("td");
        const updateDate = document.createElement("span");
        updateDate.className = "message-updated-date";
        updateDate.textContent = formatDate(message.updated_at);
        updateCell.appendChild(updateDate);
        const saveButton = createActionButton(
            "Save status",
            "save-status",
            message,
            "action-btn edit-btn"
        );
        saveButton.disabled = saveButton.disabled || select.disabled;
        updateCell.appendChild(saveButton);
        row.appendChild(updateCell);

        const actionsCell = document.createElement("td");
        actionsCell.className = "message-actions-cell";
        actionsCell.appendChild(createActionButton(
            "View",
            "view",
            message,
            "action-btn edit-btn"
        ));
        if (canManageMessages) {
            actionsCell.appendChild(createActionButton(
                message.is_read ? "Mark unread" : "Mark read",
                "toggle-read",
                message,
                "action-btn edit-btn"
            ));
            actionsCell.appendChild(createActionButton(
                "Delete",
                "delete",
                message,
                "action-btn delete-btn"
            ));
        }
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
        displayedCount += 1;
    }

    setStatus(displayedCount === messages.length
        ? `${displayedCount} message${displayedCount === 1 ? "" : "s"} loaded.`
        : `Showing ${displayedCount} of ${messages.length} messages.`);
}

function showMessageDetails(message) {
    document.getElementById("messageDetailsTitle").textContent =
        message.subject || "Contact message";
    document.getElementById("messageDetailsReceived").textContent =
        `Received ${formatDate(message.created_at)}`;
    document.getElementById("messageDetailsSender").textContent =
        message.name || "Not provided";
    const emailElement = document.getElementById("messageDetailsEmail");
    emailElement.replaceChildren();
    if (message.email) {
        const emailLink = document.createElement("a");
        emailLink.href = `mailto:${encodeURIComponent(message.email)}`;
        emailLink.textContent = message.email;
        emailElement.appendChild(emailLink);
    } else {
        emailElement.textContent = "Not provided";
    }
    document.getElementById("messageDetailsPhone").textContent =
        message.phone || "Not provided";
    document.getElementById("messageDetailsStatus").textContent =
        message.status || "Unknown";
    document.getElementById("messageDetailsReadStatus").textContent =
        message.is_read ? "Read" : "Unread";
    document.getElementById("messageDetailsUpdated").textContent =
        formatDate(message.updated_at);
    document.getElementById("messageDetailsBody").textContent =
        message.message || "No message content.";
    detailsDialog.showModal();
}

async function loadMessages() {
    refreshButton.disabled = true;
    tableBody.replaceChildren();
    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 7;
    loadingCell.textContent = "Loading messages…";
    loadingRow.appendChild(loadingCell);
    tableBody.appendChild(loadingRow);
    setStatus("Loading contact messages…");

    try {
        const result = await apiRequest("/contact-messages");
        if (!result.success || !Array.isArray(result.messages)) {
            throw new Error("The server returned an invalid contact message list.");
        }
        messages = result.messages.map(normalizeMessage);
        renderMessages();
    } catch (error) {
        console.error("Unable to load contact messages:", error);
        setStatus(
            error.message || "Unable to load contact messages. Please try again.",
            true
        );
        const errorRow = document.createElement("tr");
        const errorCell = document.createElement("td");
        errorCell.colSpan = 7;
        errorCell.textContent = "Messages could not be loaded.";
        errorRow.appendChild(errorCell);
        tableBody.replaceChildren(errorRow);
    } finally {
        refreshButton.disabled = false;
    }
}

async function updateMessage(message, updates, successMessage, button) {
    button.disabled = true;
    try {
        const result = await apiRequest(
            `/contact-messages/${encodeURIComponent(message.id)}`,
            {
                method: "PATCH",
                body: JSON.stringify(updates)
            }
        );
        if (!result.success || !result.contactMessage) {
            throw new Error("The server did not confirm the message update.");
        }

        Object.assign(message, result.contactMessage);
        renderMessages();
        setStatus(successMessage);
    } catch (error) {
        console.error("Unable to update contact message:", error);
        setStatus(
            error.message || "Unable to update this message. Please try again.",
            true
        );
        button.disabled = false;
    }
}

tableBody.addEventListener("click", async event => {
    if (!(event.target instanceof Element)) {
        return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    const message = messages.find(item => item.id === button.dataset.id);
    if (!message) {
        setStatus("This message could not be found. Refresh the list.", true);
        return;
    }

    if (button.dataset.action === "view") {
        showMessageDetails(message);
        return;
    }

    if (button.dataset.action === "save-status") {
        const select = button.closest("tr")?.querySelector("[data-status-select]");
        if (!select || !workflowStatuses.includes(select.value)) {
            setStatus("Choose a valid message status.", true);
            return;
        }
        if (select.value === message.status) {
            setStatus("No status change to save.");
            return;
        }
        await updateMessage(
            message,
            { status: select.value },
            "Message status updated.",
            button
        );
        return;
    }

    if (button.dataset.action === "toggle-read") {
        if (!canManageMessages) {
            setStatus("You do not have permission to change read status.", true);
            return;
        }
        await updateMessage(
            message,
            { is_read: !message.is_read },
            `Message marked ${message.is_read ? "unread" : "read"}.`,
            button
        );
        return;
    }

    if (button.dataset.action === "delete") {
        if (!canManageMessages) {
            setStatus("You do not have permission to delete messages.", true);
            return;
        }
        if (!await confirmAction({
            title: "Delete contact message?",
            message: `Permanently delete the message from "${message.name || "Unknown sender"}"?`,
            confirmLabel: "Delete message",
            destructive: true
        })) {
            return;
        }

        button.disabled = true;
        try {
            const result = await apiRequest(
                `/contact-messages/${encodeURIComponent(message.id)}`,
                { method: "DELETE" }
            );
            if (!result.success) {
                throw new Error("The server did not confirm the message deletion.");
            }
            messages = messages.filter(item => item.id !== message.id);
            renderMessages();
            setStatus("Message deleted.");
        } catch (error) {
            console.error("Unable to delete contact message:", error);
            setStatus(
                error.message || "Unable to delete this message. Please try again.",
                true
            );
            button.disabled = false;
        }
    }
});

searchInput.addEventListener("input", renderMessages);
statusFilter.addEventListener("change", renderMessages);
refreshButton.addEventListener("click", loadMessages);
closeDetailsButton.addEventListener("click", () => detailsDialog.close());
detailsDialog.addEventListener("click", event => {
    if (event.target === detailsDialog) {
        detailsDialog.close();
    }
});

try {
    const admin = await getCurrentAdmin();
    const permissions = admin?.profile?.permissions;
    canManageMessages = admin?.profile?.role === "Super Admin" ||
        permissions?.all === true ||
        permissions?.messages_manage === true;
} catch (error) {
    console.error("Unable to load contact-message permissions:", error);
}

await loadMessages();
