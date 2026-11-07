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
      const response = await fetch(BASE, { cache: "no-store" });
      const html = await response.text();
      if (response.ok && html.includes('rel="canonical"') && html.includes("Animal Information Hub UK")) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error("The latest GitHub Pages build did not become available within three minutes.");
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
const workerState = await page.evaluate(async () => ({
  controller: navigator.serviceWorker?.controller?.scriptURL || "",
  caches: await caches.keys()
}));
if (!workerState.caches.some(name => name === "sais-animal-hub-v30")) errors.push("Expected v29 offline cache was not created.");
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
