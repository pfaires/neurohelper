/* Página de kit: escolher os documentos e mandar para o atendimento. */

(function () {
  'use strict';

  var L = window.Laudos;
  var C = window.Campos;
  var D = window.Dados;
  var esc = C.escapar;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('ambulatorio');
  if (!window.Cabecalho.exigirAtendimento()) return;

  var id = new URLSearchParams(location.search).get('id');
  var kit = null;
  var comuns = [];

  function modulo(tipo) {
    return L.documentos.filter(function (m) { return m.id === tipo; })[0] || null;
  }

  // ------------------------------------------------------------------ montar

  function montar() {
    document.title = kit.titulo + ' · NeuroHelper';
    $('#titulo-pagina').textContent = kit.titulo;
    $('#trilha-fim').textContent = kit.titulo;
    $('#sub-pagina').textContent = kit.descricao || '';

    var amb = window.Ambulatorios.porId(kit.ambulatorio);
    var trilha = $('#trilha-ambulatorio');
    if (amb) {
      trilha.textContent = amb.titulo;
      trilha.href = 'ambulatorio.html?id=' + encodeURIComponent(amb.id);
    } else {
      trilha.textContent = 'Ambulatórios';
      trilha.href = 'ambulatorio.html?id=geral';
    }

    comuns = kit.camposComuns || [];
    if (comuns.length) {
      $('#bloco-comuns').hidden = false;
      document.getElementById('campos-comuns').innerHTML = C.html('kit', comuns);
      C.ligar(document, 'kit', comuns);
      C.aplicar(document, 'kit', comuns, {});
    }

    $('#itens-kit').innerHTML = '<ul class="lista-cartoes">' + (kit.itens || []).map(function (it) {
      var m = modulo(it.documento);
      return '<li class="cartao-linha">' +
        '<label class="marca-doc">' +
          '<input type="checkbox" data-item="' + esc(it.id) + '"' + (it.marcado ? ' checked' : '') + '>' +
          '<span><strong>' + esc(it.titulo) + '</strong>' +
          '<span class="registro">' + esc(m ? m.titulo : it.documento) + '</span></span>' +
        '</label></li>';
    }).join('') + '</ul>';
  }

  // ---------------------------------------------------------------- incluir

  /* O dado comum preenche os campos listados em `aplicaEm` que existirem no
     documento. Se o item já trouxer texto para aquele campo, o comum entra
     depois, separado por linha em branco. */
  function montarDados(it, valoresComuns) {
    var m = modulo(it.documento);
    if (!m) return null;
    var dados = {};
    m.campos.forEach(function (c) {
      dados[c.id] = it.valores && it.valores[c.id] !== undefined
        ? it.valores[c.id]
        : (c.valor !== undefined ? c.valor : (c.tipo === 'caixa' ? false : ''));
    });

    comuns.forEach(function (cc) {
      var texto = String(valoresComuns[cc.id] || '').trim();
      if (!texto) return;
      (cc.aplicaEm || []).forEach(function (destino) {
        var existe = m.campos.some(function (c) { return c.id === destino; });
        if (!existe) return;
        var atual = String(dados[destino] || '').trim();
        dados[destino] = atual ? atual + '\n\n' + texto : texto;
      });
    });

    return dados;
  }

  $('#form-kit').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!kit) return;

    var aviso = $('#aviso');
    aviso.className = 'aviso';

    var marcados = Array.prototype.slice.call(
      document.querySelectorAll('#itens-kit input[data-item]:checked'))
      .map(function (cx) { return cx.dataset.item; });

    if (!marcados.length) {
      aviso.className = 'aviso falha';
      aviso.textContent = 'Marque pelo menos um documento do kit.';
      return;
    }

    var valoresComuns = comuns.length ? C.ler(document, 'kit', comuns) : {};

    var docs = kit.itens
      .filter(function (it) { return marcados.indexOf(it.id) >= 0; })
      .map(function (it) {
        var dados = montarDados(it, valoresComuns);
        if (!dados) return null;
        return { tipo: it.documento, titulo: it.titulo, dados: dados };
      })
      .filter(Boolean);

    var n = D.acrescentarDocumentos(docs);
    aviso.className = 'aviso ok';
    aviso.innerHTML = n + (n === 1 ? ' documento incluído' : ' documentos incluídos') +
      ' no atendimento. <a href="atendimento.html">Ir para o atendimento</a> ' +
      'ou continue escolhendo outros kits.';
  });

  // os kits vêm de um JSON: só dá para montar a página depois de carregar
  window.Kits.carregar().then(function () {
    kit = window.Kits.porId(id);
    if (!kit) { location.replace('ambulatorio.html?id=geral'); return; }
    montar();
  });
})();
