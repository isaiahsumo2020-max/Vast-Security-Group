import {
    getCurrentSession,
    getCurrentAdmin
} from "../../backend/auth/session.js";

import { apiRequest } from "../../backend/services/api.js";


const administratorForm =
    document.getElementById("administratorForm");

const adminRole =
    document.getElementById("adminRole");

const customPermissionsSection =
    document.getElementById("customPermissionsSection");

const administratorsList =
    document.getElementById("administratorsList");

const administratorSearch =
    document.getElementById("administratorSearch");

const administratorStatusFilter =
    document.getElementById("administratorStatusFilter");

const administratorRoleFilter =
    document.getElementById("administratorRoleFilter");

const createAdministratorSection =
    document.getElementById("createAdministratorSection");

const administratorMessageStatus =
    document.getElementById("administratorMessageStatus");

const createAdministratorBtn =
    document.getElementById("createAdministratorBtn");


let administrators = [];

document.getElementById("togglePassword").addEventListener("click", event => {
    const password = document.getElementById("adminPassword");
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    event.currentTarget.textContent = visible ? "Show" : "Hide";
    event.currentTarget.setAttribute("aria-pressed", String(!visible));
});

document.getElementById("addAdministratorBtn").addEventListener("click", () => {
    createAdministratorSection.hidden = false;
    document.getElementById("addAdministratorBtn").setAttribute("aria-expanded", "true");
    createAdministratorSection.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("adminFullName").focus();
});

document.getElementById("closeAdministratorFormBtn").addEventListener("click", () => {
    createAdministratorSection.hidden = true;
    document.getElementById("addAdministratorBtn").setAttribute("aria-expanded", "false");
    administratorForm.reset();
    administratorMessageStatus.textContent = "";
    customPermissionsSection.style.display = "none";
});

for (const filter of [administratorSearch, administratorStatusFilter, administratorRoleFilter]) {
    filter.addEventListener("input", renderFilteredAdministrators);
    filter.addEventListener("change", renderFilteredAdministrators);
}


/*
    Show custom permissions only
    when Custom Admin is selected.
*/

adminRole.addEventListener("change", () => {

    if (adminRole.value === "Custom Admin") {

        customPermissionsSection.style.display = "block";

    } else {

        customPermissionsSection.style.display = "none";

        document
            .querySelectorAll(".permission-checkbox")
            .forEach(checkbox => {
                checkbox.checked = false;
            });
    }
});


/*
    Display status message.
*/

function showMessage(message, type = "success") {

    administratorMessageStatus.textContent = message;

    administratorMessageStatus.className =
        `message-status ${type}`;

}


/*
    Build permissions object.
*/

function getCustomPermissions() {

    const permissions = {};

    document
        .querySelectorAll(".permission-checkbox")
        .forEach(checkbox => {

            permissions[checkbox.value] =
                checkbox.checked;

        });

    return permissions;
}


/*
    Load administrators.
*/

async function loadAdministrators() {

    try {

        administratorsList.innerHTML =
            "<p>Loading administrators...</p>";

        const result =
            await apiRequest("/administrators");

        administrators =
            result.administrators || [];

        updateAdministratorStatistics();
        renderFilteredAdministrators();

    } catch (error) {

        console.error(
            "Administrator loading error:",
            error
        );

        administratorsList.innerHTML = `
            <p>
                ${escapeHtml(
                    error.message ||
                    "Failed to load administrators."
                )}
            </p>
        `;
    }
}

function updateAdministratorStatistics() {
    document.getElementById("totalAdministratorsStat").textContent =
        String(administrators.length);
    document.getElementById("activeAdministratorsStat").textContent =
        String(administrators.filter(admin => admin.status === "Active").length);
    document.getElementById("inactiveAdministratorsStat").textContent =
        String(administrators.filter(admin => admin.status !== "Active").length);
    document.getElementById("superAdministratorsStat").textContent =
        String(administrators.filter(admin => admin.role === "Super Admin").length);
}

