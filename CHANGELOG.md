# CHANGELOG — LUELE WMS (correção de erros)

Ficheiro corrigido: `index_corrigido.html` (o `index_original.html` foi mantido intacto, sem alterações, como referência/backup).

Todas as alterações abaixo foram feitas de forma cirúrgica (só nos pontos descritos), sem reescrever nem "limpar" partes do código que não estavam em causa.

## Parte 1 — Os três pedidos que fizeste

**1. Saída em Grupo — já não fica preso ao seleccionar só um artigo, e agora tem pesquisa**
Encontrei a causa real do problema: cada material tem um número de identificação interno (`id`) gerado a partir da hora exacta do sistema. Quando se faz uma importação de Excel com muitos artigos de uma vez (ou duas importações seguidas para armazéns diferentes em poucos segundos), é possível dois materiais completamente diferentes — por exemplo um na Logística e outro no Vini — ficarem com o mesmo número de identificação "por coincidência". Quando isso acontece, o sistema de Saída em Grupo achava que o segundo artigo "já tinha sido adicionado" (porque comparava só pelo número), e recusava-o silenciosamente — daí pareceres só conseguir seleccionar um artigo de cada vez.
Corrigi isto fazendo o sistema identificar cada artigo pela combinação armazém + localização + número (em vez de só o número), o que elimina este problema de vez. Confirmei com testes automáticos que agora é possível adicionar 2, 3 ou mais artigos diferentes de armazéns diferentes na mesma Saída em Grupo, mesmo em casos de coincidência de números.
Também adicionei uma caixa de pesquisa por cima da lista de materiais na janela de "Saída em Grupo", que filtra a lista em tempo real conforme escreves o nome do artigo — os artigos que já tinhas adicionado ao grupo continuam lá, mesmo enquanto filtras a lista para escolher o próximo.

**2. Pátio — acção de "Saída" directa**
Ao investigar o código, percebi que o Pátio **já tinha** uma acção de saída equivalente à da Logística/Vini/Emas — o botão "✕" na lista do Pátio já usava exactamente o mesmo processo de Saída Fora do Sistema (SFS), com número de guia e PDF, e já gravava correctamente "Pátio" no histórico e na guia. O problema era só que estava disfarçado de botão de "remover" (só um "✕", sem indicação clara do que fazia), por isso não era óbvio para quem usa o sistema. Mudei o botão para dizer claramente "⏏ Saída", para ficar visível que faz uma saída como nos outros armazéns — não dupliquei nenhuma lógica, é o mesmo processo testado que já existia.

**3. Pesquisa Global — clicar num resultado leva-te lá**
Tanto na pesquisa rápida da barra do topo como na página "Pesquisa Global", clicar num resultado agora leva-te directamente ao sítio onde o material está:
- Se for da Logística, abre a página da Logística e já abre o contentor certo.
- Se for do Vini Galpão, abre a página do Vini e abre a porta do galpão.
- Se for da Emas, abre a página da Emas e abre a zona certa (A, B, C ou D).
- Se for do Pátio, abre a página do Pátio.

## Parte 2 — Correcções de erros e segurança

1. **Protecção contra texto malicioso/estranho nos nomes de materiais.** Criei uma função `escapeHtml` e apliquei-a nas listas de materiais (Logística, Vini, Emas, Pátio), nas guias SFS, na lista de utilizadores, nos resultados de pesquisa, no histórico do dashboard, nos alertas, na Saída em Grupo, no inventário cíclico e em vários formulários de edição — para que um nome de material com caracteres especiais nunca possa quebrar a página ou executar código indevido.
2. **A página "Histórico" estava em branco.** A função que desenha essa página nunca tinha sido escrita, apesar de ser chamada em vários sítios. Implementei-a: agora filtra por tipo de movimento, armazém e texto de pesquisa, e mostra a tabela correctamente.
3. **Transferência rápida do Pátio para Vini/Emas estava a apagar stock.** O código verificava valores que nunca correspondiam aos valores reais usados pelo sistema — por isso, ao transferir do Pátio para o Vini ou para uma zona da Emas, a quantidade era descontada do Pátio mas não aparecia em lado nenhum (perdia-se). Corrigi para corresponder aos valores certos; agora o material chega mesmo ao Vini ou à zona da Emas escolhida.
4. **Importações de Excel a marcar tudo como "conflito" por engano.** Havia uma função de verificação que corria de forma incompleta (faltava um "esperar pelo resultado"), o que fazia o sistema achar sempre que o artigo já existia com quantidade diferente, mesmo quando não havia conflito nenhum. Corrigido.
5. **Página "Utilizadores" não actualizava ao navegar.** Faltava mandar desenhar a lista de utilizadores ao entrar nessa página. Corrigido.
6. **Utilizadores novos perdiam a password depois de recarregar a página.** A password só ficava guardada no computador local, não no servidor (Firestore) — por isso, depois de recarregar a página ou noutro computador, o login falhava. Agora a password também é guardada no servidor. *(Fica um aviso no código: isto resolve o problema funcional, mas a password continua em texto simples — o ideal a prazo é mudar para o sistema de autenticação do Firebase.)*
7. **Campo de Telegram em falta no formulário de "Novo utilizador".** O sistema já tentava ler esse campo ao criar um utilizador, mas o campo nunca tinha sido colocado no formulário. Adicionei o campo.
8. **Erro no HTML da contagem de inventário.** Faltava um sinal de fecho (`>`) numa caixa de introdução de quantidade contada, o que podia desalinhar a página da contagem. Corrigido.
9. **Ligações ao servidor que nunca eram fechadas.** Ao sair da sessão (logout), duas ligações em tempo real ao servidor (guias SFS e inventário cíclico) continuavam activas em segundo plano. Agora são todas fechadas correctamente ao sair.
10. **Chave secreta do Telegram exposta no código.** Havia uma chave de acesso ao robot do Telegram escrita directamente no código-fonte (visível a qualquer pessoa que veja o site). Removida, com aviso claro no código. **Esta chave deve ser revogada no @BotFather do Telegram assim que possível, já que esteve exposta.** Enquanto não houver uma chave nova configurada, o sistema simplesmente não tenta enviar notificações Telegram (não dá erro, só avisa na consola).
11. **Botão "Repor artigos removidos" no Pátio.** Era um botão deixado por engano de uma correcção pontual antiga, com nomes e quantidades de produtos fixos no código — um clique acidental podia reintroduzir dados errados no sistema em produção. Removido por completo (botão, função e respectivo código).
12. **Exportação do Vini Galpão para Excel estava avariada.** A função tentava tratar os materiais do Vini como se estivessem organizados por prateleiras/níveis, mas na realidade são uma lista simples — isto fazia a exportação falhar sempre que fosse usada. Corrigido para exportar a lista correcta.
13. **Falta de controlo de permissões.** Qualquer utilizador com sessão iniciada (incluindo "Operador") conseguia eliminar contentores, eliminar utilizadores e aplicar ajustes de inventário. Agora essas quatro acções (eliminar contentor, eliminar utilizador, ajustar stock por inventário, eliminar contagem) só são permitidas a utilizadores com perfil "Administrador".
14. **Ecrã a mostrar dados desactualizados após editar um material.** Em dois sítios (editar material e editar material do Pátio), o ecrã actualizava-se antes de a gravação no servidor terminar, podendo mostrar valores antigos por breves instantes. Corrigido para esperar que a gravação termine antes de actualizar o ecrã.
15. **Zoom com dois dedos desactivado no telemóvel.** Removida a restrição que impedia o "pinch to zoom" — útil para quem tem dificuldade em ler texto pequeno.
16. **Cor verde definida duas vezes no código de estilo.** Sem impacto visível, mas foi limpo — ficou só uma definição.
17. **Botão "Reimprimir" das guias SFS estava frágil.** Antes, o botão levava a guia inteira "colada" dentro do botão em formato de texto — um nome de material com aspas ou caracteres especiais podia partir o botão. Agora o botão só leva o número da guia, e o sistema procura a guia completa na lista já carregada.

