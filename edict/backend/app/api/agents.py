"""Agents API — Agent 配置和状态查询。"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter

log = logging.getLogger("edict.api.agents")
router = APIRouter()

# Agent 元信息（对应 agents/ 目录下的 SOUL.md）
AGENT_META = {
    "zaochao": {"name": "行业研究", "role": "行业资讯采集与分析", "icon": "🏛️"},
    "shangshu": {"name": "尚书令", "role": "总协调与任务监督", "icon": "📜"},
    "zhongshu": {"name": "PMO", "role": "需求规划与方案设计", "icon": "✍️"},
    "menxia": {"name": "风控部", "role": "审核与风控", "icon": "🔍"},
    "libu": {"name": "HR部", "role": "人事与组织管理", "icon": "👤"},
    "hubu": {"name": "财务部", "role": "财务与资源管理", "icon": "💰"},
    "gongbu": {"name": "研发部", "role": "工程与技术实施", "icon": "🔧"},
    "xingbu": {"name": "QA部", "role": "规范与质量审查", "icon": "⚖️"},
    "bingbu": {"name": "运维部", "role": "安全与应急响应", "icon": "🛡️"},
}


@router.get("")
async def list_agents():
    """列出所有可用 Agent。"""
    agents = []
    for agent_id, meta in AGENT_META.items():
        agents.append({
            "id": agent_id,
            **meta,
        })
    return {"agents": agents}


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """获取 Agent 详情。"""
    meta = AGENT_META.get(agent_id)
    if not meta:
        return {"error": f"Agent '{agent_id}' not found"}, 404

    # 尝试读取 SOUL.md
    soul_path = Path(__file__).parents[4] / "agents" / agent_id / "SOUL.md"
    soul_content = ""
    if soul_path.exists():
        soul_content = soul_path.read_text(encoding="utf-8")[:2000]

    return {
        "id": agent_id,
        **meta,
        "soul_preview": soul_content,
    }


@router.get("/{agent_id}/config")
async def get_agent_config(agent_id: str):
    """获取 Agent 运行时配置。"""
    config_path = Path(__file__).parents[4] / "data" / "agent_config.json"
    if not config_path.exists():
        return {"agent_id": agent_id, "config": {}}

    try:
        configs = json.loads(config_path.read_text(encoding="utf-8"))
        agent_config = configs.get(agent_id, {})
        return {"agent_id": agent_id, "config": agent_config}
    except (json.JSONDecodeError, IOError):
        return {"agent_id": agent_id, "config": {}}
