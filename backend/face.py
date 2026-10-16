"""Reconhecimento facial com DeepFace.

Como funciona, em duas etapas:

1. Embedding: o DeepFace localiza o rosto na imagem (detector) e passa o recorte por uma
   rede neural (modelo Facenet512). A saída é um vetor de 512 números, o "embedding",
   que resume as características daquele rosto. Fotos diferentes da mesma pessoa geram
   vetores parecidos; pessoas diferentes geram vetores distantes.

2. Comparação: no cadastro guardamos o embedding de cada funcionário. No ponto, geramos o
   embedding da foto nova e medimos a distância de cosseno até cada um dos cadastrados.
   O mais próximo é o candidato, mas só é aceito se a distância ficar abaixo do limiar
   do modelo. Acima disso, consideramos "não reconhecido".
"""
import base64
import os
import threading

import cv2
import numpy as np
from deepface import DeepFace

MODELO = "Facenet512"
# opencv é rápido e não baixa nada extra; "retinaface" é mais preciso, porém mais lento.
DETECTOR = os.getenv("PONTO_DETECTOR", "opencv")
# Limiar de distância de cosseno recomendado pelo DeepFace para o Facenet512.
# Menor = mais exigente (menos falsos positivos, mais "não reconhecido").
LIMIAR = float(os.getenv("PONTO_LIMIAR", "0.30"))
# Rostos com área menor que essa fração do maior rosto da foto são ignorados
# (evita que um rosto lá no fundo ou um falso positivo do detector bloqueie o registro).
FRACAO_ROSTO_MINIMO = 0.25

_lock = threading.Lock()  # o TensorFlow não gosta de chamadas simultâneas


class ErroRosto(Exception):
    """Problema com a imagem enviada (nenhum rosto, vários rostos, imagem inválida)."""

    def __init__(self, codigo, mensagem):
        super().__init__(mensagem)
        self.codigo = codigo
        self.mensagem = mensagem


def decodificar_imagem(data_url):
    """Converte a imagem que vem do navegador (data URL base64) em matriz do OpenCV."""
    try:
        conteudo = data_url.split(",", 1)[1] if "," in data_url else data_url
        buf = np.frombuffer(base64.b64decode(conteudo), dtype=np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    except Exception:
        img = None
    if img is None:
        raise ErroRosto("imagem_invalida", "Não foi possível ler a imagem enviada.")
    return img


def _rostos(img):
    """Detecta os rostos e devolve a lista do DeepFace (embedding + área de cada rosto)."""
    with _lock:
        try:
            resultado = DeepFace.represent(
                img_path=img,
                model_name=MODELO,
                detector_backend=DETECTOR,
                enforce_detection=True,
                align=True,
            )
        except ValueError:
            # O DeepFace lança ValueError quando não encontra nenhum rosto.
            return []
    area = lambda r: r["facial_area"]["w"] * r["facial_area"]["h"]
    maior = max(area(r) for r in resultado)
    return [r for r in resultado if area(r) >= maior * FRACAO_ROSTO_MINIMO]


def contar_rostos(img):
    return len(_rostos(img))


def gerar_embedding(img):
    """Embedding do único rosto da imagem. Erro se houver zero ou mais de um rosto."""
    rostos = _rostos(img)
    if not rostos:
        raise ErroRosto("nenhum", "Nenhum rosto detectado.")
    if len(rostos) > 1:
        raise ErroRosto("multiplo", "Mais de um rosto na imagem.")
    return rostos[0]["embedding"]


def distancia_cosseno(a, b):
    a, b = np.asarray(a), np.asarray(b)
    return float(1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def identificar(embedding, cadastrados):
    """Compara o embedding com todos os cadastrados.

    cadastrados: lista de (funcionario, embedding).
    Retorna (funcionario, distancia) do mais próximo, ou (None, distancia) se nenhum
    ficou abaixo do limiar.
    """
    melhor, melhor_dist = None, float("inf")
    for funcionario, emb in cadastrados:
        d = distancia_cosseno(embedding, emb)
        if d < melhor_dist:
            melhor, melhor_dist = funcionario, d
    if melhor is None or melhor_dist > LIMIAR:
        return None, melhor_dist
    return melhor, melhor_dist


def similaridade(distancia):
    """Percentual exibido na tela: similaridade de cosseno (1 - distância)."""
    return round(max(0.0, 1 - distancia) * 100, 1)


def aquecer():
    """Carrega os pesos do modelo na memória. Na primeira execução baixa ~95 MB."""
    with _lock:
        DeepFace.represent(
            img_path=np.zeros((160, 160, 3), dtype=np.uint8),
            model_name=MODELO,
            detector_backend="skip",
            enforce_detection=False,
        )
