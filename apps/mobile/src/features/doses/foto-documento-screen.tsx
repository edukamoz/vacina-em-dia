import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Chave } from '../../components/chave';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { lerCaderneta, type ResultadoLeitura } from '../../lib/ler-caderneta';
import { lerDocumento, podeLerDocumento, type OrigemDoDocumento } from '../../lib/ler-documento';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useAplicarDoses, useMemberDoses, type ResultadoDoLote } from '../data/hooks';
import { formatCivilDate } from './format-date';

/** Mensagem para cada motivo de a leitura não ter dado texto. */
const AVISO = {
  negado:
    'Sem permissão para usar a câmera ou as fotos. Você pode liberar nas configurações do aparelho.',
  indisponivel:
    'Este aparelho ou esta versão do aplicativo não consegue ler texto de fotos. Cadastre as doses à mão.',
  falha: 'Não foi possível ler essa foto. Tente de novo com mais luz e o documento reto.',
} as const;

/** Leitura da foto, a conferência da pessoa e o resultado de salvar. */
function LeituraDeFoto({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const doses = useMemberDoses(memberId);
  const aplicar = useAplicarDoses();
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<ResultadoLeitura | null>(null);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [resultado, setResultado] = useState<ResultadoDoLote | null>(null);

  async function fotografar(origem: OrigemDoDocumento) {
    setAviso(null);
    setResultado(null);
    setLendo(true);
    try {
      const lido = await lerDocumento(origem);
      if (lido.tipo === 'negado' || lido.tipo === 'indisponivel') {
        setAviso(AVISO[lido.tipo]);
      } else if (lido.tipo === 'texto') {
        const nova = lerCaderneta(lido.linhas, doses.data?.items ?? [], todayCivil());
        setLeitura(nova);
        setMarcadas(new Set(nova.encontradas.map((e) => e.dose.id)));
      }
    } catch {
      setAviso(AVISO.falha);
    } finally {
      setLendo(false);
    }
  }

  function alternar(id: string, ligada: boolean) {
    setMarcadas((atual) => {
      const novo = new Set(atual);
      if (ligada) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function registrar() {
    if (!leitura) return;
    const itens = leitura.encontradas
      .filter((e) => marcadas.has(e.dose.id))
      .map((e) => ({ id: e.dose.id, data: e.data }));
    aplicar.mutate(itens, {
      onSuccess: (feito) => {
        setResultado(feito);
        setLeitura(null);
      },
    });
  }

  if (resultado) {
    const { aplicadas, falhas } = resultado;
    return (
      <Tela titulo="Doses registradas" modal>
        <Texto accessibilityLiveRegion="polite">
          {aplicadas === 1
            ? '1 dose foi marcada como aplicada.'
            : `${aplicadas} doses foram marcadas como aplicadas.`}
        </Texto>
        {falhas.length > 0 ? (
          <Texto className="text-erro" accessibilityRole="alert">
            {falhas.length === 1
              ? 'Uma dose não pôde ser registrada. Abra a dose e registre a aplicação à mão.'
              : `${falhas.length} doses não puderam ser registradas. Abra cada uma e registre a aplicação à mão.`}
          </Texto>
        ) : null}
        <Botao titulo="Ver as doses" onPress={() => router.replace('/')} />
      </Tela>
    );
  }

  const escolhidas = leitura?.encontradas.filter((e) => marcadas.has(e.dose.id)).length ?? 0;

  return (
    <Tela
      titulo="Ler caderneta por foto"
      subtitulo={`Para ${memberName}. A foto é lida aqui no aparelho e não é enviada para lugar nenhum.`}
      modal
    >
      <Texto className="text-textoSecundario">
        Fotografe a caderneta de vacinação ou um comprovante, com boa luz e o papel reto. Vamos
        mostrar as doses que encontrarmos e você confere antes de salvar.
      </Texto>
      <View className="flex-row flex-wrap gap-md">
        <Botao
          titulo="Tirar foto"
          icone="mais"
          disabled={lendo || doses.isPending}
          onPress={() => void fotografar('camera')}
        />
        <Botao
          titulo="Escolher da galeria"
          variante="secundario"
          disabled={lendo || doses.isPending}
          onPress={() => void fotografar('galeria')}
        />
      </View>
      {lendo ? <EstadoCarregando rotulo="Lendo a foto" /> : null}
      {aviso ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {aviso}
        </Texto>
      ) : null}

      {leitura && leitura.encontradas.length > 0 ? (
        <View className="gap-md">
          <Texto variante="titulo2" accessibilityRole="header">
            Doses encontradas
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario">
            Confira o nome e a data de cada uma. Desligue as que estiverem erradas: só salvamos o
            que estiver ligado.
          </Texto>
          {leitura.encontradas.map((e) => (
            <Cartao key={e.dose.id} className="gap-sm">
              <Chave
                rotulo={`${e.dose.vaccine}, ${e.dose.doseLabel}`}
                ligada={marcadas.has(e.dose.id)}
                aoAlterar={(valor) => alternar(e.dose.id, valor)}
              />
              <Texto>{`Aplicada em ${formatCivilDate(e.data)}`}</Texto>
              <Texto variante="apoio" className="text-textoSecundario">
                {`Lido na foto: ${e.trecho}`}
              </Texto>
            </Cartao>
          ))}
          {aplicar.isPending ? <EstadoCarregando rotulo="Salvando as doses" /> : null}
          <Botao
            titulo={escolhidas === 1 ? 'Registrar 1 dose' : `Registrar ${escolhidas} doses`}
            disabled={escolhidas === 0 || aplicar.isPending}
            onPress={registrar}
          />
        </View>
      ) : null}

      {leitura && leitura.encontradas.length === 0 ? (
        <EstadoVazio
          titulo="Não encontramos doses nessa foto"
          descricao="Tente de novo com mais luz, ou registre a aplicação à mão na própria dose."
        />
      ) : null}

      {leitura && leitura.semEncaixe.length > 0 ? (
        <View className="gap-sm">
          <Texto variante="rotulo">Linhas com data que não conseguimos encaixar</Texto>
          {leitura.semEncaixe.map((linha, i) => (
            <Texto key={`${i}-${linha}`} variante="apoio" className="text-textoSecundario">
              {linha}
            </Texto>
          ))}
        </View>
      ) : null}

      <Texto variante="apoio" className="text-textoSecundario">
        A leitura pode errar. Ela só marca doses que a pessoa já tem no calendário. O aplicativo não
        substitui a caderneta oficial nem a orientação de profissionais de saúde.
      </Texto>
      {aplicar.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          Não foi possível salvar agora. Tente de novo.
        </Texto>
      ) : null}
    </Tela>
  );
}

/**
 * Tela "Ler caderneta por foto" (B55): só no app instalado. Tira (ou escolhe) a foto de uma
 * caderneta ou comprovante, lê o texto no aparelho, mostra as doses encontradas para a pessoa
 * conferir e só marca como aplicadas as que ela deixar ligadas e confirmar.
 */
export function FotoDocumentoScreen() {
  const router = useRouter();
  const { members, selected } = useSelectedMember();

  if (!podeLerDocumento) {
    return (
      <Tela titulo="Ler caderneta por foto" modal>
        <EstadoVazio
          titulo="Só no aplicativo"
          descricao="Este recurso funciona no aplicativo instalado no celular. No site, registre a aplicação na própria dose."
        />
      </Tela>
    );
  }
  if (members.isPending) {
    return (
      <Tela titulo="Ler caderneta por foto" modal>
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Ler caderneta por foto" modal>
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Ler caderneta por foto" modal>
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família antes de ler uma caderneta."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }
  return <LeituraDeFoto memberId={selected.id} memberName={selected.name} />;
}
