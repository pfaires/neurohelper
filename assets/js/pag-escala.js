/* Página de uma escala — HULW/UFPB

   Serve a qualquer escala registrada em window.Escalas: monta os itens, soma,
   mostra o resultado e copia o texto para o prontuário.

   Nada é gravado. A escala é ferramenta de consulta: pontua, copia, fecha. */

(function () {
  'use strict';

  var E = window.Escalas;
  var esc = window.Campos.escapar;
  var $ = function (s) { return document.querySelector(s); };

  window.Cabecalho.iniciar('escalas');

  var id = new URLSearchParams(location.search).get('id') || '';
  var escala = E.achar(id);

  if (!escala) {
    $('#conteudo').innerHTML = '<p class="vazio">Escala não encontrada. ' +
      '<a href="escalas.html">Ver a lista</a>.</p>';
    return;
  }

  var respostas = {};

  document.title = escala.sigla + ' · NeuroHelper';
  $('#titulo-pagina').textContent = escala.sigla;
  $('#sub-pagina').textContent = escala.titulo;
  $('#trilha-fim').textContent = escala.sigla;

  // ------------------------------------------------------------------ itens

  function htmlOpcoes(item) {
    return E.opcoesDe(item, respostas).map(function (o) {
      var marcado = String(respostas[item.id]) === String(o.valor);
      return '<label class="opcao-escala' + (marcado ? ' marcada' : '') + '">' +
        '<input type="radio" name="' + esc(item.id) + '" value="' + esc(o.valor) + '"' +
        (marcado ? ' checked' : '') + '>' +
        '<span class="ponto-escala">' + esc(o.valor) + '</span>' +
        '<span class="texto-escala">' + esc(o.texto) + '</span>' +
        '</label>';
    }).join('');
  }

  function htmlItem(item) {
    var num = item.numero ? '<span class="num-item">' + item.numero + '</span>' : '';
    return '<div class="item-escala' + (item.pontua === false ? ' item-roteiro' : '') +
      '" data-item="' + esc(item.id) + '">' +
      '<h4>' + num + esc(item.titulo) + '</h4>' +
      (item.dica ? '<p class="dica">' + esc(item.dica) + '</p>' : '') +
      '<div class="opcoes-escala">' + htmlOpcoes(item) + '</div>' +
      '</div>';
  }

  function desenhar() {
    var grupos = escala.grupos || [{ titulo: '', itens: escala.itens }];
    $('#itens').innerHTML = grupos.map(function (g) {
      return '<section class="grupo-escala">' +
        (g.titulo ? '<h3 class="titulo-secao">' + esc(g.titulo) + '</h3>' : '') +
        g.itens.map(htmlItem).join('') +
        '</section>';
    }).join('');

    $('#itens').addEventListener('change', aoResponder);
  }

  /* Só os itens cuja régua depende de outra resposta precisam ser redesenhados.
     Redesenhar tudo funcionaria, mas roubaria o foco de quem usa o teclado. */
  function redesenharDependentes() {
    E.itensDe(escala).forEach(function (item) {
      if (typeof item.opcoes !== 'function') return;
      var caixa = $('#itens [data-item="' + item.id + '"] .opcoes-escala');
      if (caixa) caixa.innerHTML = htmlOpcoes(item);
    });
  }

  function aoResponder(e) {
    var alvo = e.target;
    if (!alvo || alvo.type !== 'radio') return;

    respostas[alvo.name] = alvo.value;

    // marca visual da opção escolhida, sem redesenhar o item inteiro
    var item = alvo.closest('.item-escala');
    if (item) {
      Array.prototype.forEach.call(item.querySelectorAll('.opcao-escala'), function (l) {
        l.classList.toggle('marcada', l.querySelector('input').checked);
      });
    }

    redesenharDependentes();
    atualizar();
  }

  // -------------------------------------------------------------- resultado

  function atualizar() {
    var soma = E.somar(escala, respostas);

    $('#pontos').textContent = soma.pontos;
    $('#maximo').textContent = '/ ' + soma.maximo;

    var faltam = soma.total - soma.respondidos;
    $('#progresso').textContent = soma.completa
      ? 'Todos os ' + soma.total + ' itens respondidos'
      : faltam + (faltam === 1 ? ' item ainda sem resposta' : ' itens ainda sem resposta');
    $('#progresso').className = 'progresso' + (soma.completa ? ' completa' : '');

    var resumo = escala.resumo ? escala.resumo(respostas) : [];
    $('#resumo').innerHTML = resumo.map(function (r) {
      return '<span class="parcial"><b>' + esc(r.valor) + '</b>' + esc(r.rotulo) + '</span>';
    }).join('');

    var frase = escala.interpretacao && soma.completa
      ? escala.interpretacao(soma.pontos) : '';
    $('#interpretacao').textContent = frase || '';
    $('#interpretacao').hidden = !frase;

    $('#btn-copiar').disabled = soma.respondidos === 0;
    $('#previa').textContent = montarTexto();
  }

  function montarTexto() {
    return escala.texto(respostas, { data: $('#data-escala').value || window.Laudos.hoje() });
  }

  // ---------------------------------------------------------------- copiar

  function copiar() {
    var texto = montarTexto();
    var aviso = $('#aviso');

    function deuCerto() {
      aviso.className = 'aviso ok';
      aviso.textContent = 'Copiado. Cole no prontuário com Ctrl+V.';
    }
    function deuErrado() {
      aviso.className = 'aviso falha';
      aviso.textContent = 'Não foi possível copiar sozinho — selecione o texto abaixo e copie à mão.';
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(deuCerto, semPermissao);
      return;
    }
    semPermissao();

    /* Sem permissão de área de transferência (http, navegador antigo), ainda dá
       para copiar por uma caixa de texto fora da tela. */
    function semPermissao() {
      var caixa = document.createElement('textarea');
      caixa.value = texto;
      caixa.setAttribute('readonly', '');
      caixa.style.cssText = 'position:fixed;top:-1000px;left:-1000px;';
      document.body.appendChild(caixa);
      caixa.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      caixa.remove();
      if (ok) deuCerto(); else deuErrado();
    }
  }

  function limpar() {
    respostas = {};
    desenhar();
    atualizar();
    $('#aviso').className = 'aviso';
    $('#aviso').textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ------------------------------------------------------------------ início

  $('#descricao').textContent = escala.descricao || '';
  $('#observacao').textContent = escala.observacao || '';
  $('#observacao').hidden = !escala.observacao;
  $('#referencia').textContent = escala.referencia || '';
  $('#referencia').hidden = !escala.referencia;

  /* Sem isto o campo de data aceitaria qualquer coisa: quem liga as máscaras é
     o Campos, e esta página não monta campos declarativos. */
  window.Campos.ligar(document, 'escala', []);

  $('#data-escala').value = window.Laudos.hoje();
  $('#data-escala').addEventListener('input', atualizar);
  $('#btn-copiar').addEventListener('click', copiar);
  $('#btn-limpar').addEventListener('click', limpar);

  desenhar();
  atualizar();
})();
