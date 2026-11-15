import { chromium } from "playwright";

const BASE = "https://saiscontactunmonitored-dot.github.io/SAISAnimalInformationHubUK/";
const errors = [];
const warnings = [];
const sameOriginFailures = [];
const internalLinks = new Set();
const externalLinks = new Set();
const pageIds = new Map();
const fragmentLinks = [];

async function waitForPublishedRelease() {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const [response, cssResponse, workerResponse] = await Promise.all([
        fetch(BASE, { cache: "no-store" }),
        fetch(BASE + "assets/css/navigation-rebuild-2026.css", { cache: "no-store" }),
        fetch(BASE + "sw.js", { cache: "no-store" })
      ]);
      const [html, css, worker] = await Promise.all([
        response.text(), cssResponse.text(), workerResponse.text()
      ]);
      const currentNavigation = css.includes("Screenshot-matched SAIS header: orange top band") && css.includes(".sais-header-top") && css.includes("data:image/svg+xml");
      const currentOfflineCache = worker.includes("sais-animal-hub-v51");
      if (response.ok && cssResponse.ok && workerResponse.ok &&
          html.includes('rel="canonical"') && html.includes("Animal Information Hub UK") &&
          currentNavigation && currentOfflineCache) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error("The current navigation rebuild and v51 offline cache did not become available within three minutes.");
}

await waitForPublishedRelease();

const sitemapResponse = await fetch(BASE + "sitemap.xml", { cache: "no-store" });
if (!sitemapResponse.ok) throw new Error("Sitemap returned HTTP " + sitemapResponse.status);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].trim());
if (!urls.length) throw new Error("Sitemap contains no URLs.");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const page = await context.newPage();

page.on("pageerror", error => errors.push("JavaScript page error: " + error.message));
page.on("console", message => {
  if (message.type() === "error") {
    if (page.url().includes("this-page-should-not-exist-404-check") && message.text().includes("404")) return;
    const location = message.location()?.url || "";
    if (!location || location.startsWith(BASE)) errors.push("Browser console error on " + page.url() + " at " + location + ": " + message.text());
    else warnings.push("Third-party console error: " + message.text());
  } else if (message.type() === "warning") {
    warnings.push("Browser console warning: " + message.text());
  }
});
page.on("requestfailed", request => {
  if (request.url().startsWith(BASE)) sameOriginFailures.push("Request failed: " + request.url());
});
page.on("response", response => {
  if (response.url().startsWith(BASE) && response.status() >= 400 && !response.url().includes("this-page-should-not-exist-404-check")) {
    sameOriginFailures.push("HTTP " + response.status() + ": " + response.url());
  }
});

