const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const conexao = require("../database/conexao");

const router = express.Router();

console.log("✅ AUTH CPF CARREGADO!");

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const MAX_TENTATIVAS_RECUPERACAO = 3;

const EXPIRACAO_TOKEN_RECUPERACAO = "10m";


/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

/**
 * Remove pontos, traços e qualquer caractere
 * que não seja número.
 */
function normalizarCPF(cpf) {

    return String(cpf || "").replace(/\D/g, "");

}


/**
 * Valida CPF.
 */
function validarCPF(cpf) {

    cpf = normalizarCPF(cpf);


    if (cpf.length !== 11) {

        return false;

    }


    // Impede CPFs como:
    // 11111111111
    // 22222222222
    // etc.

    if (/^(\d)\1+$/.test(cpf)) {

        return false;

    }


    let soma = 0;


    // Primeiro dígito verificador

    for (let i = 0; i < 9; i++) {

        soma +=
            Number(cpf[i]) *
            (10 - i);

    }


    let resto =
        (soma * 10) % 11;


    if (resto === 10) {

        resto = 0;

    }


    if (
        resto !==
        Number(cpf[9])
    ) {

        return false;

    }


    // Segundo dígito verificador

    soma = 0;


    for (let i = 0; i < 10; i++) {

        soma +=
            Number(cpf[i]) *
            (11 - i);

    }


    resto =
        (soma * 10) % 11;


    if (resto === 10) {

        resto = 0;

    }


    return (
        resto ===
        Number(cpf[10])
    );

}


/**
 * Cria token normal de login.
 */
