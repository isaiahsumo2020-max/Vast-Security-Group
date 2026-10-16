import { getCurrentAdmin } from "../../backend/auth/session.js";
import { logoutAdmin } from "../../backend/auth/logout.js";
import { mountAdminChrome } from "./adminChrome.js";

const loginPath = "/admin/login.html";

async function protectAdminPage() {
    try {
        const admin = await getCurrentAdmin();

        if (!admin) {
            window.location.replace(loginPath);
            return;
        }

        mountAdminChrome(admin);
        document.documentElement.classList.add("admin-authenticated");
        document.documentElement.classList.remove("admin-auth-pending");
    } catch (error) {
        console.error("Admin authentication check failed:", error);
        const query = new URLSearchParams({
            error: "admin-check",
            reason: error.message || "Unable to verify administrator access."
        });
        window.location.replace(`${loginPath}?${query}`);
    }
}

async function handleLogout() {
    try {
        await logoutAdmin();
    } catch (error) {
        console.error("Unable to log out:", error);
    } finally {
        window.location.replace(loginPath);
    }
}

document.querySelectorAll("#logoutBtn").forEach(button => {
    button.addEventListener("click", handleLogout);
});

protectAdminPage();
