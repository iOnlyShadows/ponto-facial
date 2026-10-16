"""Teste de ponta a ponta da API com fotos de exemplo.

Uso (com a API rodando em outro terminal):
    python teste_fluxo.py <pasta_com_fotos>

A pasta precisa ter as fotos de exemplo do DeepFace (tests/unit/dataset):
img2/img4 (mesma mulher), img13/img14 (mesmo homem), img18/img19 (mesmo homem),
img20 (pessoa não cadastrada) e couple.jpg (duas pessoas).
Rode a API apontando para um banco de teste para não misturar com os dados reais:
    set PONTO_DB=teste.db
    set PONTO_FOTOS=fotos_teste
(Linux/macOS: export em vez de set)
"""
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

API = os.getenv("PONTO_API", "http://localhost:8000")
PASTA = Path(sys.argv[1])
ok = falhas = 0


def foto(nome):
    return "data:image/jpeg;base64," + base64.b64encode((PASTA / nome).read_bytes()).decode()


def chamar(metodo, rota, corpo=None):
    req = urllib.request.Request(API + rota, method=metodo, headers={"Content-Type": "application/json"},
                                 data=json.dumps(corpo).encode() if corpo else None)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def checar(descricao, condicao, detalhe=""):
    global ok, falhas
    if condicao:
        ok += 1
        print(f"  ok    {descricao}")
    else:
        falhas += 1
        print(f"  FALHA {descricao}  {detalhe}")


PESSOAS = [("Ana Teste", "900001", "Vendedora", "img2.jpg"),
           ("Bruno Teste", "900002", "Gerente", "img13.jpg"),
           ("Carlos Teste", "900003", "Estoquista", "img18.jpg")]

print("Cadastro")
for nome, mat, cargo, img in PESSOAS:
    s, r = chamar("POST", "/api/funcionarios", {"nome": nome, "matricula": mat, "cargo": cargo, "foto": foto(img)})
    checar(f"cadastra {nome}", s == 201, r)
s, r = chamar("POST", "/api/funcionarios", {"nome": "Repetida", "matricula": "900001", "cargo": "X", "foto": foto("img20.jpg")})
checar("recusa matrícula repetida", s == 409 and r["codigo"] == "matricula", r)
s, r = chamar("POST", "/api/funcionarios", {"nome": "Mesmo rosto", "matricula": "900009", "cargo": "X", "foto": foto("img4.jpg")})
checar("recusa mesmo rosto com outra matrícula", s == 409 and r["codigo"] == "duplicado", r)
s, r = chamar("POST", "/api/funcionarios", {"nome": "Casal", "matricula": "900008", "cargo": "X", "foto": foto("couple.jpg")})
checar("recusa foto com duas pessoas", s == 400 and r["codigo"] == "multiplo", r)
s, r = chamar("POST", "/api/rostos", {"foto": foto("couple.jpg")})
checar("conta 2 rostos na foto do casal", r.get("rostos") == 2, r)

print("Ponto")
for img, esperado in [("img4.jpg", "900001"), ("img14.jpg", "900002"), ("img19.jpg", "900003")]:
    s, r = chamar("POST", "/api/ponto", {"foto": foto(img)})
    checar(f"{img} reconhecido como {esperado} (entrada)",
           s == 200 and r["funcionario"]["matricula"] == esperado and r["tipo"] == "entrada",
           r if s != 200 else f"{r['funcionario']['matricula']} {r['tipo']} dist={r['distancia']}")
s, r = chamar("POST", "/api/ponto", {"foto": foto("img4.jpg")})
checar("segundo toque em menos de 1 minuto é recusado", s == 409 and r["codigo"] == "repetido", r)
s, r = chamar("POST", "/api/ponto", {"foto": foto("img20.jpg")})
checar("pessoa não cadastrada -> não reconhecido", s == 404 and r["codigo"] == "nao", r)
s, r = chamar("POST", "/api/ponto", {"foto": foto("couple.jpg")})
checar("duas pessoas -> mais de um rosto", s == 422 and r["codigo"] == "multiplo", r)
import cv2, numpy as np
_, png = cv2.imencode(".png", np.full((480, 640, 3), 128, dtype=np.uint8))
branco = "data:image/png;base64," + base64.b64encode(png.tobytes()).decode()
s, r = chamar("POST", "/api/ponto", {"foto": branco})
checar("imagem sem ninguém -> nenhum rosto", s == 422 and r["codigo"] == "nenhum", r)

print("Histórico")
s, r = chamar("GET", "/api/registros")
nossos = [x for x in r if x["matricula"].startswith("9000")]
checar("3 entradas no histórico de hoje", len(nossos) == 3, nossos)

print("Limpeza")
for _, mat, _, _ in PESSOAS:
    s, _ = chamar("DELETE", f"/api/funcionarios/{mat}")
    checar(f"exclui {mat}", s == 200)

print(f"\n{ok} ok, {falhas} falha(s)")
sys.exit(1 if falhas else 0)
