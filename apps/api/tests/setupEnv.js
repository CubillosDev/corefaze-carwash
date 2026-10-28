process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_KEY_POSTMAN = 'llave-de-pruebas-postman-0123456789';
process.env.API_KEY_ADMIN = 'llave-de-pruebas-admin-0123456789ab';
process.env.API_KEY_MOVIL = 'llave-de-pruebas-movil-0123456789ab';
process.env.API_KEY_WEB = 'llave-de-pruebas-web-0123456789abcd';
process.env.JWT_SECRET = 'secreto-jwt-de-pruebas-0123456789abcdefghijklmnopqrstuvwxyz';
process.env.ALLOWED_ORIGIN = 'http://localhost:5173';

// Stack local de Supabase (`npx supabase start`), nunca el remoto. La
// service_role key es la fija y conocida de cualquier instalación local
// de la CLI (no es un secreto real) — ver supabase/README.md.
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
