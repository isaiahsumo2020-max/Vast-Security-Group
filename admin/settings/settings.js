import { getCurrentAdmin } from "../../backend/auth/session.js";
import { apiRequest } from "../../backend/services/api.js";
import { confirmAction } from "../auth/confirmDialog.js";

const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");
const profileStatus = document.getElementById("profileStatus");
const passwordStatus = document.getElementById("passwordStatus");
const saveProfileButton = document.getElementById("saveProfileBtn");
const changePasswordButton = document.getElementById("changePasswordBtn");
const websiteContentForm = document.getElementById("websiteContentForm");
const websiteContentStatus = document.getElementById("websiteContentStatus");
const saveWebsiteContentButton = document.getElementById("saveWebsiteContentBtn");
const profileAvatarFile = document.getElementById("profileAvatarFile");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
const uploadProfileAvatarButton = document.getElementById("uploadProfileAvatarBtn");
const officerIdSettingsSection = document.getElementById("officerIdSettingsSection");
const officerIdSettingsForm = document.getElementById("officerIdSettingsForm");
const officerIdPrefix = document.getElementById("officerIdPrefix");
const officerIdSettingsStatus = document.getElementById("officerIdSettingsStatus");
const saveOfficerIdSettingsButton = document.getElementById("saveOfficerIdSettingsBtn");

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
}

try {
    const admin = await getCurrentAdmin();
    if (!admin) {
        window.location.replace("../login.html");
    } else {
        document.getElementById("profileFullName").value =
            admin.profile.full_name || "";
        document.getElementById("profileEmail").value =
            admin.user.email || "";
        document.getElementById("profilePhone").value =
            admin.profile.phone || "";
        document.getElementById("profileDepartment").value =
            admin.profile.department || "";
        document.getElementById("profileRole").value =
            admin.profile.role || "";
        if (admin.profile.avatar_url) {
            profileAvatarPreview.src = admin.profile.avatar_url;
            profileAvatarPreview.hidden = false;
        }

        const canManageWebsiteContent =
            admin.profile.role === "Super Admin" ||
            admin.profile.permissions?.settings_manage === true ||
            admin.profile.permissions?.all === true;
        const websiteContentSection =
            document.querySelector(".website-content-settings");
        websiteContentSection.hidden = !canManageWebsiteContent;
        officerIdSettingsSection.hidden = !canManageWebsiteContent;
        if (canManageWebsiteContent) {
            await loadOfficerIdSettings();
            await loadWebsiteContent();
        }
    }
} catch (error) {
    console.error("Unable to load administrator settings:", error);
    setStatus(profileStatus, error.message || "Unable to load your profile.", true);
    profileForm.querySelectorAll("input, button").forEach(control => {
        control.disabled = true;
    });
    passwordForm.querySelectorAll("input, button").forEach(control => {
        control.disabled = true;
    });
}

uploadProfileAvatarButton.addEventListener("click", async () => {
    const file = profileAvatarFile.files?.[0];
    if (!file) {
        setStatus(profileStatus, "Choose an image file before uploading.", true);
        profileAvatarFile.focus();
        return;
    }

    uploadProfileAvatarButton.disabled = true;
    setStatus(profileStatus, `Uploading ${file.name}...`);
    const formData = new FormData();
    formData.set("file", file);

    try {
        const result = await apiRequest("/auth/avatar", {
            method: "POST",
            body: formData
        });
        profileAvatarPreview.src = result.avatarUrl;
        profileAvatarPreview.hidden = false;
        profileAvatarFile.value = "";
        window.dispatchEvent(new CustomEvent("vast:admin-avatar-updated", {
            detail: { avatarUrl: result.avatarUrl }
        }));
        setStatus(profileStatus, "Profile picture updated.");
    } catch (error) {
        console.error("Unable to upload administrator profile picture:", error);
        setStatus(profileStatus, error.message || "Unable to upload your profile picture.", true);
    } finally {
        uploadProfileAvatarButton.disabled = false;
    }
});

async function loadWebsiteContent() {
    try {
        const result = await apiRequest("/site-content");
        for (const field of websiteContentForm.querySelectorAll("[data-site-content-key]")) {
            field.value = result.content?.[field.dataset.siteContentKey] || "";
        }
        for (const preview of websiteContentForm.querySelectorAll("[data-image-preview]")) {
            const url = result.content?.[preview.dataset.imagePreview];
            if (url) {
                preview.src = url;
                preview.hidden = false;
            }
        }
    } catch (error) {
        console.error("Unable to load public website content:", error);
        setStatus(
            websiteContentStatus,
            error.message || "Unable to load public website content.",
            true
        );
        saveWebsiteContentButton.disabled = true;
        websiteContentForm
            .querySelectorAll("[data-image-upload-button], [data-image-upload]")
            .forEach(control => {
                control.disabled = true;
            });
    }
}

async function loadOfficerIdSettings() {
    try {
        const result = await apiRequest("/officer-id-settings");
        officerIdPrefix.value = result.prefix || "VSG";
    } catch (error) {
        console.error("Unable to load Officer ID settings:", error);
        setStatus(
            officerIdSettingsStatus,
            error.message || "Unable to load Officer ID settings.",
            true
        );
        officerIdPrefix.disabled = true;
        saveOfficerIdSettingsButton.disabled = true;
    }
}

