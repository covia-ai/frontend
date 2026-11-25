import { expect, test } from "../fixtures/real-venue";

test.describe("real venue: sign-in", () => {
  test("a new device key is generated, admitted by the venue, and stays signed in", async ({ page, venueStatus }) => {
    await page.goto("/operation/v/test/ops/echo");
    await expect(page.getByRole("button", { name: "venue" })).toContainText(venueStatus.name!);

    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.getByRole("menuitem", { name: /device key/i }).click();
    const dialog = page.getByRole("dialog", { name: "Device Key" });
    await dialog.getByRole("button", { name: /Generate a new key/ }).click();

    const ready = page.getByRole("dialog", { name: "Device Key Ready" });
    const keyHex = (await ready.getByRole("code").innerText()).trim();
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/);
    await ready.getByRole("button", { name: "Continue" }).click();

    // Signed in: the account menu replaces Sign In, and Run is enabled.
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "invoke operation" })).toBeEnabled();

    // A device key persists across a reload (bearer tokens would not).
    await page.reload();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  });
});
