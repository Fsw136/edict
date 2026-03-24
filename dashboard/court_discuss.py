"""
高管会议引擎 — 多角色实时讨论系统

灵感来源于 nvwa 项目的 group_chat + crew_engine
将团队成员可视化 + 实时讨论 + 用户（老板）参与融合到企业中枢

功能:
  - 选择成员参与会议
  - 围绕需求/议题进行多轮群聊讨论
  - 老板可随时发言、下达指令（紧急插入）
  - 突发事件：随机事件
  - 每个成员保持自己的角色性格和说话风格
"""

import json
import logging
import os
import time
import uuid

logger = logging.getLogger('court_discuss')

# ── 成员角色设定 ──

OFFICIAL_PROFILES = {
    'taizi': {
        'name': '总裁办主任', 'emoji': '🏢', 'role': '高管',
        'duty': '消息分拣与需求提炼。判断事务轻重缓急，简单事直接处置，重大事务提炼需求转交PMO。代老板巡视各部门进展。',
        'personality': '年轻有为、锐意进取，偶尔冲动但善于学习。说话干脆利落，喜欢用数据和案例说话。',
        'speaking_style': '简洁有力，经常用"我的判断是"开头，善于抓重点。'
    },
    'zhongshu': {
        'name': 'PMO总监', 'emoji': '📊', 'role': '总监·PMO',
        'duty': '方案规划与流程驱动。接收需求后起草执行方案，提交风控部审核，通过后转调度中心执行。只规划不执行，方案需简明扼要。',
        'personality': '老成持重，擅长规划，总能提出系统性方案。话多但有条理。',
        'speaking_style': '喜欢列点论述，常说"我认为需从三方面考量"。善于引用方法论。'
    },
    'menxia': {
        'name': '风控总监', 'emoji': '🛡️', 'role': '总监·风控部',
        'duty': '方案审核与把关。从可行性、完整性、风险、资源四维度审核方案，有权打回重做。发现漏洞必须指出，建议必须具体。',
        'personality': '严谨挑剔，眼光犀利，善于找漏洞。是天生的审查官，但也很公正。',
        'speaking_style': '喜欢反问，"请注意，这里有三点疑虑"。对不完善的方案会直言不讳。'
    },
    'shangshu': {
        'name': '运营总监', 'emoji': '🔀', 'role': '总监·调度中心',
        'duty': '任务派发与执行协调。接收审批通过的方案后判断归属哪个部门，分发给各部门执行，汇总结果回报。相当于任务分发中心。',
        'personality': '执行力强，务实干练，关注可行性和资源分配。',
        'speaking_style': '直来直去，"我来安排"、"交由某部门办理"。重效率轻虚文。'
    },
    'libu': {
        'name': '公关总监', 'emoji': '📝', 'role': '部门长·公关部',
        'duty': '文档规范与对外沟通。负责撰写文档、用户指南、变更日志；制定输出规范和模板；审查UI/UX文案；草拟公告、Release Notes。',
        'personality': '文采飞扬，注重规范和形式，擅长文档和汇报。有点强迫症。',
        'speaking_style': '措辞优美，"我建议"，喜欢用结构化表达。'
    },
    'hubu': {
        'name': '财务总监', 'emoji': '📈', 'role': '部门长·财务部',
        'duty': '数据统计与资源管理。负责数据收集/清洗/聚合/可视化；Token用量统计、性能指标计算、成本分析；CSV/JSON报表生成；文件组织与配置管理。',
        'personality': '精打细算，对预算和资源极其敏感。总想省钱但也识大局。',
        'speaking_style': '言必及成本，"这个预算嘛……"，经常算账。'
    },
    'bingbu': {
        'name': '运维总监', 'emoji': '🛡️', 'role': '部门长·运维部',
        'duty': '基础设施与运维保障。负责服务器管理、进程守护、日志排查；CI/CD、容器编排、灰度发布、回滚策略；性能监控；防火墙、权限管控、漏洞扫描。',
        'personality': '雷厉风行，危机意识强，重视安全和应急。说话干脆利落。',
        'speaking_style': '干脆果断，"我建议立即执行"、"效率优先"。'
    },
    'xingbu': {
        'name': 'QA总监', 'emoji': '🧪', 'role': '部门长·QA部',
        'duty': '质量保障与合规审计。负责代码审查（逻辑正确性、边界条件、异常处理）；编写测试、覆盖率分析；Bug定位与根因分析；权限检查、敏感信息排查。',
        'personality': '严明公正，重视规则和底线。善于质量把控和风险评估。',
        'speaking_style': '逻辑严密，"按照规范应当如此"、"需审慎考量风险"。'
    },
    'gongbu': {
        'name': '研发总监', 'emoji': '💻', 'role': '部门长·研发部',
        'duty': '工程实现与架构设计。负责需求分析、方案设计、代码实现、接口对接；模块划分、数据结构/API设计；代码重构、性能优化、技术债清偿；脚本与自动化工具。',
        'personality': '技术宅，动手能力强，喜欢谈实现细节。偶尔社恐但一说到技术就滔滔不绝。',
        'speaking_style': '喜欢说技术术语，"从技术角度来看"、"这个架构建议用……"。'
    },
    'libu_hr': {
        'name': 'HR总监', 'emoji': '👥', 'role': '部门长·HR部',
        'duty': '人事管理与团队建设。负责新成员（Agent）评估接入、能力测试；Skill编写与Prompt调优、知识库维护；输出质量评分、效率分析；协作规范制定。',
        'personality': '知人善任，擅长人员安排和组织协调。八面玲珑但有原则。',
        'speaking_style': '关注人的因素，"此事需考虑各部门人手"、"建议由某某负责"。'
    },
}