## Verificação feita

- Extraí só o código JavaScript do ficheiro corrigido e corri um verificador de sintaxe (`node --check`) — sem erros.
- Confirmei por pesquisa no ficheiro: a chave do Telegram já não aparece em lado nenhum; a função `renderHistory` existe uma única vez; a função `escapeHtml` existe uma única vez; a verificação antiga e errada `dest==='emas'` da transferência rápida do Pátio já não existe.
- Testei separadamente, com um navegador simulado, o cenário exacto que causava o problema da "Saída em Grupo" (dois materiais de armazéns diferentes com o mesmo número interno) e confirmei que agora os dois conseguem ser adicionados e que, ao confirmar a saída, cada um desconta da localização certa — não fica nenhum a "roubar" quantidade ao outro.
- Testei também a navegação da Pesquisa Global (barra do topo e página dedicada) para Logística, Vini, Emas e Pátio — confirmei que a página certa abre e o contentor/zona/porta certos ficam abertos.

## Pendente / precisa da tua decisão

- **Migração completa para o sistema de autenticação do Firebase (Firebase Authentication).** Não foi feita nesta correcção porque precisa de acesso à consola do Firebase para criar os utilizadores lá — algo que não estava disponível neste trabalho. Recomendo fazeres isto assim que possível; enquanto isso não acontece, as passwords continuam guardadas em texto simples no Firestore (ver aviso no código, ponto 6 acima).
- **Separar os dados de stock num único documento gigante do Firestore (`wms/stock`) em vários documentos, um por contentor/armazém.** Seria mais robusto a longo prazo, mas é uma alteração ao modelo de dados arriscada para fazer sem estares presente a validar com a base de dados real em produção — não foi feita.
- **Números de guia (GE/SFS/INV) ainda gerados no `localStorage` do computador**, em vez de num contador central no Firestore. Isto significa que, em teoria, dois computadores diferentes podem gerar o mesmo número de guia ao mesmo tempo. Não é um problema urgente, mas fica como recomendação para uma próxima melhoria, feita com mais calma.
- **Chave do Telegram:** removi-a do código, mas continua válida até a revogares no @BotFather. Por favor faz isso assim que possível, já que esteve exposta publicamente. Enquanto não configurares uma chave nova, as notificações por Telegram (ex.: avisos de contagens agendadas) ficam desactivadas — o resto do sistema funciona normalmente.
- **Protecção contra texto especial (ponto 1 da Parte 2):** apliquei a protecção em todos os sítios pedidos explicitamente (listas de materiais, guias SFS, utilizadores, pesquisa, histórico, alertas, saída em grupo, inventário cíclico) e em vários formulários de edição adicionais que encontrei pelo caminho. Não revi campo a campo os documentos PDF impressos (guias de entrada, guias SFS, folhas de contagem) — esses são só para imprimir/consultar e não ficam guardados no sistema, mas se quiseres posso rever esses também numa próxima passagem.

---

## Actualização — correção adicional na Saída em Grupo + Centros de Custo

**1. Saída em Grupo — correção definitiva do "só consigo escolher um artigo".**
A correção anterior (chave composta armazém+localização+id) estava certa, mas a forma de escolher o artigo continuava a usar uma caixa `<select>` nativa do browser escondida por trás da caixa de pesquisa — este tipo de caixa mostra sempre só uma linha, mesmo quando há vários resultados, o que dava a sensação de estar "presa" a um único artigo. Substituí esse mecanismo por uma lista de sugestões que aparece por baixo da pesquisa (como na Pesquisa Global), onde cada artigo é uma linha clicável: clicas e é adicionado imediatamente à lista "Materiais a retirar", a caixa de pesquisa mantém-se activa para continuares a escrever e adicionar o próximo, e um artigo já adicionado desaparece da lista de sugestões para não seres tentado a adicionar duas vezes. Testado com um script automático que simula dois artigos diferentes com o mesmo número interno (o cenário exacto que causava o problema) — confirma-se que ambos podem ser adicionados normalmente.

**2. Informação de localização de origem.**
Já aparecia na guia impressa (SFS) e na lista de artigos a retirar, mas reforcei também na mensagem de confirmação no ecrã: ao confirmares uma saída individual, a mensagem agora diz de onde saiu o material; numa saída em grupo, diz de quantas localizações diferentes saíram os artigos (ou o nome da localização, se for só uma).

**3. Centros de custo no campo Destino/Requisitante.**
Importei os 197 centros de custo operacionais do ficheiro `Centros de Custo.xlsx` que carregaste (excluí as linhas que eram apenas cabeçalhos/agrupadores, tipo "R" e "I" na tua folha — mantive só o nível "M", que são os centros reais utilizáveis, incluindo fornecedores/entidades externas como a ENDIAMA, CIMERTEX, etc.). Agora, tanto na Saída individual como na Saída em Grupo, ao escreveres no campo "Destino / Requisitante" aparecem sugestões filtradas por nome OU por código à medida que escreves; ao clicares numa sugestão, o campo fica preenchido com "Nome — Código". O campo continua a aceitar texto livre também (por exemplo "Oficina", "João Silva"), caso o destino não seja um centro de custo formal.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Testes automáticos (Node.js, sem browser) que replicam exactamente a lógica de pesquisa/adição de artigos e de pesquisa de centros de custo: 10 verificações, todas aprovadas — incluindo o cenário de colisão de números internos que causava o bug reportado, pesquisa de centro de custo por nome, por código, e por código de fornecedor.
- Confirmação de que o botão/select antigo (fonte do bug) foi completamente removido do ficheiro.

