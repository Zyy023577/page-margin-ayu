export interface StreamResult{answer:string;type:string;isSpeculation:boolean;relatedQuote:string;demo?:boolean;}

export async function consumeAiStream(body:ReadableStream<Uint8Array>,handlers:{onDelta:(text:string)=>void;signal?:AbortSignal}){
  const reader=body.getReader();const decoder=new TextDecoder();let buffer='';let result:StreamResult|undefined;
  try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const event=block.match(/^event:\s*(.+)$/m)?.[1];const raw=block.match(/^data:\s*(.+)$/m)?.[1];if(!event||!raw)continue;const data=JSON.parse(raw);if(event==='delta')handlers.onDelta(data.text||'');if(event==='done')result=data;if(event==='error')throw new Error(data.error||'生成失败');}if(handlers.signal?.aborted)throw handlers.signal.reason||new DOMException('Aborted','AbortError');}}finally{reader.releaseLock();}
  if(!result)throw new Error('回答流意外中断，请重试。');return result;
}
