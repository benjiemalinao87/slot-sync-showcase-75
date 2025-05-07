
/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />
/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';

// Add Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface SugarCRMError {
  message: string;
  details?: string;
  code?: string;
}

interface SugarCRMLead {
  lead_source?: string;
  status?: string;
  email1?: string;
  [key: string]: any;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

async function getSugarCRMToken(supabaseClient: any): Promise<{ token: string | null; error: SugarCRMError | null }> {
  try {
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('sugar_crm_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (tokenError) {
      console.error('Database error fetching token:', tokenError);
      return {
        token: null,
        error: {
          message: 'Failed to fetch authentication token',
          details: tokenError.message,
          code: 'TOKEN_FETCH_ERROR'
        }
      };
    }

    if (!tokenData) {
      return {
        token: null,
        error: {
          message: 'No authentication token found',
          code: 'TOKEN_NOT_FOUND'
        }
      };
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      return {
        token: null,
        error: {
          message: 'Authentication token has expired',
          code: 'TOKEN_EXPIRED'
        }
      };
    }

    return { token: tokenData.access_token, error: null };
  } catch (error) {
    console.error('Unexpected error in token fetch:', error);
    return {
      token: null,
      error: {
        message: 'Unexpected error fetching token',
        details: error.message,
        code: 'UNEXPECTED_TOKEN_ERROR'
      }
    };
  }
}

async function fetchLeadFromSugarCRM(email: string | null, token: string): Promise<{ lead: SugarCRMLead | null; error: SugarCRMError | null }> {
  if (!email) {
    return {
      lead: null,
      error: {
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      }
    };
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        lead: null,
        error: {
          message: 'Missing required environment variables',
          code: 'ENV_ERROR'
        }
      };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/sugar-crm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SugarCRM API error (${response.status}):`, errorText);
      
      return {
        lead: null,
        error: {
          message: 'Failed to fetch lead from SugarCRM',
          details: `API returned status ${response.status}: ${errorText}`,
          code: 'SUGAR_API_ERROR'
        }
      };
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      return {
        lead: null,
        error: {
          message: 'Lead not found in SugarCRM',
          details: `No records found for email: ${email}`,
          code: 'LEAD_NOT_FOUND'
        }
      };
    }

    return { lead: data.records[0] as SugarCRMLead, error: null };
  } catch (error) {
    console.error('Unexpected error fetching lead:', error);
    return {
      lead: null,
      error: {
        message: 'Unexpected error fetching lead details',
        details: error.message,
        code: 'UNEXPECTED_LEAD_ERROR'
      }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let city = null;
    let email = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        city = body.city ? body.city.toLowerCase().trim() : null;
        email = body.email ? body.email.toLowerCase().trim() : null;
        console.log(`Processing lead - City: ${city}, Email: ${email}`);
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Invalid request body',
            details: error.message,
            code: 'INVALID_REQUEST'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const logRoutingDetails = async (routingMethod: string, salesRep: any, additionalInfo: any = {}) => {
      try {
        // Ensure we have a valid sales rep before logging
        if (!salesRep || !salesRep.id) {
          console.error('Invalid sales rep, cannot log routing details');
          return;
        }

        const { data, error } = await supabaseClient
          .from('routing_logs')
          .insert({
            lead_email: additionalInfo.email || null,
            lead_city: additionalInfo.city || null,
            lead_source: additionalInfo.leadSource || null,
            lead_status: additionalInfo.leadStatus || null,
            assigned_sales_rep_id: salesRep.id,
            routing_method: routingMethod,
            routing_criteria: additionalInfo.routingCriteria || null,
            random_value: additionalInfo.randomValue || null
          });

        if (error) {
          console.error('Error logging routing details:', error);
        } else {
          console.log('Routing log created successfully');
        }
      } catch (logError) {
        console.error('Exception in logging routing details:', logError);
      }
    };

    // Start with source-based routing if email is provided
    if (email) {
      // Get SugarCRM token
      const { token, error: tokenError } = await getSugarCRMToken(supabaseClient);
      
      if (tokenError) {
        console.warn('Token error, proceeding with city-based routing:', tokenError);
      } else if (token) {
        // Fetch lead from SugarCRM
        const { lead, error: leadError } = await fetchLeadFromSugarCRM(email, token);
        
        if (leadError) {
          console.warn('Lead fetch error, proceeding with city-based routing:', leadError);
        } else if (lead) {
          // Convert to lowercase for case-insensitive matching
          const leadSource = lead.lead_source ? lead.lead_source.toLowerCase() : null;
          const leadStatus = lead.status ? lead.status.toLowerCase() : null;
          
          console.log(`Looking for source rules matching - Source: ${leadSource}, Status: ${leadStatus}`);
          
          // Get ALL source-based rules and filter in memory for better debugging
          const { data: sourceRules, error: sourceRuleError } = await supabaseClient
            .from('city_routing_rules')
            .select('*, sales_rep:sales_rep_id(*)')
            .not('lead_source', 'is', null);
          
          if (sourceRuleError) {
            console.error('Error fetching source rules:', sourceRuleError);
          } else {
            console.log('Available source rules:', sourceRules);
            
            // Find matching rule with proper case-insensitive comparison
            const matchingRule = sourceRules.find(rule => {
              const ruleSource = rule.lead_source ? rule.lead_source.toLowerCase() : null;
              const ruleStatus = rule.lead_status ? rule.lead_status.toLowerCase() : null;
              
              // Special case for Commercial/New leads - ignore city
              if (leadSource === 'commercial' && leadStatus === 'new') {
                return ruleSource === 'commercial' && ruleStatus === 'new';
              }
              
              // For other cases, check if city is null and then match source/status
              if (rule.city === null) {
                // Match both source and status if both are provided in the rule
                if (ruleSource && ruleStatus) {
                  return ruleSource === leadSource && ruleStatus === leadStatus;
                }
                // Match only source if status is not specified in the rule
                else if (ruleSource && !ruleStatus) {
                  return ruleSource === leadSource;
                }
              }
              return false;
            });
            
            if (matchingRule) {
              const salesRep = matchingRule.sales_rep;
              
              await logRoutingDetails('source', salesRep, {
                email,
                leadSource,
                leadStatus,
                routingCriteria: {
                  leadSource,
                  leadStatus
                }
              });

              return new Response(
                JSON.stringify({ 
                  salesRep,
                  routingMethod: 'source',
                  leadSource,
                  leadStatus
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    if (city) {
      const { data: cityRule, error: cityRuleError } = await supabaseClient
        .from('city_routing_rules')
        .select('sales_rep_id')
        .eq('city', city)
        .eq('is_active', true)
        .maybeSingle();

      if (cityRuleError) {
        console.error('Error fetching city routing rule:', cityRuleError);
      } else if (cityRule) {
        console.log(`Found city rule for ${city}, assigning to rep ID: ${cityRule.sales_rep_id}`);
        
        const { data: salesRep, error: salesRepError } = await supabaseClient
          .from('sales_reps')
          .select('*')
          .eq('id', cityRule.sales_rep_id)
          .single();

        if (salesRepError) throw salesRepError;

        await logRoutingDetails('city', salesRep, {
          city,
          email,
          routingCriteria: cityRule
        });

        return new Response(
          JSON.stringify({ 
            salesRep,
            routingMethod: 'city',
            city
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log(`No city rule found for ${city}, falling back to percentage-based routing`);
      }
    }

    // Percentage-based routing as fallback
    // Fetch active routing rules with non-zero percentages
    const { data: rules, error: rulesError } = await supabaseClient
      .from('routing_rules')
      .select('sales_rep_id, percentage')
      .eq('is_active', true)
      .gt('percentage', 0);  // Only consider rules with percentage > 0

    if (rulesError) {
      console.error('Error fetching routing rules:', rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.error('No active routing rules found with non-zero percentages');
      throw new Error('No active routing rules found');
    }

    console.log('Available percentage rules:', rules);

    const randomNum = Math.random() * 100;
    console.log(`Generated random number for percentage routing: ${randomNum}`);
    
    let currentSum = 0;
    let selectedRepId = null;

    for (const rule of rules) {
      currentSum += rule.percentage;
      console.log(`Rule for rep ${rule.sales_rep_id}: ${rule.percentage}%, cumulative: ${currentSum}%`);
      
      if (randomNum <= currentSum) {
        selectedRepId = rule.sales_rep_id;
        console.log(`Selected rep ID ${selectedRepId} at random value ${randomNum} (cumulative: ${currentSum})`);
        break;
      }
    }

    // If we haven't found a rep yet (e.g., if percentages don't add up to 100%)
    // select the last one as a fallback
    if (!selectedRepId && rules.length > 0) {
      selectedRepId = rules[rules.length - 1].sales_rep_id;
      console.log(`Fallback selection: Using last rep ${selectedRepId} because no threshold was met`);
    }

    if (!selectedRepId) {
      console.error('No sales representative found after percentage routing');
      throw new Error('No sales representative found');
    }

    const { data: salesRep, error: salesRepError } = await supabaseClient
      .from('sales_reps')
      .select('*')
      .eq('id', selectedRepId)
      .single();

    if (salesRepError) {
      console.error('Error fetching selected sales rep:', salesRepError);
      throw salesRepError;
    }

    await logRoutingDetails('percentage', salesRep, {
      email,
      city,
      randomValue: randomNum,
      routingCriteria: rules
    });

    return new Response(
      JSON.stringify({ 
        salesRep,
        routingMethod: 'percentage',
        randomValue: randomNum
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-sales-rep function:', error);
    return new Response(
      JSON.stringify({ 
        error: {
          message: 'Internal server error',
          details: error.message,
          code: 'INTERNAL_ERROR'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
