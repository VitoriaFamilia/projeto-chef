const express = require("express");

const conexao =
    require("../database/conexao");

const autenticar =
    require("../middleware/authMiddleware");

const router =
    express.Router();


// =====================================================
// BUSCAR MEU PERFIL
// =====================================================

router.get(
    "/me",
    autenticar,
    async (req, res) => {

        try {

            const [usuarios] =
                await conexao.query(
                    `
                    SELECT
                        id,
                        cpf,
                        nome,
                        idade,
                        genero,
                        email
                    FROM usuarios
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        req.usuarioId
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


            usuario.perfilCompleto =
                Boolean(
                    usuario.nome &&
                    usuario.idade
                );


            res.json(
                usuario
            );


        } catch (erro) {

            console.error(
                "❌ Erro ao buscar perfil:",
                erro
            );


            res.status(500).json({
                erro:
                    "Erro ao buscar perfil."
            });

        }

    }
);


// =====================================================
// ALTERAR MEU PERFIL
// =====================================================

router.put(
    "/me",
    autenticar,
    async (req, res) => {

        try {

            const {
                nome,
                idade,
                genero,
                email
            } = req.body;


            if (
                !nome ||
                !idade
            ) {

                return res.status(400).json({
                    erro:
                        "Nome e idade são obrigatórios."
                });

            }


            const idadeNumerica =
                Number(idade);


            if (
                !Number.isInteger(
                    idadeNumerica
                ) ||
                idadeNumerica < 1 ||
                idadeNumerica > 120
            ) {

                return res.status(400).json({
                    erro:
                        "Informe uma idade válida."
                });

            }


            await conexao.query(
                `
                UPDATE usuarios
                SET
                    nome = ?,
                    idade = ?,
                    genero = ?,
                    email = ?
                WHERE id = ?
                `,
                [
                    nome.trim(),
                    idadeNumerica,
                    genero || null,
                    email || null,
                    req.usuarioId
                ]
            );


            res.json({

                mensagem:
                    "Perfil atualizado com sucesso!"

            });


        } catch (erro) {

            console.error(
                "❌ Erro ao atualizar perfil:",
                erro
            );


            res.status(500).json({
                erro:
                    "Erro ao salvar perfil."
            });

        }

    }
);


// =====================================================
// EXCLUIR MINHA CONTA
// =====================================================

router.delete(
    "/me",
    autenticar,
    async (req, res) => {

        const conexaoIndividual =
            await conexao.getConnection();


        try {

            await conexaoIndividual.beginTransaction();


            // Apagar somente o histórico do usuário

            await conexaoIndividual.query(
                `
                DELETE FROM historico
                WHERE usuario_id = ?
                `,
                [
                    req.usuarioId
                ]
            );


            // Apagar somente o próprio usuário

            const [resultado] =
                await conexaoIndividual.query(
                    `
                    DELETE FROM usuarios
                    WHERE id = ?
                    `,
                    [
                        req.usuarioId
                    ]
                );


            if (
                resultado.affectedRows === 0
            ) {

                await conexaoIndividual.rollback();

                return res.status(404).json({
                    erro:
                        "Usuário não encontrado."
                });

            }


            await conexaoIndividual.commit();


            res.json({

                mensagem:
                    "Conta excluída com sucesso."

            });


        } catch (erro) {

            await conexaoIndividual.rollback();


            console.error(
                "❌ Erro ao excluir conta:",
                erro
            );


            res.status(500).json({
                erro:
                    "Não foi possível excluir a conta."
            });


        } finally {

            conexaoIndividual.release();

        }

    }
);


module.exports = router;