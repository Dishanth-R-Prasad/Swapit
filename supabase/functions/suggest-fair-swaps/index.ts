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

    const { myItemId, theirItemId } = await req.json();

    // Fetch both items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .in('id', [myItemId, theirItemId]);

    if (itemsError || !items || items.length !== 2) {
      return new Response(JSON.stringify({ error: 'Items not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const myItem = items.find(i => i.id === myItemId);
    const theirItem = items.find(i => i.id === theirItemId);

    if (!myItem || !theirItem) {
      return new Response(JSON.stringify({ error: 'Items not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate fairness score
    const myValue = myItem.estimated_value || 0;
    const theirValue = theirItem.estimated_value || 0;
    
    let fairnessScore = 0;
    let fairnessLevel = '';
    let recommendation = '';

    if (myValue === 0 || theirValue === 0) {
      fairnessScore = 50;
      fairnessLevel = 'Unknown';
      recommendation = 'Unable to determine fairness. Please estimate values first.';
    } else {
      const valueDifference = Math.abs(myValue - theirValue);
      const averageValue = (myValue + theirValue) / 2;
      const percentageDifference = (valueDifference / averageValue) * 100;

      if (percentageDifference <= 15) {
        fairnessScore = 100 - percentageDifference;
        fairnessLevel = 'Very Fair';
        recommendation = 'This is an excellent trade! The values are very similar.';
      } else if (percentageDifference <= 30) {
        fairnessScore = 85 - percentageDifference;
        fairnessLevel = 'Fair';
        recommendation = 'This is a reasonable trade. Values are close enough.';
      } else if (percentageDifference <= 50) {
        fairnessScore = 50 - (percentageDifference - 30);
        fairnessLevel = 'Somewhat Unfair';
        recommendation = 'Consider negotiating or adding items to balance the trade.';
      } else {
        fairnessScore = Math.max(0, 20 - (percentageDifference - 50) / 2);
        fairnessLevel = 'Unfair';
        recommendation = 'This trade is significantly imbalanced. Proceed with caution.';
      }
    }

    return new Response(JSON.stringify({
      myItem: {
        title: myItem.title,
        estimatedValue: myValue,
      },
      theirItem: {
        title: theirItem.title,
        estimatedValue: theirValue,
      },
      fairnessScore: Math.round(fairnessScore),
      fairnessLevel,
      recommendation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest-fair-swaps function:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
