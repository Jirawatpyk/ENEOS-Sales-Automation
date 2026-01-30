/**
 * ENEOS Sales Automation - Campaign Webhook Routes
 * Routes for Brevo Campaign Events webhook
 */

import { Router } from 'express';
import {
  handleCampaignWebhook,
  verifyCampaignWebhook,
} from '../controllers/campaign-webhook.controller.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// ===========================================
// Campaign Webhook Routes
// ===========================================

/**
 * GET /webhook/brevo/campaign
 * Verification endpoint for Brevo webhook setup
 */
router.get('/', verifyCampaignWebhook);

/**
 * POST /webhook/brevo/campaign
 * Main webhook endpoint for Brevo campaign events
 * Handles: delivered, opened, click (and prepared for future events)
 */
router.post('/', asyncHandler(handleCampaignWebhook));

export default router;
