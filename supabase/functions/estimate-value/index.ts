import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { itemId } = await req.json();

    // Fetch the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to estimate the value
    const prompt = `You are a fair trade value estimator. Analyze this item and provide an estimated market value in Indian Rupees (INR).

Item Details:
- Title: ${item.title}
- Category: ${item.category}
- Description: ${item.description || 'No description provided'}
- Listed Price: ${item.price ? '₹' + item.price : 'Not specified'}
- Condition: ${item.is_donation ? 'Free/Donation' : 'For Trade'}

Consider:
1. Current market prices for similar items in India
2. Category-specific depreciation
3. Condition indicators from description
4. Whether it's listed as donation (which might indicate lower value)

Respond with ONLY a number (the estimated value in INR). No currency symbols, no text, just the number.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise item valuation assistant. Respond only with numeric values.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI estimation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const estimatedValueText = aiData.choices[0].message.content.trim();
    const estimatedValue = parseFloat(estimatedValueText.replace(/[^0-9.]/g, ''));

    if (isNaN(estimatedValue)) {
      console.error('Failed to parse AI response:', estimatedValueText);
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the item with the estimated value
    const { error: updateError } = await supabase
      .from('items')
      .update({ estimated_value: estimatedValue })
      .eq('id', itemId);

    if (updateError) {
      console.error('Failed to update item:', updateError);
    }

    return new Response(JSON.stringify({ estimatedValue }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in estimate-value function:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
