import { getOfficers } from "../../backend/officers/getOfficers.js";
import { addOfficer } from "../../backend/officers/addOfficer.js";
import { editOfficer } from "../../backend/officers/editOfficer.js";
import { deleteOfficer } from "../../backend/officers/deleteOfficer.js";
import { getPostStatistics } from "../../backend/posts/getPostStatistics.js";
import { getPendingApplicationCount } from "../../backend/recruitment/getPendingApplicationCount.js";
import { renderOfficerStatistics } from "./statistics.js";
import { confirmAction } from "../auth/confirmDialog.js";
import {
    previewImageFile,
    validateImageFile
} from "./uploadPhoto.js";

/* ==========================================
   ELEMENTS
========================================== */

const addOfficerBtn =
    document.getElementById("addOfficerBtn");

const officerModal =
    document.getElementById("officerModal");

const closeOfficerModal =
    document.getElementById("closeOfficerModal");

const cancelOfficerBtn =
    document.getElementById("cancelOfficerBtn");

const officerForm =
    document.getElementById("officerForm");

const officerTableBody =
    document.getElementById("officerTableBody");

const saveOfficerBtn =
    document.getElementById("saveOfficerBtn");

const officerFormMessage =
    document.getElementById("officerFormMessage");

const officerPhotoInput =
    document.getElementById("officerPhoto");

const officerPhotoPreview =
    document.getElementById("officerPhotoPreview");


/* ==========================================
OFFICER EDIT STATE
========================================== */

let currentEditingOfficerID = null;

let savedOfficer;

let dashboardOfficers = [];

officerPhotoInput.addEventListener("change", () => {
    try {
        const file = validateImageFile(officerPhotoInput.files[0]);
        previewImageFile(file, officerPhotoPreview);
        officerFormMessage.textContent = "";
    } catch (error) {
        officerPhotoInput.value = "";
        previewImageFile(null, officerPhotoPreview);
        officerFormMessage.textContent = error.message;
        officerFormMessage.className = "form-message error";
    }
});

/* ==========================================
   OPEN MODAL
========================================== */

addOfficerBtn.addEventListener("click", () => {

    officerModal.classList.add("active");

    document.body.style.overflow = "hidden";

});


/* ==========================================
   CLOSE MODAL
========================================== */

function closeModal() {

    officerModal.classList.remove("active");

    document.body.style.overflow = "";

    officerForm.reset();
    previewImageFile(null, officerPhotoPreview);

    officerFormMessage.textContent = "";

    officerFormMessage.className =
        "form-message";


    /* Reset edit mode */

    currentEditingOfficerID = null;


    /* Reset modal heading */
    document.querySelector(
        ".modal-header h2"
    ).textContent =
        "Add New Officer";


    document.querySelector(
        ".modal-header p"
    ).textContent =
        "Create a new VAST officer record.";


    saveOfficerBtn.textContent =
        "Save Officer";

}


closeOfficerModal.addEventListener(
    "click",
    closeModal
);


cancelOfficerBtn.addEventListener(
    "click",
    closeModal
);


officerModal.addEventListener(
    "click",
    event => {

        if (event.target === officerModal) {

            closeModal();

        }

    }
);


/* ==========================================
   LOAD OFFICERS
========================================== */

async function loadOfficers(){

    try{

        const officers =
            await getOfficers();


        dashboardOfficers = officers;


        applyOfficerFilters();


        updateOfficerStatistics(
            officers
        );


    }catch(error){

        console.error(
            "Unable to load officers:",
            error
        );

    }

}



/* ==========================================
   SEARCH AND FILTER OFFICERS
========================================== */

function applyOfficerFilters(){

    const searchInput =
        document
        .getElementById(
            "officerSearch"
        )
        .value
        .trim()
        .toLowerCase();


    const selectedStatus =
        document
        .getElementById(
            "statusFilter"
        )
        .value;


    const filteredOfficers =
        dashboardOfficers.filter(
            officer => {


                const name =
                    (
                        officer.name ||
                        ""
                    )
                    .toLowerCase();


                const officerID =
                    (
                        officer.officer_id ||
                        ""
                    )
                    .toLowerCase();


                const position =
                    (
                        officer.position ||
                        ""
                    )
                    .toLowerCase();


                const matchesSearch =

                    name.includes(searchInput) ||

                    officerID.includes(searchInput) ||

                    position.includes(searchInput);


                const matchesStatus =

                    !selectedStatus ||

                    officer.status ===
                    selectedStatus;


                return matchesSearch &&
                    matchesStatus;

            }
        );


    renderOfficerTable(
        filteredOfficers
    );

}


/* ==========================================
   SEARCH EVENTS
========================================== */

