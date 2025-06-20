# Lessons Learned

## UX Improvements

### Remove Add to Google Calendar Button (2024-01-XX)
**Problem**: After booking completion, users saw an "Add to Google Calendar" button which was redundant since the appointment was already added to the sales rep's calendar automatically.

**Solution**: 
- Removed the "Add to Google Calendar" button from BookingConfirmation.tsx
- Updated confirmation message to be more generic and reassuring
- Simplified the button layout to show only "Return to Home" button
- Cleaned up unused `handleAddToCalendar` function

**How it was fixed**:
1. Identified the button location in `src/components/BookingConfirmation.tsx`
2. Removed the entire Add to Google Calendar button and its associated handler
3. Updated the confirmation text to remove references to adding to calendar
4. Simplified the button container layout from flex-row to centered single button
5. Tested build to ensure no TypeScript errors
6. Committed and pushed changes

**Why this approach**:
- Appointments are already automatically added to the sales rep's calendar during booking
- The customer doesn't need to manually add the appointment to their own calendar
- Reduces confusion and simplifies the user experience
- Maintains the core functionality while removing redundant features

**What not to do**:
- Don't leave unused functions in the code (always clean up)
- Don't assume users need manual calendar management when it's automated
- Don't overcomplicate the confirmation flow with unnecessary options

## Calendar Integration Implementation

### What Worked Well
1. **Service Account Authentication**
   - Using a service account instead of OAuth2 refresh tokens
   - Eliminates need for individual user authentication
   - More secure and manageable for organization-wide access
   - No need to grant individual user access to service account
   - Edge Function can directly use service account credentials
   - Clear separation of roles:
     * Service Account Users: For development/testing
     * Service Account Admins: For account management
     * Production: No user roles needed

2. **Edge Function Architecture**
   - Separating calendar operations into dedicated Edge Function
   - Clean API with action-based routing
   - Proper error handling and logging
   - CORS support for cross-origin requests

3. **Frontend Component Design**
   - Modular and reusable calendar component
   - Clear separation of concerns
   - Responsive design with mobile support
   - Proper loading states and error handling

### What to Avoid
1. **Iframe Calendar View**
   - Don't use iframe for calendar display
   - Private calendars won't load in iframes
   - Poor user experience and limited customization

2. **Direct Calendar URL Access**
   - Avoid using direct calendar URLs
   - Security risks with exposing calendar IDs
   - Limited control over appearance and functionality

3. **Client-side Calendar API Calls**
   - Don't make Google Calendar API calls directly from frontend
   - Keeps API credentials secure
   - Better rate limiting and error handling

### Security Considerations
1. **Service Account Key Management**
   - Organization may disable service account key creation
   - Check organization policies before starting implementation
   - Know the specific policy IDs:
     * `iam.managed.disableServiceAccountKeyCreation`
     * `iam.disableServiceAccountKeyCreation`
   - Understand policy inheritance and enforcement levels
   - Document any policy exceptions or changes

2. **Alternative Approaches**
   - Use existing service accounts when available
   - Request policy exceptions with proper justification
   - Consider federated authentication methods
   - Balance security requirements with functionality needs

3. **Required Roles**
   - Organization Policy Administrator for policy changes
   - Service Account Admin for key management
   - Clear documentation of role requirements
   - Plan for role requests in project timeline

### Best Practices
1. **Error Handling**
   - Implement comprehensive error handling
   - Provide clear error messages to users
   - Log errors for debugging

2. **State Management**
   - Keep state management simple
   - Use local state for UI components
   - Clear loading and error states

3. **API Design**
   - Use action-based routing for clear intent
   - Validate input parameters
   - Return consistent response format

4. **Security**
   - Use service accounts with minimal permissions
   - Implement proper CORS headers
   - Validate input on both client and server

5. **Performance**
   - Efficient time slot generation
   - Proper caching of API responses
   - Minimize unnecessary re-renders

### Future Improvements
1. **Testing**
   - Add unit tests for components
   - Integration tests for Edge Function
   - End-to-end testing of booking flow

2. **Security**
   - Rate limiting for API calls
   - Input sanitization
   - Request validation middleware

3. **User Experience**
   - Add timezone support
   - Implement booking confirmation emails
   - Add cancellation functionality

### JWT Authentication and Testing
1. **JWT Implementation Lessons**
   - Implement proper JWT generation for Google API authentication
   - Verify JWT claims match Google's requirements exactly
   - Test JWT verification independently before full integration
   - Common issues:
     * Incorrect claim formatting
     * Missing required claims
     * Improper signature algorithm
     * Time synchronization issues

2. **Testing Strategy Evolution**
   - Start with direct API testing using curl
   - Create local test scripts for isolated testing
   - Implement browser-based testing only after API verification
   - Testing progression:
     * Local JWT generation and verification
     * Direct Google API calls
     * Edge Function integration
     * Frontend component testing

3. **Debugging Best Practices**
   - Implement detailed request/response logging
   - Test each authentication step independently
   - Use local test scripts to bypass Edge Function complexity
   - Document all error cases and solutions
   - Keep test cases simple and focused

## Google Service Account Setup

### Key Lessons
1. **Environment Variable Formatting**
   - Service account private keys must be properly formatted with newlines (`\n`)
   - Supabase environment variables need to include the full private key with BEGIN/END statements
   - Special characters in private keys need to be properly escaped
   - Edge Functions parse environment variables differently than local development

2. **Service Account Permissions**
   - Service accounts need explicit calendar access grants in Google Workspace
   - Calendar API must be enabled in Google Cloud project
   - Service account may need domain-wide delegation for cross-user calendar access
   - Default permissions are often too restrictive

3. **Troubleshooting Approaches**
   - Use Edge Function logs to identify authentication issues
   - Test with minimal functionality first (e.g., checking available slots)
   - Isolate issues by testing service account credentials independently
   - Document error patterns and solutions for future reference

