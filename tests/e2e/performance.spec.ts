import { expect, test } from '@playwright/test';

function seededBuffer(length: number): Buffer {
  let state = 0x1234abcd;
  return Buffer.from(
    Array.from({ length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state >>> 24;
    }),
  );
}

test('reports Chrome frame cadence at representative city sizes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  for (const size of [128, 1024, 4096, 8192]) {
    await page.getByTestId('file-input').setInputFiles({
      name: `performance-${size}.bin`,
      mimeType: 'application/octet-stream',
      buffer: seededBuffer(size),
    });
    await page.getByRole('button', { name: 'Encode city' }).click();
    await expect(page.getByTestId('city-viewport')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    const buildingText = await page.locator('.city-counter strong').textContent();
    const framesPerSecond = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          function tick(now: number) {
            frames += 1;
            if (now - start < 1_000) requestAnimationFrame(tick);
            else resolve((frames * 1_000) / (now - start));
          }
          requestAnimationFrame(tick);
        }),
    );
    console.log(`${size} B | ${buildingText} buildings | ${framesPerSecond.toFixed(1)} rAF fps`);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
  }
});
