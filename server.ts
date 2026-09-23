/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Full-Stack Server - Express & Gemini API Proxy & Vite Dev Middleware
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Gemini SDK Initialization
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health Check & Status
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'online',
    product: 'Gabriel Speratti Social Intelligence',
    hasGeminiKey: Boolean(apiKey),
    metaApiAvailable: true,
    timestamp: new Date().toISOString()
  });
});

// API: Analyze Profile
app.post('/api/ai/analyze-profile', async (req, res) => {
  try {
    const { client, contents, snapshots } = req.body;

    if (!aiClient) {
      return res.status(503).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Use o fallback estratégico.',
        fallback: true
      });
    }

    const prompt = `Você é o estrategista de inteligência do Gabriel Speratti.
Analise detalhadamente o perfil e a operação deste cliente:
Cliente: ${client.name} (${client.instagram})
Empresa: ${client.company}
Segmento: ${client.segment} - ${client.subsegment}
Público e Persona: ${client.targetAudience} / ${client.persona}
Ticket Médio: ${client.averageTicket}
Pilares: ${(client.pillars || []).join(', ')}
Objetivos: ${(client.objectives || []).join(', ')}
Total de Conteúdos Analisados: ${contents?.length || 0}
Último volume de seguidores: ${snapshots?.[snapshots.length - 1]?.followers || 'N/D'}

IMPORTANTE: Diferencie estritamente fatos numéricos observados de hipóteses analíticas. Nunca invente métricas.
Retorne um JSON estritamente com a seguinte estrutura.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profileSection: {
              type: Type.OBJECT,
              properties: {
                photoAnalysis: { type: Type.STRING },
                usernameAndName: { type: Type.STRING },
                bioClarity: { type: Type.STRING },
                ctaAndLink: { type: Type.STRING },
                highlightsStructure: { type: Type.STRING },
                valueProposition: { type: Type.STRING },
                perceivedAuthority: { type: Type.STRING }
              },
              required: ['photoAnalysis', 'bioClarity', 'valueProposition', 'perceivedAuthority']
            },
            contentSection: {
              type: Type.OBJECT,
              properties: {
                publishingFrequency: { type: Type.STRING },
                formatBalance: { type: Type.STRING },
                pillarDistribution: { type: Type.STRING },
                hookEffectiveness: { type: Type.STRING },
                ctaEffectiveness: { type: Type.STRING },
                captionQuality: { type: Type.STRING },
                visualConsistency: { type: Type.STRING }
              },
              required: ['publishingFrequency', 'formatBalance', 'hookEffectiveness']
            },
            performanceSection: {
              type: Type.OBJECT,
              properties: {
                observedGrowth: { type: Type.STRING },
                engagementQuality: { type: Type.STRING },
                saveAndShareRatio: { type: Type.STRING },
                topAudienceDraw: { type: Type.STRING }
              },
              required: ['observedGrowth', 'engagementQuality']
            },
            strategySection: {
              type: Type.OBJECT,
              properties: {
                authorityStatus: { type: Type.STRING },
                connectionStatus: { type: Type.STRING },
                salesReadiness: { type: Type.STRING },
                funnelBalance: { type: Type.STRING },
                biggestOpportunity: { type: Type.STRING }
              },
              required: ['authorityStatus', 'biggestOpportunity']
            },
            nextActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['profileSection', 'contentSection', 'performanceSection', 'strategySection', 'nextActions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      analyzedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Server AI Error] Profile Analysis:', err);
    return res.status(500).json({ error: err.message, fallback: true });
  }
});

// API: Classify Content
app.post('/api/ai/classify-content', async (req, res) => {
  try {
    const { content, client } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada.', fallback: true });
    }

    const prompt = `Analise criticamente este conteúdo de marketing digital para o cliente ${client.name} (${client.segment}):
Título: "${content.title}"
Formato: ${content.format}
Pilar: ${content.pillar}
Objetivo: ${content.objective}
Gancho: "${content.hook}"
CTA: "${content.cta}"
Legenda: "${content.caption}"
Métricas Observadas: ${JSON.stringify(content.metrics)}

Gere uma classificação profissional e diagnóstica apontando por que funcionou ou não, pontos fortes, pontos fracos e oportunidades de desdobramento.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            whyItWorked: { type: Type.STRING },
            whyItMayHaveUnderperformed: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunity: { type: Type.STRING },
            hypothesisNote: { type: Type.STRING }
          },
          required: ['summary', 'whyItWorked', 'strengths', 'weaknesses', 'opportunity', 'hypothesisNote']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('[Server AI Error] Classify Content:', err);
    return res.status(500).json({ error: err.message, fallback: true });
  }
});

// API: Generate Content Ideas
app.post('/api/ai/generate-ideas', async (req, res) => {
  try {
    const { context, count } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada.', fallback: true });
    }

    const { client, topContents, audienceInsights } = context;

    const prompt = `Gere ${count || 3} ideias de conteúdo altamente específicas e estratégicas para o cliente ${client.name} (${client.segment}).
Público e persona: ${client.targetAudience}
Pilares estratégicos: ${(client.pillars || []).join(', ')}
Formatos prioritários: ${(client.formats || []).join(', ')}
Dores e objeções mapeadas do público: ${JSON.stringify((audienceInsights || []).slice(0, 4).map((a: any) => a.title))}
Conteúdo de maior retenção recente: ${topContents?.[0]?.title || 'Deep Plane Facelift'}

Cada ideia deve conter um gancho de alto impacto, formato adequado, objetivo claro, CTA estratégico e justificativa clínica/negocial.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              clientId: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              pillar: { type: Type.STRING },
              objective: { type: Type.STRING },
              format: { type: Type.STRING },
              hook: { type: Type.STRING },
              hookCategory: { type: Type.STRING },
              cta: { type: Type.STRING },
              source: { type: Type.STRING },
              potential: { type: Type.STRING },
              whyDoThis: { type: Type.STRING },
              targetAudienceSnippet: { type: Type.STRING },
              status: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ['title', 'description', 'pillar', 'format', 'hook', 'cta', 'whyDoThis', 'potential']
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    const formatted = parsed.map((item: any) => ({
      ...item,
      clientId: client.id,
      status: 'IDEIA'
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('[Server AI Error] Generate Ideas:', err);
    return res.status(500).json({ error: err.message, fallback: true });
  }
});

// Setup Vite or Static Serving
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Gabriel Speratti Social Intelligence] Running on http://localhost:${PORT}`);
  });
}

startServer();
