(function(){
"use strict";
var path=window.location.pathname;
var base=path.indexOf("/SAISAnimalInformationHubUK/")===0?"/SAISAnimalInformationHubUK":"";
var route=function(p){return base+"/"+p.replace(/^\//,"");};
var items=[
 {label:"Home",href:route(""),key:"home"},
 {label:"Animal Care & Training",href:route("animal-care-training/"),key:"care"},
 {label:"Animal Help & Resources",href:route("animal-help-resources/"),key:"resources"},
 {label:"Animal Articles",href:route("animal-articles/"),key:"articles"}
];
var animals=[
 ["Dogs","dog-information/","dog-information"],["Cats","cat-information/","cat-information"],
 ["Horses","horse-information/","horse-information"],["Wildlife","wildlife-information/","wildlife-information"],
 ["Chickens","chicken-information/","chicken-information"],["Rabbits","rabbit-information/","rabbit-information"],
 ["Rodents","rodent-information/","rodent-information"],["Reptiles & Exotics","reptileexotic-information/","reptileexotic-information"],
 ["Birds","bird-information/","bird-information"]
];
function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function active(href){var clean=href.replace(/\/$/,"");return path.replace(/\/$/,"")===clean || (clean!==base && path.indexOf(clean+"/")===0);}
function buildNav(){
 var shell=el("div","sais-site-nav");shell.setAttribute("role","navigation");shell.setAttribute("aria-label","Main navigation");
 var inner=el("div","sais-site-nav-inner");
 items.forEach(function(item){var a=el("a","sais-nav-link"+(item.key==="home"?" sais-nav-home":""));a.href=item.href;a.textContent=item.label;if(active(item.href))a.setAttribute("aria-current","page");inner.appendChild(a);});
 var spacer=el("span","sais-nav-spacer");spacer.setAttribute("aria-hidden","true");inner.appendChild(spacer);
 var details=el("details","sais-animal-menu");var summary=el("summary","", "Choose an animal");summary.setAttribute("aria-label","Choose an animal information page");details.appendChild(summary);
 var panel=el("div","sais-animal-menu-panel");
 animals.forEach(function(animal){var a=el("a","",animal[0]);a.href=route(animal[1]);if(active(route(animal[1])))a.setAttribute("aria-current","page");panel.appendChild(a);});
 details.appendChild(panel);inner.appendChild(details);shell.appendChild(inner);
 var old=Array.from(document.querySelectorAll(".nav-wrap, body > nav, body > .nav, .nav-container, .nav"));
 old=old.filter(function(node){return !old.some(function(other){return other!==node&&other.contains(node);});});
 var target=old[0];
 if(target){target.replaceWith(shell);old.slice(1).forEach(function(node){if(node.isConnected)node.remove();});}
 else {var mast=document.querySelector(".masthead, .brandrow, .brand-row, .brandrow");if(mast){var anchor=mast.closest(".masthead")||mast.closest("header")||mast;shell.insertAdjacentElement("afterend",anchor);anchor.insertAdjacentElement("afterend",shell);}else{var announcement=document.querySelector(".announcement");if(announcement)announcement.insertAdjacentElement("afterend",shell);else document.body.insertBefore(shell,document.body.firstChild);}}
}
function buildFooter(){
 var footer=el("footer","sais-site-footer");var inner=el("div","sais-footer-inner");var grid=el("div","sais-footer-grid");
 var brand=el("section","");var title=el("h2","sais-footer-brand","Animal Information Hub UK");brand.appendChild(title);
 brand.appendChild(el("p","sais-footer-description","Clear, practical animal information and resources to help people make informed decisions about animal care and welfare. Powered by Somerset Animal Information Services (SAIS)."));
 var quick=el("section","");quick.appendChild(el("h2","sais-footer-heading","Explore the Hub"));var q=el("div","sais-footer-links");
 [["Home",route("")],["Animal Care & Training",route("animal-care-training/")],["Animal Help & Resources",route("animal-help-resources/")],["Animal Articles",route("animal-articles/")]].forEach(function(x){var a=el("a","",x[0]);a.href=x[1];q.appendChild(a);});quick.appendChild(q);
 var trust=el("section","");trust.appendChild(el("h2","sais-footer-heading","Information & policies"));var t=el("div","sais-footer-links");
 [["Sources & Editorial Standards",route("sources-and-editorial-standards/")],["Accessibility",route("accessibility/")],["Privacy",route("privacy/")],["Terms & Disclaimer",route("terms-and-disclaimer/")]].forEach(function(x){var a=el("a","",x[0]);a.href=x[1];t.appendChild(a);});trust.appendChild(t);
 grid.appendChild(brand);grid.appendChild(quick);grid.appendChild(trust);inner.appendChild(grid);
 var bottom=el("div","sais-footer-bottom");bottom.appendChild(el("span","","© "+new Date().getFullYear()+" Somerset Animal Information Services. Information is provided for general guidance and does not replace advice from a qualified veterinary or other relevant professional."));
 var top=el("a","sais-back-top","↑ Back to top");top.href="#top";top.addEventListener("click",function(e){e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});history.replaceState(null,"",location.pathname+location.search+"#top");});bottom.appendChild(top);inner.appendChild(bottom);footer.appendChild(inner);
 var old=Array.from(document.querySelectorAll("footer, .foot"));old=old.filter(function(node){return !old.some(function(other){return other!==node&&other.contains(node);});});
 if(old.length){old[0].replaceWith(footer);old.slice(1).forEach(function(n){if(n.isConnected)n.remove();});}else{document.body.appendChild(footer);}
}
function addSkipLink(){if(document.querySelector(".sais-skip-link"))return;var a=el("a","sais-skip-link","Skip to main content");a.href="#main-content";document.body.insertBefore(a,document.body.firstChild);var main=document.querySelector("main, .main, #main, article");if(main&&!main.id)main.id="main-content";}
function loadStyles(){if(document.querySelector('link[data-sais-shell-css]'))return;var l=document.createElement("link");l.rel="stylesheet";l.href="https://saiscontactunmonitored-dot.github.io/SAISAnimalInformationHubUK/assets/site-shell.css";l.setAttribute("data-sais-shell-css","");document.head.appendChild(l);}
function init(){loadStyles();addSkipLink();buildNav();buildFooter();document.addEventListener("click",function(e){var link=e.target.closest(".sais-animal-menu-panel a");if(link){var d=link.closest("details");if(d)d.open=false;}});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();