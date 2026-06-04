const OpenAI = require('openai');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            valorCarta,
            valorParcela,
            economiaTotal,
            prazo,
            lance,
            parcelaFinanciamento,
            prazoFinanciamento,
            totalConsorcio,
            totalFinanciamento
        } = req.body;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Gerar o texto persuasivo (Pitch de Vendas)
        let prompt = '';
        
        // Verifica se é uma simulação comparativa com economia válida
        const isComparativo = economiaTotal && economiaTotal !== 'R$ 0,00' && !economiaTotal.includes('-');

        if (isComparativo) {
            prompt = `Você é um consultor financeiro especialista em consórcios e investimentos inteligentes.
Faça a análise real de uma simulação financeira preenchida por um cliente, comparando o consórcio com o financiamento bancário tradicional:
- Carta de Crédito (Valor do Bem): R$ ${valorCarta}
- Consórcio: Parcela de R$ ${valorParcela} em ${prazo} meses (Custo Final: R$ ${totalConsorcio})
- Financiamento: Parcela Inicial de R$ ${parcelaFinanciamento} em ${prazoFinanciamento} meses (Custo Final: R$ ${totalFinanciamento})
- Lance Ofertado: R$ ${lance}
- Economia Total Gerada: R$ ${economiaTotal}

Com base NESSES DADOS REAIS, crie um roteiro de vendas (pitch) narrativo, direto e extremamente persuasivo (máximo 3 parágrafos). Destaque a diferença absurda entre o que ele pagaria de parcela no banco (R$ ${parcelaFinanciamento}) contra a parcela acessível do consórcio (R$ ${valorParcela}). Mostre a economia total de R$ ${economiaTotal} como lucro, dinheiro que fica no bolso dele. Use um tom empolgante, de quem está mostrando o segredo financeiro dos ricos. Não use asteriscos ou emojis, pois o texto será lido por uma voz gerada por IA.`;
        } else {
            prompt = `Você é um consultor financeiro especialista em consórcios e construção de patrimônio.
Faça a análise real de uma simulação de consórcio preenchida por um cliente (sem comparativo com financiamento):
- Carta de Crédito (Patrimônio): R$ ${valorCarta}
- Parcela Mensal Acessível: R$ ${valorParcela}
- Prazo do Grupo: ${prazo} meses
- Custo Total Final: R$ ${totalConsorcio}
- Lance Ofertado: R$ ${lance}

Com base NESSES DADOS REAIS, crie um roteiro de vendas narrativo e persuasivo (máximo 3 parágrafos) focado em como o consórcio é a compra inteligente. Mostre que a parcela de R$ ${valorParcela} cabe com folga no orçamento para levantar um capital de R$ ${valorCarta}. Crie urgência (grupos em fechamento) e mostre que investir essa pequena parcela mensal é a ponte para a riqueza sem pagar juros bancários abusivos. Não use asteriscos ou emojis, pois o texto será lido por uma voz gerada por IA.`;
        }

        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
            max_tokens: 250,
            temperature: 0.7,
        });

        const scriptText = chatCompletion.choices[0].message.content;

        // 2. Gerar o Áudio (TTS)
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "onyx", // Voz masculina com tom de autoridade e confiança
            input: scriptText,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        // Retorna o texto e o áudio em base64
        return res.status(200).json({
            text: scriptText,
            audio: `data:audio/mp3;base64,${base64Audio}`
        });

    } catch (error) {
        console.error('Erro ao gerar pitch:', error);
        return res.status(500).json({ error: 'Erro ao processar a inteligência artificial.' });
    }
}