4. **Security Considerations**
   - Never commit service account credentials to version control
   - Store service account private keys securely in environment variables
   - Review and audit service account access regularly
   - Use minimal required permissions for service accounts

## CORS and Edge Functions

### Key Lessons
1. **CORS Configuration**
   - Always handle OPTIONS preflight requests with a 204 status code
   - Set appropriate CORS headers for all responses
   - Test CORS configuration with both development and production domains
   - Include all required headers in Access-Control-Allow-Headers
   - Set Access-Control-Max-Age to reduce preflight requests

2. **Edge Function Debugging**
   - Implement comprehensive logging in Edge Functions
   - Test functions directly with curl before browser integration
   - Check both preflight and actual request handling
   - Verify environment variables are properly loaded
   - Monitor function logs for errors

3. **Client-Side Testing**
   - Create dedicated test pages for integration testing
   - Test both direct API access and through Supabase client
   - Implement connection and CORS status checks
   - Add detailed error reporting and logging
   - Display clear success/failure indicators

4. **Best Practices**
   - Keep Edge Functions focused and simple
   - Forward complex requests to dedicated functions
   - Use proper error handling and status codes
   - Validate input parameters thoroughly
   - Document all required headers and parameters

### Common Issues and Solutions
1. **CORS Preflight Failures**
   - Problem: Browser reports CORS errors despite correct configuration
   - Solution: Ensure OPTIONS requests return 204 with correct headers
   - Headers needed:
     * Access-Control-Allow-Origin
     * Access-Control-Allow-Methods
     * Access-Control-Allow-Headers
     * Access-Control-Max-Age

2. **Authentication Requirements**
   - Problem: 401 Unauthorized errors when calling Edge Functions
   - Solution: Include Supabase anon key in Authorization header
   - Required header format: `Authorization: Bearer <anon-key>`
   - Applies to both regular requests and CORS preflight
   - Anon key can be found in Supabase project settings
   - Keep anon key secure but it's safe to expose in client code

3. **Environment Variables**
   - Problem: Edge Functions can't access environment variables
   - Solution: Verify variables are set in Supabase dashboard
   - Check variable names match exactly
   - Test variable access in function logs

4. **Function Deployment**
   - Problem: Changes not reflected after deployment
   - Solution: Verify deployment success
   - Check function version number
   - Monitor deployment logs
   - Test with direct HTTP requests

5. **Client Integration**
   - Problem: Client can't connect to Edge Function
   - Solution: Implement proper error handling
   - Add connection status checks
   - Test with and without Supabase client
   - Verify API URLs and keys

### Testing Strategy
1. **Progressive Testing**
   - Start with direct HTTP requests (curl)
   - Test CORS preflight separately
   - Verify environment variables
   - Test actual functionality
   - Integrate with client application

2. **Monitoring and Debugging**
   - Use detailed logging in functions
   - Monitor function execution logs
   - Check browser network tab
   - Verify request/response headers
   - Test with multiple domains

3. **Error Handling**
   - Return appropriate HTTP status codes
   - Include detailed error messages
   - Log errors server-side
   - Display user-friendly errors
   - Implement retry logic where appropriate

2. **Testing Tools and Approaches**
   - Create dedicated test proxy functions for isolating issues
   - Use browser developer tools to inspect CORS headers
   - Test both localhost and production domains
   - Implement connection status indicators in UI
   - Add detailed request/response logging

3. **UI Component Best Practices**
   - Keep dependencies minimal - avoid complex UI libraries when possible
   - Separate concerns between UI components
   - Implement clear loading and error states
   - Add connection status indicators
   - Use simple, focused components

4. **Dependency Management**
   - Carefully evaluate UI library dependencies
   - Consider impact on bundle size
   - Test compatibility with existing components
   - Document version requirements
   - Keep dependencies up to date

5. **Error Handling Strategy**
   - Implement progressive error checking:
     * Connection status
     * CORS configuration
     * Authentication
     * API functionality
   - Display user-friendly error messages
   - Log detailed errors for debugging
   - Add retry mechanisms for transient failures
   - Monitor error patterns

## Google Calendar Integration Testing

### Key Lessons
1. **Test Script Development**
   - Create standalone test scripts before Edge Function implementation
   - Verify API connectivity and authentication separately
   - Test with minimal scope first (e.g., calendar list)
   - Document successful test cases for reference

2. **Edge Function Development**
   - Start with basic functionality and expand gradually
   - Implement comprehensive error handling from the start
   - Use proper logging for debugging
   - Test with both success and failure scenarios

3. **Environment Configuration**
   - Double-check service account permissions
   - Verify private key formatting in environment variables
   - Test configuration in both development and production
   - Document required environment variables

4. **UI Integration**
   - Review existing components before integration
   - Plan integration points carefully
   - Consider error states and loading indicators
   - Document component dependencies

### Best Practices
1. **Testing Strategy**
   - Test API integration separately from UI
   - Use incremental testing approach
   - Document test cases and expected results
   - Maintain test scripts for future reference

2. **Error Handling**
   - Implement comprehensive error handling
   - Log errors with sufficient context
   - Plan for API failures and timeouts
   - Consider retry mechanisms

3. **Documentation**
   - Document successful configurations
   - Keep track of troubleshooting steps
   - Maintain clear integration instructions
   - Update documentation with lessons learned

## Lesson: Google Calendar API Integration Testing

- Problem: Script failed with 403 Forbidden due to Google Calendar API not being enabled for the project.
- Solution: Enabled the Google Calendar API in the Google Cloud Console for the correct project, then re-ran the script.
- Credentials: Updated the script to use the new service account email and private key provided by the user.
- Result: Script successfully authenticated and called the Google Calendar API. No calendars were found because the service account has not been shared on any calendars yet.

**How to fix next time:**
- Always ensure the relevant Google API is enabled for your project in the Google Cloud Console.
- Use environment variables for sensitive credentials in production.
- Share a calendar with the service account if you want to see actual data.

