import { apiRequest } from "../../backend/services/api.js";
import { logoutAdmin } from "../../backend/auth/logout.js";

const avatarBucketPrefix =
    "https://uwfjtnirfqufgbifeabj.supabase.co/storage/v1/object/public/vsg-admin-avatars/";

function initialsFor(profile, email) {
    const name = (profile.full_name || email || "Admin").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

function setAvatar(button, profile, email) {
    const image = button.querySelector("img");
    const fallback = button.querySelector(".admin-profile-initials");
    const avatarUrl = profile.avatar_url;
    fallback.textContent = initialsFor(profile, email);

    button.setAttribute(
        "aria-label",
        `Administrator profile: ${profile.full_name || email || "Admin"}. Open menu.`
    );

    if (
        typeof avatarUrl === "string" &&
        avatarUrl.startsWith(avatarBucketPrefix)
    ) {
        image.src = avatarUrl;
        image.hidden = false;
        fallback.hidden = true;
        image.onerror = () => {
            image.hidden = true;
            fallback.hidden = false;
        };
    } else {
        image.removeAttribute("src");
        image.hidden = true;
        fallback.hidden = false;
    }
}

function createHeaderActions(profile, email) {
    const actions = document.createElement("div");
    actions.className = "admin-header-actions";

    const notificationArea = document.createElement("div");
    notificationArea.className = "admin-notification-area";

    const notificationButton = document.createElement("button");
    notificationButton.type = "button";
    notificationButton.className = "admin-notification-button";
    notificationButton.setAttribute("aria-label", "Notifications");
    notificationButton.setAttribute("aria-expanded", "false");
    notificationButton.setAttribute("aria-haspopup", "true");
    notificationButton.innerHTML = `
        <i class="fa-regular fa-bell" aria-hidden="true"></i>
        <span class="admin-notification-count" hidden></span>
    `;

    const panel = document.createElement("section");
    panel.className = "admin-notification-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Admin notifications");

    const panelHeading = document.createElement("div");
    panelHeading.className = "admin-notification-heading";
    const heading = document.createElement("h2");
    heading.textContent = "Notifications";
    const readAllButton = document.createElement("button");
    readAllButton.type = "button";
    readAllButton.className = "admin-notification-read-all";
    readAllButton.textContent = "Mark all read";
    panelHeading.append(heading, readAllButton);

    const status = document.createElement("p");
    status.className = "admin-notification-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const list = document.createElement("ul");
    list.className = "admin-notification-list";
    panel.append(panelHeading, status, list);
    notificationArea.append(notificationButton, panel);

    const profileArea = document.createElement("div");
    profileArea.className = "admin-profile-area";

    const profileButton = document.createElement("button");
    profileButton.type = "button";
    profileButton.className = "admin-profile-link";
    profileButton.title = "Administrator menu";
    profileButton.setAttribute("aria-haspopup", "true");
    profileButton.setAttribute("aria-expanded", "false");
    profileButton.innerHTML = `
        <img alt="" hidden>
        <span class="admin-profile-initials"></span>
    `;
    setAvatar(profileButton, profile, email);

    const profileMenu = document.createElement("div");
    profileMenu.className = "admin-profile-menu";
    profileMenu.hidden = true;
    const profileSettingsLink = document.createElement("a");
    profileSettingsLink.href = "/admin/settings/settings.html";
    profileSettingsLink.textContent = "Profile settings";
    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.textContent = "Log out";
    profileMenu.append(profileSettingsLink, logoutButton);
    profileArea.append(profileButton, profileMenu);

    actions.append(notificationArea, profileArea);

    return {
        actions,
        notificationArea,
        notificationButton,
        panel,
        profileArea,
        readAllButton,
        status,
        list,
        profileButton,
        profileMenu,
        logoutButton
    };
}

function formatNotificationDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
}

