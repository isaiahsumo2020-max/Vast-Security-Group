const officers = [

{
id:"VSG-2026-001",

name:"Moses Sumo",

position:"Chief Executive Officer",

department:"Executive",

status:"Verified Active",

issueDate:"15 July 2026",

expiryDate:"31 July 2028",

photo:"/assests/images/officers/CEO.png"
},

{
id:"VSG-2026-002",

name:"Levi Sendolo",

position:"Co. CEO",

department:"Executive",

status:"Verified Active",

issueDate:"20 July 2026",

expiryDate:"20 July 2028",

photo:"/assests/images/officers/officer1.jpg"
},

{
id:"VSG-2026-003",

name:"Bequizzy N. Sumo",

position:"Security Supervisor",

department:"Operations",

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

document.getElementById("officerPhoto").src=officer.photo;

document.getElementById("officerName").textContent=officer.name;

document.getElementById("officerId").textContent=officer.id;

document.getElementById("officerPosition").textContent=officer.position;

document.getElementById("officerDepartment").textContent=officer.department;

document.getElementById("officerIssue").textContent=officer.issueDate;

document.getElementById("officerExpiry").textContent=officer.expiryDate;

document.getElementById("officerStatus").textContent=officer.status;

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