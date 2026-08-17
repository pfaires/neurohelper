#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prepara o modelo oficial do LME (o "antigo", completo) a partir da versão
eletrônica publicada pelo Ministério da Saúde.

Por que este passo existe:

  A versão eletrônica traz 85 campos de formulário AcroForm, com retângulos
  exatos — é a fonte de coordenadas mais confiável que existe para este PDF,
  cuja geometria de desenho é incoerente (matrizes aninhadas que não fecham) e
  que por isso precisou ser abandonada da primeira vez.

  Só que entregar o AcroForm ao usuário seria ruim: o topo da página tem uma
  barra de botões ("Salvar como", "Limpar todos os campos") que sairia impressa,
  os campos continuariam editáveis depois de gerados, e preencher formulário com
  fontes não embutidas é terreno movediço.

  Então aqui o formulário é **achatado na marra**: arrancamos widgets e AcroForm,
  sobrando um PDF chapado idêntico ao oficial, e guardamos os retângulos num
  JSON. O site desenha por cima, com o mesmo pincel dos outros documentos.

Entrada:  ferramentas/origem/lme-eletronico.pdf
Saída:    assets/pdf/lme-oficial.pdf
          assets/js/coord-lme-oficial.js   (o que o site carrega)
          ferramentas/coordenadas-lme-oficial.json   (o mesmo, para conferência)