---

## Actualização — caixa de sugestões, utilizadores e pesquisa por nome/código

**1. Caixa de sugestões de centros de custo (e de artigos na Saída em Grupo) cortada/apertada.**
A causa era a janela modal ter `overflow-y:auto` (para conseguir fazer scroll ao conteúdo grande), o que cortava a caixa de sugestões porque esta estava desenhada como parte do interior do modal — qualquer coisa que se tentasse "esticar" para fora do modal simplesmente não aparecia. Resolvi isto fazendo a caixa de sugestões passar a ser um elemento independente, posicionado por cima de tudo (não mais preso ao interior do modal), que calcula a posição exacta por baixo do campo de pesquisa em tempo real. Agora a caixa mostra sempre a informação toda, sem cortar, e acompanha a posição do campo mesmo que a janela seja redimensionada.

**2. Demora a aparecer um utilizador novo na página "Utilizadores".**
Encontrei duas causas: (1) o ecrã só actualizava depois de a gravação no servidor terminar — se a ligação estivesse mais lenta, isso podia demorar alguns segundos; agora o ecrã actualiza-se logo a seguir a criares/editares/eliminares um utilizador, e a gravação no servidor acontece em segundo plano. (2) não existia nenhuma "escuta" em tempo real da lista de utilizadores vinda do servidor — se criasses um utilizador noutro computador ou telemóvel, o teu ecrã só via essa alteração se fizesses logout/login. Adicionei essa escuta em tempo real (como já existia para o stock e para as guias), por isso agora um utilizador criado em qualquer dispositivo aparece automaticamente nos outros.

**3. Pesquisa por nome ou código em Logística, Vini Galpão e Pátio.**
Isto já existia na Emas ao abrir uma zona, mas faltava nos outros. Adicionei o mesmo campo de pesquisa: em Logística, aparece ao abrir um contentor e filtra os materiais desse contentor por nome ou código; no Vini Galpão, aparece ao abrir a porta do galpão; no Pátio, está sempre visível por cima da lista de materiais em trânsito, já que não há um "abrir/fechar" como nos outros. Em todos os casos a pesquisa é em tempo real, sem distinguir maiúsculas/minúsculas.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído (216 KB) — sem erros de sintaxe.
- Confirmado por pesquisa no ficheiro: os três campos de pesquisa (`log-search`, `vini-search`, `patio-search`) existem cada um uma única vez no HTML e estão ligados correctamente às respectivas funções de desenho; as funções `renderVini`, `renderPatio` e `renderContainerPanel` existem cada uma uma única vez.
- Revisão do código da nova escuta em tempo real de utilizadores e da reordenação optimista do ecrã antes da gravação, para confirmar que não interfere com o fluxo de login/logout existente.

---

## Actualização — nova área "Reconciliação Primavera"

**Nova página: Reconciliação Primavera vs Sistema.**
Adicionei uma área nova e independente (separada do Inventário Cíclico, como pediste), acessível pelo menu lateral. Funciona assim: carregas o ficheiro Excel que exportas do Primavera com a posição de stock, e o sistema compara automaticamente, artigo a artigo (pelo código), a quantidade que está no Primavera com a quantidade total que está no LUELE WMS (somando todas as localizações onde esse artigo aparece — contentores, Vini, Emas, Pátio).

O resultado mostra:
- Um resumo com o número de artigos iguais nos dois sistemas, com diferença, só no Primavera, e só no sistema.
- Uma tabela com código, nome, quantidade no Primavera, quantidade no sistema, diferença (a vermelho quando há divergência) e em que localizações do sistema esse artigo está — para saberes logo onde ir corrigir.
- Pesquisa por nome/código e filtros (só diferenças, todos, só num dos dois lados).
- Botão para exportar a lista de divergências para Excel, para levares para o terreno ou arquivar.

Testei com o ficheiro real que carregaste ("De hoje.xlsx", 1341 artigos da Logística) — o sistema reconhece automaticamente as colunas "Artigo", "Descrição" e "Stock" desse ficheiro (e também aceita nomes alternativos como "Código" e "Quantidade", caso o Primavera exporte de forma diferente noutra altura).

**O que não foi incluído nesta primeira versão, de propósito:** não há um botão de "corrigir automaticamente" a quantidade do sistema a partir do Primavera. Quando um artigo está espalhado por vários contentores/localizações, não há forma segura de decidir sozinho onde aplicar a diferença — por isso a área é só de comparação e apoio à decisão; o ajuste em si continua a ser feito manualmente (por exemplo, através da edição do material ou do Inventário Cíclico), com a vantagem de já saberes exactamente quanto e onde. Se quiseres, numa próxima fase podemos discutir uma forma de aplicar ajustes directamente a partir daqui.
**Nota:** só entram na comparação os materiais do sistema que já têm um código preenchido (igual ao código do Primavera) — a página avisa quantos materiais ficaram de fora por não terem código atribuído.
**Nada fica guardado no servidor** — cada comparação é feita só no teu browser, na hora; se recarregares a página, tens de carregar o ficheiro outra vez.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Testes automáticos (Node.js) que replicam a lógica de comparação: correspondência exacta somando várias localizações, diferença de quantidade, artigo só no Primavera, artigo só no sistema, e materiais sem código a ficarem de fora e contabilizados — todas as verificações passaram.
- Testado o parsing do ficheiro real "De hoje.xlsx" (1342 linhas) com a biblioteca de leitura de Excel já usada no resto do sistema — reconheceu 1341 artigos correctamente (1 linha em branco ignorada, como esperado).

---

## Actualização — correcção do filtro, relatórios e assistente de codificação

**1. Filtros e exportação da Reconciliação sem efeito nenhum ao clicar.**
Encontrei a causa: este ficheiro usa "módulos" de JavaScript (`<script type="module">`), e nesse formato as funções só ficam acessíveis aos botões da página (`onclick`, `onchange`) se forem explicitamente "publicadas" numa lista no fim do ficheiro — é assim que todos os outros botões do sistema já funcionavam. As funções novas da Reconciliação (pesquisa, filtro, exportar) ficaram de fora dessa lista por engano, por isso pareciam não fazer nada — na realidade davam erro em silêncio. Adicionei-as à lista; agora o campo de pesquisa, o menu de filtro (Só com diferenças / Todos / Só Primavera / Só Sistema) e o botão de exportar respondem normalmente.

