/* Página de emissão de documentos — HULW/UFPB
   Identificação do paciente e do profissional são compartilhadas;
   cada documento contribui com os seus campos específicos. */

(function () {
  'use strict';

  var L = window.Laudos;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var form = $('#form-emissao');
  var aviso = $('#aviso');
  var btnGerar = $('#btn-gerar');
  var caixaDocs = $('#documentos');
  var CHAVE_PROF = 'hulw.neuro.profissional';

  // ------------------------------------------------- montagem dos documentos

  function campoHTML(docId, c) {
    var id = docId + '__' + c.id;
    var larg = 'c' + (c.larg || 12);
    var attrs = 'id="' + id + '" name="' + id + '"';
    if (c.mascara) attrs += ' data-mascara="' + c.mascara + '"';
    if (c.max) attrs += ' maxlength="' + c.max + '"';
    if (c.exemplo) attrs += ' placeholder="' + c.exemplo + '"';

    if (c.tipo === 'caixa') {
      return '<div class="campo ' + larg + '">' +
        '<label class="opcao-caixa"><input type="checkbox" ' + attrs + '> ' + c.rotulo + '</label>' +
        (c.dica ? '<span class="dica">' + c.dica + '</span>' : '') +
        '</div>';
    }

    var controle = c.tipo === 'area'
      ? '<textarea ' + attrs + ' rows="' + (c.linhas || 6) + '"></textarea>'
      : '<input type="text" autocomplete="off" ' + attrs + '>';

    return '<div class="campo ' + larg + '">' +
      '<label for="' + id + '">' + c.rotulo + '</label>' +
      controle +
      (c.dica ? '<span class="dica">' + c.dica + '</span>' : '') +
      '<span class="msg">Preencha este campo.</span>' +
      '</div>';
  }

  function montar() {
    caixaDocs.innerHTML = L.documentos.map(function (d) {
      return '<details class="doc" id="sec-' + d.id + '">' +
        '<summary>' +
          '<label class="marca-doc"><input type="checkbox" class="emitir" value="' + d.id + '">' +
          '<span class="doc-titulo">' + d.titulo + '</span></label>' +
          '<span class="doc-descricao">' + d.descricao + '</span>' +
        '</summary>' +
        '<div class="grade">' + d.campos.map(function (c) { return campoHTML(d.id, c); }).join('') + '</div>' +
      '</details>';
    }).join('');

    // valores padrão
    L.documentos.forEach(function (d) {
      d.campos.forEach(function (c) {
        if (c.valor) $('#' + d.id + '__' + c.id).value = c.valor;
      });
    });

    $$('.emitir').forEach(function (cb) {
      // o clique na caixa não deve abrir/fechar a seção sozinho
      cb.addEventListener('click', function (ev) { ev.stopPropagation(); });
      cb.addEventListener('change', function () {
        var sec = cb.closest('details');
        sec.open = cb.checked;
        atualizarBotao();
      });
    });

    // abrir a seção também marca o documento
    $$('details.doc').forEach(function (sec) {
      sec.addEventListener('toggle', function () {
        var cb = $('.emitir', sec);
        if (sec.open && !cb.checked) {
          cb.checked = true;
          atualizarBotao();
        }
      });
    });
  }

  // ------------------------------------------------------------- máscaras

  function ligarMascaras(raiz) {
    $$('[data-mascara]', raiz).forEach(function (el) {
      if (el.dataset.ligado) return;
      el.dataset.ligado = '1';
      el.addEventListener('input', function () {
        var fim = el.selectionStart === el.value.length;
        el.value = mascaraDe(el)(el.value);
        if (fim) el.setSelectionRange(el.value.length, el.value.length);
        el.closest('.campo').classList.remove('erro');
      });
    });
    $$('input, textarea', raiz).forEach(function (el) {
      el.addEventListener('input', function () {
        var c = el.closest('.campo');
        if (c) c.classList.remove('erro');
      });
    });
  }

  function mascaraDe(el) {
    var nome = el.dataset.mascara;
    if (nome === 'doc') {
      return function (v) {
        return form.tipoDoc.value === 'CPF' ? L.mascaras.cpf(v) : L.mascaras.cns(v);
      };
    }
    return L.mascaras[nome];
  }

  // ------------------------------------------------------------- coleta

  function comuns() {
    return {
      nome: $('#nome').value,
      prontuario: $('#prontuario').value,
      cns: $('#cns').value,
      cpf: $('#cpf').value,
      nascimento: $('#nascimento').value,
      sexo: form.sexo.value,
      mae: $('#mae').value,
      telefone: $('#telefone').value,
      endereco: $('#endereco').value,
      municipio: $('#municipio').value,
      uf: L.mascaras.uf($('#uf').value),
      cep: $('#cep').value,
      profissional: $('#profissional').value,
      dataSolicitacao: $('#dataSolicitacao').value,
      tipoDoc: form.tipoDoc.value,
      numeroDoc: $('#numeroDoc').value
    };
  }

  function selecionados() {
    return $$('.emitir:checked').map(function (cb) {
      return L.documentos.filter(function (d) { return d.id === cb.value; })[0];
    });
  }

  function dadosDe(doc, base) {
    var d = {};
    Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    doc.campos.forEach(function (c) {
      var el = $('#' + doc.id + '__' + c.id);
      d[c.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return d;
  }

  // ------------------------------------------------------------ validação

  function marcarErro(el) {
    var c = el.closest('.campo');
    if (c) c.classList.add('erro');
    return el;
  }

  function validar(docs) {
    $$('.campo.erro').forEach(function (c) { c.classList.remove('erro'); });
    var falhas = [];

    if (!$('#nome').value.trim()) falhas.push(marcarErro($('#nome')));
    if (!$('#profissional').value.trim()) falhas.push(marcarErro($('#profissional')));

    var cns = L.digitos($('#cns').value);
    if (cns && cns.length !== 15) falhas.push(marcarErro($('#cns')));

    var cpf = L.digitos($('#cpf').value);
    if (cpf && cpf.length !== 11) falhas.push(marcarErro($('#cpf')));

    var cep = L.digitos($('#cep').value);
    if (cep && cep.length !== 8) falhas.push(marcarErro($('#cep')));

    ['#nascimento', '#dataSolicitacao'].forEach(function (s) {
      var v = $(s).value.trim();
      if (v && !L.dataValida(v)) falhas.push(marcarErro($(s)));
    });

    var doc = L.digitos($('#numeroDoc').value);
    var exigido = form.tipoDoc.value === 'CPF' ? 11 : 15;
    if (doc && doc.length !== exigido) falhas.push(marcarErro($('#numeroDoc')));

    docs.forEach(function (d) {
      d.campos.forEach(function (c) {
        if (!c.obrigatorio) return;
        var el = $('#' + d.id + '__' + c.id);
        if (!el.value.trim()) {
          $('#sec-' + d.id).open = true;
          falhas.push(marcarErro(el));
        }
      });
    });

    return falhas;
  }

  // -------------------------------------------------------- profissional salvo

  function salvarProfissional() {
    try {
      localStorage.setItem(CHAVE_PROF, JSON.stringify({
        profissional: $('#profissional').value,
        tipoDoc: form.tipoDoc.value,
        numeroDoc: $('#numeroDoc').value
      }));
    } catch (e) { /* navegador sem armazenamento: segue sem salvar */ }
  }

  function carregarProfissional() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE_PROF) || 'null');
      if (!s) return;
      $('#profissional').value = s.profissional || '';
      $('#numeroDoc').value = s.numeroDoc || '';
      $$('input[name="tipoDoc"]').forEach(function (r) { r.checked = r.value === s.tipoDoc; });
      atualizarDicaDoc();
    } catch (e) { /* ignora */ }
  }

  function atualizarDicaDoc() {
    $('#dicaDoc').textContent = form.tipoDoc.value === 'CPF' ? '11 dígitos' : '15 dígitos';
  }

  // ------------------------------------------------------------- interface

  function atualizarBotao() {
    var n = $$('.emitir:checked').length;
    btnGerar.textContent = n > 1 ? 'Gerar ' + n + ' documentos' : 'Gerar documento';
    btnGerar.disabled = false;
    $('#saida').hidden = n < 2;
  }

  function mostrarAviso(tipo, html) {
    aviso.className = 'aviso ' + tipo;
    aviso.innerHTML = html;
  }

  // -------------------------------------------------- importação do AGHU

  var dlg = $('#dlg-aghu');
  var retorno = $('#retorno-aghu');

  function retornoAGHU(tipo, texto) {
    retorno.className = 'retorno ' + tipo;
    retorno.textContent = texto;
  }

  /* Aplica os campos reconhecidos. Só toca no que veio no texto colado —
     o que já estava preenchido e não veio do AGHU permanece. */
  function aplicarAGHU(texto) {
    var r = L.lerAGHU(texto);
    if (!r.achados.length) return 0;

    Object.keys(r.campos).forEach(function (chave) {
      if (chave === 'sexo') {
        $$('input[name="sexo"]').forEach(function (rd) {
          rd.checked = rd.value === r.campos.sexo;
        });
        return;
      }
      var el = $('#' + chave);
      if (!el) return;
      el.value = r.campos[chave];
      var c = el.closest('.campo');
      if (c) c.classList.remove('erro');
    });

    retornoAGHU('ok', r.achados.length + ' campos importados: ' + r.achados.join(', ') + '.');
    return r.achados.length;
  }

  function abrirDialogo(texto) {
    $('#txt-aghu').value = texto || '';
    $('#aviso-aghu').className = 'aviso';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('#txt-aghu').focus();
  }

  $('#btn-importar').addEventListener('click', function () {
    retornoAGHU('', '');
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) {
        // sem permissão de leitura ou nada reconhecido: cai para a colagem manual
        if (!aplicarAGHU(t)) abrirDialogo(t);
      }).catch(function () { abrirDialogo(''); });
    } else {
      abrirDialogo('');
    }
  });

  $('#btn-aghu-importar').addEventListener('click', function () {
    if (aplicarAGHU($('#txt-aghu').value)) {
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      $('#bloco-paciente').scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      $('#aviso-aghu').className = 'aviso falha';
      $('#aviso-aghu').textContent = 'Não reconheci nenhum dado de paciente nesse texto. ' +
        'Confira se a cópia foi feita na aba Dados Pessoais do POL.';
    }
  });

  $('#btn-aghu-fechar').addEventListener('click', function () {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  });

  // -------------------------------------------------------------- eventos

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    aviso.className = 'aviso';

    var docs = selecionados();
    if (!docs.length) {
      mostrarAviso('falha', 'Marque pelo menos um documento para emitir.');
      return;
    }

    var falhas = validar(docs);
    if (falhas.length) {
      mostrarAviso('falha', 'Confira os campos destacados antes de gerar.');
      falhas[0].focus();
      falhas[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var modo = docs.length > 1 ? form.saida.value : 'unico';
    var quantas = modo === 'separado' ? docs.length : 1;

    // as abas são abertas de forma síncrona para não serem barradas pelo navegador
    var janelas = [];
    for (var i = 0; i < quantas; i++) janelas.push(window.open('', '_blank'));

    var base = comuns();
    var itens = docs.map(function (d) { return { documento: d, dados: dadosDe(d, base) }; });

    btnGerar.disabled = true;
    var rotulo = btnGerar.textContent;
    btnGerar.textContent = 'Gerando…';
    salvarProfissional();

    L.gerar(itens, base.nome, modo).then(function (r) {
      var links = r.arquivos.map(function (a, i) {
        var url = URL.createObjectURL(new Blob([a.bytes], { type: 'application/pdf' }));
        if (janelas[i] && !janelas[i].closed) janelas[i].location.href = url;
        setTimeout(function () { URL.revokeObjectURL(url); }, 5 * 60 * 1000);
        return '<a href="' + url + '" download="' + a.nome + '">' + a.nome + '</a>';
      });
      var abriu = janelas.some(function (j) { return j && !j.closed; });
      mostrarAviso(r.cortou ? 'falha' : 'ok',
        (abriu ? 'Pronto — aberto em outra aba. ' : 'Pronto, mas o navegador bloqueou a nova aba. ') +
        'Baixar: ' + links.join(' · ') +
        (r.cortou ? ' Atenção: um texto longo não coube inteiro no campo e foi cortado.' : ''));
    }).catch(function (e) {
      janelas.forEach(function (j) { if (j && !j.closed) j.close(); });
      mostrarAviso('falha', 'Não foi possível gerar o PDF. ' + (e && e.message ? e.message : ''));
    }).then(function () {
      btnGerar.disabled = false;
      btnGerar.textContent = rotulo;
    });
  });

  $('#btn-limpar-paciente').addEventListener('click', function () {
    $$('#bloco-paciente input, #documentos input, #documentos textarea').forEach(function (el) {
      if (el.type === 'radio') return;
      if (el.type === 'checkbox') {
        if (!el.classList.contains('emitir')) el.checked = false;
        return;
      }
      el.value = '';
    });
    $$('input[name="sexo"]').forEach(function (r) { r.checked = false; });
    L.documentos.forEach(function (d) {
      d.campos.forEach(function (c) {
        if (c.valor) $('#' + d.id + '__' + c.id).value = c.valor;
      });
    });
    $$('.campo.erro').forEach(function (c) { c.classList.remove('erro'); });
    aviso.className = 'aviso';
    retornoAGHU('', '');
    $('#nome').focus();
  });

  $$('input[name="tipoDoc"]').forEach(function (r) {
    r.addEventListener('change', function () {
      atualizarDicaDoc();
      $('#numeroDoc').value = mascaraDe($('#numeroDoc'))($('#numeroDoc').value);
    });
  });

  // ------------------------------------------------------------- iniciar

  montar();
  ligarMascaras(document);
  carregarProfissional();
  $('#dataSolicitacao').value = L.hoje();
  atualizarBotao();
})();