# ── 突发事件（职场版）──

FATE_EVENTS = [
    '紧急通知：核心客户反馈了一个严重Bug，所有人必须讨论应急方案',
    '市场部急报：竞品发布了重大更新，建议暂缓当前方案重新评估',
    '新入职的技术专家带来了意想不到的新视角',
    '匿名反馈渠道揭露了计划中一个被忽视的重大漏洞',
    '财务部盘点发现本季度预算比预期多一倍，可以加大投入',
    '一位行业顾问突然来访，分享了同行的前车之鉴',
    '社交媒体舆论突变，用户对此事态度出现180度转折',
    '合作伙伴来访，带来了合作机遇也带来了竞争压力',
    '董事会指示：要求优先考虑用户体验',
    '服务器故障，多个服务受影响，资源需重新调配',
    '发现开源社区中竟有类似问题的解决方案',
    '研发部提出了一个大胆的替代方案，令人耳目一新',
    '各部门积压的旧需求突然需要一起处理，人手紧张',
    '老板分享了一个行业洞察，暗示了一个全新的方向',
    '突然有人拿出了竞品的情报，局面瞬间改变',
    '一场突发事件让所有人不得不在半天内拿出结论',
]

# ── Session 管理 ──

_sessions: dict[str, dict] = {}


def create_session(topic: str, official_ids: list[str], task_id: str = '') -> dict:
    """创建新的高管会议会话。"""
    session_id = str(uuid.uuid4())[:8]

    officials = []
    for oid in official_ids:
        profile = OFFICIAL_PROFILES.get(oid)
        if profile:
            officials.append({**profile, 'id': oid})

    if not officials:
        return {'ok': False, 'error': '至少选择一位成员'}

    session = {
        'session_id': session_id,
        'topic': topic,
        'task_id': task_id,
        'officials': officials,
        'messages': [{
            'type': 'system',
            'content': f'💼 高管会议开始 —— 议题：{topic}',
            'timestamp': time.time(),
        }],
        'round': 0,
        'phase': 'discussing',  # discussing | concluded
        'created_at': time.time(),
    }

    _sessions[session_id] = session
    return _serialize(session)


