import { test, expect } from '@playwright/test';

test('Login nativo mantém a origem e autentica sem JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(baseURL + '/login');
    expect(response?.headers()['referrer-policy']).toBe('same-origin');
    await page.locator('#carteira').fill('900001');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.locator('#senha')).toBeVisible();
    await page.locator('#senha').fill('Admin-Teste-2026!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Administração da plataforma', level: 1, exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
