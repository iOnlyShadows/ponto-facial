"""API do Sistema de Ponto com Reconhecimento Facial (FastAPI).

Rodar:  uvicorn main:app --reload --port 8000
Docs interativas:  http://localhost:8000/docs
"""
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

import cv2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db
import face

PASTA_FOTOS = Path(__file__).parent / os.getenv("PONTO_FOTOS", "fotos")
PASTA_FOTOS.mkdir(exist_ok=True)

# Sequência automática do dia: depois de cada tipo, qual vem a seguir.
PROXIMO_TIPO = {None: "entrada", "entrada": "intervalo", "intervalo": "retorno", "retorno": "saida", "saida": "entrada"}
# Evita registro duplicado quando a pessoa toca no botão duas vezes seguidas.
INTERVALO_MINIMO_SEG = 60


@asynccontextmanager
async def lifespan(app):
    db.criar_tabelas()
    print("Carregando modelo de reconhecimento facial...")
    face.aquecer()
    print("Modelo pronto.")
    yield


app = FastAPI(title="Ponto Facial", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/fotos", StaticFiles(directory=PASTA_FOTOS), name="fotos")


def erro(status, codigo, mensagem):
    return JSONResponse(status_code=status, content={"codigo": codigo, "mensagem": mensagem})


# ---------- Funcionários ----------

class NovoFuncionario(BaseModel):
    nome: str
    matricula: str
    cargo: str
    foto: str  # imagem em data URL base64


class Foto(BaseModel):
    foto: str


@app.get("/api/funcionarios")
def listar_funcionarios():
    return [db.funcionario_publico(f) for f in db.listar_funcionarios()]


@app.post("/api/rostos")
def contar_rostos(dados: Foto):
    """Usado na tela de cadastro logo após capturar a foto, para avisar se não há rosto."""
    try:
        img = face.decodificar_imagem(dados.foto)
    except face.ErroRosto as e:
        return erro(400, e.codigo, e.mensagem)
    return {"rostos": face.contar_rostos(img)}


@app.post("/api/funcionarios", status_code=201)
def cadastrar_funcionario(dados: NovoFuncionario):
    nome, matricula, cargo = dados.nome.strip(), dados.matricula.strip(), dados.cargo.strip()
    if not nome or not cargo:
        return erro(400, "campos", "Preencha nome e cargo.")
    if not re.fullmatch(r"\d{6}", matricula):
        return erro(400, "matricula", "A matrícula deve ter 6 dígitos (ex.: 000123).")
    existente = db.buscar_por_matricula(matricula)
    if existente and existente["ativo"]:
        return erro(409, "matricula", f"Matrícula já cadastrada para {existente['nome']}.")

    try:
        img = face.decodificar_imagem(dados.foto)
        embedding = face.gerar_embedding(img)
    except face.ErroRosto as e:
        mensagens = {
            "nenhum": "Nenhum rosto detectado na foto. Refaça a captura com o rosto dentro da moldura.",
            "multiplo": "Há mais de um rosto na foto. Refaça a captura com apenas o funcionário.",
        }
        return erro(400, e.codigo, mensagens.get(e.codigo, e.mensagem))

    # Impede cadastrar a mesma pessoa duas vezes com matrículas diferentes.
    parecido, dist = face.identificar(embedding, db.embeddings_ativos())
    if parecido:
        return erro(409, "duplicado", f"Este rosto já está cadastrado para {parecido['nome']} (matrícula {parecido['matricula']}).")

    foto_path = PASTA_FOTOS / f"{matricula}.jpg"
    cv2.imwrite(str(foto_path), img)
    funcionario = db.salvar_funcionario(nome, matricula, cargo, foto_path, embedding)
    return db.funcionario_publico(funcionario)


@app.delete("/api/funcionarios/{matricula}")
def excluir_funcionario(matricula: str):
    if not db.desativar_funcionario(matricula):
        return erro(404, "nao_encontrado", "Funcionário não encontrado.")
    return {"ok": True}


# ---------- Ponto ----------

class Ponto(BaseModel):
    foto: str
    tipo: Optional[Literal["entrada", "intervalo", "retorno", "saida"]] = None  # None = automático


@app.post("/api/ponto")
def registrar_ponto(dados: Ponto):
    # 1. Rosto da câmera -> embedding
    try:
        img = face.decodificar_imagem(dados.foto)
        embedding = face.gerar_embedding(img)
    except face.ErroRosto as e:
        return erro(422, e.codigo, e.mensagem)

    # 2. Compara com os cadastrados
    funcionario, distancia = face.identificar(embedding, db.embeddings_ativos())
    if funcionario is None:
        return erro(404, "nao", "Funcionário não reconhecido.")

    # 3. Define o tipo e grava data e hora
    agora = datetime.now()
    data, hora = agora.strftime("%Y-%m-%d"), agora.strftime("%H:%M:%S")
    do_dia = db.registros_do_dia(funcionario["id"], data)
    if do_dia:
        ultimo = datetime.strptime(f"{data} {do_dia[-1]['hora']}", "%Y-%m-%d %H:%M:%S")
        if (agora - ultimo).total_seconds() < INTERVALO_MINIMO_SEG:
            return erro(409, "repetido", f"{funcionario['nome']} já registrou ponto às {do_dia[-1]['hora'][:5]}. Aguarde um minuto para registrar de novo.")

    automatico = dados.tipo is None
    tipo = PROXIMO_TIPO[do_dia[-1]["tipo"] if do_dia else None] if automatico else dados.tipo
    db.salvar_registro(funcionario["id"], data, hora, tipo, distancia)

    return {
        "funcionario": db.funcionario_publico(funcionario),
        "tipo": tipo,
        "automatico": automatico,
        "data": data,
        "hora": hora,
        "distancia": round(distancia, 4),
        "similaridade": face.similaridade(distancia),
    }


@app.get("/api/registros")
def listar_registros(data: Optional[str] = None):
    data = data or datetime.now().strftime("%Y-%m-%d")
    return [
        {
            "id": r["id"],
            "data": r["data"],
            "hora": r["hora"],
            "tipo": r["tipo"],
            "similaridade": face.similaridade(r["distancia"]),
            "nome": r["nome"],
            "matricula": r["matricula"],
            "cargo": r["cargo"],
            "foto": db.url_foto(r["foto_path"]),
            "ativo": bool(r["ativo"]),
        }
        for r in db.listar_registros(data)
    ]
