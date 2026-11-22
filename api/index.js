const { join } = require('node:path');
const { createRequestHandler } = require('expo-server/adapter/vercel');

// Include the dependencies loaded by Expo's bundled API routes in Vercel's file trace.
require('firebase-admin/app');
require('firebase-admin/auth');
require('firebase-admin/firestore');
require('@google-cloud/firestore');

module.exports = createRequestHandler({ build: join(__dirname, '../dist/server') });
