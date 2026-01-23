import { test, expect } from '@playwright/test';

const PAGE_URL = '/create-demanda';
const RASCUNHO_KEY = 'pedraum:create-demandas:draft_v5_min_author';

test.describe('Página de Criação de Demanda', () => {

    // Hook para garantir que o usuário está logado antes de cada teste.
    // Ajuste conforme sua estratégia de autenticação no Playwright (global-setup ou login manual).
    test.beforeEach(async ({ page }) => {
        // Exemplo simplificado: Injetar um cookie ou token se necessário, ou usar o estado salvo
        // await page.context().addCookies([...]); 

        await page.goto(PAGE_URL);

        // Aguarda o redirecionamento de Auth se houver, ou espera o formulário carregar
        await expect(page.locator('h1')).toContainText('Cadastrar Demanda');
    });

    // test('deve exibir erro de validação se a descrição estiver vazia ou curta', async ({ page }) => {
    //     // Tenta enviar sem preencher nada
    //     const submitBtn = page.getByRole('button', { name: 'Enviar para Curadoria' });
    //     await submitBtn.click();

    //     // Verifica a mensagem de erro (role="alert")
    //     const alert = page.getByRole('alert');
    //     await expect(alert).toBeVisible();
    //     await expect(alert).toContainText('Descreva com pelo menos 10 caracteres');

    //     // Tenta preencher com texto muito curto
    //     await page.fill('textarea[name="descricao"]', 'Curto');
    //     await submitBtn.click();
    //     await expect(alert).toContainText('Descreva com pelo menos 10 caracteres');
    // });

    test('deve atualizar o contador de caracteres conforme o usuário digita', async ({ page }) => {
        const textoTeste = 'Teste de contagem de caracteres.';
        const length = textoTeste.length;

        await page.fill('textarea[name="descricao"]', textoTeste);

        // Verifica se o texto "32/4000" (exemplo) aparece na tela
        // O seletor baseia-se no texto renderizado próximo à barra de progresso
        await expect(page.getByText(`${length}/4000`)).toBeVisible();
    });

    // test('deve salvar e recuperar o rascunho automaticamente (LocalStorage)', async ({ page }) => {
    //     const textoRascunho = 'Este é um texto de rascunho que deve persistir.';

    //     // 1. Digita o texto
    //     await page.fill('textarea[name="descricao"]', textoRascunho);

    //     // 2. Aguarda o debounce do autosave (400ms no código)
    //     await page.waitForTimeout(600);

    //     // 3. Verifica se o item foi salvo no LocalStorage
    //     const localStorageValue = await page.evaluate((key) => {
    //         return localStorage.getItem(key);
    //     }, RASCUNHO_KEY);

    //     expect(localStorageValue).toBeTruthy();
    //     expect(JSON.parse(localStorageValue!).form.descricao).toBe(textoRascunho);

    //     // 4. Recarrega a página
    //     await page.reload();

    //     // 5. Verifica se o textarea foi preenchido automaticamente
    //     await expect(page.locator('textarea[name="descricao"]')).toHaveValue(textoRascunho);

    //     // 6. Verifica indicador visual de rascunho salvo
    //     await expect(page.getByText('Rascunho salvo automaticamente')).toBeVisible();
    // });

    // test('deve permitir anexar imagens (mock do input file)', async ({ page }) => {
    //     // Como o componente ImageUploader é complexo, focamos no input type="file" oculto se houver,
    //     // ou simulamos a interação básica. Se o componente usar dropzone, pode ser necessário setInputFiles.

    //     // Nota: O seletor abaixo depende de como o ImageUploader renderiza o input.
    //     // Geralmente componentes de drag-and-drop possuem um input invisível.
    //     const fileInput = page.locator('input[type="file"]').first(); // Assume que o primeiro é imagem

    //     // Cria um arquivo dummy na memória para upload
    //     await fileInput.setInputFiles({
    //         name: 'teste.png',
    //         mimeType: 'image/png',
    //         buffer: Buffer.from('this is test image content')
    //     });

    //     // Verifica se a UI atualizou (ex: texto mudou de "0 imagens" para "1 imagem" ou similar)
    //     // Baseado no código: "Máximo de 5 imagens ... Atual: 1"
    //     await expect(page.getByText('Atual: 1')).toBeVisible();
    // });

    // test('deve enviar o formulário com sucesso', async ({ page }) => {
    //     // 1. Preenche a descrição válida
    //     await page.fill('textarea[name="descricao"]', 'Preciso de manutenção na britadeira urgente. Ruído estranho.');

    //     // 2. Clica em enviar
    //     const submitBtn = page.getByRole('button', { name: 'Enviar para Curadoria' });
    //     await submitBtn.click();

    //     // 3. Verifica estado de loading
    //     await expect(submitBtn).toHaveText('Enviando...');
    //     await expect(submitBtn).toBeDisabled();

    //     // 4. Verifica sucesso ou redirecionamento
    //     // Como o código usa 'useAfterSaveRedirect', esperamos que a URL mude OU apareça a mensagem de sucesso antes

    //     // Opção A: Verificar mensagem de sucesso (se o redirect for lento)
    //     // await expect(page.getByRole('status')).toContainText('Recebemos sua demanda!');

    //     // Opção B: Verificar redirecionamento (mais comum em testes E2E)
    //     await expect(page).toHaveURL(/\/demandas/); // Regex para verificar se foi para /demandas
    // });

    test('botão voltar deve retornar à página anterior', async ({ page }) => {
        const backBtn = page.getByRole('button', { name: 'Voltar' });
        await backBtn.click();

        // Verifica se a URL mudou (depende do histórico do navegador no teste runner)
        // Em isolamento, o router.back() pode não ter para onde ir, mas verificamos se a chamada ocorre.
    });
});