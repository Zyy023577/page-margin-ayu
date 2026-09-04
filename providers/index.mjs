import { CompatibleProvider } from './CompatibleProvider.mjs';
import { DemoProvider } from './DemoProvider.mjs';
import { OpenAIProvider } from './OpenAIProvider.mjs';

export function createProvider(env=process.env,forceDemo=false){const requested=(env.AI_PROVIDER||'').toLowerCase();if(forceDemo||requested==='demo'||(!env.OPENAI_API_KEY&&!env.AI_API_KEY))return new DemoProvider();if(requested==='compatible'||env.AI_BASE_URL)return new CompatibleProvider({apiKey:env.AI_API_KEY||env.OPENAI_API_KEY,model:env.AI_MODEL||'gpt-4o-mini',baseUrl:env.AI_BASE_URL||'https://api.openai.com/v1'});return new OpenAIProvider({apiKey:env.OPENAI_API_KEY||env.AI_API_KEY,model:env.AI_MODEL||'gpt-5.4-mini',baseUrl:env.OPENAI_BASE_URL||'https://api.openai.com/v1'});}
