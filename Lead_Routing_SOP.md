# Lead Routing System - Standard Operating Procedure (SOP)

## Overview

This document provides guidelines and procedures for working with our lead routing system. The system automatically assigns leads to sales representatives based on defined rules with the following priority:

1. Source + Status based routing (highest priority)
2. Source-only based routing
3. City-based routing
4. Percentage-based routing (fallback)

## System Components

### 1. Database Tables

- `city_routing_rules`: Contains rules for both city-based and source-based routing
- `routing_rules`: Contains percentage-based routing rules
- `sales_reps`: Information about sales representatives
- `routing_logs`: Tracks all routing decisions for analytics
- `sugar_crm_tokens`: Stores authentication tokens for CRM integration
- `members`: Stores admin credentials for dashboard access

### 2. Key API Endpoints

- `get-sales-rep`: Supabase Edge Function that handles routing logic
- `sugar-crm`: Supabase Edge Function for CRM integration
- `google-calendar`: Supabase Edge Function for calendar integration
- `calendar-test`: Test function for calendar API verification

### 3. Frontend Components

- `BookingDialog.tsx`: Main form for lead entry with URL parameter handling
- `AdminRouting.tsx`: Admin interface for managing routing rules
- `LeadBookingPage.tsx`: Page that processes form submission and routes leads
- `RoutingStatsGraph.tsx`: Visualizations for routing analytics
- `SchedulingCalendar.tsx`: Calendar component for appointment booking

## URL Parameter Handling

The system supports pre-filling form fields and routing information via URL parameters:

```
cobaltpower.chau.link/book?first_name=Name&last_name=LastName&email_address=email@example.com&phone=+1234567890&city=CityName&lead_status=Status&lead_source=Source
```

Important parameters for routing:
- `lead_source`: Source of the lead (e.g., "Commercial", "Residential")
- `lead_status`: Status of the lead (e.g., "New", "Contacted")
- `city`: City location of the lead

### URL Parameter Examples

| Scenario | URL Example |
|----------|-------------|
| Commercial lead | `cobaltpower.chau.link/book?lead_source=Commercial&lead_status=New` |
| City-specific lead | `cobaltpower.chau.link/book?city=Sydney&lead_status=New` |
| Pre-filled form | `cobaltpower.chau.link/book?first_name=John&last_name=Smith&email_address=john@example.com&phone=+61234567890&city=Melbourne&lead_source=Referral` |

### Parameter Encoding

- URL parameters must be properly encoded
- Use `%20` for spaces
- Use `%40` for @ symbols
- Example: `first_name=John%20Doe&email_address=john%40example.com`

## Routing Rules Configuration

### Source-Based Rules

1. Navigate to Admin Dashboard
2. Select the "Source Rules" tab
3. Create rules with:
   - Lead Source (required)
   - Lead Status (optional, for more specific matching)
   - Sales Rep (required)

**Note**: Source names are case-insensitive but must match exactly (e.g., "Commercial" will match "commercial" but not "commercials")

#### Available Lead Sources

| Source Name | Description | Typical Lead Status Values |
|-------------|-------------|----------------------------|
| Commercial | Business/corporate leads | New, Qualified, Contacted |
| Residential | Home/consumer leads | New, Pending, Closed |
| Referral | Customer referrals | New, Contacted |
| Website | Website form submissions | New, Pending |
| Social | Social media leads | New, Contacted, Qualified |
| Partner | Partner program leads | New, Qualified |
| Event | Trade show or event leads | New, Contacted |

#### Source Rule Creation Best Practices

1. **Specificity**: Create more specific rules first (with both source and status)
2. **Coverage**: Ensure all important sources have rules
3. **Default Rules**: Create fallback rules for each source with no status specified
4. **Review**: Regularly review source rules for effectiveness
5. **Naming**: Use consistent naming for sources across all systems

### City-Based Rules

1. Navigate to Admin Dashboard
2. Select the "City Rules" tab
3. Create rules with:
   - City name (required, case-insensitive)
   - Sales Rep (required)

#### City Rule Creation Best Practices

1. **Regional Expertise**: Assign reps based on geographic expertise
2. **Workload**: Consider rep workload when assigning cities
3. **Coverage**: Ensure all major cities have rules
4. **Spelling**: Check for alternative spellings of city names
5. **Suburbs**: Consider adding rules for suburban areas of major cities

### Percentage-Based Rules

