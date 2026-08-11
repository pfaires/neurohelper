/* Montagem dos PDFs para impressão — HULW/UFPB

   Cada documento declara o formato da sua folha. Os de meia página podem ser
   agrupados dois a dois numa A4, para economizar papel:

     a5-paisagem (595 x 420)  duas empilhadas numa A4 retrato   (595 x 842)
     a5-retrato  (420 x 595)  duas lado a lado numa A4 paisagem (842 x 595)

   O agrupamento respeita a ordem da tabela: cada documento entra na primeira
   folha aberta do seu formato, ou abre uma nova. Documentos de página inteira
   passam direto. Uma linha tracejada marca onde cortar. */

window.Impressao = (function () {
  'use strict';

  var L = window.Laudos;

  /* Uma folha A4 retrato dividida ao meio na horizontal serve às duas metades:
     a requisição (A5 paisagem) entra direto; o receituário (A5 retrato) entra
     girado 90° para a esquerda, e aí ocupa exatamente a mesma vaga. Assim o
     corte é sempre o mesmo e documentos de tipos diferentes dividem a folha. */
  var MEIA = {
    folha: [595, 842],
    vagas: [{ x: 0, y: 421, l: 595, a: 421 }, { x: 0, y: 0, l: 595, a: 421 }],
    corte: function (pg, rgb) {
      pg.drawLine({
        start: { x: 14, y: 421 }, end: { x: 581, y: 421 },
        thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [3, 3]
      });
    }
  };

  var FORMATOS_MEIOS = ['a5-paisagem', 'a5-retrato'];

  function meia(folha) { return FORMATOS_MEIOS.indexOf(folha) >= 0; }

  /* Preenche todos os documentos, em sequência para não disputar memória.

     O flush() no fim não é enfeite. As fontes que o pdf-lib "embarca" só entram
     de fato no arquivo quando o documento é liberado — até lá o dicionário de
     recursos da página aponta para objetos que ainda não existem. copyPages()
     libera a origem sozinho, mas embedPages() não: sem o flush, a página de
     meia folha era copiada com as referências penduradas e o leitor caía numa
     fonte padrão, apagando negrito e itálico. Daí o markdown sumir só ao
     agrupar. */
  function preencherTodos(itens) {
    var cortou = false;
    return itens.reduce(function (p, item) {
      return p.then(function (acc) {
        return L.preencher(item.documento, item.dados).then(function (r) {
          cortou = cortou || r.cortou;
          return Promise.resolve(r.doc.flush()).then(function () {
            acc.push({ documento: item.documento, doc: r.doc });
            return acc;
          });
        });
      });
    }, Promise.resolve([])).then(function (feitos) {
      return { feitos: feitos, cortou: cortou };
    });
  }

  /* Distribui os documentos em folhas, preservando a ordem da tabela.
     Qualquer documento de meia página cabe na próxima vaga livre, mesmo que o
     vizinho seja de outro tipo. */
  function planejar(feitos, agrupar) {
    var folhas = [];
    var aberta = null;

    feitos.forEach(function (f) {
      var forma = f.documento.folha || 'a4-retrato';

      if (!agrupar || !meia(forma)) {
        folhas.push({ tipo: 'inteira', itens: [f] });
        return;
      }
      if (aberta && aberta.itens.length < MEIA.vagas.length) {
        aberta.itens.push(f);
        if (aberta.itens.length === MEIA.vagas.length) aberta = null;
        return;
      }
      aberta = { tipo: 'meia', itens: [f] };
      folhas.push(aberta);
    });

    return folhas;
  }

  function montar(folhas, titulo) {
    var PDFDocument = window.PDFLib.PDFDocument;
    var rgb = window.PDFLib.rgb;
    var degrees = window.PDFLib.degrees;

    return PDFDocument.create().then(function (final) {
      var passo = folhas.reduce(function (p, folha) {
        return p.then(function () {

          if (folha.tipo === 'inteira') {
            var origem = folha.itens[0].doc;
            return final.copyPages(origem, origem.getPageIndices()).then(function (pgs) {
              pgs.forEach(function (pg) { final.addPage(pg); });
            });
          }

          var pg = final.addPage(MEIA.folha.slice());
          MEIA.corte(pg, rgb);

          /* Cada documento é um PDF próprio, e embedPages() exige que todas as
             páginas do lote venham do mesmo arquivo. Por isso vão uma a uma. */
          return folha.itens.reduce(function (q, item, i) {
            return q.then(function () {
              return final.embedPage(item.doc.getPages()[0]).then(function (emb) {
                var vaga = MEIA.vagas[i];
                var girar = item.documento.folha === 'a5-retrato';

                // largura e altura que a página ocupa depois de posicionada
                var ocupaL = girar ? emb.height : emb.width;
                var ocupaA = girar ? emb.width : emb.height;
                var bx = vaga.x + (vaga.l - ocupaL) / 2;
                var by = vaga.y + (vaga.a - ocupaA) / 2;

                if (girar) {
                  /* Girando 90° no sentido anti-horário, o ponto (u,v) da página
                     vai para (x − v, y + u). Ancorando em x = bx + altura, o
                     conteúdo cai exatamente dentro da vaga. */
                  pg.drawPage(emb, {
                    x: bx + emb.height, y: by,
                    width: emb.width, height: emb.height,
                    rotate: degrees(90)
                  });
                } else {
                  pg.drawPage(emb, {
                    x: bx, y: by, width: emb.width, height: emb.height
                  });
                }
              });
            });
          }, Promise.resolve());
        });
      }, Promise.resolve());

      return passo.then(function () {
        final.setTitle(titulo);
        final.setProducer('HULW/UFPB — Residência em Neurologia');
        final.setCreator('HULW/UFPB — Residência em Neurologia');
        return final.save();
      });
    });
  }

  function apelidoDe(nome) {
    return L.semAcento(nome).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  }

  /* Gera um PDF único com todos os itens.
     itens: [{ documento, dados }]   opcoes: { agrupar, nomePaciente, arquivo } */
  function gerar(itens, opcoes) {
    opcoes = opcoes || {};
    return preencherTodos(itens).then(function (r) {
      var folhas = planejar(r.feitos, opcoes.agrupar !== false);
      var nome = opcoes.nomePaciente || '';
      var titulo = (itens.length === 1 ? itens[0].documento.titulo : 'Documentos') +
        (nome ? ' — ' + L.limpar(nome) : '');
      return montar(folhas, titulo).then(function (bytes) {
        var apelido = apelidoDe(nome);
        var base = opcoes.arquivo ||
          (itens.length === 1 ? itens[0].documento.id : 'documentos');
        return {
          bytes: bytes,
          nome: base + (apelido ? '-' + apelido : '') + '.pdf',
          folhas: folhas.length,
          cortou: r.cortou
        };
      });
    });
  }

  /* Quantas folhas de papel sairiam, para mostrar antes de imprimir. */
  function contarFolhas(documentos, agrupar) {
    var falsos = documentos.map(function (d) { return { documento: d }; });
    return planejar(falsos, agrupar !== false).length;
  }

  /* Junta paciente, prescritor ativo e campos próprios num objeto só,
     que é o que os módulos de documento esperam receber. */
  function dadosDe(docSalvo, atendimento, prescritor) {
    var d = {};
    var pac = (atendimento && atendimento.paciente) || {};
    Object.keys(pac).forEach(function (k) { d[k] = pac[k]; });

    prescritor = prescritor || {};
    d.profissional = prescritor.nome || '';
    d.tituloProfissional = prescritor.titulo || '';
    d.crm = prescritor.crm || '';
    d.crmUf = prescritor.uf || '';       // não confundir com a UF do paciente
    d.rqe = prescritor.rqe || '';
    d.tipoDoc = prescritor.tipoDoc || 'CNS';
    d.numeroDoc = prescritor.numeroDoc || '';
    d.dataSolicitacao = prescritor.dataSolicitacao || L.hoje();

    // documento marcado como "sem data" sai com o campo em branco
    if (docSalvo && docSalvo.semData) d.dataSolicitacao = '';

    var proprios = (docSalvo && docSalvo.dados) || {};
    Object.keys(proprios).forEach(function (k) { d[k] = proprios[k]; });
    return d;
  }

  /* Monta os itens de uma lista de documentos gravados. */
  function itensDe(documentos, atendimento, prescritor) {
    return documentos.map(function (s) {
      var mod = L.documentos.filter(function (m) { return m.id === s.tipo; })[0];
      return { documento: mod, dados: dadosDe(s, atendimento, prescritor), salvo: s };
    }).filter(function (i) { return !!i.documento; });
  }

  return {
    gerar: gerar,
    contarFolhas: contarFolhas,
    meia: meia,
    dadosDe: dadosDe,
    itensDe: itensDe
  };
})();
