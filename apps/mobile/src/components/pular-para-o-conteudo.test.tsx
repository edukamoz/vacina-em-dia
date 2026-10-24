import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ID_DO_CONTEUDO } from '../lib/pular-conteudo';
import { PularParaOConteudo } from './pular-para-o-conteudo';
import { Tela } from './tela';

describe('link "Pular para o conteúdo" (CT-A11Y)', () => {
  test('CT-A11Y-04: fora da web o link não aparece', async () => {
    await render(<PularParaOConteudo />);
    expect(screen.queryByText('Pular para o conteúdo')).toBeNull();
  });

  test('CT-A11Y-05: a tela marca o conteúdo principal com o id que o link procura', async () => {
    await render(
      <Tela titulo="Doses">
        <Text>corpo</Text>
      </Tela>,
    );
    expect(screen.getByText('corpo')).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).toContain(`"nativeID":"${ID_DO_CONTEUDO}"`);
  });
});
