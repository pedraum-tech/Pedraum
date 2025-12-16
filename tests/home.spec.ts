import { test, expect } from '@playwright/test';

test.describe('Home Page Smoke Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    });

    test('Deve carregar as seções principais da Home', async ({ page }) => {
        // 1. Verifica se o Hero carregou (usando a classe wrapper que você criou)
        const heroSection = page.locator('.home-hero-section');
        await expect(heroSection).toBeVisible();

        // 2. Verifica se a seção de Demandas existe
        const demandasSection = page.locator('.demandas-section');
        await expect(demandasSection).toBeVisible();

        // 3. Verifica se a seção de Depoimentos existe
        const testimonialsSection = page.locator('.testimonials-section');
        await expect(testimonialsSection).toBeVisible();
    });

    test('Não deve haver erros de console críticos', async ({ page }) => {
        // Esse teste é ótimo para pegar erros de hidratação ou chaves duplicadas no React
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        // Espera um pouco para garantir que scripts carregaram
        await page.waitForLoadState('networkidle');

        // Se houver erros de "Connection refused" do Firebase, podemos ignorar neste teste simples,
        // mas erros de React devem falhar o teste.
        const reactErrors = errors.filter(e => e.includes('React') || e.includes('hydat'));
        expect(reactErrors.length).toBe(0);
    });
});