/* Página genérica de documento.

   formulario.html?doc=<tipo>          documento novo
   formulario.html?doc=<tipo>&id=<id>  edição de um já gravado

   Os campos vêm da declaração do próprio módulo do documento, então acrescentar
   um formulário novo ao site não exige mexer nesta página. */

(function () {
  'use strict';

  var L = window.Laudos;
  var C = window.Campos;
  var D = window.Dados;
  var I = window.Impressao;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('atendimento');
  if (!window.Cabecalho.exigirAtendimento()) return;

  var params = new URLSearchParams(location.search);
  var tipo = params.get('doc');
  var idDoc = params.get('id');

  var modulo = L.documentos.filter(function (m) { return m.id === tipo; })[0];
  if (!modulo) { location.replace('atendimento.html'); return; }

  var atendimento = D.lerAtendimento();
  var salvo = idDoc ? D.lerDocumento(idDoc) : null;
  if (idDoc && !salvo) { location.replace('atendimento.html'); return; }

  // ------------------------------------------------------------------ montar

  document.title = modulo.titulo + ' · NeuroHelper';
  $('#titulo-pagina').textContent = modulo.titulo;
  $('#trilha-fim').textContent = modulo.titulo;
  $('#sub-pagina').textContent = modulo.descricao;
  $('#legenda-campos').textContent = modulo.titulo;

  var raiz = document.getElementById('campos-documento');
  raiz.innerHTML = C.html('doc', modulo.campos);
  C.ligar(document, 'doc');
  C.aplicar(document, 'doc', modulo.campos, salvo ? salvo.dados : {});

  if (salvo) {
    $('#titulo').value = salvo.titulo || '';
    $('#sem-data').checked = !!salvo.semData;
    $('#btn-excluir').hidden = false;
  }

  // ------------------------------------------------------------------ gravar

  function coletar() {
    var falhas = C.validar(document, 'doc', modulo.campos);
    if (falhas.length) {
      var aviso = $('#aviso');
      aviso.className = 'aviso falha';
      aviso.textContent = 'Confira os campos destacados.';
      falhas[0].focus();
      falhas[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return null;
    }
    return C.ler(document, 'doc', modulo.campos);
  }

  /* Gravar sempre acontece, inclusive ao gerar ou baixar: assim ninguém perde
     o que digitou por ter clicado no botão "errado". */
  function gravar() {
    var dados = coletar();
    if (!dados) return null;

    var titulo = $('#titulo').value.trim();
    if (!titulo && modulo.tituloPadrao) titulo = String(modulo.tituloPadrao(dados) || '').slice(0, 60);
    if (!titulo) titulo = modulo.titulo;

    salvo = D.salvarDocumento({
      id: salvo ? salvo.id : null,
      tipo: modulo.id,
      titulo: titulo,
      semData: $('#sem-data').checked,
      dados: dados
    });
    atendimento = D.lerAtendimento();

    // a partir daqui a página passa a editar o documento gravado
    if (!idDoc) {
      idDoc = salvo.id;
      history.replaceState(null, '', 'formulario.html?doc=' +
        encodeURIComponent(modulo.id) + '&id=' + encodeURIComponent(idDoc));
      $('#btn-excluir').hidden = false;
    }
    $('#titulo').value = salvo.titulo;
    return salvo;
  }

  function produzir(baixar) {
    var aviso = $('#aviso');
    aviso.className = 'aviso';

    var prescritor = D.prescritorAtivo();
    if (!prescritor) {
      aviso.className = 'aviso falha';
      var volta = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      aviso.innerHTML = 'Escolha o prescritor na barra do topo antes de gerar. ' +
        '<a href="prescritor.html?voltar=' + volta + '">Cadastrar ou escolher prescritor</a>';
      return;
    }

    var doc = gravar();
    if (!doc) return;

    var janela = baixar ? null : window.open('', '_blank');
    aviso.className = 'aviso ok';
    aviso.textContent = 'Gerando…';

    I.gerar(I.itensDe([doc], atendimento, prescritor), {
      agrupar: false,
      nomePaciente: atendimento.paciente.nome
    }).then(function (r) {
      var url = URL.createObjectURL(new Blob([r.bytes], { type: 'application/pdf' }));
      if (baixar) {
        var a = document.createElement('a');
        a.href = url; a.download = r.nome;
        document.body.appendChild(a); a.click(); a.remove();
      } else if (janela && !janela.closed) {
        janela.location.href = url;
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 5 * 60 * 1000);

      aviso.className = r.cortou ? 'aviso falha' : 'aviso ok';
      aviso.innerHTML = 'Documento gravado e gerado · ' +
        '<a href="' + url + '" download="' + r.nome + '">' + r.nome + '</a>' +
        (r.cortou ? ' — atenção: um texto longo não coube inteiro e foi cortado.' : '');
    }).catch(function (e) {
      if (janela && !janela.closed) janela.close();
      aviso.className = 'aviso falha';
      aviso.textContent = 'Não foi possível gerar o PDF. ' + (e && e.message ? e.message : '');
    });
  }

  // ----------------------------------------------------------------- eventos

  $('#form-documento').addEventListener('submit', function (ev) {
    ev.preventDefault();
    $('#aviso').className = 'aviso';
    if (gravar()) location.href = 'atendimento.html';
  });

  $('#btn-gerar').addEventListener('click', function () { produzir(false); });
  $('#btn-baixar').addEventListener('click', function () { produzir(true); });

  $('#btn-excluir').addEventListener('click', function () {
    if (!salvo || !window.confirm('Excluir este documento do atendimento?')) return;
    D.excluirDocumento(salvo.id);
    location.href = 'atendimento.html';
  });
})();