**How NOT to fix:**
- Do not change the script or credentials if the API is not enabled; always check project settings first.

## Test-calendar.ts Update (2025-05-02)
- Fixed event creation in test-calendar.ts to schedule a fixed appointment on May 5th.
- Resolved linter errors by switching to the unversioned djwt import with a @ts-ignore directive.
- Verified appointment creation via the Google Calendar API (test event was successfully created).
- Note: Avoid pinned versions that cause linter issues; consider using @ts-ignore with unversioned imports when necessary.

## Google Calendar Edge Function Implementation (2025-05-02)

### What Worked
- Implemented a live Google Calendar API integration in Supabase edge function
- Reused the JWT authentication approach from test-calendar.ts for service account access
- Successfully created real calendar events through the edge function using the same service account credentials
- Maintained support for both event creation and free/busy slot checking
- Used proper error handling and logging for better debugging

### Key Learning Points
- JWT generation and token authentication can be successfully implemented within edge functions
- The real Google Calendar API connection works properly using the same approach as local Deno script
- Edge functions need proper CORS headers for client-side access
- Hardcoded credentials work, but should be moved to environment variables in production
- Testing with both mock implementation and real API implementation helps validate functionality 

## Sales Rep Routing and Calendar Integration (2025-05-02)

### Implementation Overview
- Successfully integrated sales rep routing with Google Calendar appointment booking
- Created a complete flow: lead form submission → sales rep matching → available slot selection → appointment booking → confirmation
- Used real Google Calendar API integration through Supabase Edge Functions
- Implemented proper storage and display of booking details

### What Worked Well
- Using the sales rep's email as the calendar ID for accessing their calendar
- Passing the sales rep's email from the routing system to the calendar component
- Using a comprehensive edge function for both getting available slots and booking appointments
- Storing booking details in session storage for persistence across page navigation
- Implementing a clean confirmation page with clear booking details

### Technical Details
1. **Routing Integration**: 
   - Used the `get-sales-rep` edge function to match leads with sales reps based on:
     * Lead source/status rules
     * City-based rules
     * Percentage-based fallback rules

2. **Calendar Integration**:
   - Modified the `bookAppointment` function to accept a calendar ID parameter
   - Updated the SchedulingCalendar component to pass the sales rep's email as the calendar ID
   - Used JWT authentication with a service account for Google Calendar API access

3. **Booking Flow**:
   - LeadBookingPage gets lead information and matches with a sales rep
   - SchedulingCalendar fetches available slots for that sales rep's calendar
   - On booking confirmation, the event is created in the sales rep's calendar
   - A confirmation page displays the booking details with options to add to calendar

### Lessons Learned
- Use session storage for preserving booking details across page navigations
- Pass state data via React Router for immediate access on the confirmation page
- Make utility functions flexible with optional parameters and sensible defaults
- Reuse existing edge functions rather than creating duplicate functionality
- Use consistent error handling and user feedback throughout the booking process

### Future Improvements
- Add email notifications for both the lead and the sales rep
- Implement calendar sync options for other calendar providers (Outlook, etc.)
- Add the ability to reschedule or cancel appointments
- Store booking history in the database for reporting and analytics 

## Handling Date Objects in React and JavaScript (2025-05-03)

### Issue: "Invalid time value" Error
- Problem: We encountered a "RangeError: Invalid time value" error when trying to book appointments
- The error occurred when calling `toISOString()` on invalid Date objects in the `SchedulingCalendar` component
- The root cause was improper date object creation when converting time slots to Date objects

### The Fix
1. **Proper Date Object Handling**:
   - Added validation to check if date objects are valid before proceeding
   - Cleared milliseconds when setting hours and minutes to ensure precise time values
   - Used `setHours(hours, minutes, 0, 0)` to explicitly set seconds and milliseconds to zero
   - Added proper error handling for invalid date scenarios

2. **JSON Serialization Fix**:
   - Modified the `sessionStorage` data saving approach to serialize Date objects properly
   - Called `toISOString()` on Date objects before storing in sessionStorage
   - Updated `BookingConfirmation` component to handle both Date objects and ISO string dates
   - Implemented proper type checking and conversion when retrieving dates

### Key Lessons
1. **Date Object Best Practices**:
   - Always validate Date objects with `isNaN(date.getTime())` before using them
   - Be explicit about all time components (hours, minutes, seconds, milliseconds)
   - Use proper date formatting libraries like date-fns consistently
   - Be careful when passing Date objects between components

2. **JSON Serialization**:
   - Remember that Date objects become strings during JSON serialization
   - Always convert Date strings back to Date objects when retrieving from storage
   - Use consistent date formatting across the application
   - Implement proper type checking when working with dates from different sources

3. **Debugging Approach**:
   - Check browser console for detailed error messages and stack traces
   - Use conditional breakpoints to inspect values before errors occur
   - Test with simplified date operations to isolate issues
   - Validate inputs and handle edge cases explicitly 

## Google Calendar API Integration Issues

### getBusyDays Function Issues
1. **Date Handling Problems**
   - Problem: 400 Bad Request errors when calling the 'getBusyDays' action
   - Root Cause: Inconsistent date handling between frontend and backend
   - Issues identified:
     * Improper date formatting when sending to Edge Function
     * Inconsistent handling of month values (JavaScript months are 0-indexed)
     * Invalid date objects created with improper parsing
   
2. **Solution Implemented**
   - Improved date handling in fetchBusyDays function:
     * Added explicit date object creation with proper year, month, day parameters
     * Enhanced error logging to catch and identify issues
     * Added proper validation of dates before sending to API
     * Used consistent date format (ISO strings) for all date-related API calls
   
3. **Error Handling Improvements**
   - Added more robust error handling in UI components
   - Implemented detailed console logging for debugging
   - Added fallback behavior when API calls fail
   - Cleared existing data when changing parameters to prevent stale data issues
   - Added retry mechanisms for failed requests

