import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createHash } from "https://deno.land/std@0.168.0/hash/mod.ts";

serve(async (req) => {
  try {
    const payload = await req.json();
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    
    if (!serverKey) throw new Error('Midtrans Server Key not configured');

    // 1. Verifikasi Signature Key untuk memastikan ini benar-benar dari Midtrans
    const { order_id, status_code, gross_amount, signature_key, transaction_status, custom_field1 } = payload;
    
    const hash = createHash("sha512");
    hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
    const expectedSignature = hash.toString();

    if (signature_key !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // 2. Jika sukses bayar (settlement / capture)
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const orgId = custom_field1;
      
      // Update DB menggunakan Service Role Key (karena ini backend)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Hitung tanggal kedaluwarsa (+30 hari)
      const newExp = new Date();
      newExp.setDate(newExp.getDate() + 30);

      const { error } = await supabaseAdmin
        .from('organizations')
        .update({ 
          plan: 'premium', 
          plan_expires_at: newExp.toISOString() 
        })
        .eq('id', orgId);

      if (error) throw error;
      
      console.log(`Successfully upgraded org: ${orgId} to premium until ${newExp}`);
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
