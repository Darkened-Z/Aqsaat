import { createClient } from '@supabase/supabase-js';

const URL  = 'https://ujxrxbzglcsyppwoazll.supabase.co';
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeHJ4YnpnbGNzeXBwd29hemxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNDk2MDksImV4cCI6MjEwMDYyNTYwOX0.8H0E_mBRIhI3x2t1a5bQeAYXQLqMfxISqHo0sfaFGWU';

export const supabase = createClient(URL, KEY);
export const SHOP_ID  = 'aqsat-main';