4. **Best Practices for Calendar API Integration**
   - Always use ISO string format for dates in API requests
   - Remember that JavaScript months are 0-indexed (0=January, 11=December)
   - Verify date objects are valid before using in calculations or API calls
   - Provide clear feedback to users during loading and error states
   - Add comprehensive logging for troubleshooting
   - Test edge cases like month boundaries and timezone differences 

## UI Interaction and Positioning Issues

### Fixed Position Element Clickability
1. **Problem: Settings Button Not Clickable**
   - Issue: Fixed position gear icon button in AdminRouting.tsx couldn't be clicked
   - Root cause: Z-index issues and insufficient visual prominence
   - Common pitfalls:
     * Fixed position elements without proper z-index can be hidden by other elements
     * Small click targets are difficult for users to interact with
     * Ghost variant buttons with minimal styling can be hard to see/find

2. **Solution Implemented**
   - Added a wrapper div to create a larger click area
   - Set explicit z-index (z-50) to ensure button appears above other elements
   - Changed from ghost to outline variant for better visibility
   - Increased button size and added visual enhancements:
     * Shadow for depth
     * Border for definition
     * Larger icon size
     * Distinctive background/hover states

3. **Best Practices for Fixed Position UI Elements**
   - Always set appropriate z-index (usually 50+) for fixed elements
   - Create sufficiently large click/touch targets (at least 44×44px)
   - Use visual cues to indicate interactivity (shadows, borders, etc.)
   - Test interactions on various devices and browsers
   - Consider adding transitions/animations to improve user feedback
   - Maintain sufficient contrast for accessibility

## Admin Interface Security

### Securing Administrative Functions
1. **Problem: Unprotected Admin Settings**
   - Issue: Admin settings icon was accessible to anyone who knew where to click
   - Security risk: Unauthorized users could modify routing rules, sales rep information, and other critical settings
   - Potential impact: Data manipulation, disruption of service, privacy breach

2. **Solution Implemented**
   - Added password authentication using the existing members table
   - Created a login dialog that appears before accessing the admin panel
   - Implemented proper state management for authentication flow:
     * Authentication state persists during the session
     * Logout functionality clears authentication state
     * Error handling for invalid credentials
   - Added visual feedback during the authentication process
   - Added a logout button in the admin panel for security
   
3. **Best Practices Learned**
   - Admin interfaces should always be protected with authentication
   - Use existing authentication mechanisms when available (e.g., members table)
   - Provide clear feedback during authentication process
   - Implement proper error handling for failed authentication attempts
   - Add logout functionality to allow users to secure their session
   - In production, always use proper password hashing and secure authentication protocols

## Database Policy Issues and Authentication Error Handling

### Row Level Security (RLS) Policy Issues
1. **Problem: Infinite Recursion in RLS Policy**
   - Issue: Error "infinite recursion detected in policy for relation 'members'" when trying to access the members table
   - Root cause: A circular reference in the RLS policy that checked if the current user's email was in the members table with role 'admin'
   - Common pitfalls:
     * Creating policies that reference the same table they're applied to without careful consideration
     * Complex policy conditions that create circular dependencies
     * Missing proper policy testing before deployment

2. **Solution Implemented**
   - Dropped all existing policies on the members table
   - Created simplified policies that allow necessary operations without circular references
   - Added a fallback authentication mechanism in the frontend code
   - Implemented better error handling to provide meaningful feedback to users
   - Added default admin credentials as a backup authentication method
   
3. **Best Practices for Database Policies**
   - Keep RLS policies simple and avoid self-referential conditions when possible
   - Test policies thoroughly before deployment
   - Implement proper error handling in frontend code for database access issues
   - Add fallback authentication mechanisms for critical admin functions
   - Log database errors properly for debugging
   - Provide clear user feedback without exposing sensitive database information
   - Consider using separate auth tables for role-based access control instead of self-referential policies

## Admin Interface Improvements
- Moved from a popup dialog to a dedicated admin page for better UX and more space
- Placed admin link in footer instead of floating gear icon for better discoverability
- Used proper routing with /admin/login and /admin paths
- Improved security by having a dedicated login page
- Better separation of concerns between admin and user interfaces

## Best Practices
- Keep admin interfaces separate from user-facing pages
- Use proper routing instead of dialogs for major features
- Place admin links in consistent, discoverable locations
- Follow security best practices with dedicated login pages
- Use subtle but clear admin access points

## Admin Interface Design
1. **Admin Access Point Placement**
   - Keep admin access subtle but accessible
   - Use fixed position in bottom-right corner for traditional placement
   - Semi-transparent icon (20% opacity) to blend with background
   - Small icon size (2.5x2.5px) to minimize visibility
   - Proper z-index (50+) to ensure clickability
   - Include aria-label for accessibility
   - Avoid prominent placement in main navigation or footer

2. **Best Practices**
   - Balance accessibility with discretion
   - Consider the context (public vs private pages)
   - Maintain consistent placement across the application
   - Use subtle visual cues that don't draw attention
   - Ensure the element remains clickable despite being subtle
   - Follow accessibility guidelines even for admin features

## Inline Editing Best Practices
1. **Component Design**
   - Keep inline editing components focused and reusable
   - Handle both display and edit states in the same component
   - Include proper validation before saving
   - Provide clear visual feedback for edit mode
   - Support keyboard interactions (Enter to save, Esc to cancel)

2. **User Experience**
   - Show edit controls only when needed (e.g., on hover)
   - Provide immediate visual feedback for changes
   - Include clear save/cancel actions
   - Show loading states during save operations
   - Display success/error messages using toast notifications

3. **Data Management**
   - Update local state immediately for responsive UI
   - Handle API errors gracefully with rollback if needed
   - Validate data before sending to the server
   - Refresh data after successful updates
   - Use optimistic updates when appropriate

