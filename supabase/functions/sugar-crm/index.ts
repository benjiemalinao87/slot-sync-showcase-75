import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUGAR_CRM_URL = 'https://cobalt.sugarondemand.com/rest/v11'
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getValidToken() {
  // Get the most recent token
  const { data: tokens, error } = await supabase
    .from('sugar_crm_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching token:', error)
    throw new Error('Failed to fetch token')
  }

  if (!tokens) {
    throw new Error('No token found in database')
  }

  // Check if access token is expired
  const now = new Date()
  const expiresAt = new Date(tokens.expires_at)

  if (now >= expiresAt) {
    // Token is expired, try to refresh
    console.log('Token expired, attempting refresh')
    return await refreshToken(tokens.refresh_token)
  }

  return tokens.access_token
}

async function refreshToken(refreshToken: string) {
  const response = await fetch(`${SUGAR_CRM_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'sugar',
      platform: 'custom_api'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Calculate expiration time
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (data.expires_in * 1000))

  // Update token in database
  const { error } = await supabase
    .from('sugar_crm_tokens')
    .insert({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt.toISOString()
    })

  if (error) {
    console.error('Error saving new token:', error)
    throw new Error('Failed to save new token')
  }

  return data.access_token
}

async function getLeadInfo(email: string) {
  console.log('Fetching lead info for email:', email)
  
  const token = await getValidToken()
  
  const requestBody = {
    filter: [
      {
        email: email
      }
    ],
    fields: "email1,status,lead_source",
    max_num: 1
  }

  console.log('Request body:', JSON.stringify(requestBody, null, 2))
  
  const response = await fetch(`${SUGAR_CRM_URL}/Leads/filter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OAuth-Token': token
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`SugarCRM API request failed with status ${response.status}: ${errorText}`)
    throw new Error(`API request failed with status ${response.status}`)
  }

  const data = await response.json()
  console.log('SugarCRM API Response:', JSON.stringify(data, null, 2))
  
  if (data.records && data.records.length > 0) {
    const lead = data.records[0]
    console.log('Lead source:', lead.lead_source)
    console.log('Lead status:', lead.status)
  } else {
    console.log('No lead found for email:', email)
  }
  
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    
    if (!email) {
      throw new Error('Email is required')
    }

    console.log(`Processing request for email: ${email}`)
    
    try {
      const leadInfo = await getLeadInfo(email)
      
      console.log(`Lead info retrieved: ${JSON.stringify(leadInfo)}`)
      
      return new Response(
        JSON.stringify(leadInfo),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('Error in lead retrieval process:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in sugar-crm function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
