# AI策略设计文档

> 版本: v0.1 | 日期: 2026-02-03
> 状态: 设计稿，待讨论

---

## 一、设计原则

### 1.1 核心理念

**博弈是游戏的根本**。AI需要：
1. 能"读"玩家的意图
2. 能被玩家"读"（有迹可循）
3. 保持不可预测性（随机因素）

### 1.2 目标体验

- 玩家感觉AI"在想事情"，不是乱选
- 玩家能通过观察找到AI的"套路"
- 但AI偶尔会"出其不意"
- 不同难度的AI强度不同

---

## 二、博弈决策系统

### 2.1 决策流程

```
1. 枚举所有可行动作（考虑MP/HP/RAGE限制）
2. 对每个动作，计算期望收益
3. 基于期望收益，用softmax选择动作
4. 如果动作需要目标，选择最优目标
```

### 2.2 期望收益计算

对于每个动作A：

```
期望收益(A) = Σ P(对手动作i) × 收益(A, 对手动作i)
```

其中：
- `P(对手动作i)` = 预测对手选择动作i的概率
- `收益(A, 对手动作i)` = 我选A、对手选i时的净收益

### 2.3 收益评估函数

```
收益 = 造成的伤害 × 伤害权重
     - 受到的伤害 × 受伤权重
     - 消耗的资源 × 资源权重
     + 状态收益（如顶盾的防御价值）
```

**权重参数**（可调节难度）：

| 参数 | 简单AI | 普通AI | 困难AI |
|------|--------|--------|--------|
| 伤害权重 | 1.0 | 1.0 | 1.0 |
| 受伤权重 | 0.8 | 1.0 | 1.2 |
| 资源权重 | 0.5 | 1.0 | 1.5 |

---

## 三、对手行为预测

### 3.1 基础概率模型

没有历史数据时，使用默认概率分布：

```
默认动作概率：
- 普攻: 25%
- 防御: 20%
- 逃跑: 20%
- 技能: 35%（按可用技能平分）
```

### 3.2 状态修正

根据对手当前状态调整预测：

```python
def adjust_prediction(opponent, base_probs):
    probs = base_probs.copy()

    # HP低时更可能逃跑/防御
    if opponent.hp_percent < 0.3:
        probs['逃跑'] *= 1.5
        probs['防御'] *= 1.3

    # MP低时更可能普攻
    if opponent.mp_percent < 0.2:
        probs['普攻'] *= 2.0
        probs['技能'] *= 0.3

    # 怒气满时更可能用大招
    if opponent.rage >= 80:
        probs['大招'] *= 2.0

    # 归一化
    return normalize(probs)
```

### 3.3 历史行为学习

记录对手最近N回合的行为，调整预测：

```python
def learn_from_history(opponent, history, base_probs):
    if len(history) < 3:
        return base_probs

    probs = base_probs.copy()

    # 统计对手历史动作频率
    action_counts = count_actions(history[-5:])  # 最近5回合

    # 混合：70%基础 + 30%历史
    for action, count in action_counts.items():
        historical_prob = count / len(history[-5:])
        probs[action] = 0.7 * probs[action] + 0.3 * historical_prob

    return normalize(probs)
```

### 3.4 反读心机制

如果检测到对手在"反读心"（连续相同动作后突然变化），AI也会调整：

```python
def detect_pattern_break(history):
    if len(history) < 4:
        return False

    # 前3回合相同，第4回合不同 = 可能在反读心
    if history[-4] == history[-3] == history[-2] != history[-1]:
        return True

    return False
```

---

## 四、动作选择

### 4.1 Softmax选择

基于期望收益，用softmax引入随机性：

```python
def select_action(actions, expected_values, temperature=1.0):
    """
    temperature:
    - 0.5 = 更确定性，倾向选最优
    - 1.0 = 平衡
    - 2.0 = 更随机
    """
    # 计算softmax概率
    exp_values = [exp(v / temperature) for v in expected_values]
    total = sum(exp_values)
    probs = [v / total for v in exp_values]

    # 按概率随机选择
    return random.choices(actions, weights=probs)[0]
```

**难度对应的temperature**：

| 难度 | Temperature | 效果 |
|------|-------------|------|
| 简单 | 2.0 | 经常随机，容易被打 |
| 普通 | 1.0 | 平衡 |
| 困难 | 0.5 | 几乎总选最优 |

### 4.2 强制随机

即使困难AI，也保留5-10%的"意外"选择：

```python
def add_surprise(action, all_actions, surprise_rate=0.05):
    if random.random() < surprise_rate:
        return random.choice(all_actions)
    return action
```

---

## 五、目标选择

### 5.1 单目标技能

评估每个可能目标的价值：

