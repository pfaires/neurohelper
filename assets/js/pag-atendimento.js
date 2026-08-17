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
    $('#dica-ordem').hidden = atendimento.documentos.length < 2;
    if (!atendimento.documentos.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum documento gravado ainda. ' +
        'Use "adicionar documento" abaixo ou monte um kit pelos ambulatórios.</p>';
      return;
    }

    var linhas = atendimento.documentos.map(function (s) {
      var m = modulo(s.tipo);
      return '<tr data-id="' + esc(s.id) + '">' +
        '<td class="col-mover">' +
          '<button type="button" class="btn-mover" data-mover' +
            ' title="Arraste para reordenar, ou use as setas do teclado"' +
            ' aria-label="Mover documento na ordem de impressão">⠿</button>' +
          '<span class="folha-num" aria-hidden="true"></span>' +
        '</td>' +
        '<td>' + esc(m ? m.titulo : s.tipo) + '</td>' +
        '<td class="col-titulo">' + esc(s.titulo || '—') +
          (s.semData ? ' <span class="etiqueta">sem data</span>' : '') + '</td>' +
        '<td class="col-data">' + quando(s.gravadoEm) + '</td>' +
        '<td class="col-acoes">' +
          '<a class="btn-mini" href="formulario.html?doc=' + encodeURIComponent(s.tipo) +
            '&id=' + encodeURIComponent(s.id) + '">Editar</a>' +
          '<button type="button" class="btn-mini" data-gerar="' + s.id + '">Gerar</button>' +
          '<button type="button" class="btn-mini" data-duplicar="' + s.id + '"' +
            ' title="Cria uma cópia logo abaixo, com os mesmos dados">Duplicar</button>' +
          '<button type="button" class="btn-mini btn-perigo-mini" data-excluir="' + s.id + '">Excluir</button>' +
        '</td></tr>';
    }).join('');

    alvo.innerHTML = '<table class="tabela tabela-documentos"><thead><tr>' +
      '<th class="col-mover"><span title="Em que folha de papel cada um cai">Folha</span></th>' +
      '<th>Documento</th><th>Título</th><th>Gravado</th><th></th>' +
      '</tr></thead><tbody>' + linhas + '</tbody></table>';

    ligarArrasto(alvo.querySelector('tbody'));

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

    Array.prototype.forEach.call(alvo.querySelectorAll('[data-duplicar]'), function (b) {
      b.addEventListener('click', function () {
        var copia = D.duplicarDocumento(b.dataset.duplicar);
        if (!copia) return;
        atendimento = D.lerAtendimento();
        desenharTabela();
        atualizarImpressao();

        // a cópia é o motivo do clique: leva direto para a edição dela
        location.href = 'formulario.html?doc=' + encodeURIComponent(copia.tipo) +
          '&id=' + encodeURIComponent(copia.id);
      });
    });
  }

  // ------------------------------------------------------------ reordenação

  /* A ordem da tabela é a ordem de impressão, e é ela que decide quais meias
     páginas dividem folha. Por isso o número da folha aparece ao lado da alça
     e se refaz a cada movimento — sem esse retorno, arrastar seria às cegas.

     Arrastar não funciona com o dedo nem com o teclado, então a mesma alça
     também anda com as setas quando está em foco. */
  function ligarArrasto(tbody) {
    if (!tbody) return;
    var origem = null;

    function linhas() {
      return Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    }

    function gravarOrdem() {
      D.reordenarDocumentos(linhas().map(function (tr) { return tr.dataset.id; }));
      atendimento = D.lerAtendimento();
      atualizarImpressao();
    }

    Array.prototype.forEach.call(tbody.querySelectorAll('[data-mover]'), function (alca) {
      var tr = alca.closest('tr');

      // a linha só fica arrastável enquanto a alça estiver pressionada, senão
      // selecionar o texto da tabela vira um arrasto sem querer
      function armar() {
        tr.draggable = true;
        // clique sem arrasto: desarma, senão a linha fica arrastável para sempre
        document.addEventListener('mouseup', function () {
          if (!origem) tr.draggable = false;
        }, { once: true });
      }
      alca.addEventListener('mousedown', armar);
      alca.addEventListener('touchstart', armar, { passive: true });

      alca.addEventListener('keydown', function (e) {
        var passo = e.key === 'ArrowUp' ? -1 : (e.key === 'ArrowDown' ? 1 : 0);
        if (!passo) return;
        e.preventDefault();
        var vizinho = passo < 0 ? tr.previousElementSibling : tr.nextElementSibling;
        if (!vizinho) return;
        tbody.insertBefore(passo < 0 ? tr : vizinho, passo < 0 ? vizinho : tr);
        gravarOrdem();
        alca.focus();
      });
    });

    tbody.addEventListener('dragstart', function (e) {
      var tr = e.target.closest && e.target.closest('tr');
      if (!tr) return;
      origem = tr;
      tr.classList.add('arrastando');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        // o Firefox só inicia o arrasto se houver algum dado no pacote
        try { e.dataTransfer.setData('text/plain', tr.dataset.id); } catch (x) { /* ok */ }
      }
    });

    tbody.addEventListener('dragover', function (e) {
      if (!origem) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      var alvo = e.target.closest && e.target.closest('tr');
      if (!alvo || alvo === origem) return;

      // passou da metade da linha? entra depois dela
      var r = alvo.getBoundingClientRect();
      var depois = (e.clientY - r.top) > r.height / 2;
      tbody.insertBefore(origem, depois ? alvo.nextSibling : alvo);
    });

    tbody.addEventListener('drop', function (e) { e.preventDefault(); });

    tbody.addEventListener('dragend', function () {
      if (!origem) return;
      origem.classList.remove('arrastando');
      origem.draggable = false;
      origem = null;
      gravarOrdem();
    });
  }

  /* Escreve o número da folha em cada linha, sem redesenhar a tabela — assim
     quem está usando o teclado não perde o foco da alça. */
  function numerarFolhas() {
    var tbody = $('#tabela-documentos tbody');
    if (!tbody) return;

    var trs = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    var mods = trs.map(function (tr) {
      var s = D.lerDocumento(tr.dataset.id);
      return s ? { documento: modulo(s.tipo), dados: s.dados } : null;
    });
    if (mods.some(function (m) { return !m || !m.documento; })) return;

    var folhas = I.folhaDeCada(mods, $('#agrupar').checked);
    trs.forEach(function (tr, i) {
      var alvo = tr.querySelector('.folha-num');
      if (!alvo) return;
      alvo.textContent = folhas[i] || '';
      tr.classList.toggle('folha-par', folhas[i] % 2 === 0);
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

    var mods = atendimento.documentos
      .map(function (s) { return { documento: modulo(s.tipo), dados: s.dados }; })
      .filter(function (x) { return !!x.documento; });
    var agrupar = $('#agrupar').checked;
    var folhas = I.contarFolhas(mods, agrupar);
    var sem = I.contarFolhas(mods, false);
    var texto = n + (n === 1 ? ' documento' : ' documentos') + ' · ' +
      folhas + (folhas === 1 ? ' folha de papel' : ' folhas de papel');
    if (agrupar && folhas < sem) texto += ' (economia de ' + (sem - folhas) + ')';
    $('#dica-folhas').textContent = texto;

    numerarFolhas();
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
