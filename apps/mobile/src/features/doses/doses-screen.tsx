import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Aparecer, Giro } from '../../components/animacao';
import { Atalho } from '../../components/atalho';
import { AvisoDeConfirmacao } from '../../components/aviso-de-confirmacao';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { CarrosselDePessoas } from '../../components/carrossel-de-pessoas';
import { Grade } from '../../components/grade';
import { Icone } from '../../components/icone';
import { LinkTexto } from '../../components/link-texto';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { podeLerDocumento } from '../../lib/ler-documento';
import { todayCivil } from '../../lib/dates';
import { modoDeLayout } from '../../lib/layout';
import { useThemeColors } from '../../theme/theme-provider';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useConferenciaDoCalendario, useMemberDoses } from '../data/hooks';
import { aplicadasVisiveisAoAbrir } from './grupos-de-doses';
import { ConfirmarAplicacao } from './aplicar-rapido';
import { ConviteDeInstalacao } from './convite-instalar';
import { BaixarCarteira } from './baixar-carteira';
import { DoseCard } from './dose-card';
import { Festa } from './festa';
import { NovidadesCard } from '../news/novidades-card';
import { LembretesCard } from './lembretes-card';
import { contarDoses, ResumoDoses } from './resumo-doses';

/** Quantas aplicadas aparecem na tela; as demais ficam no Histórico. */
export const LIMITE_APLICADAS = 5;

/** Quantas doses cada grupo mostra de início e a cada "Mostrar mais" (a página não vira uma lista enorme). */
export const DOSES_POR_VEZ = 6;

/**
 * Acima de quantas doses abertas (atrasadas e próximas) o computador troca o desenho "resumo ao lado
 * + uma coluna" por "resumo em faixa + cartões em duas colunas", que aproveita melhor a largura.
 */
export const DOSES_PARA_GRADE = 4;

/** Data mais próxima primeiro; dose sem data (conforme histórico, gestação) vai para o fim. */
function dataDaProxima(dose: DoseResponse): string {
  return (dose.status === 'SCHEDULED' ? dose.scheduledDate : dose.dueDate) ?? '9999-12-31';
}

/**
 * Separa as doses da pessoa nos três grupos da tela: as que precisam de atenção (atrasadas), as
 * próximas (agendadas primeiro, depois as pendentes, cada grupo pela data) e as já aplicadas, da
 * mais recente para a mais antiga. As canceladas não aparecem; ficam no Histórico.
 */
export function agruparDoses(doses: readonly DoseResponse[]) {
  const porData = (a: DoseResponse, b: DoseResponse) =>
    dataDaProxima(a).localeCompare(dataDaProxima(b));
  const atencao = doses.filter((dose) => dose.status === 'OVERDUE').sort(porData);
  const agendadas = doses.filter((dose) => dose.status === 'SCHEDULED').sort(porData);
  const pendentes = doses.filter((dose) => dose.status === 'PENDING').sort(porData);
  const aplicadas = doses
    .filter((dose) => dose.status === 'APPLIED')
    .sort((a, b) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? ''));
  return { atencao, proximas: [...agendadas, ...pendentes], aplicadas };
}

/** Rodapé das doses de um animal: não há calendário oficial, então quem define é o veterinário. */
function AvisoAnimal() {
  return (
    <View className="rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-lg">
      <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
        Não existe calendário nacional de vacinação para animais de estimação. As vacinas e as datas
        são as que você cadastrou; quem define o que o seu animal precisa é o veterinário. O Vacina
        em Dia só ajuda a lembrar.
      </Texto>
    </View>
  );
}

/**
 * Aba "Doses" (RF03 e RF04): as doses da pessoa escolhida em três grupos ("Precisam de atenção",
 * "Próximas" e "Aplicadas"), sempre com a fonte e a versão do calendário oficial. Antes dos grupos, o
 * carrossel de pessoas (troca de quem se vê) e o resumo com anel de progresso.
 */
