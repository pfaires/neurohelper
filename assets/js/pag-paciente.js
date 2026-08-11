/* Identificação do paciente: inicia um atendimento novo ou edita o atual. */

(function () {
  'use strict';

  var L = window.Laudos;
  var C = window.Campos;
  var D = window.Dados;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  window.Cabecalho.iniciar('atendimento');

  var raiz = document.getElementById('campos-paciente');
  raiz.innerHTML = C.html('paciente', C.PACIENTE);
  C.ligar(document, 'paciente', C.PACIENTE);

  var atendimento = D.lerAtendimento();
  var editando = !!atendimento;

  if (editando) {
    C.aplicar(document, 'paciente', C.PACIENTE, atendimento.paciente);
    $('#titulo-pagina').textContent = 'Editar paciente';
    $('#trilha-fim').textContent = 'Editar paciente';
    $('#sub-pagina').textContent =
      'Alterar os dados aqui vale para todos os documentos deste atendimento, inclusive os já gravados.';
    $('#btn-salvar').textContent = 'Salvar alterações';
    $('#btn-cancelar').setAttribute('href', 'atendimento.html');
  }

  // ------------------------------------------------------ importação do AGHU

  var dlg = $('#dlg-aghu');
  var retorno = $('#retorno-aghu');

  function retornoAGHU(tipo, texto) {
    retorno.className = 'retorno ' + tipo;
    retorno.textContent = texto;
  }

  /* Só toca nos campos que vieram no texto colado. */
  function aplicarAGHU(texto) {
    var r = L.lerAGHU(texto);
    if (!r.achados.length) return 0;
    C.aplicar(document, 'paciente', C.PACIENTE.filter(function (c) {
      return r.campos[c.id] !== undefined;
    }), r.campos);
    $$('.campo.erro').forEach(function (c) { c.classList.remove('erro'); });
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
        if (!aplicarAGHU(t)) abrirDialogo(t);
      }).catch(function () { abrirDialogo(''); });
    } else {
      abrirDialogo('');
    }
  });

  $('#btn-aghu-importar').addEventListener('click', function () {
    if (aplicarAGHU($('#txt-aghu').value)) {
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
    } else {
      $('#aviso-aghu').className = 'aviso falha';
      $('#aviso-aghu').textContent = 'Não reconheci nenhum dado de paciente nesse texto. ' +
        'Confira se a cópia foi feita na aba Dados Pessoais do POL.';
    }
  });

  $('#btn-aghu-fechar').addEventListener('click', function () {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  });

  // ------------------------------------------------------------------ salvar

  $('#form-paciente').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var aviso = $('#aviso');
    aviso.className = 'aviso';

    var falhas = C.validar(document, 'paciente', C.PACIENTE);
    if (falhas.length) {
      aviso.className = 'aviso falha';
      aviso.textContent = 'Confira os campos destacados.';
      falhas[0].focus();
      falhas[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var paciente = C.ler(document, 'paciente', C.PACIENTE);
    if (editando) D.atualizarPaciente(paciente);
    else D.iniciarAtendimento(paciente);
    location.href = 'atendimento.html';
  });
})();
