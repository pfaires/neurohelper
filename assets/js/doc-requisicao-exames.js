/* Requisição de exames — LAC-001, HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 paisagem, 595 x 420). */

(function () {
  'use strict';

  var C = {
    nome:       { x: 92.1, y: 334.0, w: 333.9 },
    prontuario: { x: 488.2, y: 334.0, w: 86.8 },
    idade:      { x: 47.2, y: 312.0, w: 58.8 },
    sexo:       { x: 139.5, y: 312.0, w: 61.5 },
    social:     { x: 248.2, y: 312.0, w: 177.8 },
    enfermaria: { x: 455.5, y: 312.0, w: 45.5 },
    leito:      { x: 533.6, y: 312.0, w: 41.4 },
    data:       { x: 44.1, y: 44.0, w: 181.9 }
  };

  var A = {
    dadosClinicos: [21, 254, 574, 289],
    justificativa: [21, 200, 574, 232],
    material:      [21, 172, 574, 181],
    exames:        [21, 88, 574, 153]
  };

  var URGENCIA = [76.3, 238.0];

  /* Os exames saem em colunas de até sete linhas, preenchidas da esquerda para
     a direita, para aproveitar a largura da folha em vez de uma lista comprida. */
  function emColunas(p, texto, area) {
    var linhas = String(texto || '').split('\n')
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
    if (!linhas.length) return false;

    var POR_COLUNA = 7;
    var colunas = Math.min(4, Math.ceil(linhas.length / POR_COLUNA));
    var porColuna = Math.ceil(linhas.length / colunas);

    var largura = (area[2] - area[0]) / colunas;
    var entre = Math.min(10.5, (area[3] - area[1]) / porColuna);
    var tam = Math.min(9.5, entre * 0.82);

    var cortou = false;
    for (var c = 0; c < colunas; c++) {
      for (var i = 0; i < porColuna; i++) {
        var indice = c * porColuna + i;
        if (indice >= linhas.length) break;
        var y = area[3] - tam * 0.85 - i * entre;
        if (y < area[1]) { cortou = true; break; }
        p.txtLim(linhas[indice], area[0] + c * largura, y, tam, largura - 8, false);
      }
    }
    return cortou;
  }

  window.Laudos.registrar({
    id: 'requisicao-exames',
    titulo: 'Requisição de exames',
    descricao: 'Requisição de exames laboratoriais e de imagem — LAC-001. Meia página (A5 paisagem).',
    modelo: 'assets/pdf/requisicao-exames.pdf',
    folha: 'a5-paisagem',
    tituloPadrao: function (d) {
      var primeira = String(d.exames || '').split('\n')[0].trim();
      return primeira || 'Requisição de exames';
    },

    campos: [
      { id: 'social', rotulo: 'Cartão social', tipo: 'texto', larg: 6, max: 30 },
      { id: 'enfermaria', rotulo: 'Enfermaria', tipo: 'texto', larg: 3, max: 12 },
      { id: 'leito', rotulo: 'Leito', tipo: 'texto', larg: 3, max: 10 },
      { id: 'dadosClinicos', rotulo: 'Dados clínicos', tipo: 'area', larg: 12,
        max: 600, linhas: 4, obrigatorio: true },
      { id: 'urgencia', rotulo: 'Marcar como urgência', tipo: 'caixa', larg: 4 },
      { id: 'justificativa', rotulo: 'Justificativa da urgência', tipo: 'area', larg: 8,
        max: 500, linhas: 3 },
      { id: 'material', rotulo: 'Material a examinar', tipo: 'texto', larg: 12, max: 90 },
      { id: 'exames', rotulo: 'Exames', tipo: 'area', larg: 12, max: 900, linhas: 5,
        markdown: false,   // cada linha vira um item de coluna, não texto corrido
        obrigatorio: true,
        dica: 'Um exame por linha. No PDF eles são distribuídos em colunas de até sete, da esquerda para a direita.' }
    ],

    preencher: function (p, d, api) {
      p.emPonto(d.nome, C.nome);
      p.emPonto(d.prontuario, C.prontuario);
      p.emPonto(api.idade(d.nascimento, d.dataSolicitacao), C.idade);
      p.emPonto(d.sexo === '1' ? 'Masculino' : (d.sexo === '3' ? 'Feminino' : ''), C.sexo);
      p.emPonto(d.social, C.social);
      p.emPonto(d.enfermaria, C.enfermaria);
      p.emPonto(d.leito, C.leito);
      p.emPonto(d.dataSolicitacao, C.data);

      var cortou = p.bloco(d.dadosClinicos, A.dadosClinicos, { negrito: false });
      if (d.urgencia) p.marcar(URGENCIA, 9);
      cortou = p.bloco(d.justificativa, A.justificativa, { negrito: false }) || cortou;
      p.emPonto(d.material, { x: A.material[0], y: A.material[1] + 1, w: A.material[2] - A.material[0] });
      cortou = emColunas(p, d.exames, A.exames) || cortou;

      return cortou;
    }
  });
})();
