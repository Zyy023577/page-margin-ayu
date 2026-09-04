import { AIProvider } from './AIProvider.mjs';
import { buildReplyPrompt } from './prompts.mjs';
import { StructuredReplyParser } from './StructuredReplyParser.mjs';

export class CompatibleProvider extends AIProvider{
  constructor({apiKey,model,baseUrl}){super('compatible');this.apiKey=apiKey;this.model=model;this.baseUrl=baseUrl.replace(/\/$/,'');}
  async *streamReply(input,{signal}={}){const prompt=buildReplyPrompt(input);const response=await fetch(`${this.baseUrl}/chat/completions`,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({model:this.model,messages:[{role:'system',content:prompt.instructions},{role:'user',content:prompt.input}],stream:true,temperature:.75,max_tokens:700})});if(!response.ok)throw new Error(`兼容服务返回 ${response.status}`);if(!response.body)throw new Error('兼容服务没有返回流');const parser=new StructuredReplyParser();for await(const data of readSse(response.body)){if(data==='[DONE]')break;let event;try{event=JSON.parse(data);}catch{continue;}const token=event.choices?.[0]?.delta?.content;if(token){const delta=parser.push(token);if(delta)yield{type:'delta',text:delta};}}yield{type:'result',result:parser.finish()};}
}

async function* readSse(body){const reader=body.getReader();const decoder=new TextDecoder();let buffer='';try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);for(const line of block.split('\n'))if(line.startsWith('data:'))yield line.slice(5).trim();}}}finally{reader.releaseLock();}}
