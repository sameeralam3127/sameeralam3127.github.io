/**
 * Renders public/resume-export.html (the printable HTML twin of Resume.docx)
 * to public/Sameer-Alam-Resume.pdf with headless Chromium.
 *
 *   npm run resume:pdf     (after editing resume-export.html; commit the PDF)
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { log, ROOT } from "./lib.ts";

const source = join(ROOT, "public", "resume-export.html");
const target = join(ROOT, "public", "Sameer-Alam-Resume.pdf");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: target,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
  });
  log("resume", `wrote ${target}`);
} finally {
  await browser.close();
}
