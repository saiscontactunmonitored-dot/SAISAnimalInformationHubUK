(function(){
"use strict";
var ROOT="/SAISAnimalInformationHubUK",path=window.location.pathname;
var base=path.indexOf(ROOT+"/")===0||path===ROOT?ROOT:"";
var route=function(p){return (base||"")+"/"+String(p||"").replace(/^\//,"");};
var el=function(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
var links={
 animals:[["Dogs","dog-information/"],["Cats","cat-information/"],["Horses","horse-information/"],["Wildlife","wildlife-information/"],["Chickens","chicken-information/"],["Birds","bird-information/"],["Rabbits","rabbit-information/"],["Rodents & small pets","rodent-information/"],["Reptiles & exotics","reptileexotic-information/"]],
 care:[["Animal Care & Training","animal-care-training/"],["Health & Safety for Pets","animal-care-training/health-safety-for-pets/"],["Training Tips & Advice","animal-care-training/training-tips-advice/"],["Fun Enrichment","animal-care-training/fun-enrichment/"],["Rescue & Settling-In Tips","animal-care-training/rescue-tips/"],["Recommended Animal Books","animal-care-training/recommended-animal-books/"]],
 resources:[["Animal Help & Resources","animal-help-resources/"],["Lost & Found Animals","animal-help-resources/lost-found-animals/"],["Contact SAIS","contact/"],["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"],["Find an animal service","https://directory.somersetanimalinformationservices.com/"],["SAIS main website","https://www.somersetanimalinformationservices.com/"]],
 articles:[["All Animal Articles","animal-articles/"],["Dogs, Wildlife & the Law","animal-articles/dogs-wildlife-law/"],["Boarding & Home Boarding Laws","animal-articles/boarding-home-boarding-laws/"],["Benefits of Hydrotherapy","animal-articles/benefits-of-hydrotherapy/"],["Keeping Animals Cool in Summer","animal-articles/keeping-animals-cool-summer/"],["Benefits of Socialisation","animal-articles/benefits-of-socialisation/"],["Training for Fun","animal-articles/training-for-fun/"]]
};
var index=[];
Object.keys(links).forEach(function(k){links[k].forEach(function(x){index.push({title:x[0],url:route(x[1]),terms:x[0].toLowerCase()});});});
index.push({title:"Find an animal service",url:"https://directory.somersetanimalinformationservices.com/",terms:"directory groomer trainer vet boarding sitter business service"});
function active(href){var clean=href.replace(/\/$/,""),cur=path.replace(/\/$/,"");return cur===clean||(clean!==base&&path.indexOf(clean+"/")===0);}
function addLink(parent,label,p,cls){var a=el("a",cls||"",label);a.href=/^https?:\\/\\//.test(p)?p:route(p);if(active(a.href))a.setAttribute("aria-current","page");parent.appendChild(a);return a;}
function makeDropdown(parent,label,items,cls){var d=el("details",cls||"sais-section-menu");var s=el("summary","",label);d.appendChild(s);var panel=el("div","sais-section-menu-panel");items.forEach(function(x){addLink(panel,x[0],x[1]);});d.appendChild(panel);parent.appendChild(d);return d;}
function makeUtility(){
 var row=el("div","sais-utility-row");
 var form=el("form","sais-search-form");form.id="siteSearch";form.setAttribute("role","search");
 var input=el("input","");input.id="searchInput";input.type="search";input.placeholder="Search animals, care topics, advice and resources…";input.setAttribute("aria-label","Search the Animal Information Hub");input.autocomplete="off";
 var button=el("button","sais-search-button","Search");button.type="submit";
 form.appendChild(el("span","sais-search-icon","⌕"));form.appendChild(input);form.appendChild(button);row.appendChild(form);
 var results=el("div","sais-search-results");results.id="searchResults";results.hidden=true;results.setAttribute("role","region");results.setAttribute("aria-label","Search results");row.appendChild(results);
 var clock=el("div","sais-datetime");clock.appendChild(el("span","sais-date-icon","▦"));var text=el("div","");var weekday=el("small","");weekday.id="weekday";text.appendChild(weekday);var date=el("strong","");date.id="dateTime";text.appendChild(date);clock.appendChild(text);row.appendChild(clock);
 return row;
}
function buildNav(){
 var shell=el("div","sais-site-shell");
 var nav=el("nav","sais-site-nav");nav.setAttribute("aria-label","Main navigation");
 var inner=el("div","sais-site-nav-inner");
 addLink(inner,"Home","");
 addLink(inner,"Animal Care & Training","animal-care-training/");
 addLink(inner,"Animal Help & Resources","animal-help-resources/");
 addLink(inner,"Animal Articles","animal-articles/");
 var spacer=el("span","sais-nav-spacer");spacer.setAttribute("aria-hidden","true");inner.appendChild(spacer);
 makeDropdown(inner,"Choose an animal",links.animals,"sais-animal-menu");
 makeDropdown(inner,"Care topics",links.care);
 makeDropdown(inner,"More resources",links.resources);
 makeDropdown(inner,"Articles",links.articles);
 nav.appendChild(inner);shell.appendChild(nav);shell.appendChild(makeUtility());
 var oldNav=Array.from(document.querySelectorAll(".nav-wrap,.unified-nav,.main-navigation,.primary-nav,body>nav,body>.nav,.nav-container,.nav"));
 oldNav=oldNav.filter(function(n){return !oldNav.some(function(o){return o!==n&&o.contains(n);});});
 var utility=document.querySelector(".utility-row");if(utility)utility.remove();
 if(oldNav.length){oldNav[0].replaceWith(shell);oldNav.slice(1).forEach(function(n){if(n.isConnected)n.remove();});}
 else{var mast=document.querySelector(".masthead,.brandrow,.brand-row,header");if(mast)mast.insertAdjacentElement("afterend",shell);else document.body.insertBefore(shell,document.body.firstChild);}
}
function search(){
 var form=document.getElementById("siteSearch"),input=document.getElementById("searchInput"),results=document.getElementById("searchResults");if(!form||!input||!results)return;
 if(form.dataset.bound==="yes")return;form.dataset.bound="yes";
 function run(){var q=input.value.trim().toLowerCase();if(!q){results.hidden=true;results.innerHTML="";return;}var words=q.split(/\s+/);var found=index.map(function(x){var hay=(x.title+" "+x.terms).toLowerCase(),score=words.reduce(function(n,w){return n+(hay.indexOf(w)>=0?1:0);},0);return {x:x,score:score};}).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,10);
 results.innerHTML="";var head=el("div","sais-search-heading",'Results for "'+q+'"');results.appendChild(head);
 if(!found.length)results.appendChild(el("p","sais-search-empty","No matching pages found. Try an animal name or a topic such as training, health, lost or boarding."));
 found.forEach(function(hit){var a=el("a","",hit.x.title);a.href=hit.x.url;results.appendChild(a);});results.hidden=false;
 }
 form.addEventListener("submit",function(e){e.preventDefault();run();});input.addEventListener("input",run);input.addEventListener("keydown",function(e){if(e.key==="Escape"){results.hidden=true;input.blur();}});
}
function clock(){var node=document.getElementById("dateTime"),day=document.getElementById("weekday");if(!node)return;var now=new Date();if(day)day.textContent=new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"Europe/London"}).format(now);node.textContent=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/London"}).format(now).replace(","," ·");}
function buildFooter(){
 var footer=el("footer","sais-site-footer"),inner=el("div","sais-footer-inner"),grid=el("div","sais-footer-grid");
 var sections=[
 ["Animal Information Hub UK","Clear, practical animal information and resources to help people make informed decisions about animal care and welfare. Powered by Somerset Animal Information Services."],
 ["Explore",null, [["Home",""],["Animal Care & Training","animal-care-training/"],["Animal Help & Resources","animal-help-resources/"],["Animal Articles","animal-articles/"],["Contact SAIS","contact/"]]],
 ["Animal information",null,links.animals],
 ["Trust & policies",null,[["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"]]]
 ];
 sections.forEach(function(s,i){var col=el("section","");col.appendChild(el(i?"h2":"h2",i?"sais-footer-heading":"sais-footer-brand",s[0]));if(s[1])col.appendChild(el("p","sais-footer-description",s[1]));if(s[2]){var list=el("div","sais-footer-links");s[2].forEach(function(x){addLink(list,x[0],x[1]);});col.appendChild(list);}grid.appendChild(col);});
 inner.appendChild(grid);var bottom=el("div","sais-footer-bottom");bottom.appendChild(el("span","","© "+new Date().getFullYear()+" Somerset Animal Information Services · General information only; not a substitute for professional advice."));footer.appendChild(inner);inner.appendChild(bottom);
 var old=Array.from(document.querySelectorAll("footer,.foot,.hub-footer"));old=old.filter(function(n){return !old.some(function(o){return o!==n&&o.contains(n);});});
 if(old.length){old[0].replaceWith(footer);old.slice(1).forEach(function(n){if(n.isConnected)n.remove();});}else document.body.appendChild(footer);
}
function menus(){
 document.addEventListener("click",function(e){var summary=e.target.closest(".sais-animal-menu>summary,.sais-section-menu>summary");if(summary){var current=summary.parentElement;document.querySelectorAll(".sais-animal-menu[open],.sais-section-menu[open]").forEach(function(d){if(d!==current)d.open=false;});}},true);
 document.addEventListener("click",function(e){if(!e.target.closest(".sais-animal-menu,.sais-section-menu"))document.querySelectorAll(".sais-animal-menu[open],.sais-section-menu[open]").forEach(function(d){d.open=false;});});
 document.addEventListener("keydown",function(e){if(e.key==="Escape")document.querySelectorAll(".sais-animal-menu[open],.sais-section-menu[open]").forEach(function(d){d.open=false;});});
}
function init(){
 var existingSkip=document.querySelector(".sais-skip-link");if(!existingSkip){var skip=el("a","sais-skip-link","Skip to main content");var main=document.querySelector("main,.main,#main-content,article");if(main){if(!main.id)main.id="main-content";skip.href="#"+main.id;}document.body.insertBefore(skip,document.body.firstChild);}
 buildNav();buildFooter();search();clock();setInterval(clock,30000);menus();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();