function renderFilteredAdministrators() {
    const query = administratorSearch.value.trim().toLowerCase();
    const status = administratorStatusFilter.value;
    const role = administratorRoleFilter.value;
    const filtered = administrators.filter(admin => {
        const searchable = [
            admin.full_name,
            admin.role,
            admin.department,
            admin.phone,
            admin.status
        ].join(" ").toLowerCase();

        return (!query || searchable.includes(query)) &&
            (!status || admin.status === status) &&
            (!role || admin.role === role);
    });

    renderAdministrators(filtered);
}


/*
    Render administrator cards.
*/

function renderAdministrators(administrators) {

    if (!administrators.length) {

        administratorsList.innerHTML = `
            <p>
                ${administrators.length === 0 &&
                (administratorSearch.value || administratorStatusFilter.value || administratorRoleFilter.value)
                    ? "No administrator accounts match the current search or filters."
                    : "No administrator accounts found."}
            </p>
        `;

        return;
    }


    administratorsList.innerHTML =
        administrators
            .map(admin => {

                return `
    <div
        class="communication-history-item administrator-item"
        data-user-id="${escapeHtml(admin.user_id)}"
    >

        <div>

            <strong>
                ${escapeHtml(admin.full_name)}
            </strong>

            <p>
                Role:
                ${escapeHtml(admin.role)}
            </p>

            <p>
                Department:
                ${escapeHtml(
                    admin.department || "Not specified"
                )}
            </p>

            <p>
                Phone:
                ${escapeHtml(
                    admin.phone || "Not specified"
                )}
            </p>

            <p>
                Status:
                ${escapeHtml(admin.status)}
            </p>

        </div>


        <div class="deployment-actions">

            <button
                type="button"
                class="dashboard-btn edit-admin-btn"
                data-user-id="${escapeHtml(admin.user_id)}"
            >
                Edit
            </button>

            <button
                type="button"
                class="dashboard-btn reset-password-btn"
                data-user-id="${escapeHtml(admin.user_id)}"
            >
                Reset Password
            </button>

            ${
                admin.status === "Active"
                    ? `
                        <button
                            type="button"
                            class="dashboard-btn deactivate-admin-btn"
                            data-user-id="${escapeHtml(admin.user_id)}"
                        >
                            Deactivate
                        </button>
                    `
                    : `
                        <button
                            type="button"
                            class="dashboard-btn activate-admin-btn"
                            data-user-id="${escapeHtml(admin.user_id)}"
                        >
                            Activate
                        </button>
                    `
            }

        </div>

    </div>
`;
            })
            .join("");
}


/*
    Open administrator edit form.
*/

document.addEventListener("click", event => {

    const editButton =
        event.target.closest(".edit-admin-btn");

    if (!editButton) {
        return;
    }

    const userId =
        editButton.dataset.userId;

    const admin =
        administrators.find(
            item => item.user_id === userId
        );

    if (!admin) {

        console.error(
            "Administrator not found:",
            userId
        );

        return;
    }

    openEditAdministrator(admin);
});


/*
    Create administrator.
*/

administratorForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        try {

            createAdministratorBtn.disabled = true;

            createAdministratorBtn.textContent =
                "Creating...";

            showMessage(
                "Creating administrator...",
                "info"
            );


            const role =
                adminRole.value;


            const permissions =
                role === "Custom Admin"
                    ? getCustomPermissions()
                    : undefined;


            const adminData = {

                email:
                    document.getElementById(
                        "adminEmail"
                    ).value.trim(),

                password:
                    document.getElementById(
                        "adminPassword"
                    ).value,

                full_name:
                    document.getElementById(
                        "adminFullName"
                    ).value.trim(),

                phone:
                    document.getElementById(
                        "adminPhone"
                    ).value.trim(),

                department:
                    document.getElementById(
                        "adminDepartment"
                    ).value.trim(),

                role,

                permissions
            };


            await apiRequest(
                "/administrators",
                {
                    method: "POST",
                    body: JSON.stringify(adminData)
                }
            );


            showMessage(
                "Administrator created successfully.",
                "success"
            );


            administratorForm.reset();

            customPermissionsSection.style.display =
                "none";


            await loadAdministrators();


        } catch (error) {

            console.error(
                "Administrator creation error:",
                error
            );

            showMessage(
                error.message ||
                "Failed to create administrator.",
                "error"
            );

        } finally {

            createAdministratorBtn.disabled =
                false;

            createAdministratorBtn.textContent =
                "Create Administrator";
        }

    }
);


