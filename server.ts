/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Full-Stack Server - Security Hardened, Meta Graph API Proxy, Gemini Proxy, CSP & Vite Middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { tokenRepository } from './server/tokens/TokenRepository';
import { oAuthStateRepository } from './server/oauth/OAuthStateRepository';
import { MetaInstagramProvider } from './server/providers/InstagramProvider';
import {
  SyncInstagramRequestSchema,
  DisconnectInstagramRequestSchema,
  AnalyzeProfileRequestSchema,
  GenerateIdeasRequestSchema,
  ClassifyContentRequestSchema,
  ResearchRequestSchema,
  CompetitorDiscoveryRequestSchema
} from './server/schemas/endpointSchemas';
import {
  PROFILE_DIAGNOSTIC_VERSION,
  buildProfileDiagnosticPrompt
} from './src/ai/prompts/profileDiagnostic';
import {
  IDEA_GENERATION_VERSION,
  buildIdeaGenerationPrompt
} from './src/ai/prompts/ideaGeneration';
import {
  CONTENT_CLASSIFICATION_VERSION,
  buildContentClassificationPrompt
} from './src/ai/prompts/contentClassification';
import {
  ProfileDiagnosticResponseSchema,
  IdeaGenerationResponseSchema,
  ContentClassificationResponseSchema
} from './src/schemas/aiSchemas';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${APP_URL}/api/integrations/instagram/callback`;

// Providers
const metaProvider = new MetaInstagramProvider(META_APP_ID, META_APP_SECRET);

// Gemini SDK (Server-Side Only)
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

// Security Headers: Development vs Production CSP
if (isProduction) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https://graph.facebook.com', 'https://generativelanguage.googleapis.com', 'ws:', 'wss:']
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );
} else {
  // Relaxed CSP for Vite Dev Server & HMR
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
}

// Request ID & Structured Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.info(`[API] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms [req:${requestId}]`);
    });
  }
  next();
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Limite de requisições excedido. Tente novamente em alguns minutos.'
  }
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '10mb' }));

// Health & Config Status Endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    product: 'Gabriel Speratti Social Intelligence',
    version: '3.0.0-production',
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    hasMetaAppId: Boolean(META_APP_ID),
    hasMetaAppSecret: Boolean(META_APP_SECRET),
    metaConfigured: metaProvider.isConfigured(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// META GRAPH API INTEGRATION ROUTES
// ==========================================

// GET /api/integrations/instagram/status
app.get('/api/integrations/instagram/status', async (req: Request, res: Response) => {
  const clientId = String(req.query.clientId || '');
  if (!clientId) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'clientId é obrigatório' });
  }

  if (!metaProvider.isConfigured()) {
    return res.json({
      clientId,
      status: 'NOT_CONNECTED',
      isConnected: false,
      message: 'Integração Meta Graph API não configurada no servidor (faltam META_APP_ID / META_APP_SECRET).'
    });
  }

  const tokenStatus = await tokenRepository.listPublicStatus(clientId);

  if (!tokenStatus.hasToken) {
    return res.json({
      clientId,
      status: tokenStatus.status === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'NOT_CONNECTED',
      isConnected: false,
      message: tokenStatus.status === 'EXPIRED'
        ? 'Token de acesso Meta expirado. É necessário reconectar.'
        : 'Instagram não conectado para este cliente.'
    });
  }

  return res.json({
    clientId,
    status: 'CONNECTED',
    isConnected: true,
    accountId: tokenStatus.accountId,
    expiresInDays: tokenStatus.expiresInDays
  });
});

// GET /api/integrations/instagram/connect
app.get('/api/integrations/instagram/connect', (req: Request, res: Response) => {
  const clientId = String(req.query.clientId || '');
  if (!clientId) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'clientId é obrigatório' });
  }

  if (!metaProvider.isConfigured()) {
    return res.status(503).json({
      error: 'META_NOT_CONFIGURED',
      message: 'Credenciais do Meta Graph API (META_APP_ID e META_APP_SECRET) não configuradas no servidor.'
    });
  }

  // Generate cryptographically secure state (FASE 4: NEVER state = clientId)
  const secureState = oAuthStateRepository.createState(clientId);

  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
    META_REDIRECT_URI
  )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(secureState)}&response_type=code`;

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

  // Validate and consume state atomically
  const stateValidation = oAuthStateRepository.validateAndConsume(String(state));
  if (!stateValidation.valid || !stateValidation.clientId) {
    console.warn('[Meta OAuth State Error]', stateValidation.error);
    return res.redirect(`/?meta_error=${encodeURIComponent(stateValidation.error || 'State inválido ou expirado.')}`);
  }

  const clientId = stateValidation.clientId;

  try {
    const exchange = await metaProvider.exchangeCode(String(code), META_REDIRECT_URI);

    // Fetch account info to get Instagram Business Account ID
    const igAccount = await metaProvider.getBusinessAccount(exchange.accessToken);

    await tokenRepository.saveToken(
      clientId,
      exchange.accessToken,
      Date.now() + exchange.expiresInMs,
      igAccount?.id
    );

    console.info(`[Meta OAuth] Successfully acquired token for client ${clientId} (${igAccount?.username || 'unknown'})`);
    return res.redirect(`/?client_connected=${encodeURIComponent(clientId)}`);
  } catch (err: any) {
    console.error('[Meta OAuth Token Exchange Error]', err);
    return res.redirect(`/?meta_error=${encodeURIComponent(err.message || 'Falha ao trocar código pelo token Meta.')}`);
  }
});

