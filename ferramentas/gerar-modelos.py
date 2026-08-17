#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os modelos em branco usados pelo site.

Os formulários originais existiam apenas digitalizados; aqui eles são redesenhados
em vetor, com os logotipos atuais (HU Brasil no lugar de EBSERH).

Saída:
  assets/pdf/requisicao-exames.pdf              A5 paisagem  (595 x 420)
  assets/pdf/receituario-simples.pdf            A5 retrato   (420 x 595)
  assets/pdf/receituario-controle-especial.pdf  A4 paisagem  (842 x 595), duas vias
  assets/pdf/outros-documentos.pdf              A5 retrato   (420 x 595)
  assets/pdf/faa.pdf                            A5 paisagem  (595 x 420)

  ferramentas/coordenadas.json   pontos de preenchimento, para os módulos JS

Uso (a partir da raiz do site):  python3 ferramentas/gerar-modelos.py
Requer: reportlab
"""

import json
import os

from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RAIZ, 'assets', 'img')
PDF = os.path.join(RAIZ, 'assets', 'pdf')

N = 'Helvetica'
B = 'Helvetica-Bold'

CNPJ = 'CNPJ 15.126.437/0017-00'
ENDERECO = 'Campus I – S/N – Cidade Universitária – João Pessoa/PB – CEP 58050-000'
TELEFONE = 'Telefone (83) 3206-0600'


# --------------------------------------------------------------------- desenho

class Folha:
    """Canvas com utilidades de formulário e registro dos pontos de preenchimento."""

    def __init__(self, c, campos):
        self.c = c
        self.campos = campos
        self.rotulos = []      # rótulos de borda, desenhados por último

    # -- texto

    def txt(self, t, x, y, tam=9, negrito=False):
        self.c.setFont(B if negrito else N, tam)
        self.c.drawString(x, y, t)

    def txtc(self, t, cx, y, tam=9, negrito=False):
        self.c.setFont(B if negrito else N, tam)
        self.c.drawCentredString(cx, y, t)

    def larg(self, t, tam=9, negrito=False):
        return pdfmetrics.stringWidth(t, B if negrito else N, tam)

    # -- traços

    def ret(self, x0, y0, x1, y1, esp=0.8):
        self.c.setLineWidth(esp)
        self.c.rect(x0, y0, x1 - x0, y1 - y0)

    def linha(self, x0, y0, x1, y1, esp=0.8):
        self.c.setLineWidth(esp)
        self.c.line(x0, y0, x1, y1)

    def img(self, arquivo, x, y, w, h):
        im = ImageReader(os.path.join(IMG, arquivo))
        iw, ih = im.getSize()
        e = min(w / iw, h / ih)
        lw, lh = iw * e, ih * e
        self.c.drawImage(im, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh, mask='auto')

    # -- células

    def celula(self, chave, rotulo, x0, y0, x1, y1, tam_rotulo=8, moldura=True):
        """Rótulo e valor na mesma linha. Registra o ponto de escrita do valor."""
        if moldura:
            self.ret(x0, y0, x1, y1)
        base = y0 + (y1 - y0 - 8) / 2 + 1
        vx = x0 + 4
        if rotulo:
            self.txt(rotulo, x0 + 4, base, tam_rotulo)
            vx = x0 + 4 + self.larg(rotulo, tam_rotulo) + 5
        if chave:
            self.campos[chave] = {'x': round(vx, 1), 'y': round(base, 1), 'w': round(x1 - vx - 4, 1)}
        return base

    def area(self, chave, rotulo, x0, y0, x1, y1, tam_rotulo=8, moldura=True):
        """Rótulo no alto e área livre embaixo. Registra a área de escrita."""
        if moldura:
            self.ret(x0, y0, x1, y1)
        topo = y1 - 4
        if rotulo:
            self.txt(rotulo, x0 + 4, y1 - 11, tam_rotulo, negrito=True)
            topo = y1 - 15
        if chave:
            self.campos[chave] = [round(x0 + 5, 1), round(y0 + 4, 1),
                                  round(x1 - 5, 1), round(topo, 1)]

    def cabecalho(self, x0, y0, x1, y1, titulo, subtitulo=None):
        """Logo HULW | título | logo HU Brasil."""
        lg = 96.0
        self.ret(x0, y0, x1, y1)
        self.linha(x0 + lg, y0, x0 + lg, y1)
        self.linha(x1 - lg - 12, y0, x1 - lg - 12, y1)
        self.img('hulw.png', x0 + 5, y0 + 4, lg - 10, y1 - y0 - 8)
        self.img('hubrasil.png', x1 - lg - 7, y0 + 6, lg + 2, y1 - y0 - 12)
        cx = (x0 + lg + x1 - lg - 12) / 2
        if subtitulo:
            self.txtc(titulo, cx, (y0 + y1) / 2 + 3, 14, negrito=True)
            self.txtc(subtitulo, cx, (y0 + y1) / 2 - 12, 11.5, negrito=True)
        else:
            self.txtc(titulo, cx, (y0 + y1) / 2 - 5, 15, negrito=True)

    def rodape(self, texto, cx, y):
        self.txtc(texto, cx, y, 6.5)

    # -- caixas arredondadas com rótulo na borda (estilo dos formulários do SUS)

    def arred(self, x0, y0, x1, y1, r=6, esp=0.8):
        self.c.setLineWidth(esp)
        self.c.roundRect(x0, y0, x1 - x0, y1 - y0, r)

    def rotulo_borda(self, texto, x, y, tam=7, negrito=False, folga=2.5):
        """Enfileira um rótulo que senta na borda de uma caixa.

        O desenho é adiado para o fim da página: se o vão branco fosse aberto
        agora, qualquer traço desenhado depois passaria por cima do texto — foi
        o que acontecia com as grades de células."""
        self.rotulos.append((texto, x, y, tam, negrito, folga))

    def desenhar_rotulos(self):
        for texto, x, y, tam, negrito, folga in self.rotulos:
            w = self.larg(texto, tam, negrito)
            self.c.setFillColorRGB(1, 1, 1)
            self.c.rect(x - folga, y - 2.2, w + 2 * folga, tam + 1.4, stroke=0, fill=1)
            self.c.setFillColorRGB(0, 0, 0)
            self.txt(texto, x, y, tam, negrito)
        self.rotulos = []

    def grupo(self, chave, rotulo, x0, y0, x1, y1, tam=7, base=None, r=6):
        """Caixa arredondada com rótulo na borda superior; registra o ponto
        de escrita logo abaixo do rótulo."""
        self.arred(x0, y0, x1, y1, r)
        if rotulo:
            self.rotulo_borda(rotulo, x0 + 14, y1 - 3.5, tam)
        if chave:
            b = base if base is not None else y0 + 4.5
            self.campos[chave] = {'x': round(x0 + 4, 1), 'y': round(b, 1),
                                  'w': round(x1 - x0 - 8, 1)}

    def celulas(self, chave, x0, x1, y0, y1, n, dy=4.0):
        """Grade de n células de caractere. Registra os limites."""
        self.ret(x0, y0, x1, y1)
        passo = (x1 - x0) / n
        limites = [round(x0 + i * passo, 2) for i in range(n + 1)]
        self.c.setLineWidth(0.6)
        for i in range(1, n):
            x = x0 + i * passo
            self.c.line(x, y0, x, y0 + (y1 - y0) * 0.62)
        if chave:
            self.campos[chave] = {'b': limites, 'y': round(y0, 1), 'dy': dy}
        return limites

    def caixinha(self, chave, x, y, lado=5.7):
        """Quadradinho de marcação. Registra o centro e a linha de base do X."""
        self.c.setLineWidth(0.8)
        self.c.rect(x, y, lado, lado)
        if chave:
            self.campos[chave] = [round(x + lado / 2, 2), round(y + lado / 2 - 2.85, 2)]
        return x + lado + 2.5


# ------------------------------------------------------- requisição de exames

def requisicao_exames(destino):
    campos = {}
    c = canvas.Canvas(destino, pagesize=(595, 420))
    f = Folha(c, campos)
    E, D = 16, 579

    f.cabecalho(E, 348, D, 402, 'REQUISIÇÃO DE EXAMES')

    f.celula('nome', 'Nome do paciente:', E, 326, 430, 348)
    f.celula('prontuario', 'Nº prontuário:', 430, 326, D, 348)

    f.celula('idade', 'Idade:', E, 304, 110, 326)
    f.celula('sexo', 'Sexo:', 110, 304, 205, 326)
    f.celula('social', 'C. Social:', 205, 304, 430, 326)
    f.celula('enfermaria', 'Enf.:', 430, 304, 505, 326)
    f.celula('leito', 'Leito:', 505, 304, D, 326)

    f.area('dadosClinicos', 'DADOS CLÍNICOS:', E, 250, D, 304)

    # urgência + justificativa dividem a mesma faixa
    f.ret(E, 196, D, 250)
    f.txt('URGÊNCIA:', E + 4, 239, 8, negrito=True)
    cx = E + 4 + f.larg('URGÊNCIA:', 8, True) + 6
    f.ret(cx, 236, cx + 10, 246, 0.9)
    campos['urgencia'] = [round(cx + 5, 1), 238.0]
    f.txt('JUSTIFICATIVA:', cx + 20, 239, 8, negrito=True)
    campos['justificativa'] = [E + 5, 200.0, D - 5, 232.0]

    f.area('material', 'MATERIAL A EXAMINAR:', E, 168, D, 196)
    f.area('exames', 'EXAMES:', E, 84, D, 168)

    f.ret(E, 66, D, 84)
    f.txtc('* AS REQUISIÇÕES INCOMPLETAS OU ILEGÍVEIS NÃO SERÃO ATENDIDAS *',
           (E + D) / 2, 72, 9, negrito=True)

    f.celula('data', 'Data:', E, 28, 230, 66)
    f.ret(230, 28, D, 66)
    f.linha(250, 44, D - 20, 44, 0.6)
    f.txtc('Carimbo / assinatura do médico – CRM', (230 + D) / 2, 34, 7.5)

    f.rodape('LAC-001 · Requisição de exames · Hospital Universitário Lauro Wanderley – UFPB',
             (E + D) / 2, 17)

    c.showPage()
    c.save()
    return {'pagina': [595, 420], 'campos': campos}


# --------------------------------------------------------- receituário simples

ORIENTACOES = [
    ('Para marcação', True), ('de exames,', True), ('consultas e', True), ('cirurgias:', True),
    ('', False),
    ('- PSF do seu', False), ('bairro', False),
    ('', False),
    ('- Secretaria de', False), ('saúde do seu', False), ('município', False),
    ('', False),
    ('Urgências:', True),
    ('', False),
    ('- SAMU 192', False),
    ('', False),
    ('- Corpo de', False), ('Bombeiros 193', False),
]


def receituario_simples(destino):
    campos = {}
    c = canvas.Canvas(destino, pagesize=(420, 595))
    f = Folha(c, campos)
    E, D = 16, 404

    f.cabecalho(E, 540, D, 578, 'RECEITUÁRIO')

    f.celula('nome', 'Nome do paciente:', E, 510, D, 540)
    f.celula('data', 'Data:', E, 484, 215, 510)
    f.celula('prontuario', 'Prontuário:', 215, 484, D, 510)

    # corpo: faixa de orientações à esquerda, prescrição à direita
    SEP = 92
    f.ret(E, 56, D, 484)
    f.linha(SEP, 56, SEP, 484)

    y = 452
    for texto, negrito in ORIENTACOES:
        if texto:
            f.txtc(texto, (E + SEP) / 2, y, 7.5, negrito=negrito)
        y -= 11

    campos['prescricao'] = [SEP + 8, 110.0, D - 8, 474.0]

    cxd = (SEP + D) / 2
    f.txtc(CNPJ, cxd, 88, 8, negrito=True)
    f.txtc(ENDERECO, cxd, 77, 6.5)
    f.txtc(TELEFONE, cxd, 68, 6.5)

    f.rodape('Receituário simples · Hospital Universitário Lauro Wanderley – UFPB', (E + D) / 2, 40)

    c.showPage()
    c.save()
    return {'pagina': [420, 595], 'campos': campos}


# ------------------------------------------- receituário de controle especial

def via_controle_especial(f, x0, campos, sufixo):
    E, D = x0 + 16, x0 + 405

    def k(nome):
        return nome + sufixo

    # cabeçalho: identificação do emitente | título
    f.ret(E, 470, 232 + x0, 560)
    cxe = (E + 232 + x0) / 2
    f.img('hulw.png', E + 4, 518, 92, 38)
    f.img('hubrasil.png', E + 100, 524, 100, 26)
    f.txtc(CNPJ, cxe, 505, 8.5, negrito=True)
    f.txtc('Campus I – S/N – Cidade Universitária', cxe, 495, 7)
    f.txtc('João Pessoa/PB – CEP 58050-000', cxe, 486, 7)
    f.txtc(TELEFONE, cxe, 477, 7)

    f.ret(240 + x0, 512, D, 560)
    f.txtc('RECEITUÁRIO', (240 + x0 + D) / 2, 539, 13, negrito=True)
    f.txtc('CONTROLE ESPECIAL', (240 + x0 + D) / 2, 522, 12, negrito=True)
    f.txt('1.ª via – retenção da Farmácia ou Drogaria', 242 + x0, 500, 7.5)
    f.txt('2.ª via – orientação ao Paciente', 242 + x0, 490, 7.5)
    f.linha(248 + x0, 471, D, 471, 0.6)
    f.txtc('Carimbo do médico', (240 + x0 + D) / 2, 462, 7.5)

    f.celula(k('paciente'), 'Paciente:', E, 434, D, 454, moldura=False)
    f.linha(E, 434, D, 434, 0.6)
    f.celula(k('endereco'), 'Endereço:', E, 412, D, 432, moldura=False)
    f.linha(E, 412, D, 412, 0.6)

    # a prescrição foi encurtada para sobrar espaço de assinatura e carimbo:
    # a faixa entre a linha de assinatura (180) e o fim da prescrição (258)
    # fica livre para o carimbo do médico.
    campos[k('prescricao')] = [E + 2, 258.0, D - 2, 402.0]

    f.celula(k('data'), 'Data:', E, 176, 190 + x0, 196, moldura=False)
    f.linha(E, 176, 190 + x0, 176, 0.6)
    f.linha(240 + x0, 180, D, 180, 0.6)
    f.txtc('Assinatura e carimbo do médico', (240 + x0 + D) / 2, 168, 7.5)

    # identificação do comprador
    f.ret(E, 52, 212 + x0, 148)
    f.txtc('IDENTIFICAÇÃO DO COMPRADOR', (E + 212 + x0) / 2, 137, 7.5, negrito=True)
    for rotulo, y in (('Nome:', 120), ('Endereço:', 88), ('Cidade / UF:', 72), ('Telefone:', 56)):
        f.txt(rotulo, E + 6, y + 3, 7.5)
        f.linha(E + 6 + f.larg(rotulo, 7.5) + 4, y, 206 + x0, y, 0.5)
    # identidade e órgão emissor dividem a mesma linha
    f.txt('Ident.:', E + 6, 107, 7.5)
    meio = (E + 212 + x0) / 2 + 8
    f.linha(E + 6 + f.larg('Ident.:', 7.5) + 4, 104, meio - 42, 104, 0.5)
    f.txt('Órg. emissor:', meio - 38, 107, 7.5)
    f.linha(meio - 38 + f.larg('Órg. emissor:', 7.5) + 4, 104, 206 + x0, 104, 0.5)

    # identificação do fornecedor
    f.ret(220 + x0, 52, D, 148)
    f.txtc('IDENTIFICAÇÃO DO FORNECEDOR', (220 + x0 + D) / 2, 137, 7.5, negrito=True)
    f.linha(226 + x0, 82, D - 6, 82, 0.5)
    f.txt('Assinatura / farmacêutico', 226 + x0, 72, 7)
    f.linha(226 + x0, 62, D - 6, 62, 0.5)
    f.txt('Data', 226 + x0, 56, 7)

    f.rodape('Receituário de controle especial · Hospital Universitário Lauro Wanderley – UFPB',
             (E + D) / 2, 30)


def controle_especial(destino):
    campos = {}
    c = canvas.Canvas(destino, pagesize=(842, 595))
    f = Folha(c, campos)

    via_controle_especial(f, 0, campos, '1')
    via_controle_especial(f, 421, campos, '2')

    # linha de corte entre as duas vias
    c.setDash(3, 3)
    f.linha(421, 20, 421, 575, 0.5)
    c.setDash()

    c.showPage()
    c.save()
    return {'pagina': [842, 595], 'campos': campos}


# ------------------------------------------------------- outros documentos

def outros_documentos(destino):
    """Folha livre em A5: identificação do paciente, um campo de teor e espaço
    de assinatura. Serve para atestado, declaração, relatório — o que não tem
    formulário próprio."""
    campos = {}
    c = canvas.Canvas(destino, pagesize=(420, 595))
    f = Folha(c, campos)
    E, D = 16, 404

    f.cabecalho(E, 540, D, 578, 'DOCUMENTO')

    f.celula('nome', 'Nome do paciente:', E, 512, D, 540)
    f.celula('data', 'Data:', E, 486, 215, 512)
    f.celula('prontuario', 'Prontuário:', 215, 486, D, 512)

    # corpo: teor em cima, assinatura embaixo
    f.ret(E, 108, D, 480)
    campos['titulo'] = {'x': (E + D) / 2, 'y': 462.0, 'w': D - E - 24}
    campos['teor'] = [24.0, 176.0, 396.0, 470.0]
    campos['teorComTitulo'] = [24.0, 176.0, 396.0, 450.0]

    f.linha(122, 150, 298, 150, 0.7)
    campos['assinaturaNome'] = {'x': (E + D) / 2, 'y': 139.0, 'w': 240.0}
    campos['assinaturaRegistro'] = {'x': (E + D) / 2, 'y': 129.0, 'w': 260.0}

    cx = (E + D) / 2
    f.txtc(CNPJ, cx, 92, 7.5, negrito=True)
    f.txtc(ENDERECO, cx, 83, 6.5)
    f.txtc(TELEFONE, cx, 74, 6.5)
    f.rodape('Hospital Universitário Lauro Wanderley – UFPB', cx, 58)

    c.showPage()
    c.save()
    return {'pagina': [420, 595], 'campos': campos}


# ------------------------------------------------------------------------ FAA

OBSERVACOES_FAA = [
    ('1- ', 'CARO PACIENTE, A MARCAÇÃO DE SUA CONSULTA SÓ SERÁ POSSÍVEL MEDIANTE '
            'APRESENTAÇÃO DESTE DOCUMENTO.'),
    ('2- ', 'NÃO SENDO RETORNO OBRIGATÓRIO, APÓS A TERCEIRA CONSULTA, A MESMA DEVERÁ '
            'SER NOVAMENTE AUTORIZADA PELA SECRETARIA MUNICIPAL DE SAÚDE DE JOÃO PESSOA '
            'ATRAVÉS DA SUA CENTRAL DE MARCAÇÃO DE CONSULTA COM O FORMULÁRIO ESPECÍFICO '
            '(FICHA DE ENCAMINHAMENTO-REFERÊNCIA).')
]


def faa(destino):
    """Ficha de Atendimento Ambulatorial — retorno.

    Medida sobre uma digitalização do impresso, não estimada: as réguas do
    escaneamento foram detectadas por varredura, corrigida a inclinação de 0,8°,
    e convertidas com 0,20593 pt por pixel. A fidelidade é requisito — quem
    recebe a ficha no balcão reconhece o papel pelo desenho, e um layout
    "arrumado" corre o risco de não ser aceito.

    O que o original tem de peculiar, e que fica como está:

      * o rótulo fica ACIMA da caixa, menos em PRONTUÁRIO HULW, que fica ao lado;
      * CARIMBO E ASSINATURA fica DENTRO da própria caixa, no alto;
      * a base do carimbo alinha com a base de ESPECIALIDADE MÉDICA;
      * as caixas da grade têm larguras diferentes entre si (DIA e MÊS curtas,
        HORA e GRADE largas), e ALTA só existe na terceira linha, lá na direita,
        embaixo da coluna do carimbo;
      * não há moldura em volta da folha, nem rodapé."""
    campos = {}
    c = canvas.Canvas(destino, pagesize=(595, 420))
    f = Folha(c, campos)

    ROT = 8.8          # corpo dos rótulos, medido no impresso
    BASE_ROT = 3.0     # quanto o rótulo sobe acima da caixa

    def acima(texto, x, y_caixa_topo, tam=ROT):
        f.txt(texto, x, y_caixa_topo + BASE_ROT, tam, negrito=True)

    def valor(chave, cx, tam=10):
        """Ponto de escrita dentro de uma caixa [x0, y0, x1, y1]."""
        base = cx[1] + (cx[3] - cx[1] - tam * 0.717) / 2 + 0.5
        campos[chave] = {'x': round(cx[0] + 4, 1), 'y': round(base, 1),
                         'w': round(cx[2] - cx[0] - 8, 1)}

    # ------------------------------------------------------------- cabeçalho
    f.ret(27.5, 343.2, 127.4, 393.0)
    f.img('hulw.png', 31, 346, 93, 44)

    f.ret(140.4, 343.2, 457.3, 392.8)
    f.txtc('FICHA DE ATENDIMENTO AMBULATORIAL', 298.8, 372.5, 14, negrito=True)
    f.txtc('RETORNO', 298.8, 354.5, 12.4, negrito=True)

    f.ret(473.4, 344.2, 572.2, 393.5)
    f.img('hubrasil.png', 477, 350, 92, 38)

    # ------------------------------------------------------- dados de topo
    NOME = [16.0, 309.9, 370.0, 328.8]
    acima('NOME DO USUÁRIO', NOME[0], NOME[3])
    f.ret(*NOME)
    valor('nome', NOME)

    DATA = [468.8, 312.3, 573.4, 328.8]
    acima('DATA', DATA[0], DATA[3])
    f.ret(*DATA)
    valor('data', DATA)

    # o único rótulo do impresso que fica ao lado, e não acima
    PRONT = [106.6, 286.8, 330.0, 306.0]
    f.txt('PRONTUÁRIO HULW', 16.0, 292.4, ROT, negrito=True)
    f.ret(*PRONT)
    valor('prontuario', PRONT)

    # carimbo: rótulo dentro da caixa, e a base alinhada com especialidade
    BASE_COMUM = 165.5
    f.ret(342.2, BASE_COMUM, 579.0, 304.1)
    f.txt('CARIMBO E ASSINATURA DO MÉDICO (A)', 354.6, 290.1, 8.1, negrito=True)

    # --------------------------------------------------------------- corpo
    PATOL = [18.5, 213.8, 336.4, 259.1]
    acima('DESCRIÇÃO DA PATOLOGIA', PATOL[0], PATOL[3], 8.5)
    f.ret(*PATOL)
    campos['patologia'] = [PATOL[0] + 4, PATOL[1] + 4, PATOL[2] - 4, PATOL[3] - 4]

    ESP = [19.3, BASE_COMUM, 334.2, 190.6]
    acima('ESPECIALIDADE MÉDICA', ESP[0], ESP[3], 9.0)
    f.ret(*ESP)
    valor('especialidade', ESP)

    # ------------------------------------------------- grade de retorno
    f.txt('TIPO DE ENCAMINHAMENTO', 16.0, 147.2, 8.7, negrito=True)

    # larguras diferentes por coluna, como no impresso
    COLUNAS = [('dia', 'DIA:', 126.6, 162.6), ('mes', 'MÊS:', 197.0, 232.4),
               ('hora', 'HORA:', 277.9, 350.8), ('grade', 'GRADE:', 396.9, 476.6)]
    ALTA = ('alta', 'ALTA:', 522.3, 577.3)
    LINHAS = [(126.4, 143.7), (98.4, 115.9), (68.6, 87.5)]

    for i, (y0, y1) in enumerate(LINHAS):
        colunas = COLUNAS + ([ALTA] if i == len(LINHAS) - 1 else [])
        base_rot = y0 + (y1 - y0 - 9.1 * 0.717) / 2 + 0.5
        for chave, rot, x0, x1 in colunas:
            f.txt(rot, x0 - f.larg(rot, 9.1, True) - 4, base_rot, 9.1, negrito=True)
            f.ret(x0, y0, x1, y1)
            valor('r%d%s' % (i + 1, chave), [x0, y0, x1, y1], 9)

    # ---------------------------------------------------------- observações
    f.txt('OBSERVAÇÕES:', 76.3, 57.7, 7.6, negrito=True)

    y = 47.0
    for marca, texto in OBSERVACOES_FAA:
        primeira = True
        linha = marca
        for palavra in texto.split():
            teste = (linha + ' ' + palavra) if linha != marca else marca + palavra
            if f.larg(teste, 6.8, True) > 519:
                f.txt(linha, 60 if primeira else 60 + f.larg(marca, 6.8, True), y, 6.8, negrito=True)
                primeira = False
                linha = palavra
                y -= 9
            else:
                linha = teste
        f.txt(linha, 60 if primeira else 60 + f.larg(marca, 6.8, True), y, 6.8, negrito=True)
        y -= 10.5

    c.showPage()
    c.save()
    return {'pagina': [595, 420], 'campos': campos}


# ------------------------------------------------------------------------ main

def main():
    os.makedirs(PDF, exist_ok=True)
    saida = {
        'requisicao-exames': requisicao_exames(os.path.join(PDF, 'requisicao-exames.pdf')),
        'receituario-simples': receituario_simples(os.path.join(PDF, 'receituario-simples.pdf')),
        'receituario-controle-especial': controle_especial(
            os.path.join(PDF, 'receituario-controle-especial.pdf')),
        'outros-documentos': outros_documentos(os.path.join(PDF, 'outros-documentos.pdf')),
        'faa': faa(os.path.join(PDF, 'faa.pdf')),
    }
    destino = os.path.join(RAIZ, 'ferramentas', 'coordenadas.json')
    with open(destino, 'w', encoding='utf-8') as fp:
        json.dump(saida, fp, ensure_ascii=False, indent=2)
    for nome, dados in saida.items():
        print(nome, dados['pagina'], len(dados['campos']), 'campos')
    print('coordenadas em', destino)


if __name__ == '__main__':
    main()
