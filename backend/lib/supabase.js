const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔗 SUPABASE_URL:', process.env.SUPABASE_URL);

const supabase = createClient(
    process.env.SUPABASE_URL.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
);

module.exports = supabase;