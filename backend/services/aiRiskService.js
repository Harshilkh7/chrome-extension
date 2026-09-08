const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.7-flash';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

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
    'Return one analysis entry for every supplied permission record.',
    '',
    `Permission records:\n${JSON.stringify(consents, null, 2)}`,
  ].join('\n');
}

function isTemporaryModelError(error) {
  return error?.status === 503 || error?.status === 429 ||
    error?.error?.status === 'UNAVAILABLE' ||
    error?.error?.status === 'RESOURCE_EXHAUSTED';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateAnalysis(ai, model, prompt) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: riskSchema,
        },
      });
    } catch (error) {
      if (!isTemporaryModelError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

async function analyzePermissions(consents) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = buildPrompt(consents);

  let response;

  try {
    response = await generateAnalysis(ai, DEFAULT_MODEL, prompt);
  } catch (error) {
    if (!isTemporaryModelError(error) || DEFAULT_MODEL === FALLBACK_MODEL) {
      throw error;
    }

    response = await generateAnalysis(ai, FALLBACK_MODEL, prompt);
  }

  if (!response?.text) {
    throw new Error('Gemini returned no analysis');
  }

  return JSON.parse(response.text);
}

module.exports = { analyzePermissions };