def advance_discussion(session_id: str, user_message: str = None,
                       decree: str = None) -> dict:
    """推进一轮讨论，使用内置模拟或 LLM。"""
    session = _sessions.get(session_id)
    if not session:
        return {'ok': False, 'error': f'会话 {session_id} 不存在'}

    session['round'] += 1
    round_num = session['round']

    # 记录老板发言
    if user_message:
        session['messages'].append({
            'type': 'emperor',
            'content': user_message,
            'timestamp': time.time(),
        })

    # 记录紧急插入
    if decree:
        session['messages'].append({
            'type': 'decree',
            'content': decree,
            'timestamp': time.time(),
        })

    # 尝试用 LLM 生成讨论
    llm_result = _llm_discuss(session, user_message, decree)

    if llm_result:
        new_messages = llm_result.get('messages', [])
        scene_note = llm_result.get('scene_note')
    else:
        # 降级到规则模拟
        new_messages = _simulated_discuss(session, user_message, decree)
        scene_note = None

    # 添加到历史
    for msg in new_messages:
        session['messages'].append({
            'type': 'official',
            'official_id': msg.get('official_id', ''),
            'official_name': msg.get('name', ''),
            'content': msg.get('content', ''),
            'emotion': msg.get('emotion', 'neutral'),
            'action': msg.get('action'),
            'timestamp': time.time(),
        })

    if scene_note:
        session['messages'].append({
            'type': 'scene_note',
            'content': scene_note,
            'timestamp': time.time(),
        })

    return {
        'ok': True,
        'session_id': session_id,
        'round': round_num,
        'new_messages': new_messages,
        'scene_note': scene_note,
        'total_messages': len(session['messages']),
    }


def get_session(session_id: str) -> dict | None:
    session = _sessions.get(session_id)
    if not session:
        return None
    return _serialize(session)


def conclude_session(session_id: str) -> dict:
    """结束会议，生成总结。"""
    session = _sessions.get(session_id)
    if not session:
        return {'ok': False, 'error': f'会话 {session_id} 不存在'}

    session['phase'] = 'concluded'

    # 尝试用 LLM 生成总结
    summary = _llm_summarize(session)
    if not summary:
        # 降级到简单统计
        official_msgs = [m for m in session['messages'] if m['type'] == 'official']
        by_name = {}
        for m in official_msgs:
            name = m.get('official_name', '?')
            by_name[name] = by_name.get(name, 0) + 1
        parts = [f"{n}发言{c}次" for n, c in by_name.items()]
        summary = f"历经{session['round']}轮讨论，{'、'.join(parts)}。议题待后续落实。"

    session['messages'].append({
        'type': 'system',
        'content': f'📋 高管会议结束 —— {summary}',
        'timestamp': time.time(),
    })
    session['summary'] = summary

    return {
        'ok': True,
        'session_id': session_id,
        'summary': summary,
    }


def list_sessions() -> list[dict]:
    """列出所有活跃会话。"""
    return [
        {
            'session_id': s['session_id'],
            'topic': s['topic'],
            'round': s['round'],
            'phase': s['phase'],
            'official_count': len(s['officials']),
            'message_count': len(s['messages']),
        }
        for s in _sessions.values()
    ]


def destroy_session(session_id: str):
    _sessions.pop(session_id, None)


def get_fate_event() -> str:
    """获取随机突发事件。"""
    import random
    return random.choice(FATE_EVENTS)


# ── LLM 集成 ──

_PREFERRED_MODELS = ['gpt-4o-mini', 'claude-haiku', 'gpt-5-mini', 'gemini-3-flash', 'gemini-flash']

# GitHub Copilot 模型列表 (通过 Copilot Chat API 可用)
_COPILOT_MODELS = [
    'gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4', 'claude-haiku-3.5',
    'gemini-2.0-flash', 'o3-mini',
]
_COPILOT_PREFERRED = ['gpt-4o-mini', 'claude-haiku', 'gemini-flash', 'gpt-4o']


def _pick_chat_model(models: list[dict]) -> str | None:
    """从 provider 的模型列表中选一个适合聊天的轻量模型。"""
    ids = [m['id'] for m in models if isinstance(m, dict) and 'id' in m]
    for pref in _PREFERRED_MODELS:
        for mid in ids:
            if pref in mid:
                return mid
    return ids[0] if ids else None


