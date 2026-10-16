import { apiRequest } from "../../backend/services/api.js";

const list = document.getElementById("notificationPageList");
const status = document.getElementById("notificationPageStatus");
const summary = document.getElementById("notificationSummary");
const filter = document.getElementById("notificationFilter");
const pageIndicator = document.getElementById("notificationPageIndicator");
const previousButton = document.getElementById("previousNotificationsBtn");
const nextButton = document.getElementById("nextNotificationsBtn");
const markAllReadButton = document.getElementById("markAllReadBtn");

let notifications = [];
let currentPage = 1;
let totalCount = 0;
let unreadCount = 0;
let pageSize = 30;

function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
    status.classList.toggle("success", Boolean(message) && !isError);
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
}

function renderNotifications() {
    list.replaceChildren();
    const visible = notifications.filter(notification => {
        if (filter.value === "unread") return !notification.read_at;
        if (filter.value === "read") return Boolean(notification.read_at);
        return true;
    });

    summary.textContent =
        `${totalCount} total · ${unreadCount} unread` +
        (totalCount > pageSize ? ` · showing page ${currentPage}` : "");

    if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "admin-notification-page-empty";
        empty.textContent = notifications.length
            ? "No notifications match this filter on this page."
            : "You’re all caught up. New notifications will appear here.";
        list.appendChild(empty);
        return;
    }

    for (const notification of visible) {
        const card = document.createElement("article");
        card.className = notification.read_at
            ? "admin-notification-card"
            : "admin-notification-card is-unread";

        const content = document.createElement("div");
        content.className = "admin-notification-card-content";
        const title = document.createElement("h2");
        title.textContent = notification.title || "Notification";
        const body = document.createElement("p");
        body.textContent = notification.body || "";
        const time = document.createElement("time");
        time.dateTime = notification.created_at || "";
        time.textContent = formatDate(notification.created_at);
        content.append(title, body, time);

        const actions = document.createElement("div");
        actions.className = "admin-notification-card-actions";
        if (!notification.read_at) {
            const readButton = document.createElement("button");
            readButton.type = "button";
            readButton.className = "secondary-btn";
            readButton.dataset.action = "read";
            readButton.dataset.id = notification.id;
            readButton.textContent = "Mark as read";
            actions.appendChild(readButton);
        }

        if (typeof notification.target_path === "string" &&
            notification.target_path.startsWith("/admin/")) {
            const openLink = document.createElement("a");
            openLink.className = "primary-btn";
            openLink.href = notification.target_path;
            openLink.textContent = "Open";
            actions.appendChild(openLink);
        }

        card.append(content, actions);
        list.appendChild(card);
    }
}

async function loadNotifications(page = currentPage) {
    currentPage = page;
    list.textContent = "Loading notifications…";
    setStatus("");
    previousButton.disabled = true;
    nextButton.disabled = true;

    try {
        const result = await apiRequest(`/notifications/page/${currentPage}`);
        notifications = result.notifications || [];
        totalCount = Number(result.totalCount) || 0;
        unreadCount = Number(result.unreadCount) || 0;
        pageSize = Number(result.pageSize) || 30;
        const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));

        if (currentPage > lastPage) {
            await loadNotifications(lastPage);
            return;
        }

        pageIndicator.textContent = `Page ${currentPage} of ${lastPage}`;
        previousButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= lastPage;
        markAllReadButton.disabled = unreadCount === 0;
        renderNotifications();
    } catch (error) {
        console.error("Unable to load notifications:", error);
        list.replaceChildren();
        setStatus(error.message || "Unable to load notifications.", true);
    }
}

list.addEventListener("click", async event => {
    const button = event.target.closest('button[data-action="read"]');
    if (!button) return;

    button.disabled = true;
    try {
        await apiRequest(
            `/notifications/${encodeURIComponent(button.dataset.id)}`,
            { method: "PATCH" }
        );
        await loadNotifications();
    } catch (error) {
        console.error("Unable to mark notification as read:", error);
        setStatus(error.message || "Unable to mark notification as read.", true);
        button.disabled = false;
    }
});

markAllReadButton.addEventListener("click", async () => {
    markAllReadButton.disabled = true;
    try {
        await apiRequest("/notifications/read-all", { method: "PATCH" });
        await loadNotifications(1);
        setStatus("All notifications marked as read.");
    } catch (error) {
        console.error("Unable to mark all notifications as read:", error);
        setStatus(error.message || "Unable to mark notifications as read.", true);
        markAllReadButton.disabled = false;
    }
});

filter.addEventListener("change", renderNotifications);
previousButton.addEventListener("click", () => {
    if (currentPage > 1) void loadNotifications(currentPage - 1);
});
nextButton.addEventListener("click", () => {
    void loadNotifications(currentPage + 1);
});

void loadNotifications(1);
