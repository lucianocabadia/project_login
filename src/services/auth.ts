import { LoginResponse, LoginLog } from '../types/auth.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-muito-seguro-aqui';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

// Cache de tentativas de login (será substituído por Redis em produção)
const loginAttempts = new Map<string, { count: number; timestamp: number }>();

function isRateLimited(email: string): boolean {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;
  
  if (Date.now() - attempts.timestamp > LOCKOUT_DURATION) {
    loginAttempts.delete(email);
    return false;
  }
  
  return attempts.count >= MAX_ATTEMPTS;
}

function recordLoginAttempt(email: string) {
  const attempts = loginAttempts.get(email) || { count: 0, timestamp: Date.now() };
  attempts.count += 1;
  attempts.timestamp = Date.now();
  loginAttempts.set(email, attempts);
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  console.log('Tentativa de login para:', email);
  try {
    // Verificar limite de tentativas
    if (isRateLimited(email)) {
      console.log('Usuário limitado por muitas tentativas:', email);
      throw new Error('Muitas tentativas de login. Tente novamente mais tarde.');
    }

    // Buscar usuário no banco de dados
    console.log('Buscando usuário no banco de dados...');
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
      },
    });

    console.log('Resultado da busca:', user ? 'Usuário encontrado' : 'Usuário não encontrado');

    if (!user) {
      recordLoginAttempt(email);
      throw new Error('Credenciais inválidas');
    }

    // Verificar senha
    console.log('Verificando senha...');
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Senha válida:', passwordValid);
    
    if (!passwordValid) {
      recordLoginAttempt(email);
      throw new Error('Credenciais inválidas');
    }

    // Gerar token JWT
    console.log('Gerando token JWT...');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Registrar token de acesso
    console.log('Registrando token de acesso...');
    await prisma.accessToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    // Registrar login bem-sucedido
    console.log('Registrando login bem-sucedido...');
    await logLoginAttempt({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      status: 'success',
    });

    console.log('Login concluído com sucesso para:', email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
      },
      token,
    };
  } catch (error) {
    console.error('Erro durante o login:', error);
    // Registrar falha de login
    await logLoginAttempt({
      email,
      companyId: 'unknown',
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    throw error;
  }
}

export async function logLoginAttempt(
  data: Omit<LoginLog, 'ip' | 'country' | 'city' | 'region'>
): Promise<void> {
  try {
    await prisma.loginLog.create({
      data: {
        ...data,
        timestamp: new Date(),
        ip: 'unknown',
        country: 'unknown',
        city: 'unknown',
        region: 'unknown',
        companyId: data.companyId || 'tsystem-demo', // Usar companyId padrão para tentativas falhas
      },
    });
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
  }
}

export async function logout(token: string): Promise<void> {
  try {
    await prisma.accessToken.deleteMany({
      where: {
        token,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw new Error('Erro ao fazer logout');
  }
}

// Função auxiliar para criar hash de senha
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Função para verificar se um token é válido
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // Verificar se o token existe no banco de dados
    const accessToken = await prisma.accessToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!accessToken;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return false;
  }
}