def _read_copilot_token() -> str | None:
    """读取 openclaw 管理的 GitHub Copilot token。"""
    token_path = os.path.expanduser('~/.openclaw/credentials/github-copilot.token.json')
    if not os.path.exists(token_path):
        return None
    try:
        with open(token_path) as f:
            cred = json.load(f)
        token = cred.get('token', '')
        expires = cred.get('expiresAt', 0)
        # 检查 token 是否过期（毫秒时间戳）
        import time
        if expires and time.time() * 1000 > expires:
            logger.warning('Copilot token expired')
            return None
        return token if token else None
    except Exception as e:
        logger.warning('Failed to read copilot token: %s', e)
        return None


def _get_llm_config() -> dict | None:
    """从 openclaw 配置读取 LLM 设置，支持环境变量覆盖。

    优先级: 环境变量 > github-copilot token > 本地 copilot-proxy > anthropic > 其他 provider
    """
    # 1. 环境变量覆盖（保留向后兼容）
    env_key = os.environ.get('OPENCLAW_LLM_API_KEY', '')
    if env_key:
        return {
            'api_key': env_key,
            'base_url': os.environ.get('OPENCLAW_LLM_BASE_URL', 'https://api.openai.com/v1'),
            'model': os.environ.get('OPENCLAW_LLM_MODEL', 'gpt-4o-mini'),
            'api_type': 'openai',
        }

    # 2. GitHub Copilot token
    copilot_token = _read_copilot_token()
    if copilot_token:
        return {
            'api_key': copilot_token,
            'base_url': 'https://api.githubcopilot.com',
            'model': 'gpt-4o-mini',
            'api_type': 'copilot',
        }

    # 3. 本地 copilot-proxy (openclaw 可能在运行)
    try:
        import urllib.request
        req = urllib.request.Request('http://127.0.0.1:11435/v1/models')
        req.add_header('Authorization', 'Bearer local')
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read())
            models = data.get('data', [])
            if models:
                model = _pick_chat_model(models)
                if model:
                    return {
                        'api_key': 'local',
                        'base_url': 'http://127.0.0.1:11435/v1',
                        'model': model,
                        'api_type': 'openai',
                    }
    except Exception:
        pass

    # 4. 读取 openclaw 配置文件中的 provider
    config_path = os.path.expanduser('~/.openclaw/config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
            providers = config.get('providers', [])
            for provider in providers:
                api_key = provider.get('apiKey', '')
                base_url = provider.get('baseUrl', '')
                models = provider.get('models', [])
                if api_key and models:
                    model = _pick_chat_model(models)
                    if model:
                        return {
                            'api_key': api_key,
                            'base_url': base_url or 'https://api.openai.com/v1',
                            'model': model,
                            'api_type': 'openai',
                        }
        except Exception as e:
            logger.warning('Failed to read openclaw config: %s', e)

    return None


def _llm_complete(system_prompt: str, user_prompt: str, max_tokens: int = 800) -> str | None:
    """调用 LLM 完成一次对话。"""
    config = _get_llm_config()
    if not config:
        return None

    try:
        import urllib.request
        url = f"{config['base_url']}/chat/completions"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {config['api_key']}",
        }

        # Copilot API 需要额外的 headers
        if config.get('api_type') == 'copilot':
            headers.update({
                'Copilot-Integration-Id': 'vscode-chat',
                'Editor-Version': 'vscode/1.96.0',
                'Editor-Plugin-Version': 'copilot-chat/0.24.0',
            })

        body = json.dumps({
            'model': config['model'],
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            'max_tokens': max_tokens,
            'temperature': 0.8,
        }).encode()

        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result['choices'][0]['message']['content'].strip()

    except Exception as e:
        logger.warning('LLM call failed: %s', e)
        return None