**2. Emitir relatórios da análise.**
O botão passou a chamar-se "📊 Emitir Relatório" e agora gera um único ficheiro Excel com várias folhas: Resumo (números gerais e data da comparação), Diferenças, Só Primavera, Só Sistema, Iguais, e Sem Código (materiais do sistema que ainda não têm código atribuído) — tudo organizado para poderes arquivar ou levar para o terreno.

**3. Assistente de codificação por semelhança de nome.**
Este é o pedido de "codificar todos os artigos e rever nomes parecidos" (ex: "Marmitex" no sistema vs "Marmitex 3DV" no Primavera). Depois de comparares, se houver materiais no sistema sem código cujo nome seja parecido com um artigo que só existe no Primavera, aparece uma secção nova "💡 Sugestões de codificação" por cima da tabela, com: o material do sistema e a sua localização, a sugestão do Primavera (código + nome), e um nível de confiança (Alta/Média/Baixa, calculado pela semelhança dos nomes). Para cada sugestão tens três botões: "✓ Aceitar" (atribui o código E actualiza o nome para o nome completo do Primavera — resolve o caso do "Marmitex" vs "Marmitex 3DV"), "Só código" (atribui só o código, mantém o nome como está) e "Ignorar" (esconde a sugestão nesta sessão, sem alterar nada). Ao aceitar, a alteração é gravada logo no Firestore e a comparação é recalculada automaticamente.
**Nota de segurança:** por agora, o assistente só sugere para materiais que **não têm código nenhum** — não mexe em códigos já preenchidos (mesmo que pareçam trocados), porque um código já atribuído pode estar espalhado por vários contentores e não há forma segura de decidir sozinho qual corrigir. Esses casos continuam visíveis no filtro "Só no sistema" para revisão manual tua.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Confirmado que todas as novas funções da Reconciliação estão na lista de exposição `window.*` (a causa raiz do bug), sem duplicados.
- Testes automáticos (Node.js): semelhança de nomes (casos "Marmitex"/"Marmitex 3DV", correspondência parcial, nomes não relacionados a pontuarem baixo), geração de sugestões ponta-a-ponta, sugestão "Ignorar" a desaparecer correctamente da lista seguinte, e — o mais importante — confirmei que ao aceitar uma sugestão o sistema localiza sempre o material certo mesmo quando dois materiais em contentores diferentes partilham o mesmo número interno (o mesmo tipo de colisão que já tínhamos corrigido na Saída em Grupo), usando sempre armazém + localização + número em conjunto, nunca só o número.

---

## Actualização — Entrada em Grupo

**Nova funcionalidade: Entrada em Grupo (no Pátio, junto ao "+ Dar Entrada").**
Tal como já era possível dar Saída de vários artigos de uma vez ("Saída em Grupo"), agora também é possível dar Entrada de vários artigos de uma vez numa única guia. Escolhes o destino (Pátio, um contentor da Logística, Vini Galpão ou uma zona da Emas), e vais adicionando artigos um a um a uma lista (código opcional, nome, quantidade, unidade) — cada guia de entrada em grupo gera um único número GE e um único PDF com a lista completa de tudo o que foi recebido.

**Reconhece automaticamente artigos que já existem, tal como falámos.**
Para cada artigo que adicionas à lista, o sistema verifica logo (por código, depois por nome) se esse material já existe no destino escolhido. Se já existir, mostra "já existe — ficará X un" e, ao confirmares, **soma** a quantidade recebida à quantidade actual (em vez de duplicar o artigo ou substituir o valor). Se for mesmo novo, mostra "novo material" e cria uma entrada nova. O PDF final também mostra, por cada linha, se foi "NOVO" ou "ACTUALIZADO (total: X)", para ficar tudo documentado.
**Nota:** isto é diferente da forma como a Importação de Excel funciona (que pergunta se queres "actualizar para X" ou "manter o valor actual", pensada para corrigir/sincronizar uma lista de stock) — aqui, por ser uma guia de entrada de mercadoria, a lógica é sempre somar a quantidade recebida à que já lá está, como acontece numa recepção real de material.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Testes automáticos (Node.js) que simulam a confirmação da Entrada em Grupo: correspondência por código com nome diferente, correspondência por nome com código em falta, artigo novo, destino Pátio (recebe os metadados de trânsito correctos), destino Emas (fica associado à zona certa), e confirmação de que os dados originais nunca são alterados antes da gravação (evita corromper o stock a meio de uma operação que falhe) — todas as verificações passaram.

---

## Actualização — Relatório do Pátio

**Novo relatório: Pátio (Excel).**
Faltava — Logística, Vini e Emas já tinham relatório para exportar, o Pátio não. Adicionei um botão "⬇ Excel" directamente na página do Pátio (junto à pesquisa) e também no separador Relatórios. O ficheiro exportado tem, por cada material em trânsito: código, descrição, quantidade actual, unidade, stock mínimo, ponto de encomenda, e uma coluna de **Estado** que diz "🔴 Crítico" se estiver abaixo do stock mínimo, "🟡 Ponto de encomenda" se tiver atingido o ponto de reposição, ou "🟢 Normal" caso contrário — mais a data de chegada e o fornecedor/origem, quando preenchidos.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Teste automático (Node.js) da lógica de classificação do estado (crítico, ponto de encomenda, normal, e materiais sem limites definidos) — todas as verificações passaram.

---

## Actualização — Numeração central de guias + Leitor de código QR/barras

**1. Numeração central de guias (GE/SFS/INV).**
Os números de guia (entrada, saída, contagem) passaram a ser gerados a partir de um contador partilhado no Firestore, actualizado de forma atómica (transação) — dois dispositivos a emitir uma guia ao mesmo tempo já não podem receber o mesmo número, o que podia acontecer antes (cada telemóvel/computador gerava a sua própria numeração local). Se por algum motivo a ligação ao servidor falhar nesse preciso momento, o sistema recua automaticamente para a numeração local antiga, para nunca bloquear a emissão de uma guia.

