import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proxyIdentity} from '../app/features/security/identity-proxy.server.ts';
import {identityResponse} from '../app/features/security/identity-client.ts';
test('audit export preserves binary bytes and evidence headers through the restricted proxy',async t=>{
  const bytes=new Uint8Array([80,75,3,4,0,255]);let upstream;
  t.mock.method(globalThis,'fetch',async(url,init)=>{upstream={url,init};return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="auditoria-test.xlsx"','X-Audit-Export-Id':'id','X-Audit-Dataset-SHA256':'hash','X-Audit-Record-Count':'73'}});});
  const response=await proxyIdentity(new Request('http://portal.test/api/identity/api/v1/security/audit/export?outcome=DENIED&sort=eventType&direction=asc',{method:'POST',headers:{Origin:'http://portal.test','X-CSRF-TOKEN':'csrf',Cookie:'OBS_SESSION=session'},body:'{"format":"xlsx","purpose":"Validação autorizada"}'}),'api/v1/security/audit/export','http://identity.test');
  assert.equal(upstream.url.search,'?outcome=DENIED&sort=eventType&direction=asc');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);assert.equal(response.headers.get('X-Audit-Record-Count'),'73');assert.match(response.headers.get('Content-Disposition'),/xlsx/);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('binary identity requests retain CSRF handling without attempting JSON decoding',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?Response.json({headerName:'X-CSRF-TOKEN',token:'csrf'}):new Response('%PDF-1.7',{headers:{'Content-Type':'application/pdf'}}));
  const file=await identityResponse('/security/audit/export','POST',{format:'pdf',purpose:'Controle autorizado'});
  assert.equal(await file.text(),'%PDF-1.7');assert.equal(calls,2);
});
