import { test, expect } from '@playwright/test';

// Substitua por um ID que exista no seu banco de dados de teste/dev
const DEMANDA_ID = process.env.DEMANDA_ID_TEST;

test.describe('Página de Edição de Demanda', () => {

    test.beforeEach(async ({ page }) => {

        // 1. Ir para login
        await page.goto('http://localhost:3000/auth/login'); // ou sua rota de login

        // 2. Preencher credenciais (use um user de teste)
        await page.fill('input[type="email"]', process.env.ADMIN_EMAIL_TEST || '');
        await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD_TEST || '');
        await page.click('button[type="submit"]');

        // 3. Agora sim, navegar para a demanda
        await page.goto(`http://localhost:3000/admin/demandas/${DEMANDA_ID}/edit`);

        // 1. Navegar para a página
        // await page.goto(`/admin/demandas/${DEMANDA_ID}`);

        // 2. Aguardar o loader sumir (garante que os dados do Firebase chegaram)
        await expect(page.locator('text=Carregando demanda...')).toBeHidden({ timeout: 100000 });
    });

    test('Deve abrir a tela de demandas de admin', async ({ page }) => {
        // Verifica se estamos na página correta
        await expect(page).toHaveURL(/\/admin\/demandas\//);
        // await expect(page.locator('h1')).toHaveText(/Edição de Demanda/i);
    });

    test('Deve carregar os dados iniciais corretamente', async ({ page }) => {
        // Verifica se campos chave estão preenchidos
        const inputTitulo = page.locator('input[name="titulo"]');
        await expect(inputTitulo).toBeVisible();
        // Verifica se veio valor do banco (não está vazio)
        await expect(inputTitulo).not.toHaveValue('');

        // Verifica status
        await expect(page.locator('text=Status:')).toBeVisible();
    });

    // test('Deve permitir editar o título e salvar', async ({ page }) => {
    //     // Mock do alert do navegador
    //     page.on('dialog', async dialog => {
    //         expect(dialog.message()).toContain('Demanda atualizada com sucesso');
    //         await dialog.accept();
    //     });

    //     const novoTitulo = `Teste Automação ${Date.now()}`;

    //     await page.fill('input[name="titulo"]', novoTitulo);

    //     // Clica em Salvar
    //     await page.click('button:has-text("Salvar Alterações")');

    //     // Opcional: Recarregar página e verificar persistência
    //     await page.reload();
    //     await expect(page.locator('text=Carregando demanda...')).toBeHidden();
    //     await expect(page.locator('input[name="titulo"]')).toHaveValue(novoTitulo);
    // });

    test('Deve filtrar a lista de usuários', async ({ page }) => {
        // Aguarda lista de usuários carregar
        await expect(page.locator('text=Carregando...')).toBeHidden();

        // Digita no campo de busca
        const searchInput = page.locator('input[placeholder*="nome, e-mail"]');
        await searchInput.fill('UsuarioInexistenteXYZ');

        // Verifica mensagem de "Nenhum usuário encontrado" ou lista vazia
        // Baseado no seu código: "Nenhum usuário encontrado. Ajuste os filtros/busca."
        await expect(page.locator('text=Nenhum usuário encontrado')).toBeVisible();

        // Limpa busca
        await page.click('button:has-text("Limpar")');
        await expect(page.locator('text=Nenhum usuário encontrado')).toBeHidden();
    });

    test('Deve abrir o modal de perfil ao clicar em Ver Perfil', async ({ page }) => {
        // Localiza o primeiro botão "Ver perfil" visível
        const btnVerPerfil = page.locator('button:has-text("Ver perfil")').first();
        await btnVerPerfil.click();

        // Verifica se o modal abriu
        await expect(page.locator('h3:has-text("Perfil do fornecedor")')).toBeVisible();

        // Fecha o modal
        await page.click('button:has-text("Fechar")');
        await expect(page.locator('h3:has-text("Perfil do fornecedor")')).toBeHidden();
    });
});