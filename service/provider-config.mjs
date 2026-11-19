/** Server-only provider routing. A configured endpoint is not deployment evidence. */
export function resolveProviderConfiguration(env=process.env){
 const provider=env.AI_PROVIDER||(env.AZURE_OPENAI_ENDPOINT?'azure':'openai');
 if(!['openai','azure'].includes(provider))throw new Error('AI_PROVIDER must be azure or openai.');
 if(provider==='openai'){
  return {provider,url:'https://api.openai.com/v1/responses',model:env.OPENAI_MODEL||'gpt-4.1-mini',configured:!!env.OPENAI_API_KEY,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(env.OPENAI_API_KEY||'')}};
 }
 const model=env.AZURE_OPENAI_DEPLOYMENT||'';
 if(!env.AZURE_OPENAI_ENDPOINT)return {provider,url:null,model,configured:false,headers:{}};
 let endpoint;try{endpoint=new URL(env.AZURE_OPENAI_ENDPOINT);}catch{throw new Error('AZURE_OPENAI_ENDPOINT must be a valid Azure HTTPS resource address.');}
 const host=endpoint.hostname.toLowerCase();
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!['.openai.azure.com','.services.ai.azure.com','.cognitiveservices.azure.com'].some(suffix=>host.endsWith(suffix))){
  throw new Error('Use an Azure HTTPS resource endpoint without embedded credentials or query parameters.');
 }
 const resourcePath=endpoint.pathname.replace(/\/$/,'');
 if(!['','/openai/v1'].includes(resourcePath))throw new Error('Use the Azure resource origin or its /openai/v1 base URL.');
 endpoint.pathname='/openai/v1/responses';
 const headers={'Content-Type':'application/json'};
 if(env.AZURE_OPENAI_AUTH_TOKEN)headers.Authorization='Bearer '+env.AZURE_OPENAI_AUTH_TOKEN;
 else if(env.AZURE_OPENAI_API_KEY)headers['api-key']=env.AZURE_OPENAI_API_KEY;
 return {provider,url:endpoint.href,model,configured:!!model&&!!(env.AZURE_OPENAI_AUTH_TOKEN||env.AZURE_OPENAI_API_KEY),headers};
}
