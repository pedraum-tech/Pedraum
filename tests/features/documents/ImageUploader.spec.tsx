import { test, expect } from '@playwright/experimental-ct-react';
import ImageUploader from '../../../src/features/documents/ImageUploader';

test.use({ viewport: { width: 800, height: 800 } });

// Mock simples para a função setImagens
const mockSetImagens = async () => { };

test.describe('ImageUploader Component', () => {

    // 1. TESTE DA CORREÇÃO (O BUG DO HTTPS)
    test('deve normalizar e renderizar corretamente quando a prop "imagens" é uma string única', async ({ mount }) => {
        // Cenário: O banco retornou apenas uma string, não um array
        const urlUnica = 'https://via.placeholder.com/150';

        const component = await mount(
            <ImageUploader
                imagens={urlUnica as any} // Forçando o tipo para simular o retorno "sujo" do banco
                setImagens={mockSetImagens}
            />
        );

        // Verificação: Deve haver exatamente 1 imagem renderizada
        await expect(component.locator('img')).toHaveCount(1);
        await expect(component.locator('img')).toHaveAttribute('src', urlUnica);

        // Confirma que não quebrou a string (ex: não pegou só o 'h' ou 'https')
        await expect(component.getByText(urlUnica)).toBeHidden(); // Garante que não vazou texto na tela
    });

    // 2. TESTE DE ARRAY PADRÃO
    test('deve renderizar corretamente um array de imagens', async ({ mount }) => {
        const lista = [
            'https://via.placeholder.com/150?text=1',
            'https://via.placeholder.com/150?text=2'
        ];

        const component = await mount(
            <ImageUploader imagens={lista} setImagens={mockSetImagens} />
        );

        await expect(component.locator('img')).toHaveCount(2);
        await expect(component.getByText('2/5')).toBeVisible(); // Confirma o contador
    });

    // 3. TESTE DE LIMITE (MAX)
    test('deve bloquear upload e mostrar aviso quando limite é atingido', async ({ mount }) => {
        const listaCheia = [
            'url1', 'url2', 'url3'
        ];

        const component = await mount(
            <ImageUploader
                imagens={listaCheia}
                setImagens={mockSetImagens}
                max={3} // Limite igual ao tamanho da lista
            />
        );

        // O input de arquivo deve sumir ou o texto de limite deve aparecer
        await expect(component.getByText('Limite de 3 imagens atingido.')).toBeVisible();

        // O botão de "Selecionar imagens" não deve estar visível
        await expect(component.getByRole('button', { name: 'Selecionar imagens' })).toBeHidden();
    });

    // 4. TESTE DE INTERAÇÃO DE UPLOAD (Simulado)
    test('deve acionar o input de arquivo ao clicar no botão', async ({ mount, page }) => {
        const component = await mount(
            <ImageUploader imagens={[]} setImagens={mockSetImagens} />
        );

        // Prepara para "pegar" o evento de abrir janelas de arquivo
        const fileChooserPromise = page.waitForEvent('filechooser');

        // Clica no botão
        await component.getByRole('button', { name: 'Selecionar imagens' }).click();

        // Aguarda o seletor de arquivos abrir
        const fileChooser = await fileChooserPromise;
        expect(fileChooser).toBeTruthy();

        // Nota: Não prosseguimos com o upload real aqui para não chamar o Firebase de verdade no teste.
        // Para testar o upload completo, seria necessário mockar as funções do firebase/storage.
    });

    // 5. TESTE VISUAL DE REMOÇÃO
    test('deve exibir botão de remover em cima da imagem', async ({ mount }) => {
        const component = await mount(
            <ImageUploader imagens={['https://teste.com/img.jpg']} setImagens={mockSetImagens} />
        );

        const containerImagem = component.locator('.relative.group').first();

        // Verifica se o botão de remover (ícone de lixeira/X) existe
        const btnRemover = containerImagem.locator('button[title="Remover"]');
        await expect(btnRemover).toBeVisible();
    });
});