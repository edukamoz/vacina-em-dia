import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Faixa em branco ao redor do QR (em módulos); os leitores exigem pelo menos 4. */
const MARGEM = 4;

/**
 * Monta o desenho do QR como um único traçado SVG (um quadrado por módulo escuro).
 *
 * @param texto - Conteúdo do QR.
 * @returns Traçado e tamanho da grade (com margem).
 */
export function desenharQr(texto: string): { caminho: string; lado: number } {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const modulos = qr.getModuleCount();
  let caminho = '';
  for (let linha = 0; linha < modulos; linha += 1) {
    for (let coluna = 0; coluna < modulos; coluna += 1) {
      if (qr.isDark(linha, coluna)) {
        caminho += `M${coluna + MARGEM} ${linha + MARGEM}h1v1h-1z`;
      }
    }
  }
  return { caminho, lado: modulos + MARGEM * 2 };
}

/**
 * QR Code do Pix. Sempre preto sobre branco (em qualquer tema), porque o leitor do banco precisa
 * do contraste. O desenho é decorativo para o leitor de tela; o texto copia e cola ao lado é a
 * alternativa acessível.
 *
 * @param props.texto - Código Pix copia e cola.
 * @param props.tamanho - Lado do quadrado, em dp.
 */
export function QrPix({ texto, tamanho = 220 }: { texto: string; tamanho?: number }) {
  const { caminho, lado } = useMemo(() => desenharQr(texto), [texto]);
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${lado} ${lado}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR Code do Pix"
    >
      <Rect x={0} y={0} width={lado} height={lado} fill="#FFFFFF" />
      <Path d={caminho} fill="#000000" />
    </Svg>
  );
}
