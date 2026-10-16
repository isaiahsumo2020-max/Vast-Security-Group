import {
    getApplications
} from "../../backend/recruitment/getApplications.js";


import {
    getApplicantCommunications,
    addCommunication
} from "../../backend/recruitment/communicationService.js";


/* =========================================================
   DATA
========================================================= */

let applicants = [];


/* =========================================================
   ELEMENTS
========================================================= */

const communicationApplicant =
    document.getElementById(
        "communicationApplicant"
    );


const communicationForm =
    document.getElementById(
        "communicationForm"
    );


const communicationType =
    document.getElementById(
        "communicationType"
    );


const scheduledDate =
    document.getElementById(
        "scheduledDate"
    );


const communicationLocation =
    document.getElementById(
        "communicationLocation"
    );


const contactMethod =
    document.getElementById(
        "contactMethod"
    );


const contactStatus =
    document.getElementById(
        "contactStatus"
    );


const communicationMessage =
    document.getElementById(
        "communicationMessage"
    );


const communicationAdminNotes =
    document.getElementById(
        "communicationAdminNotes"
    );


const communicationHistory =
    document.getElementById(
        "communicationHistory"
    );


const saveCommunicationBtn =
    document.getElementById(
        "saveCommunicationBtn"
    );


const communicationMessageStatus =
    document.getElementById(
        "communicationMessageStatus"
    );


/* =========================================================
   RECRUITMENT STAGES ALLOWED FOR COMMUNICATION
========================================================= */

const communicationStages = [

    "Shortlisted",

    "Interview",

    "Training",

    "Accepted"

];


/* =========================================================
   LOAD APPLICANTS
========================================================= */

async function loadApplicants(){

    try{

        const data =
            await getApplications();


        applicants =

            data.filter(
                applicant =>

                    communicationStages.includes(
                        applicant.status
                    )
            );


        populateApplicantSelect();


    }
    catch(error){

        console.error(
            "Unable to load applicants:",
            error
        );


        communicationApplicant.innerHTML =

            `
            <option value="">

                Unable to load applicants

            </option>
            `;

    }

}


/* =========================================================
   POPULATE APPLICANT SELECT
========================================================= */

