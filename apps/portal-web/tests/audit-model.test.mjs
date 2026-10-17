import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditTimeToIso,localAuditTime,appliedAuditParams,draftFromParams} from '../app/features/security/audit-model.ts';
test('audit dates preserve Brasilia wall time across server and browser zones',()=>{
  assert.equal(auditTimeToIso('2026-10-16T21:15:30'),'2026-10-17T00:15:30.000Z');
  assert.equal(localAuditTime('2026-10-17T00:15:30.000Z'),'2026-10-16T21:15:30');
  assert.equal(auditTimeToIso(''), '');assert.throws(()=>auditTimeToIso('invalid'));
});
test('paging and exports retain applied filters and the cutoff instead of draft fields',()=>{
  const filters={query:'João + ops',outcome:'DENIED',eventType:'authorization.decision',actor:'subject',target:'budget',providerId:'local',traceId:'trace',eventId:'',since:'2026-10-01T00:00:00Z',until:'2026-10-17T00:00:00Z',snapshotAt:'2026-10-17T00:00:00Z',sort:'eventType',direction:'asc'};
  const params=appliedAuditParams(filters,25,50);
  assert.equal(params.get('query'),'João + ops');assert.equal(params.get('snapshotAt'),filters.snapshotAt);
  assert.equal(params.get('offset'),'50');assert.equal(draftFromParams(params).since,'2026-09-30T21:00:00');
});
