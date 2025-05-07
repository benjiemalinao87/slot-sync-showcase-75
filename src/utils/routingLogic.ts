import { supabase } from "@/integrations/supabase/client";

interface LeadData {
  email: string;
  city?: string;
  leadSource?: string;
  leadStatus?: string;
}

export async function findMatchingSalesRep(leadData: LeadData) {
  try {
    // First try to match by city and status
    if (leadData.city) {
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
        .eq('status', leadData.leadStatus || 'New');

      if (cityMatch?.[0]) {
        return {
          salesRep: cityMatch[0].sales_rep,
          method: 'city-based'
        };
      }

      // Try city match without status
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
        .is('status', null);

      if (cityOnlyMatch?.[0]) {
        return {
          salesRep: cityOnlyMatch[0].sales_rep,
          method: 'city-based'
        };
      }
    }

    // Then try to match by source and status
    if (leadData.leadSource) {
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
        .eq('status', leadData.leadStatus || 'New');

      if (sourceMatch?.[0]) {
        return {
          salesRep: sourceMatch[0].sales_rep,
          method: 'source-based'
        };
      }

      // Try source match without status
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
        .is('status', null);

      if (sourceOnlyMatch?.[0]) {
        return {
          salesRep: sourceOnlyMatch[0].sales_rep,
          method: 'source-based'
        };
      }
    }

    // Finally, fall back to percentage-based routing
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

    if (percentageRules?.length) {
      // Implement percentage-based selection logic here
      const totalPercentage = percentageRules.reduce((sum, rule) => sum + (rule.percentage || 0), 0);
      const random = Math.random() * totalPercentage;
      let accumulator = 0;

      for (const rule of percentageRules) {
        accumulator += rule.percentage || 0;
        if (random <= accumulator) {
          return {
            salesRep: rule.sales_rep,
            method: 'percentage-based'
          };
        }
      }
    }

    throw new Error('No matching sales rep found');
  } catch (error) {
    console.error('Error in findMatchingSalesRep:', error);
    throw error;
  }
} 