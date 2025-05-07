import { useState, useEffect } from 'react';
import { 
  testCalendarIntegration, 
  testServiceAccountConfig, 
  runAllTests 
} from '../utils/testCalendarIntegration';

// Add the Supabase anon key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwd2R0am10YXF6cmp5ZWF6c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2ODg0MTcsImV4cCI6MjAyNTI2NDQxN30.LTwyEEH8GGULmS-p-qWdRSxZNQUUQN8tHm_Ej-dKM44';
const SUPABASE_URL = 'https://xpwdtjmtaqzrjyeazszz.supabase.co';

export default function CalendarTest() {
  const [calendarId, setCalendarId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [testType, setTestType] = useState<'config' | 'slots' | 'all'>('config');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error' | null>(null);
  const [corsStatus, setCorsStatus] = useState<'checking' | 'success' | 'error' | null>(null);
  
  // Check the connection to the Edge Function
  useEffect(() => {
    async function checkConnection() {
      setConnectionStatus('checking');
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-test`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (response.ok) {
          setConnectionStatus('success');
          checkCors();
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus('error');
      }
    }
    
    // Check CORS preflight
    async function checkCors() {
      setCorsStatus('checking');
      try {
        // Create a simple request that will trigger a CORS preflight
        const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-test`, {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        setCorsStatus(response.ok ? 'success' : 'error');
      } catch (error) {
        console.error('CORS check failed:', error);
        setCorsStatus('error');
      }
    }
    
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    
    try {
      let testResults;
      
      switch (testType) {
        case 'config':
          testResults = await testServiceAccountConfig();
          break;
        case 'slots':
          testResults = await testCalendarIntegration(calendarId);
          break;
        case 'all':
          testResults = await runAllTests(calendarId);
          break;
        default:
          testResults = { error: 'Invalid test type' };
      }
      
      setResults(testResults);
    } catch (error) {
      console.error('Test error:', error);
      setResults({ 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Google Calendar Integration Test</h1>
      
      <div className="space-y-4 mb-6">
        {connectionStatus && (
          <div className={`p-4 rounded ${
            connectionStatus === 'checking' ? 'bg-gray-100' :
            connectionStatus === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus === 'checking' ? (
              <h3 className="font-semibold">Checking Edge Function connection...</h3>
            ) : connectionStatus === 'success' ? (
              <>
                <h3 className="font-semibold">✓ Edge Function Connection: Success</h3>
                <p>Successfully connected to the Edge Function.</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold">⚠️ Edge Function Connection: Failed</h3>
                <p>Unable to connect to the Edge Function. Please check if the function is deployed and accessible.</p>
              </>
            )}
          </div>
        )}
        
        {corsStatus && (
          <div className={`p-4 rounded ${
            corsStatus === 'checking' ? 'bg-gray-100' :
            corsStatus === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {corsStatus === 'checking' ? (
              <h3 className="font-semibold">Checking CORS setup...</h3>
            ) : corsStatus === 'success' ? (
              <>
                <h3 className="font-semibold">✓ CORS Setup: Success</h3>
                <p>CORS is properly configured for this domain.</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold">⚠️ CORS Setup: Failed</h3>
                <p>CORS is not properly configured. Check browser console for details.</p>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
        <p className="font-medium">Important:</p>
        <p>Before testing, make sure you have configured your Supabase environment variables:</p>
        <ul className="list-disc ml-5 mt-2">
          <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
          <li>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</li>
        </ul>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label className="block mb-1 font-medium">
            Test Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="config"
                checked={testType === 'config'}
                onChange={() => setTestType('config')}
                className="mr-2"
              />
              Configuration Test
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="slots"
                checked={testType === 'slots'}
                onChange={() => setTestType('slots')}
                className="mr-2"
              />
              Available Slots Test
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="all"
                checked={testType === 'all'}
                onChange={() => setTestType('all')}
                className="mr-2"
              />
              Run All Tests
            </label>
          </div>
        </div>
      
        {testType !== 'config' && (
          <div>
            <label className="block mb-1 font-medium">
              Calendar ID (Email)
            </label>
            <input
              type="email"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="calendar@example.com"
              required
              className="w-full px-4 py-2 border rounded"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the email address of the Google Calendar you want to test
            </p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || (testType !== 'config' && !calendarId)}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {loading ? 'Running Test...' : 'Run Test'}
        </button>
      </form>
      
      {results && (
        <div className="border rounded p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Test Results</h2>
          
          {results.error ? (
            <div className="text-red-600">
              <p className="font-semibold">Error:</p>
              <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-60 text-sm">
                {results.error instanceof Error
                  ? `${results.error.message}\n\n${results.error.stack}`
                  : JSON.stringify(results.error, null, 2)
                }
              </pre>
            </div>
          ) : (
            <div>
              {testType === 'config' && (
                <div>
                  <p>
                    <span className="font-medium">Service Account Configuration:</span>{' '}
                    <span className={results.isConfigured ? 'text-green-500' : 'text-red-500'}>
                      {results.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                    </span>
                  </p>
                  
                  {results.data && (
                    <div className="mt-2">
                      <p>
                        <span className="font-medium">Service Account Email:</span>{' '}
                        {results.data.config?.serviceAccount?.email || 'Not configured'}
                      </p>
                      <p>
                        <span className="font-medium">Private Key Present:</span>{' '}
                        {results.data.config?.serviceAccount?.hasPrivateKey ? 'Yes' : 'No'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {testType === 'slots' && (
                <div>
                  <p className="mb-2">
                    Total Slots: <span className="font-medium">{results.data?.slots?.length || 0}</span>
                  </p>
                  <p className="mb-2">
                    Available Slots: <span className="font-medium">{results.availableSlotCount || 0}</span>
                  </p>
                  
                  {results.data?.slots && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Available Slots:</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {results.data.slots
                          .filter((slot: any) => slot.isAvailable)
                          .slice(0, 9)
                          .map((slot: any) => (
                            <div key={slot.id} className="bg-green-50 p-2 rounded text-sm">
                              {slot.time}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {testType === 'all' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Configuration Test:</h3>
                    <p className={`${results.configTest?.success ? 'text-green-500' : 'text-red-500'}`}>
                      {results.configTest?.success ? 'PASSED' : 'FAILED'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Available Slots Test:</h3>
                    <p className={`${results.slotsTest?.success ? 'text-green-500' : 'text-red-500'}`}>
                      {results.slotsTest?.success ? 'PASSED' : 'FAILED'}
                    </p>
                    {results.slotsTest?.success && (
                      <p>Found {results.slotsTest.availableSlotCount} available slots</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Booking Test:</h3>
                    <p className={`${results.bookingTest?.success ? 'text-green-500' : 'text-red-500'}`}>
                      {results.bookingTest?.success ? 'PASSED' : 'FAILED'}
                    </p>
                    {results.bookingTest?.success && results.bookingTest?.eventId && (
                      <p>Created event with ID: {results.bookingTest.eventId}</p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <h3 className="font-medium">Overall Result:</h3>
                    <p className={`font-bold ${results.overallSuccess ? 'text-green-500' : 'text-red-500'}`}>
                      {results.overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 