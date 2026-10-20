import { expect, test, type Page } from "@playwright/test";

/**
 * Playwright can't hear audio. The sound display only updates from the engine's trigger
 * event, which fires after `source.start()`, so `data-last-sound` proves playback started.
 */
const display = (page: Page) => page.getByTestId("sound-display");
const pads = (page: Page) => page.getByTestId("pad");

async function open(page: Page) {
  // Stats are external and optional: block anything off-origin so tests never depend on it.
  await page.route(/^(?!http:\/\/localhost:4173).*/, (route) => route.abort());
  await page.goto("/");
  await expect(pads(page)).toHaveCount(12);
}

test("tapping a pad plays its sound and updates the display", async ({ page }) => {
  await open(page);
  await pads(page).nth(1).dispatchEvent("pointerdown", { pointerType: "touch", button: 0 });
  await expect(display(page)).toHaveAttribute("data-last-sound", "snare-crisp-01");
  await expect(display(page)).toContainText("Crisp Snare");
  await expect(display(page)).toContainText("PAD 02/12");
});

test("rapid repeated and overlapping taps keep working", async ({ page }) => {
  await open(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 12; i++) {
    await pads(page)
      .nth(i % 3)
      .dispatchEvent("pointerdown", { pointerType: "touch", button: 0 });
  }
  await expect(display(page)).toHaveAttribute("data-last-sound", "hihat-closed-01");
  expect(errors).toEqual([]);
});

test("edit mode: add a pad, save, and it persists across reload", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit pads" }).click();
  await expect(page.getByText("Edit mode")).toBeVisible();
  await page.getByRole("button", { name: "Add pad" }).click();
  // The new pad is selected and its editor opens.
  await expect(page.getByRole("dialog", { name: "Edit pad" })).toBeVisible();
  await page.getByRole("button", { name: "Choose a sound" }).click();
  await page.getByRole("tab", { name: "FX" }).click();
  await page.getByRole("option").filter({ hasText: "Coin" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(pads(page)).toHaveCount(13);
  await expect(pads(page).last()).toHaveAccessibleName("Coin");
  await page.reload();
  await expect(pads(page)).toHaveCount(13);
  await expect(pads(page).last()).toHaveAccessibleName("Coin");
});

test("edit mode: cancel with changes asks before discarding", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit pads" }).click();
  await page.getByTestId("edit-pad").first().click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("edit-pad")).toHaveCount(11);
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(pads(page)).toHaveCount(12);
});

test("edit mode: move buttons reorder pads", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit pads" }).click();
  await page.getByTestId("edit-pad").first().click();
  await page.getByRole("button", { name: "Move pad later" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(pads(page).nth(0)).toHaveAccessibleName("Snare");
  await expect(pads(page).nth(1)).toHaveAccessibleName("Kick");
});

test("switching presets updates the board, and customized boards confirm first", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Piano", exact: true }).click();
  await expect(display(page)).toContainText("Piano");
  await expect(pads(page).first()).toHaveAccessibleName("C");

  // Customize, then switching asks first; reset returns to the preset.
  await page.getByRole("button", { name: "Edit pads" }).click();
  await page.getByRole("button", { name: "Add pad" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(pads(page)).toHaveCount(13);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Reset" }).click();
  await expect(pads(page)).toHaveCount(12);
});

test("profiles switch, persist, and are capped at five", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await page.getByRole("menuitemradio", { name: "My Synthwave" }).click();
  await expect(pads(page)).toHaveCount(16);
  await expect(display(page)).toContainText("Synthwave");

  for (const name of ["Four", "Five"]) {
    await page.getByRole("button", { name: /^Profile:/ }).click();
    await page.getByRole("menuitem", { name: "New profile…" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("radio", { name: "Beatbox" }).click();
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("button", { name: `Profile: ${name}` })).toBeVisible();
  }
  await expect(pads(page)).toHaveCount(9);
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await expect(page.getByRole("menuitem", { name: /max 5/ })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(page.getByRole("button", { name: "Profile: Five" })).toBeVisible();
  await expect(pads(page)).toHaveCount(9);
});

test("corrupted storage is backed up and the board still works", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("fidgetbeatz:v1", "{definitely not json");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await open(page);
  await expect(page.getByTestId("storage-notice")).toContainText("repaired");
  const backups = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("fidgetbeatz:backup:")),
  );
  expect(backups).toHaveLength(1);
  await pads(page).first().dispatchEvent("pointerdown", { pointerType: "touch", button: 0 });
  await expect(display(page)).toHaveAttribute("data-last-sound", "kick-punchy-01");
});

test("a pad with an unknown sound shows the missing state", async ({ page }) => {
  await page.goto("/");
  await expect(pads(page)).toHaveCount(12);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("fidgetbeatz:v1")))
    .not.toBeNull();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("fidgetbeatz:v1")!);
    state.profiles[0].pads[0].soundId = "deleted-sound-01";
    localStorage.setItem("fidgetbeatz:v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(pads(page).first()).toHaveAccessibleName("Kick, missing sound");
  await expect(pads(page).first()).toContainText("Missing sound");
});

test("stats show the offline state and nothing else breaks", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("stats")).toHaveAttribute("data-status", "offline");
  await expect(page.getByTestId("stats")).toContainText("— jamming now");
});

test("focus mode hides the chrome and exits", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Focus mode" }).click();
  await expect(display(page)).toBeHidden();
  await expect(pads(page)).toHaveCount(12);
  await page.getByRole("button", { name: "Exit focus mode" }).click();
  await expect(display(page)).toBeVisible();
});

test("the version chip opens the version sheet", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Version/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("FidgetBeatz v0.1.0");
  await expect(sheet).toContainText("What’s new");
});

test("edit mode: dragging a pad reorders it (mouse)", async ({ page, isMobile }) => {
  test.skip(isMobile, "touch drag uses a long-press sensor; covered by the move buttons on mobile");
  await open(page);
  await page.getByRole("button", { name: "Edit pads" }).click();
  const first = page.getByTestId("edit-pad").nth(0);
  const third = page.getByTestId("edit-pad").nth(2);
  const from = (await first.boundingBox())!;
  const to = (await third.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByTestId("edit-pad").nth(2)).toHaveAccessibleName("Kick. Edit pad");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // dnd-kit swallows clicks for 50 ms after a drop (so the drop doesn't "click" the pad).
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(pads(page).nth(2)).toHaveAccessibleName("Kick");
});
