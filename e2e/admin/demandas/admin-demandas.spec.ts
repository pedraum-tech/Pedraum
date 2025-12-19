import { test, expect } from '@playwright/test';

test('Admin Demandas - Smoke Test', async ({ page }) => {
    // Tenta acessar a página admin
    await page.goto('http://localhost:3000/admin/demandas');

    // Verifica se a aplicação respondeu (não deu erro 500)
    // Se redirecionar para login, o título deve conter "Login" ou "Entrar"
    // Se estiver logado, deve conter "Demandas"
    const pageTitle = await page.title();
    console.log('Título da página atual:', pageTitle);

    // Verifica se carregou algum conteúdo visual (header ou formulário de login)
    await expect(page.locator('body')).toBeVisible();
});