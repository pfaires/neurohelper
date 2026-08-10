/* Campos declarativos — HULW/UFPB

   Um campo é descrito por um objeto e o site cuida do resto: gera o HTML,
   liga a máscara, lê, aplica valores e valida. É o que permite ter uma página
   de formulário só para todos os documentos.

   { id, rotulo, tipo, larg, mascara, max, linhas, modo, exemplo, dica,
     valor, obrigatorio, opcoes, valida, erro }

   tipo: 'texto' (padrão) | 'area' | 'caixa' | 'radio'
   larg: 1 a 12 colunas da grade
   valida: function (valor) → true se está bom */

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

    var attrs = 'id="' + cid + '" autocomplete="off"';
    if (c.mascara) attrs += ' data-mascara="' + c.mascara + '"';
    if (c.max) attrs += ' maxlength="' + c.max + '"';
    if (c.exemplo) attrs += ' placeholder="' + escapar(c.exemplo) + '"';
    if (c.modo) attrs += ' inputmode="' + c.modo + '"';

    var controle = c.tipo === 'area'
      ? '<textarea ' + attrs + ' rows="' + (c.linhas || 6) + '"></textarea>'
      : '<input type="text" ' + attrs + '>';

    return '<div class="campo ' + larg + '">' +
      '<label for="' + cid + '">' + c.rotulo + '</label>' + controle + dica + msg + '</div>';
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

  function ligar(raiz, prefixo) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-mascara]'), function (el) {
      el.addEventListener('input', function () {
        var fim = el.selectionStart === el.value.length;
        var f = funcaoMascara(el, prefixo, raiz);
        if (f) el.value = f(el.value);
        if (fim) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* textarea */ } }
      });
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('input, textarea'), function (el) {
      el.addEventListener('input', function () {
        var c = el.closest('.campo');
        if (c) c.classList.remove('erro');
      });
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
