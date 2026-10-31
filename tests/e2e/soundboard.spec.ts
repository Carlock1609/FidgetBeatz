import AxeBuilder from "@axe-core/playwright";
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
  await page
    .getByRole("list", { name: "FX sounds" })
    .getByRole("button", { name: /^Coin/ })
    .first()
    .click();
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
  await expect(pads(page).first()).toHaveAccessibleName("Missing sound, Kick");
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

/* ------------------------------------------------------------------------------------------ */
/* Accessibility (Stage 7): axe scans, keyboard-only use and reduced motion.                  */
/* ------------------------------------------------------------------------------------------ */

/** Waits for CSS/WAAPI animations (sheet slide-in, chrome fade) so axe sees final colors. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
  // Motion's JS-driven pad entrance runs ~0.5 s and isn't in getAnimations().
  await page.waitForTimeout(600);
}

/**
 * Runs axe (WCAG 2.2 A/AA + best practices) and fails with a readable list of violations.
 * With a modal open, the shell is deliberately inert, so the page-level "has a main/h1/every
 * node in a landmark" rules describe the hidden page rather than the dialog; they're skipped
 * there (the same page is scanned without the overlay in the other cases).
 */
async function expectNoAxeViolations(page: Page) {
  await settle(page);
  const overlay = await page
    .locator('[role="dialog"], [role="alertdialog"], [role="menu"]')
    .count();
  let axe = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
    "best-practice",
  ]);
  if (overlay) axe = axe.disableRules(["region", "landmark-one-main", "page-has-heading-one"]);
  const { violations } = await axe.analyze();
  expect(
    violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
  ).toEqual([]);
}