export function mountAdminChrome(admin) {
    const header = document.querySelector(
        "main .admin-header, main .dashboard-page-header, main .dashboard-header"
    );
    if (!header || header.querySelector(".admin-header-actions")) {
        return;
    }

    const profile = admin.profile || {};
    const elements = createHeaderActions(profile, admin.user?.email || "");
    header.appendChild(elements.actions);

    const sidebar = document.querySelector(".admin-sidebar");
    const brand = sidebar?.querySelector(".admin-brand");
    const navigation = sidebar?.querySelector(".admin-nav");
    const originalBrandParent = brand?.parentNode;
    const originalBrandNextSibling = brand?.nextSibling;
    const mobileTopbar = document.createElement("div");
    mobileTopbar.className = "admin-mobile-topbar";
    const mobileLayout = window.matchMedia("(max-width: 768px)");

    function placeHeaderActions() {
        if (!sidebar || !brand || !navigation) {
            return;
        }

        if (mobileLayout.matches) {
            if (!mobileTopbar.isConnected) {
                sidebar.insertBefore(mobileTopbar, brand);
            }
            mobileTopbar.append(brand, elements.actions);
        } else {
            if (originalBrandParent) {
                originalBrandParent.insertBefore(brand, originalBrandNextSibling);
            }
            if (mobileTopbar.isConnected) {
                mobileTopbar.remove();
            }
            header.appendChild(elements.actions);
        }
    }

    placeHeaderActions();
    mobileLayout.addEventListener("change", placeHeaderActions);

    let isLoading = false;

    async function loadNotifications() {
        if (isLoading) {
            return;
        }
        isLoading = true;

        try {
            const result = await apiRequest("/notifications");
            const notifications = result.notifications || [];
            const unreadCount = Number(result.unreadCount) || 0;
            elements.notificationButton
                .querySelector(".admin-notification-count")
                .toggleAttribute("hidden", unreadCount === 0);
            const badge = elements.notificationButton
                .querySelector(".admin-notification-count");
            badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
            elements.notificationButton.setAttribute(
                "aria-label",
                unreadCount
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
            );
            elements.status.textContent = "";
            elements.list.replaceChildren();

            if (!notifications.length) {
                const empty = document.createElement("li");
                empty.className = "admin-notification-empty";
                empty.textContent = "You’re all caught up.";
                elements.list.appendChild(empty);
                return;
            }

            for (const notification of notifications) {
                const item = document.createElement("li");
                item.dataset.notificationId = notification.id;
                item.className = notification.read_at
                    ? "admin-notification-item"
                    : "admin-notification-item is-unread";
                const link = document.createElement("a");
                const targetPath = typeof notification.target_path === "string" &&
                        notification.target_path.startsWith("/admin/")
                    ? notification.target_path
                    : "/admin/dashboard.html";
                link.href = targetPath;

                const title = document.createElement("strong");
                title.textContent = notification.title;
                const body = document.createElement("span");
                body.textContent = notification.body;
                const date = document.createElement("time");
                date.dateTime = notification.created_at;
                date.textContent = formatNotificationDate(notification.created_at);
                link.append(title, body, date);
                item.appendChild(link);
                elements.list.appendChild(item);
            }
        } catch (error) {
            console.error("Unable to load administrator notifications:", error);
            elements.status.textContent =
                error.message || "Notifications could not be loaded.";
        } finally {
            isLoading = false;
        }
    }

    elements.notificationButton.addEventListener("click", async () => {
        const opening = elements.panel.hidden;
        elements.panel.hidden = !opening;
        elements.notificationButton.setAttribute(
            "aria-expanded",
            String(opening)
        );
        if (opening) {
            await loadNotifications();
        }
    });

    elements.profileButton.addEventListener("click", () => {
        const opening = elements.profileMenu.hidden;
        elements.profileMenu.hidden = !opening;
        elements.profileButton.setAttribute("aria-expanded", String(opening));
    });

    elements.logoutButton.addEventListener("click", async () => {
        elements.logoutButton.disabled = true;
        try {
            await logoutAdmin();
        } catch (error) {
            console.error("Unable to log out:", error);
        } finally {
            window.location.replace("/admin/login.html");
        }
    });

    elements.readAllButton.addEventListener("click", async () => {
        elements.readAllButton.disabled = true;
        try {
            await apiRequest("/notifications/read-all", { method: "PATCH" });
            await loadNotifications();
        } catch (error) {
            console.error("Unable to mark notifications as read:", error);
            elements.status.textContent =
                error.message || "Notifications could not be marked as read.";
        } finally {
            elements.readAllButton.disabled = false;
        }
    });

    elements.list.addEventListener("click", async event => {
        const link = event.target.closest("a");
        if (!link) {
            return;
        }
        const item = link.closest(".admin-notification-item");
        if (!item?.classList.contains("is-unread")) {
            return;
        }
        event.preventDefault();
        try {
            await apiRequest(
                `/notifications/${encodeURIComponent(item.dataset.notificationId)}`,
                { method: "PATCH" }
            );
        } catch (error) {
            console.error("Unable to mark notification as read:", error);
        }
        window.location.assign(link.href);
    });

    document.addEventListener("click", event => {
        if (!elements.notificationArea.contains(event.target)) {
            elements.panel.hidden = true;
            elements.notificationButton.setAttribute("aria-expanded", "false");
        }
        if (!elements.profileArea?.contains(event.target)) {
            elements.profileMenu.hidden = true;
            elements.profileButton.setAttribute("aria-expanded", "false");
        }
    });

    window.addEventListener("focus", loadNotifications);
    window.setInterval(loadNotifications, 60_000);
    window.addEventListener("vast:admin-avatar-updated", event => {
        profile.avatar_url = event.detail?.avatarUrl || "";
        setAvatar(elements.profileButton, profile, admin.user?.email || "");
    });

    void loadNotifications();
}
