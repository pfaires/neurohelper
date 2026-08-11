/* Editor de kits.

   Salvar grava no localStorage e o kit já aparece na interface deste
   computador. Exportar gera o kits.json completo — repositório mais locais —
   para substituir assets/dados/kits.json e publicar para todo mundo. */

(function () {
  'use strict';

  var L = window.Laudos;
  var C = window.Campos;
  var D = window.Dados;
  var esc = C.escapar;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  window.Cabecalho.iniciar('kits');

  var editando = null;   // id do kit em edição, null quando é novo
  var itens = [];        // [{ uid, documento, titulo, marcado, valores }]

  // --------------------------------------------------------------- utilidades

  function apelido(t) {
    return L.semAcento(t).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  }

  function modulo(tipo) {
    return L.documentos.filter(function (m) { return m.id === tipo; })[0] || null;
  }

  // campos de texto longo de todos os documentos: destinos possíveis do comum
  function destinosPossiveis() {
    var vistos = {};
    var lista = [];
    L.documentos.forEach(function (m) {
      m.campos.forEach(function (c) {
        if (c.tipo !== 'area' || vistos[c.id]) return;
        vistos[c.id] = true;
        lista.push({ id: c.id, rotulo: c.rotulo, onde: m.titulo });
      });
    });
    return lista;
  }

  function avisar(alvo, tipo, texto) {
    var el = $(alvo);
    el.className = 'aviso ' + tipo;
    el.innerHTML = texto;
  }

  // ------------------------------------------------------------------- lista

  function desenharLista() {
    var kits = window.Kits.todos();
    var alvo = $('#lista-kits');

    if (!kits.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum kit ainda. Crie o primeiro abaixo.</p>';
      return;
    }

    var rotulo = { repositorio: 'publicado', local: 'só neste computador', alterado: 'alterado aqui' };

    alvo.innerHTML = '<ul class="lista-cartoes">' + kits.map(function (k) {
      var o = window.Kits.origem(k.id);
      var amb = window.Ambulatorios.porId(k.ambulatorio);
      return '<li class="cartao-linha">' +
        '<span class="marca-doc"><span>' +
          '<strong>' + esc(k.titulo) + '</strong> ' +
          '<span class="etiqueta etiqueta-' + o + '">' + rotulo[o] + '</span>' +
          '<span class="registro">' + (k.itens || []).length + ' documentos · ' +
            esc(amb ? amb.titulo : k.ambulatorio || 'sem ambulatório') + '</span>' +
        '</span></span>' +
        '<span class="acoes-linha">' +
          '<button type="button" class="btn-mini" data-editar="' + esc(k.id) + '">Editar</button>' +
          '<button type="button" class="btn-mini" data-duplicar="' + esc(k.id) + '">Duplicar</button>' +
        '</span></li>';
    }).join('') + '</ul>';

    $$('[data-editar]', alvo).forEach(function (b) {
      b.addEventListener('click', function () { abrir(window.Kits.porId(b.dataset.editar)); });
    });
    $$('[data-duplicar]', alvo).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = JSON.parse(JSON.stringify(window.Kits.porId(b.dataset.duplicar)));
        k.id = '';
        k.titulo = k.titulo + ' (cópia)';
        abrir(k, true);
      });
    });
  }

  // ------------------------------------------------------------------ itens

  function htmlItem(it) {
    var m = modulo(it.documento);
    return '<details class="doc" data-uid="' + it.uid + '">' +
      '<summary>' +
        '<span class="doc-titulo">' + esc(it.titulo || (m ? m.titulo : it.documento)) + '</span>' +
        '<span class="doc-descricao">' + esc(m ? m.titulo : it.documento) + '</span>' +
        '<span class="acoes-linha">' +
          '<button type="button" class="btn-mini" data-subir="' + it.uid + '" title="Subir">↑</button>' +
          '<button type="button" class="btn-mini" data-descer="' + it.uid + '" title="Descer">↓</button>' +
          '<button type="button" class="btn-mini btn-perigo-mini" data-remover="' + it.uid + '">Remover</button>' +
        '</span>' +
      '</summary>' +
      '<div class="grade">' +
        '<div class="campo c9"><label for="t-' + it.uid + '">Título do item</label>' +
          '<input type="text" id="t-' + it.uid + '" autocomplete="off" maxlength="60"></div>' +
        '<div class="campo c3"><label class="opcao-caixa">' +
          '<input type="checkbox" id="m-' + it.uid + '"> Vem marcado</label></div>' +
      '</div>' +
      (m ? C.html(it.uid, m.campos) : '<p class="vazio">Documento desconhecido: ' + esc(it.documento) + '</p>') +
      '</details>';
  }

  /* Lê o que está na tela de volta para a memória, para não perder digitação
     quando a lista é redesenhada. */
  function sincronizar() {
    itens.forEach(function (it) {
      var t = $('#t-' + it.uid);
      var mc = $('#m-' + it.uid);
      if (t) it.titulo = t.value;
      if (mc) it.marcado = mc.checked;
      var m = modulo(it.documento);
      if (m && $('#' + it.uid + '__' + m.campos[0].id)) {
        it.valores = C.ler(document, it.uid, m.campos);
      }
    });
  }

  function desenharItens() {
    var alvo = $('#itens');
    if (!itens.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum documento no kit. Escolha um tipo abaixo e acrescente.</p>';
      return;
    }

    alvo.innerHTML = itens.map(htmlItem).join('');

    itens.forEach(function (it) {
      var m = modulo(it.documento);
      $('#t-' + it.uid).value = it.titulo || '';
      $('#m-' + it.uid).checked = it.marcado !== false;
      if (m) {
        C.ligar(document, it.uid, m.campos);
        C.aplicar(document, it.uid, m.campos, it.valores || {});
      }
    });

    $$('[data-remover]', alvo).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        sincronizar();
        itens = itens.filter(function (i) { return i.uid !== b.dataset.remover; });
        desenharItens();
      });
    });

    function mover(uid, passo) {
      sincronizar();
      var i = -1;
      itens.forEach(function (it, k) { if (it.uid === uid) i = k; });
      var j = i + passo;
      if (i < 0 || j < 0 || j >= itens.length) return;
      var t = itens[i]; itens[i] = itens[j]; itens[j] = t;
      desenharItens();
    }
    $$('[data-subir]', alvo).forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.preventDefault(); mover(b.dataset.subir, -1); });
    });
    $$('[data-descer]', alvo).forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.preventDefault(); mover(b.dataset.descer, 1); });
    });
  }

  // ------------------------------------------------------------------ editor

  function abrir(kit, comoNovo) {
    kit = kit || { id: '', titulo: '', descricao: '', ambulatorio: '', camposComuns: [], itens: [] };
    editando = comoNovo ? null : (kit.id || null);

    $('#form-kit').hidden = false;
    $('#legenda-kit').textContent = editando ? 'Editando ' + kit.titulo : 'Novo kit';
    $('#k-titulo').value = kit.titulo || '';
    $('#k-descricao').value = kit.descricao || '';
    $('#k-id').value = comoNovo ? '' : (kit.id || '');
    $('#k-ambulatorio').value = kit.ambulatorio || '';

    var cc = (kit.camposComuns || [])[0] || null;
    $('#cc-usar').checked = !!cc;
    $('#cc-corpo').hidden = !cc;
    $('#cc-rotulo').value = cc ? cc.rotulo : 'Resumo clínico';
    $('#cc-dica').value = cc ? (cc.dica || '') : '';
    $('#cc-valor').value = cc ? (cc.valor || '') : '';
    var aplica = cc ? (cc.aplicaEm || []) : ['justificativa', 'dadosClinicos', 'observacoes'];
    $$('#cc-destinos input').forEach(function (cx) {
      cx.checked = aplica.indexOf(cx.value) >= 0;
    });

    itens = (kit.itens || []).map(function (it) {
      return {
        uid: 'i' + D.uid(),
        documento: it.documento,
        titulo: it.titulo,
        marcado: it.marcado !== false,
        valores: it.valores || {}
      };
    });
    desenharItens();

    var origem = editando ? window.Kits.origem(editando) : null;
    $('#btn-excluir').hidden = !(origem === 'local');
    $('#btn-restaurar').hidden = !(origem === 'alterado');

    $('#aviso').className = 'aviso';
    $('#form-kit').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('#k-titulo').focus();
  }

  function fechar() {
    $('#form-kit').hidden = true;
    editando = null;
    itens = [];
  }

  function coletar() {
    sincronizar();
    $$('.campo.erro').forEach(function (c) { c.classList.remove('erro'); });

    var titulo = $('#k-titulo').value.trim();
    if (!titulo) {
      $('#k-titulo').closest('.campo').classList.add('erro');
      return null;
    }

    var id = apelido($('#k-id').value.trim() || titulo);
    var conflito = window.Kits.todos().some(function (k) {
      return k.id === id && k.id !== editando;
    });
    if (conflito) {
      $('#k-id').value = id;
      $('#k-id').closest('.campo').classList.add('erro');
      return null;
    }

    var kit = {
      id: id,
      ambulatorio: $('#k-ambulatorio').value,
      titulo: titulo,
      descricao: $('#k-descricao').value.trim(),
      camposComuns: [],
      itens: itens.map(function (it) {
        return {
          id: apelido(it.titulo) || it.uid,
          documento: it.documento,
          titulo: it.titulo || (modulo(it.documento) || {}).titulo || it.documento,
          marcado: it.marcado !== false,
          valores: it.valores || {}
        };
      })
    };

    if ($('#cc-usar').checked) {
      kit.camposComuns.push({
        id: 'resumo',
        rotulo: $('#cc-rotulo').value.trim() || 'Resumo clínico',
        tipo: 'area',
        larg: 12,
        linhas: 4,
        max: 800,
        dica: $('#cc-dica').value.trim(),
        aplicaEm: $$('#cc-destinos input:checked').map(function (cx) { return cx.value; }),
        valor: $('#cc-valor').value.trim()
      });
    }

    return kit;
  }

  // ------------------------------------------------------ exportar / importar

  function baixar(nome, texto) {
    var url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  $('#btn-exportar').addEventListener('click', function () {
    var kits = window.Kits.todos();
    baixar('kits.json', JSON.stringify(kits, null, 2) + '\n');
    avisar('#aviso-lista', 'ok', 'Arquivo com ' + kits.length +
      (kits.length === 1 ? ' kit gerado' : ' kits gerado') +
      '. Substitua <code>assets/dados/kits.json</code> no repositório e faça o deploy.');
  });

  $('#btn-importar').addEventListener('click', function () { $('#arquivo-importar').click(); });

  $('#arquivo-importar').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var leitor = new FileReader();
    leitor.onload = function () {
      try {
        var lista = JSON.parse(leitor.result);
        if (!Array.isArray(lista)) throw new Error('O arquivo não contém uma lista de kits.');
        D.gravarKitsLocais(lista);
        desenharLista();
        avisar('#aviso-lista', 'ok', lista.length +
          (lista.length === 1 ? ' kit importado' : ' kits importados') +
          ' para este computador.');
      } catch (e) {
        avisar('#aviso-lista', 'falha', 'Não consegui ler o arquivo. ' + e.message);
      }
    };
    leitor.readAsText(f);
    this.value = '';
  });

  // ----------------------------------------------------------------- eventos

  $('#k-titulo').addEventListener('input', function () {
    if (!editando) $('#k-id').value = apelido(this.value);
  });

  $('#cc-usar').addEventListener('change', function () {
    $('#cc-corpo').hidden = !this.checked;
  });

  $('#btn-add-item').addEventListener('click', function () {
    sincronizar();
    var tipo = $('#novo-tipo').value;
    var m = modulo(tipo);
    if (!m) return;
    itens.push({ uid: 'i' + D.uid(), documento: tipo, titulo: m.titulo, marcado: true, valores: {} });
    desenharItens();
    var ultimo = $('#itens .doc:last-child');
    if (ultimo) { ultimo.open = true; ultimo.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  $('#btn-novo').addEventListener('click', function () { abrir(null, true); });
  $('#btn-fechar').addEventListener('click', fechar);

  $('#btn-excluir').addEventListener('click', function () {
    if (!editando || !window.confirm('Excluir este kit deste computador?')) return;
    D.excluirKitLocal(editando);
    fechar();
    desenharLista();
    avisar('#aviso-lista', 'ok', 'Kit excluído.');
  });

  $('#btn-restaurar').addEventListener('click', function () {
    if (!editando || !window.confirm('Descartar as alterações locais e voltar à versão publicada?')) return;
    D.excluirKitLocal(editando);
    var original = window.Kits.original(editando);
    fechar();
    desenharLista();
    if (original) abrir(original);
    avisar('#aviso-lista', 'ok', 'Versão publicada restaurada.');
  });

  $('#form-kit').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var kit = coletar();
    if (!kit) {
      avisar('#aviso', 'falha', 'Confira os campos destacados.');
      return;
    }
    if (!kit.itens.length) {
      avisar('#aviso', 'falha', 'Acrescente pelo menos um documento ao kit.');
      return;
    }
    D.salvarKitLocal(kit);
    editando = kit.id;
    $('#legenda-kit').textContent = 'Editando ' + kit.titulo;
    $('#btn-excluir').hidden = window.Kits.origem(kit.id) !== 'local';
    $('#btn-restaurar').hidden = window.Kits.origem(kit.id) !== 'alterado';
    desenharLista();
    avisar('#aviso', 'ok', 'Kit salvo neste computador e já disponível no ambulatório. ' +
      'Para publicar, exporte o kits.json na lista acima.');
  });

  // ------------------------------------------------------------------ início

  $('#novo-tipo').innerHTML = L.documentos.map(function (m) {
    return '<option value="' + esc(m.id) + '">' + esc(m.titulo) + '</option>';
  }).join('');

  $('#k-ambulatorio').innerHTML = window.Ambulatorios.todos().map(function (a) {
    return '<option value="' + esc(a.id) + '">' + esc(a.titulo) + '</option>';
  }).join('');

  $('#cc-destinos').innerHTML = destinosPossiveis().map(function (d) {
    return '<label><input type="checkbox" value="' + esc(d.id) + '"> ' +
      esc(d.rotulo) + ' <span class="registro">(' + esc(d.onde) + ')</span></label>';
  }).join('');

  window.Kits.carregar().then(desenharLista);
})();
