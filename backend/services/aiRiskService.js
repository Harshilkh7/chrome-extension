const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const riskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overallSummary: { type: 'string' },
    analyses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: { type: 'string' },
          risk: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          reason: { type: 'string' },
          recommendation: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: [
          'service',
          'risk',
          'reason',
          'recommendation',
          'confidence',
        ],
      },
    },
  },
  required: ['overallSummary', 'analyses'],
};

function buildPrompt(consents) {
  return [
    'You are a browser permission security analyst.',
    'Analyze only the permission information supplied below.',
    'Do not claim that a site is malicious or compromised.',
    'Assess contextual privacy/security risk from the combination of the site origin and its observed permissions.',
    'Use LOW for ordinary, contextually expected permissions, MEDIUM for sensitive permissions with reasonable context, HIGH for permissions that look excessive or unusually sensitive for the apparent site purpose, and CRITICAL only for an especially concerning combination of highly sensitive permissions.',
    'Consider camera, microphone, location, notifications, clipboard, downloads, and other browser permissions according to their sensitivity.',
    'Keep reasons and recommendations concise and actionable.',
    'Confidence must be a number from 0 to 100 and should reflect uncertainty in the available context.',
    '',
    `Permission records:\n${JSON.stringify(consents, null, 2)}`,
  ].join('\n');
}

async function analyzePermissions(consents) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      store: false,
      input: [
        {
          role: 'system',
          content: 'Return a structured browser-permission security assessment. Never invent permissions that are not present in the input.',
        },
        {
          role: 'user',
          content: buildPrompt(consents),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'permission_risk_analysis',
          strict: true,
          schema: riskSchema,
        },
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    console.error('OpenAI API error:', body);
    throw new Error(body?.error?.message || 'AI analysis failed');
  }

  if (!body.output_text) {
    throw new Error('AI returned no analysis');
  }

  return JSON.parse(body.output_text);
}

module.exports = { analyzePermissions };