1. Navigate to Admin Dashboard
2. Select the "Percentage Rules" tab
3. Assign percentages to sales reps (should total 100%)

#### Percentage Rule Best Practices

1. **Balance**: Balance percentages based on rep capacity and expertise
2. **New Reps**: Start new reps with lower percentages and increase over time
3. **Specialization**: Assign higher percentages to reps with specific skills when appropriate
4. **Monitoring**: Regularly review actual distribution vs. intended percentages
5. **Adjustment**: Adjust percentages based on rep performance and capacity

### Rule Evaluation Process

When a lead comes in, the system evaluates rules in this specific order:

1. **Source + Status Match**: First checks for rules matching both lead source and lead status
   ```sql
   SELECT * FROM city_routing_rules 
   WHERE lead_source = [lead_source] 
   AND (lead_status = [lead_status] OR status = [lead_status])
   AND is_active = true
   AND city IS NULL
   ```

2. **Source-Only Match**: Then checks for rules matching just the lead source
   ```sql
   SELECT * FROM city_routing_rules 
   WHERE lead_source = [lead_source] 
   AND (lead_status IS NULL AND status IS NULL)
   AND is_active = true
   AND city IS NULL
   ```

3. **City Match**: Then checks for rules matching the lead's city
   ```sql
   SELECT * FROM city_routing_rules 
   WHERE city = [city]
   AND is_active = true
   ```

4. **Percentage-Based**: Finally uses percentage distribution for unmatched leads
   ```sql
   SELECT * FROM routing_rules
   WHERE is_active = true
   ORDER BY percentage DESC
   ```

## Common Issues and Troubleshooting

### URL Parameters Not Working

- Check that parameter names match exactly (`lead_source`, not `leadSource`)
- Ensure values are URL-encoded properly
- Verify that `LeadBookingPage.tsx` is passing parameters to the edge function

#### Troubleshooting Decision Tree

1. **Check Browser Console**
   - Look for errors related to parameter parsing
   - Verify parameters are included in API calls

2. **Check URL Format**
   - Ensure all parameters are properly formatted
   - Verify parameter names match expected values

3. **Examine Edge Function Logs**
   - Check if parameters are received properly
   - Look for parsing or processing errors

4. **Test With Minimal Parameters**
   - Try with just one parameter to isolate issues
   - Gradually add parameters to identify problematic ones

### Routing to Wrong Sales Rep

1. Check console logs for routing decision process
2. Verify rule priorities (source+status > source > city > percentage)
3. Inspect database for correct rule configuration
4. Ensure both `status` and `lead_status` fields are populated for backward compatibility

#### Debugging Routing Decisions

1. **Check Routing Logs**
   - Look in the `routing_logs` table for the specific lead
   - Note which routing method was used

2. **Verify Rule Existence**
   - Check if appropriate rules exist for the lead's data
   - Verify rule priority and active status

3. **Database Inspection**
   - Check `city_routing_rules` table for correct configuration
   - Verify sales rep IDs match expected representatives

4. **Test with Direct API Calls**
   - Use Postman or curl to test the API directly
   - Send sample lead data and verify response

#### Common Routing Mistakes

| Issue | Cause | Solution |
|-------|-------|----------|
| Wrong sales rep assigned | Rule priority not considered | Check routing logs, review rule creation |
| No routing rule matches | Missing or inactive rules | Add appropriate rules, check rule status |
| Case sensitivity issues | Inconsistent capitalization | Use lowercase for comparison, standardize input |
| Missing lead data | Form fields not captured | Ensure all required fields are validated and sent |
| Duplicate rules | Multiple active rules for same criteria | Review and consolidate rules, maintain one active rule per criteria |

### Edge Function Issues

1. Check Supabase logs: Project Dashboard > Edge Functions > get-sales-rep > Logs
2. Verify function is properly deployed with latest code
3. Test edge function directly using the Supabase dashboard

#### Edge Function Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| TOKEN_FETCH_ERROR | Error fetching authentication token | Check database connection, verify token table |
| TOKEN_EXPIRED | Authentication token has expired | Refresh token or generate new one |
| SUGAR_API_ERROR | Error calling SugarCRM API | Check API credentials, network connectivity |
| LEAD_NOT_FOUND | Lead not found in SugarCRM | Verify email address, check CRM data |
| INVALID_REQUEST | Invalid request format | Check request structure and parameters |
| INTERNAL_ERROR | Unexpected server error | Check function logs for detailed error message |

