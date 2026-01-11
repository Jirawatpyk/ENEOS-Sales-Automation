/**
 * ENEOS Sales Automation - Webhook Routes
 * Routes for Brevo webhooks
 */

import { Router } from 'express';
import {
  handleBrevoWebhook,
  verifyWebhook,
  testWebhook,
} from '../controllers/webhook.controller.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// ===========================================
// Brevo Webhook Routes
// ===========================================

/**
 * GET /webhook/brevo
 * Verification endpoint for Brevo webhook setup
 */
router.get('/brevo', verifyWebhook);

/**
 * POST /webhook/brevo
 * Main webhook endpoint for Brevo events
 */
router.post('/brevo', asyncHandler(handleBrevoWebhook));

/**
 * POST /webhook/brevo/test
 * Test endpoint for development
 */
router.post('/brevo/test', asyncHandler(testWebhook));

export default router;
