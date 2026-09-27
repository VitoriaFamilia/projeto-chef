// =====================================================
// CONFIGURAÇÃO
// =====================================================

const API_URL =
    "http://localhost:3000/api";


const TOKEN_KEY =
    "foodhumor_token";


const USER_KEY =
    "foodhumor_usuario";


const CODIGO_IBGE_SJM =
    "3305109";


// =====================================================
// VARIÁVEIS
// =====================================================

let restaurantes = [];

let historico = [];

let regiaoAtual = "";

let cepAtual = "";

let localizacaoValida = false;

let usuarioAtual = null;


// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const acesso =
            await verificarAcesso();


        if (!acesso) {

            return;

        }


        configurarEventos();

        await carregarRestaurantes();

        await carregarHistorico();

    }
);


// =====================================================
// VERIFICAR ACESSO
// =====================================================

async function verificarAcesso() {

    const token =
        localStorage.getItem(
            TOKEN_KEY
        );


    if (!token) {

        window.location.href =
            "login.html";

        return false;

    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/usuarios/me`,
                {

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return false;

        }


        const usuario =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                usuario.erro ||
                "Não foi possível validar a sessão."
            );

        }


        usuarioAtual =
            usuario.id;


        localStorage.setItem(
            USER_KEY,
            JSON.stringify(usuario)
        );


        // -----------------------------------------------
        // PERFIL OBRIGATÓRIO
        // -----------------------------------------------

        if (
            !usuario.perfilCompleto
        ) {

            window.location.href =
                "perfil.html";

            return false;

        }


        return true;


    } catch (erro) {

        console.error(
            "❌ Erro na sessão:",
            erro
        );


        localStorage.removeItem(
            TOKEN_KEY
        );

        localStorage.removeItem(
            USER_KEY
        );


        window.location.href =
            "login.html";


        return false;

    }

}


// =====================================================
// HEADERS AUTENTICADOS
// =====================================================

function headersAutenticacao() {

    const token =
        localStorage.getItem(
            TOKEN_KEY
        );


    return {

        "Authorization":
            `Bearer ${token}`

    };

}


// =====================================================
// EVENTOS
// =====================================================

function configurarEventos() {

    const searchForm =
        document.getElementById(
            "search-form"
        );


    const cepInput =
        document.getElementById(
            "cep"
        );


    const btnBuscarCEP =
        document.getElementById(
            "btn-buscar-cep"
        );


    const btnGPS =
        document.getElementById(
            "btn-gps"
        );


    const profileForm =
        document.getElementById(
            "profile-form"
        );


    const btnExcluirConta =
        document.getElementById(
            "btn-excluir-conta"
        );


    if (searchForm) {

        searchForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                await generateSuggestion();

            }
        );

    }


    if (cepInput) {

        cepInput.addEventListener(
            "input",
            () => {

                mascaraCEP(
                    cepInput
                );

            }
        );

    }


    if (btnBuscarCEP) {

        btnBuscarCEP.addEventListener(
            "click",
            buscarCEP
        );

    }


    if (btnGPS) {

        btnGPS.addEventListener(
            "click",
            getLocation
        );

    }


    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                await salvarPerfil();

            }
        );

    }


    if (btnExcluirConta) {

        btnExcluirConta.addEventListener(
            "click",
            excluirConta
        );

    }

}


// =====================================================
// TROCAR ABAS
// =====================================================

function switchTab(
    tabId,
    botao
) {

    document
        .querySelectorAll(".tab-btn")
        .forEach(
            btn => {

                btn.classList.remove(
                    "active"
                );

            }
        );


    document
        .querySelectorAll(".tab-content")
        .forEach(
            content => {

                content.classList.remove(
                    "active"
                );

            }
        );


    botao.classList.add(
        "active"
    );


    const aba =
        document.getElementById(
            "tab-" + tabId
        );


    if (aba) {

        aba.classList.add(
            "active"
        );

    }


    if (
        tabId === "historico"
    ) {

        carregarHistorico();

    }


    if (
        tabId === "perfil"
    ) {

        carregarPerfilNaAba();

    }

}


// =====================================================
// NORMALIZAR TEXTO
// =====================================================

function normalizarTexto(
    texto
) {

    return String(texto || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();

}


// =====================================================
// CARREGAR RESTAURANTES
// =====================================================

async function carregarRestaurantes() {

    const resultBox =
        document.getElementById(
            "result-box"
        );


    try {

        const resposta =
            await fetch(
                `${API_URL}/restaurantes`
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar restaurantes."
            );

        }


        restaurantes =
            await resposta.json();


        console.log(
            "✅ Restaurantes carregados:",
            restaurantes
        );


    } catch (erro) {

        console.error(
            "❌ Erro ao carregar restaurantes:",
            erro
        );


        if (resultBox) {

            resultBox.innerHTML = `

                <div>

                    <div class="result-card-title">
                        ⚠️ Erro ao conectar com o servidor
                    </div>

                    <div>
                        Verifique se o Node.js está rodando.
                    </div>

                </div>

            `;

        }

    }

}


// =====================================================
// CARREGAR HISTÓRICO
// =====================================================

async function carregarHistorico() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/historico`,
                {

                    headers:
                        headersAutenticacao()

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return;

        }


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar histórico."
            );

        }


        historico =
            await resposta.json();


        mostrarHistoricoNaTela();


    } catch (erro) {

        console.error(
            "❌ Erro no histórico:",
            erro
        );

    }

}


