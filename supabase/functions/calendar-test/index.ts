// @deno-types
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

// List of allowed origins - make it more permissive
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://cobaltpower.chau.link',
  'https://www.cobaltpower.chau.link',
  'http://cobaltpower.chau.link',
  'http://www.cobaltpower.chau.link'
];

function getCorsHeaders(origin: string) {
  // Accept any origin that matches our allowed list
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
}

async function generateJWT(email: string, privateKey: string): Promise<string> {
  const now = Date.now();
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar", // Changed to full access
    aud: "https://oauth2.googleapis.com/token",
    exp: getNumericDate(3600), // 1 hour from now
    iat: getNumericDate(0)
  };

  // Convert private key from PEM format by removing headers and newlines
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  // Convert base64 to binary
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import the key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  return await create(header, payload, key);
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await generateJWT(email, privateKey);
  console.log("Generated JWT for debugging");
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.statusText}\n${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listCalendars(): Promise<any> {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Missing service account credentials');
  }

  // Get access token
  const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
  console.log('Got access token for debugging');

  // Make the API request
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendars: ${response.statusText}\n${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  console.log('Incoming request from origin:', origin);
  
  const corsHeaders = getCorsHeaders(origin || '');

  // Log full request details for debugging
  console.log({
    method: req.method,
    origin: origin,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Handle CORS preflight requests - Fixed: return Response without body for OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    // Parse request body
    const { action } = await req.json();

    if (action === 'listCalendars') {
      const calendars = await listCalendars();
      return new Response(
        JSON.stringify({
          success: true,
          data: calendars
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        }
      );
    }

    // Get service account config
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')

    // Log environment variable status (without exposing values)
    console.log({
      serviceAccountEmailPresent: !!serviceAccountEmail,
      privateKeyPresent: !!privateKey,
      origin: origin || 'no origin'
    });

    const config = {
      serviceAccount: {
        email: serviceAccountEmail,
        hasPrivateKey: !!privateKey
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isConfigured: !!serviceAccountEmail && !!privateKey,
        data: { config }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in edge function:', {
      error: error.message,
      stack: error.stack,
      origin: origin || 'no origin'
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})
