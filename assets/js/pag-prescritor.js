/* Cadastro local de prescritores. */

(function () {
  'use strict';

  var C = window.Campos;
  var D = window.Dados;
  var esc = C.escapar;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('prescritor');

  var editandoId = null;
  var voltar = new URLSearchParams(location.search).get('voltar');

  var raiz = document.getElementById('campos-prescritor');
  raiz.innerHTML = C.html('presc', C.PRESCRITOR);
  C.ligar(document, 'presc', C.PRESCRITOR);
  C.aplicar(document, 'presc', C.PRESCRITOR, {});

  // -------------------------------------------------------------- registro

  function registro(p) {
    var partes = [];
    if (p.titulo) partes.push(esc(p.titulo));
    if (p.crm) partes.push('CRM-' + esc(p.uf || 'PB') + ' ' + esc(p.crm));
    if (p.rqe) partes.push('RQE ' + esc(p.rqe));
    if (p.numeroDoc) partes.push(esc(p.tipoDoc || 'CNS') + ' ' + esc(p.numeroDoc));
    return partes.join(' · ');
  }

  function desenhar() {
    var lista = D.lerPrescritores();
    var ativo = D.idAtivo();
    var alvo = $('#lista-prescritores');

    if (!lista.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum prescritor cadastrado neste computador. ' +
        'Preencha o formulário abaixo.</p>';
      return;
    }

    alvo.innerHTML = '<ul class="lista-cartoes">' + lista.map(function (p) {
      return '<li class="cartao-linha' + (ativo === p.id ? ' ativo' : '') + '">' +
        '<label class="marca-doc">' +
          '<input type="radio" name="ativo" value="' + p.id + '"' +
            (ativo === p.id ? ' checked' : '') + '>' +
          '<span><strong>' + esc(p.nome) + '</strong>' +
          '<span class="registro">' + (registro(p) || 'sem registro informado') + '</span></span>' +
        '</label>' +
        '<span class="acoes-linha">' +
          '<button type="button" class="btn-mini" data-editar="' + p.id + '">Editar</button>' +
          '<button type="button" class="btn-mini btn-perigo-mini" data-excluir="' + p.id + '">Excluir</button>' +
        '</span></li>';
    }).join('') + '</ul>';

    Array.prototype.forEach.call(alvo.querySelectorAll('input[name="ativo"]'), function (r) {
      r.addEventListener('change', function () {
        D.definirAtivo(r.value);
        window.Cabecalho.montar('prescritor');
        desenhar();
        if (voltar) {
          location.href = voltar;
        }
      });
    });

    Array.prototype.forEach.call(alvo.querySelectorAll('[data-editar]'), function (b) {
      b.addEventListener('click', function () { editar(b.dataset.editar); });
    });

    Array.prototype.forEach.call(alvo.querySelectorAll('[data-excluir]'), function (b) {
      b.addEventListener('click', function () {
        var p = D.lerPrescritores().filter(function (x) { return x.id === b.dataset.excluir; })[0];
        if (!p || !window.confirm('Excluir ' + p.nome + ' deste computador?')) return;
        D.excluirPrescritor(b.dataset.excluir);
        if (editandoId === b.dataset.excluir) cancelar();
        window.Cabecalho.montar('prescritor');
        desenhar();
      });
    });
  }

  // --------------------------------------------------------------- edição

  function editar(id) {
    var p = D.lerPrescritores().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    editandoId = id;
    C.aplicar(document, 'presc', C.PRESCRITOR, p);
    $('#legenda-form').textContent = 'Editando ' + p.nome;
    $('#btn-salvar').textContent = 'Salvar alterações';
    $('#btn-cancelar').hidden = false;
    $('#form-prescritor').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function cancelar() {
    editandoId = null;
    C.limpar(document, 'presc', C.PRESCRITOR);
    C.aplicar(document, 'presc', C.PRESCRITOR, {});
    $('#legenda-form').textContent = 'Novo prescritor';
    $('#btn-salvar').textContent = 'Salvar prescritor';
    $('#btn-cancelar').hidden = true;
    $('#aviso').className = 'aviso';
  }

  $('#btn-cancelar').addEventListener('click', cancelar);

  $('#form-prescritor').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var aviso = $('#aviso');
    aviso.className = 'aviso';

    var falhas = C.validar(document, 'presc', C.PRESCRITOR);
    if (falhas.length) {
      aviso.className = 'aviso falha';
      aviso.textContent = 'Confira os campos destacados.';
      falhas[0].focus();
      return;
    }

    var dados = C.ler(document, 'presc', C.PRESCRITOR);
    dados.id = editandoId;
    var salvo = D.salvarPrescritor(dados);

    // primeiro cadastro da sessão já entra como ativo
    if (!D.idAtivo()) D.definirAtivo(salvo.id);

    var novo = !editandoId;
    cancelar();
    window.Cabecalho.montar('prescritor');
    desenhar();

    aviso.className = 'aviso ok';
    aviso.textContent = novo ? 'Prescritor cadastrado.' : 'Alterações salvas.';

    if (voltar && D.idAtivo() === salvo.id) location.href = voltar;
  });

  desenhar();
})();
