/* Página de ambulatório: seções recolhíveis com kits e referências. */

(function () {
  'use strict';

  var esc = window.Campos.escapar;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('ambulatorio');

  var id = new URLSearchParams(location.search).get('id') || 'geral';
  var amb = window.Ambulatorios.porId(id);

  if (!amb) {
    var primeiro = window.Ambulatorios.todos()[0];
    if (primeiro) { location.replace('ambulatorio.html?id=' + encodeURIComponent(primeiro.id)); return; }
    $('#titulo-pagina').textContent = 'Ambulatório não encontrado';
    return;
  }

  document.title = amb.titulo + ' · NeuroHelper';
  $('#titulo-pagina').textContent = amb.titulo;
  $('#trilha-fim').textContent = amb.titulo;
  $('#sub-pagina').textContent = amb.descricao || '';

  // outros ambulatórios, quando houver mais de um
  var outros = window.Ambulatorios.todos().filter(function (a) { return a.id !== amb.id; });
  if (outros.length) {
    $('#lista-outros').innerHTML = '<p class="sub">Outros: ' + outros.map(function (a) {
      return '<a href="ambulatorio.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.titulo) + '</a>';
    }).join(' · ') + '</p>';
  }

  function htmlItem(it) {
    if (it.tipo === 'kit') {
      var k = window.Kits.porId(it.id);
      if (!k) return '';
      return '<li class="item-kit">' +
        '<a class="cartao" href="kit.html?id=' + encodeURIComponent(k.id) + '">' +
          '<h3>' + esc(it.texto || k.titulo) + '</h3>' +
          '<p>' + esc(k.descricao || '') + '</p>' +
          '<span class="marcador">Kit de documentos</span>' +
        '</a></li>';
    }
    if (it.tipo === 'link') {
      return '<li class="item-link">' +
        '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(it.texto) + '</a>' +
        (it.nota ? '<span class="nota-item">' + esc(it.nota) + '</span>' : '') +
        '</li>';
    }
    return '<li class="item-nota">' + esc(it.texto || '') + '</li>';
  }

  function desenhar() {
    $('#secoes').innerHTML = (amb.secoes || []).map(function (s) {
      return '<details class="doc secao-amb"' + (s.aberta ? ' open' : '') + '>' +
        '<summary><span class="doc-titulo">' + esc(s.titulo) + '</span>' +
        (s.descricao ? '<span class="doc-descricao">' + esc(s.descricao) + '</span>' : '') +
        '</summary>' +
        '<ul class="itens-secao">' + (s.itens || []).map(htmlItem).join('') + '</ul>' +
        '</details>';
    }).join('');
  }

  // os kits vêm de um JSON: só dá para desenhar depois de carregar
  window.Kits.carregar().then(desenhar);
})();
