const express = require('express');
const router = express.Router();

const conexao = require('../database/conexao');

router.get('/', async (req, res) => {
    try {
        const [restaurantes] = await conexao.query(
            'SELECT * FROM restaurantes'
        );

        res.json(restaurantes);

    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: 'Erro ao buscar restaurantes'
        });
    }
});

module.exports = router;