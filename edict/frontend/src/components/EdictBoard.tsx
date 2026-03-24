import { useState } from 'react';
import { useStore, isEdict, isArchived, getPipeStatus, stateLabel, deptColor, PIPE } from '../store';
import { api, type Task } from '../api';

// 排序权重
const STATE_ORDER: Record<string, number> = {
  Doing: 0, Review: 1, Assigned: 2, Menxia: 3, Zhongshu: 4,
  Taizi: 5, Inbox: 6, Blocked: 7, Next: 8, Done: 9, Cancelled: 10,
};

/* ── 统计摘要条 ── */
function SummaryBar({ tasks }: { tasks: Task[] }) {
  const doing = tasks.filter((t) => t.state === 'Doing').length;
  const review = tasks.filter((t) => t.state === 'Review').length;
  const blocked = tasks.filter((t) => t.state === 'Blocked').length;
  const done = tasks.filter((t) => t.state === 'Done').length;
  const total = tasks.length;
  if (total === 0) return null;

  const items = [
    { label: '执行中', value: doing, color: '#6a9eff' },
    { label: '评审中', value: review, color: '#f5c842' },
    { label: '已阻塞', value: blocked, color: '#ff5270' },
    { label: '已完成', value: done, color: '#2ecc8a' },
  ].filter((x) => x.value > 0);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
        background: 'rgba(106,158,255,.04)', border: '1px solid rgba(106,158,255,.12)',
        borderRadius: 12, marginBottom: 16, flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
        📊 需求概览
      </span>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--muted)' }}>{it.label}</span>
          <b style={{ color: it.color }}>{it.value}</b>
        </span>
      ))}
      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
        共 <b style={{ color: 'var(--text)' }}>{total}</b> 个需求
      </span>
    </div>
  );
}

function MiniPipe({ task }: { task: Task }) {
  const stages = getPipeStatus(task);
  return (
    <div className="ec-pipe">
      {stages.map((s, i) => (
        <span key={s.key} style={{ display: 'contents' }}>
          <div className={`ep-node ${s.status}`}>
            <div className="ep-icon">{s.icon}</div>
            <div className="ep-name">{s.dept}</div>
          </div>
          {i < stages.length - 1 && <div className="ep-arrow">›</div>}
        </span>
      ))}
    </div>
  );
}

