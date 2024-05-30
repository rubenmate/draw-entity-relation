import { test, expect } from '@playwright/test';

test('add entities to the canvas and change name', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    // await page.locator('rect').first().dblclick();
    await page.getByText('Entidad').first().dblclick();
    await page.keyboard.type('Clientes');

    await canvas.click();
});

test('add attributes to an entity', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();

    await page.getByText('Atributo', {exact: true}).first().dblclick();
    await page.keyboard.type('Clave');
    await canvas.click();

    // Añadir un atributo secundario
    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();
});

test('hide/show attributes', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg");
    await page.getByRole('img').first().dragTo(canvas);
    await canvas.click();

    // Add a primary attribute
    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();

    await page.getByText('Atributo', {exact: true}).first().dblclick();
    await page.keyboard.type('Clave');
    await canvas.click();

    await page.getByText('Entidad').first().dblclick();

    // Hide attributes
    await page.getByText('Ocultar atributos', {exact: true}).first().click();
    await page.waitForTimeout(1000); // Wait for 1 second after hiding attributes

    // Check if the added attribute is hidden
    await expect(page.getByText('Clave', {exact: true}).first()).not.toBeAttached()

    // Show attributes
    await page.getByText('Mostrar atributos', {exact: true}).first().click();
    await page.waitForTimeout(1000); // Wait for 2 seconds after showing attributes to ensure changes take effect

    // Check if the added attribute is shown
    await expect(page.getByText('Clave', {exact: true}).first()).toBeAttached()
});