// POST /api/integrations/instagram/disconnect
app.post('/api/integrations/instagram/disconnect', async (req: Request, res: Response) => {
  const parse = DisconnectInstagramRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Dados inválidos' });
  }

  await tokenRepository.deleteToken(parse.data.clientId);
  res.json({ success: true, status: 'NOT_CONNECTED' });
});

// POST /api/integrations/instagram/sync
app.post('/api/integrations/instagram/sync', async (req: Request, res: Response) => {
  const parse = SyncInstagramRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Dados inválidos' });
  }

  const { clientId, trigger } = parse.data;
  const tokenData = await tokenRepository.getToken(clientId);

  if (!tokenData) {
    return res.status(403).json({
      error: 'NOT_AUTHENTICATED',
      status: 'NOT_CONNECTED',
      message: 'Instagram não está autenticado via Meta OAuth no servidor.'
    });
  }

  try {
    // 1. Fetch Instagram Account Profile
    const profile = await metaProvider.getBusinessAccount(tokenData.accessToken);
    if (!profile) {
      return res.status(404).json({
        error: 'NO_BUSINESS_ACCOUNT',
        status: 'PERMISSION_ERROR',
        message: 'Nenhuma conta profissional do Instagram vinculada à Página autorizada.'
      });
    }

    // 2. Fetch Media
    const rawMedia = await metaProvider.getMediaList(profile.id, tokenData.accessToken, 30);

    // 3. Fetch Insights for recent media
    const mediaWithInsights = await Promise.all(
      rawMedia.map(async (m) => {
        const insights = await metaProvider.getMediaInsights(m.id, m.media_type, tokenData.accessToken);
        return {
          ...m,
          insights
        };
      })
    );

    return res.json({
      success: true,
      profile,
      media: mediaWithInsights,
      trigger,
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Meta Sync Execution Error]', err);
    return res.status(500).json({
      error: 'META_SYNC_FAILED',
      message: err.message || 'Erro durante a sincronização com o Meta Graph API'
    });
  }
});

// ==========================================
// GEMINI AI INTEGRATION ROUTES
// ==========================================

// POST /api/ai/analyze-profile
app.post('/api/ai/analyze-profile', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  try {
    const parse = AnalyzeProfileRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        requestId,
        details: parse.error.format()
      });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'IA não configurada. Defina GEMINI_API_KEY no servidor.'
      });
    }

    const { client, contentsCount, latestFollowers, avgViews, avgEngagementRate, topFormats } = parse.data;

    const promptText = buildProfileDiagnosticPrompt({
      client,
      contentsCount,
      latestFollowers,
      avgViews,
      avgEngagementRate,
      topFormats
    });

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
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

    const rawJson = JSON.parse(response.text || '{}');
    const validated = ProfileDiagnosticResponseSchema.safeParse(rawJson);

    if (!validated.success) {
      console.warn(`[AI Diagnostic Schema Mismatch] [req:${requestId}]`, validated.error.format());
      return res.status(502).json({
        error: 'AI_RESPONSE_VALIDATION_FAILED',
        requestId,
        message: 'A resposta do modelo não atendeu ao schema rigoroso de validação.'
      });
    }

    return res.json({
      data: validated.data,
      metadata: {
        model: GEMINI_MODEL,
        promptVersion: PROFILE_DIAGNOSTIC_VERSION,
        requestId,
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error(`[AI Error] Analyze Profile [req:${requestId}]:`, err);
    return res.status(500).json({
      error: 'AI_EXECUTION_ERROR',
      requestId,
      message: isProduction ? 'Falha ao processar diagnóstico de perfil com IA.' : err.message
    });
  }
});

