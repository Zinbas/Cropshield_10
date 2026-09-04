import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin.showcase@cropshield.app";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "CropShieldAdmin!2026";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  const signIn = page.getByText("Already have an account? Sign in", { exact: true });
  if (await signIn.isVisible().catch(() => false)) await signIn.click();
  const emailInput = page.getByLabel(/email/i).first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /sign in/i }).last().click();
    await page.waitForURL(/\/(admin|farmer)\/dashboard/);
  }
  await expect(page.locator("body")).not.toContainText("Something went wrong");
}

test.describe("CropShield regional map", () => {
  test("renders the aggregated Nashik risk zone for all 10 showcase farmers", async ({ page }) => {
    await signIn(page, adminEmail, adminPassword);
    await page.goto("/admin/dashboard");

    await expect(page.getByRole("heading", { name: "Admin Panel" })).toBeVisible();
    const mapCard = page.locator(".map-card");
    await expect(mapCard).toBeVisible({ timeout: 15_000 });
    await mapCard.scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Regional Risk Heatmap" })).toBeVisible();
    await expect(page.getByText(/10 approved scans/i).first()).toBeVisible();
    await expect(page.getByText(/10 farmers/i).first()).toBeVisible();
    await expect(page.getByText(/Maharashtra · Nashik/i).first()).toBeVisible();

    // The map component exposes its risk overlay as a labelled region even when
    // Google Maps tiles are unavailable in CI/headless mode.
    await expect(page.getByLabel(/visible regional risk circles/i)).toBeVisible();
    await expect(page.getByText(/high risk|moderate risk|low risk/i).first()).toBeVisible();
  });
});

test.describe("CropShield scan history", () => {
  test("shows seeded scan history and supports expanding a scan record", async ({ page }) => {
    await signIn(page, adminEmail, adminPassword);
    await page.goto("/admin/scans");

    await expect(page.getByRole("heading", { name: "Scan Review" })).toBeVisible();
    const entries = page.locator(".activity-list > div");
    await expect(entries.first()).toBeVisible();
    await expect(entries).toHaveCount(10);
    await expect(page.getByText(/confidence/i).first()).toBeVisible();
    await expect(page.getByText(/approved scan assessments/i)).toBeVisible();
  });
});
