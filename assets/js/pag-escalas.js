/* Lista de escalas e calculadoras. */

(function () {
  'use strict';

  var esc = window.Campos.escapar;
  window.Cabecalho.iniciar('escalas');

  var lista = window.Escalas.lista;
  var alvo = document.getElementById('lista-escalas');

  if (!lista.length) {
    alvo.outerHTML = '<p class="vazio">Nenhuma escala cadastrada ainda.</p>';
    return;
  }

  alvo.innerHTML = lista.map(function (e) {
    return '<li><a class="cartao" href="escala.html?id=' + encodeURIComponent(e.id) + '">' +
      '<h3>' + esc(e.sigla) + '</h3>' +
      '<p><strong>' + esc(e.titulo) + '</strong></p>' +
      '<p>' + esc(e.descricao || '') + '</p>' +
      '</a></li>';
  }).join('');
})();
