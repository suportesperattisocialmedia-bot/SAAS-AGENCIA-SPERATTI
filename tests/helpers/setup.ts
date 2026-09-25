// Ambiente de teste determinístico — nenhum valor real de produção.
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-32-characters!!';
process.env.META_APP_ID = 'test-app-id';
process.env.META_APP_SECRET = 'test-app-secret';
process.env.META_REDIRECT_URI = 'https://saas-agencia-speratti.vercel.app/api/auth/instagram/callback';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/speratti_test';
delete process.env.GEMINI_API_KEY;
delete process.env.SERPAPI_KEY;
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
delete process.env.APP_URL;