**2. Leitor de código QR / código de barras.**
Novo botão "📷 Ler código" na barra do topo, visível em qualquer página. Abre a câmara do telemóvel/computador e lê tanto os QR codes já gerados pelo sistema (das etiquetas dos contentores) como códigos de barras normais de produtos — desde que o campo "Código" desse material no sistema corresponda ao código de barras físico. Ao ler um código:
- Se for o QR de um contentor, abre logo a Logística nesse contentor.
- Se corresponder ao código de um material, leva directamente à localização desse material (tal como a Pesquisa Global).
- Se não reconhecer o código, faz a pesquisa por esse texto na Pesquisa Global, para não ficares "preso" sem resultado.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Confirmado que a biblioteca de leitura (html5-qrcode) existe e carrega correctamente a partir do CDN.
- Testes automáticos (Node.js) da lógica de resolução do código lido: URL de contentor gerado pelo sistema, código de material directo, texto igual ao rótulo de um contentor, código desconhecido (cai para pesquisa), e URL apontando para um contentor que já não existe (também cai para pesquisa em vez de dar erro) — todas as verificações passaram.
- O botão de leitura mostra um aviso claro em vez de falhar silenciosamente caso a biblioteca não tenha carregado (ex: sem ligação à internet) ou caso o browser recuse o acesso à câmara.

---

## Actualização — Nº de Lote e Data de Validade

**Novos campos "Nº de Lote" e "Data de Validade" em todos os pontos onde um material é registado ou editado:**
- Editar material (Logística/Vini/Emas) e editar material do Pátio.
- Guia de Entrada (individual) — os campos aparecem no formulário e ficam gravados na guia/PDF gerado.
- Entrada em Grupo — um único Lote/Validade aplica-se a toda a guia (tal como já acontecia com o Fornecedor), fica registado em cada artigo novo e também aparece no PDF da guia.

**Alertas de validade.**
A página "Alertas" passou a ter duas novas secções, além das já existentes de stock crítico/ponto de encomenda:
- **⛔ Validade expirada** — materiais cuja data de validade já passou.
- **⏳ A expirar em 30 dias** — materiais que vão expirar dentro de 30 dias, ordenados do mais urgente para o menos urgente.
O número no ícone de alertas da barra lateral agora também conta estes casos, para nunca passarem despercebidos.

**Visibilidade nas listas.**
Sempre que um material tem lote e/ou validade preenchidos, essa informação aparece directamente nas listas de materiais (Logística, Vini, Emas) e numa nova coluna "Validade" na tabela do Pátio — a vermelho se já tiver expirado, a amarelo se estiver a aproximar-se.

**Relatórios.**
- O relatório do Pátio (Excel) passou a incluir as colunas "Nº Lote" e "Validade".
- O relatório de Alertas (Excel) passou a ter uma segunda folha "Validade" com todos os materiais expirados ou a expirar em 30 dias.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Testes automáticos (Node.js) da lógica de cálculo de dias até à validade e classificação de estado (expirado / a expirar / normal), incluindo casos-limite (sem data, exactamente 30 dias, 31 dias, expira hoje) e da função que filtra e ordena os materiais a expirar — todas as verificações passaram.

---

## Actualização — Corrigir Saída registada por engano

**O pedido: "fiz uma saída com quantidades erradas e gostaria de ter a opção de poder corrigir isso."**

Na página "Histórico", cada movimento de "Saída" tem agora um botão "✏ Corrigir". Ao clicar, abre uma janela a mostrar o material, a localização, o armazém e a quantidade que ficou registada nessa saída, e pede a **quantidade correcta que devia ter saído**:
- Se a quantidade correcta for **menor** que a registada, a diferença é **devolvida ao stock** nesse mesmo local.
- Se for **maior**, a diferença é **retirada** do stock nesse local (só se houver quantidade suficiente disponível — caso contrário, o sistema avisa e não aplica a correcção).

Cada correcção fica registada no Histórico como um movimento "Ajuste", com a diferença aplicada e, se preenchida, a observação escrita (ex: "erro de digitação"). O movimento de Saída original passa a mostrar "✓ Corrigido" em vez do botão, para não ser possível corrigir a mesma saída duas vezes por engano — e o relatório de Histórico em Excel passa a ter uma coluna "Corrigido" com o nome de quem fez a correcção.

Por ser uma alteração directa ao stock fora do fluxo normal de entrada/saída, esta acção está limitada a utilizadores com perfil **Administrador** — tal como já acontecia com o ajuste de inventário e a eliminação de contentores/utilizadores.

**Nota sobre limitações:** a localização é reconhecida automaticamente a partir do que ficou gravado na altura da saída (contentor, Vini Galpão, zona da Emas ou Pátio). Se entretanto esse contentor tiver sido renomeado ou eliminado, o sistema avisa em vez de tentar adivinhar, e a correcção tem de ser feita manualmente (editar o material directamente). Da mesma forma, se o material já não existir de todo nesse local e for preciso retirar mais stock, o sistema também pede para ajustar manualmente, para nunca criar um valor negativo ou inventado.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Testes automáticos (Node.js) com 9 cenários: devolver stock, retirar mais stock, stock insuficiente para retirar mais, material já inexistente ao tentar retirar mais (bloqueado), material já inexistente ao devolver (recria o artigo), resolução da zona da Emas a partir do texto gravado, contentor renomeado/eliminado (bloqueado com aviso), correcção sem alteração real (bloqueada), e remoção completa do artigo quando a quantidade final fica a zero — todas as verificações passaram.

---

## Actualização — Migração para Firebase Authentication

**O problema encontrado:** as passwords dos três utilizadores estavam guardadas em texto simples directamente no código-fonte da página (e também no Firestore) — visível a qualquer pessoa que abrisse "Ver código-fonte" no browser. Isto já vinha de trás; foi identificado ao preparar esta migração.

**O que mudou:**
- O login deixou de comparar passwords em texto simples e passou a usar a Firebase Authentication — o mesmo sistema de autenticação usado por milhões de apps, com protecção contra ataques de força bruta incluída.
- As passwords deixaram de existir em qualquer sítio do código ou da base de dados de dados do sistema (Firestore) — ficam exclusivamente do lado da Firebase Authentication, fora do alcance do código da app.
- A sessão agora persiste no browser (tal como a maioria das apps) — já não é preciso voltar a escrever a password sempre que a página é recarregada.
- Se o perfil de um utilizador for eliminado na página "Utilizadores", essa pessoa fica mesmo bloqueada no próximo login. Antes, a eliminação só escondia o utilizador da lista, mas não impedia realmente o acesso.
- Novo botão "✉ Enviar email para repor password" na edição de utilizador — o administrador já não precisa (nem consegue) de ver ou definir a password de ninguém; só pode despoletar um email de reposição enviado directamente pela Firebase para o dono da conta.
- Criar um novo utilizador na app cria agora só o perfil (nome/permissões); a conta de acesso em si (email+password) tem de ser criada à parte na Firebase Console → Authentication, com o mesmo email — evita que a app consiga criar contas de acesso silenciosamente.