4. **Implementation Tips**
   - Use refs to focus input on edit mode
   - Handle click-outside to cancel editing
   - Maintain original value for cancellation
   - Add proper type checking for numeric values
   - Include proper error boundaries

## Percentage-based Routing Validation
1. **Total Percentage Validation**
   - Always validate total percentage across all active rules
   - Calculate totals excluding the current item being edited
   - Check both individual and aggregate constraints
   - Show clear error messages for validation failures
   - Consider race conditions in multi-user scenarios

2. **Implementation Tips**
   - Fetch all rules before updating to get current state
   - Use reduce() for efficient total calculation
   - Filter out current item when calculating totals
   - Add proper error handling and user feedback
   - Keep validation logic in one place for consistency

3. **User Experience**
   - Provide immediate feedback on validation errors
   - Show clear error messages explaining the constraint
   - Allow easy cancellation of edits
   - Maintain original value on cancel
   - Update UI only after successful validation

## Multi-Step Form Implementation

### What Worked Well
1. **Breaking Down Complex Forms**
   - Splitting large forms into logical steps (Basic Info, Contact Details, Interests)
   - Improved user experience by reducing cognitive load at each step
   - Progress indicators to show completion status
   - Preserving all form data across steps
   - Visual feedback on step completion (checkmarks for completed steps)

2. **Progressive Disclosure**
   - Only showing relevant fields at each step
   - Focused user attention on current task
   - Reduced form abandonment rate potential
   - Better mobile experience with fewer fields per screen

3. **Validation Strategy**
   - Field validation at each step before proceeding
   - Clear visual indicators for step validation status
   - Maintaining existing form submission logic
   - Preserving all existing functionality while improving UX

### Implementation Best Practices
1. **State Management**
   - Single source of truth for form data
   - Controlled inputs with clear state management
   - Reset step counter when form reopens
   - Preserve data between steps

2. **Navigation Controls**
   - Consistent button placement and styling
   - Back button to review previous steps
   - Different button colors for navigation vs. submission
   - Disabling buttons when fields are invalid

3. **Visual Feedback**
   - Progress bar showing overall completion
   - Step indicators with current/completed/pending states
   - Smooth transitions between steps
   - Consistent container size to prevent layout shifts

### Potential Future Improvements
1. **Conditional Steps**
   - Skip irrelevant steps based on user inputs
   - Dynamic step count based on user needs
   - Branch logic for different user journeys

2. **Form Persistence**
   - Save partial form completion
   - Allow users to resume later
   - Email link to continue form completion

3. **Enhanced Validation**
   - Real-time field validation
   - Cross-field validation rules
   - Contextual help for complex fields

4. **Accessibility Enhancements**
   - Screen reader announcements for step changes
   - Keyboard navigation improvements
   - Focus management between steps
   - ARIA attributes for form structure

## Routing Statistics Graph Implementation

### Key Lessons
1. **Data Visualization Best Practices**
   - Use stacked bar charts for comparing distribution across categories
   - Transform raw data into appropriate format for visualization library
   - Consider color accessibility when choosing chart colors
   - Implement responsive design for different screen sizes
   - Add proper loading states and error handling

2. **Component Integration**
   - Place visualization components where users naturally look for them
   - Consider the navigation flow when deciding component placement
   - Keep visualization components focused and reusable
   - Use proper type definitions for data props
   - Implement error boundaries for visualization components

3. **Performance Considerations**
   - Minimize unnecessary re-renders in chart components
   - Use proper data memoization for complex transformations
   - Consider lazy loading for visualization libraries
   - Implement efficient data aggregation methods
   - Monitor rendering performance with React DevTools

4. **User Experience**
   - Make chart labels readable with proper angle and spacing
   - Provide clear visual feedback for loading and error states
   - Consider mobile viewing experience in chart design
   - Use consistent colors and styles across visualizations
   - Add helpful tooltips for data point interactions

### Common Issues and Solutions
1. **Chart Rendering Issues**
   - Problem: Chart not appearing in expected location
   - Solution: Verify component mounting and proper data flow
   - Check parent container dimensions and styling
   - Ensure data transformation produces expected format
   - Add proper error boundaries and fallback UI

2. **Data Transformation**
   - Problem: Raw data not suitable for visualization
   - Solution: Create clear data transformation functions
   - Validate data structure before transformation
   - Handle edge cases and missing data gracefully
   - Document expected data formats clearly

3. **Mobile Responsiveness**
   - Problem: Charts not scaling properly on mobile
   - Solution: Use responsive container components
   - Implement proper breakpoints for different screens
   - Test on various device sizes
   - Consider alternative layouts for small screens

## Multiple Chart Types in Data Visualization

### Key Lessons
1. **Chart Type Selection**
   - Use pie charts for showing distribution/composition of a whole
   - Use bar charts for comparing quantities across categories
   - Consider the data story you want to tell when choosing chart types
   - Combine different chart types to provide multiple perspectives
   - Keep visualizations focused and purpose-driven

2. **Data Processing**
   - Transform raw data differently for each chart type
   - Handle null/undefined values consistently
   - Use clear naming conventions for data properties
   - Implement efficient data aggregation methods
   - Cache processed data when possible

3. **Layout Considerations**
   - Use grid layouts for organizing multiple charts
   - Ensure proper spacing between visualizations
   - Make charts responsive to container size
   - Consider mobile viewing experience
   - Maintain consistent heights for visual balance

4. **Date Range Filtering**
   - Implement clear date range options
   - Use consistent date manipulation functions
   - Cache filtered results when practical
   - Show loading states during data updates
   - Maintain filter state between renders

### Common Issues and Solutions
1. **Chart Sizing**
   - Problem: Charts not resizing properly
   - Solution: Use ResponsiveContainer and fixed-height containers
   - Set explicit dimensions for chart containers
   - Test different screen sizes
   - Handle resize events appropriately

