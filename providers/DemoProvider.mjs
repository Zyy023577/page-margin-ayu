import { AIProvider } from './AIProvider.mjs';

export class DemoProvider extends AIProvider{
  constructor(){super('demo');}
  async *streamReply(input,{signal}={}){const result=demoResult(input);for(const part of result.answer.match(/.{1,7}/gs)||[]){if(signal?.aborted)throw signal.reason||new Error('已取消');yield{type:'delta',text:part};await new Promise(resolve=>setTimeout(resolve,18));}yield{type:'result',result};}
}

function demoResult(input){const quote=input.selectedText.trim().slice(0,80);const seed=[...`${input.action}|${input.style}|${quote}|${input.recentAnnotations?.length||0}`].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,5381);const openings={quiet:['这里值得停一下。','我先不急着替它下结论。','这句在页边轻轻拽了我一下。'],snarky:['嘴上很平静，细节可没答应。','话说得滴水不漏，动作已经招了。','表面没事，句子背地里挺忙。'],literary:['这句的节奏忽然收紧了。','真正的重音藏在句尾。','这里留下了一小块回声。'],emotion:['心里像被轻轻按了一下。','没说出口的情绪更响。','人物在忍，犹豫还是漏出来了。']};const opening=(openings[input.style]||openings.quiet)[seed%3];const bodies={explain:`它表面写的是“${quote}”，更值得留意的是人物没有直接说出口的那一层。`,psychology:'人物像是在维持平静，但动作比话更诚实。这只是读到此处的推测。',discuss:'我最在意的是人物之间那点没说破的变化。你更相信这是靠近，还是一次退让？',ask:'它可能不是答案，更像作者暂时放在桌边的一枚线索。'};return{answer:`${opening}${bodies[input.action]||bodies.ask}`,type:input.action==='psychology'?'character':input.action==='discuss'?'question':'insight',isSpeculation:input.action==='psychology',relatedQuote:quote};}