/*
    Update administrator.
*/

async function updateAdministrator(
    userId,
    updates
) {

    const result =
        await apiRequest(
            `/administrators/${userId}`,
            {
                method: "PATCH",
                body: JSON.stringify(updates)
            }
        );

    return result.administrator;
}


/*
    Change administrator status.
*/

async function changeAdministratorStatus(
    userId,
    status
) {

    const currentSession =
        await getCurrentSession();

    if (
        currentSession?.user?.id === userId &&
        status !== "Active"
    ) {

        throw new Error(
            "You cannot deactivate your own administrator account."
        );
    }


    await updateAdministrator(
        userId,
        {
            status
        }
    );
}


/*
    Activate / deactivate administrator.
*/

administratorsList.addEventListener(
    "click",
    async event => {

        const activateButton =
            event.target.closest(
                ".activate-admin-btn"
            );

        const deactivateButton =
            event.target.closest(
                ".deactivate-admin-btn"
            );


        if (
            !activateButton &&
            !deactivateButton
        ) {
            return;
        }


        const button =
            activateButton ||
            deactivateButton;


        const userId =
            button.dataset.userId;


        const newStatus =
            activateButton
                ? "Active"
                : "Inactive";


        if (newStatus === "Inactive") {

            const confirmed =
                confirm(
                    "Are you sure you want to deactivate this administrator?"
                );

            if (!confirmed) {
                return;
            }
        }


        try {

            button.disabled = true;

            await changeAdministratorStatus(
                userId,
                newStatus
            );


            showMessage(
                `Administrator ${
                    newStatus === "Active"
                        ? "activated"
                        : "deactivated"
                } successfully.`,
                "success"
            );


            await loadAdministrators();


        } catch (error) {

            console.error(
                "Administrator status error:",
                error
            );

            showMessage(
                error.message ||
                "Failed to update administrator status.",
                "error"
            );

        } finally {

            button.disabled = false;
        }

    }
);


/*
    Reset administrator password.
*/

async function resetPassword(
    userId,
    newPassword
) {

    return await apiRequest(
        `/administrators/${userId}/reset-password`,
        {
            method: "POST",
            body: JSON.stringify({
                newPassword
            })
        }
    );
}


/*
    Reset password button.
*/

administratorsList.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".reset-password-btn"
            );

        if (!button) {
            return;
        }


        const userId =
            button.dataset.userId;


        const newPassword =
            prompt(
                "Enter the new temporary password (minimum 8 characters):"
            );


        if (!newPassword) {
            return;
        }


        if (newPassword.length < 8) {

            alert(
                "Password must contain at least 8 characters."
            );

            return;
        }


        try {

            button.disabled = true;

            await resetPassword(
                userId,
                newPassword
            );


            showMessage(
                "Administrator password reset successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Administrator password reset error:",
                error
            );

            showMessage(
                error.message ||
                "Failed to reset password.",
                "error"
            );

        } finally {

            button.disabled = false;
        }

    }
);


/*
    Prevent HTML injection when displaying
    administrator information.
*/

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
    Initial page authorization.
*/

async function initializeAdministratorPage() {

    try {

        const admin =
            await getCurrentAdmin();


        if (!admin) {

            window.location.href =
                "../login.html";

            return;
        }


        if (
            admin.profile.status !== "Active" ||
            admin.profile.role !== "Super Admin"
        ) {

            alert(
                "Access denied. Super Admin privileges are required."
            );

            window.location.href =
                "../dashboard.html";

            return;
        }


        await loadAdministrators();


    } catch (error) {

        console.error(
            "Administrator page authorization error:",
            error
        );

        window.location.href =
            "../login.html";
    }
}


initializeAdministratorPage();


/*
    Open edit administrator form.
*/

