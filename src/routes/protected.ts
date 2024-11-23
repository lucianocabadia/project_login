import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rota protegida que requer apenas autenticação
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Perfil do usuário',
    user: req.user
  });
});

// Rota protegida que requer role específica
router.get(
  '/admin-dashboard',
  authMiddleware,
  roleMiddleware(['admin']),
  (req, res) => {
    res.json({
      message: 'Dashboard do administrador',
      user: req.user
    });
  }
);

// Rota protegida que aceita múltiplas roles
router.get(
  '/management',
  authMiddleware,
  roleMiddleware(['admin', 'director', 'manager']),
  (req, res) => {
    res.json({
      message: 'Área de gestão',
      user: req.user
    });
  }
);

export default router;