2. **Data Updates**
   - Problem: Charts not updating with new data
   - Solution: Properly handle useEffect dependencies
   - Clear existing data before updates
   - Show loading states during updates
   - Handle error cases gracefully

3. **Performance**
   - Problem: Slow updates with large datasets
   - Solution: Implement data caching
   - Optimize data transformation functions
   - Use memoization for expensive calculations
   - Batch state updates when possible

## Database Schema Evolution and Field Inconsistency

### Issue: Inconsistent Status Fields in Routing Rules
1. **Problem Description**
   - Source-based routing rules were being stored with inconsistent field usage
   - The `city_routing_rules` table has both `status` and `lead_status` fields
   - Existing rules had data in `status` field but not in `lead_status` field
   - Updated code correctly checks both fields, but couldn't find existing rules

2. **Root Cause**
   - Database schema evolved over time, adding `lead_status` alongside `status`
   - Previous rule creation only populated the `status` field
   - Updated rule creation code properly populates both fields
   - Routing logic needed to check both fields to handle legacy and new rules

3. **Solution**
   - Updated routing logic to check both `status` and `lead_status` fields
   - Fixed existing database records to have consistent values in both fields
   - Added proper debug logging to track routing decisions
   - Ensured new rules consistently set both fields for backward compatibility

### Best Practices for Database Schema Evolution
1. **Field Consistency**
   - When introducing new fields, update existing records to maintain consistency
   - Implement database migrations to handle field additions and renames
   - Use clear naming conventions to avoid confusion (e.g., `status` vs `lead_status`)
   - Document schema changes and their impact on existing code

2. **Data Access Patterns**
   - Check for both old and new field names during transition periods
   - Add detailed logging to track how fields are being accessed
   - Implement graceful fallbacks when fields might be missing
   - Consider using database views to present a consistent interface

3. **Testing During Schema Changes**
   - Test with both existing and new data patterns
   - Verify backward compatibility with older records
   - Test forward compatibility with newer records
   - Use real-world data and scenarios during testing

4. **Migration Strategy**
   - Plan for incremental updates to avoid breaking changes
   - Use temporary dual-write patterns during transitions
   - Schedule cleanup of deprecated fields after sufficient transition time
   - Document both old and new patterns for developers

## URL Parameter Handling for Lead Routing

### Issue: URL Parameters Not Used for Routing
1. **Problem Description**
   - URL parameters (`lead_source` and `lead_status`) were not being passed to the routing logic
   - BookingDialog.tsx correctly read URL parameters but LeadBookingPage.tsx didn't pass them to the edge function
   - The edge function was only looking up lead source/status from SugarCRM, not from direct parameters

2. **Root Cause**
   - Missing data flow from URL parameters to routing decision
   - Incomplete parameter extraction in LeadBookingPage.tsx's handleFindDesigner function
   - Edge function not designed to accept direct lead source/status parameters
   - Multi-component architecture required proper parameter passing

3. **Solution Implemented**
   - Modified LeadBookingPage.tsx to extract and pass leadSource and leadStatus to the edge function
   - Updated the edge function to check for leadSource/leadStatus directly from request body
   - Added priority to direct parameters over SugarCRM lookup
   - Implemented comprehensive logging to trace parameter flow

### Best Practices for URL Parameter Handling
1. **Parameter Flow**
   - Track all parameters through the entire request/response flow
   - Ensure each component passes all relevant parameters to the next component
   - Use consistent parameter naming across components
   - Log parameter values at each step for debugging

2. **URL Parameter Integration**
   - Design systems to handle parameters from multiple sources (URL, forms, APIs) consistently
   - Use a unified approach to parameter handling across components
   - Consider all potential sources of input when designing data flows
   - Prioritize direct inputs over remote lookups for efficiency

3. **Testing URL Parameters**
   - Test with explicit URL parameters to verify behavior
   - Log parameter values at each step to trace flow
   - Verify that URL parameters override defaults correctly
   - Test with both present and absent parameters

## Webhook Integration for Booking Confirmations

### Issue: Sales Rep Information Missing in Webhook
1. **Problem Description**
   - Webhook for booking confirmations was not sending sales rep name and email information
   - Webhook was being called, but critical information about sales representatives was missing
   - Without sales rep information, the webhook receiver couldn't route notifications properly

2. **Solution Implemented**
   - Added webhook call in the `handleConfirmBooking` function of `SchedulingCalendar.tsx`
   - Included complete sales rep information (name and email) in the webhook payload
   - Placed webhook call after successful calendar booking but before navigation
   - Added proper error handling to prevent webhook failures from blocking booking flow
   - Implemented detailed logging for webhook success/failure

3. **Best Practices for Webhook Integration**
   - Place webhook calls after critical operations are complete
   - Include all necessary data in the webhook payload for downstream processing
   - Implement proper error handling to prevent webhook failures from affecting core functionality
   - Use try/catch blocks to isolate webhook errors from the main application flow
   - Log webhook successes and failures for debugging and monitoring
   - Use consistent data structure in webhook payloads

4. **Implementation Details**
   - Added new webhook call with comprehensive booking information:
     * Appointment date and time (start/end)
     * Customer details (name, email, notes)
     * Sales rep information (name, email)
     * Slot details for reference
   - Used fallback values for missing information
   - Added non-blocking error handling to prevent webhook failures from affecting booking experience
   - Maintained consistent data structure for webhook consumers

## Webhook Payload Enhancement

### Issue: Phone Number Formatting for Webhook
1. **Problem Description**
   - The webhook payload for booking confirmations was missing the customer's phone number
   - Phone numbers needed to be standardized in E.164 format for consistency
   - Different input formats (with dashes, parentheses, etc.) needed to be normalized
   - Country code needed to be included for international compatibility

