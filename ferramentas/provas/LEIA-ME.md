# Provas

Provas de mesa em Node puro, sem dependência nenhuma. Rode a partir da raiz do site:

```
node ferramentas/provas/prova.js             markdown desenhado no PDF
node ferramentas/provas/prova-impressao.js   agrupamento em meia folha
node ferramentas/provas/prova-editor.js      ida e volta do modo visual
node ferramentas/provas/prova-ordem.js       reordenação e mapa de folhas
```

As duas primeiras usam um **pdf-lib de mentira**: em vez de gerar arquivo,
registram o que teria sido desenhado — posição, corpo e variante da fonte. É o
suficiente para conferir quebra de linha, recuo e troca de fonte sem precisar
instalar nada nem abrir o navegador. `helv.json` traz as larguras das quatro
Helvetica, extraídas do reportlab, para as medidas baterem com as de verdade.

A terceira imita o mínimo de DOM que a serialização usa, inclusive as sujeiras
que os navegadores produzem sozinhos ao editar (`<b>`, `<span style>`, `<div>`
solta, `<br>` de enchimento).

A quarta imita `localStorage` e `sessionStorage` com dois objetos, o bastante
para exercitar a camada de armazenamento fora do navegador.

Todas saem com código diferente de zero quando falham, menos `prova.js`, que
imprime o desenho para leitura.