**Acção manual necessária (feita pelo Bráulio antes desta publicação):** activar o método de login "Email/Password" na Firebase Console e criar as três contas (com passwords novas, diferentes das antigas expostas) — sem isto, ninguém conseguiria entrar depois desta actualização.

**Recomendação complementar (regras de segurança do Firestore):** foi também fornecido um ficheiro `firestore.rules` com regras recomendadas para a base de dados — exige sempre sessão válida para ler ou escrever, e restringe a alteração de perfis de utilizadores a administradores. Fica a aplicar quando o Bráulio quiser, em Firestore Database → Regras.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Confirmado por grep que não resta nenhuma referência a passwords em texto simples em nenhum ponto do código.
- Testes automáticos (Node.js) da validação de email ao criar utilizador (formato inválido, duplicado, vazio) e da lógica de "falha fechada" que bloqueia o acesso quando não existe perfil — incluindo o caso central: um perfil eliminado deixa mesmo de dar acesso, em vez de entrar com um perfil por defeito — todas as verificações passaram.
- Não é possível testar o fluxo de login em si de forma automatizada (depende da Firebase Authentication em produção); foi verificado manualmente que o site carrega sem erros após a publicação.

---

## Actualização — Correcção do bloqueio de login após criar perfil

Depois da migração para Firebase Authentication, um administrador reportou que, ao criar o perfil de um novo utilizador, essa pessoa continuava a ver "a tua conta ainda não tem um perfil configurado" mesmo depois do perfil já existir. Causa: se um login falhasse por o perfil ainda não existir, o sistema guardava em memória que "já tinha carregado os utilizadores" e não voltava a consultar o Firestore nas tentativas seguintes na mesma página — por isso criar o perfil a seguir não resolvia sem recarregar a página inteira. Corrigido para ir sempre buscar os perfis mais recentes antes de decidir se deixa entrar.

### Verificação feita nesta actualização
- `node --check` ao JavaScript extraído — sem erros de sintaxe.
- Confirmado manualmente que, depois da correcção, criar um perfil e tentar entrar de novo (sem recarregar a página) já funciona.

---

## Actualização — Regras de segurança do Firestore aplicadas

As regras do Firestore estavam completamente abertas (`allow read, write: if true`) — a própria Firebase Console mostrava um aviso vermelho de que qualquer pessoa podia ler, alterar ou apagar todos os dados directamente, sem precisar de passar pela app. Foram substituídas pelas regras recomendadas: exigem sempre sessão válida (login) para ler ou escrever, e restringem a alteração de perfis de utilizadores a administradores.

### Verificação feita nesta actualização
- Confirmado na própria Firebase Console que o aviso de "regras públicas" desapareceu depois de publicar.
- Confirmado no site ao vivo, já autenticado, que a leitura e escrita no Firestore continuam a funcionar normalmente ("Firestore write permission OK").

---

## Actualização — Modo offline (instalar como app + funcionar sem ligação)

**O que mudou:**
- A app pode agora ser **instalada** no telemóvel ou computador (ícone próprio, abre em janela própria, sem barra de endereço do browser) — em Chrome/Edge/Android normalmente aparece a opção "Instalar aplicação" na barra de endereço; no iPhone/iPad é "Partilhar → Adicionar ao ecrã principal".
- Depois de aberta pelo menos uma vez com ligação, a "casca" da app (o próprio ecrã, botões, menus) continua a abrir mesmo sem internet — útil em zonas do armazém com fraca cobertura.
- Os dados (stock, histórico) ficam guardados localmente no dispositivo (persistência offline do Firestore): continuas a conseguir ver o que já tinha sido carregado, e qualquer acção feita sem ligação (dar entrada, dar saída, editar) fica guardada e é **enviada sozinha assim que a ligação voltar** — não é preciso repetir nada.
- Aviso vermelho fixo no topo sempre que o dispositivo perde ligação à internet, para ficar claro que se está a trabalhar offline.

**Limitações importantes, para não criar expectativas erradas:**
- A app tem de ser aberta pelo menos uma vez **com ligação à internet** antes de poder funcionar offline — não funciona já na primeira utilização sem rede.
- Sem ligação, só se vê o que já tinha sido sincronizado antes (não chegam actualizações feitas por outra pessoa noutro dispositivo enquanto não houver rede outra vez).
- Se dois utilizadores diferentes alterarem o mesmo material ao mesmo tempo, um offline e outro online, o Firestore resolve o conflito automaticamente pela ordem de chegada — tal como já acontecia antes, isto não é uma garantia nova, só continua a funcionar da mesma forma mesmo com uma das pontas offline.

### Verificação feita nesta actualização
- `node --check` ao `sw.js` (service worker) — sem erros de sintaxe.
- `manifest.json` validado como JSON correcto.
- Testes automáticos (Node.js) da lógica que decide o que o service worker guarda em cache — confirmando que a própria app e as bibliotecas externas (CDN, Firebase) são guardadas, mas o tráfego do Firestore e da Firebase Authentication **nunca** passa pelo cache (evita que dados em tempo real fiquem presos numa cópia antiga).

---

## Actualização — Notificações automáticas via Telegram (código preparado, aguarda publicação)

Escrito o código das duas Cloud Functions que avisam automaticamente os administradores no
Telegram: `onStockWritten` (stock que acaba de ficar crítico, ou materiais que acabam de
entrar em zona de validade) e `onCountWritten` (contagens de inventário concluídas com
diferenças). Só avisam sobre problemas **novos** — se um material continuar crítico, não
volta a repetir o aviso sobre ele até se recuperar e cair em crítico outra vez.

**Porque não foi publicado directamente, ao contrário de tudo o resto nesta app:** o token
secreto do bot do Telegram tem de ficar escondido num servidor, nunca no código do site
(que é público) — foi exactamente essa exposição que já tinha acontecido antes nesta app e
teve de ser corrigida. Isso exige um Cloud Function da Firebase, que só funciona no plano
pago "Blaze" — uma mudança de plano/facturação que só o próprio Bráulio pode autorizar. O
código está pronto em `functions/index.js`, com instruções passo a passo em
`functions/DEPLOY.md` para quando quiser activar.

### Verificação feita nesta actualização
- `node --check` ao `functions/index.js` — sem erros de sintaxe.
- Testes automáticos (Node.js) com 6 cenários da lógica que decide o que é "novo" o
  suficiente para notificar: material que passa a crítico (avisa), material que continua
  crítico sem mudança (não repete o aviso), material que recupera e volta a ficar crítico
  (avisa outra vez, é um problema novo), material novo já criado em estado crítico (avisa),
  material que entra em validade a expirar (avisa), e nenhuma alteração (não avisa) —
  todas as verificações passaram.

