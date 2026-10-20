import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Image } from 'react-native';
import { useThemeColors } from '../../theme/theme-provider';
import { FOTOS } from './fotos';

/** Desenhos de 24 px dos ícones do mosaico (traço, no estilo do restante do app). */
const ICONES = {
  alerta: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  visto: <path className="hm-visto" d="M20 6 9 17l-5-5" />,
  microfone: (
    <>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </>
  ),
  sino: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  coracao: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.6 5 6 5c2 0 3.4 1.1 4 2.2L12 9l2-1.8C14.6 6.1 16 5 18 5c3.4 0 5.1 3.5 3.6 6.8C19.5 16.4 12 21 12 21Z"
    />
  ),
} as const;

function Icone({ nome, tamanho = 24 }: { nome: keyof typeof ICONES; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONES[nome]}
    </svg>
  );
}

/**
 * Peça do mosaico. A animação de cada peça é feita no CSS (`global.css`, prefixo `hm-`) ao passar
 * o mouse; no celular, tocar na peça liga a mesma animação por um instante (`data-on`).
 */
function Peca({ classe, children }: { classe: string; children: ReactNode }) {
  const [ligada, setLigada] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tocar() {
    setLigada(true);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setLigada(false), 1600);
  }

  return (
    <div className={`hm-t ${classe}`} data-on={ligada ? '1' : undefined} onTouchStart={tocar}>
      {children}
    </div>
  );
}

/**
 * Mosaico do alto da apresentação (web): peças independentes, cada uma com uma animação própria
 * ao passar o mouse (ou tocar). Mariana e o Sr. José são pessoas fictícias; as doses são exemplos
 * com dados inventados. No computador são 3 colunas; no celular, 2 (`compacto`). O conjunto é uma
 * imagem decorativa para o leitor de tela, com uma descrição só. Com "Reduzir movimento" as peças
 * ficam paradas.
 *
 * @param props.compacto - Janela estreita (celular): 2 colunas e peças mais baixas.
 */
export function HeroModular({ compacto }: { compacto: boolean }) {
  const cores = useThemeColors();
  const variaveis = {
    '--hm-fundo': cores.superficie,
    '--hm-borda': cores.bordaSuave,
    '--hm-texto': cores.texto,
    '--hm-apoio': cores.textoSecundario,
    '--hm-primaria': cores.primaria,
    '--hm-primariaSuave': cores.primariaSuave,
    '--hm-sobre': cores.sobrePrimaria,
    '--hm-menta': cores.decorMenta,
    '--hm-sol': cores.decorSol,
    '--hm-atras': cores.atrasada,
    '--hm-atrasS': cores.atrasadaSuave,
    '--hm-agen': cores.agendada,
    '--hm-agenS': cores.agendadaSuave,
    '--hm-apli': cores.aplicada,
    '--hm-apliS': cores.aplicadaSuave,
  } as CSSProperties;

  return (
    <div
      role="img"
      aria-label="Exemplos de como o aplicativo aparece: doses atrasada, agendada e aplicada, pergunta por voz, lembretes e progresso da família"
      className="hm"
      data-c={compacto ? 'p' : 'g'}
      style={variaveis}
    >
      <Peca classe="hm-foto">
        <div className="hm-halo" />
        <div style={{ position: 'absolute', inset: 0 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="hm-cora">
              <Icone nome="coracao" tamanho={22} />
            </span>
          ))}
        </div>
        <div className="hm-pess" style={{ aspectRatio: '640 / 856' }}>
          <Image
            source={FOTOS.mariana.fonte}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <span className="hm-legenda">Mariana, 32 anos</span>
      </Peca>

      <Peca classe="hm-atras">
        <span className="hm-ico">
          <Icone nome="alerta" />
        </span>
        <div>
          <b>Gripe</b>
          <small>Prevista para 20/09/2026</small>
          <span className="hm-selo" style={{ marginTop: 6 }}>
            Atrasada
          </span>
        </div>
      </Peca>

      <Peca classe="hm-agen">
        <span className="hm-ico">
          <Icone nome="calendario" />
        </span>
        <div>
          <b>Covid-19, reforço</b>
          <small>Agendada para 15/10/2026</small>
          <div className="hm-barra" style={{ marginTop: 10 }}>
            <i />
          </div>
        </div>
      </Peca>

      <Peca classe="hm-voz">
        <span className="hm-mic">
          <Icone nome="microfone" tamanho={22} />
        </span>
        <div>
          <div className="hm-onda">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <b>Pergunte por voz</b>
        </div>
      </Peca>

      <Peca classe="hm-jose">
        <span className="hm-fala">Para que serve a vacina da BCG?</span>
        <div className="hm-pess" style={{ aspectRatio: '640 / 856' }}>
          <Image
            source={FOTOS.jose.fonte}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <span className="hm-legenda">Sr. José, 68 anos</span>
      </Peca>

      <Peca classe="hm-apli">
        <span className="hm-ico">
          <Icone nome="visto" />
        </span>
        <span className="hm-conf">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} />
          ))}
        </span>
        <div>
          <b>Febre amarela</b>
          <small>Aplicada em 12/04/2026</small>
        </div>
      </Peca>

      <Peca classe="hm-lemb">
        <span className="hm-sino">
          <Icone nome="sino" tamanho={34} />
        </span>
        <span className="hm-badge">2</span>
        <div>
          <b>Lembretes</b>
          <small>Às 8h, sem expor nomes</small>
        </div>
      </Peca>

      <Peca classe="hm-prog">
        <svg className="hm-anel" viewBox="0 0 64 64" aria-hidden>
          <circle className="tr" cx="32" cy="32" r="28" />
          <circle className="pg" cx="32" cy="32" r="28" />
        </svg>
        <div className="num">
          <b className="antes">2 de 4 doses</b>
          <b className="depois">4 de 4. Em dia!</b>
        </div>
      </Peca>
    </div>
  );
}
