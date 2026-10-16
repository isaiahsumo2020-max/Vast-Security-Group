export function renderOfficer(officer){

    document.getElementById("officerName").textContent =
        officer.name;

    document.getElementById("officerId").textContent =
        officer.officer_id;

    document.getElementById("officerPosition").textContent =
        officer.position;

    document.getElementById("officerDepartment").textContent =
        officer.department;

    document.getElementById("officerEmployment").textContent =
        officer.employment;

    document.getElementById("officerStatus").textContent =
        officer.status;

    document.getElementById("officerIssue").textContent =
        officer.issueDate;

    document.getElementById("officerExpiry").textContent =
        officer.expiryDate;

    document.getElementById("officerPhoto").src =
        officer.photo;
}