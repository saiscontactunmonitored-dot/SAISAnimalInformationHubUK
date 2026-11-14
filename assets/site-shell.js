(function(){
"use strict";
var ROOT="/SAISAnimalInformationHubUK";
var path=window.location.pathname;
var base=(path===ROOT||path.indexOf(ROOT+"/")===0)?ROOT:"";
var route=function(p){return (base||"")+"/"+String(p||"").replace(/^\//,"");};
var make=function(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
var groups={
 animals:[["Dogs","dog-information/"],["Cats","cat-information/"],["Horses","horse-information/"],["Wildlife","wildlife-information/"],["Chickens","chicken-information/"],["Birds","bird-information/"],["Rabbits","rabbit-information/"],["Rodents & small pets","rodent-information/"],["Reptiles & exotics","reptileexotic-information/"]],
 care:[["Animal Care & Training","animal-care-training/"],["Health & Safety for Pets","animal-care-training/health-safety-for-pets/"],["Training Tips & Advice","animal-care-training/training-tips-advice/"],["Fun Enrichment","animal-care-training/fun-enrichment/"],["Recommended Animal Books","animal-care-training/recommended-animal-books/"]],
 resources:[["Animal Help & Resources","animal-help-resources/"],["Rescue Tips","animal-help-resources/rescue-tips/"],["Lost & Found Animals","animal-help-resources/lost-found-animals/"],["Contact SAIS","contact/"],["Find an animal service","https://directory.somersetanimalinformationservices.com/"],["SAIS main website","https://www.somersetanimalinformationservices.com/"],["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"]],
 articles:[["All Animal Articles","animal-articles/"],["Dogs, Wildlife & the Law","animal-articles/dogs-wildlife-law/"],["Boarding & Home Boarding Laws","animal-articles/boarding-home-boarding-laws/"],["Benefits of Hydrotherapy","animal-articles/benefits-of-hydrotherapy/"],["Keeping Animals Cool in Summer","animal-articles/keeping-animals-cool-summer/"],["Benefits of Socialisation","animal-articles/benefits-of-socialisation/"],["Training for Fun","animal-articles/training-for-fun/"]]
};
var index=[];
Object.keys(groups).forEach(function(k){groups[k].forEach(function(x){index.push({name:x[0],href:/^https?:/.test(x[1])?x[1]:route(x[1]),terms:x[0].toLowerCase()});});});
index.push({name:"Animal Information Hub UK home",href:route(""),terms:"home start"});
function isCurrent(href){if(/^https?:/.test(href)&&href.indexOf(window.location.origin)!==0)return false;var a=String(href||"");if(a.indexOf(window.location.origin)===0)a=a.slice(window.location.origin.length);a=a.split(/[?#]/)[0].replace(/\/+$/,"");var b=path.split(/[?#]/)[0].replace(/\/+$/,"");return a===b||(a!==base&&b.indexOf(a+"/")===0);}
function link(parent,label,target){var a=make("a","",label);a.href=/^https?:/.test(target)?target:route(target);if(isCurrent(a.href))a.setAttribute("aria-current","page");parent.appendChild(a);return a;}
function dropdown(parent,label,items){var d=make("details","sais-menu"),s=make("summary","",label);d.appendChild(s);var panel=make("div","sais-menu-panel");items.forEach(function(item){link(panel,item[0],item[1]);});if(panel.querySelector('[aria-current="page"]')){d.classList.add("is-active");s.setAttribute("aria-label",label+", contains the current page");}d.appendChild(panel);parent.appendChild(d);}
function loadStyles(){var appleCap=document.querySelector('meta[name="apple-mobile-web-app-capable"]');if(!appleCap){appleCap=make("meta");appleCap.name="apple-mobile-web-app-capable";appleCap.content="yes";document.head.appendChild(appleCap);}var appleStatus=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(!appleStatus){appleStatus=make("meta");appleStatus.name="apple-mobile-web-app-status-bar-style";appleStatus.content="default";document.head.appendChild(appleStatus);}if(!document.querySelector('link[rel="apple-touch-icon"]')){var appleIcon=make("link");appleIcon.rel="apple-touch-icon";appleIcon.href=route("info-logo.png");document.head.appendChild(appleIcon);}if(!document.querySelector('link[data-sais-shell-css]')){var l=make("link");l.rel="stylesheet";l.href=route("assets/site-shell.css");l.setAttribute("data-sais-shell-css","");document.head.appendChild(l);}if(!document.querySelector('link[data-sais-redesign-css]')){var r=make("link");r.rel="stylesheet";r.href=route("assets/css/redesign-2026.css");r.setAttribute("data-sais-redesign-css","");document.head.appendChild(r);}if(!document.querySelector('link[data-sais-launch-polish-css]')){var p=make("link");p.rel="stylesheet";p.href=route("assets/css/launch-polish.css");p.setAttribute("data-sais-launch-polish-css","");document.head.appendChild(p);}if(!document.querySelector('link[data-sais-navigation-rebuild-css]')){var n=make("link");n.rel="stylesheet";n.href=route("assets/css/navigation-rebuild-2026.css");n.setAttribute("data-sais-navigation-rebuild-css","");document.head.appendChild(n);}}
function removeLegacy(){
 Array.from(document.querySelectorAll(".nav-wrap,.nav-inner,.unified-nav,.main-navigation,.primary-nav,.nav-container,.utility-row,.search-form,.search-results,.accessibility-widget,.back-to-top")).forEach(function(n){if(n.isConnected)n.remove();});
 Array.from(document.querySelectorAll("nav")).forEach(function(n){if(n.isConnected)n.remove();});
}
function buildShell(){
 var announcement=document.querySelector(".announcement");
 var mast=document.querySelector(".masthead");
 var taglineText=announcement?announcement.textContent.replace(/\\s+/g," ").trim():"Practical animal information. Clear guidance. A better starting point for animal care.";
 removeLegacy();

 var shell=make("section","sais-shell");
 shell.setAttribute("aria-label","Animal Information Hub UK site header");

 // Top header: date/time on the left, Hub identity in the centre, search on the right.
 var top=make("div","sais-header-top");
 var clockPanel=make("div","sais-header-clock-panel");
 var date=make("div","sais-clock");
 date.innerHTML='<span class="sais-clock-icon" aria-hidden="true">▦</span><span class="sais-clock-copy"><small class="sais-clock-location">London, UK</small><small id="weekday"></small><strong id="dateTime"></strong></span>';
 clockPanel.appendChild(date);

 var brand=make("a","sais-header-brand");
 brand.href=route("");
 brand.setAttribute("aria-label","Animal Information Hub UK home");
 var brandMain=make("span","sais-header-brand-main");
 var logo=make("img","sais-header-logo");
 logo.src=route("info-logo.png");
 logo.alt="";
 logo.width=58;
 logo.height=58;
 logo.decoding="async";
 var brandCopy=make("span","sais-header-brand-copy");
 brandCopy.appendChild(make("strong","","Animal Information Hub UK"));
 var powered=make("small","");powered.innerHTML='<span aria-hidden="true">●</span> Powered by SAIS';
 brandCopy.appendChild(powered);
 brandMain.appendChild(logo);
 brandMain.appendChild(brandCopy);
 brand.appendChild(brandMain);
 var credit=make("span","sais-header-brand-credit");
 credit.appendChild(document.createTextNode("An information service from"));
 credit.appendChild(make("strong","","Somerset Animal Information Services"));
 brand.appendChild(credit);

 var searchPanel=make("div","sais-header-search-panel");
 var form=make("form","sais-search");
 form.setAttribute("role","search");
 form.id="siteSearch";
 var input=make("input");
 input.type="search";
 input.id="searchInput";
 input.placeholder="Search animals, care topics, advice and resources";
 input.setAttribute("aria-label","Search the Animal Information Hub");
 input.autocomplete="off";
 var submit=make("button","","Search");
 submit.type="submit";
 form.appendChild(input);
 form.appendChild(submit);
 var results=make("div","sais-results");
 results.id="searchResults";
 results.hidden=true;
 results.setAttribute("aria-live","polite");
 searchPanel.appendChild(form);
 searchPanel.appendChild(results);

 top.appendChild(clockPanel);
 top.appendChild(brand);
 top.appendChild(searchPanel);

 // Primary desktop navigation and the existing responsive hamburger drawer.
 var nav=make("nav","sais-navigation");
 nav.setAttribute("aria-label","Main navigation");
 var inner=make("div","sais-navigation-inner");
 link(inner,"Home","");
 link(inner,"Animal Care & Training","animal-care-training/");
 link(inner,"Animal Help & Resources","animal-help-resources/");
 link(inner,"Animal Articles","animal-articles/");
 dropdown(inner,"Choose an animal",groups.animals);
 dropdown(inner,"Care topics",groups.care.slice(1));
 dropdown(inner,"More resources",groups.resources.slice(1));
 dropdown(inner,"Articles",groups.articles.slice(1));
 var desktopDonate=make("button","sais-donate-button sais-donate-button--desktop","Donate");
 desktopDonate.type="button";
 desktopDonate.setAttribute("aria-haspopup","dialog");
 desktopDonate.setAttribute("aria-label","Donate to support Somerset Animal Information Services");
 Array.from(inner.querySelectorAll(".sais-menu")).forEach(function(menu,i){if(i>=2)menu.classList.add("sais-menu--right");});
 inner.appendChild(desktopDonate);
 nav.appendChild(inner);

 var menuButton=make("button","sais-mobile-menu-button");
 menuButton.innerHTML='<span class="sais-hamburger-icon" aria-hidden="true"><span></span></span><span class="sais-menu-button-label">Menu</span>';
 menuButton.type="button";
 menuButton.setAttribute("aria-controls","sais-mobile-drawer");
 menuButton.setAttribute("aria-expanded","false");
 menuButton.setAttribute("aria-label","Open site menu");
 nav.insertBefore(menuButton,inner);

 var tagline=make("div","sais-header-tagline",taglineText);
 tagline.setAttribute("aria-label","Site strapline");

 var backdrop=make("div","sais-drawer-backdrop");
 backdrop.id="sais-drawer-backdrop";
 backdrop.hidden=true;
 var drawer=make("aside","sais-mobile-drawer");
 drawer.id="sais-mobile-drawer";
 drawer.setAttribute("role","dialog");
 drawer.setAttribute("aria-modal","true");
 drawer.setAttribute("aria-label","Site menu");
 drawer.setAttribute("aria-hidden","true");
 drawer.inert=true;
 var drawerHead=make("div","sais-drawer-head");
 var drawerTitle=make("strong","","Explore the Hub");
 drawerTitle.id="sais-drawer-title";
 drawer.setAttribute("aria-labelledby","sais-drawer-title");
 drawerHead.appendChild(drawerTitle);
 var close=make("button","sais-drawer-close","×");
 close.type="button";
 close.setAttribute("aria-label","Close site menu");
 drawerHead.appendChild(close);
 drawer.appendChild(drawerHead);

 var drawerBody=make("div","sais-drawer-body");
 link(drawerBody,"Home","");
 link(drawerBody,"Animal Care & Training","animal-care-training/");
 link(drawerBody,"Animal Help & Resources","animal-help-resources/");
 link(drawerBody,"Animal Articles","animal-articles/");
 var mobileGroups=[
  ["Choose an animal",groups.animals],
  ["Care topics",groups.care.slice(1)],
  ["More resources",groups.resources.slice(1)],
  ["Articles",groups.articles.slice(1)]
 ];
 var mobileGroupToggles=[];
 mobileGroups.forEach(function(group,i){
  var section=make("section","sais-drawer-group");
  var toggle=make("button","sais-drawer-group-toggle",group[0]);
  toggle.type="button";
  toggle.id="sais-drawer-group-toggle-"+i;
  toggle.setAttribute("aria-expanded","false");
  toggle.setAttribute("aria-controls","sais-drawer-group-panel-"+i);
  var chevron=make("span","sais-drawer-chevron","⌄");
  chevron.setAttribute("aria-hidden","true");
  toggle.appendChild(chevron);
  var list=make("div","sais-drawer-links");
  list.id="sais-drawer-group-panel-"+i;
  list.hidden=true;
  list.setAttribute("aria-labelledby",toggle.id);
  group[1].forEach(function(item){link(list,item[0],item[1]);});
  if(list.querySelector('[aria-current="page"]')){section.classList.add("is-active");toggle.setAttribute("aria-label",group[0]+", contains the current page");}
  mobileGroupToggles.push({toggle:toggle,list:list,section:section});
  toggle.addEventListener("click",function(){
   var opening=toggle.getAttribute("aria-expanded")!=="true";
   mobileGroupToggles.forEach(function(other){
    var active=other.toggle===toggle&&opening;
    other.toggle.setAttribute("aria-expanded",String(active));
    other.list.hidden=!active;
    other.section.classList.toggle("is-expanded",active);
   });
  });
  section.appendChild(toggle);
  section.appendChild(list);
  drawerBody.appendChild(section);
 });
 var drawerDonate=make("button","sais-donate-button sais-donate-button--drawer","Donate");
 drawerDonate.type="button";
 drawerDonate.setAttribute("aria-haspopup","dialog");
 drawerDonate.setAttribute("aria-label","Donate to support Somerset Animal Information Services");
 drawerBody.appendChild(drawerDonate);
 drawer.appendChild(drawerBody);

 shell.appendChild(top);
 shell.appendChild(nav);
 shell.appendChild(tagline);
 shell.appendChild(backdrop);
 shell.appendChild(drawer);

 function setDrawer(open,restoreFocus){
  drawer.classList.toggle("is-open",open);
  backdrop.hidden=!open;
  drawer.setAttribute("aria-hidden",String(!open));
  drawer.inert=!open;
  menuButton.setAttribute("aria-expanded",String(open));
  menuButton.setAttribute("aria-label",open?"Close site menu":"Open site menu");
  document.body.classList.toggle("sais-drawer-open",open);
  if(open)close.focus();
  else if(restoreFocus!==false)menuButton.focus();
 }
 menuButton.addEventListener("click",function(){setDrawer(!drawer.classList.contains("is-open"));});
 close.addEventListener("click",function(){setDrawer(false);});
 backdrop.addEventListener("click",function(){setDrawer(false);});
 drawer.addEventListener("click",function(e){if(e.target.closest("a"))setDrawer(false);});
 document.addEventListener("keydown",function(e){
  if(!drawer.classList.contains("is-open"))return;
  if(e.key==="Escape"){e.preventDefault();setDrawer(false);return;}
  if(e.key==="Tab"){
   var focusables=Array.from(drawer.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter(function(n){return !n.closest("[hidden]")&&n.offsetParent!==null;});
   if(!focusables.length)return;
   var first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 window.addEventListener("resize",function(){if(window.innerWidth>1199&&drawer.classList.contains("is-open"))setDrawer(false,false);});
 function openDonation(trigger){
  var restoreTarget=drawer.classList.contains("is-open")?menuButton:trigger;
  if(drawer.classList.contains("is-open"))setDrawer(false,false);
  if(window.saisOpenDonationModal)window.saisOpenDonationModal(restoreTarget);
 }
 desktopDonate.addEventListener("click",function(){openDonation(desktopDonate);});
 drawerDonate.addEventListener("click",function(){openDonation(drawerDonate);});

 var anchor=announcement||mast;
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(shell,anchor);
 else{
  var skip=document.querySelector(".skip-link,.sais-skip-link");
  if(skip&&skip.parentNode)skip.insertAdjacentElement("afterend",shell);
  else document.body.insertBefore(shell,document.body.firstChild);
 }
 if(announcement&&announcement.isConnected)announcement.remove();
 if(mast&&mast.isConnected)mast.remove();
}

function buildDonationModal(){
 if(document.getElementById("sais-donation-overlay"))return;
 var overlay=make("div","sais-donation-overlay");
 overlay.id="sais-donation-overlay";
 overlay.hidden=true;
 var dialog=make("section","sais-donation-dialog");
 dialog.setAttribute("role","dialog");
 dialog.setAttribute("aria-modal","true");
 dialog.setAttribute("aria-labelledby","sais-donation-title");
 dialog.setAttribute("aria-describedby","sais-donation-intro");
 dialog.tabIndex=-1;
 var head=make("div","sais-donation-head");
 var heading=make("div","sais-donation-heading");
 heading.appendChild(make("span","sais-donation-eyebrow","SUPPORT SAIS"));
 var title=make("h2","","Help keep Somerset Animal Information Services running");
 title.id="sais-donation-title";
 heading.appendChild(title);
 var close=make("button","sais-donation-close","×");
 close.type="button";
 close.setAttribute("aria-label","Close donation information");
 head.appendChild(heading);
 head.appendChild(close);
 dialog.appendChild(head);
 var content=make("div","sais-donation-content");
 content.appendChild(make("h3","","Why your support matters"));
 var intro=make("p","","Since 2023, Somerset Animal Information Services (SAIS) has grown from a small project into an independent service helping animal owners, carers and businesses find useful information, support and trusted animal-related services across Somerset and beyond.");
 intro.id="sais-donation-intro";
 content.appendChild(intro);
 content.appendChild(make("p","","We provide a free animal business directory, an Animal Information Hub and helpful resources. Our aim is to keep everything free: no fees for business listings, no paid memberships and no information hidden behind a paywall."));
 content.appendChild(make("h3","","Your donation helps us:"));
 var list=make("ul","sais-donation-list");
 [
  "Keep our websites, information hub and directory online.",
  "Cover hosting, domain renewals and ongoing maintenance.",
  "Improve and develop the Animal Information Hub.",
  "Expand useful resources for animal owners and carers.",
  "Keep the animal business directory free for listed businesses."
 ].forEach(function(item){list.appendChild(make("li","",item));});
 content.appendChild(list);
 content.appendChild(make("p","","Every penny raised will go towards the ongoing running and development of SAIS. Keeping the service available takes time, dedication and money, and your support helps us continue that work."));
 var how=make("div","sais-donation-how");
 how.appendChild(make("h3","","How to donate"));
 how.appendChild(make("p","","Select the button below to visit our PayPal fundraiser. You can contribute there with an amount that suits you. Every donation, large or small, makes a difference."));
 content.appendChild(how);
 content.appendChild(make("p","sais-donation-thanks","Unable to donate? Sharing the fundraiser with others is another great way to help. Thank you for being part of our journey."));
 var actions=make("div","sais-donation-actions");
 var paypal=make("a","sais-donation-primary","Continue to PayPal fundraiser");
 paypal.href="https://www.paypal.com/pools/c/9uo95OuMew";
 paypal.setAttribute("aria-label","Open the Somerset Animal Information Services PayPal fundraiser");
 var later=make("button","sais-donation-secondary","Maybe later");
 later.type="button";
 actions.appendChild(paypal);
 actions.appendChild(later);
 dialog.appendChild(content);
 dialog.appendChild(actions);
 overlay.appendChild(dialog);
 document.body.appendChild(overlay);
 var lastTrigger=null;
 function closeModal(restoreFocus){
  overlay.hidden=true;
  document.body.classList.remove("sais-donation-open");
  if(restoreFocus!==false&&lastTrigger&&lastTrigger.isConnected)lastTrigger.focus();
 }
 window.saisOpenDonationModal=function(trigger){
  lastTrigger=trigger||document.activeElement;
  overlay.hidden=false;
  document.body.classList.add("sais-donation-open");
  close.focus();
 };
 close.addEventListener("click",function(){closeModal(true);});
 later.addEventListener("click",function(){closeModal(true);});
 overlay.addEventListener("click",function(e){if(e.target===overlay)closeModal(true);});
 document.addEventListener("keydown",function(e){
  if(overlay.hidden)return;
  if(e.key==="Escape"){e.preventDefault();closeModal(true);return;}
  if(e.key==="Tab"){
   var focusables=Array.from(dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(n){return !n.hidden;});
   if(!focusables.length)return;
   var first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
}

function buildFooter(){
 Array.from(document.querySelectorAll("footer,.hub-footer,.foot")).forEach(function(n){if(n.isConnected)n.remove();});
 var f=make("footer","sais-footer"),wrap=make("div","sais-footer-inner"),top=make("div","sais-footer-top");
 var brand=make("section","sais-footer-brand"),mark=make("span","sais-footer-mark","✦");mark.setAttribute("aria-hidden","true");
 brand.appendChild(mark);brand.appendChild(make("h2","","Animal Information Hub UK"));
 brand.appendChild(make("p","","Practical animal information, clear guidance and trusted starting points for better animal care."));
 brand.appendChild(make("span","sais-footer-powered","Powered by Somerset Animal Information Services"));
 var installLink=make("button","sais-install-footer-trigger","＋ Add to Home Screen");installLink.type="button";installLink.addEventListener("click",function(){if(window.saisShowInstallPrompt)window.saisShowInstallPrompt(true);});brand.appendChild(installLink);
 var columns=make("div","sais-footer-columns");
 function column(title,items){var section=make("section","sais-footer-column");section.appendChild(make("h3","",title));items.forEach(function(x){link(section,x[0],x[1]);});columns.appendChild(section);}
 column("Explore the Hub",[["Home",""],["Animal Care & Training","animal-care-training/"],["Animal Help & Resources","animal-help-resources/"],["Animal Articles","animal-articles/"],["Contact","contact/"]]);
 column("Animal guides",groups.animals);
 column("Information & support",[["Sources & Editorial Standards","sources-and-editorial-standards/"],["Accessibility","accessibility/"],["Privacy Notice","privacy/"],["Terms & Disclaimer","terms-and-disclaimer/"],["Somerset Animal Information Services","https://www.somersetanimalinformationservices.com/"]]);
 top.appendChild(brand);top.appendChild(columns);wrap.appendChild(top);
 var bottom=make("div","sais-footer-bottom");bottom.appendChild(make("span","","© "+new Date().getFullYear()+" Somerset Animal Information Services"));
 bottom.appendChild(make("span","","General information only — not a substitute for veterinary or other professional advice."));
 f.appendChild(wrap);f.appendChild(bottom);document.body.appendChild(f);
}
function bindSearch(){var form=document.getElementById("siteSearch"),input=document.getElementById("searchInput"),out=document.getElementById("searchResults");if(!form||!input||!out)return;
 function run(){var q=input.value.trim().toLowerCase();out.replaceChildren();if(!q){out.hidden=true;return;}var words=q.split(/\s+/);var hits=index.map(function(x){var hay=(x.name+" "+x.terms).toLowerCase();return {x:x,score:words.filter(function(w){return hay.indexOf(w)>=0;}).length};}).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,10);if(!hits.length)out.appendChild(make("p","","No matching pages found. Try an animal name or a topic such as training, health or lost animals."));hits.forEach(function(hit){var a=make("a","",hit.x.name);a.href=hit.x.href;out.appendChild(a);});out.hidden=false;}
 form.addEventListener("submit",function(e){e.preventDefault();run();});input.addEventListener("input",run);input.addEventListener("keydown",function(e){if(e.key==="Escape"){out.hidden=true;input.blur();}});
}
function bindMenus(){document.addEventListener("click",function(e){var current=e.target.closest(".sais-menu");document.querySelectorAll(".sais-menu[open]").forEach(function(d){if(d!==current)d.open=false;});if(!current)document.querySelectorAll(".sais-menu[open]").forEach(function(d){d.open=false;});});document.addEventListener("keydown",function(e){if(e.key==="Escape")document.querySelectorAll(".sais-menu[open]").forEach(function(d){d.open=false;});});}
function updateClock(){var day=document.getElementById("weekday"),date=document.getElementById("dateTime");if(!date)return;var now=new Date();day.textContent=new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"Europe/London"}).format(now);date.textContent=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/London"}).format(now).replace(","," ·");}
function syncClockVisibility(){var panel=document.querySelector(".sais-header-clock-panel");if(!panel)return;var compact=window.matchMedia("(max-width: 1199px)").matches;if(compact){panel.style.setProperty("display","none","important");panel.setAttribute("aria-hidden","true");}else{panel.style.removeProperty("display");panel.removeAttribute("aria-hidden");}}
function improveReadabilityAndTopButton(){
 var notices=document.querySelectorAll(".source-notice,.editorial-notice,.editorial-sources,.source-panel,.guide-notice");
 notices.forEach(function(box){var lead=box.querySelector("strong");if(lead&&/^About these guides:?$/i.test(lead.textContent.trim())){var p=lead.closest("p")||box;var sourceLink=p.querySelector("a");lead.textContent="About this information:";p.replaceChildren(lead,document.createTextNode(" SAIS summaries use research and linked sources. Check original guidance for updates; this is general information, not veterinary advice. "),...(sourceLink?[sourceLink]:[]));}box.style.setProperty("background","#fff4e7","important");box.style.setProperty("color","#171717","important");box.style.setProperty("opacity","1","important");box.style.setProperty("filter","none","important");box.style.setProperty("border-left","5px solid #b85e20","important");box.style.setProperty("border-radius","9px","important");box.style.setProperty("padding","16px 19px","important");box.style.setProperty("line-height","1.75","important");box.querySelectorAll("*").forEach(function(child){child.style.setProperty("color",child.tagName==="A"?"#174f78":"#171717","important");child.style.setProperty("opacity","1","important");child.style.setProperty("text-shadow","none","important");child.style.setProperty("filter","none","important");});});
 if(!document.getElementById("sais-back-to-top")){var top=make("button","sais-back-to-top");top.id="sais-back-to-top";top.type="button";top.setAttribute("aria-label","Back to top");top.setAttribute("title","Back to top");top.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg><span class="sais-floating-label">Back to top</span>';top.addEventListener("click",function(){window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});document.body.appendChild(top);}
 if(!document.getElementById("sais-accessibility-widget")){
  var widget=make("div","sais-accessibility-widget");widget.id="sais-accessibility-widget";
  var toggle=make("button","sais-accessibility-toggle");toggle.type="button";toggle.setAttribute("aria-label","Open accessibility settings");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","sais-accessibility-panel");toggle.title="Accessibility settings";toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="2"/><path d="M4 9h16M12 7v13M8 21l4-7 4 7"/></svg><span class="sais-floating-label">Accessibility</span>';
  var panel=make("section","sais-accessibility-panel");panel.id="sais-accessibility-panel";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","false");panel.setAttribute("aria-label","Accessibility settings");
  var head=make("div","sais-accessibility-panel-head");head.appendChild(make("strong","","Accessibility settings"));var close=make("button","sais-accessibility-close","×");close.type="button";close.setAttribute("aria-label","Close accessibility settings");head.appendChild(close);panel.appendChild(head);panel.appendChild(make("p","","Adjust text size, emphasis and contrast for easier reading."));
  var controls=make("div","sais-accessibility-controls");var smaller=make("button","","A− Smaller text");var larger=make("button","","A+ Larger text");var bold=make("button","","Bold text");var contrast=make("button","","High contrast");
  [smaller,larger,bold,contrast].forEach(function(b){b.type="button";controls.appendChild(b);});bold.setAttribute("aria-pressed","false");contrast.setAttribute("aria-pressed","false");panel.appendChild(controls);
  var reset=make("button","sais-accessibility-reset","Reset settings");reset.type="button";panel.appendChild(reset);widget.appendChild(panel);widget.appendChild(toggle);document.body.appendChild(widget);
  var scale=1;function applyScale(){document.body.style.zoom=scale===1?"":String(scale);}
  toggle.addEventListener("click",function(){var open=panel.hidden;panel.hidden=!open;toggle.setAttribute("aria-expanded",String(open));if(open)close.focus();});
  close.addEventListener("click",function(){panel.hidden=true;toggle.setAttribute("aria-expanded","false");toggle.focus();});
  smaller.addEventListener("click",function(){scale=Math.max(.85,Math.round((scale-.1)*10)/10);applyScale();});
  larger.addEventListener("click",function(){scale=Math.min(1.5,Math.round((scale+.1)*10)/10);applyScale();});
  bold.addEventListener("click",function(){var active=document.body.classList.toggle("sais-a11y-bold");bold.setAttribute("aria-pressed",String(active));});
  contrast.addEventListener("click",function(){var active=document.body.classList.toggle("sais-a11y-contrast");contrast.setAttribute("aria-pressed",String(active));});
  reset.addEventListener("click",function(){scale=1;document.body.style.zoom="";document.body.classList.remove("sais-a11y-bold","sais-a11y-contrast");bold.setAttribute("aria-pressed","false");contrast.setAttribute("aria-pressed","false");});
  document.addEventListener("keydown",function(e){if(panel.hidden)return;if(e.key==="Escape"){panel.hidden=true;toggle.setAttribute("aria-expanded","false");toggle.focus();return;}if(e.key==="Tab"){var focusables=Array.from(panel.querySelectorAll("button:not([disabled]),a[href]"));if(!focusables.length)return;var first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.addEventListener("pointerdown",function(e){if(!panel.hidden&&!widget.contains(e.target)){panel.hidden=true;toggle.setAttribute("aria-expanded","false");}});
 }
}

function registerOfflineSupport(){
 if(!("serviceWorker" in navigator)||!/^https?:$/.test(location.protocol))return;
 window.addEventListener("load",function(){navigator.serviceWorker.register(route("sw.js"),{scope:route("")}).catch(function(){});},{once:true});
}
function setupInstallExperience(){
 var deferredPrompt=null,shown=false,dialog=null;
 var isStandalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
 if(isStandalone){document.documentElement.classList.add("sais-standalone");return;}
 var ua=navigator.userAgent||"";
 var isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 var key="sais-hub-install-dismissed-v1";
 function dismissed(){try{return localStorage.getItem(key)==="1";}catch(e){return false;}}
 function rememberDismissal(){try{localStorage.setItem(key,"1");}catch(e){}}
 function closeDialog(save){if(dialog&&dialog.isConnected)dialog.remove();dialog=null;if(save)rememberDismissal();}
 function show(force){
  if(dialog||isStandalone||(!force&&dismissed()))return;
  if(!force&&!deferredPrompt&&!isIOS)return;
  shown=true;
  dialog=make("section","sais-install-prompt");
  dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","false");dialog.setAttribute("aria-labelledby","sais-install-title");
  var head=make("div","sais-install-head");
  var copy=make("div","sais-install-copy");
  copy.appendChild(make("span","sais-install-eyebrow","ANIMAL INFORMATION HUB UK"));
  copy.appendChild(make("h2","","Keep the Animal Hub close at hand"));
  copy.appendChild(make("p","","Add the free Hub to your home screen for quicker access to animal information and guidance."));
  head.appendChild(copy);
  var x=make("button","sais-install-close","×");x.type="button";x.setAttribute("aria-label","Close install message");head.appendChild(x);dialog.appendChild(head);
  var actions=make("div","sais-install-actions");
  var primary=make("button","sais-install-primary",deferredPrompt?"Add to Home Screen":(isIOS?"Show me how":"How to add"));
  primary.type="button";
  var secondary=make("button","sais-install-secondary","Not now");secondary.type="button";
  actions.appendChild(primary);actions.appendChild(secondary);dialog.appendChild(actions);
  var instructions=make("div","sais-install-instructions");instructions.hidden=true;
  if(isIOS){
   instructions.appendChild(make("p","","On your iPhone or iPad:"));
   var list=make("ol","");
   ["Open this page in Safari.","Tap the Share button (the square with the upward arrow).","Choose Add to Home Screen, then tap Add."].forEach(function(t){list.appendChild(make("li","",t));});
   instructions.appendChild(list);
  }else{
   instructions.appendChild(make("p","","In your browser, open the page menu or address-bar install icon and choose Install app or Add to Home Screen, if offered."));
  }
  dialog.appendChild(instructions);document.body.appendChild(dialog);
  function revealInstructions(){instructions.hidden=false;primary.hidden=true;secondary.textContent="Close";instructions.scrollIntoView({block:"nearest"});}
  primary.addEventListener("click",function(){
   if(deferredPrompt){var promptEvent=deferredPrompt;deferredPrompt=null;promptEvent.prompt();promptEvent.userChoice.then(function(choice){if(choice&&choice.outcome==="accepted")closeDialog(true);else{primary.textContent="Try again";secondary.textContent="Not now";}}).catch(revealInstructions);}
   else revealInstructions();
  });
  secondary.addEventListener("click",function(){closeDialog(true);});
  x.addEventListener("click",function(){closeDialog(true);});
  dialog.addEventListener("keydown",function(e){if(e.key==="Escape"){closeDialog(false);}});
 }
 window.saisShowInstallPrompt=show;
 window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferredPrompt=e;if(!shown&&!dismissed())show(false);});
 window.addEventListener("appinstalled",function(){deferredPrompt=null;closeDialog(true);});
 window.setTimeout(function(){if(!shown&&(isIOS||deferredPrompt)&&!dismissed())show(false);},10000);
}
function init(){loadStyles();registerOfflineSupport();setupInstallExperience();buildDonationModal();var skip=document.querySelector(".skip-link,.sais-skip-link");if(skip)skip.href="#main-content";else{skip=make("a","sais-skip-link","Skip to main content");skip.href="#main-content";document.body.insertBefore(skip,document.body.firstChild);}var main=document.querySelector("main");if(main&&!main.id)main.id="main-content";buildShell();buildFooter();syncClockVisibility();var clockMedia=window.matchMedia("(max-width: 1199px)");if(clockMedia.addEventListener)clockMedia.addEventListener("change",syncClockVisibility);else if(clockMedia.addListener)clockMedia.addListener(syncClockVisibility);improveReadabilityAndTopButton();bindSearch();bindMenus();updateClock();setInterval(updateClock,30000);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();