function EdictCard({ task }: { task: Task }) {
  const setModalTaskId = useStore((s) => s.setModalTaskId);
  const toast = useStore((s) => s.toast);
  const loadAll = useStore((s) => s.loadAll);

  const hb = task.heartbeat || { status: 'unknown', label: '⚪' };
  const stCls = 'st-' + (task.state || '');
  const deptCls = 'dt-' + (task.org || '').replace(/\s/g, '');
  const curStage = PIPE.find((_, i) => getPipeStatus(task)[i].status === 'active');
  const todos = task.todos || [];
  const todoDone = todos.filter((x) => x.status === 'completed').length;
  const todoTotal = todos.length;
  const canStop = !['Done', 'Blocked', 'Cancelled'].includes(task.state);
  const canResume = ['Blocked', 'Cancelled'].includes(task.state);
  const archived = isArchived(task);
  const isBlocked = task.block && task.block !== '无' && task.block !== '-';

  const handleAction = async (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === 'stop' || action === 'cancel') {
      const reason = prompt(action === 'stop' ? '请输入叫停原因：' : '请输入取消原因：');
      if (reason === null) return;
      try {
        const r = await api.taskAction(task.id, action, reason);
        if (r.ok) { toast(r.message || '操作成功'); loadAll(); }
        else toast(r.error || '操作失败', 'err');
      } catch { toast('服务器连接失败', 'err'); }
    } else if (action === 'resume') {
      try {
        const r = await api.taskAction(task.id, 'resume', '恢复执行');
        if (r.ok) { toast(r.message || '已恢复'); loadAll(); }
        else toast(r.error || '操作失败', 'err');
      } catch { toast('服务器连接失败', 'err'); }
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const r = await api.archiveTask(task.id, !task.archived);
      if (r.ok) { toast(r.message || '操作成功'); loadAll(); }
      else toast(r.error || '操作失败', 'err');
    } catch { toast('服务器连接失败', 'err'); }
  };

  return (
    <div
      className={`edict-card${archived ? ' archived' : ''}`}
      onClick={() => setModalTaskId(task.id)}
    >
      <MiniPipe task={task} />
      <div className="ec-id">{task.id}</div>
      <div className="ec-title">{task.title || '(无标题)'}</div>
      <div className="ec-meta">
        <span className={`tag ${stCls}`}>{stateLabel(task)}</span>
        {task.org && <span className={`tag ${deptCls}`}>{task.org}</span>}
        {curStage && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            当前: <b style={{ color: deptColor(curStage.dept) }}>{curStage.dept} · {curStage.action}</b>
          </span>
        )}
      </div>
      {task.now && task.now !== '-' && (
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 6 }}>
          {task.now.substring(0, 80)}
        </div>
      )}
      {(task.review_round || 0) > 0 && (
        <div style={{ fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: task.review_round || 0 }, (_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: '50%',
                background: i < (task.review_round || 0) - 1 ? 'rgba(106,158,255,.06)' : 'rgba(106,158,255,.12)',
                border: `1px solid ${i < (task.review_round || 0) - 1 ? 'rgba(106,158,255,.15)' : 'rgba(106,158,255,.4)'}`,
                fontSize: 9, color: i < (task.review_round || 0) - 1 ? '#4a6aaa' : 'var(--acc)',
              }}
            >
              {i + 1}
            </span>
          ))}
          <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 4 }}>第 {task.review_round} 轮评审</span>
        </div>
      )}
      {todoTotal > 0 && (
        <div className="ec-todo-bar">
          <span>📋 {todoDone}/{todoTotal}</span>
          <div className="ec-todo-track">
            <div className="ec-todo-fill" style={{ width: `${Math.round((todoDone / todoTotal) * 100)}%` }} />
          </div>
          <span>{todoDone === todoTotal ? '✅ 全部完成' : '🔄 进行中'}</span>
        </div>
      )}
      <div className="ec-footer">
        <span className={`hb ${hb.status}`}>{hb.label}</span>
        {isBlocked && (
          <span className="tag" style={{ borderColor: 'rgba(255,82,112,.2)', color: 'var(--danger)', background: 'rgba(255,82,112,.06)' }}>
            🚫 {task.block}
          </span>
        )}
        {task.eta && task.eta !== '-' && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {task.eta}</span>
        )}
      </div>
      <div className="ec-actions" onClick={(e) => e.stopPropagation()}>
        {canStop && (
          <>
            <button className="mini-act" onClick={(e) => handleAction('stop', e)}>⏸ 叫停</button>
            <button className="mini-act danger" onClick={(e) => handleAction('cancel', e)}>🚫 取消</button>
          </>
        )}
        {canResume && (
          <button className="mini-act" onClick={(e) => handleAction('resume', e)}>▶ 恢复</button>
        )}
        {archived && !task.archived && (
          <button className="mini-act" onClick={handleArchive}>📦 归档</button>
        )}
        {task.archived && (
          <button className="mini-act" onClick={handleArchive}>📤 取消归档</button>
        )}
      </div>
    </div>
  );
}

