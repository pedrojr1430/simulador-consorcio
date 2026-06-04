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
        const prompt = `Você é um consultor financeiro especialista em consórcios de alta performance.
Um cliente acabou de fazer uma simulação com os seguintes dados:
- Carta de Crédito: R$ ${valorCarta}
- Parcela Mensal: R$ ${valorParcela}
- Prazo: ${prazo} meses
- Lance Ofertado: R$ ${lance}
- Economia Total (comparado a um financiamento): R$ ${economiaTotal}

Escreva um roteiro de vendas persuasivo, direto e impactante (no máximo 3 parágrafos curtos) para convencer o cliente de que o consórcio é a melhor escolha, focando na economia gigantesca de R$ ${economiaTotal}. Não use saudações longas, vá direto ao ponto. Use gatilhos mentais de escassez e lógica. Não coloque marcações de markdown como asteriscos, pois isso será lido em voz alta por um sistema de áudio.`;

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
