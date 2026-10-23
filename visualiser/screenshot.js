import { chromium } from "playwright";

const browser = await chromium.launch({viewport: {width: 2000, height : 1000}});
const context = await browser.newContext({viewport: {width: 2000, height : 1000}});

const page = await context.newPage();

await page.goto("http://localhost:3000/implementation-levels", {waitUntil: "networkidle0"});

await page.waitForSelector('[data-id="level-grids"]')

await page.waitForTimeout(2000) // give the element 5 seconds to load

const selectors = await page.locator('[data-id="level-grids"]').all() // get all images

console.log(`elements found: ${selectors.length}`)

for(let i=0; i<selectors.length; i++) {
    const podName = await selectors[i].getAttribute("data-pod")
    const productName = await selectors[i].getAttribute("data-product")
    const levelName = await selectors[i].getAttribute("data-level")
    const date = new Date().toISOString().split("T")[0];
    await selectors[i].screenshot({path: `screenshots/${podName}-${productName}-${levelName}-${date}.png`})
}

await browser.close();
