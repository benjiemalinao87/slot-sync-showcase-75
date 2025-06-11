/* @ts-nocheck */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { google } from 'npm:googleapis@109.0.0';

// You can tighten this list if you like
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

serve(async (req: Request) => {
  console.log('→', req.method, req.url);

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Parse JSON body
  let data: any;
  try {
    data = await req.json();
  } catch (err) {
    console.error('Invalid JSON', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { action, ...body } = data;

  // Load & validate service-account creds
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const rawKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  const privateKey = rawKey?.replace(/\\n/g, '\n');
  if (!serviceAccountEmail || !privateKey) {
    console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or PRIVATE_KEY');
    // But we still allow getAuthUrl / handleAuthCallback / updateCredentials
  }

  // Prepare Google Auth client once per request
  let googleAuth: google.auth.GoogleAuth | null = null;
  let authClient: any = null;
  if (serviceAccountEmail && privateKey) {
    googleAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey
      },
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    authClient = await googleAuth.getClient();
  }

  const calendarClient = authClient
    ? google.calendar({ version: 'v3', auth: authClient })
    : null;

  try {
    switch (action) {
      case 'checkConfiguration': {
        const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
        return new Response(
          JSON.stringify({
            isConfigured:
              (!!serviceAccountEmail && !!privateKey) || !!refreshToken,
            config: {
              serviceAccount: {
                isConfigured: !!serviceAccountEmail && !!privateKey,
                email: serviceAccountEmail || null,
                hasPrivateKey: !!privateKey
              },
              oauth: { isConfigured: !!refreshToken }
            }
          }),
          { headers: CORS_HEADERS }
        );
      }

      case 'updateCredentials': {
        const { clientId, clientSecret } = body;
        if (!clientId || !clientSecret) {
          return new Response(
            JSON.stringify({ error: 'Client ID and Client Secret are required' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
        // You might want to persist these somewhere
        console.log('Received OAuth client credentials');
        return new Response(
          JSON.stringify({
            success: true,
            message:
              'Client credentials received. Please add them to your Supabase secrets.'
          }),
          { headers: CORS_HEADERS }
        );
      }

      case 'getAvailableSlots': {
        const { date, calendarId } = body;
        if (!date || !calendarId) {
          return new Response(
            JSON.stringify({ error: 'Date and Calendar ID are required' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!calendarClient) {
          throw new Error('Google service account not initialized');
        }

        const timeMin = new Date(date);
        timeMin.setHours(9, 0, 0, 0);
        const timeMax = new Date(date);
        timeMax.setHours(17, 0, 0, 0);

        const fb = await calendarClient.freebusy.query({
          requestBody: {
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            items: [{ id: calendarId }]
          }
        });

        const busy = fb.data.calendars?.[calendarId]?.busy || [];
        const slots = [];
        for (
          let t = new Date(timeMin);
          t < timeMax;
          t.setMinutes(t.getMinutes() + 30)
        ) {
          const start = new Date(t);
          const end = new Date(t.getTime() + 30 * 60_000);
          const isBooked = busy.some(s =>
            start < new Date(s.end) && end > new Date(s.start)
          );
          slots.push({
            id: `${start.toISOString()}_${end.toISOString()}`,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            isAvailable: !isBooked,
            time: `${start.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })} - ${end.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}`
          });
        }

        return new Response(JSON.stringify({ slots }), {
          headers: CORS_HEADERS
        });
      }

      case 'getBusyDays': {
        const { startDate, endDate, calendarId } = body;
        if (!startDate || !endDate || !calendarId) {
          return new Response(
            JSON.stringify({
              error: 'Start date, end date, and Calendar ID are required'
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!calendarClient) {
          throw new Error('Google service account not initialized');
        }

        const timeMin = new Date(startDate);
        const timeMax = new Date(endDate);
        const fb = await calendarClient.freebusy.query({
          requestBody: {
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            items: [{ id: calendarId }]
          }
        });

        const busy = fb.data.calendars?.[calendarId]?.busy || [];
        const busyDaysSet = new Set<string>();

        busy.forEach(slot => {
          const s = new Date(slot.start);
          const e = new Date(slot.end);
          let cur = new Date(s);
          cur.setHours(0, 0, 0, 0);
          while (cur <= e) {
            busyDaysSet.add(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
          }
        });

        // Find fully booked days
        const fullyBooked: string[] = [];
        busyDaysSet.forEach(dayStr => {
          const day = new Date(dayStr);
          const dayStart = new Date(day);
          dayStart.setHours(9, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(17, 0, 0, 0);

          const coversFull =
            busy.some(slot => {
              const s = new Date(slot.start);
              const e = new Date(slot.end);
              return s <= dayStart && e >= dayEnd;
            });

          if (coversFull) fullyBooked.push(dayStr);
        });

        return new Response(
          JSON.stringify({
            busyDays: fullyBooked,
            month: timeMin.getMonth(),
            year: timeMin.getFullYear()
          }),
          { headers: CORS_HEADERS }
        );
      }

      case 'bookAppointment': {
        const {
          calendarId,
          startTime,
          endTime,
          timeZone,
          summary,
          description
        } = body;
        if (
          !calendarId ||
          !startTime ||
          !endTime ||
          !timeZone ||
          !summary
        ) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for booking' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!calendarClient) {
          throw new Error('Google service account not initialized');
        }

        // Validate
        const parseDate = (str: string) => {
          const d = new Date(str);
          if (isNaN(d.getTime())) throw new Error(`Invalid date: ${str}`);
          return d.toISOString();
        };
        const sISO = parseDate(startTime);
        const eISO = parseDate(endTime);

        const resp = await calendarClient.events.insert({
          calendarId,
          requestBody: {
            summary,
            description: description || '',
            start: { dateTime: sISO, timeZone },
            end: { dateTime: eISO, timeZone }
          }
        });

        return new Response(
          JSON.stringify({
            success: true,
            eventId: resp.data.id,
            eventLink: resp.data.htmlLink
          }),
          { headers: CORS_HEADERS }
        );
      }

      case 'getAuthUrl': {
        const { scopes, accessType, prompt, redirectUri } = body;
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
          return new Response(
            JSON.stringify({
              error: 'Google OAuth credentials not configured'
            }),
            { status: 500, headers: CORS_HEADERS }
          );
        }

        const url = new URL(
          'https://accounts.google.com/o/oauth2/v2/auth'
        );
        url.searchParams.set('client_id', clientId);
        url.searchParams.set(
          'redirect_uri',
          redirectUri || body.origin + '/auth/callback'
        );
        url.searchParams.set('response_type', 'code');

        const arr = Array.isArray(scopes)
          ? scopes
          : scopes
          ? scopes.split(' ')
          : [];
        if (accessType === 'offline') {
          arr.push(
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
          );
        }
        url.searchParams.set('scope', arr.join(' '));
        if (accessType) url.searchParams.set('access_type', accessType);
        if (prompt) url.searchParams.set('prompt', prompt);

        return new Response(
          JSON.stringify({ url: url.toString() }),
          { headers: CORS_HEADERS }
        );
      }

      case 'handleAuthCallback': {
        const { code, origin, redirectUri } = body;
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
          return new Response(
            JSON.stringify({ error: 'OAuth not configured' }),
            { status: 500, headers: CORS_HEADERS }
          );
        }

        const actualRedirect = redirectUri || origin + '/auth/callback';
        const params = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: actualRedirect,
          grant_type: 'authorization_code'
        });

        const tokenResp = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
          }
        );

        const text = await tokenResp.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          return new Response(
            JSON.stringify({ error: 'Bad token response', raw: text }),
            { status: 500, headers: CORS_HEADERS }
          );
        }
        if (!tokenResp.ok) {
          return new Response(
            JSON.stringify({
              error: json.error_description || json.error || 'Token exchange failed',
              details: json
            }),
            { status: 500, headers: CORS_HEADERS }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            refreshToken: json.refresh_token,
            accessToken: json.access_token,
            expiresIn: json.expires_in
          }),
          { headers: CORS_HEADERS }
        );
      }

      case 'saveRefreshToken': {
        const { refreshToken, isAdmin } = body;
        if (isAdmin) {
          console.log('Admin refresh token received');
          return new Response(
            JSON.stringify({
              message:
                'Got admin refresh token—please add it to your Supabase secrets as GOOGLE_REFRESH_TOKEN'
            }),
            { headers: CORS_HEADERS }
          );
        }
        // TODO: persist user token in your DB
        console.log('User refresh token received');
        return new Response(
          JSON.stringify({ message: 'User refresh token saved' }),
          { headers: CORS_HEADERS }
        );
      }

      case 'getClientId': {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        if (!clientId) {
          return new Response(
            JSON.stringify({ error: 'Google client ID not configured' }),
            { status: 500, headers: CORS_HEADERS }
          );
        }
        return new Response(JSON.stringify({ clientId }), {
          headers: CORS_HEADERS
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: CORS_HEADERS }
        );
    }
  } catch (err: any) {
    console.error('Handler error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
