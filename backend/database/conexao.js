const mysql = require("mysql2/promise");
require("dotenv").config();

const obrigatorias = [
    "DB_HOST",
    "DB_USER",
    "DB_NAME",
    "DB_PORT"
];

const faltando = obrigatorias.filter(
    nome => !process.env[nome]
);

if (faltando.length > 0) {
    console.error(
        "❌ Variáveis do banco ausentes:",
        faltando.join(", ")
    );
}

const conexao = mysql.createPool({

    host: process.env.DB_HOST,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD || "",

    database: process.env.DB_NAME,

    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});

(async () => {

    try {

        const [resultado] =
            await conexao.query(
                "SELECT 1 AS ok"
            );

        if (resultado?.[0]?.ok === 1) {
            console.log(
                "✅ Conexão com MySQL estabelecida."
            );
        }

    } catch (erro) {

        console.error(
            "❌ ERRO NA CONEXÃO COM MYSQL:",
            {
                message: erro?.message,
                code: erro?.code,
                errno: erro?.errno,
                sqlState: erro?.sqlState,
                sqlMessage: erro?.sqlMessage
            }
        );

    }

})();

module.exports = conexao;