function gerarSugestao() {
    const humor = document.getElementById('humor').value;
    const orcamento = document.getElementById('orcamento').value;
    const restricao = document.getElementById('restricao').value;
    const display = document.getElementById('resultado');

    display.innerHTML = "🔮 Pensando...";

    setTimeout(() => {
        let prato = "";
        let local = "";

        if (humor === "cansado") {
            prato = "Sopa de Lentilha ou Lamen Quente";
            local = "um lugar calmo e acolhedor";
        } else if (humor === "aventureiro") {
            prato = "Tacos Mexicanos ou Comida Coreana";
            local = "um food truck ou mercado central";
        } else {
            prato = "Risoto de Alho Poró ou Salmão";
            local = "um bistrô com boa música";
        }

        if (restricao === "vegano") prato += " (Versão Vegana)";
        
        display.innerHTML = `
            <strong>Sugestão:</strong> ${prato}<br>
            <strong>Ambiente:</strong> ${local}<br>
            <strong>Custo:</strong> ${orcamento === 'economico' ? 'Baratinho' : 'Investimento justo'}
        `;
    }, 800);
}