document
.getElementById("officerSearch")
.addEventListener(
    "input",
    applyOfficerFilters
);


document
.getElementById("statusFilter")
.addEventListener(
    "change",
    applyOfficerFilters
);


/* ==========================================
   DISPLAY OFFICERS
========================================== */

function renderOfficerTable(officers) {
    officerTableBody.replaceChildren();

    if (!officers.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "No officers found.";
        row.appendChild(cell);
        officerTableBody.appendChild(row);
        return;
    }

    officers.forEach(officer => {
        const row = document.createElement("tr");

        for (const value of [
            officer.officer_id,
            officer.name,
            officer.position,
            officer.department || "-"
        ]) {
            const cell = document.createElement("td");
            cell.textContent = value || "-";
            row.appendChild(cell);
        }

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.textContent = officer.status || "Unknown";
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionsCell = document.createElement("td");
        for (const [action, label, className] of [
            ["edit", "Edit", "edit-btn"],
            ["delete", "Delete", "delete-btn"]
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `action-btn ${className}`;
            button.dataset.action = action;
            button.dataset.id = officer.officer_id;
            button.textContent = label;
            actionsCell.appendChild(button);
        }
        row.appendChild(actionsCell);
        officerTableBody.appendChild(row);
    });
}


/* ==========================================
   OPEN EDIT OFFICER
========================================== */

async function openEditOfficer(officerID) {

    try {

        const officers =
            await getOfficers();


        const officer =
            officers.find(
                item =>
                    item.officer_id === officerID
            );


        if (!officer) {

            throw new Error(
                "Officer record not found."
            );

        }


        /* Activate edit mode */

        currentEditingOfficerID =
            officer.officer_id;


        /* Change modal text */

        document.querySelector(
            ".modal-header h2"
        ).textContent =
            "Edit Officer";


        document.querySelector(
            ".modal-header p"
        ).textContent =
            `Updating ${officer.officer_id}`;


        saveOfficerBtn.textContent =
            "Update Officer";

        if (officer.photo) {
            officerPhotoPreview.src = officer.photo;
            officerPhotoPreview.hidden = false;
        } else {
            previewImageFile(null, officerPhotoPreview);
        }


        /* Fill form */

        document
            .getElementById(
                "officerName"
            )
            .value =
            officer.name || "";


        document
            .getElementById(
                "officerPhone"
            )
            .value =
            officer.phone || "";


        document
            .getElementById(
                "officerEmail"
            )
            .value =
            officer.email || "";


        document
            .getElementById(
                "officerGender"
            )
            .value =
            officer.gender || "";


        document
            .getElementById(
                "officerPosition"
            )
            .value =
            officer.position || "";


        document
            .getElementById(
                "officerDepartment"
            )
            .value =
            officer.department || "";


        document
            .getElementById(
                "officerEmployment"
            )
            .value =
            officer.employment || "";


        document
            .getElementById(
                "officerStatus"
            )
            .value =
            officer.status || "";


        document
            .getElementById(
                "officerIssueDate"
            )
            .value =
            officer.issueDate ||
            officer.issue_date ||
            "";


        document
            .getElementById(
                "officerExpiryDate"
            )
            .value =
            officer.expiryDate ||
            officer.expiry_date ||
            "";


        /* Open modal */

        officerModal.classList.add(
            "active"
        );


        document.body.style.overflow =
            "hidden";


    } catch (error) {

        console.error(
            "Unable to open officer:",
            error
        );

        alert(
            error.message ||
            "Unable to load officer."
        );

    }

}




/* ==========================================
   TABLE ACTION BUTTONS
========================================== */

officerTableBody.addEventListener(
    "click",
    async function (event) {

        const actionButton =
            event.target.closest(
                "button[data-action]"
            );


        if (!actionButton) {
            return;
        }

        const officerID = actionButton.dataset.id;

        if (actionButton.dataset.action === "edit") {
            await openEditOfficer(officerID);
        } else if (actionButton.dataset.action === "delete") {
            await handleDeleteOfficer(officerID);
        }

    }
);




/* ==========================================
   DELETE OFFICER
========================================== */

async function handleDeleteOfficer(officerID) {

    const confirmed = await confirmAction({
        title: "Delete officer?",
        message: "Are you sure you want to delete this officer? This will permanently remove the officer record.",
        confirmLabel: "Delete officer",
        destructive: true
    });


    if (!confirmed) {

        return;

    }


    try {

        await deleteOfficer(
            officerID
        );


        await loadOfficers();


        alert(
            "Officer deleted successfully."
        );


    } catch (error) {

        console.error(
            "Unable to delete officer:",
            error
        );


        alert(

            error.message ||
            "Unable to delete officer."

        );

    }

}
/* ==========================================
   DASHBOARD STATISTICS
========================================== */

function updateOfficerStatistics(officers) {
    renderOfficerStatistics(officers);
}



async function loadPostStatistics() {

    try {

        const statistics = await getPostStatistics();

        document.getElementById("totalSecurityPosts").textContent =
            statistics.totalPosts;

        document.getElementById("activeSecurityPosts").textContent =
            statistics.activePosts;

        document.getElementById("requiredPostOfficers").textContent =
            statistics.requiredOfficers;

        document.getElementById("deployedPostOfficers").textContent =
            statistics.deployedOfficers;

        document.getElementById("vacantPostPositions").textContent =
            statistics.vacantPositions;

        document.getElementById("deploymentCoverage").textContent =
            `${statistics.deploymentCoverage}%`;

    } catch (error) {

        console.error(
            "Error loading security post statistics:",
            error
        );

    }
}

async function loadPendingApplicationCount() {
    const pendingApplicationsElement =
        document.getElementById("pendingApplications");

    if (!pendingApplicationsElement) {
        return;
    }

    try {
        const count = await getPendingApplicationCount();
        pendingApplicationsElement.textContent = String(count);
    } catch (error) {
        console.error("Unable to load pending application count:", error);
        pendingApplicationsElement.textContent = "—";
    }
}


/* ==========================================
   SUBMIT NEW OFFICER
========================================== */

officerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        officerFormMessage.textContent = "";

        if (currentEditingOfficerID) {
            const confirmed = await confirmAction({
                title: "Save officer changes?",
                message: `Update officer ${currentEditingOfficerID} with the current details?`,
                confirmLabel: "Save changes"
            });
            if (!confirmed) {
                return;
            }
        }

        saveOfficerBtn.disabled = true;

        saveOfficerBtn.textContent =
            "Saving...";


        try {

            const officerData = {

                name:
                    document
                        .getElementById(
                            "officerName"
                        )
                        .value
                        .trim(),

                phone:
                    document
                        .getElementById(
                            "officerPhone"
                        )
                        .value
                        .trim(),

                email:
                    document
                        .getElementById(
                            "officerEmail"
                        )
                        .value
                        .trim(),

                gender:
                    document
                        .getElementById(
                            "officerGender"
                        )
                        .value,

                position:
                    document
                        .getElementById(
                            "officerPosition"
                        )
                        .value
                        .trim(),

                department:
                    document
                        .getElementById(
                            "officerDepartment"
                        )
                        .value
                        .trim(),

                employment:
                    document
                        .getElementById(
                            "officerEmployment"
                        )
                        .value,

                status:
                    document
                        .getElementById(
                            "officerStatus"
                        )
                        .value,

                issueDate:
                    document
                        .getElementById(
                            "officerIssueDate"
                        )
                        .value,

                expiryDate:
                    document
                        .getElementById(
                            "officerExpiryDate"
                        )
                        .value

            };


            const photoInput =
                document.getElementById(
                    "officerPhoto"
                );


            const photoFile =
                photoInput.files[0]
                || null;




            /* ==========================================
               EDIT EXISTING OFFICER
            ========================================== */

            if (currentEditingOfficerID) {

                savedOfficer =
                    await editOfficer(

                        currentEditingOfficerID,

                        officerData,

                        photoFile

                    );


                officerFormMessage.textContent =
                    `Officer ${currentEditingOfficerID} updated successfully.`;

            }


            /* ==========================================
               ADD NEW OFFICER
            ========================================== */

            else {

                savedOfficer =
                    await addOfficer(

                        officerData,

                        photoFile

                    );


                officerFormMessage.textContent =
                    `Officer ${savedOfficer.officer_id} added successfully.`;

            }


            console.log(
                "Officer saved:",
                savedOfficer
            );


            officerFormMessage.className =
                "form-message success";


            await loadOfficers();


            setTimeout(() => {

                closeModal();

            }, 1200);


        } catch (error) {

            console.error(error);


            officerFormMessage.textContent =
                error.message ||
                "Unable to add officer.";

            officerFormMessage.className =
                "form-message error";

        }


        finally {

            saveOfficerBtn.disabled = false;

            saveOfficerBtn.textContent =
                "Save Officer";

        }

    }
);


/* ==========================================
   INITIALIZE
========================================== */

window.addEventListener(
    "DOMContentLoaded",
    loadOfficers
);

window.addEventListener(
    "DOMContentLoaded",
    loadPostStatistics
);

window.addEventListener(
    "DOMContentLoaded",
    loadPendingApplicationCount
);