function criarToken(usuario) {

    const secret =
        process.env.JWT_SECRET;


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


/**
 * Cria token temporário específico
 * para redefinição de senha.
 *
 * Esse token NÃO é o mesmo token
 * utilizado para entrar normalmente
 * no sistema.
 */
function criarTokenRecuperacao(usuarioId) {

    const secret =
        process.env.JWT_SECRET;


    if (!secret) {

        throw new Error(
            "JWT_SECRET não foi configurado no arquivo .env"
        );

    }


    return jwt.sign(

        {
            id: Number(usuarioId),

            tipo: "recuperacao"

        },

        secret,

        {
            expiresIn:
                EXPIRACAO_TOKEN_RECUPERACAO
        }

    );

}


/**
 * Converte resposta de segurança para
 * um formato padronizado.
 *
 * Exemplo:
 *
 * " Lasanha "
 *
 * vira:
 *
 * "lasanha"
 */
function normalizarResposta(resposta) {

    return String(
        resposta || ""
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   CADASTRO
   POST /register
========================================================= */

router.post(
    "/register",
    async (req, res) => {

        console.log(
            "🔥 REGISTER ATINGIDO!"
        );


        try {

            const {
                cpf,
                senha,
                confirmarSenha,

                pergunta_1,
                resposta_1,

                pergunta_2,
                resposta_2,

                pergunta_3,
                resposta_3

            } = req.body;


            /* =================================================
               DADOS RECEBIDOS
            ================================================= */

            console.log(
                "📥 Dados recebidos no cadastro:",
                {

                    cpf:
                        cpf
                            ? "[informado]"
                            : "[não informado]",

                    senha:
                        senha
                            ? "[informada]"
                            : "[não informada]",

                    confirmarSenha:
                        confirmarSenha
                            ? "[informada]"
                            : "[não informada]",

                    pergunta_1:
                        pergunta_1
                            ? "[informada]"
                            : "[não informada]",

                    pergunta_2:
                        pergunta_2
                            ? "[informada]"
                            : "[não informada]",

                    pergunta_3:
                        pergunta_3
                            ? "[informada]"
                            : "[não informada]"

                }
            );


            /* =================================================
               CPF
            ================================================= */

            const cpfNormalizado =
                normalizarCPF(cpf);


            if (
                !validarCPF(
                    cpfNormalizado
                )
            ) {

                return res.status(400).json({

                    erro:
                        "CPF inválido."

                });

            }


            /* =================================================
               SENHA
            ================================================= */

            if (
                !senha ||
                !confirmarSenha
            ) {

                return res.status(400).json({

                    erro:
                        "Senha e confirmação de senha são obrigatórias."

                });

            }


            if (
                typeof senha !==
                "string"
            ) {

                return res.status(400).json({

                    erro:
                        "Senha inválida."

                });

            }


            if (
                senha.length < 6
            ) {

                return res.status(400).json({

                    erro:
                        "A senha deve ter pelo menos 6 caracteres."

                });

            }


            if (
                senha !==
                confirmarSenha
            ) {

                return res.status(400).json({

                    erro:
                        "As senhas não coincidem."

                });

            }


            /* =================================================
               PERGUNTAS DE SEGURANÇA
            ================================================= */

            if (
                !pergunta_1 ||
                !resposta_1 ||
                !pergunta_2 ||
                !resposta_2 ||
                !pergunta_3 ||
                !resposta_3
            ) {

                return res.status(400).json({

                    erro:
                        "As três perguntas e respostas de segurança são obrigatórias."

                });

            }


            const resposta1Normalizada =
                normalizarResposta(
                    resposta_1
                );


            const resposta2Normalizada =
                normalizarResposta(
                    resposta_2
                );


            const resposta3Normalizada =
                normalizarResposta(
                    resposta_3
                );


            if (
                !resposta1Normalizada ||
                !resposta2Normalizada ||
                !resposta3Normalizada
            ) {

                return res.status(400).json({

                    erro:
                        "As respostas de segurança não podem estar vazias."

                });

            }


            /* =================================================
               VERIFICAR CPF EXISTENTE
            ================================================= */

            console.log(
                "🔎 Verificando CPF no banco..."
            );


            const [
                usuariosExistentes
            ] =
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


            if (
                usuariosExistentes.length > 0
            ) {

                console.log(
                    "⚠️ CPF já cadastrado."
                );


                return res.status(409).json({

                    erro:
                        "Este CPF já possui uma conta."

                });

            }


            /* =================================================
               CRIPTOGRAFAR SENHA
            ================================================= */

            console.log(
                "🔐 Criptografando senha..."
            );


            const senhaHash =
                await bcrypt.hash(
                    senha,
                    10
                );


            /* =================================================
               CRIPTOGRAFAR RESPOSTAS
            ================================================= */

            console.log(
                "🔐 Criptografando respostas de segurança..."
            );


            const resposta1Hash =
                await bcrypt.hash(
                    resposta1Normalizada,
                    10
                );


            const resposta2Hash =
                await bcrypt.hash(
                    resposta2Normalizada,
                    10
                );


            const resposta3Hash =
                await bcrypt.hash(
                    resposta3Normalizada,
                    10
                );


            /* =================================================
               INSERIR USUÁRIO
            ================================================= */

            console.log(
                "💾 Inserindo usuário no banco..."
            );


            const [
                resultado
            ] =
                await conexao.query(

                    `
                    INSERT INTO usuarios
                    (
                        cpf,
                        senha_hash,

                        pergunta_1,
                        resposta_1_hash,

                        pergunta_2,
                        resposta_2_hash,

                        pergunta_3,
                        resposta_3_hash,

                        recuperacao_tentativas,
                        recuperacao_bloqueada
                    )
                    VALUES
                    (
                        ?,
                        ?,

                        ?,
                        ?,

                        ?,
                        ?,

                        ?,
                        ?,

                        0,
                        FALSE
                    )
                    `,

                    [

                        cpfNormalizado,

                        senhaHash,

                        pergunta_1,
                        resposta1Hash,

                        pergunta_2,
                        resposta2Hash,

                        pergunta_3,
                        resposta3Hash

                    ]

                );


            const novoId =
                resultado.insertId;


            console.log(
                "✅ Usuário criado. ID:",
                novoId
            );


            /* =================================================
               GERAR TOKEN
            ================================================= */

            const token =
                criarToken({

                    id:
                        novoId

                });


            /* =================================================
               RESPOSTA
            ================================================= */

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


            /* =============================================
               CPF DUPLICADO
            ============================================= */

            if (
                erro?.code ===
                    "ER_DUP_ENTRY" ||
                erro?.errno ===
                    1062
            ) {

                return res.status(409).json({

                    erro:
                        "Este CPF já possui uma conta."

                });

            }


            /* =============================================
               ERRO JWT
            ============================================= */

            if (
                erro?.message &&
                erro.message.includes(
                    "JWT_SECRET"
                )
            ) {

                return res.status(500).json({

                    erro:
                        "JWT_SECRET não está configurado no servidor."

                });

            }


            /* =============================================
               ERRO DE BANCO EM DESENVOLVIMENTO
            ============================================= */

            const desenvolvimento =
                process.env.NODE_ENV !==
                "production";


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
                    "Erro interno ao criar a conta."

            });

        }

    }
);


/* =========================================================
   LOGIN
   POST /login
========================================================= */

router.post(
    "/login",
    async (req, res) => {

        console.log(
            "🔐 LOGIN ATINGIDO!"
        );


        try {

            const {
                cpf,
                senha
            } = req.body;


            /* =================================================
               CPF
            ================================================= */

            const cpfNormalizado =
                normalizarCPF(cpf);


            if (
                !validarCPF(
                    cpfNormalizado
                )
            ) {

                return res.status(400).json({

                    erro:
                        "CPF inválido."

                });

            }


            /* =================================================
               SENHA
            ================================================= */

            if (!senha) {

                return res.status(400).json({

                    erro:
                        "Senha obrigatória."

                });

            }


            /* =================================================
               BUSCAR USUÁRIO
            ================================================= */

            console.log(
                "🔎 Procurando usuário pelo CPF..."
            );


            const [
                usuarios
            ] =
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


            /* =================================================
               USUÁRIO NÃO ENCONTRADO
            ================================================= */

            if (
                usuarios.length === 0
            ) {

                return res.status(401).json({

                    erro:
                        "CPF ou senha incorretos."

                });

            }


            const usuarioBanco =
                usuarios[0];


            /* =================================================
               SENHA EXISTE?
            ================================================= */

            if (
                !usuarioBanco.senha_hash
            ) {

                return res.status(401).json({

                    erro:
                        "Esta conta não possui uma senha válida."

                });

            }


            /* =================================================
               COMPARAR SENHA
            ================================================= */

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


            /* =================================================
               GERAR TOKEN
            ================================================= */

            const token =
                criarToken({

                    id:
                        usuarioBanco.id

                });


            /* =================================================
               PERFIL COMPLETO
            ================================================= */

            const perfilCompleto =
                Boolean(

                    usuarioBanco.nome &&
                    usuarioBanco.idade

                );


            console.log(
                "✅ Login realizado. ID:",
                usuarioBanco.id
            );


            /* =================================================
               RESPOSTA
            ================================================= */

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
                process.env.NODE_ENV !==
                "production";


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

    }
);


/* =========================================================
   RECUPERAÇÃO DE SENHA
   ETAPA 1
   POST /forgot-password

   Recebe o CPF e retorna as perguntas.
========================================================= */

router.post(
    "/forgot-password",
    async (req, res) => {

        console.log(
            "🔑 RECUPERAÇÃO DE SENHA ATINGIDA!"
        );


        try {

            const {
                cpf
            } = req.body;


            /* =================================================
               NORMALIZAR CPF
            ================================================= */

            const cpfNormalizado =
                normalizarCPF(cpf);


            if (
                !validarCPF(
                    cpfNormalizado
                )
            ) {

                return res.status(400).json({

                    erro:
                        "CPF inválido."

                });

            }


            /* =================================================
               BUSCAR USUÁRIO
            ================================================= */

            const [
                usuarios
            ] =
                await conexao.query(

                    `
                    SELECT
                        id,
                        cpf,
                        pergunta_1,
                        pergunta_2,
                        pergunta_3,
                        recuperacao_tentativas,
                        recuperacao_bloqueada
                    FROM usuarios
                    WHERE cpf = ?
                    LIMIT 1
                    `,

                    [
                        cpfNormalizado
                    ]

                );


            /* =================================================
               CPF NÃO ENCONTRADO
            ================================================= */

            if (
                usuarios.length === 0
            ) {

                return res.status(404).json({

                    erro:
                        "Não foi possível iniciar a recuperação com os dados informados."

                });

            }


            const usuario =
                usuarios[0];


            /* =================================================
               VERIFICAR BLOQUEIO
            ================================================= */

            if (
                usuario.recuperacao_bloqueada
            ) {

                return res.status(423).json({

                    bloqueado:
                        true,

                    erro:
                        "A recuperação automática desta conta foi bloqueada após três tentativas. Entre em contato com o SAC."

                });

            }


            /* =================================================
               RETORNAR PERGUNTAS
            ================================================= */

            return res.json({

                mensagem:
                    "CPF encontrado.",

                perguntas: {

                    pergunta_1:
                        usuario.pergunta_1,

                    pergunta_2:
                        usuario.pergunta_2,

                    pergunta_3:
                        usuario.pergunta_3

                },

                tentativasRestantes:
                    Math.max(

                        0,

                        MAX_TENTATIVAS_RECUPERACAO -
                        Number(
                            usuario.recuperacao_tentativas || 0
                        )

                    )

            });


        } catch (erro) {

            console.error(
                "❌ ERRO NA RECUPERAÇÃO:"
            );

            console.error(
                erro
            );


            return res.status(500).json({

                erro:
                    "Erro interno ao iniciar a recuperação."

            });

        }

    }
);


/* =========================================================
   RECUPERAÇÃO DE SENHA
   ETAPA 2
   POST /verify-recovery

   Compara as 3 respostas.
========================================================= */

router.post(
    "/verify-recovery",
    async (req, res) => {

        console.log(
            "🔐 VERIFICANDO PERGUNTAS DE SEGURANÇA..."
        );


        try {

            const {

                cpf,

                resposta_1,
                resposta_2,
                resposta_3

            } = req.body;


            /* =================================================
               CPF
            ================================================= */

            const cpfNormalizado =
                normalizarCPF(cpf);


            if (
                !validarCPF(
                    cpfNormalizado
                )
            ) {

                return res.status(400).json({

                    erro:
                        "CPF inválido."

                });

            }


            /* =================================================
               RESPOSTAS
            ================================================= */

            if (
                !resposta_1 ||
                !resposta_2 ||
                !resposta_3
            ) {

                return res.status(400).json({

                    erro:
                        "As três respostas são obrigatórias."

                });

            }


            const resposta1Normalizada =
                normalizarResposta(
                    resposta_1
                );


            const resposta2Normalizada =
                normalizarResposta(
                    resposta_2
                );


            const resposta3Normalizada =
                normalizarResposta(
                    resposta_3
                );


            /* =================================================
               BUSCAR USUÁRIO
            ================================================= */

            const [
                usuarios
            ] =
                await conexao.query(

                    `
                    SELECT
                        id,
                        resposta_1_hash,
                        resposta_2_hash,
                        resposta_3_hash,
                        recuperacao_tentativas,
                        recuperacao_bloqueada
                    FROM usuarios
                    WHERE cpf = ?
                    LIMIT 1
                    `,

                    [
                        cpfNormalizado
                    ]

                );


            if (
                usuarios.length === 0
            ) {

                return res.status(404).json({

                    erro:
                        "Não foi possível realizar a recuperação."

                });

            }


            const usuario =
                usuarios[0];


            /* =================================================
               VERIFICAR BLOQUEIO
            ================================================= */

            if (
                usuario.recuperacao_bloqueada
            ) {

                return res.status(423).json({

                    bloqueado:
                        true,

                    erro:
                        "A recuperação automática desta conta está bloqueada. Entre em contato com o SAC."

                });

            }


            /* =================================================
               TENTATIVAS ATUAIS
            ================================================= */

            const tentativasAtuais =
                Number(
                    usuario.recuperacao_tentativas || 0
                );


            if (
                tentativasAtuais >=
                MAX_TENTATIVAS_RECUPERACAO
            ) {

                await conexao.query(

                    `
                    UPDATE usuarios
                    SET recuperacao_bloqueada = TRUE
                    WHERE id = ?
                    `,

                    [
                        usuario.id
                    ]

                );


                return res.status(423).json({

                    bloqueado:
                        true,

                    erro:
                        "Você atingiu o limite de tentativas. Entre em contato com o SAC."

                });

            }


            /* =================================================
               COMPARAR RESPOSTAS
            ================================================= */

            const resposta1Correta =
                await bcrypt.compare(

                    resposta1Normalizada,

                    usuario.resposta_1_hash

                );


            const resposta2Correta =
                await bcrypt.compare(

                    resposta2Normalizada,

                    usuario.resposta_2_hash

                );


            const resposta3Correta =
                await bcrypt.compare(

                    resposta3Normalizada,

                    usuario.resposta_3_hash

                );


            const respostasCorretas =
                resposta1Correta &&
                resposta2Correta &&
                resposta3Correta;


            /* =================================================
               RESPOSTAS ERRADAS
            ================================================= */

            if (
                !respostasCorretas
            ) {

                const novasTentativas =
                    tentativasAtuais + 1;


                const bloquear =
                    novasTentativas >=
                    MAX_TENTATIVAS_RECUPERACAO;


                await conexao.query(

                    `
                    UPDATE usuarios
                    SET
                        recuperacao_tentativas = ?,
                        recuperacao_bloqueada = ?
                    WHERE id = ?
                    `,

                    [

                        novasTentativas,

                        bloquear,

                        usuario.id

                    ]

                );


                console.log(

                    "⚠️ Respostas incorretas. Tentativa:",

                    novasTentativas

                );


                if (bloquear) {

                    return res.status(423).json({

                        bloqueado:
                            true,

                        tentativasRestantes:
                            0,

                        erro:
                            "Você errou as respostas três vezes. A recuperação automática foi bloqueada. Entre em contato com o SAC."

                    });

                }


                return res.status(401).json({

                    bloqueado:
                        false,

                    tentativasRestantes:
                        MAX_TENTATIVAS_RECUPERACAO -
                        novasTentativas,

                    erro:
                        "Uma ou mais respostas estão incorretas."

                });

            }


            /* =================================================
               RESPOSTAS CORRETAS
            ================================================= */

            console.log(
                "✅ Perguntas de segurança confirmadas."
            );


            /* =================================================
               GERAR TOKEN DE RECUPERAÇÃO
            ================================================= */

            const resetToken =
                criarTokenRecuperacao(
                    usuario.id
                );


            return res.json({

                mensagem:
                    "Identidade confirmada.",

                resetToken

            });


        } catch (erro) {

            console.error(
                "❌ ERRO AO VERIFICAR RECUPERAÇÃO:"
            );

            console.error(
                erro
            );


            return res.status(500).json({

                erro:
                    "Erro interno ao verificar as respostas."

            });

        }

    }
);


/* =========================================================
   RECUPERAÇÃO DE SENHA
   ETAPA 3
   POST /reset-password

   Recebe o token temporário e a nova senha.
========================================================= */

router.post(
    "/reset-password",
    async (req, res) => {

        console.log(
            "🔑 REDEFINIÇÃO DE SENHA ATINGIDA!"
        );


        try {

            const {

                resetToken,

                novaSenha,

                confirmarNovaSenha

            } = req.body;


            /* =================================================
               VERIFICAR DADOS
            ================================================= */

            if (
                !resetToken
            ) {

                return res.status(401).json({

                    erro:
                        "Token de recuperação não informado."

                });

            }


            if (
                !novaSenha ||
                !confirmarNovaSenha
            ) {

                return res.status(400).json({

                    erro:
                        "Nova senha e confirmação são obrigatórias."

                });

            }


            if (
                typeof novaSenha !==
                "string"
            ) {

                return res.status(400).json({

                    erro:
                        "Nova senha inválida."

                });

            }


            if (
                novaSenha.length < 6
            ) {

                return res.status(400).json({

                    erro:
                        "A nova senha deve ter pelo menos 6 caracteres."

                });

            }


            if (
                novaSenha !==
                confirmarNovaSenha
            ) {

                return res.status(400).json({

                    erro:
                        "As novas senhas não coincidem."

                });

            }


            /* =================================================
               VALIDAR TOKEN
            ================================================= */

            const secret =
                process.env.JWT_SECRET;


            if (!secret) {

                throw new Error(
                    "JWT_SECRET não foi configurado no arquivo .env"
                );

            }


            let dados;


            try {

                dados =
                    jwt.verify(

                        resetToken,

                        secret

                    );

            } catch (erroToken) {

                return res.status(401).json({

                    erro:
                        "O código de recuperação expirou ou é inválido. Inicie a recuperação novamente."

                });

            }


            /* =================================================
               VERIFICAR TIPO DO TOKEN
            ================================================= */

            if (
                dados.tipo !==
                "recuperacao"
            ) {

                return res.status(401).json({

                    erro:
                        "Token de recuperação inválido."

                });

            }


            const usuarioId =
                Number(
                    dados.id
                );


            if (
                !usuarioId
            ) {

                return res.status(401).json({

                    erro:
                        "Token de recuperação inválido."

                });

            }


            /* =================================================
               BUSCAR USUÁRIO
            ================================================= */

            const [
                usuarios
            ] =
                await conexao.query(

                    `
                    SELECT
                        id,
                        recuperacao_bloqueada
                    FROM usuarios
                    WHERE id = ?
                    LIMIT 1
                    `,

                    [
                        usuarioId
                    ]

                );


            if (
                usuarios.length === 0
            ) {

                return res.status(404).json({

                    erro:
                        "Usuário não encontrado."

                });

            }


            const usuario =
                usuarios[0];


            /* =================================================
               CRIPTOGRAFAR NOVA SENHA
            ================================================= */

            const novaSenhaHash =
                await bcrypt.hash(

                    novaSenha,

                    10

                );


            /* =================================================
               ATUALIZAR SENHA
            ================================================= */

            await conexao.query(

                `
                UPDATE usuarios
                SET
                    senha_hash = ?,
                    recuperacao_tentativas = 0,
                    recuperacao_bloqueada = FALSE
                WHERE id = ?
                `,

                [

                    novaSenhaHash,

                    usuario.id

                ]

            );


            console.log(

                "✅ SENHA ALTERADA COM SUCESSO. ID:",

                usuario.id

            );


            /* =================================================
               GERAR NOVO TOKEN DE LOGIN
            ================================================= */

            const novoToken =
                criarToken({

                    id:
                        usuario.id

                });


            /* =================================================
               RESPOSTA
            ================================================= */

            return res.json({

                mensagem:
                    "Senha redefinida com sucesso!",

                token:
                    novoToken

            });


        } catch (erro) {

            console.error(
                "❌ ERRO AO REDEFINIR SENHA:"
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
                "SQL Message:",
                erro?.sqlMessage
            );


            console.error(
                "Stack:",
                erro?.stack
            );


            return res.status(500).json({

                erro:
                    "Erro interno ao redefinir a senha."

            });

        }

    }
);


/* =========================================================
   EXPORTAR
========================================================= */

module.exports = router;
