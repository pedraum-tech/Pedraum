import { test, expect } from '@playwright/test';

const PAGE_URL = '/admin/usuarios';
const url_test = 'http://127.0.0.1:3000';

test.describe('Admin - Gestão de Usuários', () => {

    // Hook de autenticação e navegação inicial
    test.beforeEach(async ({ page }) => {
        // 1. Ir para login
        await page.goto(`${url_test}/auth/login`); // ou sua rota de login

        // 2. Preencher credenciais (use um user de teste)
        await page.fill('input[type="email"]', process.env.ADMIN_EMAIL_TEST || '');
        await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD_TEST || '');
        await page.click('button[type="submit"]');
        // await page.context().addCookies([...]);

        // 2. Navegar para a página
        await page.goto(`${url_test}${PAGE_URL}`);

        // 3. Aguardar o carregamento (o loader "Carregando usuários..." deve desaparecer)
        await expect(page.getByText('Carregando usuários...')).toBeHidden({ timeout: 100000 });
    });

    test('1. Deve renderizar a página com título e cards de estatísticas', async ({ page }) => {
        await page.click('text=Painel'); // garante que estamos na seção correta
        await page.click('text=Usuários'); // garante que estamos na seção correta
        await expect(page.getByRole('heading', { name: 'Gestão de Usuários' })).toBeVisible();

        // Verifica a presença de alguns cards de resumo
        await expect(page.getByText('Total')).toBeVisible();
        await expect(page.getByText('Admins')).toBeVisible();
        await expect(page.getByText('Patrocinadores')).toBeVisible();
    });

    test('2. Deve navegar para a página de criação de novo usuário', async ({ page }) => {
        const btnNovo = page.getByRole('link', { name: 'Novo Usuário' });
        await expect(btnNovo).toBeVisible();

        await btnNovo.click();
        await expect(page).toHaveURL(/\/admin\/usuarios\/create/);
    });

    test('3. Deve filtrar usuários pelo campo de busca textual', async ({ page }) => {
        const inputBusca = page.getByPlaceholder('Buscar por ID / nome / e-mail');

        // Digita um termo que (espera-se) exista no banco de teste
        await inputBusca.fill('Maria');

        // Verifica se o valor foi preenchido
        await expect(inputBusca).toHaveValue('Maria');

        // Verifica se o chip de filtro apareceu
        await expect(page.getByText('Busca: "Maria"')).toBeVisible();
    });

    test('4. Deve filtrar usuários por Papel (Role)', async ({ page }) => {
        // Seleciona "Admin" no dropdown de Filtro
        // Nota: O código usa <select> com options, podemos usar selectOption
        const selectRole = page.locator('select').filter({ hasText: 'Tipo/Papel' });
        await selectRole.selectOption('admin');

        // Verifica se o chip de filtro apareceu
        await expect(page.getByText('Tipo: admin')).toBeVisible();

        // Verifica se os resultados exibidos (se houver) contêm a tag "ADMIN"
        // (Isso depende de ter dados de teste. Se vazio, o teste passa mas não valida dados)
        const userCard = page.locator('div').filter({ hasText: 'ADMIN' }).first();
        if (await userCard.count() > 0) {
            await expect(userCard).toBeVisible();
        }
    });

    test('4.1. Deve filtrar usuários pelo Período(últimos 7 dias)', async ({ page }) => {
        // Seleciona "Admin" no dropdown de Filtro
        // Nota: O código usa <select> com options, podemos usar selectOption
        const selectRole = page.locator('select').filter({ hasText: 'Período' });
        await selectRole.selectOption('Últimos 7 dias');

        // Verifica se o chip de filtro apareceu
        await expect(page.getByText('Cadastro: últimos 7 dias')).toBeVisible();

        // Cria a data de hoje para comparação
        const hoje: Date = new Date();

        // Verifica se existem usuários exibidos antes dos últimos 7 dias
        const userCards = page.locator('div').filter({ hasText: 'Criado em:' });
        const count = await userCards.count();
        for (let i = 0; i < count; i++) {
            const cardText = await userCards.nth(i).innerText();
            const match = cardText.match(/Criado em:\s*([\d\/\-]+)/);
            if (match) {
                const dataCriacao = new Date(match[1]);
                const diffTime = Math.abs(hoje.getTime() - dataCriacao.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                expect(diffDays).toBeLessThanOrEqual(7);
            }
        }

        // Verifica se os resultados exibidos (se houver) contêm a tag "ADMIN"
        // (Isso depende de ter dados de teste. Se vazio, o teste passa mas não valida dados)
        // const userCard = page.locator('div').filter({ hasText: 'ADMIN' }).first();
        // if (await userCard.count() > 0) {
        //     await expect(userCard).toBeVisible();
        // }
    });

    test('5. Deve navegar para a edição de um usuário específico', async ({ page }) => {
        // Pega o primeiro botão de editar visível na lista
        const btnEdit = page.getByRole('link', { name: 'Editar' }).first();

        // Se não houver usuários, o teste falha ou deve ser pulado
        if (await btnEdit.count() === 0) test.skip();

        await btnEdit.click();
        // Verifica se foi para a URL de edição (contém /edit)
        await expect(page).toHaveURL(/\/admin\/usuarios\/.*\/edit/);
    });

    test('6. Deve alterar o status de um usuário (Bloquear/Ativar)', async ({ page }) => {
        // Encontra um botão de "Bloquear" ou "Ativar"
        const btnAction = page.getByRole('button', { name: /Bloquear|Ativar/ }).first();
        if (await btnAction.count() === 0) test.skip();

        const textoInicial = await btnAction.innerText();

        // Clica para alterar status
        await btnAction.click();

        // Espera a UI atualizar (o texto do botão deve inverter)
        const textoEsperado = textoInicial.includes('Bloquear') ? 'Ativar' : 'Bloquear';
        await expect(btnAction).toHaveText(new RegExp(textoEsperado), { timeout: 5000 });
    });

    test('7. Deve adicionar uma tag a um usuário individualmente', async ({ page }) => {
        // Localiza o input de tag dentro de um card de usuário
        const tagInput = page.getByPlaceholder('ex.: fornecedor').first();
        if (await tagInput.count() === 0) test.skip();

        const novaTag = 'tag-teste-e2e';
        await tagInput.fill(novaTag);
        await tagInput.press('Enter');

        // Verifica se a tag apareceu como um "pill" no card
        // O código mostra tags com ícone TagIcon, procuramos pelo texto
        await expect(page.getByText(novaTag).first()).toBeVisible();
    });

    test('8. Deve permitir seleção em massa de usuários', async ({ page }) => {
        // Localiza os checkboxes dos cards (assumindo que o primeiro checkbox é do primeiro card)
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.count() === 0) test.skip();

        await checkbox.check();

        // Verifica se a barra de ações em massa apareceu ("1 selecionado(s)")
        await expect(page.getByText('1 selecionado(s)')).toBeVisible();

        // Verifica se os botões de ação em massa ficaram habilitados
        await expect(page.getByRole('button', { name: 'Bloquear' }).first()).toBeEnabled();
    });

    test('9. Deve aplicar tag em massa para usuários selecionados', async ({ page }) => {
        // 1. Seleciona usuário
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.count() === 0) test.skip();
        await checkbox.check();

        // 2. Preenche o input de tag da barra de ferramentas (BulkTag)
        // O input está próximo ao botão "Aplicar"
        const bulkInput = page.locator('div').filter({ hasText: 'Tag:' }).getByRole('textbox').first();
        await bulkInput.fill('tag-massa');

        // 3. Cida em confirmar a tag (lidando com o window.confirm)
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Aplicar' }).click();

        // 4. Verifica se o input foi limpo ou a seleção resetada (comportamento esperado após sucesso)
        await expect(page.getByText('0 selecionado(s)')).toBeVisible(); // assume que reseta seleção
    });

    test('10. Deve permitir exclusão de usuário (lidando com confirmação)', async ({ page }) => {
        const btnExcluir = page.getByRole('button', { name: 'Excluir' }).first();
        if (await btnExcluir.count() === 0) test.skip();

        // Configura o listener para aceitar o dialog de confirmação ("Excluir usuário permanentemente?")
        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('Excluir usuário permanentemente?');
            dialog.accept();
        });

        await btnExcluir.click();

        // Verifica se o elemento foi removido da DOM
        await expect(btnExcluir).toBeHidden();
    });

    test('11. Deve exportar CSV ao clicar no botão de download', async ({ page }) => {
        // Prepara para esperar o evento de download
        const downloadPromise = page.waitForEvent('download');

        // Clica no botão de exportar (há dois no código, pegamos o da toolbar ou header)
        // O código tem um title="Exportar CSV (lista atual)"
        await page.getByTitle('Exportar CSV (lista atual)').first().click();

        const download = await downloadPromise;

        // Validações básicas do download
        expect(download.suggestedFilename()).toContain('usuarios-');
        expect(download.suggestedFilename()).toContain('.csv');
    });

    test('12. Deve limpar todos os filtros ao clicar em "Limpar tudo"', async ({ page }) => {
        // 1. Aplica um filtro (ex: busca)
        await page.getByPlaceholder('Buscar por ID / nome / e-mail').fill('TesteLimpar');
        await expect(page.getByText('Busca: "TesteLimpar"')).toBeVisible();

        // 2. Clica em limpar tudo
        await page.getByRole('button', { name: 'Limpar tudo' }).click();

        // 3. Verifica se o chip sumiu e o input esvaziou
        await expect(page.getByText('Busca: "TesteLimpar"')).toBeHidden();
        await expect(page.getByPlaceholder('Buscar por ID / nome / e-mail')).toHaveValue('');
    });
});
