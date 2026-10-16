# Ponto Facial

Sistema de registro de ponto por reconhecimento facial. O funcionário olha para a câmera, o sistema identifica quem é e grava data, horário e tipo de registro (entrada, intervalo, retorno ou saída).

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** Python + FastAPI (`backend/`)
- **Reconhecimento facial:** DeepFace, modelo Facenet512
- **Banco de dados:** SQLite (`backend/ponto.db`, criado sozinho na primeira execução)

## Como funciona o reconhecimento

1. **Cadastro:** a foto do funcionário passa pelo DeepFace, que localiza o rosto e gera um **embedding**: um vetor de 512 números que resume as características daquele rosto. O vetor fica salvo no banco junto com nome, matrícula, cargo e a foto.
2. **Ponto:** a câmera captura uma foto e envia para a API. O DeepFace gera o embedding dessa foto e a API mede a **distância de cosseno** até o embedding de cada funcionário cadastrado.
3. **Decisão:** o funcionário mais próximo é aceito se a distância ficar abaixo do limiar do modelo (0,30 para o Facenet512). Acima disso, a resposta é "não reconhecido".
4. **Registro:** com a identidade confirmada, a API grava funcionário, data, horário e tipo. No modo automático o tipo segue a sequência do dia: entrada → intervalo → retorno → saída.

O código de reconhecimento está em `backend/face.py`, comentado passo a passo.

## Pré-requisitos

- Python **3.11 ou 3.12** (o TensorFlow ainda não suporta 3.13)
- Node.js 18 ou superior
- Webcam

## Instalação

### Backend

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

> No Linux/macOS: `python3 -m venv .venv` e `source .venv/bin/activate`.

### Frontend

```bash
cd frontend
npm install
```

## Como rodar

Abra dois terminais.

**Terminal 1, API:**

```bash
cd backend
.venv\Scripts\activate
uvicorn main:app --port 8000
```

Na primeira execução o DeepFace baixa os pesos do modelo (~95 MB) para `~/.deepface`. Espere aparecer `Modelo pronto.`

**Terminal 2, interface:**

```bash
cd frontend
npm run dev
```

Acesse **http://localhost:5173** e permita o acesso à câmera.

A documentação interativa da API fica em http://localhost:8000/docs.

## Roteiro de teste

1. **Cadastro:** cadastre duas pessoas, cada uma com nome, matrícula de 6 dígitos, cargo e foto.
2. **Registrar ponto:** cada pessoa olha para a câmera e toca em *Registrar ponto*. O cartão verde mostra nome, cargo, tipo e horário.
3. **Histórico:** confira as marcações do dia e o resumo no topo.
4. **Pessoa não cadastrada:** alguém que não foi cadastrado tenta registrar e recebe *Funcionário não reconhecido*.
5. **Casos de erro:** câmera sem ninguém (nenhum rosto) e duas pessoas no quadro (mais de um rosto).

## Testes automáticos

`backend/teste_fluxo.py` testa a API de ponta a ponta com fotos de exemplo do próprio DeepFace (pasta `tests/unit/dataset` do repositório dele): cadastro, matrícula repetida, rosto repetido, reconhecimento, pessoa desconhecida, nenhum rosto, mais de um rosto e histórico. Rode a API apontando para um banco separado:

```bash
set PONTO_DB=teste.db
set PONTO_FOTOS=fotos_teste
uvicorn main:app --port 8001
```

E em outro terminal:

```bash
set PONTO_API=http://localhost:8001
python teste_fluxo.py caminho\da\pasta\com\fotos
```

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/funcionarios` | Lista os funcionários ativos |
| POST | `/api/funcionarios` | Cadastra (nome, matrícula, cargo, foto em base64) |
| DELETE | `/api/funcionarios/{matricula}` | Exclui o funcionário. Os registros antigos continuam no histórico |
| POST | `/api/rostos` | Conta os rostos de uma foto (validação na hora da captura) |
| POST | `/api/ponto` | Identifica o rosto e grava o registro (tipo opcional, padrão automático) |
| GET | `/api/registros?data=AAAA-MM-DD` | Registros do dia |

## Configuração opcional

Variáveis de ambiente do backend:

- `PONTO_LIMIAR`: limiar de distância (padrão `0.30`). Valores menores deixam o sistema mais exigente.
- `PONTO_DETECTOR`: detector de rosto do DeepFace (padrão `opencv`; `retinaface` é mais preciso e mais lento).

## Regras implementadas

- Matrícula com 6 dígitos e única.
- A foto de cadastro precisa ter exatamente um rosto.
- O mesmo rosto não pode ser cadastrado com duas matrículas.
- Um novo ponto do mesmo funcionário só é aceito depois de 1 minuto, para evitar toques duplicados.

## Próximos passos

- Login e perfis de acesso (RH x terminal)
- Anti-spoofing (impedir o uso de foto de foto; o DeepFace tem `anti_spoofing=True`)
- Relatório de horas trabalhadas por funcionário e por mês
- Correção de registros pelo RH, com justificativa
- Deploy em servidor e terminal dedicado
