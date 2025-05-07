import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { handleAdminAuthCallback, saveAdminRefreshToken } from '@/utils/googleCalendarAdmin';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clipboard, AlertCircle, CheckCircle2, KeyRound, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const AdminGoogleAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processing...');
  const [refreshToken, setRefreshToken] = useState('');
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<Record<string, any>>({
    url: window.location.href,
    searchParams: location.search
  });

  useEffect(() => {
    const processAuthCode = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      setDiagnosticInfo(prev => ({
        ...prev,
        code: code ? `${code.substring(0, 5)}...` : 'Not found',
        errorParam: error || 'None'
      }));
      
      if (error) {
        const errorMessage = urlParams.get('error_description') || 'Unknown error occurred';
        setError(`Google OAuth Error: ${error} - ${errorMessage}`);
        setStatus('Authentication failed');
        setProcessing(false);
        toast({
          title: "Authentication Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      if (!code) {
        setError('No authorization code found in URL');
        setStatus('No authorization code found');
        setProcessing(false);
        toast({
          title: "No Authorization Code",
          description: "No authorization code found in URL. Try the authorization process again.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        setStatus('Exchanging authorization code for tokens...');
        console.log('Processing auth code:', code.substring(0, 5) + '...');
        
        const result = await handleAdminAuthCallback(code);
        
        setDiagnosticInfo(prev => ({
          ...prev,
          authCallbackResult: {
            success: result.success,
            error: result.error || null,
            hasRefreshToken: !!result.refreshToken
          }
        }));
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error processing auth code');
        }
        
        if (!result.refreshToken) {
          throw new Error('No refresh token received from Google. Try authenticating again and make sure to grant all permissions.');
        }
        
        setRefreshToken(result.refreshToken);
        
        // Try to save the refresh token
        try {
          setStatus('Saving refresh token...');
          await saveAdminRefreshToken(result.refreshToken);
          
          toast({
            title: "Auth Token Saved",
            description: "Refresh token has been successfully saved.",
          });
          
          setDiagnosticInfo(prev => ({
            ...prev,
            tokenSaveResult: 'Successful'
          }));
        } catch (saveError: any) {
          console.error('Failed to save refresh token:', saveError);
          setDiagnosticInfo(prev => ({
            ...prev,
            tokenSaveResult: 'Failed',
            tokenSaveError: saveError.message
          }));
          
          toast({
            title: "Warning",
            description: "Received token successfully but failed to save it automatically. Please copy the token manually.",
            variant: "destructive",
          });
        }
        
        toast({
          title: "Auth Code Processed Successfully",
          description: "Google Calendar authentication complete.",
        });
        
        setStatus('Authorization complete. You may now copy the refresh token or return to admin dashboard.');
      } catch (error: any) {
        console.error('Authorization error:', error);
        
        const errorMessage = error.message || "Failed to process authorization code";
        setError(errorMessage);
        
        setDiagnosticInfo(prev => ({
          ...prev,
          processingError: errorMessage
        }));
        
        toast({
          title: "Authentication Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        setStatus('Failed to process authorization code');
      } finally {
        setProcessing(false);
      }
    };

    processAuthCode();
  }, [location.search, toast, navigate]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(refreshToken);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Refresh token copied to clipboard successfully.",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleGoToDashboard = () => {
    navigate('/admin');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-purple-100">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent">
          <CardTitle className="text-2xl font-bold text-purple-900">Google Calendar Auth</CardTitle>
          <CardDescription>Authentication process results</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-4">
          {processing ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-gray-700">{status}</p>
            </div>
          ) : error ? (
            <>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
              </Alert>
              
              <div className="space-y-4 mt-4">
                <h3 className="font-semibold">Troubleshooting Steps:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Verify Google API credentials in Google Cloud Console</li>
                  <li>Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Supabase secrets</li>
                  <li>Ensure the redirect URI is correctly set to: <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{window.location.origin}/auth/callback</code></li>
                  <li>Check that Google Calendar API is enabled in your Google Cloud project</li>
                </ol>
                
                <Button 
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Google Cloud Console
                </Button>
              </div>
              
              <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnostic Information</h4>
                <pre className="text-xs overflow-auto whitespace-pre-wrap text-gray-600 max-h-60">
                  {JSON.stringify(diagnosticInfo, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{status}</AlertDescription>
              </Alert>
              
              {refreshToken && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold text-lg">Your Refresh Token:</h3>
                  </div>
                  <div className="relative mt-2 mb-6">
                    <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto text-left whitespace-pre-wrap break-all border border-gray-300">
                      {refreshToken}
                    </pre>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`absolute top-2 right-2 ${copied ? 'bg-green-100 text-green-700' : ''}`}
                      onClick={copyToClipboard}
                    >
                      <Clipboard className="h-4 w-4 mr-1" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-4">
                    Add this refresh token to your Supabase secrets as <code className="bg-gray-100 px-1 py-0.5 rounded">GOOGLE_REFRESH_TOKEN</code>.
                  </p>
                </div>
              )}
              
              <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnostic Information</h4>
                <pre className="text-xs overflow-auto whitespace-pre-wrap text-gray-600 max-h-60">
                  {JSON.stringify(diagnosticInfo, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center pt-2 pb-6">
          <Button 
            onClick={handleGoToDashboard}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Return to Admin Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminGoogleAuthCallback;
