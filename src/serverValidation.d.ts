declare module '../serverValidation.mjs'{
  export function validateAiRequest(body:unknown):{ok:true;value:Record<string,unknown>}|{ok:false;error:string};
  export function validateMemoryRequest(body:unknown):{ok:true;value:Record<string,unknown>}|{ok:false;error:string};
  export function normalizeMemoryResponse(body:unknown):Record<string,string[]>;
}