## Database Schema Evolution

The system has evolved over time, and some fields have multiple names for backward compatibility:

- Both `status` and `lead_status` fields exist in the `city_routing_rules` table
- When creating new rules, both fields should be populated with the same value
- The edge function checks both fields when making routing decisions

### Historical Schema Changes

| Date | Change | Reason | Backward Compatibility |
|------|--------|--------|------------------------|
| March 2024 | Added `lead_status` field | More explicit naming convention | Maintained `status` field |
| April 2024 | Added `routing_logs` table | Analytics and debugging | N/A (new feature) |
| May 2024 | Enhanced routing priority | Better source+status handling | Updated both fields in existing records |

### Database Maintenance Procedures

1. **Regular Backups**
   - Database should be backed up daily
   - Keep 7 days of rolling backups
   - Test restore procedure quarterly

2. **Log Management**
   - Implement log rotation for `routing_logs` table
   - Archive logs older than 6 months
   - Maintain summary statistics for historical data

3. **Performance Optimization**
   - Add indexes for frequently queried fields
   - Monitor query performance in Supabase dashboard
   - Consider data partitioning for large log volumes

## Adding New Routing Criteria

1. Add new field to `city_routing_rules` table
2. Update admin interface to allow configuration of the new field
3. Modify `get-sales-rep` edge function to include the new criteria in routing decisions
4. Update `BookingDialog.tsx` to capture the new field from URL parameters
5. Update `LeadBookingPage.tsx` to pass the new field to the edge function

### Step-by-Step Process for Adding New Criteria

1. **Database Update**
   ```sql
   ALTER TABLE city_routing_rules ADD COLUMN new_criteria TEXT;
   ```

2. **Admin UI Update**
   - Add form field in `AdminRouting.tsx`
   - Update form submission logic to include new field
   - Add display column in rules table

3. **Edge Function Update**
   - Modify request parsing to extract new criteria
   - Add new criteria to rule matching logic
   - Update response to include new criteria info

4. **Form Component Update**
   - Add URL parameter parsing in `BookingDialog.tsx`
   - Add appropriate form field
   - Include field in form submission

5. **Testing**
   - Test with sample URL parameters
   - Verify correct rule matching
   - Check routing logs for proper tracking

## Testing Changes

Always test changes using these test cases:

1. URL with source and status parameters
2. URL with city parameter only
3. URL with no routing parameters (should use percentage-based)
4. Different combinations of source and status values
5. Check routing logs in the database after each test

### Comprehensive Test Scenarios

| Test ID | Scenario | Expected Result | Verification Method |
|---------|----------|-----------------|---------------------|
| T001 | New commercial lead | Route to commercial specialist | Check routing logs |
| T002 | Lead from Sydney | Route to Sydney rep | Check routing logs |
| T003 | No source or city | Route via percentage | Check routing logs, verify distribution |
| T004 | Invalid source | Fall back to percentage | Check error handling, verify routing |
| T005 | Multiple matching rules | Use highest priority rule | Check rule selection logic |
| T006 | Form pre-fill via URL | Form fields populated correctly | Visual verification |
| T007 | Cross-browser testing | Consistent behavior across browsers | Test in Chrome, Firefox, Safari |
| T008 | Mobile responsiveness | Form works on mobile devices | Test on iOS and Android |

## Deployment Process

1. Make and test changes locally
2. Deploy edge functions using Supabase Dashboard
3. Deploy frontend changes using your CI/CD pipeline
4. Verify changes in production with test cases

### Deployment Checklist

1. **Pre-Deployment**
   - Run all local tests
   - Check for console errors
   - Verify edge function functionality
   - Review all changes with team

2. **Edge Function Deployment**
   - Back up current function code
   - Deploy functions individually
   - Verify function version updated
   - Check logs for startup errors

3. **Frontend Deployment**
   - Run build process
   - Deploy via Netlify or similar
   - Check build logs
   - Verify successful deployment

4. **Post-Deployment Verification**
   - Run test cases in production
   - Check routing functionality
   - Verify admin interface
   - Monitor for any errors

### Rollback Procedure

1. **Identify Issue**
   - Confirm deployment is cause of problem
   - Document specific errors

2. **Edge Function Rollback**
   - Deploy previous version from backup
   - Verify function operation

3. **Frontend Rollback**
   - Revert to previous build
   - Deploy previous version
   - Verify functionality

