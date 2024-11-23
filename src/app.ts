import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import protectedRoutes from './routes/protected.js';
import { loginUser, logout } from './services/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Log para debug do caminho
console.log('Project root:', projectRoot);
console.log('Static files path:', path.join(projectRoot, 'dist'));

const app = express();

// Log de todas as requisições
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body) console.log('Body:', req.body);
  next();
});

// Configurações de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por windowMs
});

// Aplicar rate limit em todas as rotas da API
app.use('/api', limiter);

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(projectRoot, 'dist')));

// Rota de teste da API
app.get('/api/health', (req: Request, res: Response) => {
  console.log('Rota /api/health acessada');
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Rota de login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  console.log('Rota /api/auth/login acessada');
  console.log('Método:', req.method);
  console.log('Body:', req.body);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Email ou senha não fornecidos');
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      });
    }

    const result = await loginUser(email, password);
    console.log('Login bem-sucedido para:', email);
    res.json(result);
  } catch (error) {
    console.error('Erro no login:', error);
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Rota de logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  console.log('Rota /api/auth/logout acessada');
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    await logout(token);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

// Rotas protegidas
app.use('/api', protectedRoutes);

// Para qualquer outra rota da API não encontrada
app.all('/api/*', (req: Request, res: Response) => {
  console.log('Rota não encontrada:', req.method, req.path);
  res.status(404).json({ error: 'Rota da API não encontrada' });
});

// Para qualquer outra rota, servir o index.html do frontend
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(projectRoot, 'dist', 'index.html');
  console.log('Servindo arquivo:', indexPath);
  res.sendFile(indexPath);
});

// Tratamento global de erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  console.log('Rotas disponíveis:');
  console.log('- GET  /api/health     -> Verificar status do servidor');
  console.log('- POST /api/auth/login  -> Login');
  console.log('- POST /api/auth/logout -> Logout');
  console.log('- GET  /api/profile    -> Perfil do usuário (requer autenticação)');
});
