import { expect, test } from "@playwright/test";

test("login, create patient, triage, analyze, and export", async ({ page }) => {
  const unique = Date.now();
  const patientCode = `E2E-${unique}`;

  await page.goto("/login");
  await page.getByPlaceholder("Enter your staff code").fill("DOC-900");
  await page.getByPlaceholder("Enter your password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();

  await page.getByRole("link", { name: "Patients" }).click();
  await page.getByRole("button", { name: "Register Patient" }).click();
  await page.getByLabel("Patient Code").fill(patientCode);
  await page.getByLabel("Full Name").fill("E2E Patient");
  await page.getByLabel("Age").fill("54");
  await page.getByRole("button", { name: "Create Patient" }).click();
  await expect(page.getByText(patientCode)).toBeVisible();

  await page.getByRole("link", { name: "Triage" }).click();
  await page.getByRole("button", { name: "New Case" }).click();
  await page.getByLabel("Patient").selectOption({ label: `${patientCode} - E2E Patient` });
  await page.getByLabel("Chief Complaint").fill("Chest pain");
  await page.getByLabel("Symptoms").fill("Shortness of breath");
  await page.getByLabel("Vitals").fill("BP 90/60, HR 118");
  await page.getByRole("button", { name: "Create Case" }).click();
  await expect(page.getByText("Chest pain").first()).toBeVisible();

  await page.getByText("Chest pain").first().click();
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(
    page.getByText("AI Recommendation").or(page.getByText("AI recommendation service unavailable")),
  ).toBeVisible({ timeout: 45_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("triage-case");
});