def _llm_discuss(session: dict, user_message: str = None, decree: str = None) -> dict | None:
    """用 LLM 生成一轮多角色讨论。"""
    officials = session['officials']
    names = '、'.join(f"{o['name']}（{o['role']}）" for o in officials)
    profiles = '\n'.join(
        f"- {o['name']}：{o['duty']} 性格：{o['personality']} 说话风格：{o['speaking_style']}"
        for o in officials
    )

    # 构建对话历史
    history = ''
    for msg in session['messages'][-20:]:
        if msg['type'] == 'official':
            history += f"{msg.get('official_name', '?')}：{msg['content']}\n"
        elif msg['type'] == 'emperor':
            history += f"老板：{msg['content']}\n"
        elif msg['type'] == 'decree':
            history += f"【紧急插入】{msg['content']}\n"
        elif msg['type'] == 'scene_note':
            history += f"\n（{msg['content']}）\n"

    if user_message:
        history += f"\n老板：{user_message}\n"
    if decree:
        history += f"\n【紧急插入——突发事件】{decree}\n"

    decree_section = ''
    if decree:
        decree_section = '\n请根据突发事件改变讨论走向，所有成员都必须对此做出反应。\n'

    prompt = f"""你是一个企业高管会议多角色群聊模拟器。模拟多位高管在会议室围绕议题的讨论。

## 参与成员
{names}

## 角色设定（每位成员都有明确的职责领域，必须从自身专业角度出发讨论）
{profiles}

## 当前议题
{session['topic']}

## 对话记录
{history if history else '（讨论刚刚开始）'}
{decree_section}
## 任务
生成每位成员的下一条发言。要求：
1. 每位成员说1-3句话，像真实会议讨论一样
2. **每位成员必须从自己的职责领域出发发言**——财务部谈成本和数据、运维部谈安全和运维、研发部谈技术实现、QA部谈质量和合规、公关部谈文档和规范、HR部谈人员安排、PMO谈规划方案、风控部谈审查风险、调度中心谈执行调度、总裁办谈创新和大局，每个人关注的焦点不同
3. 成员之间要有互动——回应、反驳、支持、补充，尤其是不同部门的视角碰撞
4. 保持每位成员独特的说话风格和人格特征
5. 讨论要围绕议题推进、有实质性观点，不要泛泛而谈
6. 如果老板发言了，成员要恰当回应（但不要阿谀）
7. 可包含动作描写用*号*包裹（如 *翻开笔记本*）

输出JSON格式：
{{
  "messages": [
    {{"official_id": "zhongshu", "name": "PMO总监", "content": "发言内容", "emotion": "neutral|confident|worried|angry|thinking|amused", "action": "可选动作描写"}},
    ...
  ],
  "scene_note": "可选的会议氛围变化（如：会议室一片哗然|大家窃窃私语），没有则为null"
}}

只输出JSON，不要其他内容。"""

    content = _llm_complete(
        '你是一个企业高管会议群聊模拟器，严格输出JSON格式。',
        prompt,
        max_tokens=1500,
    )

    if not content:
        return None

    # 解析 JSON
    if '```json' in content:
        content = content.split('```json')[1].split('```')[0].strip()
    elif '```' in content:
        content = content.split('```')[1].split('```')[0].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning('Failed to parse LLM response: %s', content[:200])
        return None


def _llm_summarize(session: dict) -> str | None:
    """用 LLM 总结讨论结果。"""
    official_msgs = [m for m in session['messages'] if m['type'] == 'official']
    topic = session['topic']

    if not official_msgs:
        return None

    dialogue = '\n'.join(
        f"{m.get('official_name', '?')}：{m['content']}"
        for m in official_msgs[-30:]
    )

    prompt = f"""以下是高管会议成员围绕「{topic}」的讨论记录：

{dialogue}

请用2-3句话总结讨论结果、达成的共识和待决事项。用专业简明的风格。"""

    return _llm_complete('你是会议记录员，负责总结会议结果。', prompt, max_tokens=300)


# ── 规则模拟（无 LLM 时的降级方案）──

