import { Router } from 'express';
import { uploadReceipt } from '../controllers/uploadController';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.post('/receipt', upload.single('receipt'), uploadReceipt);

export default router;