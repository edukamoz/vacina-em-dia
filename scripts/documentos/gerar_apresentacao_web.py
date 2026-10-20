"""Gera doctos/Apresentacao.html: a apresentação animada, em um único arquivo (abre no navegador, sem internet).

O modelo fica em scripts/documentos/apresentacao/index.html; este script otimiza as imagens
(capturas do app, fotos fictícias, QR) e embute imagens e fontes no HTML (data URI), de modo que
não há caminho de arquivo que possa quebrar.
Capturas novas: ver LEIA-ME.md (capturas-apresentacao.spec.ts.txt).
"""
import base64
import re
import shutil
import tempfile
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SAIDA = REPO / 'doctos' / 'Apresentacao.html'
ATIVOS = Path(tempfile.mkdtemp(prefix='apresentacao-'))
CAP = REPO / 'doctos' / 'capturas'
CAP_NOVAS = CAP / 'apresentacao'
PESSOAS = REPO / 'apps' / 'mobile' / 'assets' / 'images' / 'pessoas'
FONTES = REPO / 'node_modules' / '@expo-google-fonts' / 'atkinson-hyperlegible'


def webp(origem: Path, destino: str, largura: int, qualidade: int = 82) -> None:
    with Image.open(origem) as im:
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        if im.width > largura:
            im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
        im.save(ATIVOS / destino, 'WEBP', quality=qualidade, method=6)


def main() -> None:
    for nome in ['web-landing', 'web-cadastro', 'web-doses', 'web-dose', 'web-assistente']:
        webp(CAP_NOVAS / f'{nome}.png', f'{nome}.webp', 1500)
    for nome in ['cel-landing', 'cel-cadastro', 'cel-doses', 'cel-dose', 'cel-assistente']:
        webp(CAP_NOVAS / f'{nome}.png', f'{nome}.webp', 560)
    webp(CAP / 'web-05-familia.png', 'web-familia.webp', 1500)
    webp(CAP / 'celular-05-familia.png', 'cel-familia.webp', 560)
    webp(CAP / 'web-08-postos.png', 'web-postos.webp', 1500)
    for pessoa in PESSOAS.glob('*.webp'):
        shutil.copy(pessoa, ATIVOS / pessoa.name)
    webp(PESSOAS / 'fundo.jpg', 'fundo.webp', 1200, 78)
    shutil.copy(REPO / 'docs' / '03-uml' / 'qr-app.png', ATIVOS / 'qr-app.png')
    for peso in ('400Regular', '700Bold'):
        shutil.copy(FONTES / peso / f'AtkinsonHyperlegible_{peso}.ttf', ATIVOS / f'atkinson-{peso}.ttf')
    tipos = {'.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf'}
    html = (Path(__file__).parent / 'apresentacao' / 'index.html').read_text(encoding='utf8')

    def embutir(m: re.Match) -> str:
        arq = ATIVOS / m.group(1)
        return f'data:{tipos[arq.suffix]};base64,' + base64.b64encode(arq.read_bytes()).decode()

    html = re.sub(r'ativos/([\w.-]+)', embutir, html)
    SAIDA.write_text(html, encoding='utf8')
    shutil.rmtree(ATIVOS, ignore_errors=True)
    print('ok', SAIDA, f'{SAIDA.stat().st_size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
