/* Laudo para solicitação/autorização de mudança de procedimento e de
   procedimento(s) especial(ais) — Anexo II, folha 1/2. */

(function () {
  'use strict';

  var CX = {
    f1:  [54.0, 708.6, 448.4, 725.2],   // nome estab. solicitante
    f3:  [54.0, 687.0, 448.4, 703.6],   // nome estab. executante
    f5:  [54.0, 654.0, 467.4, 670.4],   // nome do paciente
    f6:  [471.7, 654.0, 552.1, 670.4],  // nº prontuário
    f10: [54.0, 610.8, 399.7, 627.3],   // nome da mãe
    f12: [54.0, 589.2, 552.1, 605.6],   // endereço
    f13: [54.0, 567.0, 357.4, 583.4],   // município
    f26: [54.0, 401.1, 374.2, 417.7],   // descrição do procedimento principal
    f38: [48.7, 190.4, 556.4, 289.3],   // justificativa
    f39: [54.0, 159.9, 469.6, 176.7]    // nome do profissional solicitante
  };

  var CEL = {
    f2:  { b: [455.8, 469.56, 483.36, 497.04, 510.84, 524.64, 538.44, 552.1], y: 708.6 },
    f4:  { b: [455.8, 469.56, 483.36, 497.04, 510.84, 524.64, 538.44, 552.1], y: 687.0 },
    f7:  { b: [54.0, 70.44, 87.12, 103.68, 120.36, 137.16, 153.72, 170.4, 187.08,
               203.76, 220.44, 237.12, 253.8, 270.48, 287.16, 304.4], y: 632.4 },
    f11ddd: { b: [404.0, 418.8, 433.6], y: 610.8 },
    f11tel: { b: [433.6, 448.44, 463.2, 478.08, 492.84, 507.72, 522.48, 537.36, 552.1], y: 610.8 },
    f15: { b: [433.8, 449.64, 465.5], y: 567.0 },
    f16: { b: [465.4, 476.76, 487.32, 497.88, 508.44, 519.0, 530.16, 540.84, 552.1], y: 567.0 },
    f42: { b: [124.4, 139.2, 153.96, 168.72, 183.48, 198.36, 213.0, 227.88, 242.64,
               257.4, 272.16, 286.92, 301.68, 316.56, 331.32, 346.8], y: 129.7 }
  };

  var DATA = {
    f8:  { d: [326.6, 347.8], m: [352.1, 369.5], a: [373.7, 409.2], y: 632.4 },
    f40: { d: [471.7, 494.6], m: [499.0, 516.5], a: [520.7, 552.1], y: 159.9 }
  };

  var MARCA = {
    sexoM: [463.45, 636.8],       // célula vazia ao lado do código 1
    sexoF: [524.05, 636.8],       // célula vazia ao lado do código 3
    docCNS: [63.0, 139.7],        // entre os parênteses de "( ) CNS"
    docCPF: [101.4, 139.7],
    secaoEspecial: [61.0, 429.3]  // caixa branca da barra "SOLICITAÇÃO DE PROCEDIMENTO(S) ESPECIAL(AIS)"
  };

  window.Laudos.registrar({
    id: 'mudanca-procedimento',
    titulo: 'Mudança de procedimento',
    descricao: 'Laudo para solicitação/autorização de mudança de procedimento e de procedimento(s) especial(ais) — Anexo II, folha 1/2.',
    modelo: 'assets/pdf/laudo-mudanca-procedimento.pdf',

    campos: [
      { id: 'procedimento', rotulo: 'Descrição do procedimento principal',
        tipo: 'texto', larg: 12, max: 80, obrigatorio: true },
      { id: 'justificativa', rotulo: 'Justificativa da solicitação',
        tipo: 'area', larg: 12, max: 1400, linhas: 7, obrigatorio: true,
        dica: 'O campo do formulário comporta cerca de 7 linhas; textos longos são reduzidos automaticamente.' }
    ],

    preencher: function (p, d, api) {
      // estabelecimento (fixo)
      p.emCaixa(api.estabelecimento, CX.f1);
      p.emCelulas(api.cnes, CEL.f2);
      p.emCaixa(api.estabelecimento, CX.f3);
      p.emCelulas(api.cnes, CEL.f4);

      // identificação do paciente
      p.emCaixa(d.nome, CX.f5);
      p.emCaixa(d.prontuario, CX.f6);
      p.emCelulas(api.digitos(d.cns), CEL.f7);
      p.emData(d.nascimento, DATA.f8);
      if (d.sexo === '1') p.marcar(MARCA.sexoM);
      if (d.sexo === '3') p.marcar(MARCA.sexoF);
      p.emCaixa(d.mae, CX.f10);
      var tel = api.digitos(d.telefone);
      if (tel.length > 2) {
        p.emCelulas(tel.slice(0, 2), CEL.f11ddd);
        p.emCelulas(tel.slice(2), CEL.f11tel);
      }
      p.emCaixa(d.endereco, CX.f12);
      p.emCaixa(d.municipio, CX.f13);
      p.emCelulas(d.uf, CEL.f15);
      p.emCelulas(api.digitos(d.cep), CEL.f16);

      // procedimento solicitado
      p.marcar(MARCA.secaoEspecial, 10.5);
      p.emCaixa(d.procedimento, CX.f26);
      var cortou = p.multilinha(d.justificativa, CX.f38);

      // profissional solicitante
      p.emCaixa(d.profissional, CX.f39);
      p.emData(d.dataSolicitacao, DATA.f40);
      p.marcar(d.tipoDoc === 'CPF' ? MARCA.docCPF : MARCA.docCNS);
      p.emCelulas(api.digitos(d.numeroDoc), CEL.f42);

      return cortou;
    }
  });
})();
