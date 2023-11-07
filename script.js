let words = document.querySelectorAll(".word");
words.forEach((word)=>{
    let letters = word.textContent.split("");
    word.textContent="";
    letters.forEach((letter)=>{
        let span = document.createElement("span");
        span.textContent = letter;
        span.className = "letter";
        word.append(span);

    });


});

let currrentWordIndex = 0;
let maxWordIndex = words.length -1; 

// active menu //////////////////////////
let menuLi = document.querySelectorAll('header ul li a');
let section =  document.querySelectorAll('section');


function activeMenu(){
    let len =  section.length;
    while(--len && window.scrollY + 97 < section[len].offsetTop){}
    menuLi.forEach(sec => sec.classList.remove("active"));
    menuLi[len].classList.add("active");

}

activeMenu();
window.addEventListener("scroll", activeMenu);



// stick navbar //////////////////////////////////
const header = document.querySelector("header")
window.addEventListener("scroll", function(){
    header.classList.toggle("sticky", window.scrollY > 50)
})


// toggle icon navbar ///////////////////////
let menuIcon = document.querySelector("#menu-icon");
let navlist = document.querySelector(".navlist");

menuIcon.onclick = ()=>{
    menuIcon.classList.toggle("bx-x");
    navlist.classList.toggle("open");

}

menuIcon.onscroll = ()=>{
    menuIcon.classList.remove("bx-x");
    navlist.classList.remove("open");
    
}

