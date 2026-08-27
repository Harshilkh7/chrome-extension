import React, {
  useState,
  useEffect
} from 'react';

import {
  socket,
  connectSocket,
  disconnectSocket
} from '../services/socket';

import { motion } from 'framer-motion';

import {
  ExternalLink,
  ShieldCheck,
  XCircle,
  CalendarDays
} from 'lucide-react';

import api from '../services/api';
import Navbar from '../components/Navbar';


export default function Dashboard() {
  const [consents, setConsents] =
    useState([]);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);


  /*
   * Load existing consents from REST API.
   */
  useEffect(() => {
    const loadConsents = async () => {
      try {
        const { data } =
          await api.get(
            '/consent/my-consents'
          );

        setConsents(data);

      } catch (err) {
        console.error(
          'Failed to load consents:',
          err
        );

        setError(
          err.response?.data?.error ||
            'Failed to load consents'
        );

      } finally {
        setLoading(false);
      }
    };

    loadConsents();
  }, []);


  /*
   * Setup Socket.IO.
   */
  useEffect(() => {

    /*
     * This function receives updates
     * from the backend.
     */
    const handleConsentUpdated = (
      updatedConsent
    ) => {
      console.log(
        'REAL-TIME CONSENT UPDATE:',
        updatedConsent
      );

      setConsents(
        (currentConsents) => {

          const exists =
            currentConsents.some(
              (consent) =>
                consent._id ===
                updatedConsent._id
            );

          /*
           * Existing consent:
           * replace it with the updated version.
           */
          if (exists) {
            return currentConsents.map(
              (consent) =>
                consent._id ===
                updatedConsent._id
                  ? updatedConsent
                  : consent
            );
          }

          /*
           * New consent:
           * add it to the beginning.
           */
          return [
            updatedConsent,
            ...currentConsents
          ];
        }
      );
    };


    /*
     * IMPORTANT:
     *
     * Register listener FIRST.
     */
    socket.on(
      'consent-updated',
      handleConsentUpdated
    );


    /*
     * THEN connect the socket.
     */
    connectSocket();


    /*
     * Cleanup when leaving dashboard.
     */
    return () => {
      socket.off(
        'consent-updated',
        handleConsentUpdated
      );

      disconnectSocket();
    };

  }, []);


  const renderPermissions = (
    consent
  ) => {
    if (
      !consent.dataShared ||
      !Array.isArray(
        consent.dataShared
      )
    ) {
      return null;
    }

    return consent.dataShared.map(
      ({
        permission,
        granted
      }) => (
        <div
          key={permission}
          className="flex justify-between items-center mb-2 px-3 py-2 rounded-md hover:bg-indigo-50"
        >
          <p className="text-gray-700 text-sm">
            <span className="font-medium">
              {permission}:
            </span>{' '}

            <span
              className={
                granted
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {granted
                ? 'Granted'
                : 'Denied'}
            </span>
          </p>
        </div>
      )
    );
  };


  return (
    <>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">

          <h2 className="text-4xl font-extrabold text-gray-900 flex items-center">

            <ShieldCheck className="mr-2 text-indigo-600" />

            Permission Dashboard

          </h2>

          <CalendarDays className="text-gray-400" />

        </div>


        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md flex items-center space-x-2">

            <XCircle className="w-5 h-5" />

            <span>
              {error}
            </span>

          </div>
        )}


        {loading ? (

          <p className="text-gray-500 text-center mt-20">
            Loading...
          </p>

        ) : consents.length === 0 ? (

          <p className="text-gray-600 text-lg text-center mt-20">
            No consents logged yet. Browse a
            site with the extension installed
            and it will show up here.
          </p>

        ) : (

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {consents.map(
              (consent) => (

                <motion.div
                  key={consent._id}

                  initial={{
                    scale: 0.95,
                    opacity: 0
                  }}

                  animate={{
                    scale: 1,
                    opacity: 1
                  }}

                  transition={{
                    duration: 0.4
                  }}

                  whileHover={{
                    scale: 1.03,
                    boxShadow:
                      '0 10px 20px rgba(0,0,0,0.12)'
                  }}

                  className="bg-white rounded-2xl p-6 border border-gray-200"
                >

                  <div className="flex items-center justify-between mb-4">

                    <h3 className="text-xl font-semibold text-indigo-700 truncate">
                      {consent.service}
                    </h3>

                    <ExternalLink
                      className="text-gray-400 hover:text-indigo-600 cursor-pointer flex-shrink-0"

                      onClick={() =>
                        window.open(
                          consent.service,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                    />

                  </div>


                  {renderPermissions(
                    consent
                  )}

                </motion.div>

              )
            )}

          </div>

        )}

      </div>
    </>
  );
}