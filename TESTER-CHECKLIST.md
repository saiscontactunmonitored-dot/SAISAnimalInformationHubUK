# Animal Information Hub UK — Tester Pack

## Purpose
Check the live Hub as a visitor would use it. Record the page URL, device/browser, steps taken, expected result, actual result, and a screenshot for every issue.

## Test environment
- Live site: https://saiscontactunmonitored-dot.github.io/SAISAnimalInformationHubUK/
- Test on a desktop browser and a mobile browser.
- Test at normal zoom first, then check browser zoom at 200%.
- Record the date and browser version.

## Release-blocking checks
- [ ] Homepage loads without a blank screen or visible error.
- [ ] Shared header, navigation and footer appear once on every page.
- [ ] The same info-logo.png is used in the header and browser favicon.
- [ ] Navigation dropdowns open by mouse, touch and keyboard.
- [ ] Mobile navigation shows each parent section once and all expected child links.
- [ ] The accessibility control is a single, non-wrapping icon button at the bottom-left; opening it exposes usable text-size, bold and contrast controls.
- [ ] Accessibility settings can be closed by the close button, outside tap and Escape; keyboard focus remains usable.
- [ ] The back-to-top control is a separate icon button at the bottom-right and does not overlap content or the footer.
- [ ] Escape closes an open dropdown; clicking elsewhere closes it.
- [ ] Every navigation link opens the correct page.
- [ ] Search returns relevant results for dog, cat, horse, books, training, health, wildlife, lost and found, boarding and hydrotherapy.
- [ ] Search works while typing and after pressing Enter.
- [ ] Search result links open the correct pages.
- [ ] No-result searches show a helpful message.
- [ ] All animal pages load and display their content.
- [ ] No page contains the former Small & Mighty Pets contributor name; relevant training pages use the exact credit wording “Credit goes to Sam”.
- [ ] Repeated “About these guides” notices are reduced to a short source and general-information note, while safety warnings and source links remain intact.
- [ ] All care, training, books, help, resources and article pages load.
- [ ] Contact links and forms behave as described on the page.
- [ ] Privacy, terms, editorial standards and accessibility pages load.
- [ ] 404 page is helpful and its navigation works.
- [ ] Offline page is available when offline support is expected.
- [ ] No horizontal scrolling at common mobile widths.
- [ ] Text remains readable at 200% browser zoom.
- [ ] Keyboard users can reach and operate all controls.
- [ ] Images load and meaningful images have suitable alternative text.
- [ ] No broken internal links or missing assets.
- [ ] No uncaught JavaScript errors in the browser console.

## Search test cases
| Search term | Expected destination |
|---|---|
| dog | Dog information |
| puppy training | Training tips / dog information |
| books | Recommended Animal Books |
| horse | Horse information |
| cat | Cat information |
| wildlife law | Dogs, Wildlife & the Law |
| lost animal | Lost & Found Animals |
| hydrotherapy | Benefits of Hydrotherapy |
| boarding licence | Boarding & Home Boarding Laws |

## Page-by-page test record
For every HTML page in the repository:
- [ ] Page opens directly from its URL.
- [ ] Header/logo/navigation are present and usable.
- [ ] Main content is present and not obscured.
- [ ] Footer is present and links work.
- [ ] Page title and browser tab title are appropriate.
- [ ] Images, buttons, links and interactive elements work.
- [ ] No console errors.

## Defect reporting template
- Page URL:
- Device and browser:
- Screen size:
- Steps to reproduce:
- Expected result:
- Actual result:
- Severity: Critical / High / Medium / Low
- Screenshot or screen recording:

## Severity guide
- Critical: site/page unavailable, navigation/search unusable, data/security issue.
- High: major feature broken or important content inaccessible.
- Medium: a page element or non-critical interaction is faulty.
- Low: visual inconsistency, typo or minor spacing issue.

## Sign-off
Do not mark a check as passed unless it has been tested on the live deployed website. Record unresolved defects and retest every fix.
