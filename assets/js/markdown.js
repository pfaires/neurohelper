/* Markdown para os campos de texto longo — HULW/UFPB

   Um subconjunto pequeno e conservador, escolhido para não estragar texto que
   já é escrito à mão nos formulários. Prescrições costumam trazer traços de
   preenchimento ("Prednisona 20 mg ------ 30 comprimidos") e asteriscos soltos,
   então as regras exigem sinais claros de intenção:

     **negrito**  __negrito__
     *itálico*    _itálico_     só quando abre e fecha na mesma linha, colado
                                à palavra — "a * b" continua sendo asterisco
     # Título     ## Subtítulo  ### Menor
     - item       * item        + item
     1. item                    numeração preservada
     > citação
     ---                        linha separadora, só quando a linha inteira é
                                composta de três ou mais traços

   Sem markdown nenhum, o texto sai exatamente como antes. */

window.Markdown = (function () {
  'use strict';

  var LISTA = /^\s*([-*+])\s+(.*)$/;
  var NUMERADA = /^\s*(\d{1,2}[.)])\s+(.*)$/;
  var TITULO = /^\s*(#{1,3})\s+(.*)$/;
  var CITACAO = /^\s*>\s?(.*)$/;
  var REGUA = /^\s*([-*_])\1{2,}\s*$/;

  // ------------------------------------------------------------------ inline

  function fecha(linha, i, sinal) {
    for (var j = i + 2; j < linha.length; j++) {
      if (linha[j] === sinal && linha[j - 1] !== ' ') return true;
    }
    return false;
  }

  /* Divide a linha em trechos com estilo: [{ t, n: negrito, i: itálico }] */
  function trechos(linha) {
    var partes = [], buf = '', neg = false, ita = false, k = 0;

    function corta() {
      if (buf) { partes.push({ t: buf, n: neg, i: ita }); buf = ''; }
    }

    while (k < linha.length) {
      var c = linha.charAt(k);
      var par = linha.substr(k, 2);

      if (c === '\\' && k + 1 < linha.length) { buf += linha.charAt(k + 1); k += 2; continue; }

      if ((par === '**' || par === '__') && (neg || fechaDuplo(linha, k, par))) {
        corta(); neg = !neg; k += 2; continue;
      }

      if ((c === '*' || c === '_')) {
        var abre = !ita && k + 1 < linha.length && linha.charAt(k + 1) !== ' ' && fecha(linha, k - 1, c);
        var fim = ita && k > 0 && linha.charAt(k - 1) !== ' ';
        if (abre || fim) { corta(); ita = !ita; k += 1; continue; }
      }

      buf += c; k++;
    }
    corta();
    return partes.length ? partes : [{ t: '', n: false, i: false }];
  }

  function fechaDuplo(linha, i, par) {
    return linha.indexOf(par, i + 2) > i + 2;
  }

  // ------------------------------------------------------------------ blocos

  /* Devolve [{ tipo, marcador, recuo, escala, partes }] */
  function blocos(texto) {
    var saida = [];
    String(texto || '').split('\n').forEach(function (linha) {
      if (!linha.trim()) { saida.push({ tipo: 'vazia' }); return; }

      if (REGUA.test(linha)) { saida.push({ tipo: 'regua' }); return; }

      var m = TITULO.exec(linha);
      if (m) {
        saida.push({ tipo: 'titulo', escala: [1.25, 1.12, 1.0][m[1].length - 1],
                     forcarNegrito: true, partes: trechos(m[2]) });
        return;
      }

      m = LISTA.exec(linha);
      if (m) {
        saida.push({ tipo: 'item', marcador: '•  ', recuo: 12, partes: trechos(m[2]) });
        return;
      }

      m = NUMERADA.exec(linha);
      if (m) {
        saida.push({ tipo: 'item', marcador: m[1] + '  ', recuo: 16, partes: trechos(m[2]) });
        return;
      }

      m = CITACAO.exec(linha);
      if (m) {
        saida.push({ tipo: 'citacao', recuo: 12, forcarItalico: true,
                     partes: trechos(m[1]) });
        return;
      }

      saida.push({ tipo: 'paragrafo', partes: trechos(linha) });
    });

    // linhas em branco no fim não ocupam espaço
    while (saida.length && saida[saida.length - 1].tipo === 'vazia') saida.pop();
    return saida;
  }

  /* Verdadeiro quando o texto não tem nenhuma marcação — usado só para decidir
     mensagens ao usuário, não muda a renderização. */
  function temMarcacao(texto) {
    return blocos(texto).some(function (b) {
      if (b.tipo === 'titulo' || b.tipo === 'item' || b.tipo === 'citacao' || b.tipo === 'regua') return true;
      return (b.partes || []).some(function (p) { return p.n || p.i; });
    });
  }

  return { blocos: blocos, trechos: trechos, temMarcacao: temMarcacao };
})();
