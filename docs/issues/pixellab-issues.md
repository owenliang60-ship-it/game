# PixelLab 相关问题记录

## 动画方向缺失 - 2026-02-05

**问题：** 8个动画中每个都有部分方向缺失，south-east方向全部缺失，总计只生成42/64方向（65%）

**上下文：** 为装甲战士生成8个动画（idle、hammer-strike、defend、charge、counter-stance、escape、take-hit、death），由于PixelLab并发限制（8 jobs），只能一个动画一个动画串行提交。即使如此，仍有部分方向未成功生成。

**可能原因：**
- PixelLab并发job限制（8个），每个动画8方向恰好占满
- 部分job可能因为排队超时或服务端问题而静默失败
- 下载ZIP时某些job可能还未完成（虽然get_character显示无pending）

**当前影响：**
- fight-stance-idle（反震）和 taking-punch（受击）最严重，只有4/8方向
- south-east方向全部缺失

**解决方案：** 待确认 - 可能的选项：
1. 重新提交缺失方向最多的动画
2. 游戏中对缺失方向做镜像翻转（east ↔ west可互换）
3. 接受6方向，游戏中只用主要方向

**教训：**
- PixelLab生成后应立即检查每个动画的完整性
- 考虑降为4方向（可节省生成时间，缺失风险更低）
- 下载ZIP前多等一段时间确保所有job真正完成

## 弓箭手动画方向缺失（系统性问题确认）- 2026-02-06

**问题：** 弓箭手8个动画只生成33/64方向（51.6%），比装甲战士（42/64=65.6%）更严重

**上下文：** 使用与装甲战士完全相同的参数和串行提交流程，每个动画等待完成后再提交下一个

**详细数据：**

| 动画 | 方向数 | 已有 | 缺失 |
|------|--------|------|------|
| breathing-idle | 5/8 | N, NW, W, SW, S | E, NE, SE |
| fireball | 4/8 | N, NW, SW, S | E, W, NE, SE |
| crouching | 3/8 | W, SW, S | N, NW, E, NE, SE |
| running-6-frames | 4/8 | N, NW, SW, S | E, W, NE, SE |
| running-slide | 4/8 | N, NW, SW, S | E, W, NE, SE |
| fight-stance-idle | 4/8 | NW, W, SW, S | N, E, NE, SE |
| taking-punch | 4/8 | N, NW, SW, S | E, W, NE, SE |
| falling-back-death | 5/8 | N, NW, W, SW, S | E, NE, SE |

**系统性规律（关键发现）：**

| 方向 | 成功率 | 状态 |
|------|--------|------|
| south | 8/8 | 100% 可靠 |
| south-west | 8/8 | 100% 可靠 |
| north-west | 7/8 | 87.5% 基本可靠 |
| north | 7/8 | 87.5% 基本可靠 |
| west | 4/8 | 50% 不稳定 |
| east | 0/8 | 0% 完全失败 |
| north-east | 0/8 | 0% 完全失败 |
| south-east | 0/8 | 0% 完全失败 |

**结论：**
- 这是 PixelLab 平台系统性问题，非随机失败
- "东侧"3个方向（east, north-east, south-east）100% 失败
- 两个角色（装甲战士+弓箭手）表现一致，排除偶然因素
- 镜像翻转方案（west→east）成为最可行的补救措施

**建议方案：**
1. 游戏中使用5个方向（S, SW, W, NW, N）+ 镜像生成东侧3个方向
2. 或简化为4方向（S, W, N, E=镜像W），降低复杂度

## 骑士动画结果（128px 表现不同）- 2026-02-06

**问题：** 骑士8个动画只生成27/64方向（42.2%），成功率最低，但方向分布规律不同

**上下文：** 骑士使用128px（非96px），default比例（非heroic），骑马角色

**详细数据：**

| 动画 | 方向数 | 已有 | 缺失 |
|------|--------|------|------|
| breathing-idle | 6/8 | S, SW, W, NW, N, NE | E, SE |
| cross-punch | 3/8 | S, SW, N | E, W, NE, NW, SE |
| fight-stance-idle | 3/8 | SW, W, NE | S, N, NW, E, SE |
| running-6-frames | 3/8 | S, NE, E | SW, W, NW, N, SE |
| crouching | 3/8 | E, W, NW | S, SW, N, NE, SE |
| taking-punch | 3/8 | E, W, NE | S, SW, N, NW, SE |
| falling-back-death | 3/8 | E, SW, W | S, N, NW, NE, SE |
| running-slide | 3/8 | S, W, NW | SW, N, NE, E, SE |

**128px vs 96px 对比：**

| 方向 | 弓箭手96px | 骑士128px | 变化 |
|------|-----------|-----------|------|
| south | 8/8 (100%) | 4/8 (50%) | 大幅下降 |
| south-west | 8/8 (100%) | 4/8 (50%) | 大幅下降 |
| west | 4/8 (50%) | 6/8 (75%) | 上升 |
| north-west | 7/8 (87%) | 3/8 (37%) | 大幅下降 |
| north | 7/8 (87%) | 2/8 (25%) | 大幅下降 |
| north-east | 0/8 (0%) | 4/8 (50%) | 大幅上升 |
| east | 0/8 (0%) | 4/8 (50%) | 大幅上升 |
| south-east | 0/8 (0%) | 0/8 (0%) | 不变，仍然全失败 |

**新发现：**
- 128px 骑士的 east 和 north-east 方向不再是 0%，反而到了 50%
- 但 south 和 north 这些原本可靠的方向反而变差了
- south-east 仍然是唯一 100% 失败的方向
- 方向成功率分布更随机，不像96px那样有清晰的"东侧全失败"规律
- 总成功率（42%）反而比弓箭手（52%）更低

**结论更新：**
- PixelLab 方向失败问题受 canvas 尺寸影响，128px 分布模式不同
- south-east 是唯一跨所有角色/尺寸 100% 失败的方向
- 用户已决定使用4方向（S, W, N, E=镜像W），用最近可用方向替代缺失的
- 这个策略对所有3个角色都适用