const durations = [];
for (const url of urls) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || response.status() !== 200) errors.push("Page did not return HTTP 200: " + url);
  await page.waitForLoadState("load", { timeout: 15000 }).catch(() => warnings.push("Load event timed out: " + url));
  const imageFailures = await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = "eager"; });
    await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      const finish = () => resolve();
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      setTimeout(finish, 10000);
    })));
    return images.filter(image => !image.naturalWidth).map(image => image.currentSrc || image.src);
  });
  if (imageFailures.length) errors.push("Images failed to load on " + url + ": " + imageFailures.join(", "));
  const result = await page.evaluate(() => {
    const title = document.title.trim();
    const h1 = document.querySelectorAll("h1").length;
    const description = document.querySelector('meta[name="description"]')?.content?.trim() || "";
    const canonical = document.querySelector('link[rel="canonical"]')?.href || "";
    const ogDescription = document.querySelector('meta[property="og:description"]')?.content?.trim() || "";
    const ogUrl = document.querySelector('meta[property="og:url"]')?.content || "";
    const imagesWithoutAlt = [...document.images].filter(image => !image.hasAttribute("alt")).length;
    const badLinks = [...document.querySelectorAll("a[href]")].map(anchor => anchor.href)
      .filter(href => href.startsWith(location.origin) && !href.startsWith(location.origin + "/SAISAnimalInformationHubUK/"));
    const navDuration = performance.getEntriesByType("navigation")[0]?.loadEventEnd || 0;
    const headerTop = document.querySelector(".sais-header-top");
    const headerBrand = document.querySelector(".sais-header-brand");
    const headerClock = document.querySelector(".sais-header-clock-panel");
    const headerSearch = document.querySelector(".sais-header-search-panel");
    const headerTagline = document.querySelector(".sais-header-tagline");
    const desktopNav = document.querySelector(".sais-navigation-inner");
    const hamburger = document.querySelector(".sais-mobile-menu-button");
    const headerLogo = document.querySelector(".sais-header-logo");
    const brandRect = headerBrand?.getBoundingClientRect();
    const header = {
      partsPresent: !!headerTop && !!headerBrand && !!headerClock && !!headerSearch && !!headerTagline,
      centeredBrandDelta: brandRect ? Math.abs((brandRect.left + brandRect.width / 2) - window.innerWidth / 2) : Infinity,
      clockVisible: !!headerClock && headerClock.getBoundingClientRect().width > 0,
      clockBackground: headerClock ? getComputedStyle(headerClock).backgroundColor : "",
      clockLocation: headerClock?.querySelector(".sais-clock-location")?.textContent?.trim() || "",
      clockDateColour: headerClock ? getComputedStyle(headerClock.querySelector("#dateTime")).color : "",
      desktopPawPattern: !!headerTop && getComputedStyle(headerTop).backgroundImage.includes("data:image/svg+xml"),
      searchVisible: !!headerSearch && headerSearch.getBoundingClientRect().width > 0,
      shellCount: document.querySelectorAll(".sais-shell").length,
      navigationCount: document.querySelectorAll(".sais-navigation").length,
      footerCount: document.querySelectorAll(".sais-footer").length,
      desktopNavVisible: !!desktopNav && getComputedStyle(desktopNav).display !== "none" && desktopNav.getBoundingClientRect().width > 0,
      desktopDropdownCount: document.querySelectorAll(".sais-menu").length,
      hamburgerVisible: !!hamburger && getComputedStyle(hamburger).display !== "none" && hamburger.getBoundingClientRect().width > 0,
      logoCorrect: !!headerLogo && headerLogo.src.split("?")[0].endsWith("/info-logo.png")
    };
    return {
      title, h1, description, canonical, ogDescription, ogUrl,
      imagesWithoutAlt, badLinks, navDuration, header,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      lang: document.documentElement.lang,
      ids: [...document.querySelectorAll("[id]")].map(node => node.id)
    };
  });
  if (!result.title) errors.push("Missing document title: " + url);
  if (result.h1 !== 1) errors.push("Expected one H1, found " + result.h1 + ": " + url);
  if (!result.description) errors.push("Missing meta description: " + url);
  if (result.canonical !== url) errors.push("Canonical mismatch: " + url);
  if (result.ogDescription !== result.description) errors.push("Open Graph description mismatch: " + url);
  if (result.ogUrl !== url) errors.push("Open Graph URL mismatch: " + url);
  if (!result.lang) errors.push("Missing document language: " + url);
  if (!result.header.partsPresent || !result.header.clockVisible || !result.header.searchVisible) {
    errors.push("Screenshot-style shared header is incomplete on " + url);
  }
  if (result.header.shellCount !== 1 || result.header.navigationCount !== 1 || result.header.footerCount !== 1) {
    errors.push("Shared header/navigation/footer does not appear exactly once on " + url);
  }
  if (!result.header.desktopNavVisible || result.header.desktopDropdownCount !== 4 || result.header.hamburgerVisible) {
    errors.push("Desktop navigation layout is incorrect on " + url);
  }
  if (!result.header.logoCorrect) errors.push("Header is not using the supplied info-logo.png on " + url);
  if (result.header.clockLocation !== "London, UK" ||
      result.header.clockBackground !== "rgb(255, 255, 255)" ||
      result.header.clockDateColour !== "rgb(23, 23, 23)") {
    errors.push("Clock location or white-background/black-date styling is incorrect on " + url);
  }
  if (!result.header.desktopPawPattern) errors.push("Desktop masthead paw pattern is missing on " + url);
  if (result.header.centeredBrandDelta > 3) {
    errors.push("Hub logo panel is not centred on " + url + " (offset " + Math.round(result.header.centeredBrandDelta) + "px).");
  }
  if (result.imagesWithoutAlt) warnings.push(result.imagesWithoutAlt + " images without alt attributes: " + url);
  if (result.badLinks.length) errors.push("Root-relative links outside project prefix: " + url);
  if (result.overflow) errors.push("Horizontal overflow at desktop viewport: " + url);
  if (result.navDuration) durations.push(result.navDuration);
  let loadedPath = new URL(url).pathname;
  if (loadedPath.endsWith("index.html")) loadedPath = loadedPath.slice(0, -"index.html".length);
  if (!loadedPath.endsWith("/")) loadedPath += "/";
  pageIds.set(loadedPath, new Set(result.ids));
  const anchors = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.href));
  for (const href of anchors) {
    try {
      const parsed = new URL(href);
      if (parsed.origin === new URL(BASE).origin && parsed.pathname.startsWith("/SAISAnimalInformationHubUK/")) {
        if (parsed.hash) {
          let targetPath = parsed.pathname;
          if (targetPath.endsWith("index.html")) targetPath = targetPath.slice(0, -"index.html".length);
          if (!targetPath.endsWith("/")) targetPath += "/";
          fragmentLinks.push({path:targetPath,id:decodeURIComponent(parsed.hash.slice(1)),source:url});
        }
        parsed.hash = "";
        internalLinks.add(parsed.href);
      } else if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        parsed.hash = "";
        externalLinks.add(parsed.href);
      }
    } catch {}
  }
}

