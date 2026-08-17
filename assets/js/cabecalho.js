/* Cabeçalho comum — HULW/UFPB

   Todas as páginas trazem apenas <div id="cabecalho"></div>; o conteúdo é
   montado aqui, para não haver sete cópias do mesmo HTML para manter.

   A barra de contexto mostra quem está prescrevendo e qual paciente está em
   atendimento. Clicar no nome do paciente volta para a página do atendimento. */

window.Cabecalho = (function () {
  'use strict';

  var D = window.Dados;
  var esc = window.Campos.escapar;

  function primeiroNome(nome) {
    var partes = String(nome || '').trim().split(/\s+/);
    if (partes.length <= 2) return partes.join(' ');
    return partes[0] + ' ' + partes[partes.length - 1];
  }

  function montar(pagina) {
    var alvo = document.getElementById('cabecalho');
    if (!alvo) return;

    var atual = function (p) { return p === pagina ? ' aria-current="page"' : ''; };

    var atendimento = D.lerAtendimento();
    var prescritores = D.lerPrescritores();
    var ativo = D.prescritorAtivo();

    var opcoes = '<option value="">— escolher prescritor —</option>' +
      prescritores.map(function (p) {
        return '<option value="' + p.id + '"' + (ativo && ativo.id === p.id ? ' selected' : '') +
          '>' + esc(p.nome) + (p.titulo ? ' · ' + esc(p.titulo) : '') + '</option>';
      }).join('');

    var blocoPrescritor = prescritores.length
      ? '<label class="chip chip-select"><span>Prescritor</span>' +
        '<select id="sel-prescritor">' + opcoes + '</select></label>'
      : '<a class="chip chip-alerta" href="prescritor.html">Cadastrar prescritor</a>';

    var blocoPaciente = atendimento
      ? '<a class="chip chip-paciente" href="atendimento.html" title="Voltar ao atendimento">' +
        '<span class="ponto"></span>' + esc(primeiroNome(atendimento.paciente.nome) || 'Paciente sem nome') +
        '</a><button type="button" class="chip chip-fechar" id="btn-encerrar" ' +
        'title="Encerrar o atendimento e apagar os documentos">Encerrar</button>'
      : '<a class="chip" href="paciente.html">Iniciar atendimento</a>';

    alvo.innerHTML =
      '<header class="topo">' +
        '<div class="container">' +
          '<div>' +
            '<h1><a href="index.html">NeuroHelper</a></h1>' +
            '<p>Residência em Neurologia · Hospital Universitário Lauro Wanderley · UFPB</p>' +
          '</div>' +
          '<nav>' +
            '<a href="index.html"' + atual('inicio') + '>Início</a>' +
            '<a href="atendimento.html"' + atual('atendimento') + '>Atendimento</a>' +
            '<a href="ambulatorio.html?id=geral"' + atual('ambulatorio') + '>Ambulatórios</a>' +
            '<a href="escalas.html"' + atual('escalas') + '>Escalas</a>' +
            '<a href="prescritor.html"' + atual('prescritor') + '>Prescritores</a>' +
          '</nav>' +
        '</div>' +
      '</header>' +
      '<div class="barra-contexto"><div class="container">' +
        blocoPrescritor + blocoPaciente +
      '</div></div>';

    var sel = document.getElementById('sel-prescritor');
    if (sel) {
      sel.addEventListener('change', function () {
        D.definirAtivo(sel.value || null);
      });
    }

    var btn = document.getElementById('btn-encerrar');
    if (btn) {
      btn.addEventListener('click', function () {
        var n = atendimento.documentos.length;
        var aviso = n
          ? 'Encerrar o atendimento apaga o paciente e ' + n +
            (n === 1 ? ' documento gravado' : ' documentos gravados') + '. Continuar?'
          : 'Encerrar o atendimento?';
        if (!window.confirm(aviso)) return;
        D.encerrarAtendimento();
        location.href = 'index.html';
      });
    }
  }

  function rodape() {
    var alvo = document.getElementById('rodape');
    if (!alvo) return;
    alvo.innerHTML = '<footer><div class="container">' +
      'Residência Médica em Neurologia · HULW/UFPB · CNES 2400243 — ' +
      'nenhum dado sai deste navegador.' +
      '</div></footer>';
  }

  /* Guardas: páginas que dependem de atendimento ou de prescritor.
     Devolvem false quando redirecionaram. */
  function exigirAtendimento() {
    if (D.lerAtendimento()) return true;
    location.replace('paciente.html');
    return false;
  }

  function exigirPrescritor() {
    if (D.prescritorAtivo()) return true;
    location.href = 'prescritor.html?voltar=' + encodeURIComponent(location.pathname + location.search);
    return false;
  }

  function iniciar(pagina) {
    montar(pagina);
    rodape();
  }

  return {
    iniciar: iniciar,
    montar: montar,
    exigirAtendimento: exigirAtendimento,
    exigirPrescritor: exigirPrescritor,
    primeiroNome: primeiroNome
  };
})();
