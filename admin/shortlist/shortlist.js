import {
    getApplications
} from "../../backend/recruitment/getApplications.js";


let applications = [];


/* =========================================================
   ELEMENTS
========================================================= */

const shortlistTableBody =
    document.getElementById(
        "shortlistTableBody"
    );


const shortlistSearch =
    document.getElementById(
        "shortlistSearch"
    );


const shortlistStatusFilter =
    document.getElementById(
        "shortlistStatusFilter"
    );


const refreshShortlistBtn =
    document.getElementById(
        "refreshShortlistBtn"
    );



/* =========================================================
   RECRUITMENT STAGES
========================================================= */

const recruitmentStages = [

    "Shortlisted",

    "Interview",

    "Training",

    "Accepted"

];



/* =========================================================
   LOAD SHORTLIST
========================================================= */

async function loadShortlist(){

    shortlistTableBody.innerHTML =

        `
        <tr>

            <td
                colspan="6"
                class="dashboard-empty-state"
            >

                Loading applicants...

            </td>

        </tr>
        `;


    try{

        const data =
            await getApplications();


        applications =

            data.filter(
                application =>

                    recruitmentStages.includes(
                        application.status
                    )
            );


        updateShortlistStatistics();


        renderShortlist(
            applications
        );


    }
    catch(error){

        console.error(
            error
        );


        shortlistTableBody.innerHTML =

            `
            <tr>

                <td
                    colspan="6"
                    class="dashboard-empty-state"
                >

                    Unable to load applicants.

                </td>

            </tr>
            `;

    }

}



/* =========================================================
   RENDER SHORTLIST
========================================================= */

function renderShortlist(
    applicationList
){

    if(
        applicationList.length === 0
    ){

        shortlistTableBody.innerHTML =

            `
            <tr>

                <td
                    colspan="6"
                    class="dashboard-empty-state"
                >

                    No shortlisted applicants found.

                </td>

            </tr>
            `;


        return;

    }


    shortlistTableBody.innerHTML = "";


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
                        ||
                        "—"
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

                    ${formatDate(
                        application.created_at
                    )}

                </td>


                <td>

                    <button
                        type="button"
                        class="view-shortlisted-btn"
                        data-application-id="
                            ${application.id}
                        "
                    >

                        View

                    </button>

                </td>

                `;


            shortlistTableBody.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   STATISTICS
========================================================= */

function updateShortlistStatistics(){

    document.getElementById(
        "shortlistedCount"
    ).textContent =

        applications.filter(
            application =>

                application.status ===
                "Shortlisted"
        ).length;


    document.getElementById(
        "interviewCount"
    ).textContent =

        applications.filter(
            application =>

                application.status ===
                "Interview"
        ).length;


    document.getElementById(
        "trainingCount"
    ).textContent =

        applications.filter(
            application =>

                application.status ===
                "Training"
        ).length;


    document.getElementById(
        "acceptedCount"
    ).textContent =

        applications.filter(
            application =>

                application.status ===
                "Accepted"
        ).length;

}



/* =========================================================
   FILTER
========================================================= */

function filterShortlist(){

    const searchTerm =

        shortlistSearch
            .value
            .trim()
            .toLowerCase();


    const selectedStatus =

        shortlistStatusFilter
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


    renderShortlist(
        filteredApplications
    );

}



/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
){

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
){

    if(!dateValue){

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
){

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        value || "";


    return element.innerHTML;

}



/* =========================================================
   EVENTS
========================================================= */

shortlistSearch.addEventListener(
    "input",
    filterShortlist
);


shortlistStatusFilter.addEventListener(
    "change",
    filterShortlist
);


refreshShortlistBtn.addEventListener(
    "click",
    loadShortlist
);



/* =========================================================
   START
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    loadShortlist
);