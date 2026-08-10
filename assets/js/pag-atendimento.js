/* Página do atendimento: paciente, documentos gravados e impressão. */

(function () {
  'use strict';

  var L = window.Laudos;
  var C = window.Campos;
  var D = window.Dados;
  var I = window.Impressao;
  var esc = C.escapar;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('atendimento');
  if (!window.Cabecalho.exigirAtendimento()) return;

  var atendimento = D.lerAtendimento();

  // ------------------------------------------------------------- paciente

  function modulo(tipo) {
    return L.documentos.filter(function (m) { return m.id === tipo; })[0] || null;
  }

  function desenharPaciente() {
    var p = atendimento.paciente || {};
    var linhas = [];
    if (p.prontuario) linhas.push('Prontuário ' + esc(p.prontuario));
    var idade = L.idade(p.nascimento);
    if (idade) linhas.push(idade);
    if (p.sexo === '1') linhas.push('Masculino');
    if (p.sexo === '3') linhas.push('Feminino');
    if (p.cns) linhas.push('CNS ' + esc(p.cns));
    if (p.municipio) linhas.push(esc(p.municipio) + (p.uf ? '/' + esc(p.uf) : ''));

    $('#cartao-paciente').innerHTML =
      '<div><h2>' + esc(p.nome || 'Paciente sem nome') + '</h2>' +
      '<p class="sub">' + (linhas.join(' · ') || 'Sem dados complementares') + '</p></div>' +
      '<a class="btn-mini" href="paciente.html">Editar paciente</a>';
  }

  // ------------------------------------------------------------ documentos

  function quando(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' às ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function desenharTabela() {
    var alvo = $('#tabela-documentos');
    if (!atendimento.documentos.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum documento gravado ainda. ' +
        'Use "adicionar documento" abaixo ou monte um kit pelos ambulatórios.</p>';
      return;
    }

    var linhas = atendimento.documentos.map(function (s) {
      var m = modulo(s.tipo);
      return '<tr>' +
        '<td>' + esc(m ? m.titulo : s.tipo) + '</td>' +
        '<td class="col-titulo">' + esc(s.titulo || '—') +
          (s.semData ? ' <span class="etiqueta">sem data</span>' : '') + '</td>' +
        '<td class="col-data">' + quando(s.gravadoEm) + '</td>' +
        '<td class="col-acoes">' +
          '<a class="btn-mini" href="formulario.html?doc=' + encodeURIComponent(s.tipo) +
            '&id=' + encodeURIComponent(s.id) + '">Editar</a>' +
          '<button type="button" class="btn-mini" data-gerar="' + s.id + '">Gerar</button>' +
          '<button type="button" class="btn-mini btn-perigo-mini" data-excluir="' + s.id + '">Excluir</button>' +
        '</td></tr>';
    }).join('');

    alvo.innerHTML = '<table class="tabela"><thead><tr>' +
      '<th>Documento</th><th>Título</th><th>Gravado</th><th></th>' +
      '</tr></thead><tbody>' + linhas + '</tbody></table>';

    Array.prototype.forEach.call(alvo.querySelectorAll('[data-excluir]'), function (b) {
      b.addEventListener('click', function () {
        if (!window.confirm('Excluir este documento do atendimento?')) return;
        D.excluirDocumento(b.dataset.excluir);
        atendimento = D.lerAtendimento();
        desenharTabela();
        atualizarImpressao();
      });
    });

    Array.prototype.forEach.call(alvo.querySelectorAll('[data-gerar]'), function (b) {
      b.addEventListener('click', function () {
        var s = D.lerDocumento(b.dataset.gerar);
        if (s) produzir([s], false, true);
      });
    });
  }

  function desenharTipos() {
    $('#lista-tipos').innerHTML = L.documentos.map(function (m) {
      return '<li><a class="cartao" href="formulario.html?doc=' + encodeURIComponent(m.id) + '">' +
        '<h3>' + esc(m.titulo) + '</h3><p>' + esc(m.descricao) + '</p></a></li>';
    }).join('');
  }

  // -------------------------------------------------------------- impressão

  function atualizarImpressao() {
    var bloco = $('#bloco-impressao');
    var n = atendimento.documentos.length;
    bloco.hidden = !n;
    if (!n) return;

    var mods = atendimento.documentos.map(function (s) { return modulo(s.tipo); })
      .filter(function (m) { return !!m; });
    var agrupar = $('#agrupar').checked;
    var folhas = I.contarFolhas(mods, agrupar);
    var sem = I.contarFolhas(mods, false);
    var texto = n + (n === 1 ? ' documento' : ' documentos') + ' · ' +
      folhas + (folhas === 1 ? ' folha de papel' : ' folhas de papel');
    if (agrupar && folhas < sem) texto += ' (economia de ' + (sem - folhas) + ')';
    $('#dica-folhas').textContent = texto;
  }

  function produzir(salvos, baixar, individual) {
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

    var itens = I.itensDe(salvos, atendimento, prescritor);
    if (!itens.length) return;

    var janela = baixar ? null : window.open('', '_blank');
    aviso.className = 'aviso ok';
    aviso.textContent = 'Gerando…';

    I.gerar(itens, {
      agrupar: individual ? false : $('#agrupar').checked,
      nomePaciente: atendimento.paciente.nome,
      arquivo: individual ? undefined : 'documentos'
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
      aviso.innerHTML = (baixar ? 'Arquivo baixado' : 'Pronto') + ' · ' +
        r.folhas + (r.folhas === 1 ? ' folha' : ' folhas') +
        ' · <a href="' + url + '" download="' + r.nome + '">' + r.nome + '</a>' +
        (r.cortou ? ' — atenção: um texto longo não coube inteiro e foi cortado.' : '');
    }).catch(function (e) {
      if (janela && !janela.closed) janela.close();
      aviso.className = 'aviso falha';
      aviso.textContent = 'Não foi possível gerar o PDF. ' + (e && e.message ? e.message : '');
    });
  }

  $('#agrupar').addEventListener('change', atualizarImpressao);
  $('#btn-imprimir').addEventListener('click', function () {
    produzir(atendimento.documentos, false, false);
  });
  $('#btn-baixar').addEventListener('click', function () {
    produzir(atendimento.documentos, true, false);
  });

  // ------------------------------------------------------------------ início

  desenharPaciente();
  desenharTabela();
  desenharTipos();
  atualizarImpressao();
  if (!atendimento.documentos.length) $('#novo-documento').open = true;
})();