Uso (a partir da raiz do site):  python3 ferramentas/preparar-lme-oficial.py
Requer: pypdf
"""

import json
import os

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, 'ferramentas', 'origem', 'lme-eletronico.pdf')
DESTINO = os.path.join(RAIZ, 'assets', 'pdf', 'lme-oficial.pdf')
COORD = os.path.join(RAIZ, 'ferramentas', 'coordenadas-lme-oficial.json')
COORD_JS = os.path.join(RAIZ, 'assets', 'js', 'coord-lme-oficial.js')

# Nome do campo no PDF → nome usado pelo site. O que não estiver aqui é
# descartado: botões da barra do topo, campo de suporte, etc.
CAMPOS = {
    'CNES': 'cnes',
    'Nome do estabelecimento de saúde': 'estabelecimento',
    'Nome do paciente': 'nome',
    'Peso': 'peso',
    'Nome da mãe do paciente': 'mae',
    'Altura': 'altura',
    'CID': 'cid',
    'Diagnóstico': 'diagnostico',
    'Anamnese': 'anamnese',
    'Tratamento': 'tratamentoRelato',
    'Nome do Responsável': 'responsavel',
    'Médico Solicitante': 'profissional',
    'TextCNS': 'documentoMedico',
    'Today': 'data',
    'Nome': 'preenchidoOutroNome',
    'CPF': 'preenchidoOutroCpf',
    'Etnia': 'etnia',
    'Telefone I': 'telefone1',
    'Telefone II': 'telefone2',
    'Documento': 'documentoPaciente',
    'email': 'email'
}

# Grade de medicamentos: seis linhas, cada uma com o nome e os seis meses.
# Os nomes no PDF não seguem padrão nenhum ("Text6a", "Text22"), então vão na mão.
MEDICAMENTOS = [
    ('Selecao med 1', ['Text6', 'Text7', 'Text8', 'Text6a', 'Text7a', 'Text8a']),
    ('Selecao med 2', ['Text10', 'Text11', 'Text12', 'Text10a', 'Text11a', 'Text12a']),
    ('Selecao med 3', ['Text14', 'Text15', 'Text16', 'Text14a', 'Text15a', 'Text16a']),
    ('Selecao med 4', ['Text18', 'Text19', 'Text20', 'Text6b', 'Text7b', 'Text8b']),
    ('Selecao med 5', ['Text22', 'Text23', 'Text24', 'Text10b', 'Text11b', 'Text12b']),
    ('Selecao med 6', ['Text22a', 'Text23a', 'Text24a', 'Text14b', 'Text15b', 'Text16b'])
]

# Grupos de marcação: nome no PDF → valor de exportação de cada opção, na ordem
# em que aparecem no papel. Conferido lendo os rótulos ao redor de cada quadrado.
MARCACOES = {
    'Tratamentos prévios?': ('tratamentoPrevio', ['nao', 'sim']),
    'Incapaz?': ('incapaz', ['nao', 'sim']),
    'dados complementares': ('preenchidoPor',
                             ['paciente', 'mae', 'responsavel', 'medico', 'outro']),
    'Radio Button1': ('raca', ['branca', 'amarela', 'preta', 'indigena', 'parda']),
    'Documentos': ('tipoDocPaciente', ['cpf', 'cns'])
}


def folhas(no, nome=''):
    """Percorre a árvore de campos e devolve (nome completo, widget, ordem)."""
    o = no.get_object()
    t = o.get('/T')
    # os quadradinhos de um grupo não têm nome próprio: herdam o do pai
    n = nome if t is None else ((nome + '.' if nome else '') + str(t))
    if '/Kids' in o:
        for i, k in enumerate(o['/Kids']):
            for r in folhas(k, n):
                yield r
    elif '/Rect' in o:
        yield (n, o)


def caixa(widget):
    x0, y0, x1, y1 = [float(v) for v in widget['/Rect']]
    return [round(min(x0, x1), 1), round(min(y0, y1), 1),
            round(max(x0, x1), 1), round(max(y0, y1), 1)]


def estado(widget):
    """Valor de exportação do quadradinho (o que não for /Off)."""
    ap = widget.get('/AP', {}).get('/N', {})
    for k in (ap.keys() if hasattr(ap, 'keys') else []):
        if k != '/Off':
            return str(k)
    return None


def main():
    leitor = PdfReader(ORIGEM)
    acro = leitor.trailer['/Root'].get('/AcroForm')
    if not acro:
        raise SystemExit('o PDF de origem não tem AcroForm — arquivo errado?')

    # nome → [(estado, caixa)], na ordem em que os widgets aparecem
    achados = {}
    for campo in acro['/Fields']:
        for nome, widget in folhas(campo):
            achados.setdefault(nome, []).append((estado(widget), caixa(widget)))

    saida = {'campos': {}, 'medicamentos': [], 'marcacoes': {}}

    faltando = []
    for pdfnome, nosso in CAMPOS.items():
        if pdfnome not in achados:
            faltando.append(pdfnome)
            continue
        saida['campos'][nosso] = achados[pdfnome][0][1]

    for nome_med, meses in MEDICAMENTOS:
        if nome_med not in achados:
            faltando.append(nome_med)
            continue
        linha = {'nome': achados[nome_med][0][1], 'meses': []}
        for m in meses:
            if m not in achados:
                faltando.append(m)
                continue
            linha['meses'].append(achados[m][0][1])
        saida['medicamentos'].append(linha)

    for pdfnome, (nosso, valores) in MARCACOES.items():
        if pdfnome not in achados:
            faltando.append(pdfnome)
            continue
        widgets = achados[pdfnome]
        if len(widgets) != len(valores):
            raise SystemExit('%s tem %d quadrados, esperava %d — a ordem das '
                             'opções precisa ser revista' % (pdfnome, len(widgets), len(valores)))
        # a ordem dos kids é a ordem de exportação (/0, /1, ...), não a do papel
        widgets = sorted(widgets, key=lambda w: (w[0] or ''))
        saida['marcacoes'][nosso] = dict(zip(valores, [w[1] for w in widgets]))

    if faltando:
        raise SystemExit('campos não encontrados no PDF: ' + ', '.join(faltando))

    # ------------------------------------------------------------- achatamento
    escritor = PdfWriter()
    escritor.add_page(leitor.pages[0])
    pagina = escritor.pages[0]
    if '/Annots' in pagina:
        del pagina[NameObject('/Annots')]
    raiz = escritor._root_object
    if '/AcroForm' in raiz:
        del raiz[NameObject('/AcroForm')]
    if '/Names' in raiz:
        del raiz[NameObject('/Names')]

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    with open(DESTINO, 'wb') as f:
        escritor.write(f)

    with open(COORD, 'w', encoding='utf-8') as f:
        json.dump(saida, f, ensure_ascii=False, indent=1, sort_keys=True)

    with open(COORD_JS, 'w', encoding='utf-8') as f:
        f.write('/* Retângulos dos campos do modelo oficial do LME.\n\n'
                '   Gerado por ferramentas/preparar-lme-oficial.py a partir dos campos\n'
                '   AcroForm da versão eletrônica publicada pelo Ministério da Saúde.\n'
                '   Não edite à mão: rode o script de novo. */\n\n'
                'window.CoordLmeOficial = ')
        json.dump(saida, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write(';\n')

    conferencia = PdfReader(DESTINO)
    print('assets/pdf/lme-oficial.pdf  %d página, %d campos de formulário restantes'
          % (len(conferencia.pages), len(conferencia.get_fields() or {})))
    print('%d campos simples, %d linhas de medicamento, %d grupos de marcação'
          % (len(saida['campos']), len(saida['medicamentos']), len(saida['marcacoes'])))
    print('coordenadas em ' + COORD_JS)


if __name__ == '__main__':
    main()
