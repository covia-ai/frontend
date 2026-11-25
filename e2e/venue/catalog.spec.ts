import { expect, jobIds, test } from "../fixtures/real-venue";

test.describe("real venue: connection and catalog", () => {
  test("connects to the venue and shows its name", async ({ page, venueStatus }) => {
    await page.goto("/operations");

    await expect(page.getByRole("button", { name: "venue" })).toContainText(venueStatus.name!);
  });

  test("the catalog lists operations the venue serves", async ({ page, user }) => {
    // Ask the venue what it has, rather than hard-coding a catalog that drifts.
    const ops = (await user.api.workspace.read("v/test/ops")).value as Record<string, unknown>;
    expect(Object.keys(ops)).toContain("echo");

    // The list pages 24 at a time; search narrows it to the one we want.
    await page.goto("/operations");
    await page.getByRole("textbox", { name: "Type keyword to search…" }).fill("echo");
    await expect(page.getByText("v/test/ops/echo", { exact: true })).toBeVisible();
  });

  // AGENTS.md: page loads, polls and display read job-free. Checked on the
  // venue itself: a signed-in user browses, then the venue lists their jobs.
  test("browsing as a signed-in user creates no jobs on the venue", async ({ page, signIn, user }) => {
    await signIn();
    for (const path of ["/operations", "/operation/v/test/ops/echo", "/jobs", "/agents", "/"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    }

    expect(await jobIds(user)).toEqual([]);
  });
});
