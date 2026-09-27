const express = require("express");

const conexao =
    require("../database/conexao");

const autenticar =
    require("../middleware/authMiddleware");

const router =
    express.Router();

console.log(
    "✅ Rota de histórico carregada!"
);


// =====================================================
// SALVAR HISTÓRICO
// =====================================================

router.post(
    "/",
    autenticar,
    async (req, res) => {

        try {

            const {
                restaurante_id,
                cep,
                humor,
                tipo,
                orcamento
            } = req.body;


            if (
                !restaurante_id
            ) {

                return res.status(400).json({
                    erro:
                        "Restaurante não informado."
                });

            }


            const [resultado] =
                await conexao.query(
                    `
                    INSERT INTO historico
                    (
                        usuario_id,
                        restaurante_id,
                        cep,
                        humor,
                        tipo,
                        orcamento
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        req.usuarioId,
                        restaurante_id,
                        cep || null,
                        humor || null,
                        tipo || null,
                        orcamento || null
                    ]
                );


            res.status(201).json({

                mensagem:
                    "Histórico salvo com sucesso!",

                id:
                    resultado.insertId

            });


        } catch (erro) {

            console.error(
                "❌ Erro ao salvar histórico:",
                erro
            );


            res.status(500).json({
                erro:
                    "Erro ao salvar histórico."
            });

        }

    }
);


// =====================================================
// BUSCAR MEU HISTÓRICO
// =====================================================

router.get(
    "/",
    autenticar,
    async (req, res) => {

        try {

            const [historico] =
                await conexao.query(
                    `
                    SELECT
                        h.id,
                        h.usuario_id,
                        h.restaurante_id,
                        r.nome AS restaurante,
                        h.cep,
                        h.humor,
                        h.tipo,
                        h.orcamento,
                        h.data
                    FROM historico h

                    INNER JOIN restaurantes r
                        ON h.restaurante_id =
                           r.id

                    WHERE h.usuario_id = ?

                    ORDER BY h.data DESC
                    `,
                    [
                        req.usuarioId
                    ]
                );


            res.json(
                historico
            );


        } catch (erro) {

            console.error(
                "❌ Erro ao buscar histórico:",
                erro
            );


            res.status(500).json({
                erro:
                    "Erro ao buscar histórico."
            });

        }

    }
);


module.exports = router;