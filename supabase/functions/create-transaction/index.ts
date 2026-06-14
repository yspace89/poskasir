import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orgId, planId } = await req.json();

    // Pastikan user sudah login (cek auth header)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate Order ID Unik (orgId + timestamp)
    const orderId = `KASSA-OBS-${orgId.substring(0, 8)}-${Date.now()}`;

    // Payload untuk Midtrans
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: 50000,
      },
      customer_details: {
        first_name: user.email?.split('@')[0] || 'User',
        email: user.email,
      },
      custom_field1: orgId, // Simpan orgId untuk webhook nanti
      custom_field2: planId
    };

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    if (!serverKey) throw new Error('Midtrans Server Key not configured');

    const authString = btoa(`${serverKey}:`);

    // Panggil Midtrans API (Sandbox)
    const midtransRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const midtransData = await midtransRes.json();
    if (!midtransRes.ok) throw new Error(midtransData.error_messages?.[0] || 'Midtrans Error');

    return new Response(JSON.stringify({ token: midtransData.token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
