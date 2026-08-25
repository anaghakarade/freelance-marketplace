import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const paymentService = {
  /**
   * Creates a payment intent for an order
   * @param {string} orderId
   * @param {number} amount
   * @param {string} currency
   * @returns {Promise<{ clientSecret: string, paymentId: string }>}
   */
  createPaymentIntent: async (orderId, amount, currency = 'usd') => {
    if (isSupabaseConfigured && supabase) {
      // Proxy request through backend Edge Function
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { orderId, amount, currency },
      });
      if (!error && data) return data;
    }

    // Mock payment response for development
    return {
      clientSecret: `mock_pi_secret_${Date.now()}`,
      paymentId: `pay_${Date.now()}`,
      status: 'requires_payment_method',
      amount,
      currency,
    };
  },

  handlePaymentSuccess: async (orderId, paymentIntentId) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'succeeded', stripe_payment_intent_id: paymentIntentId })
        .eq('order_id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return { orderId, status: 'succeeded' };
  },

  handlePaymentFailure: async (orderId, errorMessage) => {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('order_id', orderId);
    }
    return { orderId, status: 'failed', error: errorMessage };
  },
};

export default paymentService;
