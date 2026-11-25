import { expect, operationMeta, problem, test } from "./fixtures/mock-venue";

// A small catalog: two adapters, and one operation whose input mixes types.
const catalog = {
  "v/ops": {
    json: { assoc: operationMeta("JSON Assoc", "json:assoc") },
    test: {
      flags: operationMeta("Flags", "test:flags", {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          count: { type: "integer" },
          label: { type: "string" },
        },
        required: ["count"],
      }),
    },
  },
};

test.describe("operations catalog", () => {
  test("lists the venue's operations", async ({ page, venue }) => {
    venue.setValues(catalog);
    await page.goto("/operations");

    await expect(page.getByText("v/ops/json/assoc")).toBeVisible();
    await expect(page.getByText("v/ops/test/flags")).toBeVisible();
  });

  // AGENTS.md: page loads, polls and display read job-free.
  test("loading the catalog creates no jobs", async ({ page, venue }) => {
    venue.setValues(catalog);
    await page.goto("/operations");
    await expect(page.getByText("v/ops/json/assoc")).toBeVisible();

    expect(venue.invocations()).toEqual([]);
  });

  test("opening an operation shows its input form without running it", async ({ page, venue }) => {
    venue.setValues(catalog);
    await page.goto("/operations");
    await page
      .getByText("v/ops/test/flags")
      .locator("xpath=ancestor::*[.//button[normalize-space()='Open']][1]")
      .getByRole("button", { name: "Open", exact: true })
      .click();

    await expect(page).toHaveURL(/\/operation\/v\/ops\/test\/flags$/);
    await expect(page.getByRole("tabpanel", { name: "Run" })).toBeVisible();
    expect(venue.invocations()).toEqual([]);
  });
});

test.describe("running an operation", () => {
  test("signed out, the form asks you to sign in instead of running", async ({ page, venue }) => {
    venue.setValues(catalog);
    await page.goto("/operation/v/ops/test/flags");

    await expect(page.getByRole("button", { name: "Sign in to run operations" })).toBeVisible();
    await expect(page.getByRole("button", { name: "invoke operation" })).toHaveCount(0);
  });

  // Regression test for #553: booleans and integers must reach the venue as
  // JSON values, not as the strings the form controls hold.
  test("sends boolean and integer inputs as real JSON values", async ({ page, venue }) => {
    await venue.signIn();
    venue.setValues(catalog);
    await page.goto("/operation/v/ops/test/flags");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("combobox", { name: "enabled value" }).click();
    await page.getByRole("option", { name: "true", exact: true }).click();
    await form.getByRole("spinbutton").fill("3");
    await form.getByRole("textbox").fill("hello");
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect.poll(() => venue.invocations().length).toBe(1);
    const [invoke] = venue.invocations();
    expect(invoke.body).toMatchObject({
      operation: expect.stringContaining("v/ops/test/flags"),
      input: { enabled: true, count: 3, label: "hello" },
    });
  });

  test("shows the job's output when it completes", async ({ page, venue }) => {
    await venue.signIn();
    venue.setValues(catalog);
    venue.onInvoke(() => ({ status: "COMPLETE", output: { greeting: "mock-output-7f3a" } }));
    await page.goto("/operation/v/ops/test/flags");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("spinbutton").fill("1");
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect(page.getByText("mock-output-7f3a").first()).toBeVisible();
  });

  test("shows a venue failure to the user", async ({ page, venue }) => {
    await venue.signIn();
    venue.setValues(catalog);
    venue.on("POST", "/api/v1/invoke", () => problem(500, "adapter exploded"));
    await page.goto("/operation/v/ops/test/flags");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("spinbutton").fill("1");
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect(page.getByText(/adapter exploded/).first()).toBeVisible();
  });
});