for (const fragment of fragmentLinks) {
  const targets = pageIds.get(fragment.path);
  // Only assert fragments on indexable sitemap pages; noindex redirects and utility pages
  // are covered by their HTTP response checks rather than the sitemap page-ID map.
  if (targets && !targets.has(fragment.id)) {
    errors.push("Broken in-page anchor #" + fragment.id + " from " + fragment.source + " to " + fragment.path);
  }
}

const mobilePages = urls;
for (const width of [320, 390, 683, 768, 1024]) {
  for (const url of mobilePages) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : width <= 390 ? 844 : width <= 768 ? 1024 : 768 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const responsive = await page.evaluate(() => {
      const clock = document.querySelector(".sais-header-clock-panel");
      const brand = document.querySelector(".sais-header-brand");
      const search = document.querySelector(".sais-header-search-panel");
      const nav = document.querySelector(".sais-navigation-inner");
      const menuButton = document.querySelector(".sais-mobile-menu-button");
      const footer = document.querySelectorAll(".sais-footer").length;
      const navCount = document.querySelectorAll(".sais-navigation").length;
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        clockVisible: !!clock && clock.getBoundingClientRect().width > 0,
        brandVisible: !!brand && brand.getBoundingClientRect().width > 0,
        searchVisible: !!search && search.getBoundingClientRect().width > 0,
        menuVisible: !!menuButton && getComputedStyle(menuButton).display !== "none" && menuButton.getBoundingClientRect().width > 0,
        desktopLinksHidden: !!nav && getComputedStyle(nav).display === "none",
        footerCount: footer,
        navCount
      };
    });
    if (responsive.overflow) errors.push("Horizontal overflow at " + width + "px viewport: " + url);
    if (responsive.clockVisible) errors.push("Clock/time panel should be hidden at " + width + "px: " + url);
    if (!responsive.brandVisible || !responsive.searchVisible) errors.push("Header identity/search missing at " + width + "px: " + url);
    if (!responsive.menuVisible || !responsive.desktopLinksHidden) errors.push("Responsive navigation is incorrect at " + width + "px: " + url);
    if (responsive.footerCount !== 1 || responsive.navCount !== 1) errors.push("Responsive footer/navigation count is incorrect at " + width + "px: " + url);
  }
}


 // Confirm the two floating accessibility controls are separate, visible and do not overlap on a phone.
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
 const floatingState = await page.evaluate(() => {
   const access = document.querySelector("#sais-accessibility-widget .sais-accessibility-toggle");
   const top = document.querySelector("#sais-back-to-top");
   const a = access?.getBoundingClientRect();
   const b = top?.getBoundingClientRect();
   return {
     accessCount: document.querySelectorAll("#sais-accessibility-widget .sais-accessibility-toggle").length,
     topCount: document.querySelectorAll("#sais-back-to-top").length,
     accessVisible: !!a && a.width > 0 && a.height > 0,
     topVisible: !!b && b.width > 0 && b.height > 0,
     overlap: !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
   };
 });
 if (floatingState.accessCount !== 1 || floatingState.topCount !== 1 || !floatingState.accessVisible || !floatingState.topVisible || floatingState.overlap) {
   errors.push("Floating accessibility/back-to-top controls are missing, duplicated or overlapping on mobile.");
 }

// Exercise the responsive drawer, its group controls, Escape handling and focus trap.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
const menuButton = page.locator(".sais-mobile-menu-button");
if (await menuButton.count() !== 1 || !(await menuButton.isVisible())) {
  errors.push("Mobile menu button is missing or not visible.");
} else {
  await menuButton.click();
  const drawer = page.locator("#sais-mobile-drawer");
  if (await menuButton.getAttribute("aria-expanded") !== "true" || await drawer.getAttribute("aria-hidden") !== "false") {
    errors.push("Mobile menu did not open with correct accessibility state.");
  }
  const groupToggle = page.locator(".sais-drawer-group-toggle").first();
  if (await groupToggle.count()) {
    await groupToggle.click();
    if (await groupToggle.getAttribute("aria-expanded") !== "true") errors.push("Mobile menu group did not expand.");
    const panelId = await groupToggle.getAttribute("aria-controls");
    if (panelId && await page.locator("#" + panelId).isHidden()) errors.push("Expanded mobile menu group remains hidden.");
  }
  await page.keyboard.press("Shift+Tab");
  const focusStayedInDrawer = await page.evaluate(() => document.querySelector("#sais-mobile-drawer")?.contains(document.activeElement) || false);
  if (!focusStayedInDrawer) errors.push("Keyboard focus escaped the open mobile navigation drawer.");
  await page.keyboard.press("Escape");
  if (await menuButton.getAttribute("aria-expanded") !== "false") errors.push("Escape did not close the mobile navigation drawer.");
  const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains("sais-mobile-menu-button"));
  if (!focusReturned) warnings.push("Mobile menu did not restore focus to its trigger after closing.");
}

