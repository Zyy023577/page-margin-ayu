import { describe,expect,it,vi } from 'vitest';
import { consumeAiStream } from './sse';

describe('AI response stream',()=>{
  it('emits text deltas and returns structured metadata',async()=>{const encoder=new TextEncoder();const stream=new ReadableStream({start(controller){controller.enqueue(encoder.encode('event: delta\ndata: {"text":"逐字"}\n\nevent: delta\ndata: {"text":"显示"}\n\n'));controller.enqueue(encoder.encode('event: done\ndata: {"answer":"逐字显示","type":"insight","isSpeculation":false,"relatedQuote":"原文"}\n\n'));controller.close();}});const onDelta=vi.fn();const result=await consumeAiStream(stream,{onDelta});expect(onDelta.mock.calls.flat()).toEqual(['逐字','显示']);expect(result).toMatchObject({answer:'逐字显示',type:'insight',isSpeculation:false,relatedQuote:'原文'});});
  it('surfaces server stream errors for retry',async()=>{const bytes=new TextEncoder().encode('event: error\ndata: {"error":"上游暂时不可用"}\n\n');const stream=new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}});await expect(consumeAiStream(stream,{onDelta:()=>{}})).rejects.toThrow('上游暂时不可用');});
});
