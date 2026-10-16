const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeMenu");
const navLinks = document.getElementById("navLinks");
const overlay = document.getElementById("overlay");

function openMenu(){

    navLinks.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("menu-open");

}

function closeMenu(){

    navLinks.classList.remove("active");
    overlay.classList.remove("active");
    document.body.classList.remove("menu-open");

}

if(menuBtn && closeBtn && navLinks && overlay){

menuBtn.addEventListener("click", openMenu);

closeBtn.addEventListener("click", closeMenu);

overlay.addEventListener("click", closeMenu);

}

document.querySelectorAll(".nav-links a").forEach(link=>{

    link.addEventListener("click", closeMenu);

});
// Preload
// window.addEventListener("load",()=>{

// document.getElementById("preloader").style.opacity="0";

// setTimeout(()=>{

// document.getElementById("preloader").style.display="none";

// },600);

// });

// sticky Nav effect
window.addEventListener("scroll",()=>{

const header=document.querySelector("header");

header.classList.toggle("scrolled",window.scrollY>80);

});


// Scrool Reaveal Animation


const topBtn=document.getElementById("topBtn");

window.addEventListener("scroll",()=>{

if(!topBtn){

return;

}

if(window.scrollY>400){

topBtn.style.display="block";

}else{

topBtn.style.display="none";

}

});

if(topBtn){

topBtn.onclick=()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

};

}