function populateApplicantSelect(){

    communicationApplicant.innerHTML =

        `
        <option value="">

            Select an applicant

        </option>
        `;


    applicants.forEach(
        applicant => {


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                applicant.id;


            option.textContent =

                `${applicant.full_name} — ${applicant.status}`;


            communicationApplicant.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD APPLICANT COMMUNICATION HISTORY
========================================================= */

async function loadCommunicationHistory(
    applicationID
){

    if(!applicationID){

        communicationHistory.innerHTML =

            `
            Select an applicant to view
            communication history.
            `;


        return;

    }


    communicationHistory.innerHTML =

        `
        Loading communication history...
        `;


    try{

        const communications =

            await getApplicantCommunications(
                applicationID
            );


        renderCommunicationHistory(
            communications
        );


    }
    catch(error){

        console.error(
            error
        );


        communicationHistory.innerHTML =

            `
            Unable to load communication history.
            `;

    }

}


/* =========================================================
   RENDER COMMUNICATION HISTORY
========================================================= */

function renderCommunicationHistory(
    communications
){

    if(
        !communications
        ||
        communications.length === 0
    ){

        communicationHistory.innerHTML =

            `
            <p>

                No communication records found
                for this applicant.

            </p>
            `;


        return;

    }


    communicationHistory.innerHTML =

        communications.map(
            communication =>

            `

            <div
                class="communication-history-item"
            >


                <h3>

                    ${escapeHTML(
                        communication.communication_type
                    )}

                </h3>


                ${
                    communication.scheduled_date

                    ?

                    `

                    <p>

                        <strong>
                            Scheduled:
                        </strong>

                        ${formatDateTime(
                            communication.scheduled_date
                        )}

                    </p>

                    `

                    :

                    ""

                }


                ${
                    communication.location

                    ?

                    `

                    <p>

                        <strong>
                            Location:
                        </strong>

                        ${escapeHTML(
                            communication.location
                        )}

                    </p>

                    `

                    :

                    ""

                }


                ${
                    communication.contact_method

                    ?

                    `

                    <p>

                        <strong>
                            Contact Method:
                        </strong>

                        ${escapeHTML(
                            communication.contact_method
                        )}

                    </p>

                    `

                    :

                    ""

                }


                <p>

                    <strong>
                        Contact Status:
                    </strong>

                    ${escapeHTML(
                        communication.contact_status
                        ||
                        "Not Contacted"
                    )}

                </p>


                ${
                    communication.message

                    ?

                    `

                    <p>

                        ${escapeHTML(
                            communication.message
                        )}

                    </p>

                    `

                    :

                    ""

                }


                ${
                    communication.admin_notes

                    ?

                    `

                    <p>

                        <strong>
                            Internal Notes:
                        </strong>

                        ${escapeHTML(
                            communication.admin_notes
                        )}

                    </p>

                    `

                    :

                    ""

                }


            </div>

            `

        )

        .join("");

}


/* =========================================================
   APPLICANT CHANGE
========================================================= */

communicationApplicant.addEventListener(
    "change",
    function(){

        const applicationID =
            communicationApplicant.value;


        loadCommunicationHistory(
            applicationID
        );

    }
);


/* =========================================================
   SAVE COMMUNICATION
========================================================= */

communicationForm.addEventListener(
    "submit",

    async function(event){

        event.preventDefault();


        const applicationID =
            communicationApplicant.value;


        if(!applicationID){

            showCommunicationMessage(

                "Please select an applicant.",

                "#DC3545"

            );


            return;

        }


        if(
            !communicationType.value
        ){

            showCommunicationMessage(

                "Please select a communication type.",

                "#DC3545"

            );


            return;

        }



        /* =============================================
           BUILD COMMUNICATION DATA
        ============================================= */

        const communicationData = {

            application_id:
                applicationID,


            communication_type:
                communicationType.value,


            scheduled_date:

                scheduledDate.value

                ?

                new Date(
                    scheduledDate.value
                )

                .toISOString()

                :

                null,


            location:

                communicationLocation.value
                .trim()

                ||

                null,


            message:

                communicationMessage.value
                .trim()

                ||

                null,


            contact_status:

                contactStatus.value,


            contact_method:

                contactMethod.value

                ||

                null,


            admin_notes:

                communicationAdminNotes.value
                .trim()

                ||

                null

        };



        /* =============================================
           SUBMITTING STATE
        ============================================= */

        saveCommunicationBtn.disabled =
            true;


        saveCommunicationBtn.textContent =

            "Saving...";


        showCommunicationMessage(

            "Saving communication record...",

            "#0B2341"

        );


        try{

            await addCommunication(
                communicationData
            );


            showCommunicationMessage(

                "Communication saved successfully.",

                "#198754"

            );


            /* Reset communication fields only */

            communicationType.value =
                "";


            scheduledDate.value =
                "";


            communicationLocation.value =
                "";


            contactMethod.value =
                "";


            contactStatus.value =
                "Not Contacted";


            communicationMessage.value =
                "";


            communicationAdminNotes.value =
                "";


            /* Reload history */

            await loadCommunicationHistory(
                applicationID
            );


        }
        catch(error){

            console.error(
                error
            );


            showCommunicationMessage(

                error.message
                ||
                "Unable to save communication.",

                "#DC3545"

            );

        }


        saveCommunicationBtn.disabled =
            false;


        saveCommunicationBtn.textContent =

            "Save Communication";

    }
);


/* =========================================================
   COMMUNICATION MESSAGE
========================================================= */

function showCommunicationMessage(
    message,
    color
){

    communicationMessageStatus.textContent =
        message;


    communicationMessageStatus.style.color =
        color;

}


/* =========================================================
   FORMAT DATE & TIME
========================================================= */

function formatDateTime(
    dateValue
){

    if(!dateValue){

        return "—";

    }


    return new Date(
        dateValue
    )

    .toLocaleString(
        undefined,
        {

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric",

            hour:
                "numeric",

            minute:
                "2-digit"

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
   START
========================================================= */

window.addEventListener(
    "DOMContentLoaded",

    loadApplicants
);