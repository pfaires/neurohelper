/* Editor dos campos de texto longo — HULW/UFPB

   Dois modos sobre o mesmo conteúdo:

     Visual     um contenteditable com negrito, listas e citação de verdade.
                É o modo de quem nunca ouviu falar de markdown.
     Markdown   o <textarea> cru, com os asteriscos à mostra, para quem já
                escreve assim e para conferir o que está gravado.

   A fonte da verdade é sempre o <textarea>: o modo visual escreve de volta nele
   a cada tecla. Assim nada mais no site precisa saber que este editor existe —
   Campos.ler continua lendo o campo, e o gerador de PDF continua recebendo
   markdown puro.

   As duas conversões (markdown → DOM e DOM → markdown) cobrem exatamente o
   subconjunto que o PDF sabe imprimir, nem um recurso a mais. Se o modo visual
   oferecesse tabela ou link, a pessoa escreveria algo que sairia em branco no
   papel. */

window.EditorMarkdown = (function () {
  'use strict';

  var CHAVE_MODO = 'neurohelper.editorModo';

  var BOTOES = [
    { acao: 'negrito',  rotulo: '<b>B</b>',  dica: 'Negrito (Ctrl+B)' },
    { acao: 'italico',  rotulo: '<i>I</i>',  dica: 'Itálico (Ctrl+I)' },
    { acao: 'titulo',   rotulo: 'H',         dica: 'Título' },
    { acao: 'lista',    rotulo: '•',         dica: 'Lista com marcadores' },
    { acao: 'numerada', rotulo: '1.',        dica: 'Lista numerada' },
    { acao: 'citacao',  rotulo: '❝',         dica: 'Citação' },
    { acao: 'regua',    rotulo: '—',         dica: 'Linha separadora' }
  ];

  /* Qualquer marcador de começo de linha, para trocar um pelo outro sem empilhar. */
  var MARCA = /^\s*(?:[-*+]\s+|\d{1,2}[.)]\s+|>\s?|#{1,3}\s+)/;

  var RE = {
    titulo: /^\s*#{1,3}\s+/,
    lista: /^\s*[-*+]\s+/,
    numerada: /^\s*\d{1,2}[.)]\s+/,
    citacao: /^\s*>\s?/
  };

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function modoGravado() {
    try { return window.localStorage.getItem(CHAVE_MODO) || 'visual'; }
    catch (e) { return 'visual'; }
  }

  function gravarModo(m) {
    try { window.localStorage.setItem(CHAVE_MODO, m); } catch (e) { /* sem storage, tudo bem */ }
  }

  // -------------------------------------------------------------------- html

  function barra(cid) {
    var b = BOTOES.map(function (x) {
      return '<button type="button" class="btn-md" data-md="' + x.acao + '"' +
        ' title="' + x.dica + '" aria-label="' + x.dica + '">' + x.rotulo + '</button>';
    }).join('');

    return '<div class="editor-md" data-alvo="' + cid + '">' +
      '<div class="barra-md" role="toolbar" aria-label="Formatação">' + b +
      '<span class="modo-md" role="group" aria-label="Modo de edição">' +
      '<button type="button" class="btn-modo" data-modo="visual">Visual</button>' +
      '<button type="button" class="btn-modo" data-modo="markdown">Markdown</button>' +
      '</span></div>';
  }

  function fim() {
    return '<div class="visual-md" contenteditable="true" hidden></div></div>';
  }

  // ------------------------------------------------------- markdown  →  DOM

  function trechosHtml(partes, forcarNegrito) {
    var s = (partes || []).map(function (p) {
      var t = escapar(p.t);
      if (!t) return '';
      if (p.i) t = '<em>' + t + '</em>';
      if (forcarNegrito || p.n) t = '<strong>' + t + '</strong>';
      return t;
    }).join('');
    return s || '<br>';
  }

  var NIVEL = { 1.25: 'h2', 1.12: 'h3' };

  function paraDom(texto) {
    var M = window.Markdown;
    if (!M) return '';

    var bs = M.blocos(texto);
    var saida = [];
    var i = 0;

    while (i < bs.length) {
      var b = bs[i];

      if (b.tipo === 'vazia') { saida.push('<p><br></p>'); i++; continue; }
      if (b.tipo === 'regua') { saida.push('<hr>'); i++; continue; }

      if (b.tipo === 'titulo') {
        var tag = NIVEL[b.escala] || 'h4';
        // sem forçar negrito aqui: no visual quem engrossa o título é o CSS,
        // e uma marca ** dentro do <h> voltaria como texto ao serializar
        saida.push('<' + tag + '>' + trechosHtml(b.partes) + '</' + tag + '>');
        i++; continue;
      }

      // itens seguidos do mesmo tipo viram uma lista só, para o navegador
      // cuidar do Enter e do Backspace como a pessoa espera
      if (b.tipo === 'item') {
        var marcado = b.marcador.charAt(0) === '•';
        var lista = marcado ? 'ul' : 'ol';
        var itens = [];
        while (i < bs.length && bs[i].tipo === 'item' &&
               (bs[i].marcador.charAt(0) === '•') === marcado) {
          itens.push('<li>' + trechosHtml(bs[i].partes) + '</li>');
          i++;
        }
        saida.push('<' + lista + '>' + itens.join('') + '</' + lista + '>');
        continue;
      }

      if (b.tipo === 'citacao') {
        var ls = [];
        while (i < bs.length && bs[i].tipo === 'citacao') {
          ls.push(trechosHtml(bs[i].partes));
          i++;
        }
        saida.push('<blockquote>' + ls.join('<br>') + '</blockquote>');
        continue;
      }

      saida.push('<p>' + trechosHtml(b.partes) + '</p>');
      i++;
    }

    return saida.join('') || '<p><br></p>';
  }

  // -------------------------------------------------------  DOM  → markdown

  function ehNegrito(el) {
    if (/^(B|STRONG)$/.test(el.nodeName)) return true;
    var p = el.style && el.style.fontWeight;
    return p === 'bold' || p === 'bolder' || (parseInt(p, 10) >= 600);
  }

  function ehItalico(el) {
    if (/^(I|EM)$/.test(el.nodeName)) return true;
    return !!(el.style && el.style.fontStyle === 'italic');
  }

  /* Texto de um bloco, com ** e * nos lugares certos. As marcas ficam coladas
     à palavra: "** negrito **" não é negrito para o nosso analisador. */
  function inline(no) {
    var out = '';
    var filhos = no.childNodes;
    Array.prototype.forEach.call(filhos, function (n, k) {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/ /g, ' '); return; }
      if (n.nodeType !== 1) return;
      /* Bloco vazio de contenteditable termina em <br> só para poder receber
         o cursor. Esse não é quebra de verdade — contá-lo dobraria toda linha
         em branco a cada ida ao modo visual. */
      if (n.nodeName === 'BR') { if (k < filhos.length - 1) out += '\n'; return; }

      var t = inline(n);
      if (!t.trim()) { out += t; return; }

      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
      var meio = m[2];
      if (ehItalico(n)) meio = '*' + meio + '*';
      if (ehNegrito(n)) meio = '**' + meio + '**';
      out += m[1] + meio + m[3];
    });
    return out;
  }

  /* Cada linha do bloco, já sem quebras internas. */
  function linhasDe(el) {
    return inline(el).split('\n');
  }

  function paraMarkdown(raiz) {
    var linhas = [];

    Array.prototype.forEach.call(raiz.childNodes, function (n) {
      if (n.nodeType === 3) {
        if (n.nodeValue.trim()) linhas.push(n.nodeValue.trim());
        return;
      }
      if (n.nodeType !== 1) return;

      var nome = n.nodeName;

      if (nome === 'HR') { linhas.push('---'); return; }

      if (nome === 'UL' || nome === 'OL') {
        var k = 0;
        Array.prototype.forEach.call(n.querySelectorAll(':scope > li'), function (li) {
          k++;
          var ls = linhasDe(li);
          linhas.push((nome === 'UL' ? '- ' : k + '. ') + (ls.shift() || ''));
          // continuação de um item vira linha solta, que é como o PDF imprime
          ls.forEach(function (l) { linhas.push(l); });
        });
        return;
      }

      if (nome === 'BLOCKQUOTE') {
        linhasDe(n).forEach(function (l) { linhas.push('> ' + l); });
        return;
      }

      if (/^H[1-6]$/.test(nome)) {
        var grau = +nome.charAt(1);
        var cerquilhas = grau <= 2 ? '#' : (grau === 3 ? '##' : '###');
        linhasDe(n).forEach(function (l) { linhas.push(cerquilhas + ' ' + l); });
        return;
      }

      // P, DIV e o que mais o navegador inventar
      linhasDe(n).forEach(function (l) { linhas.push(l); });
    });

    return linhas.join('\n').replace(/\s+$/, '');
  }

  // ------------------------------------------------- edição no modo markdown

  /* Escreve pelo execCommand quando dá, para não quebrar o desfazer do navegador. */
  function trocar(ta, i, f, texto, selI, selF) {
    ta.focus();
    ta.setSelectionRange(i, f);

    var ok = false;
    try { ok = document.execCommand('insertText', false, texto); } catch (e) { ok = false; }
    if (!ok) {
      ta.value = ta.value.slice(0, i) + texto + ta.value.slice(f);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    ta.setSelectionRange(selI, selF);
  }

  function envolver(ta, marca) {
    var v = ta.value, i = ta.selectionStart, f = ta.selectionEnd, n = marca.length;

    if (i >= n && v.slice(i - n, i) === marca && v.slice(f, f + n) === marca) {
      trocar(ta, i - n, f + n, v.slice(i, f), i - n, f - n);
      return;
    }

    var sel = v.slice(i, f);

    if (sel.length >= 2 * n && sel.slice(0, n) === marca && sel.slice(-n) === marca) {
      trocar(ta, i, f, sel.slice(n, -n), i, f - 2 * n);
      return;
    }

    if (!sel) { trocar(ta, i, f, marca + marca, i + n, i + n); return; }

    trocar(ta, i, f, marca + sel + marca, i + n, f + n);
  }

  function blocoSelecionado(ta) {
    var v = ta.value;
    var ini = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    var f = v.indexOf('\n', ta.selectionEnd);
    if (f < 0) f = v.length;
    return { ini: ini, fim: f, texto: v.slice(ini, f) };
  }

  function prefixar(ta, re, gerar) {
    var b = blocoSelecionado(ta);
    var ls = b.texto.split('\n');
    var tirar = ls.every(function (l) { return !l.trim() || re.test(l); });

    var n = 0;
    var novas = ls.map(function (l) {
      if (!l.trim()) return l;
      var limpa = l.replace(MARCA, '').replace(/^\s+/, '');
      return tirar ? limpa : gerar(++n) + limpa;
    });

    var texto = novas.join('\n');
    trocar(ta, b.ini, b.fim, texto, b.ini, b.ini + texto.length);
  }

  function reguaTexto(ta) {
    var v = ta.value, i = ta.selectionStart;
    var antes = (i === 0 || v.charAt(i - 1) === '\n') ? '' : '\n';
    var depois = (i >= v.length || v.charAt(i) === '\n') ? '' : '\n';
    var texto = antes + '---\n' + depois;
    trocar(ta, i, ta.selectionEnd, texto, i + texto.length, i + texto.length);
  }

  function aplicar(ta, acao) {
    if (acao === 'negrito') return envolver(ta, '**');
    if (acao === 'italico') return envolver(ta, '*');
    if (acao === 'titulo') return prefixar(ta, RE.titulo, function () { return '## '; });
    if (acao === 'lista') return prefixar(ta, RE.lista, function () { return '- '; });
    if (acao === 'numerada') return prefixar(ta, RE.numerada, function (n) { return n + '. '; });
    if (acao === 'citacao') return prefixar(ta, RE.citacao, function () { return '> '; });
    if (acao === 'regua') return reguaTexto(ta);
  }

  // --------------------------------------------------- edição no modo visual

  var COMANDO = {
    negrito: ['bold'],
    italico: ['italic'],
    titulo: ['formatBlock', '<h3>'],
    lista: ['insertUnorderedList'],
    numerada: ['insertOrderedList'],
    citacao: ['formatBlock', '<blockquote>'],
    regua: ['insertHorizontalRule']
  };

  function comando(nome, arg) {
    try { document.execCommand(nome, false, arg); } catch (e) { /* navegador antigo */ }
  }

  function aplicarVisual(pane, acao) {
    pane.focus();
    var c = COMANDO[acao];
    if (!c) return;

    // título e citação alternam: clicar de novo devolve o parágrafo
    if (c[0] === 'formatBlock' && jaEstaEm(pane, c[1])) { comando('formatBlock', '<p>'); return; }
    comando(c[0], c[1]);
  }

  function jaEstaEm(pane, tag) {
    var alvo = tag.replace(/[<>]/g, '').toUpperCase();
    var sel = window.getSelection();
    if (!sel || !sel.anchorNode) return false;
    var no = sel.anchorNode;
    while (no && no !== pane) {
      if (no.nodeName === alvo) return true;
      no = no.parentNode;
    }
    return false;
  }

  // ------------------------------------------------------------------- ligar

  function ligar(raiz) {
    raiz = raiz || document;

    /* Pede tags (<b>, <i>) em vez de <span style>. A serialização entende as
       duas formas, mas assim o que sai do navegador já é limpo. */
    comando('styleWithCSS', false);

    var caixas = raiz.querySelectorAll('.editor-md:not([data-ligado])');

    Array.prototype.forEach.call(caixas, function (caixa) {
      var ta = caixa.querySelector('textarea');
      var pane = caixa.querySelector('.visual-md');
      if (!ta || !pane) return;
      caixa.setAttribute('data-ligado', '1');

      var rotulo = caixa.closest('.campo') && caixa.closest('.campo').querySelector('label');
      if (rotulo) pane.setAttribute('aria-label', rotulo.textContent.trim());

      var modo = 'markdown';
      var sincronizando = false;

      function visual() { return modo === 'visual'; }

      function paraTextarea() {
        if (sincronizando) return;
        sincronizando = true;
        var novo = paraMarkdown(pane);
        if (ta.value !== novo) {
          ta.value = novo;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
        sincronizando = false;
      }

      function paraPane() {
        if (sincronizando) return;
        sincronizando = true;
        pane.innerHTML = paraDom(ta.value);
        sincronizando = false;
      }

      function trocarModo(novo) {
        if (novo === modo) return;
        if (novo === 'visual') paraPane();
        modo = novo;
        pane.hidden = novo !== 'visual';
        ta.hidden = novo === 'visual';
        Array.prototype.forEach.call(caixa.querySelectorAll('.btn-modo'), function (b) {
          var ativo = b.getAttribute('data-modo') === novo;
          b.classList.toggle('ativo', ativo);
          b.setAttribute('aria-pressed', String(ativo));
        });
        gravarModo(novo);
      }

      // ------ barra
      Array.prototype.forEach.call(caixa.querySelectorAll('.btn-md, .btn-modo'), function (bt) {
        // sem isto o clique tira o foco do campo e a seleção se perde
        bt.addEventListener('mousedown', function (e) { e.preventDefault(); });

        bt.addEventListener('click', function () {
          var m = bt.getAttribute('data-modo');
          if (m) { trocarModo(m); (m === 'visual' ? pane : ta).focus(); return; }

          var acao = bt.getAttribute('data-md');
          if (visual()) { aplicarVisual(pane, acao); paraTextarea(); }
          else aplicar(ta, acao);
        });
      });

      // ------ modo visual
      pane.addEventListener('input', paraTextarea);

      /* Colar traz fonte, cor e tabela de qualquer lugar. Aqui só interessa o
         texto — o resto não teria como ser impresso. */
      pane.addEventListener('paste', function (e) {
        var dados = e.clipboardData || window.clipboardData;
        if (!dados) return;
        e.preventDefault();
        var texto = dados.getData('text/plain') || '';
        comando('insertText', texto);
        paraTextarea();
      });

      pane.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        var k = e.key.toLowerCase();
        if (k !== 'b' && k !== 'i') return;   // deixa o resto com o navegador
        e.preventDefault();
        aplicarVisual(pane, k === 'b' ? 'negrito' : 'italico');
        paraTextarea();
      });

      // ------ modo markdown
      ta.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        var k = e.key.toLowerCase();
        if (k !== 'b' && k !== 'i') return;
        e.preventDefault();
        aplicar(ta, k === 'b' ? 'negrito' : 'italico');
      });

      // valor trocado por fora (carregar documento gravado, importar, limpar)
      caixa.addEventListener('sincronizar', function () { if (visual()) paraPane(); });

      trocarModo(modoGravado() === 'markdown' ? 'markdown' : 'visual');
    });
  }

  /* Chamado pelo campos.js depois de escrever valores nos campos. */
  function sincronizar(raiz) {
    raiz = raiz || document;
    Array.prototype.forEach.call(raiz.querySelectorAll('.editor-md[data-ligado]'), function (c) {
      c.dispatchEvent(new Event('sincronizar'));
    });
  }

  return {
    barra: barra, fim: fim, ligar: ligar, sincronizar: sincronizar,
    aplicar: aplicar, paraDom: paraDom, paraMarkdown: paraMarkdown
  };
})();
