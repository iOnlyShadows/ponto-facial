# Prompt — Claude Design

Crie o protótipo navegável de um **Sistema de Registro de Ponto por Reconhecimento Facial**. O funcionário bate o ponto olhando para a câmera, sem crachá nem senha. É um trabalho acadêmico: o protótipo vai ser apresentado ao professor antes da versão funcional (React + Python + DeepFace), então precisa mostrar o fluxo completo e todos os estados de cada tela. Os dados são fictícios e o reconhecimento é simulado.

## Direção visual

- Aparência de produto real de empresa de RH/controle de acesso: sóbrio, confiável, preciso. Nada de visual de painel genérico com gradiente roxo nem de cards espalhados sem hierarquia.
- A tela de **Registrar Ponto** funciona como um terminal tipo quiosque (um tablet na parede da entrada da empresa): a câmera ocupa a maior parte, o relógio é grande e legível de longe e há um único botão principal.
- As telas administrativas (Cadastro e Histórico) são mais densas e funcionais.
- Uma cor de destaque só. Verde e vermelho ficam reservados para "reconhecido" e "não reconhecido".
- A câmera tem uma moldura oval ou um guia de enquadramento do rosto, como nos apps de banco, com a instrução "Posicione o rosto dentro da moldura".
- Tudo em português do Brasil.

## Telas

Navegação entre as três telas, mais uma entrada à parte para o modo quiosque.

### 1. Registrar Ponto (tela principal / quiosque)
- Data por extenso e relógio em tempo real.
- Câmera ao vivo (usar a webcam se o navegador permitir; senão, um placeholder com silhueta).
- Seletor de tipo: **Automático** (padrão), Entrada, Intervalo, Retorno, Saída.
- Botão "Registrar ponto".
- Estados, todos navegáveis:
  - **Aguardando** — câmera ativa, instrução de enquadramento.
  - **Processando** — moldura animada "escaneando", texto "Identificando...".
  - **Reconhecido** — foto do cadastro, nome, cargo, tipo registrado e horário ("Entrada registrada às 08:02"), com nível de confiança. Volta para Aguardando sozinho depois de alguns segundos.
  - **Não reconhecido** — "Funcionário não reconhecido. Tente novamente ou procure o RH."
  - **Nenhum rosto detectado** e **Mais de um rosto na imagem** — mensagens orientando o que fazer.

### 2. Cadastro de Funcionário
- Formulário: nome, matrícula, cargo.
- Captura da foto com prévia da câmera, "Capturar", foto congelada, "Refazer".
- Validações visíveis: campo obrigatório, matrícula já cadastrada, nenhum rosto na foto.
- Confirmação de sucesso.
- Lista dos funcionários cadastrados com miniatura, nome, matrícula, cargo e opção de excluir (com confirmação).

### 3. Histórico de Registros
- Filtro por data (padrão: hoje) e busca por nome ou matrícula.
- Tabela: funcionário (com miniatura), matrícula, tipo (etiqueta colorida por tipo), horário.
- Resumo no topo: quantos funcionários já entraram hoje, quantos estão em intervalo, quantos já saíram.
- Estado vazio para dia sem registros.

## Dados fictícios

Seis funcionários com nomes brasileiros e cargos variados (Analista de RH, Auxiliar Administrativo, Vendedora, Estoquista, Gerente, Recepcionista), matrículas no formato `000123` e registros de hoje com uma sequência coerente (entrada por volta das 8h, intervalo ao meio-dia, retorno às 13h, alguns já com saída). O "Automático" escolhe o próximo tipo pela sequência do dia: entrada → intervalo → retorno → saída.

## Para demonstrar

Inclua um controle discreto de demonstração (ex.: um botão de engrenagem no canto) que force o resultado do próximo registro entre "reconhecido como [funcionário]", "não reconhecido", "nenhum rosto" e "mais de um rosto". Assim dá para mostrar todos os estados ao vivo na apresentação.
