import { test, expect } from '@playwright/experimental-ct-react';
import ImageUploader from './ImageUploader';

test.use({ viewport: { width: 800, height: 800 } });

// Mock simples para a função setImagens
const mockSetImagens = async () => { };

test.describe('ImageUploader Component', () => {

    // 1. TESTE DA CORREÇÃO (O BUG DO HTTPS)
    test('deve normalizar e renderizar corretamente quando a prop "imagens" é uma string única', async ({ mount }) => {
        const urlUnica = 'https://via.placeholder.com/150';

        const component = await mount(
            <ImageUploader
                imagens={urlUnica as any}
                setImagens={mockSetImagens}
            />
        );

        await expect(component.locator('img')).toHaveCount(1);
        await expect(component.locator('img')).toHaveAttribute('src', urlUnica);
        await expect(component.getByText(urlUnica)).toBeHidden();
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
        // Verifica se o contador exibe o texto correto (ex: "2/5")
        // Nota: Ajuste o texto abaixo conforme o que seu componente renderiza exatamente nas labels
        await expect(component.getByText('2/5')).toBeVisible();
    });

    // 3. TESTE DE LIMITE (MAX) - DESCOMENTADO E AJUSTADO
    test('deve bloquear upload e mostrar aviso quando limite é atingido', async ({ mount }) => {
        const listaCheia = ['url1', 'url2', 'url3'];

        const component = await mount(
            <ImageUploader
                imagens={listaCheia}
                setImagens={mockSetImagens}
                max={3}
            />
        );

        // Verifica se a mensagem de limite aparece
        // O texto padrão no seu componente é "Limite de {max} imagens atingido."
        await expect(component.getByText('Limite de 3 imagens atingido.')).toBeVisible();

        // O botão de "Selecionar imagens" deve sumir quando o limite é atingido
        await expect(component.getByRole('button', { name: 'Selecionar imagens' })).toBeHidden();
    });

    // 4. TESTE DE INTERAÇÃO DE UPLOAD
    test('deve acionar o input de arquivo ao clicar no botão', async ({ mount, page }) => {
        const component = await mount(
            <ImageUploader imagens={[]} setImagens={mockSetImagens} />
        );

        const fileChooserPromise = page.waitForEvent('filechooser');

        // Clica no botão azul principal
        await component.getByRole('button', { name: 'Selecionar imagens' }).click();

        const fileChooser = await fileChooserPromise;
        expect(fileChooser).toBeTruthy();
    });

    // 5. TESTE VISUAL DE REMOÇÃO - ATUALIZADO PARA O NOVO LAYOUT
    // test('deve exibir botão de remover acessível no card', async ({ mount }) => {
    //     const component = await mount(
    //         <ImageUploader imagens={['https://teste.com/img.jpg']} setImagens={mockSetImagens} />
    //     );

    //     // AQUI MUDOU: O botão não está mais "sobre" a imagem, mas faz parte do card.
    //     // Como adicionamos <span className="sr-only">Remover</span> no componente, 
    //     // podemos buscar pelo "Accessible Name", que é a melhor prática.

    //     const btnRemover = component.getByRole('button', { name: 'Remover' }).first();

    //     // Verifica se ele existe e está visível na tela
    //     await expect(btnRemover).toBeVisible();

    //     // Opcional: Verificar se o ícone SVG está dentro dele
    //     await expect(btnRemover.locator('svg')).toBeVisible();
    // });

    // 6. NOVO TESTE: REORDENAÇÃO (Já que você tem botões de mover)
    test('deve exibir botões de mover quando enableReorder é true', async ({ mount }) => {
        const component = await mount(
            <ImageUploader
                imagens={['url1', 'url2']}
                setImagens={mockSetImagens}
                enableReorder={true}
            />
        );

        // Verifica se existem botões com as setinhas
        // Seus botões têm title="Mover para a esquerda" e "Mover para a direita"
        await expect(component.locator('button[title="Mover para a esquerda"]').first()).toBeVisible();
        await expect(component.locator('button[title="Mover para a direita"]').first()).toBeVisible();
    });
});