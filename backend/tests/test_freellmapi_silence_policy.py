import json,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from types import SimpleNamespace as NS
import pytest
import run_agent
from agent import chat_completion_helpers as h

def agent(url='http://127.0.0.1:1/v1',provider='freellmapi'):
 a=run_agent.AIAgent(api_key='test-key',base_url=url,model='m',provider='custom',quiet_mode=True,skip_context_files=True,skip_memory=True,enabled_toolsets=[],max_iterations=1)
 a.provider=provider
 return a

def chunk(content=None,**kw):return NS(choices=[NS(delta=NS(content=content,**kw),finish_reason=None)])

def test_default_hard_policy_and_other_provider_unchanged(monkeypatch):
 monkeypatch.setattr(h,'get_provider_stale_timeout',lambda *a:None)
 a=agent();call=h._StreamingCall(a,{'model':'m','messages':[]},None);call._resolve_stale_timeout()
 assert call._stream_stale_timeout==30;assert call._stream_timeouts()==(30,30,30)
 assert h._freellmapi_silence_timeout(agent(provider='openai-codex')) is None

def test_phase_telemetry_reaches_parent_wire_payload(monkeypatch):
 from tools.delegate_tool_progress import _build_child_progress_callback
 from tui_gateway import tool_progress as gateway
 from tui_gateway.contracts.events import SubagentEventPayload
 received=[]
 parent=NS(tool_progress_callback=lambda event,*args,**kwargs:received.append((event,kwargs)))
 relay=_build_child_progress_callback(0,'work',parent,subagent_id='sa',session_ref={'session_id':'child'})
 a=NS(tool_progress_callback=relay)
 h._set_provider_phase(a,'waiting_provider',30)
 assert len(received)==1
 event,kw=received[0];assert event=='subagent.progress';assert kw['child_session_id']=='child'
 frames=[]
 monkeypatch.setattr(gateway,'_emit',lambda event,sid,payload:frames.append(payload),raising=False)
 monkeypatch.setattr(gateway,'_sessions',{},raising=False)
 gateway._progress_subagent('parent',None,None,kw,event)
 payload=SubagentEventPayload(**frames[0]);assert payload.activity_phase=='waiting_provider';assert payload.wait_timeout_seconds==30
 assert payload.activity_since>0

def test_empty_role_usage_are_not_useful():
 for c in [NS(choices=[]),chunk(''),chunk(None,role='assistant')]:assert not h._useful_provider_chunk(c)
 assert h._useful_provider_chunk(chunk('hello'))
 assert h._useful_provider_chunk(chunk(None,reasoning_content='reasoning'))
 assert h._useful_provider_chunk(chunk(None,tool_calls=[NS(id=None,function=NS(name=None,arguments='{}'))]))

def test_empty_chunk_does_not_refresh_deadline(monkeypatch):
 a=agent();call=h._StreamingCall(a,{'model':'m'},None);call._resolve_stale_timeout();before=call._useful_progress_monotonic
 call._count_chunk({},chunk(None,role='assistant'));assert call._useful_progress_monotonic==before
 call._count_chunk({},chunk('a'));assert call._useful_progress_monotonic>=before;assert a._provider_activity_phase=='streaming'

class Wire:
 def __init__(self,mode):
  self.count=0;self.release=threading.Event();wire=self
  class Handler(BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*a):pass
   def do_POST(self):
    self.rfile.read(int(self.headers.get('content-length',0)));wire.count+=1
    if mode=='headers':wire.release.wait(2);return
    self.send_response(200);self.send_header('content-type','text/event-stream');self.end_headers()
    try:
     for i in range(24 if mode!='healthy' else 10):
      if mode=='silent':wire.release.wait(2);return
      if mode=='pings':self.wfile.write(b': heartbeat\n\n')
      else:
       delta={'role':'assistant'} if mode=='empty' else {'content':'x'}
       data={'id':'x','object':'chat.completion.chunk','created':1,'model':'m','choices':[{'index':0,'delta':delta,'finish_reason':None}]}
       self.wfile.write(('data: '+json.dumps(data)+'\n\n').encode())
      self.wfile.flush();time.sleep(.08)
     finish={'id':'x','object':'chat.completion.chunk','created':1,'model':'m','choices':[{'index':0,'delta':{},'finish_reason':'stop'}]}
     self.wfile.write(('data: '+json.dumps(finish)+'\n\ndata: [DONE]\n\n').encode());self.wfile.flush()
    except (OSError,ValueError):pass
  self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);self.server.daemon_threads=True
  self.thread=threading.Thread(target=lambda:self.server.serve_forever(poll_interval=.01),daemon=True);self.thread.start()
  self.url=f'http://127.0.0.1:{self.server.server_address[1]}/v1'
 def close(self):self.release.set();self.server.shutdown();self.server.server_close()

@pytest.mark.parametrize('mode',['headers','silent','pings','empty'])
def test_real_sse_silence_is_cancelled_without_retry(mode,monkeypatch):
 monkeypatch.setattr(h,'get_provider_stale_timeout',lambda *a:.35)
 wire=Wire(mode)
 try:
  a=agent(wire.url);a._is_delegated_child=True;wire.count=0
  start=time.monotonic()
  with pytest.raises(TimeoutError,match='FreeLLMAPI'):
   h.interruptible_streaming_api_call(a,{'model':'m','messages':[{'role':'user','content':'hi'}]})
  elapsed=time.monotonic()-start
  assert elapsed<1.8,elapsed
  assert wire.count==1,'same route must not silently retry stale calls'
 finally:wire.close()

def test_healthy_real_sse_can_run_longer_than_silence_budget(monkeypatch):
 monkeypatch.setattr(h,'get_provider_stale_timeout',lambda *a:.35)
 wire=Wire('healthy')
 try:
  a=agent(wire.url);wire.count=0;start=time.monotonic()
  response=h.interruptible_streaming_api_call(a,{'model':'m','messages':[{'role':'user','content':'hi'}]})
  assert response.choices[0].message.content=='x'*10
  assert time.monotonic()-start>.35
  assert wire.count==1
 finally:wire.close()