---

## Actualização — Impressão de etiquetas QR/código de barras

Fecha o ciclo com o leitor de código já existente ("📷 Ler código"): agora dá para imprimir
uma etiqueta física com QR code do código de um material, pronta a colar, para depois ser
lida directamente pelo leitor.

- **Botão "🏷️ Imprimir Etiqueta"** nos ecrãs de edição de material (Logística/Vini/Emas e
  Pátio) — imprime uma etiqueta com o código e nome tal como estão nos campos do formulário
  nesse momento, sem precisares de gravar primeiro.
- **Botão "🏷️" directamente nas listas de materiais** (Logística, Vini, Emas e Pátio) — para
  reimprimir a etiqueta de um material que já tem código, sem teres de abrir o ecrã de
  edição.
- **Impressão automática ao codificar um material.** Quando aceitas uma sugestão do
  assistente de codificação (Reconciliação → sugestões por semelhança de nome), a etiqueta
  do código recém-atribuído abre-se logo pronta a imprimir — o momento em que um material
  passa a ter código é também o momento em que já podes colar a etiqueta física nele.
- A etiqueta mostra o código em destaque, o QR (com o valor exacto do código, o mesmo que o
  leitor procura), o nome do material, a localização (armazém + contentor/zona quando
  aplicável) e a data de impressão.
- Se um material ainda não tiver código, o sistema avisa e não deixa imprimir uma etiqueta
  vazia — evita etiquetas coladas sem correspondência no sistema.

### Verificação feita nesta actualização
- `node --check` ao script principal (`index_corrigido.html`) — sem erros de sintaxe.
- Testes automáticos (Node.js) com 8 cenários: código vazio bloqueia a impressão, código só
  com espaços também bloqueia, texto do QR fica correctamente protegido contra aspas e
  barras invertidas, localização sem armazém/zona fica em branco (sem separador a mais), e
  o material correcto é encontrado em cada tipo de localização (Logística, Vini, Emas,
  Pátio) incluindo o caso de "não encontrado" — todas as verificações passaram.

---

## Actualização — Histórico de alterações por material (auditoria)

Até agora o Histórico só registava entradas, saídas e transferências — não ficava
registado **quem mudou o quê** quando alguém editava um material (ex: quem mudou o stock
mínimo, ou corrigiu um nome mal escrito). Isso ficou resolvido:

- Sempre que um material é editado (Logística/Vini/Emas ou Pátio), o sistema compara os
  valores antigos com os novos campo a campo (código, nome, quantidade, unidade, stock
  mínimo, ponto de encomenda, lote, validade) e regista só os que mudaram de facto — com
  valor anterior, valor novo, quem fez a alteração e quando.
- Novo separador **"✏ Alterações de Campos"** na página Histórico (ao lado do separador
  "📦 Movimentos de Stock" já existente), com pesquisa por material ou utilizador e
  exportação para Excel própria.
- Guardado numa colecção separada do histórico de movimentos, para não misturar os dois
  tipos de registo nem afectar o limite de leitura já existente no histórico de stock.

### Verificação feita nesta actualização
- Testes automáticos (Node.js) com 4 cenários: só os campos que mudaram de facto são
  reportados, edição sem alterações reais não gera registo nenhum, valores em branco/por
  definir são tratados como texto vazio (não como "undefined"), e várias alterações em
  simultâneo ficam todas registadas, pela ordem dos campos no formulário.

---

## Actualização — Painel de indicadores (dashboard analítico)

Três novos indicadores no Dashboard, para ajudar a perceber tendências e não só o estado
actual:

- **🔁 Materiais que mais rodam** — gráfico dos 8 materiais com mais movimentos (entradas
  + saídas) nos últimos 3 meses, para perceber que artigos merecem mais atenção na gestão
  de stock.
- **💰 Consumo por centro de custo** — gráfico da quantidade retirada por
  destino/requisitante (campo já preenchido nas Saídas Fora do Sistema) nos últimos 6
  meses, para perceber que áreas consomem mais.
- **⏱️ Tempo médio em trânsito no Pátio** — mostra a média histórica (materiais que já
  saíram do Pátio) e a média actual (materiais ainda lá), calculada a partir da data de
  chegada de cada material. A média histórica vai sendo alimentada automaticamente sempre
  que um material sai do Pátio (por saída ou por transferência), sem precisar de nenhuma
  acção manual.

### Verificação feita nesta actualização
- `node --check` ao script principal — sem erros de sintaxe.
- Testes automáticos (Node.js) com 7 cenários: cálculo correcto de dias em trânsito a
  partir da data de chegada, bloqueio quando não há data de chegada ou a data é inválida,
  ranking de materiais mais movimentados limitado à janela de tempo certa e a excluir
  tipos de movimento irrelevantes (ex: edições), e agrupamento de consumo por centro de
  custo incluindo o caso de destino em branco — todas as verificações passaram.

---

## Actualização — Backup automático diário

Até agora todos os dados viviam só no Firestore, sem nenhuma cópia de segurança separada
— um erro humano (apagar um material sem querer, por exemplo) não tinha rede de
segurança. Agora há um backup automático diário, gratuito e sem precisar do plano Blaze:

- Todos os dias às 03:00 UTC, um robot (GitHub Actions) lê todo o conteúdo do Firestore
  (stock actual, histórico, guias SFS, auditoria, contagens de inventário) e grava dois
  ficheiros novos na pasta `backups/` do repositório: um `.xlsx` fácil de abrir no Excel,
  e um `.json` com uma cópia técnica completa para restauro, se algum dia for preciso.
- Mantêm-se sempre os **últimos 14 dias** de backups — os mais antigos são apagados
  automaticamente para o repositório não crescer sem limite.
- Pode também ser corrido manualmente a qualquer momento, sem esperar pelo horário
  agendado (separador Actions → "Backup diário do Firestore" → "Run workflow").

**Porque falta um passo do teu lado:** para ler o Firestore de fora da aplicação (sem ser
através do browser com sessão iniciada), é preciso uma chave de acesso de leitura gerada
no Firebase Console — é uma credencial sensível, por isso só o próprio administrador da
conta Google pode gerá-la e guardá-la em segurança (como GitHub Secret). O código e o
agendamento já estão prontos e publicados; passos detalhados em `backup/BACKUP_SETUP.md`.

