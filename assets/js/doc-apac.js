/* APAC — Laudo para solicitação/autorização de procedimento ambulatorial, fls. 1/2. */

(function () {
  'use strict';

  var CX = {
    f1:  [32.5, 736.0, 454.4, 754.2],   // nome estab. solicitante
    f3:  [32.5, 695.1, 471.8, 713.1],   // nome do paciente
    f4:  [476.3, 695.1, 561.8, 713.1],  // nº prontuário
    f8:  [32.5, 648.0, 399.8, 666.0],   // nome da mãe
    f10: [32.5, 624.4, 561.8, 642.4],   // endereço
    f11: [32.5, 600.1, 354.8, 618.1],   // município
    f16: [215.9, 556.9, 494.9, 577.5],  // nome do procedimento principal
    f17: [499.4, 556.9, 553.4, 577.5],  // quantidade
    f33: [32.5, 361.8, 336.2, 384.3],   // descrição do diagnóstico
    f34: [336.2, 361.8, 398.1, 384.3],  // CID 10 principal
    f35: [398.1, 361.8, 467.5, 384.3],  // CID 10 secundário
    f36: [467.4, 361.8, 562.4, 384.3],  // CID 10 causas associadas (não preenchido)
    f37: [32.5, 265.6, 562.4, 357.3],   // observações
    f38: [32.6, 217.2, 298.0, 235.2]    // nome do profissional solicitante
  };

  var CEL = {
    f2:  { b: [460.0, 474.6, 489.24, 503.88, 518.52, 533.1, 547.74, 562.4], y: 736.0, dy: 3 },
    f5:  { b: [32.5, 49.98, 67.68, 85.38, 103.08, 120.84, 138.54, 156.24, 174.0,
               191.7, 209.4, 227.16, 244.86, 262.56, 280.26, 298.6], y: 671.6, dy: 3 },
    f9ddd: { b: [404.3, 420.1, 435.8], y: 648.0, dy: 3 },
    f9tel: { b: [435.8, 451.56, 467.34, 483.06, 498.84, 514.56, 530.34, 546.06, 561.8], y: 648.0, dy: 3 },
    f13: { b: [436.1, 452.94, 469.7], y: 600.1, dy: 3 },
    f14: { b: [469.7, 481.74, 492.96, 504.18, 515.34, 526.56, 538.56, 549.78, 561.8], y: 600.1, dy: 3 },
    f41: { b: [145.6, 161.34, 177.0, 192.72, 208.44, 224.16, 239.82, 255.54, 271.26,
               286.92, 302.64, 318.3, 334.02, 349.74, 365.46, 381.8], y: 193.6, dy: 3 }
  };

  var DATA = {
    f6:  { d: [322.2, 344.7], m: [349.2, 367.7], a: [372.2, 409.9], y: 671.6 },
    f39: { d: [301.4, 322.2], m: [326.7, 345.2], a: [349.7, 381.8], y: 217.2 }
  };

  var MARCA = {
    sexoM: [470.15, 676.5],   // caixa vazia depois de "Masc."
    sexoF: [533.9, 676.5],    // caixa vazia depois de "Fem."
    docCNS: [55.8, 198.4],    // entre os parênteses de "( ) CNS"
    docCPF: [107.5, 198.4]
  };

  window.Laudos.registrar({
    id: 'apac',
    titulo: 'APAC',
    descricao: 'Laudo para solicitação/autorização de procedimento ambulatorial, fls. 1/2.',
    modelo: 'assets/pdf/apac.pdf',

    campos: [
      { id: 'procedimento', rotulo: 'Nome do procedimento principal',
        tipo: 'texto', larg: 9, max: 80, obrigatorio: true },
      { id: 'quantidade', rotulo: 'Qtde.',
        tipo: 'texto', mascara: 'inteiro', larg: 3, valor: '1' },
      { id: 'diagnostico', rotulo: 'Descrição do diagnóstico',
        tipo: 'texto', larg: 8, max: 60, obrigatorio: true },
      { id: 'cidPrincipal', rotulo: 'CID 10 principal',
        tipo: 'texto', mascara: 'cid', larg: 2, exemplo: 'G35' },
      { id: 'cidSecundario', rotulo: 'CID 10 secundário',
        tipo: 'texto', mascara: 'cid', larg: 2 },
      { id: 'observacoes', rotulo: 'Observações',
        tipo: 'area', larg: 12, max: 1400, linhas: 7,
        dica: 'O campo do formulário comporta cerca de 7 linhas; textos longos são reduzidos automaticamente.' }
    ],

    preencher: function (p, d, api) {
      // estabelecimento solicitante (fixo)
      p.emCaixa(api.estabelecimento, CX.f1);
      p.emCelulas(api.cnes, CEL.f2);

      // identificação do paciente
      p.emCaixa(d.nome, CX.f3);
      p.emCaixa(d.prontuario, CX.f4);
      p.emCelulas(api.digitos(d.cns), CEL.f5);
      p.emData(d.nascimento, DATA.f6);
      if (d.sexo === '1') p.marcar(MARCA.sexoM);
      if (d.sexo === '3') p.marcar(MARCA.sexoF);
      p.emCaixa(d.mae, CX.f8);
      var tel = api.digitos(d.telefone);
      if (tel.length > 2) {
        p.emCelulas(tel.slice(0, 2), CEL.f9ddd);
        p.emCelulas(tel.slice(2), CEL.f9tel);
      }
      p.emCaixa(d.endereco, CX.f10);
      p.emCaixa(d.municipio, CX.f11);
      p.emCelulas(d.uf, CEL.f13);
      p.emCelulas(api.digitos(d.cep), CEL.f14);

      // procedimento solicitado
      p.emCaixa(d.procedimento, CX.f16);
      p.emCaixaCentro(d.quantidade, CX.f17);

      // justificativa
      p.emCaixa(d.diagnostico, CX.f33);
      p.emCaixaCentro(d.cidPrincipal, CX.f34);
      p.emCaixaCentro(d.cidSecundario, CX.f35);
      var cortou = p.multilinha(d.observacoes, CX.f37);

      // solicitação
      p.emCaixa(d.profissional, CX.f38);
      p.emData(d.dataSolicitacao, DATA.f39);
      p.marcar(d.tipoDoc === 'CPF' ? MARCA.docCPF : MARCA.docCNS);
      p.emCelulas(api.digitos(d.numeroDoc), CEL.f41);

      return cortou;
    }
  });
})();
