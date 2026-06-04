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
            totalFinanciamento,
            isComparativo
        } = req.body;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Gerar o texto persuasivo (Parecer do Especialista)
        let prompt = '';
        
        if (isComparativo) {
            prompt = `Você é um Consultor Sênior de Investimentos redigindo um "Parecer do Especialista" técnico e analítico para uma proposta comercial oficial.
DADOS DA OPERAÇÃO (Comparativo):
- Carta de Crédito (Imóvel/Veículo): R$ ${valorCarta}
- Consórcio: Parcela de R$ ${valorParcela} em ${prazo} meses (Custo Final: R$ ${totalConsorcio})
- Financiamento Bancário: Parcela Inicial de R$ ${parcelaFinanciamento} em ${prazoFinanciamento} meses (Custo Final: R$ ${totalFinanciamento})
- Lance Ofertado: R$ ${lance}
- Economia Gerada: R$ ${economiaTotal}

REGRAS OBRIGATÓRIAS:
1. O texto deve ser formatado em HTML (use apenas <p>, <strong>, <ul> e <li>). NÃO USE MARKDOWN (*** ou ###).
2. Escreva 3 parágrafos curtos ou tópicos.
3. Use um tom estritamente profissional, técnico e corporativo.
4. Compare diretamente o desperdício de capital do financiamento bancário (citando os R$ ${totalFinanciamento} e a parcela absurda de R$ ${parcelaFinanciamento}) com a inteligência financeira do consórcio.
5. Evidencie que a economia de R$ ${economiaTotal} representa proteção patrimonial e custo de oportunidade.`;
        } else {
            prompt = `Você é um Consultor Sênior de Investimentos redigindo um "Parecer do Especialista" técnico e analítico para uma proposta comercial oficial.
DADOS DA OPERAÇÃO (Consórcio):
- Carta de Crédito (Construção de Patrimônio): R$ ${valorCarta}
- Parcela Mensal Planejada: R$ ${valorParcela}
- Prazo Estratégico: ${prazo} meses
- Custo Final Total da Operação: R$ ${totalConsorcio}
- Lance Ofertado Estratégico: R$ ${lance}

REGRAS OBRIGATÓRIAS:
1. O texto deve ser formatado em HTML (use apenas <p>, <strong>, <ul> e <li>). NÃO USE MARKDOWN (*** ou ###).
2. Escreva 3 parágrafos curtos ou tópicos.
3. Use um tom estritamente profissional, técnico e corporativo focando em planejamento financeiro.
4. É ESTRITAMENTE PROIBIDO mencionar ou usar as palavras "financiamento" ou "banco". Fale APENAS sobre a operação estruturada via consórcio.
5. Enfatize como levantar um capital de R$ ${valorCarta} pagando apenas as taxas administrativas (custo final de R$ ${totalConsorcio}) é a maneira mais eficiente de construir riqueza e blindar o patrimônio.`;
        }

        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
            max_tokens: 400,
            temperature: 0.7,
        });

        const scriptText = chatCompletion.choices[0].message.content;

        return res.status(200).json({ text: scriptText });

    } catch (error) {
        console.error('Erro ao gerar parecer:', error);
        return res.status(500).json({ error: 'Erro ao processar a inteligência artificial.' });
    }
}
