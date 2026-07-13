// Officials

const officers = [

{
id:"VSG-2026-001",

name:"Moses Sumo",

position:"Chief Executive Officer",

department:"Executive",

employment:"Full-Time",

status:"Verified Active",

issueDate:"15 July 2026",

expiryDate:"31 July 2028",

photo:"/assests/images/officers/CEO.png"
},

{
id:"VSG-2026-002",

name:"Levi B. Sendolo",

position:"Co. CEO",

department:"Executive",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/Co-CEO.png"
},

{
id:"VSG-2026-003",

name:"Isaiah N. B. Sumo",

position:"Administrictor",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/Isaiah N Sumo.jpg"
},



// Officers
{
id:"VSG-2026-0010",

name:"Elijah Paye",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/Officer Elijah.png"
},

{
id:"VSG-2026-0011",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0012",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0013",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0014",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0015",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0016",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0017",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
},
{
id:"VSG-2026-0018",

name:"Bequizzy N. Sumo",

position:"Officer",

department:"Operations",

employment:"Full-Time",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer2.jpg"
}

];




// Verification 

const searchBtn=document.getElementById("verifyBtn");

const officerInput=document.getElementById("officerID");

const resultBox=document.getElementById("resultBox");

const notFoundBox=document.getElementById("notFoundBox");

// Event Listener

searchBtn.addEventListener("click",verifyOfficer);


// verification function 
function verifyOfficer(){

const id=officerInput.value.trim().toUpperCase();

const officer=officers.find(

o=>o.id.toUpperCase()===id

);

if(officer){

showOfficer(officer);

}else{

showNotFound();

}

}



// Display result 

function showOfficer(officer){

notFoundBox.style.display="none";

resultBox.style.display="block";

resultBox.classList.add("show");

document.getElementById("officerPhoto").src=officer.photo;

document.getElementById("officerName").textContent=officer.name;

document.getElementById("officerId").textContent=officer.id;

document.getElementById("officerPosition").textContent=officer.position;

document.getElementById("officerDepartment").textContent=officer.department;

document.getElementById("officerEmployment").textContent =officer.employment;

document.getElementById("officerIssue").textContent=officer.issueDate;

document.getElementById("officerExpiry").textContent=officer.expiryDate;


const badge = document.getElementById("officerStatus");

badge.textContent = officer.status;

badge.className = "status-badge";

switch(officer.status){

    case "Verified Active":

        badge.style.background = "#198754";

        break;

    case "Suspended":

        badge.style.background = "#FFC107";

        badge.style.color = "#000";

        break;

    case "Expired":

        badge.style.background = "#DC3545";

        break;

    default:

        badge.style.background = "#6C757D";

}


const now = new Date();
document.getElementById("verifyTime").textContent =now.toLocaleString();

document.getElementById("referenceNo").textContent =
"VSG-" + Date.now();

resultBox.scrollIntoView({

behavior:"smooth"

});

}


// Officer not found 
function showNotFound(){

resultBox.style.display="none";

notFoundBox.style.display="block";

notFoundBox.scrollIntoView({

behavior:"smooth"

});

}


// Enter key suport
officerInput.addEventListener("keypress",function(e){

if(e.key==="Enter"){

verifyOfficer();

}

});