import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    console.log('--- Iniciando Global Setup ---');

    // headless: false permite ver o navegador abrindo. Útil para debug.
    // Mude para true quando tudo estiver funcionando.
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('1. Acessando página de login...');
    await page.goto('http://localhost:3000/auth/login');

    console.log('2. Preenchendo credenciais...');
    // ATENÇÃO: Certifique-se que estas credenciais são REAIS e de um ADMIN válido
    const email = process.env.ADMIN_EMAIL_TEST;
    const password = process.env.ADMIN_PASSWORD_TEST;
    if (!email || !password) {
        await browser.close();
        throw new Error('Environment variables ADMIN_EMAIL_TEST and ADMIN_PASSWORD_TEST must be set');
    }
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    console.log('3. Clicando em Entrar...');
    // Tente ser o mais específico possível no botão
    await page.click('button[type="submit"]');

    console.log('4. Aguardando redirecionamento para /admin...');
    try {
        // Regex: aceita /admin, /admin/, /admin/dashboard, etc.
        await page.waitForURL(/\/admin/, { timeout: 15000 });
        console.log('-> Sucesso! URL mudou para área administrativa.');
    } catch (error) {
        console.error('-> ERRO: Não redirecionou para /admin em 15s.');
        console.error('-> Verifique se a senha está correta ou se apareceu erro na tela.');
        // Tira um print se der erro para você ver o que aconteceu
        await page.screenshot({ path: 'erro-login.png' });
        throw error;
    }

    // Truque para Firebase/Next.js: Espera o token ser gravado no storage
    console.log('5. Aguardando persistência do token (Firebase)...');
    await page.waitForTimeout(3000);

    console.log('6. Salvando estado da sessão...');
    await page.context().storageState({ path: 'playwright/.auth/user.json' });

    await browser.close();
    console.log('--- Setup Concluído ---');
}

export default globalSetup;