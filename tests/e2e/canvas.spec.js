import { test, expect } from '@playwright/test';

test('add entities to the canvas and change name', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.keyboard.type('Clientes');

    await canvas.click();
});

test('add attributes to an entity', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();


    // Añadir un atributo primario
    await page.getByText('Entidad').first().click();
    await page.getByText('Añadir atributo').first().click();
    await page.getByText('Atributo primario').first().click();

    await page.getByText('Atributo', {exact: true}).first().dblclick();
    await page.keyboard.type('Atributo primario');
    await canvas.click();

    // Añadir un atributo secundario
    await page.getByText('Entidad').first().click();
    await page.getByText('Añadir atributo').first().click();
    await page.getByText('Atributo', {exact: true}).first().click();
});