// Exercise the same drawer interactions at tablet width, including single-open accordion behaviour.
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
const tabletMenu = page.locator(".sais-mobile-menu-button");
if (!(await tabletMenu.isVisible())) errors.push("Tablet menu button is not visible at 768px.");
else {
  await tabletMenu.click();
  const tabletDrawer = page.locator("#sais-mobile-drawer");
  const tabletGroups = page.locator(".sais-drawer-group-toggle");
  if (await tabletDrawer.getAttribute("aria-hidden") !== "false") errors.push("Tablet navigation drawer did not open.");
  if (await tabletGroups.count() >= 2) {
    await tabletGroups.nth(0).click();
    await tabletGroups.nth(1).click();
    if (await tabletGroups.nth(0).getAttribute("aria-expanded") !== "false") errors.push("Opening a tablet menu group did not close the previous group.");
    if (await tabletGroups.nth(1).getAttribute("aria-expanded") !== "true") errors.push("Tablet menu group did not open.");
  }
  const scrollState = await tabletDrawer.evaluate(node => ({scroll:node.scrollHeight,client:node.clientHeight,overflow:getComputedStyle(node).overflowY}));
  if (scrollState.scroll > scrollState.client && !["auto","scroll"].includes(scrollState.overflow)) errors.push("Tablet navigation drawer cannot scroll when expanded.");
  await page.keyboard.press("Escape");
}


 // Verify compact laptop/tablet widths use the drawer before the full desktop menu breakpoint.
 for (const width of [320, 390, 768, 1024, 1050, 1051, 1199, 1200, 1280, 1300]) {
   await page.setViewportSize({ width, height: 900 });
   await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
   const compactState = await page.evaluate(() => {
     const nav = document.querySelector(".sais-navigation-inner");
     const button = document.querySelector(".sais-mobile-menu-button");
     return {
       navVisible: !!nav && getComputedStyle(nav).display !== "none" && nav.getBoundingClientRect().width > 0,
       buttonVisible: !!button && getComputedStyle(button).display !== "none" && button.getBoundingClientRect().width > 0,
       overflow: document.documentElement.scrollWidth > window.innerWidth + 2
     };
   });
   if (compactState.navVisible) errors.push("Desktop links are shown instead of the compact navigation at " + width + "px.");
   if (!compactState.buttonVisible) errors.push("Hamburger navigation is missing at compact width " + width + "px.");
   if (compactState.overflow) errors.push("Navigation/header causes horizontal overflow at compact width " + width + "px.");
 }

// Check the full desktop navigation and every dropdown at common laptop/desktop widths.
for (const width of [1301, 1365, 1649]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes("assets/css/navigation-rebuild-2026.css")));
  const desktopState = await page.evaluate(() => {
    const nav = document.querySelector(".sais-navigation-inner");
    const button = document.querySelector(".sais-mobile-menu-button");
    const donate = document.querySelector(".sais-donate-button--desktop");
    const rect = nav?.getBoundingClientRect();
    return {
      navVisible: !!nav && getComputedStyle(nav).display !== "none" && !!rect && rect.width > 0,
      buttonVisible: !!button && getComputedStyle(button).display !== "none" && button.getBoundingClientRect().width > 0,
      menus: document.querySelectorAll(".sais-menu").length,
      donateVisible: !!donate && getComputedStyle(donate).display !== "none" && donate.getBoundingClientRect().width > 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2
    };
  });
  if (!desktopState.navVisible) errors.push("Desktop navigation is hidden at " + width + "px.");
  if (desktopState.buttonVisible) errors.push("Hamburger is showing instead of desktop navigation at " + width + "px.");
  if (desktopState.menus !== 4) errors.push("Expected four desktop dropdowns at " + width + "px, found " + desktopState.menus + ".");
  if (!desktopState.donateVisible) errors.push("Desktop Donate button is missing at " + width + "px.");
  if (desktopState.overflow) errors.push("Desktop navigation causes horizontal overflow at " + width + "px.");
  for (let i = 0; i < desktopState.menus; i++) {
    const menu = page.locator(".sais-menu").nth(i);
    const summary = menu.locator("summary");
    await summary.click();
    const panel = menu.locator(".sais-menu-panel");
    if (!(await panel.isVisible())) {
      errors.push("Desktop dropdown " + (i + 1) + " did not open at " + width + "px.");
      continue;
    }
    const panelState = await panel.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, links: node.querySelectorAll("a").length };
    });
    if (panelState.left < -1 || panelState.right > width + 1 || panelState.top < -1 || panelState.bottom > 901) {
      errors.push("Desktop dropdown " + (i + 1) + " is outside the viewport at " + width + "px: " + JSON.stringify(panelState));
    }
    if (!panelState.links) errors.push("Desktop dropdown " + (i + 1) + " has no links at " + width + "px.");
    await page.keyboard.press("Escape");
    if (await menu.evaluate(node => node.open)) errors.push("Escape did not close desktop dropdown " + (i + 1) + " at " + width + "px.");
  }
}

