const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const conexao = require("../database/conexao");

const router = express.Router();

console.log("✅ AUTH CPF CARREGADO!");

/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

function normalizarCPF(cpf) {
    return String(cpf || "").replace(/\D/g, "");
}

function validarCPF(cpf) {
    cpf = normalizarCPF(cpf);

    if (cpf.length !== 11) {
        return false;
    }

    // Impede CPFs como 11111111111
    if (/^(\d)\1+$/.test(cpf)) {
        return false;
    }

    let soma = 0;

    // Primeiro dígito
    for (let i = 0; i < 9; i++) {
        soma += Number(cpf[i]) * (10 - i);
    }

    let resto = (soma * 10) % 11;

    if (resto === 10) {
        resto = 0;
    }

    if (resto !== Number(cpf[9])) {
        return false;
    }

    // Segundo dígito
    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf[i]) * (11 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10) {
        resto = 0;
    }

    return resto === Number(cpf[10]);
}


function criarToken(usuario) {

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error(
            "JWT_SECRET não foi configurado no arquivo .env"
        );
    }

    return jwt.sign(
        {
            id: usuario.id
        },
        secret,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || "2h"
        }
    );
}


/* =========================================
   CADASTRO
   POST /register
========================================= */

router.post("/register", async (req, res) => {

    console.log("🔥 REGISTER ATINGIDO!");

    try {

        const {
            cpf,
            senha,
            confirmarSenha
        } = req.body;


        /* -------------------------------------
           VERIFICAR DADOS RECEBIDOS
        ------------------------------------- */

        console.log("📥 Dados recebidos no cadastro:", {
            cpf: cpf ? "[informado]" : "[não informado]",
            senha: senha ? "[informada]" : "[não informada]",
            confirmarSenha: confirmarSenha
                ? "[informada]"
                : "[não informada]"
        });


        /* -------------------------------------
           CPF
        ------------------------------------- */

        const cpfNormalizado = normalizarCPF(cpf);

        if (!validarCPF(cpfNormalizado)) {

            return res.status(400).json({
                erro: "CPF inválido."
            });
        }


        /* -------------------------------------
           SENHA
        ------------------------------------- */

        if (!senha || !confirmarSenha) {

            return res.status(400).json({
                erro:
                    "Senha e confirmação de senha são obrigatórias."
            });
        }


        if (typeof senha !== "string") {

            return res.status(400).json({
                erro: "Senha inválida."
            });
        }


        if (senha.length < 6) {

            return res.status(400).json({
                erro:
                    "A senha deve ter pelo menos 6 caracteres."
            });
        }


        if (senha !== confirmarSenha) {

            return res.status(400).json({
                erro:
                    "As senhas não coincidem."
            });
        }


        /* -------------------------------------
           VERIFICAR SE CPF JÁ EXISTE
        ------------------------------------- */

        console.log("🔎 Verificando CPF no banco...");

        const [usuariosExistentes] =
            await conexao.query(
                `
                SELECT id
                FROM usuarios
                WHERE cpf = ?
                LIMIT 1
                `,
                [
                    cpfNormalizado
                ]
            );


        if (usuariosExistentes.length > 0) {

            console.log("⚠️ CPF já cadastrado.");

            return res.status(409).json({
                erro:
                    "Este CPF já possui uma conta."
            });
        }


        /* -------------------------------------
           CRIPTOGRAFAR SENHA
        ------------------------------------- */

        console.log("🔐 Criptografando senha...");

        const senhaHash =
            await bcrypt.hash(
                senha,
                10
            );


        /* -------------------------------------
           INSERIR USUÁRIO
        ------------------------------------- */

        console.log("💾 Inserindo usuário no banco...");

        const [resultado] =
            await conexao.query(
                `
                INSERT INTO usuarios
                (
                    cpf,
                    senha_hash
                )
                VALUES (?, ?)
                `,
                [
                    cpfNormalizado,
                    senhaHash
                ]
            );


        const novoId =
            resultado.insertId;


        console.log(
            "✅ Usuário criado. ID:",
            novoId
        );


        /* -------------------------------------
           GERAR TOKEN
        ------------------------------------- */

        const token =
            criarToken({
                id: novoId
            });


        /* -------------------------------------
           RESPOSTA
        ------------------------------------- */

        return res.status(201).json({

            mensagem:
                "Conta criada com sucesso!",

            token,

            usuario: {

                id:
                    novoId,

                cpf:
                    cpfNormalizado,

                perfilCompleto:
                    false
            }
        });

    } catch (erro) {

        console.error(
            "❌ ERRO REAL NO CADASTRO:"
        );

        console.error(
            "Mensagem:",
            erro?.message
        );

        console.error(
            "Código:",
            erro?.code
        );

        console.error(
            "Número:",
            erro?.errno
        );

        console.error(
            "SQL State:",
            erro?.sqlState
        );

        console.error(
            "SQL Message:",
            erro?.sqlMessage
        );

        console.error(
            "Stack:",
            erro?.stack
        );


        /* -------------------------------------
           CPF DUPLICADO
        ------------------------------------- */

        if (
            erro?.code === "ER_DUP_ENTRY" ||
            erro?.errno === 1062
        ) {

            return res.status(409).json({
                erro:
                    "Este CPF já possui uma conta."
            });
        }


        /* -------------------------------------
           ERRO DE DESENVOLVIMENTO
        ------------------------------------- */

        const desenvolvimento =
            process.env.NODE_ENV !== "production";


        if (
            desenvolvimento &&
            erro?.sqlMessage
        ) {

            return res.status(500).json({
                erro:
                    `Erro no banco de dados: ${erro.sqlMessage}`
            });
        }


        /* -------------------------------------
           ERRO JWT
        ------------------------------------- */

        if (
            erro?.message &&
            erro.message.includes("JWT_SECRET")
        ) {

            return res.status(500).json({
                erro:
                    "JWT_SECRET não está configurado no servidor."
            });
        }


        /* -------------------------------------
           ERRO GENÉRICO
        ------------------------------------- */

        return res.status(500).json({
            erro:
                "Erro interno ao criar a conta."
        });
    }
});


