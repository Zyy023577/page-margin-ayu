declare module '../serverValidation.mjs'{
  export function validateAiRequest(body:unknown):{ok:true;value:Record<string,unknown>}|{ok:false;error:string};
}
