"""Banco de dados SQLite: funcionários e registros de ponto."""
import json
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / os.getenv("PONTO_DB", "ponto.db")


def conectar():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def criar_tabelas():
    with conectar() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS funcionarios (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                nome       TEXT NOT NULL,
                matricula  TEXT NOT NULL UNIQUE,
                cargo      TEXT NOT NULL,
                foto_path  TEXT NOT NULL,
                embedding  TEXT NOT NULL,          -- vetor facial em JSON (512 números)
                ativo      INTEGER NOT NULL DEFAULT 1,
                criado_em  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS registros (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                funcionario_id  INTEGER NOT NULL REFERENCES funcionarios(id),
                data            TEXT NOT NULL,      -- AAAA-MM-DD
                hora            TEXT NOT NULL,      -- HH:MM:SS
                tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'intervalo', 'retorno', 'saida')),
                distancia       REAL NOT NULL       -- distância facial da comparação (menor = mais parecido)
            );

            CREATE INDEX IF NOT EXISTS idx_registros_data ON registros(data);
            """
        )


def url_foto(foto_path):
    """Endereço público da foto; o ?v= muda quando a foto é trocada, para o navegador não usar a antiga."""
    p = Path(foto_path)
    versao = int(p.stat().st_mtime) if p.exists() else 0
    return f"/fotos/{p.name}?v={versao}"


def funcionario_publico(row):
    """Dados do funcionário que podem ir para o frontend (sem o embedding)."""
    return {
        "id": row["id"],
        "nome": row["nome"],
        "matricula": row["matricula"],
        "cargo": row["cargo"],
        "foto": url_foto(row["foto_path"]),
        "ativo": bool(row["ativo"]),
    }


def listar_funcionarios(apenas_ativos=True):
    with conectar() as con:
        sql = "SELECT * FROM funcionarios"
        if apenas_ativos:
            sql += " WHERE ativo = 1"
        return con.execute(sql + " ORDER BY nome").fetchall()


def buscar_por_matricula(matricula):
    with conectar() as con:
        return con.execute("SELECT * FROM funcionarios WHERE matricula = ?", (matricula,)).fetchone()


def salvar_funcionario(nome, matricula, cargo, foto_path, embedding):
    """Cadastra o funcionário. Se a matrícula pertencia a alguém excluído, reaproveita o registro."""
    dados = (nome, cargo, str(foto_path), json.dumps(embedding), matricula)
    with conectar() as con:
        existente = con.execute("SELECT id FROM funcionarios WHERE matricula = ?", (matricula,)).fetchone()
        if existente:
            con.execute(
                "UPDATE funcionarios SET nome = ?, cargo = ?, foto_path = ?, embedding = ?, ativo = 1 WHERE matricula = ?",
                dados,
            )
        else:
            con.execute(
                "INSERT INTO funcionarios (nome, cargo, foto_path, embedding, matricula) VALUES (?, ?, ?, ?, ?)",
                dados,
            )
        return con.execute("SELECT * FROM funcionarios WHERE matricula = ?", (matricula,)).fetchone()


def desativar_funcionario(matricula):
    """Exclusão lógica: o funcionário deixa de bater ponto, mas os registros antigos continuam no histórico."""
    with conectar() as con:
        cur = con.execute("UPDATE funcionarios SET ativo = 0 WHERE matricula = ? AND ativo = 1", (matricula,))
        return cur.rowcount > 0


def embeddings_ativos():
    """Lista de (funcionário, embedding) usada na comparação facial."""
    return [(row, json.loads(row["embedding"])) for row in listar_funcionarios()]


def registros_do_dia(funcionario_id, data):
    with conectar() as con:
        return con.execute(
            "SELECT * FROM registros WHERE funcionario_id = ? AND data = ? ORDER BY hora",
            (funcionario_id, data),
        ).fetchall()


def salvar_registro(funcionario_id, data, hora, tipo, distancia):
    with conectar() as con:
        cur = con.execute(
            "INSERT INTO registros (funcionario_id, data, hora, tipo, distancia) VALUES (?, ?, ?, ?, ?)",
            (funcionario_id, data, hora, tipo, distancia),
        )
        return cur.lastrowid


def listar_registros(data):
    with conectar() as con:
        return con.execute(
            """
            SELECT r.id, r.data, r.hora, r.tipo, r.distancia,
                   f.nome, f.matricula, f.cargo, f.foto_path, f.ativo
            FROM registros r JOIN funcionarios f ON f.id = r.funcionario_id
            WHERE r.data = ?
            ORDER BY r.hora DESC
            """,
            (data,),
        ).fetchall()
