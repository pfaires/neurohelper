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

    A grade de datas e o carimbo saem em branco de propósito: quem preenche é o
    balcão da marcação, com a ficha na mão."""
    campos = {}
    c = canvas.Canvas(destino, pagesize=(595, 420))
    f = Folha(c, campos)
    E, D = 16, 579
    MEIO = 428          # divisa entre a coluna dos dados e a do carimbo

    f.cabecalho(E, 352, D, 406, 'FICHA DE ATENDIMENTO AMBULATORIAL', 'RETORNO')

    f.celula('nome', 'NOME DO USUÁRIO:', E, 328, MEIO, 350)
    f.celula('data', 'DATA:', MEIO, 328, D, 350)

    f.celula('prontuario', 'PRONTUÁRIO HULW:', E, 304, MEIO, 326)

    # carimbo: uma caixa só, alta, do lado direito
    f.ret(MEIO, 130, D, 326)
    f.txtc('CARIMBO E ASSINATURA', (MEIO + D) / 2, 314, 7, negrito=True)
    f.txtc('DO MÉDICO (A)', (MEIO + D) / 2, 305, 7, negrito=True)

    f.area('patologia', 'DESCRIÇÃO DA PATOLOGIA', E, 250, MEIO, 302)
    f.celula('especialidade', 'ESPECIALIDADE MÉDICA:', E, 226, MEIO, 248)

    # grade de retorno: três consultas, preenchidas à mão no balcão
    f.ret(E, 130, MEIO, 224)
    f.txt('TIPO DE ENCAMINHAMENTO', E + 5, 212, 8, negrito=True)

    linhas_y = [(184, 206), (158, 180), (132, 154)]
    for i, (y0, y1) in enumerate(linhas_y):
        ultima = i == len(linhas_y) - 1
        rotulos = ['DIA:', 'MÊS:', 'HORA:', 'GRADE:'] + (['ALTA:'] if ultima else [])
        larg = (MEIO - 10 - E) / len(rotulos)
        for k, r in enumerate(rotulos):
            x0 = E + 5 + k * larg
            f.celula(None, r, x0, y0, x0 + larg - 3, y1, tam_rotulo=7)

    # observações: texto fixo, quebrado na largura da folha
    f.ret(E, 58, D, 126)
    f.txt('OBSERVAÇÕES:', E + 5, 114, 8, negrito=True)

    y = 103
    for marca, texto in OBSERVACOES_FAA:
        recuo = E + 5
        primeira = True
        linha = marca
        for palavra in texto.split():
            teste = (linha + ' ' + palavra).strip() if linha != marca else marca + palavra
            if f.larg(teste, 6.8) > D - E - 14:
                f.txt(linha, recuo if primeira else recuo + f.larg(marca, 6.8), y, 6.8)
                if primeira:
                    primeira = False
                linha = palavra
                y -= 9
            else:
                linha = teste
        f.txt(linha, recuo if primeira else recuo + f.larg(marca, 6.8), y, 6.8)
        y -= 11

    f.rodape('FAA · Hospital Universitário Lauro Wanderley – UFPB', (E + D) / 2, 44)

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
