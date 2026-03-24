import { useEffect, useState } from 'react';
import { useStore, DEPTS, isEdict, stateLabel } from '../store';
import { api, type OfficialInfo } from '../api';

export default function MonitorPanel() {
  const liveStatus = useStore((s) => s.liveStatus);
  const agentsStatusData = useStore((s) => s.agentsStatusData);
  const officialsData = useStore((s) => s.officialsData);
  const loadAgentsStatus = useStore((s) => s.loadAgentsStatus);
  const setModalTaskId = useStore((s) => s.setModalTaskId);
  const toast = useStore((s) => s.toast);
  const [wakingAll, setWakingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgentsStatus();
  }, [loadAgentsStatus]);

  const tasks = liveStatus?.tasks || [];
  const activeTasks = tasks.filter((t) => isEdict(t) && t.state !== 'Done' && t.state !== 'Next');

  // Build official map
  const offMap: Record<string, OfficialInfo> = {};
  if (officialsData?.officials) {
    officialsData.officials.forEach((o) => { offMap[o.id] = o; });
  }

  // Agent wake
  const handleWake = async (agentId: string) => {
    try {
      const r = await api.agentWake(agentId);
      toast(r.message || '唤醒指令已发出');
      setTimeout(() => loadAgentsStatus(), 30000);
    } catch { toast('唤醒失败', 'err'); }
  };

  const handleWakeAll = async () => {
    if (!agentsStatusData) return;
    const toWake = agentsStatusData.agents.filter(
      (a) => a.id !== 'main' && a.status !== 'running' && a.status !== 'unconfigured'
    );
    if (!toWake.length) { toast('所有 Agent 均已在线'); return; }
    setWakingAll(true);
    toast(`正在唤醒 ${toWake.length} 个 Agent...`);
    for (const a of toWake) {
      try { await api.agentWake(a.id); } catch { /* ignore */ }
    }
    toast(`${toWake.length} 个唤醒指令已发出，30秒后刷新状态`);
    setTimeout(() => { loadAgentsStatus(); setWakingAll(false); }, 30000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAgentsStatus();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Agent Status Panel
  const asData = agentsStatusData;
  const filtered = asData?.agents?.filter((a) => a.id !== 'main') || [];
  const running = filtered.filter((a) => a.status === 'running').length;
  const idle = filtered.filter((a) => a.status === 'idle').length;
  const offline = filtered.filter((a) => a.status === 'offline').length;
  const unconf = filtered.filter((a) => a.status === 'unconfigured').length;
  const gw = asData?.gateway;
  const gwCls = gw?.probe ? 'ok' : gw?.alive ? 'warn' : 'err';

  // Dept stats
  const busyDepts = DEPTS.filter((d) => activeTasks.some((t) => t.org === d.label && t.state === 'Doing')).length;
  const blockedDepts = DEPTS.filter((d) => activeTasks.some((t) => t.org === d.label && t.state === 'Blocked')).length;

  return (
    <div>
      {/* 部门调度摘要 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
          background: 'rgba(106,158,255,.04)', border: '1px solid rgba(106,158,255,.12)',
          borderRadius: 12, marginBottom: 16, flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>⚡ 调度概览</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6a9eff' }} />
          <span style={{ color: 'var(--muted)' }}>活跃需求</span>
          <b style={{ color: '#6a9eff' }}>{activeTasks.length}</b>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5c842' }} />
          <span style={{ color: 'var(--muted)' }}>执行部门</span>
          <b style={{ color: '#f5c842' }}>{busyDepts}</b>
        </span>
        {blockedDepts > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5270' }} />
            <span style={{ color: 'var(--muted)' }}>阻塞部门</span>
            <b style={{ color: '#ff5270' }}>{blockedDepts}</b>
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          Agent 在线 {running}/{filtered.length}
        </span>
      </div>

      {/* Agent Status Panel */}
      {asData && asData.ok && (
        <div className="as-panel">
          <div className="as-header">
            <span className="as-title">🔌 Agent 在线状态</span>
            <span className={`as-gw ${gwCls}`}>Gateway: {gw?.status || '未知'}</span>
            <button
              className="as-refresh"
              onClick={handleRefresh}
              style={{ opacity: refreshing ? 0.5 : 1 }}
            >
              {refreshing ? '⏳ 刷新中...' : '🔄 刷新'}
            </button>
            {(offline + idle > 0) && (
              <button
                className="as-wake-all"
                onClick={handleWakeAll}
                disabled={wakingAll}
                style={{ opacity: wakingAll ? 0.5 : 1 }}
              >
                {wakingAll ? '⏳ 唤醒中...' : '⚡ 全部唤醒'}
              </button>
            )}
          </div>
          <div className="as-grid">
            {filtered.map((a) => {
              const canWake = a.status !== 'running' && a.status !== 'unconfigured' && gw?.alive;
              return (
                <div key={a.id} className="as-card" title={`${a.role} · ${a.statusLabel}`}>
                  <div className={`as-dot ${a.status}`} />
                  <div className="as-emoji">{a.emoji}</div>
                  <div className="as-label">{a.label}</div>
                  <div className="as-role">{a.role}</div>
                  <div className="as-status" style={{
                    color: a.status === 'running' ? 'var(--ok)' : a.status === 'offline' ? 'var(--danger)' : 'var(--muted)'
                  }}>
                    {a.statusLabel}
                  </div>
                  <div className="as-time">
                    {a.lastActive ? `⏰ ${a.lastActive}` : '无活动记录'}
                  </div>
                  {canWake && (
                    <button className="as-wake-btn" onClick={(e) => { e.stopPropagation(); handleWake(a.id); }}>
                      ⚡ 唤醒
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="as-summary">
            <span><span className="as-dot running" style={{ position: 'static', display: 'inline-block', width: 8, height: 8 }} /> {running} 运行中</span>
            <span><span className="as-dot idle" style={{ position: 'static', display: 'inline-block', width: 8, height: 8 }} /> {idle} 待命</span>
            {offline > 0 && <span><span className="as-dot offline" style={{ position: 'static', display: 'inline-block', width: 8, height: 8 }} /> {offline} 离线</span>}
            {unconf > 0 && <span><span className="as-dot unconfigured" style={{ position: 'static', display: 'inline-block', width: 8, height: 8 }} /> {unconf} 未配置</span>}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>
              检测于 {(asData.checkedAt || '').substring(11, 19)}
            </span>
          </div>
        </div>
      )}

      {/* Duty Grid */}
      <div className="duty-grid">
        {DEPTS.map((d) => {
          const myTasks = activeTasks.filter((t) => t.org === d.label);
          const isActive = myTasks.some((t) => t.state === 'Doing');
          const isBlocked = myTasks.some((t) => t.state === 'Blocked');
          const off = offMap[d.id];
          const hb = off?.heartbeat || { status: 'idle', label: '⚪' };
          const dotCls = isBlocked ? 'blocked' : isActive ? 'busy' : hb.status === 'active' ? 'active' : 'idle';
          const statusText = isBlocked ? '⚠️ 阻塞' : isActive ? '⚙️ 执行中' : hb.status === 'active' ? '🟢 活跃' : '⚪ 候命';
          const cardCls = isBlocked ? 'blocked-card' : isActive ? 'active-card' : '';

          return (
            <div key={d.id} className={`duty-card ${cardCls}`}>
              <div className="dc-hdr">
                <span className="dc-emoji">{d.emoji}</span>
                <div className="dc-info">
                  <div className="dc-name">{d.label}</div>
                  <div className="dc-role">{d.role} · {d.rank}</div>
                </div>
                <div className="dc-status">
                  <span className={`dc-dot ${dotCls}`} />
                  <span>{statusText}</span>
                </div>
              </div>
              <div className="dc-body">
                {myTasks.length > 0 ? (
                  myTasks.map((t) => (
                    <div key={t.id} className="dc-task" onClick={() => setModalTaskId(t.id)}>
                      <div className="dc-task-id">{t.id}</div>
                      <div className="dc-task-title">{t.title || '(无标题)'}</div>
                      {t.now && t.now !== '-' && (
                        <div className="dc-task-now">{t.now.substring(0, 70)}</div>
                      )}
                      <div className="dc-task-meta">
                        <span className={`tag st-${t.state}`}>{stateLabel(t)}</span>
                        {t.block && t.block !== '无' && (
                          <span className="tag" style={{ borderColor: 'rgba(255,82,112,.2)', color: 'var(--danger)', background: 'rgba(255,82,112,.06)' }}>
                            🚫 {t.block}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="dc-idle">
                    <span style={{ fontSize: 22, opacity: 0.4 }}>💤</span>
                    <span>候命中 — 等待任务分配</span>
                  </div>
                )}
              </div>
              <div className="dc-footer">
                <span className="dc-model">🤖 {off?.model_short || '待配置'}</span>
                {off?.last_active && <span className="dc-la">⏰ {off.last_active}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
