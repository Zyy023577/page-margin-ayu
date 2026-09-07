import { rateLimit } from 'express-rate-limit';

export function createApiLimiter(env=process.env){return rateLimit({windowMs:positive(env.RATE_LIMIT_WINDOW_MS,60_000),limit:positive(env.RATE_LIMIT_MAX,20),standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>res.status(429).json({error:'请求太频繁，请稍后再试。'})});}
export function requestErrorHandler(error,_req,res,next){if(error?.type==='entity.too.large')return res.status(413).json({error:'请求正文过长。'});if(error instanceof SyntaxError)return res.status(400).json({error:'JSON 请求格式无效。'});next(error);}

export function createOriginChecker(env=process.env){const configured=String(env.ALLOWED_ORIGINS||'').split(',').map(value=>value.trim().replace(/\/$/,'')).filter(Boolean);const development=env.NODE_ENV!=='production';const desktop=env.DESKTOP_APP==='1';return origin=>{if(!origin)return true;const normalized=origin.replace(/\/$/,'');if(configured.includes(normalized))return true;if((development||desktop)&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized))return true;return false;};}

export class DailyBudget{
  constructor({callLimit=200,costLimitUsd=5,inputCostPerMillion=.75,outputCostPerMillion=4.5}={}){this.callLimit=callLimit;this.costLimitUsd=costLimitUsd;this.inputCostPerMillion=inputCostPerMillion;this.outputCostPerMillion=outputCostPerMillion;this.day='';this.calls=0;this.costUsd=0;}
  estimate(input,maxOutputTokens=700){const inputTokens=Math.ceil(JSON.stringify(input).length/2);return(inputTokens*this.inputCostPerMillion+maxOutputTokens*this.outputCostPerMillion)/1_000_000;}
  reserve(estimatedCostUsd){this.rollover();if(this.calls>=this.callLimit)return{ok:false,error:'今日 AI 调用次数已达到上限。'};if(this.costUsd+estimatedCostUsd>this.costLimitUsd)return{ok:false,error:'今日 AI 预算已达到上限。'};this.calls+=1;this.costUsd+=estimatedCostUsd;let settled=false;return{ok:true,settle:(actualCostUsd)=>{if(settled)return;settled=true;if(Number.isFinite(actualCostUsd))this.costUsd=Math.max(0,this.costUsd-estimatedCostUsd+actualCostUsd);}};}
  snapshot(){this.rollover();return{day:this.day,calls:this.calls,callLimit:this.callLimit,costUsd:this.costUsd,costLimitUsd:this.costLimitUsd};}
  rollover(){const day=new Date().toISOString().slice(0,10);if(day!==this.day){this.day=day;this.calls=0;this.costUsd=0;}}
}

export function createDailyBudget(env=process.env){return new DailyBudget({callLimit:positive(env.DAILY_AI_CALL_LIMIT,200),costLimitUsd:positive(env.DAILY_AI_COST_LIMIT_USD,5),inputCostPerMillion:positive(env.AI_INPUT_COST_PER_MILLION,.75),outputCostPerMillion:positive(env.AI_OUTPUT_COST_PER_MILLION,4.5)});}
function positive(value,fallback){const number=Number(value);return Number.isFinite(number)&&number>0?number:fallback;}
