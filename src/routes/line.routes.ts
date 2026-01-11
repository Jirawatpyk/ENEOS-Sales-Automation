/**
 * ENEOS Sales Automation - LINE Routes
 * Routes for LINE webhook and API
 */

import { Router } from 'express';
import {
  handleLineWebhook,
  verifyLineSignature,
  testLineNotification,
} from '../controllers/line.controller.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// ===========================================
// LINE Webhook Routes
// ===========================================

/**
 * POST /webhook/line
 * Main webhook endpoint for LINE events
 * Note: Signature verification applied in middleware
 */
router.post('/', verifyLineSignature, asyncHandler(handleLineWebhook));

/**
 * GET /webhook/line/test
 * Test LINE notification (development only)
 */
router.get('/test', asyncHandler(testLineNotification));

export default router;