2. **Solution Implemented**
   - Added `customerPhone` field to the webhook payload in `handleConfirmBooking` function
   - Implemented phone number formatting to E.164 standard:
     * Removed all non-digit characters (dashes, parentheses, spaces)
     * Added country code "1" for 10-digit US/CA numbers if missing
     * Preserved any existing country codes for international numbers
     * Example: "(626) 553-9586" → "16265539586"
   - Provided a fallback message "No phone provided" if no phone number is available

3. **Best Practices for Phone Number Formatting**
   - Use E.164 standard for international compatibility (country code + digits)
   - Strip all formatting characters before sending to APIs or webhooks
   - Handle both formatted inputs (555-123-4567) and raw inputs (5551234567)
   - Always provide fallback values for optional fields
   - Apply consistent formatting rules across your application

## Sales Rep Active/Inactive Toggle Implementation

### Issue: Need to Disable Sales Reps Without Deleting Them
1. **Problem Description**
   - Sales reps needed to be temporarily removed from routing without losing their data
   - Previously, sales reps had to be completely deleted to remove them from routing
   - All historical information would be lost when deleting a sales rep
   - No way to quickly reactivate reps when needed

2. **Solution Implemented**
   - Added `is_active` Boolean field to the `sales_reps` table
   - Created a toggle switch UI component to easily change active status
   - Set default value to `true` for backward compatibility
   - Added visual indicators for inactive reps in admin interface
   - Modified database queries to only consider active reps for routing
   - Created SQL functions to enforce active status in all routing calculations

3. **Technical Implementation Details**
   - Database Changes:
     * Added `is_active` column with DEFAULT TRUE for existing records
     * Created a SQL function `get_active_sales_reps_for_routing()` to facilitate backend queries
     * Modified RLS policies to enforce active status constraints
   
   - Frontend Changes:
     * Created a reusable `ToggleActive` component with clear visual feedback
     * Added active status indicator column to sales rep tables
     * Applied visual styling to inactive rows (reduced opacity)
     * Updated all type definitions to include the `is_active` field
     * Enhanced existing code to respect active status

   - Backend Changes:
     * Modified Edge Function to filter by active status
     * Updated all SQL queries to include active status conditions
     * Used RPC for complex filtering logic

4. **Best Practices for Feature Implementation**
   - Always provide an easy-to-use toggle UI for boolean features
   - Include visual indicators for status (both in toggle and row appearance)
   - Ensure all components respect the feature's intent
   - Add default values for backward compatibility
   - Update type definitions across the entire application
   - Use database functions for complex filtering logic
   - Document all changes in lesson_learn.md for future reference

## Fixing Active Status Filtering in Routing

### Issue: Inactive Sales Reps Still Being Selected
1. **Problem Description**
   - Sales reps marked as inactive in the UI were still being selected by the routing algorithm
   - Setting a rep as inactive via toggle didn't prevent them from being matched with leads
   - The active status flag was being ignored during some parts of the routing process
   - Database functions weren't properly filtering by is_active=true

2. **Root Cause**
   - The routing process had three separate entry points that each needed filtering:
     * Source-based routing wasn't checking sales rep active status
     * City-based routing checked rep status after selecting a rule
     * Percentage-based routing RPC function needed explicit active status filtering
   - The SQL function for selecting active reps needed to be updated
   - Some database queries were selecting reps directly without checking is_active

3. **Solution Implemented**
   - Added explicit is_active=true filters to all database queries in the edge function
   - Created a database function that properly filters inactive reps from routing rules
   - Updated edge function to fetch and filter reps with active status early 
   - Added detailed logging to identify when inactive reps are being considered
   - Fixed inconsistency between UI state and database state
   - Deactivated routing rules for inactive sales reps

4. **Best Practices for Status Filtering**
   - Use database-level filtering whenever possible rather than client-side filtering
   - Create dedicated SQL functions that enforce business rules consistently
   - Add logging to track status checks and decision points
   - Ensure all query paths include the required filters
   - Test edge cases where inactive resources might still be selected
   - Keep UI state and database state consistent with database triggers

## Timezone Handling Implementation (May 11, 2024)

### ✅ What Was Fixed
1. **Proper Date Construction**
   - Replaced `setHours()` with proper Date constructor using user's timezone
   - Used `new Date(year, month, day, hour, minute)` for timezone-aware date creation
   - Eliminated timezone conversion issues during appointment booking

2. **Business Hours Filtering**
   - Created timezone utility helper (`timezoneHelper.ts`)
   - Server returns wide time range (6 AM - 8 PM UTC)
   - Client filters to business hours (9 AM - 5 PM) in user's timezone
   - Proper timezone-aware time slot display

3. **ISO String Validation**
   - Eliminated complex time parsing in `googleCalendarAuth.ts`
   - Direct ISO string validation instead of AM/PM conversion
   - Consistent date format throughout the booking flow

4. **Enhanced Logging**
   - Added timezone information to all date-related logs
   - Better debugging with both UTC and local time display
   - Validation of timezone strings using `Intl.DateTimeFormat`

### 🔧 Technical Implementation
1. **Client-Side Timezone Detection**
   ```typescript
   const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
   ```

2. **Proper Date Construction**
   ```typescript
   // Before (WRONG):
   startTime.setHours(hours, minutes, 0, 0);
   
   // After (CORRECT):
   const startTime = new Date(year, month, day, hours, minutes, 0, 0);
   ```

3. **Business Hours Filtering**
   ```typescript
   const businessHours = getDefaultBusinessHours(userTimeZone);
   const filteredSlots = filterSlotsForBusinessHours(rawSlots, businessHours);
   ```

4. **Timezone-Aware Display**
   ```typescript
   const timeStr = startTime.toLocaleTimeString([], { 
     hour: 'numeric', 
     minute: '2-digit',
     hour12: false,
     timeZone: userTimeZone
   });
   ```

### ⚠️ What to Avoid
1. **Never use `setHours()` for user input times** - operates in local timezone
2. **Don't hardcode business hours in server** - let client handle timezone filtering
3. **Avoid complex time string parsing** - use ISO strings directly
4. **Don't assume server and client are in same timezone**