4. **Documentation**
   - Document rollback reason
   - Update issue tracking
   - Schedule fix for issues

## Key Files to Understand

- `src/utils/routingLogic.ts`: Client-side routing logic (for preview purposes)
- `supabase/functions/get-sales-rep/index.ts`: Server-side routing logic (actual implementation)
- `src/components/BookingDialog.tsx`: Form handling and URL parameter processing
- `src/pages/LeadBookingPage.tsx`: Form submission and edge function calling
- `src/components/AdminRouting.tsx`: Rule management interface

### Code Insights

#### Routing Priority in `get-sales-rep/index.ts`

```typescript
// First check if leadSource was directly provided in the request
if (leadSource) {
  console.log('Using lead source provided in request:', leadSource);
  
  // First try with both lead_source and lead_status match
  const { data: sourceRulesWithStatus, error: sourceRuleWithStatusError } = await supabaseClient
    .from('city_routing_rules')
    .select('*, sales_rep:sales_rep_id(*)')
    .eq('is_active', true)
    .is('city', null)
    .eq('lead_source', leadSource);
  
  // Find a rule that matches both source and status
  let matchingRule = null;
  
  if (sourceRulesWithStatus && leadStatus) {
    // Try matching with lead_status field
    matchingRule = sourceRulesWithStatus.find(rule => {
      const ruleStatus = rule.lead_status ? rule.lead_status.toLowerCase() : null;
      return ruleStatus === leadStatus;
    });
    
    // If no match, try with status field for backward compatibility
    if (!matchingRule) {
      matchingRule = sourceRulesWithStatus.find(rule => {
        const ruleStatus = rule.status ? rule.status.toLowerCase() : null;
        return ruleStatus === leadStatus;
      });
    }
  }
  
  // If no match with status, use any rule with the matching source
  if (!matchingRule && sourceRulesWithStatus && sourceRulesWithStatus.length > 0) {
    matchingRule = sourceRulesWithStatus[0];
  }
  
  // Return the matching sales rep if found
  if (matchingRule) {
    const salesRep = matchingRule.sales_rep;
    return { salesRep, routingMethod: 'source' };
  }
}
```

## System Maintenance Procedures

### Weekly Maintenance Tasks

1. **Review Routing Logs**
   - Check for unusual patterns
   - Verify even distribution for percentage routing
   - Look for failed routing attempts

2. **Rule Audit**
   - Verify all rules are correctly configured
   - Check for duplicate or conflicting rules
   - Ensure percentages total 100%

3. **Data Cleanup**
   - Archive old logs if needed
   - Clean up test data
   - Verify database size and performance

### Monthly Maintenance Tasks

1. **Performance Review**
   - Check edge function response times
   - Monitor database query performance
   - Review client-side form submission times

2. **Security Audit**
   - Verify admin authentication
   - Check Supabase permissions and policies
   - Review access logs

3. **Analytics Review**
   - Analyze routing statistics
   - Review effectiveness of routing rules
   - Make adjustments based on business needs

### Quarterly Maintenance Tasks

1. **System Update**
   - Update dependencies
   - Apply security patches
   - Deploy new features

2. **Full Testing**
   - Run comprehensive test suite
   - Verify all edge cases
   - Test in multiple environments

3. **Documentation Review**
   - Update this SOP as needed
   - Review and update all other documentation
   - Ensure alignment with current system behavior

## Analytics and Reporting

### Available Reports

1. **Routing Method Distribution**
   - Pie chart showing distribution by routing method
   - Filterable by date range

2. **Sales Rep Assignment**
   - Bar chart showing lead count by rep
   - Broken down by routing method

3. **Source Distribution**
   - Analysis of lead sources
   - Trends over time

4. **City Distribution**
   - Geographic distribution of leads
   - Heat map of lead concentration

### Custom Report Creation

1. Navigate to Admin Dashboard
2. Select Analytics tab
3. Use filter controls to customize report
4. Export data as needed

## Documentation and Resources

Refer to these files for more information:
- `lesson_learn.md`: Contains lessons learned from previous issues
- `progress.md`: Historical record of system development and improvements
- `Setup_Guide.md`: Installation and setup instructions

### Additional Resources

- **Team Slack Channel**: #lead-routing-support
- **API Documentation**: Available in Postman collection
- **Design Documents**: Located in Google Drive folder "Lead Routing Design"
- **Training Videos**: Available in shared drive "Training/LeadRouting" 