### Verificação feita nesta actualização
- `node --check` ao script de backup — sem erros de sintaxe.
- YAML do workflow do GitHub Actions validado.
- Testes automáticos (Node.js) com 6 cenários: conversão correcta de datas/timestamps do
  Firestore para texto, incluindo dentro de objectos e listas aninhadas, construção
  correcta das folhas de Excel a partir dos registos (incluindo campos em falta), e a
  lógica que decide quais backups antigos apagar (mantém os dos últimos 14 dias, remove os
  mais antigos, nunca apaga o backup do próprio dia) — todas as verificações passaram.

---

## Actualização — Artigos Críticos (marcação manual + área dedicada + relatório)

Até agora, "crítico" no sistema significava apenas "abaixo do stock mínimo" — um cálculo
automático. Mas há famílias de material que são estratégicas mesmo quando o stock está
confortável (óleos e graxas, acetileno, FeSi, floculantes, pneus), e que precisam de ser
acompanhadas de perto e reportadas à chefia. Agora isso é possível:

- **Marcar um artigo como crítico**: no ecrã de edição de qualquer material (Logística,
  Vini, Emas e Pátio) há uma opção "⭐ Marcar como ARTIGO CRÍTICO". É uma decisão manual,
  independente do nível de stock.
- **Nova área "⭐ Artigos Críticos"** no menu lateral, com o número de artigos marcados
  visível no próprio menu. Mostra três contadores no topo (total de críticos, quantos estão
  abaixo do mínimo, quantos estão no ponto de encomenda) e a lista completa ordenada pelos
  mais urgentes primeiro, com pesquisa e filtro por armazém.
- **Estrela ⭐ nas listas de material** dos armazéns, para se ver logo quais artigos estão
  marcados como críticos sem ter de ir a outra página.
- **Exportação para Excel** dos artigos críticos, com estado (crítico / atenção / OK),
  código, localização, stock actual, mínimo, ponto de encomenda, lote e validade — pronto a
  enviar como resposta a um pedido de ponto de situação.
- **Retirar a marca** directamente a partir da lista, sem abrir o ecrã de edição; a
  alteração fica registada na auditoria (quem retirou e quando), tal como qualquer outra
  alteração de campo.

### Verificação feita nesta actualização
- `node --check` ao script principal — sem erros de sintaxe.
- Testes automáticos (Node.js) com 9 cenários: só aparecem os artigos marcados manualmente
  (um artigo com stock baixo mas *não* marcado não entra na lista, e um artigo marcado com
  stock saudável entra), ordenação por urgência (abaixo do mínimo primeiro, depois ponto de
  encomenda, depois OK) com desempate alfabético, filtro por armazém, pesquisa por nome,
  código e localização, combinação de filtros, e um artigo marcado sem limites de stock
  definidos continua a ser listado — todas as verificações passaram.

---

## Actualização — Artigos Críticos: uma linha por material, não por localização

Reportaste que "MARMITEX" aparecia repetido 3 vezes na lista de Artigos Críticos, uma vez
por cada contentor onde existe. Corrigido: a lista agora agrupa por nome do material e
mostra **uma única linha com o total consolidado**, seja qual for o número de localizações.

- **Stock Total** = soma da quantidade em todos os locais onde o artigo está marcado como
  crítico.
- **Coluna "Localizações"** mostra os armazéns onde o artigo existe e, quando está em mais
  de um sítio, indica quantos locais (ex: "Logística, Vini Galpão (3 locais)"); ao passar o
  rato por cima aparece o detalhe local a local com a quantidade de cada um.
- **Mínimo** passa a ser a soma dos stocks mínimos definidos em cada localização, e o nível
  de urgência (🔴 crítico / 🟡 encomendar / ✅ OK) é calculado sobre o total, não sobre cada
  linha isolada — assim o alerta reflecte a situação real do artigo no armazém como um todo.
- O botão "✕" retira a marca de crítico em **todas** as localizações desse artigo de uma só
  vez (antes só desmarcava a linha clicada); cada localização afectada fica registada na
  auditoria, como já acontecia.
- A exportação para Excel foi actualizada da mesma forma: uma linha por artigo, com o
  número de localizações e o detalhe de cada uma numa coluna própria, e os totais de stock/
  mínimo/ponto de encomenda somados.

### Verificação feita nesta actualização
- `node --check` ao script principal — sem erros de sintaxe.
- Testes automáticos (Node.js) com 5 cenários: MARMITEX em 3 locais (incluindo uma variante
  em minúsculas) agrupa correctamente numa só linha com a quantidade somada (40) e o código
  aproveitado da localização que o tinha definido; o nível de urgência do grupo reflecte os
  totais (40 em stock vs 30 de mínimo somado = OK; noutro cenário, 3 em stock vs 6 de
  mínimo somado = crítico); um artigo crítico numa única localização continua a agrupar sem
  regressão; e os armazéns distintos de um grupo ficam correctamente identificados para a
  coluna de Localizações — todas as verificações passaram.

---

## Actualização — Ponto de Encomenda também no Pátio

Perguntaste porque é que os artigos do Pátio nunca tinham ponto de encomenda preenchido.
A causa: o Pátio usa um formulário de edição próprio (por ser "material em trânsito"), e
esse formulário só tinha o campo "Stock Mínimo" — o campo "Ponto de Encomenda" nunca foi
incluído nele, ao contrário do formulário usado pela Logística, Vini e Emas. Não era stock
a desaparecer nem um cálculo errado: o campo simplesmente não existia para preencher.

- O modal de edição do Pátio (✏ na lista do Pátio) tem agora o campo "🟡 PONTO DE
  ENCOMENDA", igual ao dos outros armazéns.
- A partir de agora, um artigo do Pátio com ponto de encomenda definido passa a aparecer
  correctamente na página "Alertas" (🟡 no ponto de encomenda) e a contar para o número de
  alertas do dashboard, tal como já acontecia com Stock Mínimo.
- A alteração fica registada na auditoria por material, como qualquer outro campo editado.

### Verificação feita nesta actualização
- `node --check` ao script principal — sem erros de sintaxe.
- Testes automáticos (Node.js) com 4 cenários: definir o ponto de encomenda pela primeira
  vez fica correctamente registado como alteração na auditoria; um artigo do Pátio com
  stock saudável mas sem ponto de encomenda definido continua "OK"; o mesmo artigo, depois
  de definido o ponto de encomenda e com o stock a cair até esse valor, passa correctamente
  a "🟡 ponto de encomenda"; e quando tanto o stock mínimo como o ponto de encomenda são
  ultrapassados, o stock mínimo continua a ter prioridade (🔴 crítico), sem alterar o
  comportamento já existente para os outros armazéns — todas as verificações passaram.