// =====================================================
// MÁSCARA CEP
// =====================================================

function mascaraCEP(
    input
) {

    let value =
        input.value
            .replace(/\D/g, "");


    localizacaoValida =
        false;

    cepAtual = "";

    regiaoAtual = "";


    if (
        value.length > 5
    ) {

        value =
            value.substring(
                0,
                5
            ) +
            "-" +
            value.substring(
                5,
                8
            );

    }


    input.value =
        value;

}


// =====================================================
// BUSCAR CEP
// =====================================================

async function buscarCEP() {

    const inputCEP =
        document.getElementById(
            "cep"
        );


    const statusDiv =
        document.getElementById(
            "location-status"
        );


    const cep =
        inputCEP.value.replace(
            /\D/g,
            ""
        );


    localizacaoValida =
        false;

    cepAtual = "";

    regiaoAtual = "";


    if (
        cep.length !== 8
    ) {

        statusDiv.innerText =
            "⚠️ Digite um CEP válido com 8 dígitos.";

        return;

    }


    statusDiv.innerText =
        "🔍 Consultando ViaCEP...";


    try {

        const resposta =
            await fetch(
                `https://viacep.com.br/ws/${cep}/json/`
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao consultar ViaCEP."
            );

        }


        const data =
            await resposta.json();


        if (
            data.erro
        ) {

            statusDiv.innerText =
                "❌ CEP não encontrado.";

            return;

        }


        const localidade =
            normalizarTexto(
                data.localidade
            );


        const uf =
            normalizarTexto(
                data.uf
            );


        const ibge =
            String(
                data.ibge || ""
            ).trim();


        const pertenceASJM =
            ibge === CODIGO_IBGE_SJM &&
            uf === "rj" &&
            localidade ===
                "sao joao de meriti";


        if (!pertenceASJM) {

            statusDiv.innerHTML = `

                ❌ <strong>
                    Localização fora do recorte.
                </strong>

                <br><br>

                O FoodHumor atende exclusivamente
                estabelecimentos de
                São João de Meriti/RJ.

                <br><br>

                Local informado:
                ${data.localidade || ""}
                /
                ${data.uf || ""}

            `;

            return;

        }


        localizacaoValida =
            true;


        cepAtual =
            data.cep ||
            inputCEP.value;


        regiaoAtual =
            `${data.bairro || "Bairro não informado"}, São João de Meriti`;


        statusDiv.innerHTML = `

            ✅ <strong>
                Localização válida!
            </strong>

            <br>

            ${data.bairro || "Bairro não informado"}
            -
            São João de Meriti/RJ

        `;


    } catch (erro) {

        console.error(
            "❌ Erro no ViaCEP:",
            erro
        );


        statusDiv.innerText =
            "❌ Erro ao consultar o CEP.";

    }

}


// =====================================================
// GPS
// =====================================================

