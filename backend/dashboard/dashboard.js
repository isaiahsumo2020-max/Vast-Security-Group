// import { getOfficers } from "../officers/getOfficers.js";
// import { addOfficer } from "../officers/addOfficer.js";
// import { editOfficer } from "../officers/editOfficer.js";
// import { deleteOfficer } from "../officers/deleteOfficer.js";


// /* ==========================================
//    DASHBOARD OFFICER DATA
// ========================================== */

// let officers = [];


// /* ==========================================
//    LOAD OFFICERS
// ========================================== */

// export async function loadDashboardOfficers() {

//     try {

//         officers = await getOfficers();

//         console.log(
//             "✔ Officers loaded:",
//             officers
//         );

//         return officers;

//     } catch (error) {

//         console.error(
//             "❌ Could not load officers:",
//             error
//         );

//         throw error;
//     }
// }


// /* ==========================================
//    ADD OFFICER
// ========================================== */

// export async function createOfficer(
//     officerData,
//     photoFile = null
// ) {

//     try {

//         const officer = await addOfficer(
//             officerData,
//             photoFile
//         );

//         /* Add newly-created officer
//            to current dashboard data */

//         officers.push(officer);

//         console.log(
//             "✔ Officer added:",
//             officer
//         );

//         return officer;

//     } catch (error) {

//         console.error(
//             "❌ Could not add officer:",
//             error
//         );

//         throw error;
//     }
// }


// /* ==========================================
//    UPDATE OFFICER
// ========================================== */

// export async function updateOfficer(
//     officerID,
//     officerData,
//     photoFile = null
// ) {

//     try {

//         const updatedOfficer =
//             await editOfficer(
//                 officerID,
//                 officerData,
//                 photoFile
//             );


//         /* Update local dashboard data */

//         officers =
//             officers.map(officer => {

//                 if (
//                     officer.officer_id === officerID
//                 ) {

//                     return updatedOfficer;

//                 }

//                 return officer;

//             });


//         console.log(
//             "✔ Officer updated:",
//             updatedOfficer
//         );


//         return updatedOfficer;

//     } catch (error) {

//         console.error(
//             "❌ Could not update officer:",
//             error
//         );

//         throw error;
//     }
// }


// /* ==========================================
//    REMOVE OFFICER
// ========================================== */

// export async function removeOfficer(
//     officerID
// ) {

//     try {

//         const result =
//             await deleteOfficer(
//                 officerID
//             );


//         /* Remove from local dashboard */

//         officers =
//             officers.filter(
//                 officer =>
//                     officer.officer_id !== officerID
//             );


//         console.log(
//             "✔ Officer removed:",
//             result
//         );


//         return result;

//     } catch (error) {

//         console.error(
//             "❌ Could not delete officer:",
//             error
//         );

//         throw error;
//     }
// }


// /* ==========================================
//    GET CURRENT OFFICERS
// ========================================== */

// export function getDashboardOfficers() {

//     return officers;

// }


// /* ==========================================
//    INITIALIZE DASHBOARD
// ========================================== */

// window.addEventListener(
//     "DOMContentLoaded",
//     async () => {

//         try {

//             await loadDashboardOfficers();

//             console.log(
//                 "✔ VAST Officer Dashboard Ready"
//             );

//         } catch (error) {

//             console.error(
//                 "❌ Dashboard initialization failed."
//             );

//         }

//     }
// );