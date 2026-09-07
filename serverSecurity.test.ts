import express from 'express';
import request from 'supertest';
import { describe,expect,it } from 'vitest';
import { DailyBudget,createApiLimiter,createOriginChecker,requestErrorHandler } from './serverSecurity.mjs';

describe('server security',()=>{
  it('allows configured origins and rejects unknown sites',()=>{const allowed=createOriginChecker({NODE_ENV:'production',ALLOWED_ORIGINS:'https://reader.example.com'});expect(allowed('https://reader.example.com')).toBe(true);expect(allowed('https://evil.example')).toBe(false);expect(allowed(undefined)).toBe(true);});
  it('allows the local origin used by the packaged desktop app',()=>{const allowed=createOriginChecker({NODE_ENV:'production',DESKTOP_APP:'1'});expect(allowed('http://127.0.0.1:43127')).toBe(true);expect(allowed('http://localhost:43127')).toBe(true);expect(allowed('https://evil.example')).toBe(false);});
  it('rate limits high-frequency requests',async()=>{const app=express();app.use(createApiLimiter({RATE_LIMIT_MAX:'2',RATE_LIMIT_WINDOW_MS:'60000'}));app.post('/api',(_req,res)=>res.json({ok:true}));expect((await request(app).post('/api')).status).toBe(200);expect((await request(app).post('/api')).status).toBe(200);expect((await request(app).post('/api')).status).toBe(429);});
  it('rejects an oversized JSON body with a safe 413 response',async()=>{const app=express();app.use(express.json({limit:'100b'}));app.use(requestErrorHandler);app.post('/api',(_req,res)=>res.json({ok:true}));const response=await request(app).post('/api').send({chapterReadText:'x'.repeat(500)});expect(response.status).toBe(413);expect(response.body.error).toContain('过长');});
  it('enforces daily call and cost caps',()=>{const calls=new DailyBudget({callLimit:1,costLimitUsd:1});expect(calls.reserve(.2).ok).toBe(true);expect(calls.reserve(.2)).toMatchObject({ok:false});const cost=new DailyBudget({callLimit:10,costLimitUsd:.1});expect(cost.reserve(.2)).toMatchObject({ok:false});});
  it('estimates a positive upper-bound cost without retaining request text',()=>{const budget=new DailyBudget();expect(budget.estimate({chapterReadText:'小说正文'})).toBeGreaterThan(0);expect(budget).not.toHaveProperty('requests');});
});
