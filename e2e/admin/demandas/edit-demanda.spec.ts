import { test, expect } from '@playwright/test';

// Substitua por um ID que exista no seu banco de dados de teste/dev
const DEMANDA_ID = process.env.DEMANDA_ID_TEST;
const url_test = process.env.BASE_URL || 'http://127.0.0.1:3000';

test.describe('Página de Edição de Demanda', () => {

    test.beforeEach(async ({ page }) => {

        // 1. Ir para login
        await page.goto(`${url_test}/auth/login`); // ou sua rota de login

        // 2. Preencher credenciais (use um user de teste)
        await page.fill('input[type="email"]', process.env.ADMIN_EMAIL_TEST || '');
        await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD_TEST || '');
        await page.click('button[type="submit"]');

        // 3. Agora sim, navegar para a demanda
        await page.goto(`${url_test}/admin/demandas/${DEMANDA_ID}/edit`);

        // 1. Navegar para a página
        // await page.goto(`/admin/demandas/${DEMANDA_ID}`);

        // 2. Aguardar o loader sumir (garante que os dados do Firebase chegaram)
        await expect(page.locator('text=Carregando demanda...')).toBeHidden({ timeout: 100000 });
    });

    // --- NOVO TESTE PARA O FILTRO INTELIGENTE ---
    test('Deve filtrar usuários usando o Match Descrição', async ({ page }) => {
        const btnMatch = page.locator('div[title="Filtra usuários que tenham palavras-chave da descrição em seus produtos."]');
        const inputDescricao = page.locator('textarea[name="descricao"]');

        // 1. Verificar estado inicial (Botão cinza/desativado)
        // rgb(241, 245, 249) é o equivalente a #f1f5f9 (slate-100)
        await expect(btnMatch).toHaveCSS('background-color', 'rgb(241, 245, 249)');

        // 2. Preencher a descrição com uma palavra-chave que NÃO deve existir (Teste Negativo)
        // Isso garante que o filtro realmente funciona ao esconder todo mundo
        await inputDescricao.fill('PalavraChaveMuitoDoidaQueNinguemTemXYZ');

        // Clica para ativar o filtro
        await btnMatch.click();

        // 3. Verificar se o botão ficou ativo (Azul)
        // rgb(224, 242, 254) é o equivalente a #e0f2fe (sky-100)
        await expect(btnMatch).toHaveCSS('background-color', 'rgb(224, 242, 254)');

        // Como a palavra é bizarra, deve aparecer a mensagem de "Nenhum usuário encontrado"
        await expect(page.locator('text=Nenhum usuário encontrado')).toBeVisible();

        // 4. Preencher com uma palavra que SABEMOS que existe (Teste Positivo)
        // *Importante*: Tenha certeza que no seu banco de teste existe alguém com "bateria" ou mude a palavra abaixo
        await inputDescricao.fill('Preciso de uma Bateria urgente');

        // Agora a lista deve conter usuários (a mensagem de erro deve sumir)
        // await expect(page.locator('text=Nenhum usuário encontrado')).toBeHidden();

        // Opcional: Verificar se a lista tem pelo menos 1 item
        const count = await page.locator('input[type="checkbox"]').count();
        expect(count).toBeGreaterThan(0);

        // 5. Desativar o filtro e verificar se volta ao normal
        await btnMatch.click();
        await expect(btnMatch).toHaveCSS('background-color', 'rgb(241, 245, 249)');
    });

    // test('Deve abrir a tela de demandas de admin', async ({ page }) => {
    //     // Verifica se estamos na página correta
    //     await expect(page).toHaveURL(new RegExp(`${url_test}/admin/demandas/`));
    //     // await expect(page.locator('h1')).toHaveText(/Edição de Demanda/i);
    // });

    // test('Deve carregar os dados iniciais corretamente', async ({ page }) => {
    //     // Verifica se campos chave estão preenchidos
    //     const inputTitulo = page.locator('input[name="titulo"]');
    //     await expect(inputTitulo).toBeVisible();
    //     // Verifica se veio valor do banco (não está vazio)
    //     await expect(inputTitulo).not.toHaveValue('');

    //     // Verifica status
    //     await expect(page.locator('text=Status:')).toBeVisible();
    // });

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

    // test('Deve filtrar a lista de usuários', async ({ page }) => {
    //     // Aguarda lista de usuários carregar
    //     await expect(page.locator('text=Carregando...')).toBeHidden({ timeout: 20000 });

    //     // Digita no campo de busca
    //     const searchInput = page.locator('input[placeholder*="nome, e-mail"]');
    //     await searchInput.fill('UsuarioInexistenteXYZ');

    //     // Verifica mensagem de "Nenhum usuário encontrado" ou lista vazia
    //     // Baseado no seu código: "Nenhum usuário encontrado. Ajuste os filtros/busca."
    //     await expect(page.locator('text=Nenhum usuário encontrado')).toBeVisible();

    //     // Limpa busca
    //     await page.click('button:has-text("Limpar")');
    //     await expect(page.locator('text=Nenhum usuário encontrado')).toBeHidden();
    // });

    // test('Deve abrir o modal de perfil ao clicar em Ver Perfil', async ({ page }) => {
    //     // Localiza o primeiro botão "Ver perfil" visível
    //     const btnVerPerfil = page.locator('button:has-text("Ver perfil")').first();
    //     await btnVerPerfil.click();

    //     // Verifica se o modal abriu
    //     await expect(page.locator('h3:has-text("Perfil do fornecedor")')).toBeVisible();

    //     // Fecha o modal
    //     await page.click('button:has-text("Fechar")');
    //     await expect(page.locator('h3:has-text("Perfil do fornecedor")')).toBeHidden();
    // });
});