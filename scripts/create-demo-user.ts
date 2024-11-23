import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  try {
    // Verificar se a empresa já existe
    let company = await prisma.company.findUnique({
      where: { id: 'tsystem-demo' }
    });

    // Criar empresa apenas se não existir
    if (!company) {
      company = await prisma.company.create({
        data: {
          id: 'tsystem-demo',
          name: 'T SYSTEM',
        },
      });
      console.log('Empresa criada com sucesso:', company);
    } else {
      console.log('Empresa já existe:', company);
    }

    // Verificar se o usuário já existe
    let user = await prisma.user.findUnique({
      where: { email: 'demonstracao@tsystem.online' }
    });

    // Atualizar ou criar usuário
    const passwordHash = await hashPassword('demonstracao');
    
    if (user) {
      user = await prisma.user.update({
        where: { email: 'demonstracao@tsystem.online' },
        data: {
          passwordHash,
        },
      });
      console.log('Senha do usuário atualizada com sucesso:', user);
    } else {
      user = await prisma.user.create({
        data: {
          id: 'demo-user',
          email: 'demonstracao@tsystem.online',
          name: 'Usuário Demonstração',
          passwordHash,
          role: 'manager',
          companyId: company.id,
        },
      });
      console.log('Usuário criado com sucesso:', user);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