officerIdSettingsForm.addEventListener("submit", async event => {
    event.preventDefault();
    saveOfficerIdSettingsButton.disabled = true;
    setStatus(officerIdSettingsStatus, "Saving Officer ID prefix...");

    try {
        const result = await apiRequest("/officer-id-settings", {
            method: "PATCH",
            body: JSON.stringify({ prefix: officerIdPrefix.value.trim().toUpperCase() })
        });
        officerIdPrefix.value = result.prefix;
        setStatus(
            officerIdSettingsStatus,
            "Officer ID prefix saved. Existing IDs remain unchanged."
        );
    } catch (error) {
        console.error("Unable to save Officer ID settings:", error);
        setStatus(
            officerIdSettingsStatus,
            error.message || "Unable to save Officer ID settings.",
            true
        );
    } finally {
        saveOfficerIdSettingsButton.disabled = false;
    }
});

for (const button of websiteContentForm.querySelectorAll("[data-image-upload-button]")) {
    button.addEventListener("click", async () => {
        const contentKey = button.dataset.imageUploadButton;
        const fileInput = websiteContentForm.querySelector(
            `[data-image-upload="${contentKey}"]`
        );
        const file = fileInput.files?.[0];
        if (!file) {
            setStatus(websiteContentStatus, "Choose an image file before uploading.", true);
            fileInput.focus();
            return;
        }

        button.disabled = true;
        setStatus(websiteContentStatus, `Uploading ${file.name}...`);
        const formData = new FormData();
        formData.set("slot", contentKey);
        formData.set("file", file);

        try {
            const result = await apiRequest("/site-content/assets", {
                method: "POST",
                body: formData
            });
            const urlField = websiteContentForm.querySelector(
                `[data-site-content-key="${contentKey}"]`
            );
            const preview = websiteContentForm.querySelector(
                `[data-image-preview="${contentKey}"]`
            );
            urlField.value = result.imageUrl;
            preview.src = result.imageUrl;
            preview.hidden = false;
            fileInput.value = "";
            setStatus(
                websiteContentStatus,
                "Image uploaded. Save Public Website Content to publish it."
            );
        } catch (error) {
            console.error("Unable to upload website image:", error);
            setStatus(
                websiteContentStatus,
                error.message || "Unable to upload this image.",
                true
            );
        } finally {
            button.disabled = false;
        }
    });
}

websiteContentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const settings = Object.fromEntries(
        [...websiteContentForm.querySelectorAll("[data-site-content-key]")]
            .map(field => [field.dataset.siteContentKey, field.value.trim()])
    );

    if (!await confirmAction({
        title: "Publish website changes?",
        message: "Save and publish the current public website content?",
        confirmLabel: "Publish changes"
    })) {
        return;
    }

    saveWebsiteContentButton.disabled = true;
    setStatus(websiteContentStatus, "Saving public website content...");

    try {
        await apiRequest("/site-content", {
            method: "PATCH",
            body: JSON.stringify({ settings })
        });
        setStatus(websiteContentStatus, "Public website content saved and published.");
    } catch (error) {
        console.error("Unable to save public website content:", error);
        setStatus(
            websiteContentStatus,
            error.message || "Unable to save public website content.",
            true
        );
    } finally {
        saveWebsiteContentButton.disabled = false;
    }
});

profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!await confirmAction({
        title: "Save profile changes?",
        message: "Update your administrator profile with the current details?",
        confirmLabel: "Save changes"
    })) {
        return;
    }

    saveProfileButton.disabled = true;
    setStatus(profileStatus, "");

    try {
        await apiRequest("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify({
                full_name: document.getElementById("profileFullName").value.trim(),
                phone: document.getElementById("profilePhone").value.trim(),
                department: document.getElementById("profileDepartment").value.trim()
            })
        });
        setStatus(profileStatus, "Profile saved.");
    } catch (error) {
        console.error("Unable to save administrator profile:", error);
        setStatus(profileStatus, error.message || "Unable to save your profile.", true);
    } finally {
        saveProfileButton.disabled = false;
    }
});

passwordForm.addEventListener("submit", async event => {
    event.preventDefault();
    setStatus(passwordStatus, "");
    const password = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;

    if (password.length < 8) {
        setStatus(passwordStatus, "Password must contain at least 8 characters.", true);
        changePasswordButton.disabled = false;
        return;
    }

    if (password !== confirmation) {
        setStatus(passwordStatus, "The passwords do not match.", true);
        return;
    }

    if (!await confirmAction({
        title: "Change administrator password?",
        message: "This will replace your current password.",
        confirmLabel: "Change password"
    })) {
        return;
    }

    changePasswordButton.disabled = true;
    try {
        await apiRequest("/auth/password", {
            method: "POST",
            body: JSON.stringify({ password })
        });
        passwordForm.reset();
        setStatus(passwordStatus, "Password changed successfully.");
    } catch (error) {
        console.error("Unable to change administrator password:", error);
        setStatus(passwordStatus, error.message || "Unable to change your password.", true);
    } finally {
        changePasswordButton.disabled = false;
    }
});