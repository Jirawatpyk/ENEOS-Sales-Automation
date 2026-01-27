/**
 * Status API Routes
 * Endpoints for checking lead processing status
 */

import { Router } from 'express';
import { getProcessingStatus, getAllProcessingStatuses } from '../controllers/status.controller.js';
import { adminAuthMiddleware } from '../middleware/admin-auth.js';

const router = Router();

/**
 * GET /api/leads/status
 * Get all processing statuses (admin only - requires authentication)
 */
router.get('/', adminAuthMiddleware, getAllProcessingStatuses);

/**
 * GET /api/leads/status/:correlationId
 * Get processing status by correlation ID (public with valid UUID)
 */
router.get('/:correlationId', getProcessingStatus);

export default router;
