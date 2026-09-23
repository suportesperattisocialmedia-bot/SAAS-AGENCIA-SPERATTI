/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Full-Stack Server - Express, Security, Meta Graph API Proxy, Gemini API Proxy & Vite Dev Middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Vite inline scripts and previews
    crossOriginEmbedderPolicy: false
  })
);

// Rate Limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '10mb' }));

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/instagram/callback`;

// In-memory token store on server (never expose to client)
const serverTokenStore = new Map<string, { accessToken: string; expiresAt: number; accountId?: string }>();

// Gemini SDK
let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-gs-intelligence',
      },
    },
  });
}

// Logging middleware
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.info(`[API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  }
  next();
});

// Health check & Environment Status
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    product: 'Gabriel Speratti Social Intelligence',
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    hasMetaAppId: Boolean(META_APP_ID),
    hasMetaAppSecret: Boolean(META_APP_SECRET),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// META GRAPH API INTEGRATION ENDPOINTS
// ==========================================

// GET /api/integrations/instagram/status
app.get('/api/integrations/instagram/status', (req: Request, res: Response) => {
  const clientId = String(req.query.clientId || '');
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório' });
  }

  const tokenData = serverTokenStore.get(clientId);
  const isConfigured = Boolean(META_APP_ID && META_APP_SECRET);

  if (!isConfigured) {
    return res.json({
      clientId,
      status: 'NOT_CONNECTED',
      isConnected: false,
      message: 'Integração Meta Graph API não configurada no servidor (.env sem META_APP_ID/META_APP_SECRET).'
    });
  }

  if (!tokenData || Date.now() > tokenData.expiresAt) {
    return res.json({
      clientId,
      status: tokenData ? 'TOKEN_EXPIRED' : 'NOT_CONNECTED',
      isConnected: false,
      message: tokenData ? 'Token expirado. Necessário reconectar.' : 'Instagram não conectado para este cliente.'
    });
  }

  return res.json({
    clientId,
    status: 'CONNECTED',
    isConnected: true,
    accountId: tokenData.accountId,
    expiresInDays: Math.round((tokenData.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
  });
});

// GET /api/integrations/instagram/connect
app.get('/api/integrations/instagram/connect', (req: Request, res: Response) => {
  const clientId = String(req.query.clientId || '');
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório' });
  }

  if (!META_APP_ID) {
    return res.status(400).json({
      error: 'META_APP_ID não configurado no servidor. Configure as credenciais no painel de segredos.',
      status: 'NOT_CONFIGURED'
    });
  }

  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
    META_REDIRECT_URI
  )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(clientId)}&response_type=code`;

  res.json({
    authUrl,
    clientId,
    status: 'CONNECTING'
  });
});

// GET /api/integrations/instagram/callback
app.get('/api/integrations/instagram/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('[Meta OAuth Error]', error, error_description);
    return res.redirect(`/?meta_error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || !state) {
    return res.status(400).send('Código de autorização ou estado ausente.');
  }

  const clientId = String(state);

  try {
    // Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
      META_REDIRECT_URI
    )}&client_secret=${META_APP_SECRET}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error?.message || 'Falha ao trocar código pelo token Meta');
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenJson.access_token}`;

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedJson = await longLivedRes.json();
    const finalToken = longLivedJson.access_token || tokenJson.access_token;
    const expiresIn = (longLivedJson.expires_in || 5184000) * 1000; // default 60 days

    serverTokenStore.set(clientId, {
      accessToken: finalToken,
      expiresAt: Date.now() + expiresIn
    });

    console.info(`[Meta OAuth] Token successfully acquired for clientId ${clientId}`);
    return res.redirect(`/?client_connected=${encodeURIComponent(clientId)}`);
  } catch (err: any) {
    console.error('[Meta OAuth Exchange Error]', err);
    return res.redirect(`/?meta_error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/integrations/instagram/disconnect
app.post('/api/integrations/instagram/disconnect', (req: Request, res: Response) => {
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório' });
  }

  serverTokenStore.delete(String(clientId));
  res.json({ success: true, status: 'NOT_CONNECTED' });
});

// POST /api/integrations/instagram/sync
app.post('/api/integrations/instagram/sync', async (req: Request, res: Response) => {
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório' });
  }

  const tokenData = serverTokenStore.get(String(clientId));
  if (!tokenData) {
    return res.status(403).json({
      error: 'Instagram não está autenticado via Meta OAuth no servidor.',
      status: 'NOT_CONNECTED'
    });
  }

  try {
    // 1. Get Me / Accounts to find linked Instagram Business Account
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}&access_token=${tokenData.accessToken}`
    );
    const accountsJson = await accountsRes.json();

    if (!accountsRes.ok) {
      throw new Error(accountsJson.error?.message || 'Erro ao consultar contas do Facebook/Instagram');
    }

    const igAccount = accountsJson.data?.[0]?.instagram_business_account;
    if (!igAccount) {
      return res.status(404).json({
        error: 'Nenhuma conta profissional do Instagram vinculada à Página do Facebook autorizada.',
        status: 'PERMISSION_ERROR'
      });
    }

    // 2. Fetch Media objects
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccount.id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${tokenData.accessToken}`
    );
    const mediaJson = await mediaRes.json();

    return res.json({
      success: true,
      profile: igAccount,
      media: mediaJson.data || [],
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Meta Sync Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GEMINI AI INTEGRATION ENDPOINTS
// ==========================================

const ProfileAnalyzeSchema = z.object({
  client: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string().optional(),
    instagram: z.string(),
    segment: z.string(),
    subsegment: z.string().optional(),
    targetAudience: z.string().optional(),
    persona: z.string().optional(),
    averageTicket: z.string().optional(),
    pillars: z.array(z.string()).optional(),
    objectives: z.array(z.string()).optional()
  }),
  contents: z.array(z.any()).optional().default([]),
  snapshots: z.array(z.any()).optional().default([])
});