// Verify the mobile hamburger exposes the same destinations as all desktop dropdowns.
await page.setViewportSize({ width: 1365, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes("assets/css/navigation-rebuild-2026.css")));
const desktopDestinations = await page.locator(".sais-menu-panel a").evaluateAll(nodes => nodes.map(node => node.href).sort());
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator(".sais-mobile-menu-button").click();
const mobileDestinations = [];
for (const toggle of await page.locator(".sais-drawer-group-toggle").all()) {
  await toggle.click();
  const panelId = await toggle.getAttribute("aria-controls");
  if (panelId) mobileDestinations.push(...await page.locator("#" + panelId + " a").evaluateAll(nodes => nodes.map(node => node.href)));
}
if (JSON.stringify(desktopDestinations) !== JSON.stringify(mobileDestinations.sort())) {
  errors.push("Mobile hamburger dropdown destinations do not match desktop dropdown destinations.");
}

// Confirm the installed-PWA class does not override the rebuilt responsive breakpoints.
await page.setViewportSize({ width: 1365, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes("assets/css/navigation-rebuild-2026.css")));
await page.evaluate(() => document.documentElement.classList.add("sais-standalone"));
let standaloneDesktop = await page.evaluate(() => ({
  nav: getComputedStyle(document.querySelector(".sais-navigation-inner")).display,
  button: getComputedStyle(document.querySelector(".sais-mobile-menu-button")).display
}));
if (standaloneDesktop.nav === "none" || standaloneDesktop.button !== "none") {
  errors.push("Installed PWA desktop navigation does not use the desktop layout.");
}
await page.setViewportSize({ width: 390, height: 844 });
let standaloneMobile = await page.evaluate(() => ({
  nav: getComputedStyle(document.querySelector(".sais-navigation-inner")).display,
  button: getComputedStyle(document.querySelector(".sais-mobile-menu-button")).display
}));
if (standaloneMobile.nav !== "none" || standaloneMobile.button === "none") {
  errors.push("Installed PWA mobile navigation does not use the hamburger layout.");
}
await page.evaluate(() => document.documentElement.classList.remove("sais-standalone"));

