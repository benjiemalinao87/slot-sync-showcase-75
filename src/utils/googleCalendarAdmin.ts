import { supabase } from "@/integrations/supabase/client";

// Scopes needed for admin access
const ADMIN_SCOPES = [
  'https://www.googleapis.com/auth/calendar',  // Full access to calendars
  'https://www.googleapis.com/auth/calendar.events',  // Full access to events
  'https://www.googleapis.com/auth/calendar.settings.readonly',  // Read calendar settings
];

/**
 * Updates the Google Calendar credentials in Supabase
 */
export const updateGoogleCalendarCredentials = async (
  clientId: string,
  clientSecret: string
) => {
  try {
    console.log('Attempting to update Google Calendar credentials');
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        action: 'updateCredentials',
        clientId,
        clientSecret
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }
    
    if (data?.error) {
      console.error('Update credentials error from function:', data.error);
      throw new Error(data.error);
    }

    console.log('Credentials update successful');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update credentials:', error);
    throw error;
  }
};

/**
 * Generates the Google OAuth URL for authentication
 * Includes admin-specific scopes and offline access
 */
export const getGoogleAuthUrl = async () => {
  try {
    console.log('Getting auth URL');
    
    // First check if client ID and client secret are configured
    try {
      console.log('Checking if Google API credentials are configured...');
      
      const { data: clientIdData, error: clientIdError } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'getClientId'
        }
      });

      if (clientIdError) {
        console.error('Client ID check failed:', clientIdError);
        throw new Error(`Failed to check Google API credentials: ${clientIdError.message}`);
      }
      
      if (clientIdData?.error) {
        console.error('Client ID check error from function:', clientIdData.error);
        throw new Error(clientIdData.error);
      }
      
      if (!clientIdData?.clientId) {
        console.error('Client ID not found in response:', clientIdData);
        throw new Error('Google client ID not configured in Supabase secrets. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }
      
      console.log('Client ID check passed - credential is configured');
    } catch (error: any) {
      console.error('Client ID check failed:', error);
      throw new Error(`Google API credentials check failed: ${error.message || 'Unknown error'}`);
    }
    
    // Use the current origin for the redirect URI to ensure it matches what's expected
    const redirectUri = `${window.location.origin}/auth/callback`;
    
    console.log('Requesting auth URL from Supabase function with these parameters:', {
      action: 'getAuthUrl',
      redirectUri,
      scopes: ADMIN_SCOPES,
      accessType: 'offline',
      prompt: 'consent'
    });
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        action: 'getAuthUrl',
        redirectUri,
        scopes: ADMIN_SCOPES,
        accessType: 'offline',
        prompt: 'consent'  // Force consent screen to ensure refresh token
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Supabase function error: ${error.message}`);
    }
    
    console.log('Response from getAuthUrl:', data);
    
    if (data?.error) {
      console.error('Auth URL generation error:', data.error);
      throw new Error(data.error);
    }
    
    if (!data?.url) {
      console.error('No auth URL returned from function:', data);
      throw new Error('No authentication URL returned from server. Check that your Google credentials are properly configured.');
    }
    
    console.log('Auth URL successfully generated');
    return data.url;
  } catch (error: any) {
    console.error('Failed to generate auth URL:', error);
    throw error;
  }
};

/**
 * Handles the admin OAuth callback from Google
 * Exchanges the authorization code for tokens and ensures refresh token is received
 */
export const handleAdminAuthCallback = async (code: string) => {
  try {
    const origin = window.location.origin;
    console.log('Handling auth callback with code:', code.substring(0, 5) + '...');
    
    // Ensure the redirect URI matches what was used to get the code
    const redirectUri = `${origin}/auth/callback`;
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        action: 'handleAuthCallback',
        code,
        origin,
        redirectUri,
        isAdmin: true
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }
    
    console.log('Received data from handleAuthCallback:', JSON.stringify(data));
    
    if (data?.error) {
      console.error('Auth callback error:', data.error);
      throw new Error(data.error);
    }
    
    // Check if data is a string (might be a JSON string)
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        console.log('Data is a string, attempting to parse as JSON');
        parsedData = JSON.parse(data);
        console.log('Successfully parsed data:', parsedData);
      } catch (e) {
        console.error('Failed to parse data as JSON:', e);
      }
    }
    
    // Check if the refreshToken property exists in the response
    if (!parsedData.refreshToken && !parsedData.refresh_token) {
      console.error('No refresh token in response:', JSON.stringify(parsedData));
      throw new Error('No refresh token received. Please try authenticating again.');
    }
    
    const refreshToken = parsedData.refreshToken || parsedData.refresh_token;
    console.log('Successfully received refresh token:', refreshToken.substring(0, 10) + '...');
    
    return {
      success: true,
      refreshToken: refreshToken,
      message: 'Successfully authenticated with admin privileges'
    };
  } catch (error: any) {
    console.error('Failed to handle admin auth callback:', error);
    return {
      success: false,
      error: error.message || 'Failed to process authorization code'
    };
  }
};

/**
 * Save the admin refresh token securely
 * This should be stored separately from regular user tokens
 */
export const saveAdminRefreshToken = async (refreshToken: string) => {
  try {
    console.log('Saving admin refresh token');
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        action: 'saveRefreshToken',
        refreshToken,
        isAdmin: true
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }
    
    if (data?.error) {
      console.error('Save token error:', data.error);
      throw new Error(data.error);
    }

    console.log('Admin refresh token saved successfully');
    return { 
      success: true,
      message: 'Admin refresh token saved successfully'
    };
  } catch (error: any) {
    console.error('Failed to save admin refresh token:', error);
    throw error;
  }
};
