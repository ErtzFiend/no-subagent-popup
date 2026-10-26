import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { formatSubagentStatus } from './subagent-status'
import { useSubagentStatusClock } from './use-subagent-status-clock'
import { $subagentsBySession, upsertSubagent } from '@/store/subagents'

beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(1_000_000);$subagentsBySession.set({})})
afterEach(()=>{cleanup();vi.useRealTimers()})
const waiting={status:'running',activityPhase:'waiting_provider' as const,activitySince:995,updatedAt:1_000_000,waitTimeoutSeconds:30}
function Status({active=true}:{active?:boolean}){return <span>{formatSubagentStatus(waiting,useSubagentStatusClock(active))}</span>}
describe('truthful child status and one shared clock',()=>{
 it('ticks elapsed provider wait without an incoming store event',()=>{
  render(<Status/>);expect(screen.getByText('waiting on provider · 5s / 30s')).toBeTruthy()
  act(()=>vi.advanceTimersByTime(3000));expect(screen.getByText('waiting on provider · 8s / 30s')).toBeTruthy()
 })
 it('shares a timer and cleans it up after all live views leave',()=>{
  const a=render(<Status/>);const b=render(<Status/>);expect(vi.getTimerCount()).toBe(1)
  a.unmount();expect(vi.getTimerCount()).toBe(1);b.unmount();expect(vi.getTimerCount()).toBe(0)
 })
 it('does not start timers for inactive views',()=>{render(<Status active={false}/>);expect(vi.getTimerCount()).toBe(0)})
 it('labels overdue waits without inventing terminal failure',()=>{
  expect(formatSubagentStatus(waiting,1030)).toBe('waiting on provider · 35s / 30s · overdue')
 })
 it('does not invent a 30s budget for older or other providers',()=>{
  expect(formatSubagentStatus({...waiting,waitTimeoutSeconds:undefined},1000)).toBe('waiting on provider · 5s')
  expect(formatSubagentStatus({status:'running',updatedAt:1_000_000},1000)).toBe('working')
 })
 it('reports stale updates rather than dead workers',()=>{
  expect(formatSubagentStatus({status:'running',updatedAt:900_000,currentTool:'ssh_exec'},1000)).toBe('working · ssh_exec · last update 100s ago')
 })
 it('terminal and detached states do not claim liveness',()=>{
  expect(formatSubagentStatus({...waiting,status:'completed'},1030)).toBe('completed')
  expect(formatSubagentStatus({status:'dispatched'},1030)).toBe('not currently observed')
 })
 it('parses telemetry and clears a prior route budget when a new phase has none',()=>{
  upsertSubagent('parent',{subagent_id:'sa',goal:'work',status:'running',activity_phase:'waiting_provider',activity_since:995,wait_timeout_seconds:30})
  expect($subagentsBySession.get().parent[0]).toMatchObject({activityPhase:'waiting_provider',activitySince:995,waitTimeoutSeconds:30})
  upsertSubagent('parent',{subagent_id:'sa',activity_phase:'working',activity_since:1000})
  expect($subagentsBySession.get().parent[0].waitTimeoutSeconds).toBeUndefined()
 })
})
