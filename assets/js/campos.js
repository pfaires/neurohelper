/* Campos declarativos — HULW/UFPB

   Um campo é descrito por um objeto e o site cuida do resto: gera o HTML,
   liga a máscara, lê, aplica valores e valida. É o que permite ter uma página
   de formulário só para todos os documentos.

   { id, rotulo, tipo, larg, mascara, max, linhas, modo, exemplo, dica,
     valor, obrigatorio, opcoes, valida, erro }

   tipo: 'texto' (padrão) | 'area' | 'caixa' | 'radio' | 'lista' | 'linhas'
   larg: 1 a 12 colunas da grade
   valida: function (valor) → true se está bom

   'lista'  combobox que também aceita escrita livre. As sugestões vêm de um
            JSON externo (`listaUrl`), carregado depois da montagem — o campo
            funciona mesmo que o arquivo não chegue.

   'linhas' tabela de linhas repetidas, para listas com colunas. O valor é um
            array de objetos. Declara `colunas` (cada uma um campo simplificado),
            `max` de linhas e `rotuloAcrescentar`. */

window.Campos = (function () {
  'use strict';

  var L = window.Laudos;

  function idDe(prefixo, campo) { return prefixo + '__' + campo.id; }

  function escapar(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------------- HTML

  function htmlDe(prefixo, c) {
    var cid = idDe(prefixo, c);
    var larg = 'c' + (c.larg || 12);
    var msg = '<span class="msg">' + escapar(c.erro || 'Preencha este campo.') + '</span>';
    var dica = c.dica ? '<span class="dica">' + c.dica + '</span>' : '';

    if (c.tipo === 'radio') {
      var ops = (c.opcoes || []).map(function (o) {
        return '<label><input type="radio" name="' + cid + '" value="' + escapar(o.valor) + '"' +
          (o.padrao ? ' checked' : '') + '> ' + escapar(o.texto) + '</label>';
      }).join('');
      return '<div class="campo ' + larg + '"><label>' + c.rotulo + '</label>' +
        '<div class="opcoes">' + ops + '</div>' + dica + '</div>';
    }

    if (c.tipo === 'caixa') {
      return '<div class="campo ' + larg + '">' +
        '<label class="opcao-caixa"><input type="checkbox" id="' + cid + '"> ' + c.rotulo + '</label>' +
        dica + '</div>';
    }

    if (c.tipo === 'linhas') {
      return '<div class="campo ' + larg + '">' +
        '<label>' + c.rotulo + '</label>' +
        htmlLinhas(cid, c) + dica + msg + '</div>';
    }

    var controle = htmlControle(cid, c);
    var lista = c.tipo === 'lista' ? '<datalist id="dl-' + cid + '"></datalist>' : '';

    return '<div class="campo ' + larg + '">' +
      '<label for="' + cid + '">' + c.rotulo + '</label>' + controle + lista + dica + msg + '</div>';
  }

  // controle solto, reaproveitado pelas colunas de `linhas`
  function htmlControle(cid, c) {
    var attrs = 'id="' + cid + '" autocomplete="off"';
    if (c.mascara) attrs += ' data-mascara="' + c.mascara + '"';
    if (c.max) attrs += ' maxlength="' + c.max + '"';
    if (c.exemplo) attrs += ' placeholder="' + escapar(c.exemplo) + '"';
    if (c.modo) attrs += ' inputmode="' + c.modo + '"';
    if (c.tipo === 'lista') attrs += ' list="dl-' + (c.listaDe || cid) + '"';

    if (c.tipo === 'area') {
      return '<textarea ' + attrs + ' rows="' + (c.linhas || 6) + '"></textarea>';
    }
    return '<input type="text" ' + attrs + '>';
  }

  // ------------------------------------------------------------------ linhas

  function htmlCabecalhoLinhas(c) {
    return '<div class="linha-item linha-cabecalho">' +
      '<span class="linha-num"></span>' +
      c.colunas.map(function (col) {
        return '<span class="linha-col" style="' + estiloCol(col) + '">' +
          escapar(col.rotulo || '') + '</span>';
      }).join('') +
      '<span class="linha-acao"></span></div>';
  }

  function estiloCol(col) {
    return col.largura ? 'flex:0 0 ' + col.largura : 'flex:1 1 auto';
  }

  function htmlLinha(cid, c, i) {
    var lista = c.colunas.filter(function (col) { return col.tipo === 'lista'; })[0];
    return '<div class="linha-item" data-linha="' + i + '">' +
      '<span class="linha-num">' + (i + 1) + '</span>' +
      c.colunas.map(function (col) {
        var sub = {};
        Object.keys(col).forEach(function (k) { sub[k] = col[k]; });
        if (sub.tipo === 'lista') sub.listaDe = cid;
        return '<span class="linha-col" style="' + estiloCol(col) + '">' +
          htmlControle(cid + '__' + i + '__' + col.id, sub) + '</span>';
      }).join('') +
      '<span class="linha-acao">' +
        '<button type="button" class="btn-linha" data-remover="' + i + '" ' +
        'title="Remover esta linha" aria-label="Remover linha">×</button>' +
      '</span></div>';
  }

  function htmlLinhas(cid, c) {
    var lista = c.colunas.filter(function (col) { return col.tipo === 'lista'; })[0];
    return '<div class="linhas" id="' + cid + '" data-max="' + (c.max || 6) + '">' +
      (lista ? '<datalist id="dl-' + cid + '"></datalist>' : '') +
      htmlCabecalhoLinhas(c) +
      '<div class="linhas-corpo"></div>' +
      '<button type="button" class="btn-mini btn-acrescentar">' +
        escapar(c.rotuloAcrescentar || 'Acrescentar linha') + '</button>' +
      '</div>';
  }

  function linhasDe(raiz, cid) {
    var caixa = raiz.querySelector('#' + cid);
    return caixa ? Array.prototype.slice.call(
      caixa.querySelectorAll('.linhas-corpo .linha-item')) : [];
  }

  /* Redesenha as linhas a partir de um array de valores, sempre com pelo menos
     uma linha visível. */
  function montarLinhas(raiz, prefixo, c, valores) {
    var cid = idDe(prefixo, c);
    var caixa = raiz.querySelector('#' + cid);
    if (!caixa) return;
    var corpo = caixa.querySelector('.linhas-corpo');
    var max = +caixa.dataset.max || 6;
    var linhas = (valores && valores.length ? valores : [{}]).slice(0, max);

    corpo.innerHTML = linhas.map(function (_, i) { return htmlLinha(cid, c, i); }).join('');

    linhas.forEach(function (v, i) {
      c.colunas.forEach(function (col) {
        var el = raiz.querySelector('#' + cid + '__' + i + '__' + col.id);
        if (el) el.value = (v && v[col.id] !== undefined && v[col.id] !== null) ? v[col.id] : '';
      });
    });

    ligarMascarasEm(caixa, prefixo, raiz);
    atualizarBotaoLinhas(caixa, max);

    Array.prototype.forEach.call(caixa.querySelectorAll('[data-remover]'), function (b) {
      b.addEventListener('click', function () {
        var atuais = lerLinhas(raiz, prefixo, c);
        atuais.splice(+b.dataset.remover, 1);
        montarLinhas(raiz, prefixo, c, atuais);
      });
    });
  }

  function atualizarBotaoLinhas(caixa, max) {
    var n = caixa.querySelectorAll('.linhas-corpo .linha-item').length;
    var botao = caixa.querySelector('.btn-acrescentar');
    if (botao) botao.hidden = n >= max;
  }

  /* Lê todas as linhas, inclusive as em branco — quem descarta é o `ler`. */
  function lerLinhas(raiz, prefixo, c) {
    var cid = idDe(prefixo, c);
    return linhasDe(raiz, cid).map(function (linha) {
      var i = linha.dataset.linha;
      var v = {};
      c.colunas.forEach(function (col) {
        var el = raiz.querySelector('#' + cid + '__' + i + '__' + col.id);
        v[col.id] = el ? el.value : '';
      });
      return v;
    });
  }

  function vazia(v, c) {
    return c.colunas.every(function (col) { return !String(v[col.id] || '').trim(); });
  }

  function html(prefixo, campos) {
    return '<div class="grade">' + campos.map(function (c) {
      return htmlDe(prefixo, c);
    }).join('') + '</div>';
  }

  // --------------------------------------------------------------- máscaras

  /* A máscara 'doc' depende do tipo escolhido (CNS ou CPF) no mesmo bloco. */
  function funcaoMascara(el, prefixo, raiz) {
    var nome = el.dataset.mascara;
    if (nome !== 'doc') return L.mascaras[nome];
    return function (v) {
      var m = raiz.querySelector('input[name="' + prefixo + '__tipoDoc"]:checked');
      return (m && m.value === 'CPF') ? L.mascaras.cpf(v) : L.mascaras.cns(v);
    };
  }

  /* Liga máscara e limpeza de erro dentro de um pedaço da árvore. Usado tanto
     no bloco inteiro quanto nas linhas redesenhadas. */
  function ligarMascarasEm(caixa, prefixo, raiz) {
    Array.prototype.forEach.call(caixa.querySelectorAll('[data-mascara]'), function (el) {
      el.addEventListener('input', function () {
        var fim = el.selectionStart === el.value.length;
        var f = funcaoMascara(el, prefixo, raiz);
        if (f) el.value = f(el.value);
        if (fim) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* textarea */ } }
      });
    });
    Array.prototype.forEach.call(caixa.querySelectorAll('input, textarea'), function (el) {
      el.addEventListener('input', function () {
        var c = el.closest('.campo');
        if (c) c.classList.remove('erro');
      });
    });
  }

  /* Preenche as sugestões de um combobox. O campo já funciona antes disso —
     a lista é conveniência, a digitação livre é sempre permitida. */
  var listasCarregadas = {};
  /* Sugestões escritas direto na declaração do campo, sem arquivo à parte. */
  function preencherLista(alvo, itens) {
    if (!alvo || !itens || !itens.length) return;
    alvo.innerHTML = itens.map(function (i) {
      return '<option value="' + escapar(i) + '"></option>';
    }).join('');
  }

  function carregarLista(url, alvo) {
    if (!url || !alvo) return;
    if (!listasCarregadas[url]) {
      listasCarregadas[url] = fetch(url)
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    listasCarregadas[url].then(function (itens) {
      if (!itens || !itens.length) return;
      alvo.innerHTML = itens.map(function (i) {
        return '<option value="' + escapar(i) + '"></option>';
      }).join('');
    });
  }

  function ligar(raiz, prefixo, campos) {
    ligarMascarasEm(raiz, prefixo, raiz);

    (campos || []).forEach(function (c) {
      var cid = idDe(prefixo, c);

      if (c.tipo === 'lista') {
        var dl = raiz.querySelector('#dl-' + cid);
        if (c.listaUrl) carregarLista(c.listaUrl, dl);
        else if (dl && c.opcoes) preencherLista(dl, c.opcoes);
      }

      if (c.tipo === 'linhas') {
        var caixa = raiz.querySelector('#' + cid);
        if (!caixa) return;
        var lista = c.colunas.filter(function (col) { return col.tipo === 'lista'; })[0];
        if (lista) carregarLista(lista.listaUrl, raiz.querySelector('#dl-' + cid));
        montarLinhas(raiz, prefixo, c, []);
        caixa.querySelector('.btn-acrescentar').addEventListener('click', function () {
          var atuais = lerLinhas(raiz, prefixo, c);
          atuais.push({});
          montarLinhas(raiz, prefixo, c, atuais);
        });
      }
    });

    // trocar CNS/CPF reformata o número já digitado
    Array.prototype.forEach.call(
      raiz.querySelectorAll('input[name="' + prefixo + '__tipoDoc"]'), function (r) {
        r.addEventListener('change', function () {
          var el = raiz.querySelector('#' + prefixo + '__numeroDoc');
          if (el) el.value = funcaoMascara(el, prefixo, raiz)(el.value);
          var d = raiz.querySelector('#dica-doc');
          if (d) d.textContent = r.value === 'CPF' ? '11 dígitos' : '15 dígitos';
        });
      });
  }

  // ------------------------------------------------------- ler / aplicar

  function ler(raiz, prefixo, campos) {
    var v = {};
    campos.forEach(function (c) {
      var cid = idDe(prefixo, c);
      if (c.tipo === 'radio') {
        var m = raiz.querySelector('input[name="' + cid + '"]:checked');
        v[c.id] = m ? m.value : '';
      } else if (c.tipo === 'caixa') {
        var cx = raiz.querySelector('#' + cid);
        v[c.id] = !!(cx && cx.checked);
      } else if (c.tipo === 'linhas') {
        v[c.id] = lerLinhas(raiz, prefixo, c).filter(function (linha) {
          return !vazia(linha, c);
        });
      } else {
        var el = raiz.querySelector('#' + cid);
        v[c.id] = el ? el.value : '';
      }
    });
    return v;
  }

  function aplicar(raiz, prefixo, campos, valores) {
    valores = valores || {};
    campos.forEach(function (c) {
      var cid = idDe(prefixo, c);
      var valor = valores[c.id] !== undefined ? valores[c.id] : c.valor;
      if (c.tipo === 'radio') {
        // sem valor, volta para a opção marcada como padrão (por exemplo CNS)
        var alvo = valor;
        if (alvo === undefined || alvo === null || alvo === '') {
          var padrao = (c.opcoes || []).filter(function (o) { return o.padrao; })[0];
          alvo = padrao ? padrao.valor : '';
        }
        Array.prototype.forEach.call(
          raiz.querySelectorAll('input[name="' + cid + '"]'), function (r) {
            r.checked = String(r.value) === String(alvo);
          });
      } else if (c.tipo === 'caixa') {
        var cx = raiz.querySelector('#' + cid);
        if (cx) cx.checked = !!valor;
      } else if (c.tipo === 'linhas') {
        montarLinhas(raiz, prefixo, c, Array.isArray(valor) ? valor : []);
      } else {
        var el = raiz.querySelector('#' + cid);
        if (el) el.value = valor === undefined || valor === null ? '' : valor;
      }
    });
  }

  function limpar(raiz, prefixo, campos) {
    aplicar(raiz, prefixo, campos, {});
    Array.prototype.forEach.call(raiz.querySelectorAll('.campo.erro'), function (c) {
      c.classList.remove('erro');
    });
  }

  // --------------------------------------------------------------- validar

  /* Devolve os elementos com problema, já marcados em vermelho. */
  function validar(raiz, prefixo, campos) {
    Array.prototype.forEach.call(raiz.querySelectorAll('.campo.erro'), function (c) {
      c.classList.remove('erro');
    });

    var valores = ler(raiz, prefixo, campos);
    var falhas = [];

    campos.forEach(function (c) {
      if (c.tipo === 'caixa' || c.tipo === 'radio') return;

      if (c.tipo === 'linhas') {
        if (!c.obrigatorio) return;
        var preenchidas = lerLinhas(raiz, prefixo, c).filter(function (l) { return !vazia(l, c); });
        if (preenchidas.length) return;
        var caixa = raiz.querySelector('#' + idDe(prefixo, c));
        var primeiro = caixa && caixa.querySelector('input');
        if (caixa && caixa.closest('.campo')) caixa.closest('.campo').classList.add('erro');
        if (primeiro) falhas.push(primeiro);
        return;
      }

      var el = raiz.querySelector('#' + idDe(prefixo, c));
      if (!el) return;
      var v = String(valores[c.id] || '').trim();
      var ruim = (c.obrigatorio && !v) || (c.valida && !c.valida(v, valores));
      if (ruim) {
        var caixa = el.closest('.campo');
        if (caixa) caixa.classList.add('erro');
        falhas.push(el);
      }
    });

    return falhas;
  }

  // ------------------------------------------------- definições reutilizadas

  var d = function (v) { return L.digitos(v); };

  var PACIENTE = [
    { id: 'nome', rotulo: 'Nome do paciente', larg: 9, max: 70, obrigatorio: true,
      erro: 'Informe o nome do paciente.' },
    { id: 'prontuario', rotulo: 'Nº do prontuário', larg: 3, max: 15, modo: 'numeric' },
    { id: 'cns', rotulo: 'Cartão Nacional de Saúde (CNS)', larg: 5, mascara: 'cns',
      modo: 'numeric', exemplo: '000 0000 0000 0000', dica: '15 dígitos',
      valida: function (v) { return !v || d(v).length === 15; },
      erro: 'O CNS deve ter 15 dígitos.' },
    { id: 'cpf', rotulo: 'CPF <span class="opcional">(opcional)</span>', larg: 4,
      mascara: 'cpf', modo: 'numeric', exemplo: '000.000.000-00',
      dica: 'Sai ao lado do nome no receituário de controle especial.',
      valida: function (v) { return !v || d(v).length === 11; },
      erro: 'O CPF deve ter 11 dígitos.' },
    { id: 'nascimento', rotulo: 'Data de nascimento', larg: 3, mascara: 'data',
      modo: 'numeric', exemplo: 'dd/mm/aaaa',
      valida: function (v) { return !v || L.dataValida(v); }, erro: 'Data inválida.' },
    { id: 'sexo', rotulo: 'Sexo', tipo: 'radio', larg: 4,
      opcoes: [{ valor: '1', texto: 'Masculino' }, { valor: '3', texto: 'Feminino' }] },
    { id: 'mae', rotulo: 'Nome da mãe ou responsável', larg: 8, max: 60 },
    { id: 'telefone', rotulo: 'Telefone de contato', larg: 4, mascara: 'telefone',
      modo: 'tel', exemplo: '(00) 00000-0000' },
    { id: 'endereco', rotulo: 'Endereço (rua, nº, bairro)', larg: 12, max: 90 },
    { id: 'municipio', rotulo: 'Município de residência', larg: 7, max: 50 },
    { id: 'uf', rotulo: 'UF', larg: 2, mascara: 'uf', max: 2, exemplo: 'PB' },
    { id: 'cep', rotulo: 'CEP', larg: 3, mascara: 'cep', modo: 'numeric',
      exemplo: '00000-000',
      valida: function (v) { return !v || d(v).length === 8; },
      erro: 'O CEP deve ter 8 dígitos.' }
  ];

  var PRESCRITOR = [
    { id: 'nome', rotulo: 'Nome do profissional', larg: 8, max: 70, obrigatorio: true,
      erro: 'Informe o nome do profissional.' },
    { id: 'titulo', rotulo: 'Título <span class="opcional">(opcional)</span>', larg: 4,
      max: 40, exemplo: 'Neurologista' },
    { id: 'crm', rotulo: 'CRM', larg: 3, mascara: 'numero', max: 6, modo: 'numeric',
      exemplo: '12345' },
    { id: 'uf', rotulo: 'UF do CRM', larg: 2, mascara: 'uf', max: 2, valor: 'PB' },
    { id: 'rqe', rotulo: 'RQE <span class="opcional">(opcional)</span>', larg: 3,
      mascara: 'numero', max: 6, modo: 'numeric', exemplo: '6789' },
    { id: 'tipoDoc', rotulo: 'Documento', tipo: 'radio', larg: 4,
      opcoes: [{ valor: 'CNS', texto: 'CNS', padrao: true }, { valor: 'CPF', texto: 'CPF' }] },
    { id: 'numeroDoc', rotulo: 'Nº do documento', larg: 6, mascara: 'doc', modo: 'numeric',
      dica: '<span id="dica-doc">15 dígitos</span>',
      valida: function (v, todos) {
        if (!v) return true;
        return d(v).length === (todos.tipoDoc === 'CPF' ? 11 : 15);
      },
      erro: 'Número de documento incompleto.' },
    { id: 'dataSolicitacao', rotulo: 'Data padrão das solicitações', larg: 6,
      mascara: 'data', modo: 'numeric', exemplo: 'dd/mm/aaaa',
      dica: 'Deixe em branco para usar sempre a data de hoje.',
      valida: function (v) { return !v || L.dataValida(v); }, erro: 'Data inválida.' }
  ];

  return {
    html: html,
    ligar: ligar,
    ler: ler,
    aplicar: aplicar,
    limpar: limpar,
    validar: validar,
    idDe: idDe,
    escapar: escapar,
    PACIENTE: PACIENTE,
    PRESCRITOR: PRESCRITOR
  };
})();
