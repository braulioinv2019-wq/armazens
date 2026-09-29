# Validação local — LUELE WMS

Os testes usam apenas dados fictícios em memória. Não ligam ao Firebase.

```sh
node tests/stock-regression.cjs
curl -fsSL https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js -o /tmp/luele-xlsx.cjs
node tests/reporting-regression.mjs /tmp/luele-xlsx.cjs
```

A dependência testada deve corresponder ao URL e ao atributo `integrity` do HTML.
Para gerar amostras temporárias de Excel e HTML de impressão:

```sh
mkdir -p /tmp/luele-reports
WMS_PREVIEW_DIR=/tmp/luele-reports node tests/reporting-regression.mjs /tmp/luele-xlsx.cjs
```

Os exemplos incluem zeros, decimais, códigos com zeros iniciais, Emas no formato
antigo, unidades diferentes, contagens em branco, pesquisa, paginação do histórico,
falhas de rede e guias com 80 linhas e texto potencialmente interpretável como HTML.

`known-limitations.cjs` reproduz problemas anteriores ainda não resolvidos; não é uma
certificação de segurança nem uma condição de aprovação desta alteração.