test.describe("axe", () => {
  test("play view, across accent colors", async ({ page }) => {
    await open(page);
    await expectNoAxeViolations(page);
    // Blue and violet are the lowest-contrast accents and pad colors.
    for (const preset of ["Bass", "Piano"]) {
      await page.getByRole("button", { name: preset, exact: true }).click();
      await expectNoAxeViolations(page);
    }
  });

  test("focus mode", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Focus mode" }).click();
    await expect(page.getByRole("button", { name: "Exit focus mode" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("edit mode and the pad editor sheet", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Edit pads" }).click();
    await expectNoAxeViolations(page);
    await page.getByTestId("edit-pad").first().click();
    await expect(page.getByRole("dialog", { name: "Edit pad" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("dialog").locator("button[aria-expanded]").click();
    await expect(page.getByRole("list", { name: /sounds$/ })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByTestId("edit-pad").first().click();
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("profile menu and dialogs", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: /^Profile:/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("menuitem", { name: "New profile…" }).click();
    await expect(page.getByRole("dialog", { name: "New profile" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^Profile:/ }).click();
    await page.getByRole("menuitem", { name: /^Rename/ }).click();
    await expect(page.getByRole("dialog", { name: "Rename profile" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^Profile:/ }).click();
    await page.getByRole("menuitem", { name: "Delete profile…" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("version sheet", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: /^Version/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("keyboard only", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "keyboard shortcuts and focus rings target desktop");
  });

  test("number and letter keys play pads", async ({ page }) => {
    await open(page);
    await page.keyboard.press("2");
    await expect(display(page)).toHaveAttribute("data-last-sound", "snare-crisp-01");
    await page.keyboard.press("q");
    await expect(display(page)).toContainText("PAD 11/12");
  });

  test("Tab reaches every control with a visible focus ring", async ({ page }) => {
    await open(page);
    await settle(page);
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(async () => {
        // Rings fade in over ~150 ms; read them once transitions finish.
        await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // The ring is either on the element or (version chip) on its inner span.
        const ringed = [el, ...Array.from(el.children)].some((node) => {
          const cs = getComputedStyle(node);
          const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
          const ring = cs.boxShadow !== "none" && /0px 0px 0px (2|3|4)px/.test(cs.boxShadow);
          return outline || ring;
        });
        return {
          name: el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName,
          ringed,
        };
      });
      if (!info) continue;
      expect(info.ringed, `focus ring on "${info.name}"`).toBe(true);
      if (seen.includes(info.name)) break;
      seen.push(info.name);
    }
    for (const name of [
      "Focus mode",
      "Edit pads",
      "Volume",
      "Kick",
      "Version v0.1.0, what's new",
    ]) {
      expect(seen).toContain(name);
    }
  });

  test("Space plays the focused pad", async ({ page }) => {
    await open(page);
    await pads(page).nth(2).focus();
    await page.keyboard.press("Space");
    await expect(display(page)).toContainText("PAD 03/12");
  });

  test("edit mode: Enter selects a pad, Esc closes the sheet and returns focus", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Edit pads" }).focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("edit-pad").nth(1).focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Edit pad" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Pad 2 of 12");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("edit-pad").nth(1)).toBeFocused();
  });

  test("edit mode: M and the arrow keys move a pad", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Edit pads" }).click();
    await page.getByTestId("edit-pad").first().focus();
    // dnd-kit measures between keys; its screen-reader announcements mark each step.
    const announcer = page.locator('[id^="DndLiveRegion"]');
    await page.keyboard.press("m");
    await expect(page.locator("[data-dragging]")).toHaveCount(1);
    // Give the sensor two frames to measure the droppable rects before moving.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    await page.keyboard.press("ArrowRight");
    await expect(announcer).toHaveText("Kick is over position 2.");
    await page.keyboard.press("m");
    await expect(announcer).toHaveText("Kick dropped at position 2.");
    await expect(page.getByTestId("edit-pad").nth(1)).toHaveAccessibleName("Kick. Edit pad");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Save" }).focus();
    await page.keyboard.press("Enter");
    await expect(pads(page).nth(0)).toHaveAccessibleName("Snare");
    await expect(pads(page).nth(1)).toHaveAccessibleName("Kick");
  });
});

/**
 * Samples the computed transform of `selector` (and its parent) every frame for `ms`,
 * returning every distinct value seen. Runs in the page so nothing is missed between steps.
 */
function sampleTransforms(page: Page, selector: string, ms: number, act?: string) {
  return page.evaluate(
    async ({ selector, ms, act }) => {
      const seen = new Set<string>();
      const el = () => document.querySelector<HTMLElement>(selector);
      if (act === "pointerdown") {
        el()?.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }),
        );
      }
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const node = el();
        if (node) {
          seen.add(getComputedStyle(node).transform);
          if (node.parentElement) seen.add(getComputedStyle(node.parentElement).transform);
        }
        await new Promise(requestAnimationFrame);
      }
      return [...seen];
    },
    { selector, ms, act },
  );
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a hit flashes without scaling the pad", async ({ page }) => {
    await open(page);
    await settle(page);
    const first = '[data-testid="pad"]';
    expect(await sampleTransforms(page, first, 250, "pointerdown")).toEqual(["none"]);
    await expect(display(page)).toHaveAttribute("data-last-sound", "kick-punchy-01");
  });

  test("pads don't scale in when the board changes", async ({ page }) => {
    await open(page);
    await settle(page);
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    expect(await sampleTransforms(page, '[data-testid="pad"]', 400)).toEqual(["none"]);
  });

  test("edit mode: the selected and picked-up pad don't lift or scale", async ({
    page,
    isMobile,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Edit pads" }).click();
    // A pad is selected while its editor sheet is open.
    await page.getByTestId("edit-pad").first().click();
    await expect(page.getByTestId("edit-pad").first()).toHaveAttribute("data-selected");
    const selected = '[data-testid="edit-pad"][data-selected]';
    expect(await sampleTransforms(page, selected, 200)).toEqual(["none"]);
    if (isMobile) return;
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByTestId("edit-pad").first().focus();
    await page.keyboard.press("m");
    await expect(page.locator("[data-dragging]")).toHaveCount(1);
    const pad = await page
      .locator("[data-dragging]")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(pad).toBe("none");
    await page.keyboard.press("Escape");
  });
});

test("without reduced motion a hit does scale the pad (control for the tests above)", async ({
  page,
}) => {
  await open(page);
  await settle(page);
  const seen = await sampleTransforms(page, '[data-testid="pad"]', 250, "pointerdown");
  expect(seen.some((t) => t !== "none")).toBe(true);
});