// Exercise desktop dropdown keyboard dismissal.
await page.setViewportSize({ width: 1365, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
const dropdownSummary = page.locator(".sais-menu summary").first();
if (await dropdownSummary.count()) {
  await dropdownSummary.click();
  const dropdownOpen = await dropdownSummary.locator("xpath=..").evaluate(node => node.open);
  if (!dropdownOpen) errors.push("Desktop navigation dropdown did not open.");
  await page.keyboard.press("Escape");
  const dropdownClosed = await dropdownSummary.locator("xpath=..").evaluate(node => !node.open);
  if (!dropdownClosed) errors.push("Escape did not close the desktop navigation dropdown.");
  await dropdownSummary.focus();
  await page.keyboard.press("Enter");
  const keyboardOpened = await dropdownSummary.locator("xpath=..").evaluate(node => node.open);
  if (!keyboardOpened) errors.push("Keyboard Enter did not open the desktop navigation dropdown.");
  await page.keyboard.press("Escape");
}


 
 // Verify the mobile drawer also opens and closes with real touch input.
 const touchContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const touchPage = await touchContext.newPage();
 touchPage.on("pageerror", error => errors.push("Touch navigation JavaScript error: " + error.message));
 await touchPage.goto(BASE, {waitUntil:"domcontentloaded",timeout:30000});
 const touchMenuButton = touchPage.locator(".sais-mobile-menu-button");
 if (!(await touchMenuButton.isVisible())) errors.push("Touch navigation button is not visible on mobile.");
 else {
   await touchMenuButton.tap();
   const touchDrawer = touchPage.locator("#sais-mobile-drawer");
   if (await touchMenuButton.getAttribute("aria-expanded") !== "true" || await touchDrawer.getAttribute("aria-hidden") !== "false") {
     errors.push("Touch did not open the mobile navigation drawer.");
   }
   const touchGroup = touchPage.locator(".sais-drawer-group-toggle").first();
   if (await touchGroup.count()) {
     await touchGroup.tap();
     if (await touchGroup.getAttribute("aria-expanded") !== "true") errors.push("Touch did not expand a mobile navigation group.");
   }
   await touchPage.locator(".sais-drawer-backdrop").tap({position:{x:380,y:420}});
   if (await touchMenuButton.getAttribute("aria-expanded") !== "false") errors.push("Touching outside the drawer did not close mobile navigation.");
 }

 // Android-style tap-through checks for every homepage animal card.
 const chooserState = await touchPage.evaluate(() => ({
   cards: [...document.querySelectorAll(".animal-card")].map(card => ({label:card.querySelector("h3")?.textContent?.trim()||"",href:card.getAttribute("href")})),
   legacyAccessibilityControls:document.querySelectorAll(".accessibility-widget").length,
   legacyBackToTopControls:document.querySelectorAll(".back-to-top").length,
   sharedAccessibilityControls:document.querySelectorAll("#sais-accessibility-widget").length,
   sharedBackToTopControls:document.querySelectorAll("#sais-back-to-top").length
 }));
 const expectedAnimalCards = [
   {label:"Dogs",path:"dog-information/"},{label:"Cats",path:"cat-information/"},
   {label:"Chickens",path:"chicken-information/"},{label:"Rabbits",path:"rabbit-information/"},
   {label:"Rodents & small pets",path:"rodent-information/"},{label:"Reptiles & exotics",path:"reptileexotic-information/"},
   {label:"Horses",path:"horse-information/"},{label:"Wildlife",path:"wildlife-information/"}
 ];
 if(chooserState.cards.length!==expectedAnimalCards.length)errors.push("Homepage animal chooser should show eight unique animal cards; found "+chooserState.cards.length+".");
 if(new Set(chooserState.cards.map(card=>card.href)).size!==chooserState.cards.length)errors.push("Homepage animal chooser contains duplicate destinations.");
 if(chooserState.legacyAccessibilityControls||chooserState.legacyBackToTopControls||chooserState.sharedAccessibilityControls!==1||chooserState.sharedBackToTopControls!==1)errors.push("Homepage has duplicate or missing floating controls that can cover mobile tap targets.");
 for(const animal of expectedAnimalCards){
   await touchPage.goto(BASE,{waitUntil:"domcontentloaded",timeout:30000});
   const card=touchPage.locator(".animal-card").filter({hasText:animal.label});
   if(await card.count()!==1){errors.push("Mobile animal chooser is missing one unique card for "+animal.label+".");continue;}
   const href=await card.getAttribute("href");
   if(!href||!href.endsWith("/"+animal.path)){errors.push("Mobile animal card has the wrong destination for "+animal.label+": "+href);continue;}
   try{
     const [response]=await Promise.all([
       touchPage.waitForNavigation({waitUntil:"domcontentloaded",timeout:15000}),
       card.tap({timeout:10000})
     ]);
     if(new URL(touchPage.url()).pathname!==new URL(BASE+animal.path).pathname)errors.push("Tapping "+animal.label+" did not open its animal information page.");
     if(!response||response.status()!==200)errors.push("Tapping "+animal.label+" did not return HTTP 200.");
     const heading=await touchPage.locator("main h1").first().textContent().catch(()=>"");
     if(!heading||!heading.trim())errors.push("The "+animal.label+" page opened without its main heading.");
   }catch(error){errors.push("Android-style tap could not open "+animal.label+": "+error.message);}
 }
 await touchContext.close();


 // Verify the desktop Donate button opens a complete, accessible fundraiser dialog.
 await page.setViewportSize({width:1365,height:900});
 await page.goto(BASE,{waitUntil:"domcontentloaded",timeout:30000});
 const desktopDonate = page.locator(".sais-donate-button--desktop");
 if (await desktopDonate.count() !== 1 || !(await desktopDonate.isVisible())) {
   errors.push("Desktop Donate button is missing or not visible.");
 } else {
   await desktopDonate.click();
   const donateDialog = page.locator("#sais-donation-overlay");
   if (!(await donateDialog.isVisible())) errors.push("Desktop Donate button did not open the fundraiser popup.");
   const donateCopy = (await donateDialog.innerText()).toLowerCase();
   for (const phrase of ["since 2023","no paid memberships","hosting","domain renewals","animal information hub","every penny raised","sharing the fundraiser"]) {
     if (!donateCopy.includes(phrase)) errors.push("Fundraiser popup is missing key information: " + phrase + ".");
   }
   const paypalLink = donateDialog.locator(".sais-donation-primary");
   if (await paypalLink.getAttribute("href") !== "https://www.paypal.com/pools/c/9uo95OuMew") {
     errors.push("Fundraiser popup PayPal link is missing or incorrect.");
   }
   await page.keyboard.press("Escape");
   if (await donateDialog.isVisible()) errors.push("Escape did not close the fundraiser popup.");
   const focusRestored = await page.evaluate(() => document.activeElement?.classList.contains("sais-donate-button--desktop"));
   if (!focusRestored) errors.push("Closing the desktop fundraiser popup did not restore focus to Donate.");
   await desktopDonate.click();
   await donateDialog.locator(".sais-donation-close").click();
   if (await donateDialog.isVisible()) errors.push("Fundraiser popup close button did not close the popup.");
 }
 
 // Verify Donate is available in the mobile drawer and returns focus to the menu trigger.
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE,{waitUntil:"domcontentloaded",timeout:30000});
 const mobileMenuTrigger = page.locator(".sais-mobile-menu-button");
 await mobileMenuTrigger.click();
 const mobileDonate = page.locator(".sais-donate-button--drawer");
 if (await mobileDonate.count() !== 1) errors.push("Mobile drawer Donate button is missing.");
 else {
   await mobileDonate.scrollIntoViewIfNeeded();
   if (!(await mobileDonate.isVisible())) errors.push("Mobile drawer Donate button is not visible.");
   await mobileDonate.click();
   const mobileDonateDialog = page.locator("#sais-donation-overlay");
   if (!(await mobileDonateDialog.isVisible())) errors.push("Mobile drawer Donate button did not open the fundraiser popup.");
   if (await page.locator("#sais-mobile-drawer").getAttribute("aria-hidden") !== "true") {
     errors.push("Mobile drawer did not close when opening the fundraiser popup.");
   }
   await mobileDonateDialog.locator(".sais-donation-close").click();
   const menuFocusRestored = await page.evaluate(() => document.activeElement?.classList.contains("sais-mobile-menu-button"));
   if (!menuFocusRestored) errors.push("Closing the mobile fundraiser popup did not restore focus to the menu button.");
 }
 
// Test the shared search index, Enter submission, result routes and no-result message.
 await page.setViewportSize({ width: 1365, height: 900 });
 await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
 const searchInput = page.locator("#searchInput");
 const searchTests = [
   {term:"dog",label:"Dogs",path:"dog-information/"},
   {term:"cat",label:"Cats",path:"cat-information/"},
   {term:"horse",label:"Horses",path:"horse-information/"},
   {term:"books",label:"Recommended Animal Books",path:"animal-care-training/recommended-animal-books/"},
   {term:"training",label:"Training Tips & Advice",path:"animal-care-training/training-tips-advice/"},
   {term:"health",label:"Health & Safety for Pets",path:"animal-care-training/health-safety-for-pets/"},
   {term:"wildlife law",label:"Dogs, Wildlife & the Law",path:"animal-articles/dogs-wildlife-law/"},
   {term:"lost animal",label:"Lost & Found Animals",path:"animal-help-resources/lost-found-animals/"},
   {term:"boarding licence",label:"Boarding & Home Boarding Laws",path:"animal-articles/boarding-home-boarding-laws/"},
   {term:"hydrotherapy",label:"Benefits of Hydrotherapy",path:"animal-articles/benefits-of-hydrotherapy/"}
 ];
 for (const test of searchTests) {
   await searchInput.fill(test.term);
   await searchInput.press("Enter");
   const resultLink = page.locator("#searchResults a").filter({hasText:test.label});
   if (!(await resultLink.count())) errors.push("Search for '" + test.term + "' did not return " + test.label + ".");
   else {
     const href = await resultLink.first().getAttribute("href");
     if (!href || !href.includes(test.path)) errors.push("Search result route is wrong for '" + test.term + "': " + href);
   }
 }
 await searchInput.fill("sais-no-match-query-987654");
 await searchInput.press("Enter");
 const noResultText = (await page.locator("#searchResults").innerText()).toLowerCase();
 if (!noResultText.includes("no matching pages found")) errors.push("Search no-result message is missing or unclear.");
 await searchInput.fill("dog");
 await page.locator("#searchResults a").filter({hasText:/^Dogs$/}).click();
 await page.waitForURL("**/dog-information/**", {timeout:10000}).catch(() => errors.push("Search result did not open the Dog Information page."));

// Exercise the accessibility panel and Escape-to-close behaviour.
const accessibilityToggle = page.locator(".sais-accessibility-toggle");
if (await accessibilityToggle.count()) {
  await accessibilityToggle.click();
  const accessibilityPanel = page.locator("#sais-accessibility-panel");
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "true" || !(await accessibilityPanel.isVisible())) {
    errors.push("Accessibility settings panel did not open correctly.");
  }
  const largerText = accessibilityPanel.locator("button").filter({hasText:"Larger text"});
  const boldText = accessibilityPanel.locator("button").filter({hasText:"Bold text"});
  const highContrast = accessibilityPanel.locator("button").filter({hasText:"High contrast"});
  const resetAccess = accessibilityPanel.locator(".sais-accessibility-reset");
  await largerText.click();
  if (await page.locator("body").evaluate(node => node.style.zoom) !== "1.1") errors.push("Accessibility larger-text control did not change text scale.");
  await boldText.click();
  if (await boldText.getAttribute("aria-pressed") !== "true") errors.push("Accessibility bold-text control did not turn on.");
  await highContrast.click();
  if (await highContrast.getAttribute("aria-pressed") !== "true") errors.push("Accessibility high-contrast control did not turn on.");
  await resetAccess.click();
  if (await page.locator("body").evaluate(node => node.style.zoom) !== "" || await boldText.getAttribute("aria-pressed") !== "false" || await highContrast.getAttribute("aria-pressed") !== "false") {
    errors.push("Accessibility reset did not restore the default settings.");
  }
  await page.keyboard.press("Escape");
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "false" || !(await accessibilityPanel.isHidden())) {
    errors.push("Escape did not close the accessibility settings panel.");
  }
  await accessibilityToggle.click();
  await accessibilityPanel.locator(".sais-accessibility-close").click();
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "false") errors.push("Accessibility close button did not close the panel.");
  await accessibilityToggle.click();
  await page.mouse.click(650, 180);
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "false") errors.push("Clicking outside the accessibility panel did not close it.");
} else {
  errors.push("Accessibility settings control is missing.");
}

