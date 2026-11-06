(function(){
"use strict";
var ROOT="/SAISAnimalInformationHubUK";
var path=window.location.pathname;
var base=(path===ROOT||path.indexOf(ROOT+"/")===0)?ROOT:"";
var route=function(p){return (base||"")+"/"+String(p||"").replace(/^\//,"");};
var make=function(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
var groups={
 animals:[["Dogs","dog-information/"],["Cats","cat-information/"],["Horses","horse-information/"],["Wildlife","wildlife-information/"],["Chickens","chicken-information/"],["Birds","bird-information/"],["Rabbits","rabbit-information/"],["Rodents & small pets","rodent-information/"],["Reptiles & exotics","reptileexotic-information/"]],
 care:[["Animal Care & Training","animal-care-training/"],["Health & Safety for Pets","animal-care-training/health-safety-for-pets/"],["Training Tips & Advice","animal-care-training/training-tips-advice/"],["Fun Enrichment","animal-care-training/fun-enrichment/"],["Rescue & Settling-In Tips","animal-care-training/rescue-tips/"],["Recommended Animal Books","animal-care-training/recommended-animal-books/"]],
 resources:[["Animal Help & Resources","animal-help-resources/"],["Lost & Found Animals","animal-help-resources/lost-found-animals/"],["Contact SAIS","contact/"],["Find an animal service","https://directory.somersetanimalinformationservices.com/"],["SAIS main website","https://somersetanimalinformationservices.com/"],["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"]],
 articles:[["All Animal Articles","animal-articles/"],["Dogs, Wildlife & the Law","animal-articles/dogs-wildlife-law/"],["Boarding & Home Boarding Laws","animal-articles/boarding-home-boarding-laws/"],["Benefits of Hydrotherapy","animal-articles/benefits-of-hydrotherapy/"],["Keeping Animals Cool in Summer","animal-articles/keeping-animals-cool-summer/"],["Benefits of Socialisation","animal-articles/benefits-of-socialisation/"],["Training for Fun","animal-articles/training-for-fun/"]]
};
var index=[];
Object.keys(groups).forEach(function(k){groups[k].forEach(function(x){index.push({name:x[0],href:/^https?:/.test(x[1])?x[1]:route(x[1]),terms:x[0].toLowerCase()});});});
index.push({name:"Animal Information Hub UK home",href:route(""),terms:"home start"});
function isCurrent(href){if(/^https?:/.test(href))return false;var a=href.replace(/\/$/,""),b=path.replace(/\/$/,"");return a===b||(a!==base&&path.indexOf(a+"/")===0);}
function link(parent,label,target){var a=make("a","",label);a.href=/^https?:/.test(target)?target:route(target);if(isCurrent(a.href))a.setAttribute("aria-current","page");parent.appendChild(a);return a;}
function dropdown(parent,label,items){var d=make("details","sais-menu"),s=make("summary","",label);d.appendChild(s);var panel=make("div","sais-menu-panel");items.forEach(function(item){link(panel,item[0],item[1]);});d.appendChild(panel);parent.appendChild(d);}
function loadStyles(){if(!document.querySelector('link[data-sais-shell-css]')){var l=make("link");l.rel="stylesheet";l.href=route("assets/site-shell.css");l.setAttribute("data-sais-shell-css","");document.head.appendChild(l);}if(!document.querySelector('link[data-sais-redesign-css]')){var r=make("link");r.rel="stylesheet";r.href=route("assets/css/redesign-2026.css");r.setAttribute("data-sais-redesign-css","");document.head.appendChild(r);}}
function removeLegacy(){
 Array.from(document.querySelectorAll(".nav-wrap,.nav-inner,.unified-nav,.main-navigation,.primary-nav,.nav-container,.utility-row,.search-form,.search-results")).forEach(function(n){if(n.isConnected)n.remove();});
 Array.from(document.querySelectorAll("nav")).forEach(function(n){if(n.isConnected)n.remove();});
}
function buildShell(){
 removeLegacy();
 var shell=make("section","sais-shell");shell.setAttribute("aria-label","Site navigation");
 var nav=make("nav","sais-navigation");nav.setAttribute("aria-label","Main navigation");
 var inner=make("div","sais-navigation-inner");
 link(inner,"Home","");
 link(inner,"Animal Care & Training","animal-care-training/");
 link(inner,"Animal Help & Resources","animal-help-resources/");
 link(inner,"Animal Articles","animal-articles/");
 var spacer=make("span","sais-spacer");spacer.setAttribute("aria-hidden","true");inner.appendChild(spacer);
 dropdown(inner,"Choose an animal",groups.animals);
 dropdown(inner,"Care topics",groups.care);
 dropdown(inner,"More resources",groups.resources);
 dropdown(inner,"Articles",groups.articles);
 nav.appendChild(inner);
 var menuButton=make("button","sais-mobile-menu-button","☰  Menu");menuButton.type="button";menuButton.setAttribute("aria-controls","sais-mobile-drawer");menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Open site menu");nav.insertBefore(menuButton,inner);
 var backdrop=make("div","sais-drawer-backdrop");backdrop.id="sais-drawer-backdrop";backdrop.hidden=true;
 var drawer=make("aside","sais-mobile-drawer");drawer.id="sais-mobile-drawer";drawer.setAttribute("aria-label","Site menu");drawer.setAttribute("aria-hidden","true");drawer.inert=true;
 var drawerHead=make("div","sais-drawer-head");drawerHead.appendChild(make("strong","","Explore the Hub"));
 var close=make("button","sais-drawer-close","×");close.type="button";close.setAttribute("aria-label","Close site menu");drawerHead.appendChild(close);drawer.appendChild(drawerHead);
 var drawerBody=make("div","sais-drawer-body");
 link(drawerBody,"Home","");
 link(drawerBody,"Animal Care & Training","animal-care-training/");
 link(drawerBody,"Animal Help & Resources","animal-help-resources/");
 link(drawerBody,"Animal Articles","animal-articles/");
 [["Choose an animal",groups.animals],["Care topics",groups.care],["More resources",groups.resources],["Articles",groups.articles]].forEach(function(group){var d=make("details","sais-drawer-group");var summary=make("summary","",group[0]);d.appendChild(summary);var list=make("div","sais-drawer-links");group[1].forEach(function(item){link(list,item[0],item[1]);});d.appendChild(list);drawerBody.appendChild(d);});
 drawer.appendChild(drawerBody);shell.appendChild(nav);shell.appendChild(backdrop);shell.appendChild(drawer);
 function setDrawer(open){drawer.classList.toggle("is-open",open);backdrop.hidden=!open;drawer.setAttribute("aria-hidden",String(!open));drawer.inert=!open;menuButton.setAttribute("aria-expanded",String(open));menuButton.setAttribute("aria-label",open?"Close site menu":"Open site menu");document.body.classList.toggle("sais-drawer-open",open);if(open)close.focus();else menuButton.focus();}
 menuButton.addEventListener("click",function(){setDrawer(!drawer.classList.contains("is-open"));});
 close.addEventListener("click",function(){setDrawer(false);});
 backdrop.addEventListener("click",function(){setDrawer(false);});
 drawer.addEventListener("click",function(e){if(e.target.closest("a"))setDrawer(false);});
 document.addEventListener("keydown",function(e){if(!drawer.classList.contains("is-open"))return;if(e.key==="Escape"){e.preventDefault();setDrawer(false);return;}if(e.key==="Tab"){var focusables=Array.from(drawer.querySelectorAll("a[href],button:not([disabled]),summary,[tabindex]:not([tabindex=\"-1\"])")).filter(function(n){return !n.closest("[hidden]")&&n.offsetParent!==null;});if(!focusables.length)return;var first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});window.addEventListener("resize",function(){if(window.innerWidth>1050&&drawer.classList.contains("is-open"))setDrawer(false);});
 var tools=make("div","sais-tools");
 var form=make("form","sais-search");form.setAttribute("role","search");form.id="siteSearch";
 var input=make("input");input.type="search";input.id="searchInput";input.placeholder="Search animals, care topics, advice and resources";input.setAttribute("aria-label","Search the Animal Information Hub");input.autocomplete="off";
 var submit=make("button","","Search");submit.type="submit";
 form.appendChild(input);form.appendChild(submit);tools.appendChild(form);
 var results=make("div","sais-results");results.id="searchResults";results.hidden=true;results.setAttribute("aria-live","polite");tools.appendChild(results);
 var date=make("div","sais-clock");date.innerHTML='<span class="sais-clock-icon" aria-hidden="true">▦</span><span><small id="weekday"></small><strong id="dateTime"></strong></span>';tools.appendChild(date);
 shell.appendChild(tools);
 var mast=document.querySelector(".masthead");
 if(mast)mast.insertAdjacentElement("afterend",shell);else document.body.insertBefore(shell,document.body.firstChild);
}
function buildFooter(){
 Array.from(document.querySelectorAll("footer,.hub-footer,.foot")).forEach(function(n){if(n.isConnected)n.remove();});
 var f=make("footer","sais-footer"),wrap=make("div","sais-footer-inner"),grid=make("div","sais-footer-grid");
 var brand=make("section","");brand.appendChild(make("h2","","Animal Information Hub UK"));brand.appendChild(make("p","","Clear, practical animal information and resources to help people make informed decisions about animal care and welfare. Powered by Somerset Animal Information Services."));
 var explore=make("section","");explore.appendChild(make("h2","","Explore"));[["Home",""],["Animal Care & Training","animal-care-training/"],["Animal Help & Resources","animal-help-resources/"],["Animal Articles","animal-articles/"],["Contact SAIS","contact/"]].forEach(function(x){link(explore,x[0],x[1]);});
 var animal=make("section","");animal.appendChild(make("h2","","Animal information"));groups.animals.forEach(function(x){link(animal,x[0],x[1]);});
 var policy=make("section","");policy.appendChild(make("h2","","Trust & policies"));[["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"]].forEach(function(x){link(policy,x[0],x[1]);});
 [brand,explore,animal,policy].forEach(function(x){grid.appendChild(x);});wrap.appendChild(grid);
 var bottom=make("div","sais-footer-bottom","© "+new Date().getFullYear()+" Somerset Animal Information Services · General information only; not a substitute for professional advice.");wrap.appendChild(bottom);f.appendChild(wrap);document.body.appendChild(f);
}
function bindSearch(){var form=document.getElementById("siteSearch"),input=document.getElementById("searchInput"),out=document.getElementById("searchResults");if(!form||!input||!out)return;
 function run(){var q=input.value.trim().toLowerCase();out.replaceChildren();if(!q){out.hidden=true;return;}var words=q.split(/\s+/);var hits=index.map(function(x){var hay=(x.name+" "+x.terms).toLowerCase();return {x:x,score:words.filter(function(w){return hay.indexOf(w)>=0;}).length};}).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,10);if(!hits.length)out.appendChild(make("p","","No matching pages found. Try an animal name or a topic such as training, health or lost animals."));hits.forEach(function(hit){var a=make("a","",hit.x.name);a.href=hit.x.href;out.appendChild(a);});out.hidden=false;}
 form.addEventListener("submit",function(e){e.preventDefault();run();});input.addEventListener("input",run);input.addEventListener("keydown",function(e){if(e.key==="Escape"){out.hidden=true;input.blur();}});
}
function bindMenus(){document.addEventListener("click",function(e){var current=e.target.closest(".sais-menu");document.querySelectorAll(".sais-menu[open]").forEach(function(d){if(d!==current)d.open=false;});if(!current)document.querySelectorAll(".sais-menu[open]").forEach(function(d){d.open=false;});});document.addEventListener("keydown",function(e){if(e.key==="Escape")document.querySelectorAll(".sais-menu[open]").forEach(function(d){d.open=false;});});}
function updateClock(){var day=document.getElementById("weekday"),date=document.getElementById("dateTime");if(!date)return;var now=new Date();day.textContent=new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"Europe/London"}).format(now);date.textContent=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/London"}).format(now).replace(","," ·");}
function init(){loadStyles();var skip=document.querySelector(".skip-link,.sais-skip-link");if(skip)skip.href="#main-content";else{skip=make("a","sais-skip-link","Skip to main content");skip.href="#main-content";document.body.insertBefore(skip,document.body.firstChild);}var main=document.querySelector("main");if(main&&!main.id)main.id="main-content";buildShell();buildFooter();bindSearch();bindMenus();updateClock();setInterval(updateClock,30000);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();