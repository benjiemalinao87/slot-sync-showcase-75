# Service Account Setup Instructions

## Prerequisites
- Google Workspace Admin access
- Access to Google Cloud Console
- Organization Policy Administrator role (roles/orgpolicy.policyAdmin)
- Supabase project access

## Request Organization Policy Access

Before proceeding, you need the Organization Policy Administrator role. Here's what to request from your organization's admin:

1. Role Required: 
   - Name: "Organization Policy Administrator"
   - Role ID: `roles/orgpolicy.policyAdmin`

2. Permissions Needed:
   - `orgpolicy.policy.get`
   - `orgpolicy.policies.create`
   - `orgpolicy.policies.delete`
   - `orgpolicy.policies.update`

3. Justification Template:
   ```
   Request: Organization Policy Administrator role
   Project: Cobalt-test
   Purpose: Need to disable service account key creation policy for calendar integration
   Policy to Modify: iam.managed.disableServiceAccountApiKeyCreation
   Business Impact: Required for implementing secure calendar booking system
   Duration: One-time policy update
   ```

4. Alternative Options:
   - Request temporary access just for the policy change
   - Ask admin to make the change directly
   - Consider using Workload Identity Federation if policy cannot be changed

## Disable Service Account Key Creation Policy (After Access Granted)

1. Go to Google Cloud Console > "IAM & Admin" > "Organization policies"
2. Click on "Block service account API key bindings" policy
3. In the policy details page:
   - Click "Manage policy" button (pencil icon) in the top right
   - Under "Policy value":
     * Change from "Inherit parent's policy" to "Customize"
     * Select "Not enforced" to disable the constraint
     * Or add your project as an exception in the allowed values
   - Click "Save"

Note: If the "Manage policy" button is grayed out or you can't access it:
- You need the Organization Policy Administrator role
- Current policy details show:
  * Constraint ID: `iam.managed.disableServiceAccountApiKeyCreation`
  * Enforcement: "Enforce on create"
  * Action: "Deny"
- Request these specific changes from your admin team

## Important: Service Account Key Creation Policy

If you see the error "Service account key creation is disabled" with policy ID `iam.disableServiceAccountKeyCreation`:

1. **Option A: Request Policy Exception** (Recommended)
   - Contact your Organization Policy Administrator
   - Request them to either:
     * Temporarily disable the constraint for service account key creation
     * Create an exception for this specific service account
   - Provide the business justification:
     * Required for calendar integration
     * Used by Edge Functions for secure calendar access
     * No user-level authentication required

2. **Option B: Use Workload Identity Federation** (Alternative)
   - This is a more secure alternative to service account keys
   - Requires additional setup with your cloud provider
   - Contact your cloud infrastructure team for implementation

3. **Option C: Use Existing Service Account**
   - If your organization already has a service account for similar purposes
   - Request access to use the existing service account
   - Ensure it has the necessary Calendar API permissions

## Step 1: Create Service Account (After Policy Disabled)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google Calendar API:
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `cobalt-calendar-service`
   - Description: "Service account for calendar integration"
   - Click "Create"

5. Grant Permissions:
   - Role: Select "Basic" > "Editor"
   - Click "Continue"
   - Click "Done"

6. (Optional) Grant User Access:
   - In the "Grant users access to this service account" section:
   - Two roles are available:
     
     a) Service Account Users Role:
     - For developers who need to test the service account
     - Allows running jobs and deploying as the service account
     - Add developer emails here for testing purposes
     
     b) Service Account Admins Role:
     - For administrators who need to manage the service account
     - Can update service account settings and create/delete keys
     - Typically assigned to DevOps or system administrators
     - Add admin emails here for service account management

   - For production:
     - You can skip both roles as the Edge Function uses direct authentication
     - The service account works independently without user/admin access

## Step 2: Get Service Account Credentials

⚠️ **Important**: If service account key creation is disabled:
1. Work with your Organization Policy Administrator
2. Reference tracking number from the error message
3. Follow organization's security protocols
4. Consider Workload Identity Federation as a modern alternative

1. Find your service account in the list
2. Click on the email address
3. Go to "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose "JSON" format
6. Click "Create" (this will download a JSON file)

