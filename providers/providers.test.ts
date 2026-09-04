import { afterEach,describe,expect,it,vi } from 'vitest';
import { CompatibleProvider } from './CompatibleProvider.mjs';
import { DemoProvider } from './DemoProvider.mjs';
import { OpenAIProvider } from './OpenAIProvider.mjs';
import { StructuredReplyParser } from './StructuredReplyParser.mjs';
import { createProvider } from './index.mjs';
import { STYLE_PROMPTS } from './prompts.mjs';

afterEach(()=>vi.restoreAllMocks());

describe('AI provider selection',()=>{
  it('selects demo without a server key',()=>expect(createProvider({})).toBeInstanceOf(DemoProvider));
  it('selects OpenAI for an OpenAI key and compatible for a custom base URL',()=>{expect(createProvider({OPENAI_API_KEY:'test'})).toBeInstanceOf(OpenAIProvider);expect(createProvider({AI_API_KEY:'test',AI_BASE_URL:'https://example.test/v1'})).toBeInstanceOf(CompatibleProvider);});
  it('can explicitly fall back to demo mode',()=>expect(createProvider({OPENAI_API_KEY:'test'},true)).toBeInstanceOf(DemoProvider));
});

describe('structured streaming replies',()=>{
  it('streams the answer field while retaining JSON metadata',()=>{const parser=new StructuredReplyParser();expect(parser.push('{"answer":"逐字')).toBe('逐字');expect(parser.push('显示","type":"literary","isSpeculation":false,"relatedQuote":"原文"}')).toBe('显示');expect(parser.finish()).toEqual({answer:'逐字显示',type:'literary',isSpeculation:false,relatedQuote:'原文'});});
  it('supports the compatible-provider text protocol',()=>{const parser=new StructuredReplyParser();expect(parser.push('TYPE: character\nSPECULATION: true\nQUOTE: 一句话\nANSWER:\n人物')).toBe('人物');expect(parser.push('在犹豫')).toBe('在犹豫');expect(parser.finish()).toMatchObject({answer:'人物在犹豫',type:'character',isSpeculation:true,relatedQuote:'一句话'});});
  it('defines four distinct companion styles',()=>expect(new Set(Object.values(STYLE_PROMPTS)).size).toBe(4));
  it('uses OpenAI Responses streaming with a strict JSON schema',async()=>{const encoder=new TextEncoder();const sse='data: {"type":"response.output_text.delta","delta":"{\\"answer\\":\\"你好\\",\\"type\\":\\"insight\\",\\"isSpeculation\\":false,\\"relatedQuote\\":\\"原文\\"}"}\n\ndata: [DONE]\n\n';const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new ReadableStream({start(controller){controller.enqueue(encoder.encode(sse));controller.close();}}),{status:200}));const events=[];for await(const event of new OpenAIProvider({apiKey:'test',model:'gpt-5.4-mini'}).streamReply({action:'ask',style:'quiet',noSpoilers:true,selectedText:'原文',selectionBefore:'',selectionAfter:'',chapterReadText:'原文',previousMemory:'',notes:[],recentAnnotations:[]}))events.push(event);const request=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses');expect(request).toMatchObject({stream:true,store:false,text:{format:{type:'json_schema',strict:true}}});expect(events.at(-1)?.result).toMatchObject({answer:'你好',type:'insight'});});
});
