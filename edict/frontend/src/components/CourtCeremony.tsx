import { useEffect, useState, useMemo } from 'react';
import { useStore, isEdict } from '../store';

/* ── 粒子背景 ── */
function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    [],
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((d) => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: '#6a9eff',
            opacity: d.opacity,
            animation: `crmFloat ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes crmFloat { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-30px) scale(1.5); } }`}</style>
    </div>
  );
}

/* ── 统计卡片 ── */
function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        background: `${color}0a`,
        border: `1px solid ${color}22`,
        borderRadius: 10,
        minWidth: 120,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 10, color: '#5a6b92', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

export default function CourtCeremony() {
  const liveStatus = useStore((s) => s.liveStatus);
  const [show, setShow] = useState(false);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const lastOpen = localStorage.getItem('openclaw_court_date');
    const today = new Date().toISOString().substring(0, 10);
    const pref = JSON.parse(localStorage.getItem('openclaw_court_pref') || '{"enabled":true}');
    if (!pref.enabled || lastOpen === today) return;
    localStorage.setItem('openclaw_court_date', today);
    setShow(true);
    const timer = setTimeout(() => skip(), 4500);
    return () => clearTimeout(timer);
  }, []);

  const skip = () => {
    setOut(true);
    setTimeout(() => setShow(false), 500);
  };

  if (!show) return null;

  const tasks = liveStatus?.tasks || [];
  const jjc = tasks.filter(isEdict);
  const pending = jjc.filter((t) => !['Done', 'Cancelled'].includes(t.state)).length;
  const done = jjc.filter((t) => t.state === 'Done').length;
  const overdue = jjc.filter(
    (t) => t.state !== 'Done' && t.state !== 'Cancelled' && t.eta && new Date(t.eta.replace(' ', 'T')) < new Date(),
  ).length;
  const total = jjc.length;

  const d = new Date();
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${days[d.getDay()]}`;

  const greetings = d.getHours() < 12 ? '早上好' : d.getHours() < 18 ? '下午好' : '晚上好';

  return (
    <div className={`ceremony-bg${out ? ' out' : ''}`} onClick={skip}>
      <Particles />
      <div className="crm-glow" />
      <div className="crm-glow" style={{ left: '60%', top: '30%', width: 300, height: 300, opacity: 0.4 }} />

      <div className="crm-line1 in">{greetings}</div>
      <div className="crm-line2 in">企业中枢 · 每日播报</div>

      {/* 统计卡片区 */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginTop: 28,
          flexWrap: 'wrap',
          justifyContent: 'center',
          opacity: 0,
          animation: 'crmSlideUp .5s 1.4s ease forwards',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <StatCard label="总需求" value={total} color="#6a9eff" icon="📋" />
        <StatCard label="进行中" value={pending} color="#f5c842" icon="⚡" />
        <StatCard label="已完成" value={done} color="#2ecc8a" icon="✅" />
        {overdue > 0 && <StatCard label="已超期" value={overdue} color="#ff5270" icon="⏰" />}
      </div>

      <div className="crm-date in">{dateStr}</div>
      <div className="crm-skip">点击任意处进入工作台</div>
    </div>
  );
}
