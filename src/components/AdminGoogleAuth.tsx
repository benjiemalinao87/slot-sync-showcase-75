
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, RefreshCcw, ExternalLink } from "lucide-react";
import { getGoogleAuthUrl } from "@/utils/googleCalendarAdmin";
import { supabase } from "@/integrations/supabase/client";

const AdminGoogleAuth = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentialsStatus, setCredentialsStatus] = useState({
    clientIdConfigured: null,
    clientSecretConfigured: null,
    checking: true
  });
  const [diagnosticInfo, setDiagnosticInfo] = useState<Record<string, any> | null>({
    origin: window.location.origin,
    pathname: window.location.pathname,
    expectedRedirectUri: 'https://appointment-request-with-cobalt.netlify.app/auth/callback'
  });

  // Check if credentials are configured
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        setDiagnosticInfo(prev => ({ ...prev, checkingCredentials: true }));
        
        // Check if client ID is configured
        const clientIdResult = await supabase.functions.invoke('google-calendar', {
          body: { action: 'getClientId' }
        });
        
        const clientIdConfigured = !clientIdResult.error && !!clientIdResult.data?.clientId;
        
        setCredentialsStatus(prev => ({
          ...prev,
          clientIdConfigured,
          checking: false
        }));
        
        setDiagnosticInfo(prev => ({
          ...prev,
          clientIdCheck: {
            success: clientIdConfigured,
            error: clientIdResult.error,
            data: clientIdResult.data ? 'Has data' : 'No data'
          },
          checkingCredentials: false
        }));
        
        if (!clientIdConfigured) {
          setError('Google API credentials missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase secrets.');
        }
      } catch (e: any) {
        console.error('Error checking credentials:', e);
        setError(`Failed to check Google API credentials: ${e.message || 'Unknown error'}`);
        setDiagnosticInfo(prev => ({
          ...prev,
          credentialCheckError: e.message || 'Unknown error',
          checkingCredentials: false
        }));
      }
    };
    
    checkCredentials();
  }, []);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Initiating Google auth flow...');
      setDiagnosticInfo(prev => ({ ...prev, authAttemptStarted: new Date().toISOString() }));
      
      try {
        const authUrl = await getGoogleAuthUrl();
        console.log('Auth URL received:', authUrl ? 'URL successfully generated' : 'Failed to generate URL');
        
        setDiagnosticInfo(prev => ({ 
          ...prev, 
          authUrlReceived: !!authUrl,
          authUrlTime: new Date().toISOString()
        }));
        
        if (authUrl) {
          // Navigate to the auth URL
          window.location.href = authUrl;
        } else {
          throw new Error('Failed to generate auth URL. Check console for details.');
        }
      } catch (error: any) {
        console.error('Failed to get auth URL:', error);
        
        // Add detailed error message and debugging info
        let errorMessage = error.message || 'Failed to initiate Google authentication';
        
        // Add more context if we have specific error patterns
        if (errorMessage.includes('client ID not configured')) {
          errorMessage = 'Google Client ID is not configured in your Supabase secrets. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.';
        }
        
        setError(errorMessage);
        
        // Add error details to diagnostic info
        setDiagnosticInfo(prev => ({
          ...prev,
          lastError: errorMessage,
          errorTime: new Date().toISOString(),
          errorSource: 'getGoogleAuthUrl()'
        }));
        
        toast({
          title: "Authentication Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent">
        <CardTitle className="text-2xl font-bold text-purple-900">Admin Google Calendar Auth</CardTitle>
        <CardDescription>Connect your Google Calendar for admin access</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {credentialsStatus.checking ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <p>Checking Google API credentials...</p>
          </div>
        ) : (
          <>
            {credentialsStatus.clientIdConfigured === false && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Configuration Issue</AlertTitle>
                <AlertDescription>
                  Google client ID not found in environment variables. Please add GOOGLE_CLIENT_ID to your Supabase secrets.
                </AlertDescription>
              </Alert>
            )}
            
            {credentialsStatus.clientIdConfigured === true && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Credentials Configured</AlertTitle>
                <AlertDescription>
                  Google API credentials are properly configured in your Supabase secrets.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
        
        <div className="space-y-4">
          <p className="text-gray-600">
            Click the button below to authenticate with Google Calendar. This will:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Request access to manage your calendar</li>
            <li>Generate a refresh token for long-term access</li>
            <li>Enable admin calendar management features</li>
          </ul>
          
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Make sure you have configured the proper redirect URI in your Google Cloud Console:</p>
              <code className="block mt-1 p-2 bg-gray-100 rounded text-sm break-all">
                https://appointment-request-with-cobalt.netlify.app/auth/callback
              </code>
              
              <p className="mt-2">And that you've added these Supabase secrets:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>GOOGLE_CLIENT_ID</li>
                <li>GOOGLE_CLIENT_SECRET</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
        
        {diagnosticInfo && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnostic Information</h4>
            <pre className="text-xs overflow-auto whitespace-pre-wrap text-gray-600">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-sm"
                onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Cloud Console
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center gap-4 pt-2 pb-6">
        <Button 
          onClick={handleGoogleAuth}
          disabled={isLoading || !credentialsStatus.clientIdConfigured}
          className="bg-purple-600 hover:bg-purple-700 text-white flex-grow"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Connecting...
            </>
          ) : (
            'Connect Google Calendar'
          )}
        </Button>
        
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          size="icon"
          title="Refresh page"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminGoogleAuth;
