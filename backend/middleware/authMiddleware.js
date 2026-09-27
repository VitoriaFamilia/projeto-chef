const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {

    try {

        const autorizacao =
            req.headers.authorization;

        if (!autorizacao) {
            return res.status(401).json({
                erro: "Token não informado."
            });
        }

        const partes =
            autorizacao.split(" ");

        if (
            partes.length !== 2 ||
            partes[0] !== "Bearer"
        ) {
            return res.status(401).json({
                erro: "Formato de token inválido."
            });
        }

        const token =
            partes[1];

        const dados =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.usuarioId =
            Number(dados.id);

        next();

    } catch (erro) {

        console.error(
            "❌ Erro na autenticação:",
            erro.message
        );

        return res.status(401).json({
            erro:
                "Sessão inválida ou expirada."
        });
    }
}

module.exports = autenticar;