## Step 3: Grant Calendar Access (Organization Level)

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to "Security" > "Access and data control" > "API Controls"
3. Find "Google Calendar API" and enable it
4. Go to "Apps" > "Google Workspace" > "Calendar"
5. Under "Calendar Settings":
   - Enable "Calendar Resource Settings"
   - Enable "Share settings and access permissions"
6. Add the service account email to have access to all calendars:
   - The email will look like: `cobalt-calendar-service@your-project.iam.gserviceaccount.com`
   - Grant "Make changes to events" permission

## Step 4: Configure Supabase Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to "Settings" > "API"
3. Under "Environment Variables", add:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=cobalt-calendar-service@your-project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
   ```
   Note: Copy the private key from the downloaded JSON file

## Step 5: Verify Setup

1. Test the calendar integration:
   ```typescript
   const { data, error } = await supabase.functions.invoke('google-calendar', {
     body: {
       action: 'getAvailableSlots',
       date: new Date().toISOString(),
       calendarId: 'designer@cobaltpower.com'  // Any designer's email will work
     }
   });
   ```

2. You should see available slots returned without any authentication errors

## Important Notes

1. **Security**:
   - Keep the JSON key file secure
   - Never commit it to version control
   - Use environment variables for the private key

2. **Maintenance**:
   - The service account key doesn't expire
   - No need for refresh tokens
   - No individual designer setup needed

3. **Troubleshooting**:
   If you get permission errors:
   - Verify the service account email is correct
   - Check organization-level calendar permissions
   - Ensure the Google Calendar API is enabled
   - Verify the environment variables are set correctly

## Support

If you encounter any issues:
1. Check the Edge Function logs in Supabase
2. Verify the service account permissions in Google Cloud Console
3. Contact the development team for assistance 

## Next Steps: Adding Your Service Account Credentials

Now that you have your service account credentials JSON file, follow these steps to add them to your Supabase project:

1. From your service account JSON file, extract the following values:
   - `client_email`: This is your service account email
   - `private_key`: This is the complete private key including the BEGIN/END statements

2. Go to your Supabase project dashboard
3. Navigate to "Settings" > "API" > "Project Settings"
4. Click on "Environment variables" in the sidebar
5. Add the following environment variables:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email (e.g., calendar@calendar-cobalt.iam.gserviceaccount.com)
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your-private-key (including the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines)
   ```

6. Click "Save" to update your environment variables

7. Redeploy your Edge Functions to apply the changes:
   ```bash
   supabase functions deploy google-calendar
   ```

8. Test the calendar integration with the following code:
   ```typescript
   const { data, error } = await supabase.functions.invoke('google-calendar', {
     body: {
       action: 'getAvailableSlots',
       date: new Date().toISOString(),
       calendarId: 'your-calendar-id@gmail.com'  // Use your calendar email
     }
   });
   console.log(data, error);
   ```

9. You should now see available slots returned from the calendar API.

## Troubleshooting Service Account Issues

If you encounter errors after adding your service account credentials:

1. **Check for formatting issues in the private key**:
   - Make sure the private key includes the BEGIN/END statements
   - The private key should include newline characters (`\n`)
   - If copied directly from the JSON file, verify no extra escaping is introduced

2. **Verify calendar access permissions**:
   - Ensure the service account has been granted access to the target calendars 
   - Check that the Calendar API is enabled in your Google Cloud project

3. **Check Edge Function logs**:
   - In your Supabase dashboard, go to "Edge Functions" > "Logs"
   - Look for any authorization or authentication errors
   - Verify the service account credentials are being loaded correctly

## Testing the Service Account Integration

To help verify your service account configuration is working correctly, we've created a testing tool:

1. Deploy the updated Edge Function from this repository:
   ```bash
   # Ensure you're in the project root directory
   cd supabase/functions
   supabase functions deploy google-calendar
   ```

2. Add your service account credentials to Supabase (if you haven't already):
   - GOOGLE_SERVICE_ACCOUNT_EMAIL
   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

3. Visit the Calendar Test page in your browser:
   - Go to: `http://localhost:3000/admin/calendar-test` (in development)
   - Or your production URL: `https://your-site.com/admin/calendar-test`

4. Run the configuration test first to verify that your service account credentials are properly loaded.

5. If the configuration test passes, run the available slots test with a calendar ID (email) that your service account has access to.

6. Finally, run all tests to verify that the service account can:
   - Check configuration
   - Get available slots
   - Book appointments

If all tests pass, your service account is correctly configured and ready to use! 