import { expect, jobIds, test } from "../fixtures/real-venue";

const bare = (id: string) => id.replace(/^0x/, "");

test.describe("real venue: running operations", () => {
  test("echo runs on the venue, and the UI shows the job and its output", async ({ page, signIn, user }) => {
    await signIn();
    const marker = `e2e-${Date.now().toString(36)}`;
    await page.goto("/operation/v/test/ops/echo");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("textbox").fill(JSON.stringify({ greeting: marker }));
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect(form.getByText("COMPLETE")).toBeVisible();
    await expect(form.getByRole("cell", { name: `"${marker}"` })).toBeVisible();

    // The venue recorded exactly this job, for this user, with this output.
    const ids = await jobIds(user);
    expect(ids).toHaveLength(1);
    const job = await user.api.jobs.get(ids[0]);
    expect(job.metadata).toMatchObject({
      status: "COMPLETE",
      op: "v/test/ops/echo",
      input: { greeting: marker },
      output: { greeting: marker },
    });

    // The job link opens that job's page.
    await form.getByRole("link", { name: "View full job & receipt" }).click();
    await expect(page).toHaveURL(new RegExp(`/jobs/(0x)?${bare(ids[0])}$`));
    await expect(page.getByText("COMPLETE").first()).toBeVisible();
    await expect(page.getByText(marker).first()).toBeVisible();
  });

  test("a failing operation shows as failed, matching the venue", async ({ page, signIn, user }) => {
    await signIn();
    await page.goto("/operation/v/test/ops/error");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect(form.getByText("FAILED")).toBeVisible();
    const ids = await jobIds(user);
    expect(ids).toHaveLength(1);
    expect((await user.api.jobs.get(ids[0])).metadata.status).toBe("FAILED");
  });

  // #553 end to end: the venue validates input against the schema, so a
  // boolean sent as the string "true" would not reach it as a boolean.
  test("a boolean input reaches the venue as a JSON boolean", async ({ page, signIn, user }) => {
    await signIn();
    await page.goto("/operation/v/ops/agent/list");

    const form = page.getByRole("tabpanel", { name: "Run" });
    await form.getByRole("combobox", { name: "includeTerminated value" }).click();
    await page.getByRole("option", { name: "true", exact: true }).click();
    await form.getByRole("button", { name: "invoke operation" }).click();

    await expect(form.getByText("COMPLETE")).toBeVisible();
    const ids = await jobIds(user);
    expect(ids).toHaveLength(1);
    const job = await user.api.jobs.get(ids[0]);
    expect(job.metadata.status).toBe("COMPLETE");
    expect(job.metadata.input).toEqual({ includeTerminated: true });
  });

  test("the jobs page lists the user's job from the venue", async ({ page, signIn, user }) => {
    await signIn();
    // Create the job outside the UI, then check the UI finds it.
    await user.api.operations.run("v/test/ops/echo", { from: "sdk" });
    const [id] = await jobIds(user);

    await page.goto("/jobs");
    // Ids render middle-elided ("0x01a211…2771"), so match the row by its tail.
    const row = page.getByRole("button", { name: "Open job Echo Operation" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(bare(id).slice(-4));
    await expect(row.getByRole("cell", { name: "COMPLETE" })).toBeVisible();

    // A row opens the job in a side panel, with a link to its full page.
    await row.click();
    await expect(page.getByText("Job detail")).toBeVisible();
    await page.getByRole("link", { name: "Open full page" }).click();
    await expect(page).toHaveURL(new RegExp(`/job/(0x)?${bare(id)}$`));
    await expect(page.getByText('"sdk"').first()).toBeVisible();
  });
});
