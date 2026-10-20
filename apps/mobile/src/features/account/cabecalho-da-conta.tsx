import { useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '../../components/avatar';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import { escolherFotoDePerfil, podeTirarFoto, type OrigemDaFoto } from '../../lib/escolher-foto';
import { useVisual } from '../../theme/theme-provider';
import { useProfilePhoto, useRemoveProfilePhoto, useSaveProfilePhoto } from '../data/hooks';

/**
 * Cabeçalho da aba Conta: a foto de perfil (ou a inicial do e-mail, se não houver foto), o e-mail e
 * os botões para escolher na galeria, tirar uma foto (só no celular) e remover. A foto é reduzida
 * no aparelho e guardada de forma privada; a pessoa pode apagá-la a qualquer momento e ela some
 * junto com a conta. Se algo falhar, uma mensagem simples diz o que fazer.
 *
 * @param props.email - E-mail da conta.
 */
export function CabecalhoDaConta({ email }: { email: string }) {
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const foto = useProfilePhoto();
  const salvar = useSaveProfilePhoto();
  const remover = useRemoveProfilePhoto();
  const [aviso, setAviso] = useState<string | null>(null);
  const ocupada = salvar.isPending || remover.isPending;

  async function escolher(origem: OrigemDaFoto) {
    setAviso(null);
    try {
      const resultado = await escolherFotoDePerfil(origem);
      if (resultado.tipo === 'negado') {
        setAviso(
          origem === 'camera'
            ? 'Sem permissão para usar a câmera. Você pode liberar nas configurações do aparelho.'
            : 'Sem permissão para ver as suas fotos. Você pode liberar nas configurações do aparelho.',
        );
      } else if (resultado.tipo === 'foto') {
        await salvar.mutateAsync(resultado.foto);
      }
    } catch (erro) {
      setAviso(
        erro instanceof Error && erro.name === 'ApiRequestError'
          ? erro.message
          : 'Não foi possível usar essa foto. Tente outra.',
      );
    }
  }

  async function apagar() {
    setAviso(null);
    try {
      await remover.mutateAsync();
    } catch {
      setAviso('Não foi possível remover a foto agora. Tente de novo.');
    }
  }

  return (
    <View
      style={[gradienteMarca, sombra(2)]}
      className={`gap-lg overflow-hidden rounded-folha bg-primaria p-xl ${
        altoContraste ? 'border-altoContraste border-borda' : ''
      }`}
    >
      <View className="flex-row flex-wrap items-center gap-lg">
        <View className="rounded-selo border-[4px] border-sobrePrimaria">
          <Avatar nome={email} indice={0} tamanho={88} foto={foto.data ?? null} />
        </View>
        <View className="min-w-[200px] flex-1">
          <Texto variante="titulo2" className="text-sobrePrimaria" accessibilityRole="header">
            Seus dados
          </Texto>
          <Texto className="text-sobrePrimaria">{email}</Texto>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-md">
        <Botao
          titulo={foto.data ? 'Trocar foto' : 'Escolher foto'}
          variante="secundario"
          disabled={ocupada}
          onPress={() => void escolher('galeria')}
        />
        {podeTirarFoto ? (
          <Botao
            titulo="Tirar foto"
            variante="secundario"
            disabled={ocupada}
            onPress={() => void escolher('camera')}
          />
        ) : null}
        {foto.data ? (
          <Botao
            titulo="Remover foto"
            variante="secundario"
            disabled={ocupada}
            onPress={() => void apagar()}
          />
        ) : null}
      </View>
      {salvar.isPending ? (
        <Texto className="text-sobrePrimaria" accessibilityLiveRegion="polite">
          Guardando a foto...
        </Texto>
      ) : null}
      {aviso ? (
        <Texto className="text-sobrePrimaria" accessibilityRole="alert">
          {aviso}
        </Texto>
      ) : null}
      <Texto variante="apoio" className="text-sobrePrimaria">
        A foto é opcional, fica guardada só para você e é apagada se você excluir a conta.
      </Texto>
    </View>
  );
}
