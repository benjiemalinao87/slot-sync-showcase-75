// @ts-ignore
import { create, getNumericDate } from "https://deno.land/x/djwt/mod.ts";

// IMPORTANT: In production, these values should come from environment variables
// These placeholders are for reference only
const serviceAccountEmail = "YOUR_SERVICE_ACCOUNT_EMAIL@example.com";
const privateKey = `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`;

async function generateJWT(): Promise<string> {
  const now = Date.now();
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/calendar",
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

async function getAccessToken(): Promise<string> {
  const jwt = await generateJWT();
  console.log("Generated JWT:", jwt);
  
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
  // Get access token
  const accessToken = await getAccessToken();
  console.log('Got access token:', accessToken);

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

async function createTestEvent(calendarId: string): Promise<any> {
  const accessToken = await getAccessToken();
  // Set fixed appointment time: June 13, 2025, 09:00 - 10:00 UTC
  const eventStart = new Date("2025-06-13T09:00:00Z");
  const eventEnd = new Date("2025-06-13T10:00:00Z");
  const event = {
    summary: "Test Event from Service Account",
    description: "This is a test event created by the service account on June 13, 2025.",
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: "UTC"
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: "UTC"
    }
  };
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${response.statusText}\n${error}`);
  }
  return await response.json();
}

async function getFreeBusy(calendarId: string): Promise<any> {
  const accessToken = await getAccessToken();
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  const requestBody = {
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    items: [{ id: calendarId }]
  };
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch free/busy: ${response.statusText}\n${error}`);
  }
  return await response.json();
}

// Run the test
console.log('Testing Google Calendar API...');
try {
  const calendars = await listCalendars();
  console.log('Success! Found calendars:', JSON.stringify(calendars, null, 2));
  // Try to create a test event
  const eventResult = await createTestEvent('benjie@customerconnects.app');
  console.log('Test event created:', JSON.stringify(eventResult, null, 2));
  // Fetch available slots (free/busy)
  const freeBusy = await getFreeBusy('benjie@customerconnects.app');
  console.log('Free/Busy info:', JSON.stringify(freeBusy, null, 2));
} catch (error) {
  console.error('Error:', error);
} 