### 🎯 Best Practices Established
1. **Timezone Parameter Passing**
   - Always pass user's timezone to booking functions
   - Include timezone info in calendar event descriptions
   - Validate timezone strings before use

2. **Server-Side Strategy**
   - Return broad time ranges from server (UTC)
   - Let client filter based on user's business hours
   - Use proper UTC methods for date operations

3. **Error Handling**
   - Validate timezone strings with `Intl.DateTimeFormat`
   - Provide clear error messages for timezone issues
   - Graceful fallbacks for invalid timezones

4. **Testing Considerations**
   - Test across multiple timezones
   - Verify business hours in different regions
   - Check edge cases like daylight saving time transitions

### 🔍 Files Modified
- `src/components/SchedulingCalendar.tsx` - Fixed date construction and timezone handling
- `src/utils/googleCalendarAuth.ts` - Simplified time parsing and added timezone support
- `supabase/functions/google-calendar/index.ts` - Enhanced server-side slot generation
- `src/utils/timezoneHelper.ts` - New utility for timezone operations

### 🚀 Impact
- **Accurate appointment scheduling** across all timezones
- **Proper business hours display** for users in different regions
- **Consistent calendar event times** in Google Calendar
- **Better user experience** with timezone-aware time display

### 📝 Future Improvements
- [ ] Add timezone selection in admin settings
- [ ] Support for different business hours per sales rep
- [ ] Handle daylight saving time transitions
- [ ] Add timezone abbreviation display (EST, PST, etc.)

## 1. Timezone Handling in Calendar Applications

### Problem
Users reported that 2:00 PM bookings were showing as 2:00 AM in confirmations, indicating serious timezone handling issues.

### Root Causes Identified
1. **Local timezone assumptions**: Code assumed all times were in server timezone
2. **Business hours hardcoded**: Server timezone hardcoded instead of using user's timezone
3. **Inconsistent date handling**: Using `setHours()` method instead of proper Date constructor
4. **Missing timezone context**: No timezone information passed between client and server

### Solutions Implemented

#### 1. Fixed Date Construction
**Wrong approach:**
```javascript
const startTime = new Date();
startTime.setHours(hours, minutes, 0, 0);
```

**Correct approach:**
```javascript
const startTime = new Date(year, month, date, hours, minutes, 0, 0);
```

#### 2. Enhanced Timezone Handling
- Added timezone detection: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Pass timezone info to all booking functions
- Use timezone-aware formatting for event titles
- Created `timezoneHelper.ts` utility for consistent timezone operations

#### 3. Server-Side Improvements
- Modified Edge Function to return broader time ranges (6 AM - 8 PM UTC)
- Enhanced event fetching using `events.list` API
- Improved busy days logic with proper UTC operations

#### 4. Better Error Handling and Logging
- Added comprehensive logging with timezone information
- Enhanced error messages with context
- Timezone validation before processing

### Key Takeaways
1. **Always be explicit about timezones** - never assume local or server timezone
2. **Use proper Date constructors** - avoid `setHours()` for date manipulation
3. **Pass timezone context** between client and server
4. **Test with different timezones** to catch edge cases
5. **Use UTC for server operations** and convert to user timezone for display

### Technical Implementation Details
- **Client timezone detection**: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- **Business hours filtering**: Created helper functions for timezone-aware filtering
- **Event title formatting**: Include timezone info for clarity
- **Date serialization**: Always use ISO strings for date transmission

### Future Improvements
1. Add timezone selector for users in different regions
2. Implement daylight saving time handling
3. Add business hours configuration per sales rep
4. Consider using libraries like `date-fns-tz` for complex timezone operations

## 2. Server-Client Data Format Synchronization

### Problem
After updating the server to return ISO strings for time slots, the client was still trying to parse them as simple time strings (e.g., "16:00"), causing "Invalid time format: 2025-06-29T06:00:00.000Z" errors during booking.

### Root Cause
**Data format mismatch**: Server began returning ISO strings (`2025-06-29T06:00:00.000Z`) but client parsing logic still expected simple time format (`"16:00"`).

### Solution Implemented
**Before (expecting simple time strings):**
```javascript
const parseTimeString = (timeStr: string) => {
  const cleanTimeStr = timeStr.replace(/\s*(AM|PM)\s*/i, '').trim();
  const [hours, minutes] = cleanTimeStr.split(':').map(Number);
  return { hours, minutes };
};

const startTime = new Date(year, month, date, startTimeParts.hours, startTimeParts.minutes);
```

**After (handling ISO strings directly):**
```javascript
try {
  // Parse the ISO strings directly
  const startTime = new Date(selectedSlot.startTime);
  const endTime = new Date(selectedSlot.endTime);
  
  // Validate the parsed dates
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error("Invalid date objects created from slot times");
  }
} catch (parseError) {
  throw new Error(`Failed to parse slot times: ${parseError.message}`);
}
```

### Key Takeaways
1. **Synchronize data formats** between server and client when making changes
2. **Handle format changes gracefully** with proper error handling
3. **Use ISO strings for date/time transmission** - they're standardized and timezone-aware
4. **Add validation** for parsed date objects to catch invalid data early
5. **Test data flow end-to-end** after making format changes

### Best Practices for Data Format Changes
1. **Version your APIs** or use feature flags when changing data formats
2. **Add migration logic** to handle both old and new formats temporarily
3. **Use TypeScript interfaces** to catch format mismatches at compile time
4. **Add comprehensive logging** during format transitions
5. **Test with real data** from the server to ensure compatibility

### Technical Implementation
- **ISO string validation**: Check `isNaN(date.getTime())` after parsing
- **Error context**: Include original slot data in error messages for debugging
- **Fallback handling**: Graceful degradation when parsing fails
- **Type safety**: Use TypeScript to enforce expected data formats