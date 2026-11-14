import { chromium } from "playwright";

const BASE = "https://saiscontactunmonitored-dot.github.io/SAISAnimalInformationHubUK/";
const errors = [];
const warnings = [];
const sameOriginFailures = [];
const internalLinks = new Set();
const externalLinks = new Set();

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
      const currentNavigation = css.includes("Installed PWA uses the same desktop/mobile breakpoint");
      const currentOfflineCache = worker.includes("sais-animal-hub-v41");
      if (response.ok && cssResponse.ok && workerResponse.ok &&
          html.includes('rel="canonical"') && html.includes("Animal Information Hub UK") &&
          currentNavigation && currentOfflineCache) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error("The latest navigation rebuild and v41 offline cache did not become available within three minutes.");
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
    return {
      title, h1, description, canonical, ogDescription, ogUrl,
      imagesWithoutAlt, badLinks, navDuration,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      lang: document.documentElement.lang
    };
  });
  if (!result.title) errors.push("Missing document title: " + url);
  if (result.h1 !== 1) errors.push("Expected one H1, found " + result.h1 + ": " + url);
  if (!result.description) errors.push("Missing meta description: " + url);
  if (result.canonical !== url) errors.push("Canonical mismatch: " + url);
  if (result.ogDescription !== result.description) errors.push("Open Graph description mismatch: " + url);
  if (result.ogUrl !== url) errors.push("Open Graph URL mismatch: " + url);
  if (!result.lang) errors.push("Missing document language: " + url);
  if (result.imagesWithoutAlt) warnings.push(result.imagesWithoutAlt + " images without alt attributes: " + url);
  if (result.badLinks.length) errors.push("Root-relative links outside project prefix: " + url);
  if (result.overflow) warnings.push("Possible horizontal overflow at desktop viewport: " + url);
  if (result.navDuration) durations.push(result.navDuration);
  const anchors = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.href));
  for (const href of anchors) {
    try {
      const parsed = new URL(href);
      if (parsed.origin === new URL(BASE).origin && parsed.pathname.startsWith("/SAISAnimalInformationHubUK/")) {
        parsed.hash = "";
        internalLinks.add(parsed.href);
      } else if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        parsed.hash = "";
        externalLinks.add(parsed.href);
      }
    } catch {}
  }
}

const mobilePages = [BASE, BASE + "dog-information/", BASE + "cat-information/", BASE + "wildlife-information/", BASE + "contact/"];
for (const url of mobilePages) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) errors.push("Horizontal overflow at 390px mobile viewport: " + url);
}

// Tablet layout checks on representative routes.
for (const url of mobilePages) {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) errors.push("Horizontal overflow at 768px tablet viewport: " + url);
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

// Check the full desktop navigation and every dropdown at common laptop/desktop widths.
for (const width of [1200, 1280, 1365, 1649]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes("assets/css/navigation-rebuild-2026.css")));
  const desktopState = await page.evaluate(() => {
    const nav = document.querySelector(".sais-navigation-inner");
    const button = document.querySelector(".sais-mobile-menu-button");
    const rect = nav?.getBoundingClientRect();
    return {
      navVisible: !!nav && getComputedStyle(nav).display !== "none" && !!rect && rect.width > 0,
      buttonVisible: !!button && getComputedStyle(button).display !== "none" && button.getBoundingClientRect().width > 0,
      menus: document.querySelectorAll(".sais-menu").length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2
    };
  });
  if (!desktopState.navVisible) errors.push("Desktop navigation is hidden at " + width + "px.");
  if (desktopState.buttonVisible) errors.push("Hamburger is showing instead of desktop navigation at " + width + "px.");
  if (desktopState.menus !== 4) errors.push("Expected four desktop dropdowns at " + width + "px, found " + desktopState.menus + ".");
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
}

// Exercise the accessibility panel and Escape-to-close behaviour.
const accessibilityToggle = page.locator(".sais-accessibility-toggle");
if (await accessibilityToggle.count()) {
  await accessibilityToggle.click();
  const accessibilityPanel = page.locator("#sais-accessibility-panel");
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "true" || !(await accessibilityPanel.isVisible())) {
    errors.push("Accessibility settings panel did not open correctly.");
  }
  await page.keyboard.press("Escape");
  if (await accessibilityToggle.getAttribute("aria-expanded") !== "false" || !(await accessibilityPanel.isHidden())) {
    errors.push("Escape did not close the accessibility settings panel.");
  }
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
if (!workerState.caches.some(name => name === "sais-animal-hub-v41")) errors.push("Expected v41 offline cache was not created.");
const cachedNavigationCss = await page.evaluate(async () => (await caches.open("sais-animal-hub-v41")).match("/SAISAnimalInformationHubUK/assets/css/navigation-rebuild-2026.css"));
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