export function DosesScreen() {
  const conferencia = useConferenciaDoCalendario();
  const router = useRouter();
  const cores = useThemeColors();
  const { members, items, selected, selectMember } = useSelectedMember();
  const doses = useMemberDoses(selected?.id ?? null);
  // Ação rápida "Aplicar": a dose atrasada que está sendo confirmada, e se a lista de aplicadas está aberta.
  const [aplicando, setAplicando] = useState<DoseResponse | null>(null);
  const [verAplicadas, setVerAplicadas] = useState(false);
  // Aviso curto depois de registrar uma aplicação ("BCG: dose aplicada").
  const [aviso, setAviso] = useState<string | null>(null);
  // Quantas doses cada grupo mostra agora (por título do grupo).
  const [limites, setLimites] = useState<Record<string, number>>({});
  const computador = modoDeLayout(useWindowDimensions().width) === 'expandido';

  if (members.isPending) {
    return (
      <Tela titulo="Doses" emAba>
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Doses" emAba>
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Doses" emAba>
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para ver as vacinas indicadas para a idade."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }

  const animal = selected.kind === 'PET';
  const primeiroNome = selected.name.split(' ')[0] ?? selected.name;
  const grupos = doses.data ? agruparDoses(doses.data.items) : null;
  const aplicadasVisiveis = grupos?.aplicadas.slice(0, LIMITE_APLICADAS) ?? [];
  const aplicadasAbertas = grupos ? aplicadasVisiveisAoAbrir(grupos, verAplicadas) : false;
  // Poucas doses: resumo à esquerda e lista à direita. Muitas: resumo em faixa e cartões em grade.
  const muitas = grupos ? grupos.atencao.length + grupos.proximas.length > DOSES_PARA_GRADE : false;
  const duasColunas = computador && muitas;
  const secoes = grupos
    ? [
        { titulo: 'Precisam de atenção', lista: grupos.atencao, rapida: true },
        { titulo: 'Próximas', lista: grupos.proximas, rapida: false },
      ]
    : [];

  return (
    <Tela
      emAba
      titulo={`Doses de ${primeiroNome}`}
      sobreposicao={<AvisoDeConfirmacao mensagem={aviso} aoSumir={() => setAviso(null)} />}
      acao={
        <View className="flex-row flex-wrap gap-md">
          <Botao titulo="Adicionar dose" icone="mais" onPress={() => router.push('/dose/nova')} />
          {podeLerDocumento && !animal ? (
            <Botao
              titulo="Ler caderneta por foto"
              variante="secundario"
              onPress={() => router.push('/dose/foto')}
            />
          ) : null}
        </View>
      }
    >
      <CarrosselDePessoas pessoas={items} selecionadaId={selected.id} aoEscolher={selectMember} />
      <LembretesCard />
      {/* No computador (design v3): com poucas doses, o resumo à esquerda e as doses em uma coluna à
          direita; com muitas, o resumo em faixa e os cartões em duas colunas. No celular e no tablet,
          tudo em uma coluna, na mesma ordem. */}
      <View
        className={`gap-xl ${muitas ? '' : 'expandido:flex-row expandido:items-start expandido:gap-xxl'}`}
      >
        <View className={`gap-xl ${muitas ? '' : 'expandido:w-[38%]'}`}>
          {doses.data && (
            <ResumoDoses
              nome={primeiroNome}
              contagem={contarDoses(doses.data.items, todayCivil())}
            />
          )}
        </View>
        <View className={`gap-xl ${muitas ? '' : 'expandido:flex-1'}`}>
          {doses.isPending && <EstadoCarregando rotulo="Carregando as vacinas" esqueleto={3} />}
          {doses.error && (
            <EstadoErro
              mensagem={doses.error.message}
              onTentarDeNovo={() => void doses.refetch()}
            />
          )}
          {animal && doses.data && doses.data.items.length === 0 && (
            <EstadoVazio
              titulo={`Nenhuma vacina de ${primeiroNome} cadastrada`}
              descricao="Toque em Adicionar dose e informe a vacina e a data que o veterinário indicou. Dá para marcar que ela se repete, por exemplo todo ano."
            />
          )}
          {grupos &&
            !(animal && doses.data && doses.data.items.length === 0) &&
            grupos.atencao.length + grupos.proximas.length === 0 && <Festa nome={primeiroNome} />}
          {secoes.map(({ titulo, lista, rapida }) => {
            if (lista.length === 0) return null;
            const limite = limites[titulo] ?? DOSES_POR_VEZ;
            const mostradas = lista.slice(0, limite);
            return (
              <Aparecer key={titulo}>
                <View className="gap-lg">
                  <View className="flex-row items-center gap-md">
                    <Texto variante="titulo2" accessibilityRole="header">
                      {titulo}
                    </Texto>
                    <View className="rounded-selo bg-primariaSuave px-md py-xs">
                      <Texto variante="rotulo" className="text-primaria">
                        {`${lista.length} ${lista.length === 1 ? 'dose' : 'doses'}`}
                      </Texto>
                    </View>
                  </View>
                  <Grade colunas={duasColunas ? 2 : 1}>
                    {mostradas.map((dose) => (
                      <View key={dose.id} className="gap-md">
                        <DoseCard
                          dose={dose}
                          aoAbrir={() =>
                            router.push({ pathname: '/dose/[id]', params: { id: dose.id } })
                          }
                          {...(rapida && dose.status === 'OVERDUE'
                            ? { aoAplicar: () => setAplicando(dose) }
                            : {})}
                        />
                        {/* A confirmação abre numa janela por cima da tela (modal). */}
                        {aplicando?.id === dose.id && (
                          <ConfirmarAplicacao
                            dose={dose}
                            aoFechar={() => setAplicando(null)}
                            aoRegistrar={() => setAviso(`${dose.vaccine}: dose aplicada`)}
                            aoTrocarData={() => {
                              setAplicando(null);
                              router.push({ pathname: '/dose/[id]', params: { id: dose.id } });
                            }}
                          />
                        )}
                      </View>
                    ))}
                  </Grade>
                  {lista.length > DOSES_POR_VEZ ? (
                    <View className="gap-sm">
                      <Texto
                        variante="apoio"
                        className="text-textoSecundario"
                        accessibilityLiveRegion="polite"
                      >
                        {`Mostrando ${mostradas.length} de ${lista.length} doses, da mais próxima para a mais distante.`}
                      </Texto>
                      <View className="flex-row flex-wrap gap-sm">
                        {mostradas.length < lista.length ? (
                          <Botao
                            titulo={`Mostrar mais ${Math.min(DOSES_POR_VEZ, lista.length - mostradas.length)} doses`}
                            variante="secundario"
                            accessibilityLabel={`Mostrar mais doses em ${titulo}`}
                            onPress={() =>
                              setLimites({ ...limites, [titulo]: limite + DOSES_POR_VEZ })
                            }
                          />
                        ) : null}
                        {limite > DOSES_POR_VEZ ? (
                          <Botao
                            titulo="Mostrar menos"
                            variante="secundario"
                            accessibilityLabel={`Mostrar menos doses em ${titulo}`}
                            onPress={() => setLimites({ ...limites, [titulo]: DOSES_POR_VEZ })}
                          />
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              </Aparecer>
            );
          })}
          {aplicadasVisiveis.length > 0 && (
            <View className="gap-lg">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aplicadas, ${grupos?.aplicadas.length ?? 0}`}
                accessibilityState={{ expanded: aplicadasAbertas }}
                onPress={() => setVerAplicadas(!verAplicadas)}
                className="min-h-principal flex-row items-center justify-between gap-md rounded-cartao border-fina border-bordaSuave bg-superficieSuave px-lg"
              >
                <Texto variante="titulo2" accessibilityRole="header" importantForAccessibility="no">
                  Aplicadas
                </Texto>
                <View className="flex-row items-center gap-sm">
                  <Texto variante="corpoNegrito" importantForAccessibility="no">
                    {String(grupos?.aplicadas.length ?? 0)}
                  </Texto>
                  <Giro ligado={aplicadasAbertas}>
                    <Icone nome="seta" cor={cores.textoSecundario} />
                  </Giro>
                </View>
              </Pressable>
              {aplicadasAbertas && (
                <Aparecer>
                  <Grade colunas={duasColunas ? 2 : 1}>
                    {aplicadasVisiveis.map((dose) => (
                      <DoseCard
                        key={dose.id}
                        dose={dose}
                        aoAbrir={() =>
                          router.push({ pathname: '/dose/[id]', params: { id: dose.id } })
                        }
                      />
                    ))}
                  </Grade>
                </Aparecer>
              )}
            </View>
          )}
          {grupos && grupos.aplicadas.length > LIMITE_APLICADAS && (
            <LinkTexto titulo="Ver todas no Histórico" onPress={() => router.push('/historico')} />
          )}
        </View>
      </View>
      {grupos && <ConviteDeInstalacao dosesAplicadas={grupos.aplicadas.length} />}
      {doses.data && <BaixarCarteira memberId={selected.id} nome={primeiroNome} />}
      {animal ? null : (
        <Atalho
          icone="local"
          titulo="Vou viajar"
          apoio="Veja o que conferir antes da viagem."
          rotuloAcessivel="Vou viajar. Monte um roteiro de vacinas para a viagem."
          aoAbrir={() => router.push('/viagem')}
        />
      )}
      {animal ? null : (
        <Atalho
          icone="local"
          titulo="Postos de saúde perto de você"
          apoio="Veja no mapa onde tomar as doses."
          rotuloAcessivel="Postos de saúde perto de você. Veja no mapa onde tomar as doses."
          aoAbrir={() => router.push('/postos')}
        />
      )}
      {animal ? null : <NovidadesCard />}
      {animal ? (
        <AvisoAnimal />
      ) : (
        doses.data && <AvisoFonte conferencia={conferencia.data} fonte={doses.data.source} />
      )}
    </Tela>
  );
}
