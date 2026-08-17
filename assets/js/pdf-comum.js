/* Funções compartilhadas pelos formulários — HULW/UFPB
   Coordenadas sempre em pontos PDF, origem no canto inferior esquerdo da página.

   Todo documento escreve por cima de um modelo em branco (`modelo`). Os modelos
   oficiais do SUS vêm prontos; os do HULW são gerados por ferramentas/gerar-modelos.py. */

window.Laudos = (function () {
  'use strict';

  var PDFLIB_LOCAL = 'assets/js/vendor/pdf-lib.min.js';
  var PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

  var ESTABELECIMENTO = 'HOSPITAL UNIVERSITÁRIO LAURO WANDERLEY';
  var CNES = '2400243';

  var TAM = 10.5;       // corpo padrão
  var TAM_CEL = 10;     // dentro das células
  var TAM_MARCA = 9.5;  // "X" das marcações

  // ------------------------------------------------------------------ texto

  function digitos(v) { return (v || '').replace(/\D+/g, ''); }

  // Helvetica padrão do PDF usa WinAnsi; troca o que estiver fora da faixa
  function normalizar(t) {
    return (t || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ');
  }

  function limpar(t) {
    return normalizar(t).replace(/\s+/g, ' ').trim();
  }

  // preserva as quebras de linha digitadas pelo usuário
  function limparBloco(t) {
    return normalizar(t)
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .trim();
  }

  function semAcento(t) {
    return limpar(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ---------------------------------------------------------------- máscaras

  var mascaras = {
    cns: function (v) {
      var d = digitos(v).slice(0, 15);
      return d.replace(/^(\d{3})(\d{0,4})(\d{0,4})(\d{0,4}).*$/, function (_, a, b, c, e) {
        return [a, b, c, e].filter(Boolean).join(' ');
      });
    },
    cpf: function (v) {
      var d = digitos(v).slice(0, 11);
      return d.replace(/^(\d{3})(\d{0,3})(\d{0,3})(\d{0,2}).*$/, function (_, a, b, c, e) {
        var s = a;
        if (b) s += '.' + b;
        if (c) s += '.' + c;
        if (e) s += '-' + e;
        return s;
      });
    },
    data: function (v) {
      var d = digitos(v).slice(0, 8);
      if (d.length > 4) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
      if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
      return d;
    },
    cep: function (v) {
      var d = digitos(v).slice(0, 8);
      return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
    },
    telefone: function (v) {
      var d = digitos(v).slice(0, 11);
      if (d.length <= 2) return d.length ? '(' + d : d;
      var ddd = d.slice(0, 2), n = d.slice(2);
      if (!n) return '(' + ddd + ') ';
      if (n.length <= 4) return '(' + ddd + ') ' + n;
      var corte = n.length > 8 ? 5 : 4;
      return '(' + ddd + ') ' + n.slice(0, corte) + '-' + n.slice(corte);
    },
    uf: function (v) { return (v || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2); },
    cid: function (v) { return (v || '').replace(/[^a-zA-Z0-9.]/g, '').toUpperCase().slice(0, 6); },
    inteiro: function (v) { return digitos(v).slice(0, 3); },
    // só dígitos, sem limite próprio: quem limita é o maxlength do campo
    numero: function (v) { return digitos(v); }
  };

  function paraData(v) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
    if (!m) return null;
    var dia = +m[1], mes = +m[2], ano = +m[3];
    if (mes < 1 || mes > 12 || ano < 1900 || ano > 2200) return null;
    var d = new Date(ano, mes - 1, dia);
    if (d.getDate() !== dia || d.getMonth() !== mes - 1 || d.getFullYear() !== ano) return null;
    return d;
  }

  function dataValida(v) { return !!paraData(v); }

  function hoje() {
    var h = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(h.getDate()) + '/' + p(h.getMonth() + 1) + '/' + h.getFullYear();
  }

  // idade em anos completos; abaixo de 2 anos, em meses
  function idade(nascimento, referencia) {
    var n = paraData(nascimento);
    if (!n) return '';
    var r = paraData(referencia) || new Date();
    var meses = (r.getFullYear() - n.getFullYear()) * 12 + (r.getMonth() - n.getMonth());
    if (r.getDate() < n.getDate()) meses -= 1;
    if (meses < 0) return '';
    if (meses < 24) return meses + (meses === 1 ? ' mês' : ' meses');
    var anos = Math.floor(meses / 12);
    return anos + (anos === 1 ? ' ano' : ' anos');
  }

  // ----------------------------------------------------------------- desenho

  function criarPincel(pg, fontes) {
    var fn = fontes.normal, fb = fontes.negrito;
    var fi = fontes.italico || fn, fbi = fontes.negritoItalico || fb;
    var rgb = window.PDFLib.rgb;
    var PRETO = rgb(0, 0, 0);

    function f(negrito) { return negrito ? fb : fn; }
    function fonteDe(neg, ita) {
      return neg ? (ita ? fbi : fb) : (ita ? fi : fn);
    }
    function larg(t, tam, negrito) { return f(negrito).widthOfTextAtSize(t, tam); }

    // ---- primitivas de página inteira

    function txt(texto, x, y, tam, negrito) {
      texto = limpar(texto);
      if (!texto) return;
      pg.drawText(texto, { x: x, y: y, size: tam || TAM, font: f(negrito), color: PRETO });
    }

    // encolhe até caber na largura disponível
    function txtLim(texto, x, y, tam, larguraMax, negrito) {
      texto = limpar(texto);
      if (!texto) return;
      var t = tam || TAM;
      while (t > 5.5 && larg(texto, t, negrito) > larguraMax) t -= 0.25;
      pg.drawText(texto, { x: x, y: y, size: t, font: f(negrito), color: PRETO });
    }

    function txtC(texto, cx, y, tam, negrito, larguraMax) {
      texto = limpar(texto);
      if (!texto) return;
      var t = tam || TAM;
      if (larguraMax) while (t > 5.5 && larg(texto, t, negrito) > larguraMax) t -= 0.25;
      pg.drawText(texto, { x: cx - larg(texto, t, negrito) / 2, y: y, size: t, font: f(negrito), color: PRETO });
    }

    // ------------------------------------------------------- markdown

    /* Um bloco de texto longo é interpretado como markdown (ver markdown.js).
       Texto sem marcação nenhuma sai exatamente como texto corrido. */

    function fatias(partes, forcarNegrito, forcarItalico) {
      var toks = [];
      (partes || []).forEach(function (p) {
        String(p.t).split(/(\s+)/).forEach(function (s) {
          if (!s) return;
          toks.push({ t: s, n: p.n || forcarNegrito, i: p.i || forcarItalico,
                      esp: /^\s+$/.test(s) });
        });
      });
      return toks;
    }

    function largTok(tk, tam) {
      return fonteDe(tk.n, tk.i).widthOfTextAtSize(tk.t, tam);
    }

    function quebrarTokens(toks, tam, largura) {
      var linhas = [], atual = [], w = 0;
      toks.forEach(function (tk) {
        var lw = largTok(tk, tam);
        if (tk.esp) {
          if (atual.length) { atual.push(tk); w += lw; }
          return;
        }
        if (w + lw > largura && atual.length) {
          while (atual.length && atual[atual.length - 1].esp) w -= largTok(atual.pop(), tam);
          linhas.push(atual);
          atual = [tk]; w = lw;
        } else {
          atual.push(tk); w += lw;
        }
      });
      if (atual.length) linhas.push(atual);
      return linhas;
    }

    /* Converte os blocos do markdown em linhas desenháveis, já quebradas. */
    function montarLinhas(bs, tam, largura, negBase) {
      var linhas = [];
      bs.forEach(function (b) {
        if (b.tipo === 'vazia') { linhas.push({ avanco: tam * 0.66 }); return; }
        if (b.tipo === 'regua') { linhas.push({ regua: true, avanco: tam * 0.95 }); return; }

        var t = tam * (b.escala || 1);
        var recuo = b.recuo || 0;
        var toks = fatias(b.partes, negBase || b.forcarNegrito, b.forcarItalico);
        var qs = quebrarTokens(toks, t, largura - recuo);
        if (!qs.length) qs = [[]];
        qs.forEach(function (ln, k) {
          linhas.push({
            toks: ln, tam: t, recuo: recuo, avanco: t * 1.32,
            prefixo: k === 0 ? (b.marcador || null) : null,
            prefixoNegrito: !!negBase
          });
        });
      });
      return linhas;
    }

    function alturaLinhas(linhas) {
      if (!linhas.length) return 0;
      var soma = linhas[0].tam ? linhas[0].tam : 0;
      for (var k = 0; k < linhas.length - 1; k++) soma += linhas[k].avanco;
      return soma;
    }

    function desenharLinhas(linhas, x, yTopo, largura) {
      var y = yTopo;
      linhas.forEach(function (ln, k) {
        y -= k === 0 ? (ln.tam || 0) * 0.85 : linhas[k - 1].avanco;

        if (ln.regua) {
          pg.drawLine({
            start: { x: x, y: y + 2 }, end: { x: x + largura, y: y + 2 },
            thickness: 0.6, color: rgb(0.55, 0.55, 0.55)
          });
          return;
        }
        if (!ln.toks) return;

        var cx = x + ln.recuo;
        if (ln.prefixo) {
          pg.drawText(ln.prefixo, {
            x: x, y: y, size: ln.tam,
            font: fonteDe(ln.prefixoNegrito, false), color: PRETO
          });
        }
        ln.toks.forEach(function (tk) {
          if (!tk.esp) {
            pg.drawText(tk.t, {
              x: cx, y: y, size: ln.tam, font: fonteDe(tk.n, tk.i), color: PRETO
            });
          }
          cx += largTok(tk, ln.tam);
        });
      });
    }

    /* Bloco de texto dentro de uma área [x0, y0, x1, y1], reduzindo o corpo
       até caber. Devolve true se ainda assim sobrou texto. */
    function bloco(texto, area, opcoes) {
      opcoes = opcoes || {};
      var limpo = limparBloco(texto);
      if (!limpo) return false;

      var negBase = opcoes.negrito !== false;
      var largura = area[2] - area[0];
      var alturaMax = area[3] - area[1];
      var bs = window.Markdown.blocos(limpo);

      var t = opcoes.tam || TAM, linhas;
      while (true) {
        linhas = montarLinhas(bs, t, largura, negBase);
        if (alturaLinhas(linhas) <= alturaMax || t <= (opcoes.minimo || 7)) break;
        t -= 0.5;
      }

      // ainda sobrando: corta as linhas que não cabem
      var cabem = linhas.length;
      while (cabem > 1 && alturaLinhas(linhas.slice(0, cabem)) > alturaMax) cabem--;
      desenharLinhas(linhas.slice(0, cabem), area[0], area[3], largura);
      return cabem < linhas.length;
    }

    // ---- helpers dos formulários (escrita por cima do modelo)

    // ponto de escrita solto: { x, y, w } — usado nos modelos do HULW
    function emPonto(texto, ponto, opcoes) {
      opcoes = opcoes || {};
      txtLim(texto, ponto.x, ponto.y, opcoes.tam || TAM, ponto.w, opcoes.negrito !== false);
    }

    function baseDe(caixa) {
      var h = caixa[3] - caixa[1];
      return caixa[1] + Math.max(4, (h - 6) * 0.28 + 1.5);
    }

    function emCaixa(texto, caixa, tam) {
      txtLim(texto, caixa[0] + 4, baseDe(caixa), tam || TAM, caixa[2] - caixa[0] - 8, true);
    }

    function emCaixaCentro(texto, caixa, tam) {
      txtC(texto, (caixa[0] + caixa[2]) / 2, baseDe(caixa), tam || TAM, true, caixa[2] - caixa[0] - 8);
    }

    function emCelulas(texto, grade) {
      var s = (texto || '').toString();
      if (!s) return;
      var n = grade.b.length - 1;
      var base = grade.y + (grade.dy === undefined ? 2.5 : grade.dy);
      if (s.length <= n) {
        for (var i = 0; i < s.length; i++) {
          var cx = (grade.b[i] + grade.b[i + 1]) / 2;
          pg.drawText(s[i], { x: cx - larg(s[i], TAM_CEL, true) / 2, y: base, size: TAM_CEL, font: fb });
        }
        return;
      }
      // mais caracteres que células: distribui uniformemente e reduz o corpo
      var x0 = grade.b[0], x1 = grade.b[grade.b.length - 1];
      var passo = (x1 - x0) / s.length;
      var t = Math.max(6.5, Math.min(TAM_CEL, passo * 0.62));
      for (var j = 0; j < s.length; j++) {
        var c = x0 + passo * (j + 0.5);
        pg.drawText(s[j], { x: c - larg(s[j], t, true) / 2, y: base + 0.5, size: t, font: fb });
      }
    }

    function emData(valor, area) {
      var d = digitos(valor);
      if (d.length !== 8) return;
      [[d.slice(0, 2), area.d], [d.slice(2, 4), area.m], [d.slice(4), area.a]].forEach(function (p) {
        txtC(p[0], (p[1][0] + p[1][1]) / 2, area.y + 3.5, TAM, true);
      });
    }

    function marcar(ponto, tam) {
      txtC('X', ponto[0], ponto[1], tam || TAM_MARCA, true);
    }

    /* Caixa dos formulários do SUS: o rótulo ocupa a borda de cima. */
    function multilinha(texto, caixa, opcoes) {
      opcoes = opcoes || {};
      return bloco(texto, [caixa[0] + 8, caixa[1] + 7, caixa[2] - 8, caixa[3] - 14],
                   { negrito: opcoes.negrito !== false, tam: opcoes.tam || 10.5 });
    }

    return {
      txt: txt, txtLim: txtLim, txtC: txtC,
      bloco: bloco, emPonto: emPonto, larguraDe: larg,
      emCaixa: emCaixa, emCaixaCentro: emCaixaCentro, emCelulas: emCelulas,
      emData: emData, marcar: marcar, multilinha: multilinha
    };
  }

  // ------------------------------------------------------------- carregar lib

  function carregarScript(src) {
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { falha(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function garantirPdfLib() {
    if (window.PDFLib) return Promise.resolve();
    return carregarScript(PDFLIB_LOCAL)
      .catch(function () { return null; })
      .then(function () {
        if (window.PDFLib) return null;
        return carregarScript(PDFLIB_CDN);
      })
      .then(function () {
        if (!window.PDFLib) throw new Error('Não foi possível carregar a biblioteca de PDF.');
      });
  }

  // ------------------------------------------------------- arquivos auxiliares

  var cache = {};
  function bytesDe(caminho) {
    if (!cache[caminho]) {
      cache[caminho] = fetch(caminho).then(function (r) {
        if (!r.ok) throw new Error('Arquivo não encontrado: ' + caminho + ' (' + r.status + ').');
        return r.arrayBuffer();
      }).catch(function (e) { delete cache[caminho]; throw e; });
    }
    return cache[caminho];
  }

  /* Qual PDF em branco usar. Normalmente é um caminho fixo, mas o documento
     pode devolver um caminho conforme o preenchido — o LME, por exemplo, tem
     dois modelos oficiais em circulação e quem emite escolhe. */
  function modeloDe(documento, dados) {
    return typeof documento.modelo === 'function'
      ? documento.modelo(dados || {})
      : documento.modelo;
  }

  /* Preenche um documento e devolve { doc, cortou }. */
  function preencher(documento, dados) {
    return garantirPdfLib()
      .then(function () { return bytesDe(modeloDe(documento, dados)); })
      .then(function (b) { return window.PDFLib.PDFDocument.load(b); })
      .then(function (doc) {
        var StandardFonts = window.PDFLib.StandardFonts;
        return Promise.all([
          doc.embedFont(StandardFonts.Helvetica),
          doc.embedFont(StandardFonts.HelveticaBold),
          doc.embedFont(StandardFonts.HelveticaOblique),
          doc.embedFont(StandardFonts.HelveticaBoldOblique)
        ]).then(function (fontes) {
          var paginas = doc.getPages();
          var pincel = criarPincel(paginas[0], {
            normal: fontes[0], negrito: fontes[1],
            italico: fontes[2], negritoItalico: fontes[3]
          });
          var cortou = documento.preencher(pincel, dados, {
            estabelecimento: ESTABELECIMENTO,
            cnes: CNES,
            digitos: digitos,
            idade: idade
          });
          return { doc: doc, cortou: !!cortou };
        });
      });
  }


  return {
    documentos: [],
    registrar: function (d) { this.documentos.push(d); },
    ESTABELECIMENTO: ESTABELECIMENTO,
    CNES: CNES,
    digitos: digitos,
    limpar: limpar,
    limparBloco: limparBloco,
    semAcento: semAcento,
    mascaras: mascaras,
    dataValida: dataValida,
    hoje: hoje,
    idade: idade,
    garantirPdfLib: garantirPdfLib,
    bytesDe: bytesDe,
    preencher: preencher
  };
})();
