/* Armazenamento — HULW/UFPB

   Toda leitura e gravação do site passa por aqui. Hoje o miolo fala com o
   navegador; no dia em que houver servidor, basta trocar o corpo destas funções
   por chamadas de API — nenhuma outra parte do site precisa mudar.

   Onde cada coisa vive e por quê:

   localStorage    prescritores        cadastro da máquina, sobrevive a tudo
   sessionStorage  prescritor ativo    quem está usando o computador agora
   sessionStorage  atendimento         paciente e documentos, somem ao fechar a aba

   Dados de paciente nunca vão para o localStorage: em computador compartilhado,
   o que fica gravado em disco é só a lista de médicos. */

window.Dados = (function () {
  'use strict';

  var K_KITS = 'neurohelper.kits';
  var K_PRESCRITORES = 'neurohelper.prescritores';
  var K_ATIVO = 'neurohelper.prescritorAtivo';
  var K_ATENDIMENTO = 'neurohelper.atendimento';
  var K_ANTIGA = 'hulw.neuro.profissional';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function ler(deposito, chave, padrao) {
    try {
      var b = deposito.getItem(chave);
      return b ? JSON.parse(b) : padrao;
    } catch (e) { return padrao; }
  }

  function gravar(deposito, chave, valor) {
    try {
      if (valor === null || valor === undefined) deposito.removeItem(chave);
      else deposito.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------ prescritores

  function lerPrescritores() {
    var lista = ler(localStorage, K_PRESCRITORES, null);
    if (lista) return lista;

    // migração: quem já usou a versão anterior tinha um profissional só
    var antigo = ler(localStorage, K_ANTIGA, null);
    if (antigo && antigo.profissional) {
      lista = [{
        id: uid(),
        nome: antigo.profissional,
        titulo: '',
        crm: '',
        uf: 'PB',
        rqe: '',
        tipoDoc: antigo.tipoDoc || 'CNS',
        numeroDoc: antigo.numeroDoc || ''
      }];
      gravar(localStorage, K_PRESCRITORES, lista);
      try { localStorage.removeItem(K_ANTIGA); } catch (e) { /* ignora */ }
      return lista;
    }
    return [];
  }

  function gravarPrescritores(lista) {
    gravar(localStorage, K_PRESCRITORES, lista || []);
  }

  function salvarPrescritor(p) {
    var lista = lerPrescritores();
    if (!p.id) {
      p.id = uid();
      lista.push(p);
    } else {
      var i = indiceDe(lista, p.id);
      if (i < 0) lista.push(p); else lista[i] = p;
    }
    gravarPrescritores(lista);
    return p;
  }

  function excluirPrescritor(id) {
    var lista = lerPrescritores().filter(function (p) { return p.id !== id; });
    gravarPrescritores(lista);
    if (idAtivo() === id) definirAtivo(null);
  }

  function indiceDe(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return i;
    return -1;
  }

  function idAtivo() { return ler(sessionStorage, K_ATIVO, null); }

  function definirAtivo(id) { gravar(sessionStorage, K_ATIVO, id || null); }

  /* O ativo vale só para esta aba. Em computador compartilhado, isso evita
     emitir documento com o nome de quem usou a máquina antes. */
  function prescritorAtivo() {
    var id = idAtivo();
    if (!id) return null;
    var lista = lerPrescritores();
    var i = indiceDe(lista, id);
    return i < 0 ? null : lista[i];
  }

  // --------------------------------------------------------- kits do usuário

  /* Kits criados ou ajustados neste computador. Ficam no localStorage porque
     são configuração da máquina, como os prescritores — não têm dado de
     paciente. Ao publicar, viram assets/dados/kits.json no repositório. */

  function lerKitsLocais() { return ler(localStorage, K_KITS, []) || []; }

  function gravarKitsLocais(lista) { gravar(localStorage, K_KITS, lista || []); }

  function salvarKitLocal(kit) {
    var lista = lerKitsLocais();
    var i = indiceDe(lista, kit.id);
    if (i < 0) lista.push(kit); else lista[i] = kit;
    gravarKitsLocais(lista);
    return kit;
  }

  function excluirKitLocal(id) {
    gravarKitsLocais(lerKitsLocais().filter(function (k) { return k.id !== id; }));
  }

  // ------------------------------------------------------------- atendimento

  function lerAtendimento() { return ler(sessionStorage, K_ATENDIMENTO, null); }

  function gravarAtendimento(a) { gravar(sessionStorage, K_ATENDIMENTO, a); }

  function iniciarAtendimento(paciente) {
    var a = {
      id: uid(),
      criadoEm: new Date().toISOString(),
      paciente: paciente || {},
      documentos: []
    };
    gravarAtendimento(a);
    return a;
  }

  function atualizarPaciente(paciente) {
    var a = lerAtendimento();
    if (!a) return iniciarAtendimento(paciente);
    a.paciente = paciente;
    gravarAtendimento(a);
    return a;
  }

  function encerrarAtendimento() { gravar(sessionStorage, K_ATENDIMENTO, null); }

  // -------------------------------------------------------------- documentos

  function lerDocumento(id) {
    var a = lerAtendimento();
    if (!a) return null;
    var achou = a.documentos.filter(function (d) { return d.id === id; });
    return achou.length ? achou[0] : null;
  }

  /* Grava um documento novo ou atualiza o existente.
     `doc` = { id?, tipo, titulo, dados } */
  function salvarDocumento(doc) {
    var a = lerAtendimento();
    if (!a) return null;
    var agora = new Date().toISOString();
    if (!doc.id) {
      doc.id = uid();
      doc.criadoEm = agora;
      doc.gravadoEm = agora;
      a.documentos.push(doc);
    } else {
      var i = -1;
      for (var k = 0; k < a.documentos.length; k++) {
        if (a.documentos[k].id === doc.id) { i = k; break; }
      }
      doc.gravadoEm = agora;
      if (i < 0) { doc.criadoEm = agora; a.documentos.push(doc); }
      else { doc.criadoEm = a.documentos[i].criadoEm || agora; a.documentos[i] = doc; }
    }
    gravarAtendimento(a);
    return doc;
  }

  function excluirDocumento(id) {
    var a = lerAtendimento();
    if (!a) return;
    a.documentos = a.documentos.filter(function (d) { return d.id !== id; });
    gravarAtendimento(a);
  }

  // acrescenta vários de uma vez (usado pelos kits)
  function acrescentarDocumentos(docs) {
    var a = lerAtendimento();
    if (!a) return 0;
    var agora = new Date().toISOString();
    docs.forEach(function (d) {
      d.id = uid();
      d.criadoEm = agora;
      d.gravadoEm = agora;
      a.documentos.push(d);
    });
    gravarAtendimento(a);
    return docs.length;
  }

  return {
    uid: uid,
    lerPrescritores: lerPrescritores,
    salvarPrescritor: salvarPrescritor,
    excluirPrescritor: excluirPrescritor,
    prescritorAtivo: prescritorAtivo,
    idAtivo: idAtivo,
    definirAtivo: definirAtivo,
    lerKitsLocais: lerKitsLocais,
    gravarKitsLocais: gravarKitsLocais,
    salvarKitLocal: salvarKitLocal,
    excluirKitLocal: excluirKitLocal,
    lerAtendimento: lerAtendimento,
    iniciarAtendimento: iniciarAtendimento,
    atualizarPaciente: atualizarPaciente,
    encerrarAtendimento: encerrarAtendimento,
    lerDocumento: lerDocumento,
    salvarDocumento: salvarDocumento,
    excluirDocumento: excluirDocumento,
    acrescentarDocumentos: acrescentarDocumentos
  };
})();
