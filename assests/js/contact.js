//============================
// EMAILJS INITIALIZATION
//============================

emailjs.init("rkCLqh0qBH5FOCEzN");


//============================
// CONTACT FORM
//============================

const form = document.getElementById("contactForm");

const sendBtn = document.getElementById("sendBtn");

const status = document.getElementById("formStatus");


form.addEventListener("submit", function(e){

e.preventDefault();

sendEmail();

});


//============================
// SEND EMAIL
//============================

function sendEmail(){

sendBtn.disabled = true;

sendBtn.innerHTML =

'<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

status.textContent = "";


const params = {

name: document.getElementById("name").value,

email: document.getElementById("email").value,

phone: document.getElementById("phone").value,

subject: document.getElementById("subject").value,

message: document.getElementById("message").value

};


emailjs.send(

"service_hg3tg9p",

"template_1y973wc",

params

)

.then(function(){

status.textContent =

"✔ Your message has been sent successfully.";

status.className = "success";

form.reset();

})

.catch(function(error){

console.log(error);

status.textContent =

"❌ Failed to send message. Please try again.";

status.className = "error";

})

.finally(function(){

sendBtn.disabled = false;

sendBtn.innerHTML =

'<i class="fa-solid fa-paper-plane"></i> <span>Send Message</span>';

});

}