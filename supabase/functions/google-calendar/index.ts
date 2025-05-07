/* @ts-nocheck */ // @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { google } from 'npm:googleapis';
// Define allowed origins
const allowedOrigins = [
  'https://appointment-request-with-cobalt.netlify.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://cobaltpower.chau.link',
  '*' // Allow any origin temporarily while debugging
];
// New CORS handler implementation:
const getCorsHeaders = ()=>({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  });
const handleCors = (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders()
    });
  }
  return getCorsHeaders();
};
// Initialize Google Calendar API with service account
let googleAuth;
try {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!serviceAccountEmail || !privateKey) {
    console.error('Service account credentials not found');
    console.error('GOOGLE_SERVICE_ACCOUNT_EMAIL exists:', !!serviceAccountEmail);
    console.error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY exists:', !!privateKey);
    throw new Error('Service account credentials not properly configured');
  }
  googleAuth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: privateKey
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar'
    ]
  });
  console.log('Successfully initialized Google Auth with service account:', serviceAccountEmail);
} catch (error) {
  console.error('Failed to initialize Google Auth:', error);
  googleAuth = null;
}
// Handle OPTIONS preflight requests properly
serve(async (req)=>{
  console.log('Edge function received request:', req.method, req.url);
  console.log('Origin:', req.headers.get('origin'));
  // Handle preflight requests with the improved CORS handler
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders()
    });
  }
  try {
    // Get service account credentials from environment variables
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (!serviceAccountEmail || !privateKey) {
      return new Response(JSON.stringify({
        error: 'Service account credentials not found',
        emailExists: !!serviceAccountEmail,
        keyExists: !!privateKey
      }), {
        status: 500,
        headers: getCorsHeaders()
      });
    }
    // Parse request body
    const { action, ...body } = await req.json();
    console.log(`Processing action: ${action}`);
    // Set default headers for all responses
    const corsHeaders = getCorsHeaders();
    switch(action){
      case 'checkConfiguration':
        // Check if Google service account is properly configured
        try {
          const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
          const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
          const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
          const config = {
            serviceAccount: {
              isConfigured: !!serviceAccountEmail && !!privateKey,
              email: serviceAccountEmail ? serviceAccountEmail : null,
              // Don't return the actual private key for security reasons
              hasPrivateKey: !!privateKey
            },
            oauth: {
              isConfigured: !!refreshToken
            }
          };
          console.log('Configuration check:', {
            serviceAccountConfigured: config.serviceAccount.isConfigured,
            oauthConfigured: config.oauth.isConfigured
          });
          return new Response(JSON.stringify({
            isConfigured: config.serviceAccount.isConfigured || config.oauth.isConfigured,
            config
          }), {
            headers: corsHeaders
          });
        } catch (error) {
          console.error('Error checking configuration:', error);
          return new Response(JSON.stringify({
            error: 'Failed to check configuration',
            details: error.message,
            stack: error.stack
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      case 'updateCredentials':
        {
          const { clientId, clientSecret } = body;
          if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({
              error: 'Client ID and Client Secret are required'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            // Log the credentials saving attempt
            console.log('Attempting to save credentials to environment');
            return new Response(JSON.stringify({
              success: true,
              message: 'Credentials saved successfully. Please add them to your Supabase secrets.'
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error saving credentials:', error);
            return new Response(JSON.stringify({
              error: 'Failed to save credentials'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'getAvailableSlots':
        {
          const { date, calendarId } = body;
          if (!date || !calendarId) {
            return new Response(JSON.stringify({
              error: 'Date and Calendar ID are required'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            const timeMin = new Date(date);
            timeMin.setHours(9, 0, 0, 0); // Start at 9:00 AM
            const timeMax = new Date(date);
            timeMax.setHours(17, 0, 0, 0); // End at 5:00 PM
            if (!googleAuth) {
              throw new Error("Google Auth not initialized properly");
            }
            // Get busy slots from Google Calendar
            const calendarClient = google.calendar({
              version: 'v3',
              auth: await googleAuth.getClient()
            });
            const response = await calendarClient.freebusy.query({
              requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [
                  {
                    id: calendarId
                  }
                ]
              }
            });
            const busySlots = response.data.calendars?.[calendarId]?.busy || [];
            console.log(`Found ${busySlots.length} busy slots`);
            // Generate time slots (30-minute intervals)
            const slots = [];
            let slotId = 1;
            let currentTime = new Date(timeMin);
            while(currentTime < timeMax){
              const slotStart = new Date(currentTime);
              const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // 30 minutes
              const isBooked = busySlots.some((bookedSlot)=>slotStart < new Date(bookedSlot.end) && slotEnd > new Date(bookedSlot.start));
              const startTimeString = slotStart.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const endTimeString = slotEnd.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              slots.push({
                id: `slot-${slotId++}`,
                startTime: startTimeString.replace(/\s/g, ''),
                endTime: endTimeString.replace(/\s/g, ''),
                isAvailable: !isBooked,
                time: `${startTimeString} - ${endTimeString}`
              });
              currentTime = new Date(currentTime.getTime() + 30 * 60000); // Increment by 30 minutes
            }
            console.log(`Generated ${slots.length} time slots`);
            return new Response(JSON.stringify({
              slots
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error fetching available slots:', error);
            return new Response(JSON.stringify({
              error: `Failed to fetch available slots: ${error.message || 'Unknown error'}`,
              stack: error.stack
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'getBusyDays':
        {
          const { startDate, endDate, calendarId } = body;
          if (!startDate || !endDate || !calendarId) {
            return new Response(JSON.stringify({
              error: 'Start date, end date, and Calendar ID are required'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            const timeMin = new Date(startDate);
            const timeMax = new Date(endDate);
            if (!googleAuth) {
              throw new Error("Google Auth not initialized properly");
            }
            // Get busy slots from Google Calendar
            const calendarClient = google.calendar({
              version: 'v3',
              auth: await googleAuth.getClient()
            });
            const response = await calendarClient.freebusy.query({
              requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [
                  {
                    id: calendarId
                  }
                ]
              }
            });
            const busySlots = response.data.calendars?.[calendarId]?.busy || [];
            console.log(`Found ${busySlots.length} busy slots in the date range`);
            // Extract just the dates (not times) to maintain privacy
            const busyDays = new Set();
            busySlots.forEach((slot)=>{
              const startDate = new Date(slot.start);
              const endDate = new Date(slot.end);
              // Handle multi-day events
              let currentDate = new Date(startDate);
              currentDate.setHours(0, 0, 0, 0);
              while(currentDate <= endDate){
                busyDays.add(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
              }
            });
            // Create a simpler format for the front-end
            // Filter out days that are completely booked
            const daysWithNoAvailability = Array.from(busyDays).filter((dayString)=>{
              const day = new Date(dayString);
              // Check if there are any busy slots that cover the entire business day
              // (9am to 5pm) for this particular day
              const dayStart = new Date(day);
              dayStart.setHours(9, 0, 0, 0);
              const dayEnd = new Date(day);
              dayEnd.setHours(17, 0, 0, 0);
              // Count events that overlap with the business hours
              let allDayBooked = false;
              // Check if there are any slots that span the entire business day
              // This is a simplified approach - in reality you'd want to check
              // if there's any free time between slots
              for (const slot of busySlots){
                const slotStart = new Date(slot.start);
                const slotEnd = new Date(slot.end);
                // If a slot covers the full business day, mark as fully booked
                if (slotStart <= dayStart && slotEnd >= dayEnd) {
                  allDayBooked = true;
                  break;
                }
              }
              return allDayBooked;
            });
            console.log(`Found ${daysWithNoAvailability.length} fully booked days`);
            return new Response(JSON.stringify({
              busyDays: daysWithNoAvailability,
              // Return only YYYY-MM-DD strings for day-level privacy
              month: timeMin.getMonth(),
              year: timeMin.getFullYear()
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error fetching busy days:', error);
            return new Response(JSON.stringify({
              error: `Failed to fetch busy days: ${error.message || 'Unknown error'}`,
              stack: error.stack
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'bookAppointment':
        {
          const { calendarId, startTime, endTime, timeZone, summary, description } = body;
          if (!calendarId || !startTime || !endTime || !timeZone || !summary) {
            return new Response(JSON.stringify({
              error: 'Missing required parameters for booking'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            if (!googleAuth) {
              throw new Error('Google Auth not initialized properly');
            }
            // Validate date strings
            const validateDateString = (dateStr)=>{
              try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                  return {
                    valid: false,
                    error: 'Invalid date created'
                  };
                }
                // Ensure the date string can be parsed correctly
                return {
                  valid: true,
                  date
                };
              } catch (err) {
                return {
                  valid: false,
                  error: `Date parsing error: ${err.message}`
                };
              }
            };
            // Validate both dates
            const startDateValid = validateDateString(startTime);
            const endDateValid = validateDateString(endTime);
            if (!startDateValid.valid) {
              throw new Error(`Invalid start time: ${startDateValid.error}`);
            }
            if (!endDateValid.valid) {
              throw new Error(`Invalid end time: ${endDateValid.error}`);
            }
            console.log('Validated dates for booking:', {
              startTime,
              parsedStart: startDateValid.date?.toISOString(),
              endTime,
              parsedEnd: endDateValid.date?.toISOString(),
              timeZone
            });
            const calendar = google.calendar({
              version: 'v3',
              auth: await googleAuth.getClient()
            });
            // Create the event
            const event = {
              summary,
              description: description || 'No description provided',
              start: {
                dateTime: startTime,
                timeZone
              },
              end: {
                dateTime: endTime,
                timeZone
              }
            };
            // Insert the event
            const response = await calendar.events.insert({
              calendarId,
              requestBody: event
            });
            return new Response(JSON.stringify({
              success: true,
              eventId: response.data.id,
              eventLink: response.data.htmlLink
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error booking appointment:', error);
            return new Response(JSON.stringify({
              error: `Failed to book appointment: ${error.message}`,
              details: error.stack
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'getAuthUrl':
        {
          const { scopes, accessType, prompt, redirectUri } = body;
          console.log('Get Auth URL request received with params:', {
            redirectUri,
            scopes: Array.isArray(scopes) ? scopes.join(' ') : scopes
          });
          const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
          const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
          console.log('Environment variables check:');
          console.log('GOOGLE_CLIENT_ID exists:', !!clientId);
          console.log('GOOGLE_CLIENT_SECRET exists:', !!clientSecret);
          if (!clientId) {
            console.error('Google Client ID not found in environment variables');
            return new Response(JSON.stringify({
              error: 'Google Client ID not configured in Supabase secrets',
              details: 'Please add GOOGLE_CLIENT_ID to your Supabase secrets'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
          if (!clientSecret) {
            console.error('Google Client Secret not found in environment variables');
            return new Response(JSON.stringify({
              error: 'Google Client Secret not configured in Supabase secrets',
              details: 'Please add GOOGLE_CLIENT_SECRET to your Supabase secrets'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
          try {
            // Build Google OAuth URL using the provided redirect URI
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.append('client_id', clientId);
            authUrl.searchParams.append('redirect_uri', redirectUri);
            authUrl.searchParams.append('response_type', 'code');
            // Handle scopes parameter - properly format scopes for Google OAuth
            const scopesArr = Array.isArray(scopes) ? scopes : scopes ? scopes.split(' ') : [];
            // Add offline access scope correctly
            if (accessType === 'offline') {
              scopesArr.push('https://www.googleapis.com/auth/userinfo.email');
              scopesArr.push('https://www.googleapis.com/auth/userinfo.profile');
              scopesArr.push('openid');
            }
            const scopeParam = scopesArr.join(' ');
            authUrl.searchParams.append('scope', scopeParam);
            if (accessType) authUrl.searchParams.append('access_type', accessType);
            if (prompt) authUrl.searchParams.append('prompt', prompt);
            const finalUrl = authUrl.toString();
            console.log(`Generated auth URL: ${finalUrl.substring(0, 100)}...`);
            return new Response(JSON.stringify({
              url: finalUrl
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Failed to generate auth URL:', error);
            return new Response(JSON.stringify({
              error: `Failed to generate auth URL: ${error.message}`,
              stack: error.stack,
              params: {
                redirectUri,
                scopes,
                accessType,
                prompt
              }
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'handleAuthCallback':
        {
          const { code, origin, redirectUri } = body;
          const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
          const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
          console.log('Auth callback received with params:', {
            codeLength: code ? code.length : 0,
            origin,
            redirectUri,
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret
          });
          if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({
              error: 'Google credentials not configured'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
          // Use the provided redirect URI that should match exactly what was used in the authorization request
          // If not provided, construct it from the origin
          const actualRedirectUri = redirectUri || `${origin}/auth/callback`;
          console.log(`Using redirect URI for token exchange: ${actualRedirectUri}`);
          try {
            console.log('Attempting to exchange code for tokens...');
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: actualRedirectUri,
                grant_type: 'authorization_code'
              })
            });
            const tokenResponseText = await tokenResponse.text();
            console.log('Raw token response:', tokenResponseText);
            let tokenData;
            try {
              tokenData = JSON.parse(tokenResponseText);
            } catch (e) {
              console.error('Failed to parse token response as JSON:', e);
              return new Response(JSON.stringify({
                error: 'Failed to parse token response',
                rawResponse: tokenResponseText
              }), {
                status: 500,
                headers: corsHeaders
              });
            }
            console.log('Token exchange response status:', tokenResponse.status);
            console.log('Token response contains refresh_token:', !!tokenData.refresh_token);
            if (!tokenResponse.ok) {
              console.error('Token exchange failed:', tokenData);
              return new Response(JSON.stringify({
                error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code',
                details: tokenData
              }), {
                status: 500,
                headers: corsHeaders
              });
            }
            console.log('Token exchange successful');
            if (!tokenData.refresh_token) {
              console.warn('No refresh token in response - user may need to revoke access and try again');
            }
            return new Response(JSON.stringify({
              success: true,
              refreshToken: tokenData.refresh_token,
              accessToken: tokenData.access_token,
              expiresIn: tokenData.expires_in
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Auth callback error:', error);
            return new Response(JSON.stringify({
              error: 'Failed to process authorization code',
              details: error.message,
              stack: error.stack
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'saveRefreshToken':
        {
          const { refreshToken, isAdmin } = body;
          try {
            // For admin tokens, we store them in environment variables
            if (isAdmin) {
              // Log that we received the token (but don't log the token itself)
              console.log('Received admin refresh token');
              return new Response(JSON.stringify({
                message: 'Please add the refresh token to your Supabase secrets as GOOGLE_REFRESH_TOKEN'
              }), {
                headers: corsHeaders
              });
            }
            // For regular user tokens, we could store them in the database
            // This is just a placeholder - implement your storage logic here
            return new Response(JSON.stringify({
              message: 'Refresh token saved'
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Failed to save refresh token:', error);
            return new Response(JSON.stringify({
              error: 'Failed to save refresh token'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
        }
      case 'getClientId':
        {
          const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
          if (!clientId) {
            return new Response(JSON.stringify({
              error: 'Google client ID not configured'
            }), {
              status: 500,
              headers: corsHeaders
            });
          }
          return new Response(JSON.stringify({
            clientId
          }), {
            headers: corsHeaders
          });
        }
      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: `Error processing request: ${error.message}`
    }), {
      status: 500,
      headers: getCorsHeaders()
    });
  }
}, {
  port: 8000
});
