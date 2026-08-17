/* Página inicial. */

(function () {
  'use strict';

  var D = window.Dados;
  var esc = window.Campos.escapar;

  window.Cabecalho.iniciar('inicio');

  var a = D.lerAtendimento();
  var acao = document.getElementById('acao-principal');

  if (a) {
    var n = a.documentos.length;
    acao.innerHTML = '<div class="destaque">' +
      '<h3>Atendimento em andamento</h3>' +
      '<p>' + esc(a.paciente.nome || 'Paciente sem nome') + ' · ' +
        (n ? n + (n === 1 ? ' documento gravado' : ' documentos gravados') : 'nenhum documento ainda') +
      '</p>' +
      '<div class="acoes">' +
        '<a class="btn-primario botao-link" href="atendimento.html">Continuar atendimento</a>' +
        '<a class="btn-secundario botao-link" href="paciente.html">Editar paciente</a>' +
      '</div></div>';
  } else {
    acao.innerHTML = '<div class="destaque">' +
      '<h3>Nenhum atendimento aberto</h3>' +
      '<p>Comece identificando o paciente. Dá para importar os dados direto do AGHU.</p>' +
      '<div class="acoes">' +
        '<a class="btn-primario botao-link" href="paciente.html">Iniciar atendimento</a>' +
      '</div></div>';
  }

  var lista = document.getElementById('lista-ambulatorios');
  var ambs = (window.Ambulatorios && window.Ambulatorios.todos()) || [];
  lista.innerHTML = ambs.length
    ? ambs.map(function (amb) {
        return '<li><a class="cartao" href="ambulatorio.html?id=' + encodeURIComponent(amb.id) + '">' +
          '<h3>' + esc(amb.titulo) + '</h3>' +
          '<p>' + esc(amb.descricao || '') + '</p></a></li>';
      }).join('')
    : '<li><p class="sub">Nenhum ambulatório cadastrado ainda.</p></li>';

  var caixaEscalas = document.getElementById('lista-escalas-inicio');
  var escalas = (window.Escalas && window.Escalas.lista) || [];
  if (caixaEscalas) {
    caixaEscalas.innerHTML = escalas.map(function (e) {
      return '<li><a class="cartao" href="escala.html?id=' + encodeURIComponent(e.id) + '">' +
        '<h3>' + esc(e.sigla) + '</h3>' +
        '<p>' + esc(e.titulo) + '</p></a></li>';
    }).join('') || '<li><p class="sub">Nenhuma escala cadastrada ainda.</p></li>';
  }
})();