```python
def select_target(skill, enemies):
    scores = []
    for enemy in enemies:
        score = evaluate_target(skill, enemy)
        scores.append(score)

    # 也用softmax选择，但temperature较低（更确定）
    return softmax_select(enemies, scores, temperature=0.5)

def evaluate_target(skill, enemy):
    score = 0

    # 基础：能造成的伤害
    damage = calculate_damage(skill, enemy)
    score += damage

    # 能否击杀？高优先
    if damage >= enemy.hp:
        score += 100

    # 低HP目标优先
    score += (1 - enemy.hp_percent) * 30

    # 高威胁目标优先（下回合可能放大招）
    if enemy.rage >= 60:
        score += 20

    return score
```

### 5.2 多人战策略

三人战中的特殊考虑：

```python
def multiplayer_strategy(self, enemies):
    # 评估当前局势
    threats = [evaluate_threat(e) for e in enemies]

    # 策略1: 集火最弱的（快速减少敌人数量）
    weakest = min(enemies, key=lambda e: e.hp)

    # 策略2: 集火最强的（消除最大威胁）
    strongest = max(enemies, key=lambda e: evaluate_threat(e))

    # 策略3: 让他们互打（保存实力）
    # 如果两个敌人HP都高，自己HP低，考虑防御/逃跑

    # 根据自身状态选择策略
    if self.hp_percent < 0.3:
        return 'survive'  # 优先生存
    elif weakest.hp_percent < 0.3:
        return 'finish', weakest  # 收割残血
    else:
        return 'damage', strongest  # 打最强的
```

---

## 六、博弈矩阵示例

### 6.1 骑士 vs 弓箭手 单回合

骑士视角的收益矩阵（正=对骑士有利）：

| 骑士\弓箭手 | 普攻 | 防御 | 逃跑 | 太阳之弓 |
|-------------|------|------|------|----------|
| **普攻** | +10 | +5 | -5 | +10 |
| **防御** | +5 | 0 | -10 | +15 |
| **逃跑** | +15 | -10 | 0 | +20 |
| **升龙击** | +30 | +25 | +10 | +30 |
| **追砍** | -10 | -15 | +40 | -10 |
| **冲锋** | +40 | +35 | -20 | +40 |
| **太阳之弓** | +20 | +15 | +10 | +30 |

**收益计算说明**：
- 普攻vs普攻：骑士ATK30 > 弓箭手ATK20，骑士小赚
- 追砍vs逃跑：追砍×4伤害，大赚
- 冲锋vs逃跑：冲锋伤害归0，大亏
- 太阳之弓vs太阳之弓：都是技能，都触发×2，但骑士先手，优势

### 6.2 期望收益计算示例

假设AI预测弓箭手动作概率：
- 普攻: 20%
- 防御: 25%
- 逃跑: 30%
- 太阳之弓: 25%

骑士各动作期望收益：
```
普攻:     0.2×10 + 0.25×5 + 0.3×(-5) + 0.25×10 = 5.25
升龙击:   0.2×30 + 0.25×25 + 0.3×10 + 0.25×30 = 22.25
追砍:     0.2×(-10) + 0.25×(-15) + 0.3×40 + 0.25×(-10) = 4.25
冲锋:     0.2×40 + 0.25×35 + 0.3×(-20) + 0.25×40 = 20.75
太阳之弓: 0.2×20 + 0.25×15 + 0.3×10 + 0.25×30 = 18.25
```

→ 升龙击期望最高(22.25)，但冲锋(20.75)和太阳之弓(18.25)也不错

用softmax(temperature=1.0)：
```
升龙击: 35%
冲锋:   28%
太阳之弓: 22%
追砍:   8%
普攻:   7%
```

---

## 七、难度设计

### 7.1 简单难度

- Temperature: 2.0（更随机）
- 不学习历史行为
- 目标选择随机
- 资源管理差（可能MP用光了还想放技能）

### 7.2 普通难度

- Temperature: 1.0
- 学习最近3回合历史
- 目标选择有偏向（优先低HP）
- 基础资源管理

### 7.3 困难难度

- Temperature: 0.5
- 学习最近5回合历史
- 反读心机制
- 会预判技能条件（知道你可能逃跑就用追砍）
- 精细资源管理（留MP应对关键时刻）

---

## 八、待讨论问题

1. **博弈深度**：AI需要往前看几步？当前设计是1步，要不要2步？

2. **收益矩阵**：需要手动设定每个技能组合的收益值，还是自动计算？

3. **性格系统**：是否需要让不同AI有"性格"（激进/保守/狡猾）？

4. **学习速度**：AI多快能"学会"玩家的套路？

5. **三人战策略**：AI会不会"联合"打玩家？还是更像各自为战？

---

## 九、实现优先级

| 优先级 | 功能 | 1.0版本 |
|--------|------|---------|
| P0 | 基础博弈矩阵 | ✓ |
| P0 | Softmax选择 | ✓ |
| P0 | 状态修正预测 | ✓ |
| P1 | 历史行为学习 | ✓ |
| P1 | 目标选择逻辑 | ✓ |
| P2 | 反读心机制 | 可选 |
| P2 | 难度分级 | 可选 |
| P3 | 性格系统 | 1.0后 |

---

*文档待讨论，确认后可并入PRD或单独作为AI设计文档*
