import express from 'express';
import { requireAuth } from '../middleware/auth';
import { getPayments, createPayment, deletePayment } from '../controllers/paymentsController';

const router = express.Router();

router.get('/', requireAuth, getPayments);
router.post('/', requireAuth, createPayment);
router.delete('/:id', requireAuth, deletePayment);

export default router;