function getLocation() {

    const statusDiv =
        document.getElementById(
            "location-status"
        );


    if (
        !navigator.geolocation
    ) {

        statusDiv.innerText =
            "❌ GPS não suportado.";

        return;

    }


    statusDiv.innerText =
        "📍 Obtendo localização...";


    navigator.geolocation.getCurrentPosition(

        position => {

            console.log(
                "Latitude:",
                position.coords.latitude
            );


            console.log(
                "Longitude:",
                position.coords.longitude
            );


            localizacaoValida =
                false;

            cepAtual = "";

            regiaoAtual = "";


            statusDiv.innerHTML = `

                ✅ <strong>
                    Localização obtida.
                </strong>

                <br><br>

                Confirme a região usando
                seu CEP de São João de Meriti.

            `;

        },

        erro => {

            console.error(
                "❌ Erro GPS:",
                erro
            );


            statusDiv.innerText =
                "❌ Não foi possível obter a localização. Utilize o CEP.";

        }

    );

}


// =====================================================
// HUMOR → CATEGORIAS
// =====================================================

function categoriasDoHumor(
    humor
) {

    const mapa = {

        cansado: [
            "comida_caseira",
            "comida_mineira",
            "boteco"
        ],

        feliz: [
            "boteco",
            "massa",
            "lanches",
            "fast_food"
        ],

        estressado: [
            "fast_food",
            "lanches",
            "massa"
        ],

        aventureiro: [
            "alemã",
            "frutos_mar",
            "massa",
            "comida_mineira"
        ],

        fome_leao: [
            "churrasco",
            "carne",
            "boteco"
        ]

    };


    return mapa[humor] || [];

}


// =====================================================
// CALCULAR PONTUAÇÃO
// =====================================================

function calcularPontuacao(
    restaurante,
    humor,
    tipoEscolhido,
    orcamento
) {

    let pontuacao = 0;


    const tipoRestaurante =
        normalizarTexto(
            restaurante.tipo
        );


    const tipoUsuario =
        normalizarTexto(
            tipoEscolhido
        );


    // -----------------------------------------------
    // CATEGORIA
    // -----------------------------------------------

    if (
        tipoUsuario !== "nenhuma" &&
        tipoRestaurante === tipoUsuario
    ) {

        pontuacao += 100;

    }


    // -----------------------------------------------
    // ORÇAMENTO
    // -----------------------------------------------

    if (
        normalizarTexto(
            restaurante.orcamento
        ) ===
        normalizarTexto(
            orcamento
        )
    ) {

        pontuacao += 30;

    } else {

        pontuacao += 5;

    }


    // -----------------------------------------------
    // HUMOR
    // -----------------------------------------------

    const categorias =
        categoriasDoHumor(
            humor
        ).map(
            normalizarTexto
        );


    const posicao =
        categorias.indexOf(
            tipoRestaurante
        );


    if (
        posicao === 0
    ) {

        pontuacao += 20;

    } else if (
        posicao === 1
    ) {

        pontuacao += 15;

    } else if (
        posicao === 2
    ) {

        pontuacao += 10;

    }


    // -----------------------------------------------
    // HISTÓRICO
    // -----------------------------------------------

    const registrosRestaurante =
        historico.filter(
            registro =>
                Number(
                    registro.restaurante_id
                ) ===
                Number(
                    restaurante.id
                )
        );


    pontuacao += Math.min(
        registrosRestaurante.length * 3,
        15
    );


    // -----------------------------------------------
    // MESMO CONTEXTO
    // -----------------------------------------------

    const mesmosContextos =
        registrosRestaurante.filter(
            registro => {

                const mesmoCep =
                    normalizarTexto(
                        registro.cep
                    ) ===
                    normalizarTexto(
                        cepAtual
                    );


                const mesmoHumor =
                    normalizarTexto(
                        registro.humor
                    ) ===
                    normalizarTexto(
                        humor
                    );


                const mesmoTipo =
                    normalizarTexto(
                        registro.tipo
                    ) ===
                    normalizarTexto(
                        tipoEscolhido
                    );


                const mesmoOrcamento =
                    normalizarTexto(
                        registro.orcamento
                    ) ===
                    normalizarTexto(
                        orcamento
                    );


                return (
                    mesmoCep &&
                    mesmoHumor &&
                    mesmoTipo &&
                    mesmoOrcamento
                );

            }
        );


    pontuacao += Math.min(
        mesmosContextos.length * 20,
        60
    );


    return pontuacao;

}


