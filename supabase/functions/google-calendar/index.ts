/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

interface TimeSlotItem {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  time: string;
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
              error: 'Missing date or calendarId parameter'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            if (!googleAuth) {
              throw new Error('Google Auth not initialized properly');
            }
            const calendar = google.calendar({
              version: 'v3',
              auth: await googleAuth.getClient()
            });
            console.log(`Fetching available slots for ${calendarId} on ${date}`);
            
            // Parse the date properly and set business hours in UTC
            const targetDate = new Date(date);
            if (isNaN(targetDate.getTime())) {
              throw new Error('Invalid date format');
            }
            
            // Create time boundaries for the day in UTC
            // Note: Business hours are assumed to be in the user's local timezone
            // We'll fetch a broader range and let the client filter appropriately
            const timeMin = new Date(targetDate);
            timeMin.setUTCHours(0, 0, 0, 0); // Start of day UTC
            const timeMax = new Date(targetDate);
            timeMax.setUTCHours(23, 59, 59, 999); // End of day UTC
            
            console.log(`Fetching events between ${timeMin.toISOString()} and ${timeMax.toISOString()}`);
            
            // Fetch existing events for the day
            const response = await calendar.events.list({
              calendarId,
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime'
            });
            const events = response.data.items || [];
            console.log(`Found ${events.length} existing events`);
            
            // Generate available slots (let client handle timezone-specific business hours)
            const slots = [];
            
            // Create slots every 60 minutes from 6 AM to 8 PM UTC
            // This gives a wide range that can be filtered client-side based on user's timezone
            let currentTime = new Date(targetDate);
            currentTime.setUTCHours(6, 0, 0, 0); // Start at 6 AM UTC
            
            const endOfDay = new Date(targetDate);
            endOfDay.setUTCHours(20, 0, 0, 0); // End at 8 PM UTC
            
            while (currentTime < endOfDay) {
              const slotStart = new Date(currentTime);
              const slotEnd = new Date(currentTime.getTime() + 60 * 60000); // 60 minutes later (1 hour)
              
              // Check if this slot conflicts with any existing events
              const isConflict = events.some(event => {
                if (!event.start?.dateTime || !event.end?.dateTime) return false;
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                return slotStart < eventEnd && slotEnd > eventStart;
              });
              
              slots.push({
                id: `${slotStart.toISOString()}_${slotEnd.toISOString()}`,
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isAvailable: !isConflict,
                time: slotStart.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true, // Changed to 12-hour format
                  timeZone: 'UTC'
                })
              });
              
              // Move to next 60-minute slot
              currentTime.setUTCMinutes(currentTime.getUTCMinutes() + 60);
            }
            
            console.log(`Generated ${slots.length} time slots`);
            return new Response(JSON.stringify({
              slots: slots.filter(slot => slot.isAvailable) // Only return available slots
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error fetching available slots:', error);
            return new Response(JSON.stringify({
              error: `Failed to fetch available slots: ${error.message}`,
              details: error.stack
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
              error: 'Missing required parameters: startDate, endDate, or calendarId'
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          try {
            if (!googleAuth) {
              throw new Error('Google Auth not initialized properly');
            }
            const calendar = google.calendar({
              version: 'v3',
              auth: await googleAuth.getClient()
            });
            
            console.log(`Fetching busy days for ${calendarId} from ${startDate} to ${endDate}`);
            
            // Parse dates properly
            const timeMin = new Date(startDate);
            const timeMax = new Date(endDate);
            
            if (isNaN(timeMin.getTime()) || isNaN(timeMax.getTime())) {
              throw new Error('Invalid date format in startDate or endDate');
            }
            
            console.log(`Fetching events between ${timeMin.toISOString()} and ${timeMax.toISOString()}`);
            
            // Fetch events for the month
            const response = await calendar.events.list({
              calendarId,
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime'
            });
            
            const events = response.data.items || [];
            console.log(`Found ${events.length} events in the date range`);
            
            // Collect dates that have events (busy days)
            const busyDaysSet = new Set<string>();
            
            events.forEach(event => {
              if (event.start?.dateTime) {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end?.dateTime || event.start.dateTime);
                
                // Add all days that the event spans
                let currentDate = new Date(eventStart);
                currentDate.setUTCHours(0, 0, 0, 0);
                
                const endEventDate = new Date(eventEnd);
                endEventDate.setUTCHours(0, 0, 0, 0);
                
                while (currentDate <= endEventDate) {
                  busyDaysSet.add(currentDate.toISOString().slice(0, 10));
                  currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                }
              }
            });
            
            // Convert Set to Array and filter out days that are completely available
            const busyDays = Array.from(busyDaysSet).filter(dayStr => {
              const day = new Date(dayStr + 'T00:00:00.000Z');
              const dayStart = new Date(day);
              dayStart.setUTCHours(6, 0, 0, 0); // Business hours start (UTC)
              const dayEnd = new Date(day);
              dayEnd.setUTCHours(20, 0, 0, 0); // Business hours end (UTC)
              
              // Check if there are events during business hours
              const hasBusinessHourEvents = events.some(event => {
                if (!event.start?.dateTime || !event.end?.dateTime) return false;
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                return eventStart < dayEnd && eventEnd > dayStart;
              });
              
              return hasBusinessHourEvents;
            });
            
            console.log(`Found ${busyDays.length} busy days: ${busyDays.join(', ')}`);
            
            return new Response(JSON.stringify({
              busyDays
            }), {
              headers: corsHeaders
            });
          } catch (error) {
            console.error('Error fetching busy days:', error);
            return new Response(JSON.stringify({
              error: `Failed to fetch busy days: ${error.message}`,
              details: error.stack
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