_SIMULATED_RESPONSES = {
    'zhongshu': [
        '我认为此事需从全局着眼，分三步推进：先调研、再制定方案、最后交各部门执行。',
        '参考行业最佳实践，我建议先出一个详细的规划文档，提交风控部审阅后再定。',
        '*打开投影仪* 我已拟好初步方案，待风控总监审核、调度中心分派执行。',
    ],
    'menxia': [
        '我有几点疑虑：方案的风险评估似乎还不够充分，可行性存疑。',
        '坦率地说，此方案完整性不足，遗漏了一个关键环节——资源保障。',
        '*翻看评审文档* 这个时间线恐怕过于乐观，我建议审慎评估后再审批通过。',
    ],
    'shangshu': [
        '若方案通过，我立刻安排各部门分头执行——研发部负责实现，运维部保障运维。',
        '我来说说执行层面的分工：此事当由研发部主导，财务部配合数据支撑。',
        '交由我来协调！我会根据各部门职责逐一派发子任务。',
    ],
    'taizi': [
        '老板，我认为这是个创新的好机会，不妨大胆一些，先做最小可行方案验证。',
        '我觉得各位争论的焦点是执行节奏，不如先抓核心、小步快跑。',
        '这个方向太对了！但请各部门先各自评估本部门的落地难点再汇总。',
    ],
    'hubu': [
        '我先算算账……按当前Token用量和资源消耗，这个预算恐怕需要重新评估。',
        '从成本数据来看，我建议分期投入——先做MVP验证效果，再追加资源。',
        '*翻看报表* 我统计了近期各项开支指标，目前可支撑，但需严格控制在预算范围内。',
    ],
    'bingbu': [
        '我认为安全和回滚方案必须先行，万一出问题能快速止损回退。',
        '运维保障方面，部署流程、容器编排、日志监控必须到位再上线。',
        '效率优先！但安全底线不能破——权限管控和漏洞扫描须同步进行。',
    ],
    'xingbu': [
        '按照规范，此事需确保合规——代码审查、测试覆盖率、敏感信息排查缺一不可。',
        '我建议增加测试验收环节，质量是底线，不能因赶工而降低标准。',
        '*正色道* 风险评估不可敷衍：边界条件、异常处理、日志规范都需审计过关。',
    ],
    'gongbu': {
        '从技术架构来看，这个方案是可行的，但需考虑扩展性和模块化设计。',
        '我可以先搭个原型出来，快速验证技术可行性，再迭代完善。',
        '*打开IDE* 技术实现方面我有建议——API设计和数据结构需要先理清……',
    },
    'libu': [
        '我建议先拟一份正式文档，明确各方职责、验收标准和输出规范。',
        '此事需要记录在案，我来负责撰写方案文档和对外公告，确保规范统一。',
        '*打开文档* 已记录在案，我稍后整理成正式Release Notes发出。',
    ],
    'libu_hr': [
        '此事关键在于人员调配——需评估各部门目前的工作量和能力基线再做安排。',
        '各部门当前负荷不等，我建议调整协作规范，确保关键岗位有人盯进度。',
        '我可以协调人员轮岗并安排能力培训，保障团队高效协作。',
    ],
}

import random


def _simulated_discuss(session: dict, user_message: str = None, decree: str = None) -> list[dict]:
    """无 LLM 时的规则生成讨论内容。"""
    officials = session['officials']
    messages = []

    for o in officials:
        oid = o['id']
        pool = _SIMULATED_RESPONSES.get(oid, [])
        if isinstance(pool, set):
            pool = list(pool)
        if not pool:
            pool = ['我同意。', '我有不同看法。', '我需要再想想。']

        content = random.choice(pool)
        emotions = ['neutral', 'confident', 'thinking', 'amused', 'worried']

        # 如果老板发言了或有突发事件，调整回应
        if decree:
            content = f'*面色凝重* 情况有变，{content}'
        elif user_message:
            content = f'好的老板，{content}'

        messages.append({
            'official_id': oid,
            'name': o['name'],
            'content': content,
            'emotion': random.choice(emotions),
            'action': None,
        })

    return messages


def _serialize(session: dict) -> dict:
    return {
        'ok': True,
        'session_id': session['session_id'],
        'topic': session['topic'],
        'task_id': session.get('task_id', ''),
        'officials': session['officials'],
        'messages': session['messages'],
        'round': session['round'],
        'phase': session['phase'],
    }