await page.setViewportSize({ width: 1365, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.keyboard.press("Tab");
const keyboardFocus = await page.evaluate(() => {
  const active = document.activeElement;
  const style = active ? getComputedStyle(active) : null;
  return !!active && active !== document.body && !!style && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
});
if (!keyboardFocus) warnings.push("Keyboard focus indicator could not be confirmed on the first tab stop.");

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 30000 }).catch(() => errors.push("Service worker did not take control of the page."));
// Confirm install metadata and the standalone presentation hooks are present.
const manifestResponse = await context.request.get(BASE + "manifest.json");
if (!manifestResponse.ok()) errors.push("PWA manifest did not load.");
else {
  const manifest = await manifestResponse.json();
  if (manifest.display !== "standalone") errors.push("PWA manifest is not configured for standalone display.");
  if (!manifest.start_url?.startsWith("/SAISAnimalInformationHubUK/")) errors.push("PWA start URL is outside the project scope.");
  if (!manifest.icons?.length) errors.push("PWA manifest has no install icons.");
}
const navigationCssLoaded = await page.evaluate(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes("assets/css/navigation-rebuild-2026.css")));
if (!navigationCssLoaded) errors.push("Rebuilt navigation stylesheet did not load on the live page.");
const appMeta = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute("content").catch(() => null);
if (appMeta !== "yes") warnings.push("Apple home-screen metadata was not found on the live page.");

