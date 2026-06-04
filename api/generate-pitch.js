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
            lance
        } = req.body;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Gerar o texto persuasivo (Pitch de Vendas)
        let prompt = '';
        
        // Verifica se é uma simulação comparativa com economia válida
        // Vamos checar se "economiaTotal" é um valor monetário positivo, ignorando "R$ 0,00" ou negativos
        const isComparativo = economiaTotal && economiaTotal !== 'R$ 0,00' && !economiaTotal.includes('-');

        if (isComparativo) {
            prompt = `Você é um consultor financeiro especialista em consórcios de alta performance.
Um cliente fez uma simulação comparando consórcio com financiamento bancário:
- Carta de Crédito: R$ ${valorCarta}
- Parcela Mensal (Consórcio): R$ ${valorParcela}
- Prazo: ${prazo} meses
- Lance Ofertado: R$ ${lance}
- Economia Total (frente ao financiamento): R$ ${economiaTotal}

Escreva um roteiro de vendas persuasivo e direto (máximo 3 parágrafos curtos) para convencer o cliente de que o consórcio é a escolha mais inteligente, focando na gigantesca economia de R$ ${economiaTotal} em juros bancários. Use gatilhos de escassez e lógica. Vá direto ao ponto, sem saudações longas. Não use marcações markdown como asteriscos, pois será lido em voz alta.`;
        } else {
            prompt = `Você é um consultor financeiro especialista em consórcios de alta performance.
Um cliente fez uma simulação de consórcio focada em planejamento e inteligência financeira:
- Carta de Crédito: R$ ${valorCarta}
- Parcela Mensal: R$ ${valorParcela}
- Prazo: ${prazo} meses
- Lance Ofertado: R$ ${lance}

Escreva um roteiro de vendas persuasivo e animador (máximo 3 parágrafos curtos) ressaltando como essa parcela de R$ ${valorParcela} cabe no bolso e como o consórcio é a ferramenta perfeita para construção patrimonial sem pagar juros. Vá direto ao ponto, use um tom de autoridade e encorajamento. Não use marcações markdown como asteriscos, pois será lido em voz alta.`;
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
