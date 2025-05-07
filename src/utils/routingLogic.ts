import { supabase } from "@/integrations/supabase/client";

interface LeadData {
  email: string;
  city?: string;
  leadSource?: string;
  leadStatus?: string;
}

export async function findMatchingSalesRep(leadData: LeadData) {
  try {
    console.log('Finding matching sales rep for:', leadData);

    // First try to match by source and status (highest priority)
    if (leadData.leadSource) {
      console.log('Trying source-based routing first');
      
      // Debug query
      const { data: allSourceRules } = await supabase
        .from('city_routing_rules')
        .select('*')
        .is('city', null)
        .eq('is_active', true);
      
      console.log('All available source rules:', allSourceRules);
      
      // First try with both lead_source and lead_status match
      const { data: sourceMatch } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('lead_source', leadData.leadSource.toLowerCase())
        .eq('status', leadData.leadStatus || 'New')
        .is('city', null); // Ensure this is a source rule, not a city rule

      if (sourceMatch?.[0]) {
        console.log('Found source match with status using status field:', sourceMatch[0]);
        return {
          salesRep: sourceMatch[0].sales_rep,
          method: 'source-based'
        };
      }
      
      // Try with lead_status field
      const { data: sourceMatchLeadStatus } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('lead_source', leadData.leadSource.toLowerCase())
        .eq('lead_status', leadData.leadStatus || 'New')
        .is('city', null);

      if (sourceMatchLeadStatus?.[0]) {
        console.log('Found source match with lead_status field:', sourceMatchLeadStatus[0]);
        return {
          salesRep: sourceMatchLeadStatus[0].sales_rep,
          method: 'source-based'
        };
      }

      // Try source match without status
      console.log('Trying source match without status');
      const { data: sourceOnlyMatch } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('lead_source', leadData.leadSource.toLowerCase())
        .is('status', null)
        .is('lead_status', null)
        .is('city', null);

      if (sourceOnlyMatch?.[0]) {
        console.log('Found source match without status:', sourceOnlyMatch[0]);
        return {
          salesRep: sourceOnlyMatch[0].sales_rep,
          method: 'source-based'
        };
      }
    }

    // Then try city-based routing
    if (leadData.city) {
      console.log('Trying city-based routing');
      
      // Debug query
      const { data: allCityRules } = await supabase
        .from('city_routing_rules')
        .select('*')
        .not('city', 'is', null)
        .eq('is_active', true);
      
      console.log('All available city rules:', allCityRules);
      
      // Try with both city and status
      const { data: cityMatch } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('city', leadData.city.toLowerCase())
        .eq('status', leadData.leadStatus || 'New')
        .not('city', 'is', null); // Ensure this is a city rule

      if (cityMatch?.[0]) {
        console.log('Found city match with status field:', cityMatch[0]);
        return {
          salesRep: cityMatch[0].sales_rep,
          method: 'city-based'
        };
      }
      
      // Try with lead_status field
      const { data: cityMatchLeadStatus } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('city', leadData.city.toLowerCase())
        .eq('lead_status', leadData.leadStatus || 'New')
        .not('city', 'is', null);

      if (cityMatchLeadStatus?.[0]) {
        console.log('Found city match with lead_status field:', cityMatchLeadStatus[0]);
        return {
          salesRep: cityMatchLeadStatus[0].sales_rep,
          method: 'city-based'
        };
      }

      // Try city match without status
      console.log('Trying city match without status');
      const { data: cityOnlyMatch } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (
            id,
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('city', leadData.city.toLowerCase())
        .is('status', null)
        .is('lead_status', null)
        .not('city', 'is', null);

      if (cityOnlyMatch?.[0]) {
        console.log('Found city match without status:', cityOnlyMatch[0]);
        return {
          salesRep: cityOnlyMatch[0].sales_rep,
          method: 'city-based'
        };
      }
    }

    // Finally, fall back to percentage-based routing
    console.log('Falling back to percentage-based routing');
    const { data: percentageRules } = await supabase
      .from('routing_rules')
      .select(`
        *,
        sales_rep:sales_rep_id (
          id,
          name,
          email
        )
      `)
      .eq('is_active', true);

    console.log('Available percentage rules:', percentageRules);

    if (percentageRules?.length) {
      // Implement percentage-based selection logic here
      const totalPercentage = percentageRules.reduce((sum, rule) => sum + (rule.percentage || 0), 0);
      const random = Math.random() * totalPercentage;
      let accumulator = 0;

      console.log(`Random value: ${random}, Total percentage: ${totalPercentage}`);

      for (const rule of percentageRules) {
        accumulator += rule.percentage || 0;
        console.log(`Rule for rep ${rule.sales_rep.name}: ${rule.percentage}%, cumulative: ${accumulator}`);
        
        if (random <= accumulator) {
          console.log('Selected rep through percentage-based routing:', rule.sales_rep);
          return {
            salesRep: rule.sales_rep,
            method: 'percentage-based'
          };
        }
      }
    }

    throw new Error('No matching sales representative found');
  } catch (error) {
    console.error('Error in findMatchingSalesRep:', error);
    throw error;
  }
} 