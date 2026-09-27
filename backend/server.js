const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app =
    express();

const PORT =
    3000;


// =====================================================
// CONFIGURAÇÕES
// =====================================================

app.use(
    cors()
);

app.use(
    express.json()
);


// =====================================================
// TESTE DA API
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            mensagem:
                "API Food Humor funcionando!"
        });

    }
);


// =====================================================
// RESTAURANTES
// =====================================================

const restaurantesRoutes =
    require("./routes/restaurantes");

app.use(
    "/api/restaurantes",
    restaurantesRoutes
);


// =====================================================
// HISTÓRICO
// =====================================================

const historicoRoutes =
    require("./routes/historico");

app.use(
    "/api/historico",
    historicoRoutes
);


// =====================================================
// USUÁRIOS
// =====================================================

const usuariosRoutes =
    require("./routes/usuarios");

app.use(
    "/api/usuarios",
    usuariosRoutes
);


// =====================================================
// AUTENTICAÇÃO
// =====================================================

const authRoutes =
    require("./routes/auth");

app.use(
    "/api/auth",
    authRoutes
);


// =====================================================
// ROTA NÃO ENCONTRADA
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({
            erro:
                "Rota não encontrada."
        });

    }
);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "🍽️ FOOD HUMOR API"
        );

        console.log(
            `🚀 Servidor rodando em http://localhost:${PORT}`
        );

        console.log(
            "========================================"
        );

    }
);