// =====================================================
// GERAR SUGESTÃO
// =====================================================

async function generateSuggestion() {

    const humor =
        document.getElementById(
            "humor"
        ).value;


    const tipo =
        document.getElementById(
            "restricao"
        ).value;


    const orcamento =
        document.getElementById(
            "orcamento"
        ).value;


    const resultBox =
        document.getElementById(
            "result-box"
        );


    // -----------------------------------------------
    // LOCALIZAÇÃO
    // -----------------------------------------------

    if (
        !localizacaoValida
    ) {

        resultBox.innerHTML = `

            <div>

                <div class="result-card-title">
                    📍 Localização necessária
                </div>

                <div>
                    Informe um CEP válido de
                    São João de Meriti.
                </div>

            </div>

        `;

        return;

    }


    // -----------------------------------------------
    // HUMOR
    // -----------------------------------------------

    if (!humor) {

        alert(
            "Selecione seu humor."
        );

        return;

    }


    // -----------------------------------------------
    // RESTAURANTES
    // -----------------------------------------------

    if (
        !Array.isArray(restaurantes) ||
        restaurantes.length === 0
    ) {

        resultBox.innerHTML = `

            <div>

                <div class="result-card-title">
                    ⚠️ Nenhum restaurante carregado
                </div>

            </div>

        `;

        return;

    }


    // -----------------------------------------------
    // SÃO JOÃO DE MERITI
    // -----------------------------------------------

    let candidatos =
        restaurantes.filter(
            restaurante =>
                normalizarTexto(
                    restaurante.cidade
                ) ===
                "sao joao de meriti"
        );


    // -----------------------------------------------
    // CATEGORIA
    // -----------------------------------------------

    if (
        tipo !== "nenhuma"
    ) {

        candidatos =
            candidatos.filter(
                restaurante =>
                    normalizarTexto(
                        restaurante.tipo
                    ) ===
                    normalizarTexto(
                        tipo
                    )
            );


        if (
            candidatos.length === 0
        ) {

            resultBox.innerHTML = `

                <div>

                    <div class="result-card-title">
                        😕 Nenhuma opção encontrada
                    </div>

                    <div>
                        Não encontramos estabelecimentos
                        dessa categoria cadastrados
                        em São João de Meriti.
                    </div>

                </div>

            `;

            return;

        }

    }


    // -----------------------------------------------
    // PONTUAR
    // -----------------------------------------------

    const candidatosPontuados =
        candidatos.map(
            restaurante => {

                return {

                    ...restaurante,

                    pontuacao:
                        calcularPontuacao(
                            restaurante,
                            humor,
                            tipo,
                            orcamento
                        ),

                    quantidadeHistorico:
                        historico.filter(
                            registro =>
                                Number(
                                    registro.restaurante_id
                                ) ===
                                Number(
                                    restaurante.id
                                )
                        ).length

                };

            }
        );


    // -----------------------------------------------
    // ORDENAR
    // -----------------------------------------------

    candidatosPontuados.sort(
        (a, b) => {

            if (
                b.pontuacao !==
                a.pontuacao
            ) {

                return (
                    b.pontuacao -
                    a.pontuacao
                );

            }


            if (
                b.quantidadeHistorico !==
                a.quantidadeHistorico
            ) {

                return (
                    b.quantidadeHistorico -
                    a.quantidadeHistorico
                );

            }


            return String(
                a.nome || ""
            ).localeCompare(
                String(
                    b.nome || ""
                ),
                "pt-BR"
            );

        }
    );


    const escolhido =
        candidatosPontuados[0];


    if (!escolhido) {

        resultBox.innerHTML = `

            <div>
                Nenhuma sugestão encontrada.
            </div>

        `;

        return;

    }


    // -----------------------------------------------
    // GOOGLE MAPS
    // -----------------------------------------------

    const termoGoogleMaps =
        `${escolhido.nome} ${escolhido.cidade}`;


    const linkGoogleMaps =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(termoGoogleMaps)}`;


    // -----------------------------------------------
    // MOSTRAR RESULTADO
    // -----------------------------------------------

    resultBox.innerHTML = `

        <div>

            <div class="result-card-title">

                <a
                    href="${linkGoogleMaps}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="google-maps-link">

                    🗺️ ${escolhido.nome}

                </a>

            </div>


            <div>
                Sugestão compatível com suas preferências.
            </div>


            <div class="result-card-detail">
                😊 Humor:
                ${obterNomeHumor(humor)}
            </div>


            <div class="result-card-detail">
                🍽️ Categoria:
                ${obterNomeCategoria(tipo)}
            </div>


            <div class="result-card-detail">
                💰 Orçamento:
                ${obterNomeOrcamento(orcamento)}
            </div>


            <div class="result-card-detail">
                📍 Região:
                ${regiaoAtual}
            </div>


            <div style="
                margin-top:10px;
                font-size:.8rem;
                color:#757575;
            ">

                🖱️ Clique no nome para abrir
                o Google Maps

            </div>

        </div>

    `;


    // -----------------------------------------------
    // SALVAR HISTÓRICO
    // -----------------------------------------------

    await salvarHistorico(
        escolhido.id,
        humor,
        tipo,
        orcamento
    );

}


// =====================================================
// NOMES
// =====================================================

function obterNomeCategoria(
    tipo
) {

    const categorias = {

        nenhuma:
            "Qualquer tipo de estabelecimento",

        massa:
            "Massas / Pizzas",

        fast_food:
            "Fast-food",

        lanches:
            "Lanches",

        boteco:
            "Boteco / Petiscos",

        churrasco:
            "Churrasco",

        carne:
            "Carnes",

        frutos_mar:
            "Peixes / Frutos do mar",

        comida_caseira:
            "Comida caseira",

        comida_mineira:
            "Comida mineira",

        alemã:
            "Comida alemã"

    };


    return (
        categorias[tipo] ||
        tipo
    );

}


function obterNomeHumor(
    humor
) {

    const humores = {

        cansado:
            "Cansado",

        feliz:
            "Feliz / Celebrativo",

        estressado:
            "Estressado",

        aventureiro:
            "Aventureiro",

        fome_leao:
            "Fome de Leão"

    };


    return (
        humores[humor] ||
        humor
    );

}


function obterNomeOrcamento(
    orcamento
) {

    const nomes = {

        economico:
            "$ Econômico",

        moderado:
            "$$ Moderado",

        premium:
            "$$$ Mais elaborado"

    };


    return (
        nomes[orcamento] ||
        orcamento
    );

}


// =====================================================
// SALVAR HISTÓRICO
// =====================================================

async function salvarHistorico(
    restauranteId,
    humor,
    tipo,
    orcamento
) {

    try {

        const resposta =
            await fetch(
                `${API_URL}/historico`,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...headersAutenticacao()

                    },

                    body:
                        JSON.stringify({

                            restaurante_id:
                                restauranteId,

                            cep:
                                cepAtual,

                            humor:
                                humor,

                            tipo:
                                tipo,

                            orcamento:
                                orcamento

                        })

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return;

        }


        const data =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                data.erro ||
                "Erro ao salvar histórico."
            );

        }


        console.log(
            "✅ Histórico salvo:",
            data
        );


        await carregarHistorico();


    } catch (erro) {

        console.error(
            "❌ Erro ao salvar histórico:",
            erro
        );

    }

}


// =====================================================
// MOSTRAR HISTÓRICO
// =====================================================

function mostrarHistoricoNaTela() {

    const lista =
        document.getElementById(
            "history-list"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = "";


    if (
        historico.length === 0
    ) {

        lista.innerHTML = `

            <li class="history-item">

                <div>

                    <div class="history-title">
                        Nenhuma recomendação realizada ainda.
                    </div>

                    <small>
                        Suas escolhas aparecerão aqui.
                    </small>

                </div>

            </li>

        `;

        return;

    }


    historico.forEach(
        registro => {

            const item =
                document.createElement(
                    "li"
                );


            item.className =
                "history-item";


            const data =
                registro.data
                    ? new Date(
                        registro.data
                      ).toLocaleString(
                        "pt-BR"
                      )
                    : "Data não informada";


            item.innerHTML = `

                <div>

                    <div class="history-title">
                        ${registro.restaurante || "Restaurante"}
                    </div>

                    <small>

                        ${obterNomeHumor(
                            registro.humor || ""
                        )}

                        •

                        ${obterNomeCategoria(
                            registro.tipo || "nenhuma"
                        )}

                        •

                        ${obterNomeOrcamento(
                            registro.orcamento || ""
                        )}

                        •

                        ${registro.cep || "CEP não informado"}

                    </small>

                </div>


                <span class="history-date">
                    ${data}
                </span>

            `;


            lista.appendChild(
                item
            );

        }
    );

}


// =====================================================
// CARREGAR PERFIL NA ABA "MEU PERFIL"
// =====================================================

async function carregarPerfilNaAba() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/usuarios/me`,
                {

                    headers:
                        headersAutenticacao()

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return;

        }


        const data =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                data.erro ||
                "Erro ao carregar perfil."
            );

        }


        const campoNome =
            document.getElementById(
                "nome"
            );

        const campoIdade =
            document.getElementById(
                "idade"
            );

        const campoGenero =
            document.getElementById(
                "genero"
            );

        const campoEmail =
            document.getElementById(
                "email"
            );


        if (campoNome) {

            campoNome.value =
                data.nome || "";

        }


        if (campoIdade) {

            campoIdade.value =
                data.idade || "";

        }


        if (campoGenero) {

            campoGenero.value =
                data.genero || "";

        }


        if (campoEmail) {

            campoEmail.value =
                data.email || "";

        }


        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data)
        );


        console.log(
            "✅ Perfil carregado:",
            data
        );


    } catch (erro) {

        console.error(
            "❌ Erro ao carregar perfil:",
            erro
        );

    }

}


