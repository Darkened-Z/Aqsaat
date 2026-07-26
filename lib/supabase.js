import { createClient } from '@supabase/supabase-js';

const URL  = 'https://ujxrxbzglcsyppwoazll.supabase.co';
const KEY  = 'sb_publishable_9oAOFAJ8Pn1xoYNFSLBSKw_h7aOb9P_';

export const supabase = createClient(URL, KEY);
export const SHOP_ID  = 'aqsat-main';
