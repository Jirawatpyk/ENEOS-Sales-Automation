/**
 * ENEOS Sales Automation - Swagger/OpenAPI Configuration
 * API Documentation for Enterprise Integration
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ENEOS Sales Automation API',
      version: '1.0.0',
      description: `
Enterprise-grade Sales Automation System for ENEOS Thailand.

## Features
- Brevo Webhook Integration for Email Campaign Leads
- Gemini AI Analysis for Company Insights
- LINE OA Notifications for Sales Team
- Google Sheets as Database
- Race Condition Protection

## Authentication
- **Brevo Webhook**: Validates webhook signature (optional)
- **LINE Webhook**: X-Line-Signature header validation (required)

## Rate Limiting
- Default: 100 requests per 60 seconds
      `,
      contact: {
        name: 'ENEOS Thailand IT Team',
        email: 'it@eneos.co.th',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://eneos-sales-automation-production.up.railway.app',
        description: 'Production server (Railway)',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Webhooks',
        description: 'Webhook endpoints for Brevo and LINE',
      },
      {
        name: 'Status',
        description: 'Background processing status tracking',
      },
      {
        name: 'DLQ',
        description: 'Dead Letter Queue management',
      },
      {
        name: 'Metrics',
        description: 'Prometheus metrics for monitoring',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Full health check with service status',
          description: 'Returns detailed health status of all integrated services',
          responses: {
            200: {
              description: 'Health check response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthCheck',
                  },
                },
              },
            },
          },
        },
      },
      '/ready': {
        get: {
          tags: ['Health'],
          summary: 'Kubernetes readiness probe',
          responses: {
            200: {
              description: 'Service is ready',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ready' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/live': {
        get: {
          tags: ['Health'],
          summary: 'Kubernetes liveness probe',
          responses: {
            200: {
              description: 'Service is alive',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'alive' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/webhook/brevo': {
        post: {
          tags: ['Webhooks'],
          summary: 'Brevo Email Campaign Webhook',
          description: `
Receives webhook events from Brevo email campaigns.

**Flow:**
1. Validates webhook payload
2. Checks for duplicate leads
3. Analyzes company with Gemini AI
4. Saves to Google Sheets
5. Sends LINE notification to sales team
          `,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BrevoWebhook',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Webhook processed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/WebhookResponse',
                  },
                },
              },
            },
            400: {
              description: 'Invalid webhook payload',
            },
            429: {
              description: 'Rate limit exceeded',
            },
          },
        },
      },
      '/webhook/line': {
        post: {
          tags: ['Webhooks'],
          summary: 'LINE OA Webhook',
          description: `
Receives postback events from LINE OA when sales team interacts with lead cards.

**Postback Actions:**
- \`contacted\` - Accept/claim the lead
- \`closed\` - Mark as sale closed (won)
- \`lost\` - Mark as sale lost
- \`unreachable\` - Mark customer as unreachable

**Race Condition Protection:**
- Only one sales person can claim a lead
- Only the owner can update lead status
          `,
          parameters: [
            {
              name: 'X-Line-Signature',
              in: 'header',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'LINE signature for webhook validation',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LineWebhook',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Webhook acknowledged',
            },
          },
        },
      },
      '/api/leads/status/{correlationId}': {
        get: {
          tags: ['Status'],
          summary: 'Check lead processing status by correlation ID',
          description: `
Check the background processing status of a lead using the correlation ID returned from webhook response.

**Status Values:**
- \`pending\` - Lead is queued for processing
- \`processing\` - Currently being processed (AI analysis, Sheets write)
- \`completed\` - Successfully processed and saved
- \`failed\` - Processing failed with error message

**Use Case:**
Frontend can poll this endpoint after receiving 200 OK from webhook to check when processing completes.
          `,
          parameters: [
            {
              name: 'correlationId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              description: 'UUID correlation ID returned from webhook response',
            },
          ],
          responses: {
            200: {
              description: 'Processing status found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                      data: {
                        $ref: '#/components/schemas/ProcessingStatus',
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Invalid UUID format',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: false,
                      },
                      error: {
                        type: 'string',
                        example: 'Invalid correlation ID format',
                      },
                      message: {
                        type: 'string',
                        example: 'Correlation ID must be a valid UUID',
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: 'Status not found (expired or never existed)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: false,
                      },
                      error: {
                        type: 'string',
                        example: 'Status not found',
                      },
                      message: {
                        type: 'string',
                        example: 'No processing status found for this correlation ID',
                      },
                      correlationId: {
                        type: 'string',
                        example: '550e8400-e29b-41d4-a716-446655440000',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/leads/status': {
        get: {
          tags: ['Status'],
          summary: 'Get all processing statuses (Admin only)',
          description: `
Returns all current processing statuses in memory. Requires admin authentication.

**TTL:** Statuses auto-expire after 1 hour (3600000ms).

**Admin Only:** This endpoint requires authentication via adminAuthMiddleware.
          `,
          security: [
            {
              AdminAuth: [],
            },
          ],
          responses: {
            200: {
              description: 'List of all processing statuses',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                      count: {
                        type: 'integer',
                        example: 5,
                      },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/ProcessingStatus',
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized - Admin authentication required',
            },
          },
        },
      },
      '/dlq/events': {
        get: {
          tags: ['DLQ'],
          summary: 'Get failed events from Dead Letter Queue',
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['pending', 'retrying', 'failed', 'resolved'],
              },
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                default: 50,
              },
            },
          ],
          responses: {
            200: {
              description: 'List of failed events',
            },
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['Metrics'],
          summary: 'Prometheus metrics endpoint',
          description: `
Returns Prometheus-format metrics for monitoring and alerting.

**Available Metrics:**
- \`http_request_duration_seconds\` - HTTP request latency histogram
- \`http_requests_total\` - Total HTTP requests counter
- \`leads_processed_total\` - Leads processed by source and status
- \`leads_claimed_total\` - Leads claimed by sales team
- \`ai_analysis_duration_seconds\` - Gemini AI analysis latency
- \`line_notification_total\` - LINE notifications sent
- \`duplicate_leads_total\` - Duplicate leads detected
- \`race_conditions_total\` - Race conditions detected
- \`dead_letter_queue_size\` - Current DLQ size

Plus default Node.js metrics (CPU, memory, event loop, etc.)
          `,
          responses: {
            200: {
              description: 'Prometheus metrics in text format',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example: '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/health",status_code="200"} 42',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
            },
            services: {
              type: 'object',
              properties: {
                googleSheets: {
                  $ref: '#/components/schemas/ServiceStatus',
                },
                geminiAI: {
                  $ref: '#/components/schemas/ServiceStatus',
                },
                lineAPI: {
                  $ref: '#/components/schemas/ServiceStatus',
                },
              },
            },
          },
        },
        ServiceStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['up', 'down'],
            },
            latency: {
              type: 'integer',
              description: 'Response time in milliseconds',
            },
          },
        },
        BrevoWebhook: {
          type: 'object',
          required: ['event', 'email'],
          properties: {
            event: {
              type: 'string',
              enum: ['click', 'opened', 'delivered', 'hard_bounce', 'soft_bounce', 'spam', 'unsubscribed'],
              example: 'click',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'customer@company.com',
            },
            FIRSTNAME: {
              type: 'string',
              example: 'John',
            },
            LASTNAME: {
              type: 'string',
              example: 'Doe',
            },
            PHONE: {
              type: 'string',
              example: '0812345678',
            },
            COMPANY: {
              type: 'string',
              example: 'ACME Corporation',
            },
            campaign_id: {
              type: 'integer',
              example: 12345,
            },
            campaign_name: {
              type: 'string',
              example: 'ENEOS Premium Oil 2024',
            },
            subject: {
              type: 'string',
              example: 'Special Offer for Your Business',
            },
            'message-id': {
              type: 'string',
              example: 'abc-123-xyz',
            },
            date: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        LineWebhook: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['postback', 'message', 'follow', 'unfollow'],
                  },
                  replyToken: {
                    type: 'string',
                  },
                  source: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                      },
                      userId: {
                        type: 'string',
                      },
                      groupId: {
                        type: 'string',
                      },
                    },
                  },
                  postback: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'string',
                        example: 'action=contacted&row_id=42',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        WebhookResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
              properties: {
                rowNumber: {
                  type: 'integer',
                },
                email: {
                  type: 'string',
                },
                company: {
                  type: 'string',
                },
                industry: {
                  type: 'string',
                },
              },
            },
          },
        },
        ProcessingStatus: {
          type: 'object',
          required: ['correlationId', 'email', 'company', 'status', 'startedAt'],
          properties: {
            correlationId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
              description: 'Unique identifier for tracking this processing job',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'customer@company.com',
              description: 'Lead email address',
            },
            company: {
              type: 'string',
              example: 'SCG',
              description: 'Company name',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed',
              description: 'Current processing status',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'When processing started (ISO 8601)',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:15.500Z',
              description: 'When processing finished (ISO 8601)',
            },
            rowNumber: {
              type: 'integer',
              example: 42,
              description: 'Google Sheets row number where lead was saved',
            },
            industry: {
              type: 'string',
              example: 'Manufacturing',
              description: 'AI-detected industry from Gemini analysis',
            },
            confidence: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              example: 0.95,
              description: 'AI confidence score (0-1)',
            },
            error: {
              type: 'string',
              example: 'Gemini API timeout',
              description: 'Error message if status is failed',
            },
            duration: {
              type: 'number',
              format: 'float',
              example: 15.5,
              description: 'Processing duration in seconds',
            },
          },
        },
      },
      securitySchemes: {
        AdminAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Admin authentication token (configured via ADMIN_API_KEY env var)',
        },
      },
    },
  },
  apis: [], // We define everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);