const workerState = await page.evaluate(async () => ({
  controller: navigator.serviceWorker?.controller?.scriptURL || "",
  caches: await caches.keys()
}));
if (!workerState.caches.some(name => name === "sais-animal-hub-v51")) errors.push("Expected v51 offline cache was not created.");
const cachedNavigationCss = await page.evaluate(async () => (await caches.open("sais-animal-hub-v51")).match("/SAISAnimalInformationHubUK/assets/css/navigation-rebuild-2026.css"));
if (!cachedNavigationCss) errors.push("Rebuilt navigation stylesheet is missing from the offline cache.");
if (!workerState.controller) errors.push("No active service worker controller was found.");

const offlinePage = BASE + "dog-information/";
await page.goto(offlinePage, { waitUntil: "domcontentloaded" });
await context.setOffline(true);
try {
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  const offlineH1 = await page.locator("h1").first().textContent();
  if (!offlineH1?.trim()) errors.push("Offline reload did not display cached page content.");
} catch (error) {
  errors.push("Offline reload failed: " + error.message);
}
await context.setOffline(false);

const missingResponse = await page.goto(BASE + "this-page-should-not-exist-404-check/", { waitUntil: "domcontentloaded" });
if (!missingResponse || missingResponse.status() !== 404) errors.push("Custom 404 did not return HTTP 404.");
if (!(await page.locator("body").innerText()).toLowerCase().includes("not found")) errors.push("Custom 404 page content was not displayed.");

const urlsToCheck = [...internalLinks].filter(url => !url.includes("#"));
for (let i = 0; i < urlsToCheck.length; i += 12) {
  const batch = urlsToCheck.slice(i, i + 12);
  const results = await Promise.all(batch.map(async url => {
    try {
      const response = await context.request.get(url, { timeout: 15000 });
      return { url, status: response.status() };
    } catch (error) {
      return { url, error: error.message };
    }
  }));
  for (const result of results) {
    if (result.error || result.status >= 400) errors.push("Broken internal link: " + result.url + (result.status ? " (HTTP " + result.status + ")" : ""));
  }
}

for (const item of sameOriginFailures) errors.push(item);
const externalToCheck = [...externalLinks];
for (let i = 0; i < externalToCheck.length; i += 10) {
  const batch = externalToCheck.slice(i, i + 10);
  const results = await Promise.all(batch.map(async url => {
    try {
      const response = await context.request.get(url, { timeout: 8000 });
      return { url, status: response.status() };
    } catch (error) {
      return { url, error: error.message };
    }
  }));
  for (const result of results) {
    if (result.status === 404 || result.status === 410) errors.push("Broken external link: " + result.url + " (HTTP " + result.status + ")");
    else if (result.error || (result.status && result.status >= 400)) warnings.push("External link could not be fully verified: " + result.url + (result.status ? " (HTTP " + result.status + ")" : ""));
  }
}

await browser.close();
const averageLoad = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
console.log("Audited " + urls.length + " sitemap pages.");
console.log("Checked " + urlsToCheck.length + " unique internal links and " + externalToCheck.length + " external links.");
console.log("Average page load event: " + averageLoad + " ms.");
console.log("Warnings: " + warnings.length);
for (const warning of warnings) console.warn("WARNING:", warning);
console.log("Errors: " + errors.length);
for (const error of errors) console.error("ERROR:", error);
if (errors.length) process.exit(1);
