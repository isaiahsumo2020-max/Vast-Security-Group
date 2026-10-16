import {
    getApplications
} from "../../backend/recruitment/getApplications.js";


let applications = [];

import {
    getApplicationDetails
} from "../../backend/recruitment/getApplicationDetails.js";


import {
    updateApplication
} from "../../backend/recruitment/updateApplication.js";


/* =========================================================
   ELEMENTS
========================================================= */

const applicationsTableBody =
    document.getElementById(
        "applicationsTableBody"
    );


const applicationSearch =
    document.getElementById(
        "applicationSearch"
    );


const applicationStatusFilter =
    document.getElementById(
        "applicationStatusFilter"
    );


const refreshApplicationsBtn =
    document.getElementById(
        "refreshApplicationsBtn"
    );



const applicationModal =
    document.getElementById(
        "applicationModal"
    );


const applicationModalBackdrop =
    document.getElementById(
        "applicationModalBackdrop"
    );


const closeApplicationModal =
    document.getElementById(
        "closeApplicationModal"
    );


const applicationModalBody =
    document.getElementById(
        "applicationModalBody"
    );


const modalApplicantName =
    document.getElementById(
        "modalApplicantName"
    );


/* =========================================================
   LOAD APPLICATIONS
========================================================= */

async function loadApplications() {

    applicationsTableBody.innerHTML =

        `
        <tr>

            <td
                colspan="6"
                class="dashboard-empty-state"
            >

                Loading applications...

            </td>

        </tr>
        `;


    try {

        applications =
            await getApplications();


        updateApplicationStatistics();


        renderApplications(
            applications
        );


    }
    catch (error) {

        console.error(
            error
        );


        applicationsTableBody.innerHTML =

            `
            <tr>

                <td
                    colspan="6"
                    class="dashboard-empty-state"
                >

                    Unable to load applications.

                </td>

            </tr>
            `;

    }

}


/* =========================================================
   RENDER APPLICATIONS
========================================================= */

