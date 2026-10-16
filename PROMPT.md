# Prompt — Protótipo do Sistema de Ponto com Reconhecimento Facial

Construa o **protótipo funcional** de um Sistema de Registro de Ponto por Reconhecimento Facial. É um trabalho acadêmico: o código precisa ser simples, legível e fácil de explicar numa apresentação. Priorize um fluxo completo funcionando de ponta a ponta em vez de muitas funcionalidades.

## Stack (obrigatória)

- **Frontend:** React + Vite (JavaScript), sem framework de UI pesado. CSS simples ou Tailwind.
- **Backend:** Python 3.11 + FastAPI + Uvicorn.
- **Reconhecimento facial:** biblioteca **DeepFace** (com `tf-keras`).
- **Banco de dados:** SQLite (arquivo local), acessado com `sqlite3` ou SQLAlchemy.
- **Câmera:** webcam do navegador via `getUserMedia` (ou `react-webcam`).
- Roda local no Windows: backend em `http://localhost:8000`, frontend em `http://localhost:5173`, CORS liberado para o frontend.

## Estrutura de pastas

```
ponto-facial/
  backend/
    main.py            # rotas FastAPI
    face.py            # tudo que envolve DeepFace
    db.py              # conexão e criação das tabelas
    requirements.txt
    fotos/             # fotos de cadastro salvas aqui
  frontend/
    src/
      pages/Cadastro.jsx
      pages/RegistrarPonto.jsx
      pages/Historico.jsx
      components/Camera.jsx
      api.js
  README.md            # como instalar e rodar, passo a passo
```

## Banco de dados

- `funcionarios`: id, nome, matricula (única), cargo, foto_path, embedding (JSON com o vetor facial), criado_em
- `registros`: id, funcionario_id, data, hora, tipo (`entrada`, `intervalo`, `retorno`, `saida`), distancia (confiança da comparação)

## Reconhecimento facial (face.py)

- Modelo: `Facenet512`. Detector: `opencv` (rápido; deixar fácil trocar para `retinaface`).
- **No cadastro:** receber a foto, validar que existe **exatamente um rosto** (se não houver nenhum ou houver mais de um, devolver erro claro). Gerar o embedding com `DeepFace.represent` e salvar no banco junto com a foto.
- **No ponto:** gerar o embedding da imagem capturada, comparar por distância de cosseno com os embeddings de todos os funcionários e pegar o mais próximo. Só identifica se a distância ficar abaixo do limiar do modelo (usar o limiar padrão do DeepFace para Facenet512/cosine, deixar configurável em uma constante).
- Pré-carregar o modelo quando o servidor sobe, para o primeiro registro não demorar.
- Comentar o código explicando o que é embedding e por que comparar distância — vai ser usado na apresentação.

## Rotas da API

- `POST /funcionarios` — nome, matricula, cargo, foto (base64). Cadastra.
- `GET /funcionarios` — lista os cadastrados.
- `DELETE /funcionarios/{id}` — remove (útil para refazer testes).
- `POST /ponto` — foto (base64) + tipo opcional. Identifica o funcionário e grava o registro com data e hora do servidor. Se o tipo não vier, o sistema escolhe pela sequência do dia: sem registro → `entrada`; após entrada → `intervalo`; após intervalo → `retorno`; após retorno → `saida`.
- `GET /registros?data=AAAA-MM-DD` — histórico, com nome do funcionário.

Erros sempre em JSON com mensagem em português (ex.: "Nenhum rosto detectado", "Funcionário não reconhecido", "Matrícula já cadastrada").

## Telas (React)

Menu simples no topo com as três telas.

1. **Cadastro de funcionário** — campos nome, matrícula, cargo; prévia da câmera ao vivo; botão "Capturar foto" mostra a foto tirada com opção de refazer; botão "Cadastrar". Abaixo, lista dos funcionários cadastrados com miniatura e botão de excluir.
2. **Registrar ponto** — câmera ao vivo em destaque, relógio com data e hora atual, botões de tipo (Entrada / Intervalo / Retorno / Saída) com a opção "automático" selecionada por padrão, e botão grande "Registrar ponto". Ao reconhecer: card verde com foto do cadastro, nome, cargo, tipo e horário registrados. Ao falhar: card vermelho com o motivo. Mostrar estado de "Processando..." enquanto a API responde.
3. **Histórico** — tabela de registros filtrável por data (padrão: hoje), colunas funcionário, matrícula, tipo, horário.

Interface limpa, em português, responsiva o suficiente para funcionar num notebook.

## Fora do escopo do protótipo

Login/autenticação, perfis de acesso, anti-spoofing (detecção de foto de foto), relatórios de horas trabalhadas, edição de registros, deploy. Listar esses itens no README como "próximos passos".

## Entrega

- Código completo e rodando.
- `README.md` com: pré-requisitos (Python 3.11, Node 18+), criação do venv, `pip install -r requirements.txt`, aviso de que a primeira execução baixa os pesos do modelo (~90 MB), como subir backend e frontend, e um roteiro de teste: cadastrar 2 pessoas → registrar entrada de cada uma → ver no histórico → tentar com uma pessoa não cadastrada.
- Depois de terminar, rodar o roteiro de teste e confirmar que o fluxo inteiro funciona.
