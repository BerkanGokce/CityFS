import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('rejects an oversized file with a specific actionable message', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({
    name: 'large-photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(3_257_605),
  });
  await expect(page.getByRole('status')).toContainText('3.11 MiB');
  await expect(page.getByRole('status')).toContainText('files up to 8 KiB');
  await expect(page.getByRole('button', { name: 'File too large' })).toBeDisabled();
});

test('upload → encode → inspect → export → reset → import → decode', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Your bytes.')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles({
    name: 'e2e.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('CityFS end-to-end recovery'),
  });
  await page.getByRole('button', { name: 'Encode city' }).click();
  await expect(page.getByTestId('city-viewport')).toBeVisible();
  await expect(page.getByText(/buildings carry the envelope/i)).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export city' }).click();
  const cityDownload = await download;
  const cityPath = await cityDownload.path();
  expect(cityPath).not.toBeNull();
  const exported = JSON.parse(await readFile(cityPath!, 'utf8')) as Record<string, unknown>;
  expect(exported).not.toHaveProperty('payload');
  expect((exported.buildings as Array<Record<string, unknown>>)[0]).not.toHaveProperty('byteValue');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText('Your bytes.')).toBeVisible();
  await page.getByTestId('city-import-input').setInputFiles(cityPath!);
  await expect(page.getByRole('status')).toContainText('SHA-256 verified');

  const recoveredDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Decode file' }).click();
  const recovered = await recoveredDownload;
  expect(recovered.suggestedFilename()).toBe('e2e.txt');
  expect(await readFile((await recovered.path())!, 'utf8')).toBe('CityFS end-to-end recovery');
});
