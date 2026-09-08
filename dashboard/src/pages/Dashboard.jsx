import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  CalendarDays,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { socket, connectSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';
import Navbar from '../components/Navbar';

const riskClasses = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [consents, setConsents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    const loadConsents = async () => {
      try {
        const { data } = await api.get('/consent/my-consents');
        setConsents(data);
      } catch (err) {
        console.error('Failed to load consents:', err);
        setError(err.response?.data?.error || 'Failed to load consents');
      } finally {
        setLoading(false);
      }
    };

    loadConsents();
  }, []);

  useEffect(() => {
    const handleConsentUpdated = (updatedConsent) => {
      setConsents((currentConsents) => {
        const exists = currentConsents.some((consent) => consent._id === updatedConsent._id);
        if (exists) {
          return currentConsents.map((consent) =>
            consent._id === updatedConsent._id ? updatedConsent : consent
          );
        }
        return [updatedConsent, ...currentConsents];
      });
    };

    const handleAiUpdated = ({ summary, consents: updatedConsents }) => {
      if (summary) setAiSummary(summary);
      if (updatedConsents?.length) {
        setConsents((current) =>
          current.map((consent) =>
            updatedConsents.find((updated) => updated._id === consent._id) || consent
          )
        );
      }
    };

    socket.on('consent-updated', handleConsentUpdated);
    socket.on('ai-analysis-updated', handleAiUpdated);
    connectSocket();

    return () => {
      socket.off('consent-updated', handleConsentUpdated);
      socket.off('ai-analysis-updated', handleAiUpdated);
      disconnectSocket();
    };
  }, []);

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    setError('');

    try {
      const { data } = await api.post('/ai/analyze');
      setAiSummary(data.summary || 'Analysis completed.');
      setConsents(data.consents || []);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError(
        err.response?.data?.error ||
          'AI analysis failed. Make sure OPENAI_API_KEY is configured on the backend.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const renderPermissions = (consent) => {
    if (!Array.isArray(consent.dataShared)) return null;

    return consent.dataShared.map(({ permission, granted }) => (
      <div
        key={permission}
        className="flex justify-between items-center mb-2 px-3 py-2 rounded-md hover:bg-indigo-50"
      >
        <p className="text-gray-700 text-sm">
          <span className="font-medium">{permission}:</span>{' '}
          <span className={granted ? 'text-green-600' : 'text-red-600'}>
            {granted ? 'Granted' : 'Denied'}
          </span>
        </p>
      </div>
    ));
  };

  const highRiskCount = consents.filter(
    (consent) => consent.aiRisk === 'HIGH' || consent.aiRisk === 'CRITICAL'
  ).length;

  return (
    <>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 flex items-center">
            <ShieldCheck className="mr-2 text-indigo-600" />
            Permission Dashboard
          </h2>

          <div className="flex items-center gap-3">
            <CalendarDays className="text-gray-400" />
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={analyzing || consents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? 'Analyzing...' : 'AI Security Analysis'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md flex items-center space-x-2">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {aiSummary && (
          <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold text-indigo-900">AI Security Summary</h3>
                <p className="mt-2 text-indigo-900/80">{aiSummary}</p>
                <p className="mt-3 text-sm text-indigo-700">
                  {highRiskCount} high/critical site{highRiskCount === 1 ? '' : 's'} detected in the latest analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center mt-20">Loading...</p>
        ) : consents.length === 0 ? (
          <p className="text-gray-600 text-lg text-center mt-20">
            No consents logged yet. Browse a site with the extension installed and it will show up here.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {consents.map((consent) => (
              <motion.div
                key={consent._id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.03, boxShadow: '0 10px 20px rgba(0,0,0,0.12)' }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h3 className="text-xl font-semibold text-indigo-700 truncate">
                    {consent.service}
                  </h3>
                  <ExternalLink
                    className="text-gray-400 hover:text-indigo-600 cursor-pointer flex-shrink-0"
                    onClick={() => window.open(consent.service, '_blank', 'noopener,noreferrer')}
                  />
                </div>

                {renderPermissions(consent)}

                {consent.aiRisk && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <ShieldAlert className="h-4 w-4" /> AI Risk
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          riskClasses[consent.aiRisk] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {consent.aiRisk}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-600">{consent.aiReason}</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">
                      Recommendation: {consent.aiRecommendation}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      AI confidence: {Math.round(consent.aiConfidence || 0)}%
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  Dashboard cannot directly revoke a website permission. Chrome does not expose a
                  web API that lets a website or normal extension arbitrarily remove a site's
                  camera, microphone, location, or similar browser permission.
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