function renderApplications(
    applicationList
) {

    if (
        !applicationList
        ||
        applicationList.length === 0
    ) {

        applicationsTableBody.innerHTML =

            `
            <tr>

                <td
                    colspan="6"
                    class="dashboard-empty-state"
                >

                    No applications found.

                </td>

            </tr>
            `;


        return;

    }


    applicationsTableBody.innerHTML = "";


    applicationList.forEach(
        application => {


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =

                `
                <td>

                    <strong>

                        ${escapeHTML(
                    application.full_name
                )}

                    </strong>

                    <br>

                    <small>

                        ${escapeHTML(
                    application.email
                    ||
                    "No email"
                )}

                    </small>

                </td>


                <td>

                    ${escapeHTML(
                    application.position_name
                    ||
                    "Not specified"
                )}

                </td>


                <td>

                    ${escapeHTML(
                    application.phone
                )}

                </td>


                <td>

                    ${formatDate(
                    application.created_at
                )}

                </td>


                <td>

                    <span
                        class="
                            application-status
                            ${getStatusClass(
                    application.status
                )}
                        "
                    >

                        ${escapeHTML(
                    application.status
                )}

                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="view-application-btn"
                        data-application-id="
                            ${application.id}
                        "
                    >

                        View

                    </button>

                </td>
                `;


            applicationsTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   APPLICATION STATISTICS
========================================================= */

function updateApplicationStatistics() {

    const total =
        applications.length;


    const pending =
        applications.filter(

            application =>

                application.status ===
                "Pending"

        ).length;


    const shortlisted =
        applications.filter(

            application =>

                application.status ===
                "Shortlisted"

        ).length;


    const accepted =
        applications.filter(

            application =>

                application.status ===
                "Accepted"

        ).length;



    document.getElementById(
        "totalApplications"
    ).textContent =
        total;


    document.getElementById(
        "pendingApplications"
    ).textContent =
        pending;


    document.getElementById(
        "shortlistedApplications"
    ).textContent =
        shortlisted;


    document.getElementById(
        "acceptedApplications"
    ).textContent =
        accepted;

}


/* =========================================================
   FILTER APPLICATIONS
========================================================= */

function filterApplications() {

    const searchTerm =

        applicationSearch
            .value
            .trim()
            .toLowerCase();


    const selectedStatus =

        applicationStatusFilter
            .value;


    const filteredApplications =

        applications.filter(
            application => {


                const name =
                    (
                        application.full_name
                        ||
                        ""
                    )
                        .toLowerCase();


                const phone =
                    (
                        application.phone
                        ||
                        ""
                    )
                        .toLowerCase();


                const matchesSearch =

                    name.includes(
                        searchTerm
                    )

                    ||

                    phone.includes(
                        searchTerm
                    );


                const matchesStatus =

                    selectedStatus ===
                    "all"

                    ||

                    application.status ===
                    selectedStatus;


                return (

                    matchesSearch

                    &&

                    matchesStatus

                );

            }
        );


    renderApplications(
        filteredApplications
    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    return (

        "status-"

        +

        String(
            status
        )

            .toLowerCase()

            .replace(
                /\s+/g,
                "-"
            )

    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "—";

    }


    return new Date(
        dateValue
    )

        .toLocaleDateString(
            undefined,
            {

                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric"

            }
        );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        value || "";


    return element.innerHTML;

}


/* =========================================================
   APPLICATION DETAILS MODAL
========================================================= */

async function openApplicationDetails(
    applicationID
) {

    applicationModal.classList.add(
        "show"
    );


    applicationModalBody.innerHTML =
        "Loading applicant details...";


    try {

        const {

            application,

            documents

        } = await getApplicationDetails(
            applicationID
        );


        modalApplicantName.textContent =
            application.full_name;


        renderApplicationDetails(
            application,
            documents
        );


    }
    catch (error) {

        console.error(error);


        applicationModalBody.innerHTML =

            `
            <p class="dashboard-empty-state">

                Unable to load application details.

            </p>
            `;

    }

}



function renderApplicationDetails(
    application,
    documents
) {

    const typedLetter =

        application.application_letter_type ===
        "text";


    applicationModalBody.innerHTML =

        `

        <div class="applicant-profile-header">

            <img
                class="applicant-photo"
                src="
                    ${application.photo_url || ""}
                "
                alt="
                    ${escapeHTML(
            application.full_name
        )}
                "
            >


            <div class="applicant-profile-info">

                <h3>

                    ${escapeHTML(
            application.full_name
        )}

                </h3>


                <p>

                    ${escapeHTML(
            application.position_name
            ||
            "Position not specified"
        )}

                </p>


                <span
                    class="
                        application-status
                        ${getStatusClass(
            application.status
        )}
                    "
                >

                    ${escapeHTML(
            application.status
        )}

                </span>

            </div>

        </div>



        <!-- APPLICANT INFORMATION -->

        <div class="application-details-grid">


            <div class="application-detail-item">

                <span>
                    Phone Number
                </span>

                <strong>

                    ${escapeHTML(
            application.phone
            ||
            "—"
        )}

                </strong>

            </div>


            <div class="application-detail-item">

                <span>
                    Email Address
                </span>

                <strong>

                    ${escapeHTML(
            application.email
            ||
            "Not provided"
        )}

                </strong>

            </div>


            <div class="application-detail-item">

                <span>
                    Gender
                </span>

                <strong>

                    ${escapeHTML(
            application.gender
            ||
            "Not provided"
        )}

                </strong>

            </div>


            <div class="application-detail-item">

                <span>
                    County
                </span>

                <strong>

                    ${escapeHTML(
            application.county
            ||
            "Not provided"
        )}

                </strong>

            </div>


            <div class="application-detail-item">

                <span>
                    Residential Address
                </span>

                <strong>

                    ${escapeHTML(
            application.address
            ||
            "Not provided"
        )}

                </strong>

            </div>


            <div class="application-detail-item">

                <span>
                    Date Applied
                </span>

                <strong>

                    ${formatDate(
            application.created_at
        )}

                </strong>

            </div>


        </div>



        <!-- APPLICATION LETTER -->

        ${typedLetter

            ?

            `

            <div class="application-content-section">

                <h3>
                    Application Letter
                </h3>


                <div class="application-letter-content">

                    ${escapeHTML(
                application.application_letter_text
                ||
                "No application letter provided."
            )}

                </div>

            </div>

            `

            :

            ""
        }



        <!-- DOCUMENTS -->

        <div class="application-content-section">

            <h3>
                Submitted Documents
            </h3>


            <div class="application-documents-list">

                ${documents.length > 0

            ?

            documents.map(
                document =>

                    `

                        <div class="application-document-item">


                            <div class="application-document-info">

                                <strong>

                                    ${escapeHTML(
                        formatDocumentType(
                            document.document_type
                        )
                    )}

                                </strong>


                                <small>

                                    ${escapeHTML(
                        document.file_name
                    )}

                                </small>

                            </div>


                            <a
                                href="
                                    ${document.file_url}
                                "
                                target="_blank"
                                rel="noopener"
                                class="view-document-btn"
                            >

                                View Document

                            </a>


                        </div>

                        `

            ).join("")

            :

            `

                    <p>

                        No documents found.

                    </p>

                    `

        }

            </div>

        </div>







<!-- =====================================================
     APPLICATION MANAGEMENT
===================================================== -->

<div class="application-content-section">

    <h3>
        Application Management
    </h3>


    <div class="application-management-grid">


        <!-- STATUS -->

        <div class="application-management-field">

            <label for="applicationStatus">

                Application Status

            </label>


            <select
                id="applicationStatus"
            >

                <option
                    value="Pending"
                    ${application.status === "Pending"
            ?
            "selected"
            :
            ""
        }
                >

                    Pending

                </option>


                <option
                    value="Under Review"
                    ${application.status === "Under Review"
            ?
            "selected"
            :
            ""
        }
                >

                    Under Review

                </option>


                <option
                    value="Shortlisted"
                    ${application.status === "Shortlisted"
            ?
            "selected"
            :
            ""
        }
                >

                    Shortlisted

                </option>


                <option
                    value="Interview"
                    ${application.status === "Interview"
            ?
            "selected"
            :
            ""
        }
                >

                    Interview

                </option>


                <option
                    value="Training"
                    ${application.status === "Training"
            ?
            "selected"
            :
            ""
        }
                >

                    Training

                </option>


                <option
                    value="Accepted"
                    ${application.status === "Accepted"
            ?
            "selected"
            :
            ""
        }
                >

                    Accepted

                </option>


                <option
                    value="Rejected"
                    ${application.status === "Rejected"
            ?
            "selected"
            :
            ""
        }
                >

                    Rejected

                </option>

            </select>

        </div>



        <!-- ADMIN NOTES -->

        <div
            class="
                application-management-field
                application-management-notes
            "
        >

            <label
                for="applicationAdminNotes"
            >

                Admin Notes

            </label>


            <textarea
                id="applicationAdminNotes"
                rows="6"
                placeholder="
Add private notes about this applicant...
"
            >${escapeHTML(
            application.admin_notes || ""
        )}</textarea>

        </div>


    </div>



    <div class="application-management-actions">


        <button
            type="button"
            class="save-application-btn"
            id="saveApplicationBtn"
            data-application-id="
                ${application.id}
            "
        >

            Save Changes

        </button>


        <span
            class="application-save-message"
            id="applicationSaveMessage"
        ></span>


    </div>

</div>

  `;

}



function formatDocumentType(
    type
) {

    const types = {

        cv:
            "CV / Resume",

        application_letter:
            "Application Letter",

        other:
            "Supporting Document"

    };


    return types[type] ||
        "Document";

}




/* =========================================================
   SAVE APPLICATION MANAGEMENT
========================================================= */

async function saveApplicationChanges(
    applicationID
){

    const status =

        document
            .getElementById(
                "applicationStatus"
            )
            .value;


    const adminNotes =

        document
            .getElementById(
                "applicationAdminNotes"
            )
            .value
            .trim();


    const saveButton =

        document
            .getElementById(
                "saveApplicationBtn"
            );


    const saveMessage =

        document
            .getElementById(
                "applicationSaveMessage"
            );


    saveButton.disabled =
        true;


    saveButton.textContent =
        "Saving...";


    saveMessage.textContent =
        "Saving changes...";


    saveMessage.style.color =
        "#0B2341";


    try{

        await updateApplication(

            applicationID,

            {

                status:
                    status,

                admin_notes:
                    adminNotes

            }

        );


        saveMessage.textContent =
            "Changes saved successfully.";


        saveMessage.style.color =
            "#198754";


        /* Refresh applications table */

        await loadApplications();


    }
    catch(error){

        console.error(
            error
        );


        saveMessage.textContent =

            "Unable to save changes.";


        saveMessage.style.color =
            "#DC3545";

    }


    saveButton.disabled =
        false;


    saveButton.textContent =
        "Save Changes";

}


applicationModalBody.addEventListener(
    "click",
    function(event){

        const saveButton =

            event.target.closest(
                "#saveApplicationBtn"
            );


        if(!saveButton){

            return;

        }


        const applicationID =

            saveButton.dataset.applicationId;


        saveApplicationChanges(
            applicationID
        );

    }
);





function closeApplicationDetails() {

    applicationModal.classList.remove(
        "show"
    );

}


closeApplicationModal.addEventListener(
    "click",
    closeApplicationDetails
);


applicationModalBackdrop.addEventListener(
    "click",
    closeApplicationDetails
);
/* =========================================================
   EVENT LISTENERS
========================================================= */

applicationSearch.addEventListener(
    "input",
    filterApplications
);


applicationStatusFilter.addEventListener(
    "change",
    filterApplications
);


refreshApplicationsBtn.addEventListener(
    "click",
    loadApplications
);


/* =========================================================
   START
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    loadApplications
);