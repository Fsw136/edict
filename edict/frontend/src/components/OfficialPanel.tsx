import { useEffect } from 'react';
import { useStore, STATE_LABEL } from '../store';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function OfficialPanel() {
  const officialsData = useStore((s) => s.officialsData);
  const selectedOfficial = useStore((s) => s.selectedOfficial);
  const setSelectedOfficial = useStore((s) => s.setSelectedOfficial);
  const loadOfficials = useStore((s) => s.loadOfficials);
  const setModalTaskId = useStore((s) => s.setModalTaskId);

  useEffect(() => {
    loadOfficials();
  }, [loadOfficials]);

  if (!officialsData?.officials) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>👥</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>正在加载团队数据...</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>请确保本地服务器已启动</div>
      </div>
    );
  }

  const offs = officialsData.officials;
  const totals = officialsData.totals || { tasks_done: 0, cost_cny: 0 };
  const maxTk = Math.max(...offs.map((o) => o.tokens_in + o.tokens_out + o.cache_read + o.cache_write), 1);

  // Active officials
  const alive = offs.filter((o) => o.heartbeat?.status === 'active');

  // Selected official detail
  const sel = offs.find((o) => o.id === (selectedOfficial || offs[0]?.id));
  const selId = sel?.id || offs[0]?.id;

  return (
    <div>
      {/* Activity banner */}
      {alive.length > 0 && (
        <div className="off-activity">
          <span className="act-label">🟢 当前活跃：</span>
          {alive.map((o) => (
            <span key={o.id} className="act-dot alive">{o.emoji} {o.role}</span>
          ))}
          <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
            {offs.length - alive.length} 位成员待命
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="off-kpi">
        <div className="kpi">
          <div className="kpi-v blue">{offs.length}</div>
          <div className="kpi-l">团队成员</div>
        </div>
        <div className="kpi">
          <div className="kpi-v gold">{totals.tasks_done || 0}</div>
          <div className="kpi-l">累计完成需求</div>
        </div>
        <div className="kpi">
          <div className="kpi-v" style={{ color: (totals.cost_cny || 0) > 20 ? 'var(--warn)' : 'var(--ok)' }}>
            ¥{totals.cost_cny || 0}
          </div>
          <div className="kpi-l">累计费用（含缓存）</div>
        </div>
        <div className="kpi">
          <div className="kpi-v" style={{ fontSize: 16, paddingTop: 4 }}>{officialsData.top_official || '—'}</div>
          <div className="kpi-l">绩效最优</div>
        </div>
      </div>

      {/* Layout: Ranklist + Detail */}
      <div className="off-layout">
        {/* Left: Ranklist */}
        <div className="off-ranklist">
          <div className="orl-hdr">绩效排行</div>
          {offs.map((o) => {
            const hb = o.heartbeat || { status: 'idle' };
            return (
              <div
                key={o.id}
                className={`orl-item${selId === o.id ? ' selected' : ''}`}
                onClick={() => setSelectedOfficial(o.id)}
              >
                <span className="orl-medal">
                  {o.merit_rank <= 3 ? MEDALS[o.merit_rank - 1] : <span style={{ fontSize: 11, color: 'var(--muted)' }}>#{o.merit_rank}</span>}
                </span>
                <span className="orl-emoji">{o.emoji}</span>
                <span className="orl-name">
                  <div className="orl-role">{o.role}</div>
                  <div className="orl-org">{o.label}</div>
                </span>
                <span className="orl-score">{o.merit_score}分</span>
                <span className={`orl-hbdot ${hb.status}`} />
              </div>
            );
          })}
        </div>

        {/* Right: Detail */}
        <div className="off-detail">
          {sel ? (
            <OfficialDetail official={sel} maxTk={maxTk} onOpenTask={setModalTaskId} />
          ) : (
            <div className="od-empty">
              <div>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>👤</div>
                <div>选择左侧成员查看详情</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OfficialDetail({
  official: o,
  maxTk,
  onOpenTask,
}: {
  official: NonNullable<ReturnType<typeof useStore.getState>['officialsData']>['officials'][0];
  maxTk: number;
  onOpenTask: (id: string) => void;
}) {
  const hb = o.heartbeat || { status: 'idle', label: '⚪ 待命' };
  const totTk = o.tokens_in + o.tokens_out + o.cache_read + o.cache_write;
  const edicts = o.participated_edicts || [];

  const tkBars = [
    { l: '输入', v: o.tokens_in, color: '#6a9eff' },
    { l: '输出', v: o.tokens_out, color: '#a07aff' },
    { l: '缓存读', v: o.cache_read, color: '#2ecc8a' },
    { l: '缓存写', v: o.cache_write, color: '#f5c842' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="od-hero">
        <div className="od-emoji">{o.emoji}</div>
        <div style={{ flex: 1 }}>
          <div className="od-name">{o.role}</div>
          <div className="od-role">
            {o.label} · <span style={{ color: 'var(--acc)' }}>{o.model_short || o.model}</span>
          </div>
          <div className="od-rank-badge">🏅 {o.rank} · 绩效分 {o.merit_score}</div>
        </div>
        <div className="od-hb">
          <div className={`hb ${hb.status}`} style={{ marginBottom: 6 }}>{hb.label}</div>
          {o.last_active && <div style={{ fontSize: 10, color: 'var(--muted)' }}>活跃 {o.last_active}</div>}
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
            {o.sessions} 个会话 · {o.messages} 条消息
          </div>
        </div>
      </div>

      {/* Merit Stats */}
      <div className="od-section">
        <div className="od-sec-title">绩效统计</div>
        <div className="od-stats">
          <div className="ods">
            <div className="ods-v" style={{ color: 'var(--ok)' }}>{o.tasks_done}</div>
            <div className="ods-l">完成需求</div>
          </div>
          <div className="ods">
            <div className="ods-v" style={{ color: 'var(--warn)' }}>{o.tasks_active}</div>
            <div className="ods-l">执行中</div>
          </div>
          <div className="ods">
            <div className="ods-v" style={{ color: 'var(--acc)' }}>{o.flow_participations}</div>
            <div className="ods-l">流转参与</div>
          </div>
        </div>
      </div>

      {/* Token Bars */}
      <div className="od-section">
        <div className="od-sec-title">Token 消耗</div>
        {tkBars.map((b) => (
          <div className="tbar" key={b.l}>
            <div className="tbar-hdr">
              <span className="tbar-label">{b.l}</span>
              <span className="tbar-val">{b.v.toLocaleString()}</span>
            </div>
            <div className="tbar-track">
              <div className="tbar-fill" style={{ width: `${maxTk > 0 ? Math.round((b.v / maxTk) * 100) : 0}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Cost */}
      <div className="od-section">
        <div className="od-sec-title">累计费用</div>
        <div className="od-cost-row">
          <div className={`cost-chip ${o.cost_cny > 10 ? 'hi' : o.cost_cny > 3 ? 'md' : 'lo'}`}>
            <b>¥{o.cost_cny}</b> <span style={{ fontSize: 10, color: 'var(--muted)' }}>人民币</span>
          </div>
          <div className="cost-chip">
            <b>${o.cost_usd}</b> <span style={{ fontSize: 10, color: 'var(--muted)' }}>美元</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
            总计 {totTk.toLocaleString()} tokens
          </div>
        </div>
      </div>

      {/* Participated Edicts */}
      <div className="od-section">
        <div className="od-sec-title">参与需求（{edicts.length} 个）</div>
        {edicts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '12px 0', textAlign: 'center' }}>
            <span style={{ opacity: 0.4 }}>📋</span> 暂无需求记录
          </div>
        ) : (
          <div className="od-edict-list">
            {edicts.map((e) => (
              <div className="oe-item" key={e.id} onClick={() => onOpenTask(e.id)}>
                <span className="oe-id">{e.id}</span>
                <span className="oe-title">{e.title.substring(0, 40)}</span>
                <span className={`tag st-${e.state}`} style={{ fontSize: 10 }}>{STATE_LABEL[e.state] || e.state}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
