/* LME — Laudo de solicitação, avaliação e autorização de medicamento(s).
   Componente Especializado da Assistência Farmacêutica. A4 retrato.

   Dois modelos oficiais circulam, e quem emite escolhe:

     simplificado  caixas retangulares comuns, sem grades de caractere, e com
                   nome social. Geometria vetorial coerente: as coordenadas
                   abaixo saem direto da extração (x0/y0/x1/y1, origem no canto
                   inferior esquerdo).
     oficial       o completo, com cabeçalho do SUS. Coordenadas em
                   assets/js/coord-lme-oficial.js — veja preencherOficial(). */

(function () {
  'use strict';

  /* Caixas com o rótulo na faixa de cima: o valor é escrito no espaço de baixo. */
  var CX = {
    f1:  [14.4, 708.3, 169.9, 723.5],   // número do CNES
    f2:  [170.4, 708.3, 581.0, 723.5],  // nome do estabelecimento
    f31: [14.4, 679.5, 453.5, 694.5],   // nome civil do paciente
    f5:  [453.9, 679.5, 581.0, 694.5],  // peso
    f32: [14.4, 650.6, 453.5, 665.8],   // nome social do paciente
    f6:  [453.9, 650.6, 581.0, 665.8],  // altura
    f4:  [14.4, 621.8, 581.0, 637.0],   // nome da mãe
    f9:  [14.4, 431.6, 104.8, 446.5],   // CID-10
    f10: [105.3, 431.6, 581.0, 446.5],  // diagnóstico
    f14: [14.4, 201.3, 410.9, 216.8],   // nome do médico solicitante
    f15: [14.4, 172.5, 290.4, 188.0],   // CNS do médico
    f16: [290.9, 172.5, 410.9, 188.0],  // data da solicitação
    f22: [14.4, 22.9, 347.1, 35.5]      // correio eletrônico
  };

  var AREA = {
    f11: [20.0, 372.0, 575.0, 417.0]    // anamnese
  };

  /* Escrita solta, sobre as linhas pontilhadas do formulário.

     As coordenadas vêm da extração, que informa o rodapé da caixa da fonte, e
     não a linha de base — ela fica 0,207 × corpo acima. Os valores abaixo já
     trazem essa correção, para o texto sentar na mesma linha do rótulo. */
  var PONTO = {
    f12relato:  { x: 132.0, y: 340.7, w: 440.0 },
    f13resp:    { x: 318.0, y: 255.5, w: 252.0 },
    f18outro:   { x: 130.0, y: 131.8, w: 194.0 },
    f18cpf:     { x: 359.0, y: 131.8, w: 185.0 },
    f19etnia:   { x: 244.0, y: 100.6, w: 96.0 },
    f20ddd1:    { x: 360.0, y: 99.2, w: 22.0 },
    f20tel1:    { x: 392.0, y: 99.2, w: 180.0 },
    f20ddd2:    { x: 360.0, y: 82.5, w: 22.0 },
    f20tel2:    { x: 392.0, y: 82.5, w: 180.0 },
    f21doc:     { x: 106.0, y: 54.5, w: 234.0 }
  };

  /* Centro do glifo □ e linha de base do X que entra nele. O quadrado ocupa
     9,96 pt a partir do rodapé medido; o X de 9 pt fica centrado 1,75 pt acima. */
  var MARCA = {
    f12nao: [24.6, 341.65],  f12sim: [67.6, 341.65],
    f13nao: [24.6, 255.7],   f13sim: [67.6, 255.7],
    f18paciente: [203.1, 150.45], f18mae: [259.4, 150.45],
    f18responsavel: [349.7, 150.45], f18medico: [493.3, 150.45],
    f18outro: [24.6, 131.75],
    f19branca: [24.6, 100.55], f19amarela: [74.5, 100.55], f19indigena: [130.4, 100.55],
    f19preta: [24.6, 83.85], f19parda: [75.1, 83.85],
    f21cpf: [24.6, 54.45], f21cns: [74.4, 54.45]
  };

  var TABELA = {
    nome: [46.3, 382.5],
    meses: [383.1, 415.6, 448.8, 481.8, 514.9, 547.9, 581.0],
    linhas: [
      [568.1, 588.1], [547.9, 567.7], [527.5, 547.3],
      [507.1, 527.0], [486.8, 506.6], [466.4, 486.3]
    ]
  };

  var MESES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  var LISTA = 'assets/dados/medicamentos-lme.json';

  // ------------------------------------------------------- modelo oficial

  /* O outro LME em circulação: o modelo completo, com o cabeçalho do SUS e as
     caixas arredondadas. A geometria de desenho dele é imprestável — matrizes
     aninhadas que não fecham —, mas a versão eletrônica publicada pelo
     Ministério traz campos de formulário com os retângulos exatos, e é de lá
     que vêm as coordenadas em assets/js/coord-lme-oficial.js.

     Preenchemos por cima do PDF achatado, com o mesmo pincel dos outros
     documentos: nada de formulário editável na mão de quem recebe. */

  function oficial() { return window.CoordLmeOficial || null; }

  /* Linha de base para o texto sentar no meio do retângulo do campo. */
  function baseNa(cx, tam) {
    return cx[1] + (cx[3] - cx[1] - tam * 0.717) / 2 + 0.5;
  }

  function escreverEm(p, texto, cx, tam) {
    if (!cx || !texto) return;
    p.txtLim(texto, cx[0] + 3, baseNa(cx, tam), tam, cx[2] - cx[0] - 6, true);
  }

  function centrarEm(p, texto, cx, tam) {
    if (!cx || !texto) return;
    p.txtC(texto, (cx[0] + cx[2]) / 2, baseNa(cx, tam), tam, true, cx[2] - cx[0] - 4);
  }

  /* X centrado no quadradinho, medido pelo próprio retângulo. */
  function marcarEm(p, cx, tam) {
    if (!cx) return;
    p.marcar([(cx[0] + cx[2]) / 2, baseNa(cx, tam)], tam);
  }

  function preencherOficial(p, d, api) {
    var C = oficial();
    if (!C) throw new Error('As coordenadas do modelo oficial não foram carregadas.');
    var c = C.campos;

    escreverEm(p, api.cnes, c.cnes, 9.5);
    escreverEm(p, api.estabelecimento, c.estabelecimento, 8.5);

    escreverEm(p, d.nome, c.nome, 9.5);
    escreverEm(p, d.mae, c.mae, 9.5);
    centrarEm(p, api.digitos(d.peso), c.peso, 9.5);
    centrarEm(p, api.digitos(d.altura), c.altura, 9.5);

    (d.medicamentos || []).slice(0, C.medicamentos.length).forEach(function (item, i) {
      var linha = C.medicamentos[i];
      escreverEm(p, item.nome, linha.nome, 8);
      MESES.forEach(function (mes, k) {
        centrarEm(p, String(item[mes] || '').trim(), linha.meses[k], 9);
      });
    });

    centrarEm(p, String(d.cid || '').toUpperCase(), c.cid, 9.5);
    escreverEm(p, d.diagnostico, c.diagnostico, 9);

    var cortou = p.bloco(d.anamnese, [c.anamnese[0] + 3, c.anamnese[1] + 3,
                                      c.anamnese[2] - 3, c.anamnese[3] - 3],
                         { negrito: false, tam: 9 });

    marcarEm(p, C.marcacoes.tratamentoPrevio[d.tratamentoPrevio === 'sim' ? 'sim' : 'nao'], 8.5);
    escreverEm(p, d.tratamentoRelato, c.tratamentoRelato, 9);

    marcarEm(p, C.marcacoes.incapaz[d.incapaz === 'sim' ? 'sim' : 'nao'], 8.5);
    escreverEm(p, d.responsavel, c.responsavel, 9);

    escreverEm(p, d.profissional, c.profissional, 9.5);
    escreverEm(p, d.numeroDoc, c.documentoMedico, 9.5);
    centrarEm(p, d.dataSolicitacao, c.data, 9.5);

    marcarEm(p, C.marcacoes.preenchidoPor[d.preenchidoPor], 8.5);
    marcarEm(p, C.marcacoes.raca[d.raca], 8.5);
    if (d.raca === 'indigena') escreverEm(p, d.etnia, c.etnia, 9);

    var tel = api.digitos(d.telefone);
    if (tel.length > 2) escreverEm(p, window.Laudos.mascaras.telefone(tel), c.telefone1, 9.5);

    var cpf = api.digitos(d.cpf);
    if (cpf.length === 11) {
      marcarEm(p, C.marcacoes.tipoDocPaciente.cpf, 8.5);
      escreverEm(p, window.Laudos.mascaras.cpf(cpf), c.documentoPaciente, 9.5);
    } else if (api.digitos(d.cns).length === 15) {
      marcarEm(p, C.marcacoes.tipoDocPaciente.cns, 8.5);
      escreverEm(p, d.cns, c.documentoPaciente, 9.5);
    }

    escreverEm(p, d.email, c.email, 9);
    return cortou;
  }

  function colunaMes(i) {
    return { id: MESES[i], rotulo: (i + 1) + 'º mês', mascara: 'numero', max: 4,
             modo: 'numeric', largura: '52px' };
  }

  window.Laudos.registrar({
    id: 'lme',
    titulo: 'LME — solicitação de medicamentos',
    descricao: 'Laudo de solicitação, avaliação e autorização de medicamento(s) do Componente Especializado da Assistência Farmacêutica. Dois modelos à escolha. Página A4.',
    modelo: function (d) {
      return d.modelo === 'oficial' ? 'assets/pdf/lme-oficial.pdf' : 'assets/pdf/lme.pdf';
    },
    folha: 'a4-retrato',
    tituloPadrao: function (d) {
      var m = (d.medicamentos || [])[0];
      return (m && m.nome) || 'LME';
    },

    campos: [
      { id: 'modelo', rotulo: 'Modelo do formulário', tipo: 'radio', larg: 6,
        opcoes: [{ valor: 'simplificado', texto: 'Simplificado', padrao: true },
                 { valor: 'oficial', texto: 'Oficial completo' }],
        dica: 'Os dois circulam. O simplificado é mais limpo e tem nome social; ' +
              'o oficial é o do cabeçalho do SUS, que algumas farmácias exigem.' },

      { id: 'medicamentos', rotulo: 'Medicamentos e quantidade por mês',
        tipo: 'linhas', larg: 12, max: 6, obrigatorio: true,
        rotuloAcrescentar: 'Acrescentar medicamento',
        dica: 'Escolha na lista do Componente Especializado ou digite livremente. Até seis medicamentos por laudo.',
        erro: 'Informe pelo menos um medicamento.',
        colunas: [
          { id: 'nome', rotulo: 'Medicamento', tipo: 'lista', listaUrl: LISTA },
          colunaMes(0), colunaMes(1), colunaMes(2),
          colunaMes(3), colunaMes(4), colunaMes(5)
        ] },

      { id: 'nomeSocial', rotulo: 'Nome social <span class="opcional">(opcional)</span>',
        tipo: 'texto', larg: 6, max: 70,
        dica: 'Só existe no modelo simplificado — o oficial não tem esse campo.' },
      { id: 'peso', rotulo: 'Peso (kg)', tipo: 'texto', mascara: 'numero', max: 3,
        modo: 'numeric', larg: 2 },
      { id: 'altura', rotulo: 'Altura (cm)', tipo: 'texto', mascara: 'numero', max: 3,
        modo: 'numeric', larg: 2 },
      { id: 'cid', rotulo: 'CID-10', tipo: 'texto', mascara: 'cid', max: 6,
        larg: 2, exemplo: 'G12.2', obrigatorio: true },
      { id: 'diagnostico', rotulo: 'Diagnóstico', tipo: 'texto', larg: 12, max: 90 },

      { id: 'anamnese', rotulo: 'Anamnese', tipo: 'area', larg: 12, max: 1200,
        linhas: 5, obrigatorio: true,
        dica: 'O campo do formulário comporta cerca de quatro linhas.' },

      { id: 'tratamentoPrevio', rotulo: 'Tratamento prévio ou em curso', tipo: 'radio',
        larg: 4, opcoes: [{ valor: 'nao', texto: 'Não', padrao: true },
                          { valor: 'sim', texto: 'Sim' }] },
      { id: 'tratamentoRelato', rotulo: 'Se sim, relatar', tipo: 'texto', larg: 8, max: 90 },

      { id: 'incapaz', rotulo: 'Paciente considerado incapaz', tipo: 'radio', larg: 4,
        opcoes: [{ valor: 'nao', texto: 'Não', padrao: true },
                 { valor: 'sim', texto: 'Sim' }] },
      { id: 'responsavel', rotulo: 'Se sim, nome do responsável', tipo: 'texto',
        larg: 8, max: 60 },

      { id: 'raca', rotulo: 'Raça / cor / etnia informada pelo paciente', tipo: 'radio',
        larg: 8, opcoes: [
          { valor: 'branca', texto: 'Branca' }, { valor: 'preta', texto: 'Preta' },
          { valor: 'parda', texto: 'Parda' }, { valor: 'amarela', texto: 'Amarela' },
          { valor: 'indigena', texto: 'Indígena' }] },
      { id: 'etnia', rotulo: 'Etnia, se indígena', tipo: 'texto', larg: 4, max: 30 },

      { id: 'preenchidoPor', rotulo: 'Campos do paciente preenchidos por', tipo: 'radio',
        larg: 8, opcoes: [
          { valor: 'paciente', texto: 'Paciente', padrao: true },
          { valor: 'mae', texto: 'Mãe' }, { valor: 'responsavel', texto: 'Responsável' },
          { valor: 'medico', texto: 'Médico' }] },
      { id: 'email', rotulo: 'Correio eletrônico do paciente', tipo: 'texto',
        larg: 4, max: 60 }
    ],

    preencher: function (p, d, api) {
      if (d.modelo === 'oficial') return preencherOficial(p, d, api);

      // estabelecimento (fixo)
      p.emCaixa(api.cnes, CX.f1);
      p.emCaixa(api.estabelecimento, CX.f2, 9);

      // paciente
      p.emCaixa(d.nome, CX.f31, 9.5);
      p.emCaixa(d.nomeSocial, CX.f32, 9.5);
      p.emCaixa(d.mae, CX.f4, 9.5);
      p.emCaixa(api.digitos(d.peso), CX.f5);
      p.emCaixa(api.digitos(d.altura), CX.f6);

      // medicamentos e quantidades
      (d.medicamentos || []).slice(0, TABELA.linhas.length).forEach(function (item, i) {
        var faixa = TABELA.linhas[i];
        p.emCaixa(item.nome, [TABELA.nome[0], faixa[0], TABELA.nome[1], faixa[1]], 8.5);
        MESES.forEach(function (mes, k) {
          var q = String(item[mes] || '').trim();
          if (!q) return;
          p.emCaixaCentro(q, [TABELA.meses[k], faixa[0], TABELA.meses[k + 1], faixa[1]], 9.5);
        });
      });

      // diagnóstico e anamnese
      p.emCaixa(String(d.cid || '').toUpperCase(), CX.f9);
      p.emCaixa(d.diagnostico, CX.f10, 9.5);
      var cortou = p.bloco(d.anamnese, AREA.f11, { negrito: false, tam: 9.5 });

      // tratamento prévio
      p.marcar(d.tratamentoPrevio === 'sim' ? MARCA.f12sim : MARCA.f12nao, 9);
      p.emPonto(d.tratamentoRelato, PONTO.f12relato, { tam: 9, negrito: false });

      // atestado de capacidade
      p.marcar(d.incapaz === 'sim' ? MARCA.f13sim : MARCA.f13nao, 9);
      p.emPonto(d.responsavel, PONTO.f13resp, { tam: 9 });

      // médico solicitante
      p.emCaixa(d.profissional, CX.f14, 9.5);
      p.emCaixa(d.numeroDoc, CX.f15);
      p.emCaixa(d.dataSolicitacao, CX.f16);

      // quem preencheu os campos do paciente
      var quem = { paciente: MARCA.f18paciente, mae: MARCA.f18mae,
                   responsavel: MARCA.f18responsavel, medico: MARCA.f18medico };
      if (quem[d.preenchidoPor]) p.marcar(quem[d.preenchidoPor], 9);

      // raça / cor / etnia
      var raca = { branca: MARCA.f19branca, preta: MARCA.f19preta, parda: MARCA.f19parda,
                   amarela: MARCA.f19amarela, indigena: MARCA.f19indigena };
      if (raca[d.raca]) p.marcar(raca[d.raca], 9);
      if (d.raca === 'indigena') p.emPonto(d.etnia, PONTO.f19etnia, { tam: 8.5 });

      // telefone do paciente: DDD dentro dos parênteses, número ao lado
      var tel = api.digitos(d.telefone);
      if (tel.length > 2) {
        p.emPonto(tel.slice(0, 2), PONTO.f20ddd1, { tam: 9 });
        p.emPonto(window.Laudos.mascaras.telefone(tel).replace(/^\(\d{2}\)\s*/, ''),
                  PONTO.f20tel1, { tam: 9 });
      }

      // documento do paciente: CPF quando houver, senão CNS
      var cpf = api.digitos(d.cpf);
      if (cpf.length === 11) {
        p.marcar(MARCA.f21cpf, 9);
        p.emPonto(window.Laudos.mascaras.cpf(cpf), PONTO.f21doc, { tam: 9 });
      } else if (api.digitos(d.cns).length === 15) {
        p.marcar(MARCA.f21cns, 9);
        p.emPonto(d.cns, PONTO.f21doc, { tam: 9 });
      }

      p.emCaixa(d.email, CX.f22, 9);

      return cortou;
    }
  });
})();
