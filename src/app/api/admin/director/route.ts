import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { performanceData } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const systemPrompt = `Você é um Diretor Comercial de alta performance, rigoroso, estratégico e experiente.
Seu objetivo é analisar os números de vendas da equipe e fornecer um relatório executivo para o administrador da empresa.

Você deve:
1. Elogiar quem está com boa taxa de conversão ou volume alto.
2. Dar feedbacks construtivos (e "puxões de orelha" profissionais) para quem está abaixo do esperado.
3. Sugerir 3 ações práticas de vendas ou estratégias de abordagem para melhorar a performance da equipe esta semana.

Formate sua resposta em Markdown. Use títulos, negritos e listas para deixá-la bonita e fácil de ler.

DADOS DA EQUIPE:
Total de Leads no sistema: ${performanceData.totalLeads}
Leads em Atendimento (Aberto): ${performanceData.inProgress}
Leads Fechados (Sucesso): ${performanceData.closed}
Taxa de Conversão Global: ${performanceData.conversionRate}

DESEMPENHO POR VENDEDOR:
${performanceData.byAttendant.map((a: any) => `- ${a.name}: ${a.leads} leads | ${a.closed} fechados | ${a.conversion} conversão`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // ou gpt-4-turbo / gpt-3.5-turbo
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Gere o relatório de performance com base nestes dados.' }
      ],
    });

    const reply = completion.choices[0].message?.content || 'Não foi possível gerar a análise no momento.';

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Erro na rota Diretor IA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