// POST /api/ai/generate-ideas
app.post('/api/ai/generate-ideas', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  try {
    const parse = GenerateIdeasRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'INVALID_REQUEST', requestId, details: parse.error.format() });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'IA não configurada. Defina GEMINI_API_KEY no servidor.'
      });
    }

    const { context, count } = parse.data;
    const promptText = buildIdeaGenerationPrompt({
      client: {
        name: context.client.name,
        instagram: context.client.instagram,
        segment: context.client.segment,
        subsegment: context.client.subsegment,
        targetAudience: context.client.targetAudience,
        persona: context.client.persona,
        pillars: context.client.pillars,
        formats: context.client.formats,
        toneOfVoice: context.client.toneOfVoice
      },
      audienceInsights: context.audienceInsights,
      topThemes: context.topThemes,
      count
    });

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
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
              format: { type: Type.STRING, enum: ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'] },
              hook: { type: Type.STRING },
              hookCategory: { type: Type.STRING },
              cta: { type: Type.STRING },
              source: { type: Type.STRING },
              potential: { type: Type.STRING, enum: ['Alto', 'Médio', 'Muito Alto'] },
              whyDoThis: { type: Type.STRING },
              targetAudienceSnippet: { type: Type.STRING }
            },
            required: ['title', 'description', 'pillar', 'format', 'hook', 'cta', 'whyDoThis', 'potential']
          }
        }
      }
    });

    const rawJson = JSON.parse(response.text || '[]');
    const validated = IdeaGenerationResponseSchema.safeParse(rawJson);

    if (!validated.success) {
      console.warn(`[AI Ideas Schema Mismatch] [req:${requestId}]`, validated.error.format());
      return res.status(502).json({
        error: 'AI_RESPONSE_VALIDATION_FAILED',
        requestId,
        message: 'Ideias geradas não atenderam ao schema rigoroso.'
      });
    }

    const formatted = validated.data.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      clientId: context.client.id,
      status: 'IDEIA',
      createdAt: new Date().toISOString()
    }));

    return res.json({
      ideas: formatted,
      metadata: {
        model: GEMINI_MODEL,
        promptVersion: IDEA_GENERATION_VERSION,
        requestId
      }
    });
  } catch (err: any) {
    console.error(`[AI Error] Generate Ideas [req:${requestId}]:`, err);
    return res.status(500).json({
      error: 'AI_EXECUTION_ERROR',
      requestId,
      message: isProduction ? 'Falha ao gerar ideias com IA.' : err.message
    });
  }
});

// POST /api/ai/classify-content
app.post('/api/ai/classify-content', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  try {
    const parse = ClassifyContentRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'INVALID_REQUEST', requestId, details: parse.error.format() });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'IA não configurada.'
      });
    }

    const promptText = buildContentClassificationPrompt(parse.data);

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pillar: { type: Type.STRING },
            hookCategory: { type: Type.STRING },
            hypothesisReason: { type: Type.STRING },
            isHypothesis: { type: Type.BOOLEAN },
            confidence: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
            improvementTip: { type: Type.STRING }
          },
          required: ['pillar', 'hookCategory', 'hypothesisReason', 'isHypothesis', 'confidence', 'improvementTip']
        }
      }
    });

    const raw = JSON.parse(response.text || '{}');
    const validated = ContentClassificationResponseSchema.safeParse(raw);

    if (!validated.success) {
      return res.status(502).json({ error: 'AI_RESPONSE_VALIDATION_FAILED', requestId });
    }

    return res.json({
      classification: validated.data,
      metadata: {
        model: GEMINI_MODEL,
        promptVersion: CONTENT_CLASSIFICATION_VERSION,
        requestId
      }
    });
  } catch (err: any) {
    console.error(`[AI Error] Classify Content [req:${requestId}]:`, err);
    return res.status(500).json({
      error: 'AI_EXECUTION_ERROR',
      requestId,
      message: isProduction ? 'Falha na classificação de conteúdo.' : err.message
    });
  }
});

// ==========================================
// RESEARCH & COMPETITOR DISCOVERY ROUTES
// (Zero fake simulation when not configured)
// ==========================================

// POST /api/research/query
app.post('/api/research/query', (req: Request, res: Response) => {
  const parse = ResearchRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: parse.error.format() });
  }

  // FASE 14 & 53: Se nenhuma API de busca externa estiver configurada, NÃO simular.
  // Informar honestamente a ausência do provider configurado.
  const hasSearchApi = Boolean(process.env.SERPAPI_KEY || process.env.GOOGLE_SEARCH_API_KEY);

  if (!hasSearchApi) {
    return res.json({
      configured: false,
      message: 'Pesquisa externa não configurada. Configure SERPAPI_KEY ou GOOGLE_SEARCH_API_KEY no servidor.',
      insights: []
    });
  }

  return res.json({
    configured: true,
    insights: []
  });
});

// POST /api/competitors/discover
app.post('/api/competitors/discover', (req: Request, res: Response) => {
  const parse = CompetitorDiscoveryRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: parse.error.format() });
  }

  // FASE 16 & 53: Never invent competitors
  return res.json({
    configured: false,
    message: 'Mecanismo automático de descoberta de concorrentes aguarda configuração de chave de API externa.',
    candidates: []
  });
});

// ==========================================
// CENTRALIZED ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId || crypto.randomUUID();
  console.error(`[INTERNAL_SERVER_ERROR] [req:${requestId}]`, err.stack || err);

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    requestId,
    message: isProduction
      ? 'Ocorreu um erro interno no servidor da aplicação. Por favor contate o suporte.'
      : err.message
  });
});

// ==========================================
// SERVER INITIALIZATION & VITE SPA MOUNT
// ==========================================
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gabriel Speratti Social Intelligence] Running on http://localhost:${PORT}`);
  });
}

startServer();
