<#
.SYNOPSIS
  Monta a pasta da entrega final: PDFs das documentações e do panfleto, a apresentação e o zip do código.

.DESCRIPTION
  Converte os arquivos Word de doctos/ para PDF com o Word instalado (a entrega é em PDF; o Word
  continua sendo a fonte), exporta a apresentação em PDF com o PowerPoint e cria o zip do código
  com `git archive` (só o que está no Git: sem segredos, node_modules nem arquivos gerados).
  A saída fica em entrega/ (fora do Git). Rode só perto da data da entrega, depois de conferir os
  Word. Uso: powershell -ExecutionPolicy Bypass -File scripts/empacotar-entrega.ps1
#>
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..')
$doctos = Join-Path $raiz 'doctos'
$saida = Join-Path $raiz 'entrega'
New-Item -ItemType Directory -Force $saida | Out-Null

$documentos = @(
  'Documentacao_Tecnica',
  'Documentacao_de_Desenvolvimento',
  'Documentacao_do_Usuario',
  'Panfleto'
)

$word = $null
try {
  foreach ($nome in $documentos) {
    $origem = Join-Path $doctos "$nome.docx"
    if (-not (Test-Path $origem)) {
      Write-Warning "Não encontrei $origem; pulei."
      continue
    }
    if ($null -eq $word) {
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
    }
    $doc = $word.Documents.Open($origem, $false, $true)
    $destino = Join-Path $saida "$nome.pdf"
    $doc.ExportAsFixedFormat($destino, 17)
    $paginas = $doc.ComputeStatistics(2)
    $doc.Close($false)
    Write-Host "OK  $nome.pdf ($paginas páginas)"
  }
} finally {
  if ($null -ne $word) { $word.Quit() }
}

$apresentacao = Join-Path $doctos 'Apresentacao.pptx'
if (Test-Path $apresentacao) {
  $ppt = New-Object -ComObject PowerPoint.Application
  try {
    $pres = $ppt.Presentations.Open($apresentacao, $true, $false, $false)
    $pres.SaveAs((Join-Path $saida 'Apresentacao.pdf'), 32)
    $pres.Close()
    Write-Host 'OK  Apresentacao.pdf'
  } finally {
    $ppt.Quit()
  }
}

$zip = Join-Path $saida 'vacina-em-dia-codigo.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
git -C $raiz archive --format=zip --prefix=vacina-em-dia/ -o $zip HEAD
# O zip da entrega leva também a pasta doctos/ com os PDFs (os Word ficam fora do Git).
Add-Type -AssemblyName System.IO.Compression.FileSystem
$arquivo = [System.IO.Compression.ZipFile]::Open($zip, 'Update')
try {
  foreach ($pdf in Get-ChildItem $saida -Filter *.pdf) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($arquivo, $pdf.FullName, "vacina-em-dia/doctos/$($pdf.Name)") | Out-Null
  }
} finally {
  $arquivo.Dispose()
}
Write-Host "OK  vacina-em-dia-codigo.zip ($([math]::Round((Get-Item $zip).Length / 1MB, 1)) MB, do commit $(git -C $raiz rev-parse --short HEAD))"
Write-Host "Pronto: $saida"
