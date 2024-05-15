import { test, expect } from '@playwright/test';

test('add entities to the canvas', async ({ page }) => {
    await page.goto('/');
    // TODO: Improve this using better ids for the elements
    // This is the canvas
    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    await page.locator('rect').first().dblclick();
    await page.keyboard.type('Hello');

    await canvas.click();

});