function openEditAdministrator(admin) {

    document.getElementById(
        "editAdministratorSection"
    ).style.display = "block";


    document.getElementById(
        "editAdminUserId"
    ).value =
        admin.user_id;


    document.getElementById(
        "editAdminFullName"
    ).value =
        admin.full_name || "";


    document.getElementById(
        "editAdminPhone"
    ).value =
        admin.phone || "";


    document.getElementById(
        "editAdminDepartment"
    ).value =
        admin.department || "";


    document.getElementById(
        "editAdminRole"
    ).value =
        admin.role || "Custom Admin";


    document.getElementById(
        "editAdminStatus"
    ).value =
        admin.status || "Active";


    loadEditPermissions(admin);


    document.getElementById(
        "editAdministratorSection"
    ).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/*
    Load edit permissions.
*/

function loadEditPermissions(admin) {

    const role =
        document.getElementById(
            "editAdminRole"
        ).value;


    const customSection =
        document.getElementById(
            "editCustomPermissionsSection"
        );


    const checkboxes =
        document.querySelectorAll(
            ".edit-permission-checkbox"
        );


    if (role !== "Custom Admin") {

        customSection.style.display =
            "none";


        checkboxes.forEach(
            checkbox => {
                checkbox.checked = false;
            }
        );

        return;
    }


    customSection.style.display =
        "block";


    const permissions =
        admin.permissions || {};


    checkboxes.forEach(
        checkbox => {

            checkbox.checked =
                permissions[
                    checkbox.value
                ] === true;

        }
    );
}


/*
    Edit role change.
*/

document.getElementById(
    "editAdminRole"
)?.addEventListener(
    "change",
    () => {

        const role =
            document.getElementById(
                "editAdminRole"
            ).value;


        const section =
            document.getElementById(
                "editCustomPermissionsSection"
            );


        if (role === "Custom Admin") {

            section.style.display =
                "block";

        } else {

            section.style.display =
                "none";

            document
                .querySelectorAll(
                    ".edit-permission-checkbox"
                )
                .forEach(
                    checkbox => {
                        checkbox.checked = false;
                    }
                );
        }
    }
);


/*
    Save administrator changes.
*/

async function saveAdministratorChanges(
    event
) {

    event.preventDefault();


    const userId =
        document.getElementById(
            "editAdminUserId"
        ).value;


    const role =
        document.getElementById(
            "editAdminRole"
        ).value;


    const message =
        document.getElementById(
            "editAdministratorMessageStatus"
        );


    let permissions;


    if (role === "Custom Admin") {

        permissions = {};


        document
            .querySelectorAll(
                ".edit-permission-checkbox"
            )
            .forEach(
                checkbox => {

                    permissions[
                        checkbox.value
                    ] =
                        checkbox.checked;

                }
            );

    } else {

        permissions = undefined;
    }


    const updates = {

        full_name:
            document.getElementById(
                "editAdminFullName"
            ).value.trim(),

        phone:
            document.getElementById(
                "editAdminPhone"
            ).value.trim(),

        department:
            document.getElementById(
                "editAdminDepartment"
            ).value.trim(),

        role,

        status:
            document.getElementById(
                "editAdminStatus"
            ).value
    };


    if (permissions !== undefined) {

        updates.permissions =
            permissions;
    }


    try {

        message.textContent =
            "Saving changes...";

        message.className =
            "message-status info";


        await updateAdministrator(
            userId,
            updates
        );


        message.textContent =
            "Administrator updated successfully.";

        message.className =
            "message-status success";


        await loadAdministrators();


        setTimeout(
            () => {
                closeEditAdministrator();
            },
            1000
        );


    } catch (error) {

        console.error(
            "Administrator update error:",
            error
        );


        message.textContent =
            error.message ||
            "Failed to update administrator.";

        message.className =
            "message-status error";
    }
}


/*
    Close edit administrator form.
*/

function closeEditAdministrator() {

    const section =
        document.getElementById(
            "editAdministratorSection"
        );


    section.style.display =
        "none";


    document.getElementById(
        "editAdministratorForm"
    ).reset();


    document.getElementById(
        "editAdministratorMessageStatus"
    ).textContent =
        "";


    document
        .querySelectorAll(
            ".edit-permission-checkbox"
        )
        .forEach(
            checkbox => {
                checkbox.checked = false;
            }
        );
}


/*
    Edit form listeners.
*/

document.getElementById(
    "editAdministratorForm"
)?.addEventListener(
    "submit",
    saveAdministratorChanges
);


document.getElementById(
    "cancelAdministratorEditBtn"
)?.addEventListener(
    "click",
    closeEditAdministrator
);