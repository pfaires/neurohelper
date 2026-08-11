# Provas

Provas de mesa em Node puro, sem dependência nenhuma. Rode a partir da raiz do site:

```
node ferramentas/provas/prova.js             markdown desenhado no PDF
node ferramentas/provas/prova-impressao.js   agrupamento em meia folha
node ferramentas/provas/prova-editor.js      ida e volta do modo visual
```

As duas primeiras usam um **pdf-lib de mentira**: em vez de gerar arquivo,
registram o que teria sido desenhado — posição, corpo e variante da fonte. É o
suficiente para conferir quebra de linha, recuo e troca de fonte sem precisar
instalar nada nem abrir o navegador. `helv.json` traz as larguras das quatro
Helvetica, extraídas do reportlab, para as medidas baterem com as de verdade.

A terceira imita o mínimo de DOM que a serialização usa, inclusive as sujeiras
que os navegadores produzem sozinhos ao editar (`<b>`, `<span style>`, `<div>`
solta, `<br>` de enchimento).

`prova-impressao.js` e `prova-editor.js` saem com código diferente de zero
quando falham; `prova.js` imprime o desenho para leitura.
