import {
    getActivePositions
} from "../backend/recruitment/getPositions.js";
import { submitApplication } from "../backend/recruitment/submitApplication.js";
import { getApplicationStatus } from "../backend/recruitment/getApplicationStatus.js";
import { populateLiberiaCountySelect } from "../assests/js/liberiaCounties.js";

populateLiberiaCountySelect(document.getElementById("county"));

const recruitmentForm =
    document.getElementById(
        "recruitmentForm"
    );


const applicationMessage =
    document.getElementById(
        "applicationMessage"
    );


const submitApplicationBtn =
    document.getElementById(
        "submitApplicationBtn"
    );

const trackingForm = document.getElementById("trackingForm");
const trackingCodeInput = document.getElementById("trackingCode");
const trackingMessage = document.getElementById("trackingMessage");
const checkTrackingCodeBtn = document.getElementById("checkTrackingCodeBtn");
const recruitmentIntro = document.getElementById("recruitmentIntro");
const applicationSuccessScreen = document.getElementById("applicationSuccessScreen");
const submittedTrackingCode = document.getElementById("submittedTrackingCode");


/* =========================================================
   APPLICATION LETTER METHOD
========================================================= */

const letterMethodInputs =
    document.querySelectorAll(
        'input[name="letterMethod"]'
    );


const uploadLetterGroup =
    document.getElementById(
        "uploadLetterGroup"
    );


const typeLetterGroup =
    document.getElementById(
        "typeLetterGroup"
    );


const applicationLetterFileInput =
    document.getElementById(
        "applicationLetterFile"
    );


const applicationLetterTextInput =
    document.getElementById(
        "applicationLetterText"
    );




function updateApplicationLetterMethod(){

    const selectedMethod =
        document.querySelector(
            'input[name="letterMethod"]:checked'
        );


    if(!selectedMethod){

        return;

    }


    const isUploadMethod = selectedMethod.value === "upload";
    uploadLetterGroup.hidden = !isUploadMethod;
    typeLetterGroup.hidden = isUploadMethod;
    uploadLetterGroup.classList.toggle("is-active", isUploadMethod);
    typeLetterGroup.classList.toggle("is-active", !isUploadMethod);
    applicationLetterFileInput.required = isUploadMethod;
    applicationLetterTextInput.required = !isUploadMethod;

}
/* =========================================================
   SET INITIAL STATE
========================================================= */

updateApplicationLetterMethod();



/* =========================================================
   LISTEN FOR LETTER METHOD CHANGE
========================================================= */

letterMethodInputs.forEach(
    input => {

        input.addEventListener(
            "change",
            updateApplicationLetterMethod
        );

    }
);




/* =========================================================
   LOAD POSITIONS
========================================================= */

async function loadPositions(){

    const positionSelect =
        document.getElementById(
            "position"
        );


    try{

        const positions =
            await getActivePositions();


        positionSelect.innerHTML =

            `<option value="">
                Select position
            </option>`;


        positions.forEach(
            position => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    position.id;


                option.textContent =
                    position.title;


                positionSelect.appendChild(
                    option
                );

            }
        );


    }
    catch(error){

        console.error(
            "Unable to load recruitment positions:",
            error
        );


        positionSelect.innerHTML =

            `<option value="">
                Positions temporarily unavailable
            </option>`;

    }

}



/* =========================================================
   SUBMIT FORM
========================================================= */

recruitmentForm.addEventListener(
    "submit",
    async function(event){

        event.preventDefault();


        const fullName =
            document
                .getElementById(
                    "fullName"
                )
                .value
                .trim();


        const phone =
            document
                .getElementById(
                    "phone"
                )
                .value
                .trim();


        const email =
            document
                .getElementById(
                    "email"
                )
                .value
                .trim();


        const gender =
            document
                .getElementById(
                    "gender"
                )
                .value;


        const address =
            document
                .getElementById(
                    "address"
                )
                .value
                .trim();


        const county =
            document
                .getElementById(
                    "county"
                )
                .value
                .trim();


        const positionSelect =
            document.getElementById(
                "position"
            );


        const positionID =
            positionSelect.value;


        const positionName =

            positionSelect
                .options[
                    positionSelect.selectedIndex
                ]
                .text;


        const letterMethod =

            document
                .querySelector(
                    'input[name="letterMethod"]:checked'
                )
                .value;


        const passportPhoto =

            document
                .getElementById(
                    "passportPhoto"
                )
                .files[0];


        const cv =

            document
                .getElementById(
                    "cv"
                )
                .files[0];


        const applicationLetterFile =

            document
                .getElementById(
                    "applicationLetterFile"
                )
                .files[0];


        const letterText =

            document
                .getElementById(
                    "applicationLetterText"
                )
                .value
                .trim();


        const supportingDocuments =

            Array.from(

                document
                    .getElementById(
                        "supportingDocuments"
                    )
                    .files

            );



        /* =============================================
           APPLICATION LETTER VALIDATION
        ============================================= */

        if(

            letterMethod === "upload"

            &&

            !applicationLetterFile

        ){

            applicationMessage.textContent =

                "Please upload your application letter.";


            applicationMessage.style.color =
                "#DC3545";


            return;

        }


        if(

            letterMethod === "text"

            &&

            !letterText

        ){

            applicationMessage.textContent =

                "Please type your application letter.";


            applicationMessage.style.color =
                "#DC3545";


            return;

        }



        /* =============================================
           SUBMITTING STATE
        ============================================= */

        submitApplicationBtn.disabled =
            true;


        submitApplicationBtn.textContent =

            "Submitting Application...";


        applicationMessage.textContent =

            "Please wait while your application is being submitted.";


        applicationMessage.style.color =
            "#0B2341";



        try{


            const application = await submitApplication({

                fullName,

                phone,

                email,

                gender,

                address,

                county,

                positionID,

                positionName,

                letterMethod,

                letterText,

                passportPhoto,

                cv,

                applicationLetterFile,

                supportingDocuments

            });



            submittedTrackingCode.textContent = application.trackingCode;
            recruitmentForm.hidden = true;
            recruitmentIntro.hidden = true;
            applicationSuccessScreen.hidden = false;
            document.getElementById("applicationSuccessHeading").focus();



        }catch(error){


            console.error(
                error
            );


            applicationMessage.textContent =

                error.message ||

                "Unable to submit your application. Please try again.";


            applicationMessage.style.color =
                "#DC3545";

        }


        submitApplicationBtn.disabled =
            false;


        submitApplicationBtn.textContent =

            "Submit Application";

    }
);

trackingForm.addEventListener("submit", async event => {
    event.preventDefault();
    checkTrackingCodeBtn.disabled = true;
    trackingMessage.textContent = "Checking your application status...";
    trackingMessage.classList.remove("is-error");

    try {
        const application = await getApplicationStatus(
            trackingCodeInput.value.trim()
        );

        trackingMessage.textContent = application
            ? `Your application status: ${application.application_status}.`
            : "No application was found for that tracking code. Check the code and try again.";
    } catch (error) {
        console.error("Unable to check application status:", error);
        trackingMessage.textContent =
            "Unable to check your application status right now. Please try again later.";
        trackingMessage.classList.add("is-error");
    } finally {
        checkTrackingCodeBtn.disabled = false;
    }
});



/* =========================================================
   START
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    loadPositions
);