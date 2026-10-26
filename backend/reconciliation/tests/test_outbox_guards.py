import importlib.util,json,queue,time,sys
from pathlib import Path
from types import SimpleNamespace as NS
import pytest
from hermes_constants import set_hermes_home_override,reset_hermes_home_override
from tools import async_delegation as ad
from gateway import status

@pytest.fixture(autouse=True)
def home(tmp_path,monkeypatch):
 p=tmp_path/'home';p.mkdir();token=set_hermes_home_override(str(p));ad._reset_for_tests()
 monkeypatch.setattr(ad,'dispatch_async_delegation',lambda **kw:pytest.fail('Recovery must not rerun children/tools'))
 yield p
 ad._reset_for_tests();reset_hermes_home_override(token)

def row(d='d'):
 with ad._connect() as c:
  c.row_factory=__import__('sqlite3').Row
  return dict(c.execute('select * from async_delegations where delegation_id=?',(d,)).fetchone())
def make(d='d',goals=None):
 ad._persist_dispatch({'delegation_id':d,'session_key':'s','parent_session_id':'p','dispatched_at':time.time(),'is_batch':True,'goals':goals or ['a','b']})
def owner(monkeypatch,exists=True,current=1000,recorded=1000):
 monkeypatch.setattr(status,'_pid_exists',lambda pid:exists)
 monkeypatch.setattr(status,'get_process_start_time',lambda pid:current)
 with ad._transaction() as c:c.execute('update async_delegations set owner_pid=99,owner_started_at=?',(recorded,))
def complete():
 evt={'type':'async_delegation','delegation_id':'d','status':'completed','completed_at':time.time(),'session_key':'s','parent_session_id':'p'}
 ad._persist_completion(evt,{'results':[{'task_index':0,'status':'completed','summary':'done'}]})

def test_missing_current_probe_regression(monkeypatch):
 monkeypatch.setattr(status,'_pid_exists',lambda pid:True);monkeypatch.setattr(status,'get_process_start_time',lambda pid:None)
 assert ad._owner_liveness()(99,1000) is True

@pytest.mark.parametrize('recorded,current',[(1000,1000),(None,1000),(1000,None),(None,None)])
def test_live_or_uncertain_owner_and_partial_batch_are_preserved(monkeypatch,recorded,current):
 make();ad.record_unit_child('d',{'task_index':0,'status':'completed','summary':'first done'})
 owner(monkeypatch,current=current,recorded=recorded)
 assert ad.recover_abandoned_delegations()==0
 r=row();assert r['state']=='running';assert json.loads(r['result_json'])['partial'] is True
 assert len(json.loads(r['result_json'])['results'])==1

@pytest.mark.parametrize('exists,current',[(False,None),(True,999999)])
def test_confirmed_exit_or_pid_reuse_recovers_without_replay(monkeypatch,exists,current):
 make();ad.record_unit_child('d',{'task_index':0,'status':'completed','summary':'first done'})
 owner(monkeypatch,exists=exists,current=current)
 assert ad.recover_abandoned_delegations()==1
 r=row();assert r['state']=='unknown'
 results=json.loads(r['result_json'])['results'];assert results[0]['status']=='completed';assert results[1]['status']=='unknown'

def test_terminal_unsent_is_reoffered_and_claimed_once():
 make(goals=['a']);complete();q=queue.Queue()
 assert ad.restore_undelivered_completions(q)==1
 evt=q.get_nowait();claim=ad.claim_event_delivery(evt,'one');assert claim
 assert ad.claim_event_delivery(evt,'two') is None
 assert not ad.complete_completion_delivery('d','wrong-claim')
 assert ad.complete_completion_delivery('d',claim)
 assert not ad.complete_completion_delivery('d',claim)
 assert row()['delivery_state']=='delivered'

def test_failed_delivery_retry_budget_converges_without_tool_replay(monkeypatch):
 make(goals=['a']);complete();monkeypatch.setattr(ad,'_MAX_DELIVERY_ATTEMPTS',2)
 for claim in ['one','two']:
  assert ad.claim_completion_delivery('d',claim);assert ad.release_completion_delivery('d',claim)
 assert row()['delivery_state']=='dropped';assert not ad.claim_completion_delivery('d','three')

def test_explicit_groups_stay_together_and_ungrouped_split(monkeypatch):
 from tools import delegate_tool_config as cfg
 from tools.delegate_tool_dispatch import _Batch,_units_of
 import inspect
 tasks=[{'goal':'a','group':'g'},{'goal':'b','group':'g'},{'goal':'c'}]
 values={name:None for name,p in inspect.signature(_Batch).parameters.items() if p.default is inspect.Parameter.empty}
 values.update(task_list=tasks,children=[(i,t,NS()) for i,t in enumerate(tasks)])
 batch=_Batch(**values)
 monkeypatch.setattr(cfg,'_get_independent_completions',lambda:True)
 assert [len(x.children) for x in _units_of(batch)]==[2,1]
 monkeypatch.setattr(cfg,'_get_independent_completions',lambda:False)
 assert _units_of(batch)==[batch]
