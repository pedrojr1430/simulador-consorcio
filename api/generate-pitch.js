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

        // 1. Gerar o texto persuasivo (Parecer do Especialista)
        let prompt = '';
        
        const isComparativo = economiaTotal && economiaTotal !== 'R$ 0,00' && !economiaTotal.includes('-');

        if (isComparativo) {
            prompt = `Você é um Consultor Sênior de Investimentos redigindo um "Parecer do Especialista" formal e altamente persuasivo que será incluído na proposta comercial oficial (em PDF) de um cliente.
DADOS DA OPERAÇÃO (Comparativo):
- Carta de Crédito (Imóvel/Veículo): R$ ${valorCarta}
- Consórcio: Parcela acessível de R$ ${valorParcela} em ${prazo} meses (Custo Final Total: R$ ${totalConsorcio})
- Financiamento Bancário Tradicional: Parcela Inicial pesada de R$ ${parcelaFinanciamento} em ${prazoFinanciamento} meses (Custo Final Total: R$ ${totalFinanciamento})
- Lance Ofertado: R$ ${lance}
- Economia Comprovada (Seu Lucro): R$ ${economiaTotal}

Com base nesses dados, escreva um texto elegante, profissional e direto (exatamente 2 a 3 parágrafos). Destaque a diferença absurda entre o juros do banco (que gera a parcela de R$ ${parcelaFinanciamento}) e o poder do consórcio de alavancar o patrimônio gerando uma economia massiva de R$ ${economiaTotal}. O tom deve ser formal de negócio, encorajador, e deixar claro que a decisão pelo consórcio é a única logicamente aceitável para quem tem inteligência financeira. Não use saudações, vá direto ao parecer.`;
        } else {
            prompt = `Você é um Consultor Sênior de Investimentos redigindo um "Parecer do Especialista" formal e altamente persuasivo que será incluído na proposta comercial oficial (em PDF) de um cliente.
DADOS DA OPERAÇÃO (Consórcio Individual):
- Carta de Crédito (Construção de Patrimônio): R$ ${valorCarta}
- Parcela Mensal Planejada: R$ ${valorParcela}
- Prazo Estratégico: ${prazo} meses
- Custo Final Total da Operação: R$ ${totalConsorcio}
- Lance Ofertado Estratégico: R$ ${lance}

Com base nesses dados, escreva um texto elegante, profissional e direto (exatamente 2 a 3 parágrafos). Enfatize como a parcela de R$ ${valorParcela} é um investimento poderoso e blindado contra juros abusivos. Mostre que levantar um capital de R$ ${valorCarta} pagando apenas as baixas taxas do consórcio é o verdadeiro segredo para a construção sólida de riqueza. O tom deve ser formal, demonstrando autoridade, criando urgência para a tomada de decisão. Não use saudações, vá direto ao parecer.`;
        }

        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
            max_tokens: 300,
            temperature: 0.7,
        });

        const scriptText = chatCompletion.choices[0].message.content;

        return res.status(200).json({ text: scriptText });

    } catch (error) {
        console.error('Erro ao gerar parecer:', error);
        return res.status(500).json({ error: 'Erro ao processar a inteligência artificial.' });
    }
}
