const puppeteer = require("puppeteer-extra");
const json = require("./pitch-decks-pdf2.json");
const path = require("path");
const downloadPath = path.resolve("./download");

async function download() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  for (let i = 0; i < json.length; i++) {
    await page.goto(json[i].pdf, { waitUntil: "load", timeout: 0 });
    // Download logic goes here
    await page._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    await page.waitForTimeout(5000);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
  }
}

download();