export default function EdictBoard() {
  const liveStatus = useStore((s) => s.liveStatus);
  const edictFilter = useStore((s) => s.edictFilter);
  const setEdictFilter = useStore((s) => s.setEdictFilter);
  const toast = useStore((s) => s.toast);
  const loadAll = useStore((s) => s.loadAll);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ count: number; details?: any[] } | null>(null);
  const [showScanDetail, setShowScanDetail] = useState(false);

  const tasks = liveStatus?.tasks || [];
  const allEdicts = tasks.filter(isEdict);
  const activeEdicts = allEdicts.filter((t) => !isArchived(t));
  const archivedEdicts = allEdicts.filter((t) => isArchived(t));

  let edicts: Task[];
  if (edictFilter === 'active') edicts = activeEdicts;
  else if (edictFilter === 'archived') edicts = archivedEdicts;
  else edicts = allEdicts;

  edicts.sort((a, b) => (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9));

  const unArchivedDone = allEdicts.filter((t) => !t.archived && ['Done', 'Cancelled'].includes(t.state));

  const handleArchiveAll = async () => {
    if (!confirm('将所有已完成/已取消的需求移入归档？')) return;
    try {
      const r = await api.archiveAllDone();
      if (r.ok) { toast(`📦 ${r.count || 0} 个需求已归档`); loadAll(); }
      else toast(r.error || '批量归档失败', 'err');
    } catch { toast('服务器连接失败', 'err'); }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const r = await api.schedulerScan();
      if (r.ok) {
        toast(`🧭 系统巡检完成：${r.count || 0} 个动作`);
        setScanResult({ count: r.count || 0, details: r.actions as any[] });
      } else {
        toast(r.error || '巡检失败', 'err');
      }
      loadAll();
    } catch { toast('服务器连接失败', 'err'); }
    setScanning(false);
  };

  return (
    <div>
      {/* 统计摘要 */}
      <SummaryBar tasks={edictFilter === 'active' ? activeEdicts : edictFilter === 'archived' ? archivedEdicts : allEdicts} />

      {/* Archive Bar */}
      <div className="archive-bar">
        <span className="ab-label">筛选:</span>
        {(['active', 'archived', 'all'] as const).map((f) => (
          <button
            key={f}
            className={`ab-btn ${edictFilter === f ? 'active' : ''}`}
            onClick={() => setEdictFilter(f)}
          >
            {f === 'active' ? `活跃 (${activeEdicts.length})` : f === 'archived' ? `归档 (${archivedEdicts.length})` : `全部 (${allEdicts.length})`}
          </button>
        ))}
        {unArchivedDone.length > 0 && (
          <button className="ab-archive-all" onClick={handleArchiveAll}>
            📦 一键归档 ({unArchivedDone.length})
          </button>
        )}
        <button
          className="ab-scan"
          onClick={handleScan}
          style={{ opacity: scanning ? 0.6 : 1, pointerEvents: scanning ? 'none' : 'auto' }}
        >
          {scanning ? '⏳ 巡检中...' : '🧭 系统巡检'}
        </button>
        {scanResult && (
          <button
            className={`ab-scan-detail ${showScanDetail ? 'active' : ''}`}
            onClick={() => setShowScanDetail(!showScanDetail)}
          >
            📋 巡检结果 ({scanResult.count})
          </button>
        )}
      </div>

      {/* 巡检结果详情 */}
      {scanResult && showScanDetail && (
        <div className="global-scan-detail open">
          {scanResult.details && scanResult.details.length > 0 ? (
            <div className="gs-list">
              {scanResult.details.map((d: any, i: number) => (
                <div key={i} className="gs-item">
                  <span className={`gs-tag ${d.action || ''}`}>{d.action || '动作'}</span>
                  <span className="gs-task">{d.task_id || '-'}</span>
                  <span className="gs-meta">{d.reason || d.message || '-'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="gs-empty">✅ 系统运行正常，无需干预</div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="edict-grid">
        {edicts.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {edictFilter === 'archived' ? '暂无归档需求' : '暂无活跃需求'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              {edictFilter === 'archived'
                ? '已完成的需求归档后会显示在这里'
                : '通过飞书向总裁办发送任务，总裁办初筛后转PMO处理'}
            </div>
          </div>
        ) : (
          edicts.map((t) => <EdictCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}