// =====================================================
// SALVAR PERFIL
// =====================================================

async function salvarPerfil() {

    const nome =
        document
            .getElementById("nome")
            .value
            .trim();


    const idade =
        document
            .getElementById("idade")
            .value;


    const genero =
        document
            .getElementById("genero")
            .value;


    const email =
        document
            .getElementById("email")
            .value
            .trim();


    if (!nome || !idade) {

        alert(
            "Preencha nome e idade."
        );

        return;

    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/usuarios/me`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...headersAutenticacao()

                    },

                    body: JSON.stringify({

                        nome:
                            nome,

                        idade:
                            Number(idade),

                        genero:
                            genero,

                        email:
                            email

                    })

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return;

        }


        const data =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                data.erro ||
                "Erro ao salvar perfil."
            );

        }


        console.log(
            "✅ Perfil salvo:",
            data
        );


        const usuarioLocal =
            JSON.parse(
                localStorage.getItem(
                    USER_KEY
                ) || "{}"
            );


        usuarioLocal.nome = nome;
        usuarioLocal.idade = Number(idade);
        usuarioLocal.genero = genero;
        usuarioLocal.email = email;
        usuarioLocal.perfilCompleto = true;


        localStorage.setItem(
            USER_KEY,
            JSON.stringify(
                usuarioLocal
            )
        );


        alert(
            data.mensagem ||
            "Perfil salvo com sucesso!"
        );


    } catch (erro) {

        console.error(
            "❌ Erro ao salvar perfil:",
            erro
        );


        alert(
            "Não foi possível salvar o perfil."
        );

    }

}


// =====================================================
// EXCLUIR CONTA
// =====================================================

async function excluirConta() {

    const confirmar =
        confirm(
            "Tem certeza que deseja excluir sua conta? " +
            "Essa ação não pode ser desfeita."
        );


    if (!confirmar) {

        return;

    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/usuarios/me`,
                {

                    method: "DELETE",

                    headers:
                        headersAutenticacao()

                }
            );


        if (
            resposta.status === 401
        ) {

            sairDaConta();

            return;

        }


        if (!resposta.ok) {

            const data =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                data.erro ||
                "Erro ao excluir conta."
            );

        }


        localStorage.removeItem(
            TOKEN_KEY
        );

        localStorage.removeItem(
            USER_KEY
        );


        alert(
            "Conta excluída com sucesso."
        );


        window.location.href =
            "cadastro.html";


    } catch (erro) {

        console.error(
            "❌ Erro ao excluir conta:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível excluir a conta."
        );

    }

}


// =====================================================
// SAIR
// =====================================================

function sairDaConta() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    localStorage.removeItem(
        USER_KEY
    );


    window.location.href =
        "login.html";

}