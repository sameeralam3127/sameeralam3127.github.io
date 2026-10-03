import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const deepDives = readdirSync("dist/projects", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => `/projects/${d.name}/`);

/** Collects console errors and uncaught exceptions for the life of the page. */
const trackErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
};

test.describe("pages", () => {
  for (const path of ["/", ...deepDives]) {
    test(`${path} loads without console errors`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("unknown paths get the terminal-style 404", async ({ page }) => {
    const response = await page.goto("/definitely/not/here");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
    await expect(page.getByText("/definitely/not/here")).toBeVisible();
  });

  test("has no horizontal overflow", async ({ page }) => {
    for (const path of ["/", ...deepDives]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("in-page anchors scroll to their section", async ({ page }) => {
    await page.goto("/#contact");
    await expect(page.getByRole("heading", { name: "Contact", level: 2 })).toBeInViewport();
  });
});

test.describe("terminal", () => {
  test("runs typed commands with tab completion and history", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    const input = page.getByLabel("Terminal command");
    const log = page.getByRole("log", { name: "Terminal output" });

    await input.fill("kubectl get sk");
    await input.press("Tab");
    await expect(input).toHaveValue("kubectl get skills ");
    await input.press("Enter");
    await expect(log).toContainText("orchestration");
    await expect(log).toContainText("NAMESPACE");

    await input.press("ArrowUp");
    await expect(input).toHaveValue("kubectl get skills");

    await input.fill("nope");
    await input.press("Enter");
    await expect(log).toContainText("command not found: nope");
    expect(errors).toEqual([]);
  });

  test("command chips run commands for non-technical visitors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ansible-playbook hire-me.yml" }).click();
    await expect(page.getByRole("log", { name: "Terminal output" })).toContainText("PLAY RECAP");
  });
});

test.describe("interactive features", () => {
  test("command palette navigates to a deep dive", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut is a desktop feature");
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const search = page.getByRole("combobox", { name: "Search commands" });
    await expect(search).toBeFocused();
    await search.fill("linuxvitals");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/projects\/linuxvitals\/$/);
  });

  test("incident simulator reaches an outcome", async ({ page }) => {
    await page.goto("/#incident");
    await page.getByRole("button", { name: "acknowledge page →" }).first().click();
    for (let step = 0; step < 6; step++) {
      if (await page.getByText("what to take away").isVisible()) break;
      await page
        .getByRole("group", { name: "what do you do?" })
        .getByRole("button")
        .first()
        .click();
    }
    await expect(page.getByText("what to take away")).toBeVisible();
    await expect(page.getByRole("button", { name: "replay" })).toBeVisible();
  });

  test("theme toggle persists across reloads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("architecture diagram shows details for the selected step", async ({ page }) => {
    await page.goto("/#architecture");
    await page
      .getByRole("button", { name: /fetch data/ })
      .first()
      .click();
    await expect(page.locator("[data-detail-label]").first()).toHaveText("fetch data");
  });
});