/* =========================================
   LOGIN
   POST /login
========================================= */

router.post("/login", async (req, res) => {

    console.log("🔐 LOGIN ATINGIDO!");

    try {

        const {
            cpf,
            senha
        } = req.body;


        /* -------------------------------------
           CPF
        ------------------------------------- */

        const cpfNormalizado =
            normalizarCPF(cpf);


        if (!validarCPF(cpfNormalizado)) {

            return res.status(400).json({
                erro:
                    "CPF inválido."
            });
        }


        /* -------------------------------------
           SENHA
        ------------------------------------- */

        if (!senha) {

            return res.status(400).json({
                erro:
                    "Senha obrigatória."
            });
        }


        /* -------------------------------------
           BUSCAR USUÁRIO
        ------------------------------------- */

        console.log(
            "🔎 Procurando usuário pelo CPF..."
        );

        const [usuarios] =
            await conexao.query(
                `
                SELECT
                    id,
                    cpf,
                    senha_hash,
                    nome,
                    idade,
                    genero,
                    email
                FROM usuarios
                WHERE cpf = ?
                LIMIT 1
                `,
                [
                    cpfNormalizado
                ]
            );


        /* -------------------------------------
           USUÁRIO NÃO ENCONTRADO
        ------------------------------------- */

        if (usuarios.length === 0) {

            return res.status(401).json({
                erro:
                    "CPF ou senha incorretos."
            });
        }


        const usuarioBanco =
            usuarios[0];


        /* -------------------------------------
           SENHA EXISTE?
        ------------------------------------- */

        if (!usuarioBanco.senha_hash) {

            return res.status(401).json({
                erro:
                    "Esta conta não possui uma senha válida."
            });
        }


        /* -------------------------------------
           COMPARAR SENHA
        ------------------------------------- */

        const senhaCorreta =
            await bcrypt.compare(
                senha,
                usuarioBanco.senha_hash
            );


        if (!senhaCorreta) {

            return res.status(401).json({
                erro:
                    "CPF ou senha incorretos."
            });
        }


        /* -------------------------------------
           GERAR TOKEN
        ------------------------------------- */

        const token =
            criarToken({
                id:
                    usuarioBanco.id
            });


        /* -------------------------------------
           PERFIL COMPLETO
        ------------------------------------- */

        const perfilCompleto =
            Boolean(
                usuarioBanco.nome &&
                usuarioBanco.idade
            );


        /* -------------------------------------
           RESPOSTA
        ------------------------------------- */

        console.log(
            "✅ Login realizado. ID:",
            usuarioBanco.id
        );

        return res.json({

            mensagem:
                "Login realizado com sucesso!",

            token,

            usuario: {

                id:
                    usuarioBanco.id,

                cpf:
                    usuarioBanco.cpf,

                nome:
                    usuarioBanco.nome,

                idade:
                    usuarioBanco.idade,

                genero:
                    usuarioBanco.genero,

                email:
                    usuarioBanco.email,

                perfilCompleto:
                    perfilCompleto
            }
        });

    } catch (erro) {

        console.error(
            "❌ ERRO REAL NO LOGIN:"
        );

        console.error(
            "Mensagem:",
            erro?.message
        );

        console.error(
            "Código:",
            erro?.code
        );

        console.error(
            "Número:",
            erro?.errno
        );

        console.error(
            "SQL State:",
            erro?.sqlState
        );

        console.error(
            "SQL Message:",
            erro?.sqlMessage
        );

        console.error(
            "Stack:",
            erro?.stack
        );


        const desenvolvimento =
            process.env.NODE_ENV !== "production";


        if (
            desenvolvimento &&
            erro?.sqlMessage
        ) {

            return res.status(500).json({
                erro:
                    `Erro no banco de dados: ${erro.sqlMessage}`
            });
        }


        return res.status(500).json({
            erro:
                "Erro interno ao realizar login."
        });
    }
});


/* =========================================
   EXPORTAR ROTAS
========================================= */

module.exports = router;