// POST /api/ai/analyze-profile
app.post('/api/ai/analyze-profile', async (req: Request, res: Response) => {
  try {
    const parseResult = ProfileAnalyzeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos na requisição', details: parseResult.error.format() });
    }

    const { client, contents, snapshots } = parseResult.data;

    if (!aiClient) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY não configurada no servidor.',
        fallback: true
      });
    }

    const latestSnapshot = snapshots[snapshots.length - 1];

    const prompt = `Você é o estrategista chefe de inteligência de marketing da agência Gabriel Speratti.
Analise com rigor técnico este cliente e seus dados:
Cliente: ${client.name} (${client.instagram})
Empresa: ${client.company || 'N/D'}
Segmento: ${client.segment} - ${client.subsegment || ''}
Público e Persona: ${client.targetAudience || 'N/D'} / ${client.persona || 'N/D'}
Ticket Médio: ${client.averageTicket || 'N/D'}
Pilares: ${(client.pillars || []).join(', ')}
Objetivos: ${(client.objectives || []).join(', ')}
Total de conteúdos catalogados: ${contents.length}
Último seguidor verificado: ${latestSnapshot?.followers ?? 'Dados insuficientes'}

DIRETRIZES FUNDAMENTAIS ANTI-HALLUCINATION:
1. É TERMINANTEMENTE PROIBIDO inventar porcentagens (ex: "+48%", "3x", "78%") que não constem nos dados reais enviados.
2. Se não houver dados comprovados para uma afirmação, classifique-a expressamente como HIPÓTESE, indicando o grau de confiança.
3. Diferencie rigorosamente:
   - FATO (dado real extraído)
   - HIPÓTESE (inferência estratégica plausível)
   - RECOMENDAÇÃO (próxima ação sugerida)`;

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
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
                predominantFormats: { type: Type.STRING },
                editorialPillars: { type: Type.STRING },
                visualIdentityAndAesthetics: { type: Type.STRING },
                captionQuality: { type: Type.STRING },
                hookUsage: { type: Type.STRING },
                ctaEffectiveness: { type: Type.STRING },
                topPerformingThemes: { type: Type.STRING }
              },
              required: ['publishingFrequency', 'editorialPillars', 'captionQuality', 'hookUsage', 'ctaEffectiveness']
            },
            performanceSection: {
              type: Type.OBJECT,
              properties: {
                engagementAnalysis: { type: Type.STRING },
                reachAndImpressions: { type: Type.STRING },
                savesAndShares: { type: Type.STRING },
                audienceRetention: { type: Type.STRING },
                bestContentObservations: { type: Type.STRING },
                worstContentObservations: { type: Type.STRING }
              },
              required: ['engagementAnalysis', 'savesAndShares', 'bestContentObservations']
            },
            strategySection: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                immediateOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                highImpactPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedFormats: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['strengths', 'vulnerabilities', 'immediateOpportunities', 'recommendedFormats']
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
    return res.json(parsed);
  } catch (err: any) {
    console.error('[Server AI Error] Analyze Profile:', err);
    return res.status(500).json({ error: err.message, fallback: true });
  }
});

// POST /api/ai/generate-ideas
const IdeasSchema = z.object({
  context: z.object({
    client: z.any(),
    topContents: z.array(z.any()).optional().default([]),
    audienceInsights: z.array(z.any()).optional().default([])
  }),
  count: z.number().optional().default(3)
});

app.post('/api/ai/generate-ideas', async (req: Request, res: Response) => {
  try {
    const parseResult = IdeasSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
    }

    const { context, count } = parseResult.data;
    const { client, audienceInsights } = context;

    if (!aiClient) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada.', fallback: true });
    }

    const prompt = `Gere ${count} ideias estratégicas de conteúdo para o cliente ${client.name} (${client.segment}).
Público e persona: ${client.targetAudience || 'Profissionais e consumidores qualificados'}
Pilares estratégicos: ${(client.pillars || []).join(', ')}
Formatos prioritários: ${(client.formats || []).join(', ')}
Dores e medos do público comprovados: ${JSON.stringify(audienceInsights.slice(0, 4).map((a: any) => a.title))}

REGRA ANTI-HALLUCINATION:
Não prometa métricas fantasiosas. Formule ganchos específicos e roteirizáveis.
Formatos permitidos: 'Reels', 'Carrossel', 'Foto', 'Stories', 'Live'.`;

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
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
              targetAudienceSnippet: { type: Type.STRING }
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

// Centralized error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: 'Ocorreu um erro interno no servidor da aplicação.',
    message: err.message
  });
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
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Gabriel Speratti Social Intelligence] Running on http://localhost:${PORT}`);
  });
}

startServer();
