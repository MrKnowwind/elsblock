# Orbi Lock Fall — Phaser H5

Unity 参考项目 `D:\unity-pro\OrbiLockFall` 的 Phaser H5 重制版。参考工程保持只读；本项目复用了其中的正式美术和音频，但不包含任何广告 SDK、广告结算或激励复活逻辑。

## 已接入

- 1080 × 2160 竖屏自适应 Canvas，复刻主菜单、模式选择、HUD、18 行井体视图和底部控制台布局
- Survival、Gold Target、Endless 三种模式与逐级解锁
- 10 × 15 权威棋盘 + 3 行生成区、13 种方块变体、7-Bag 与辅助落块选择
- Tracking → Locked → Falling → Commit、Ghost 落点、锁定光柱和数字倒计时
- 球体左右移动、双跳、Coyote Time、Jump Buffer、空中 Dash、Dash 冷却
- 完整消行、同时多行、折叠动画、Combo、分数、目标磁芯
- 红线累计危险、载荷越线、四向挤压死亡
- 暂停、重开、返回主菜单、教程完成、胜负结算、本地最佳纪录
- 键盘与多点触控：A/D 或方向键移动，Space/W 跳跃，Shift/K 冲刺，Esc 暂停，R 重开
- Unity 原音效、环境声、震动开关；无广告、无内购，原激励复活按钮改为直接发放奖励

## 开发

```bash
npm install
npm run dev
```

默认地址：`http://localhost:4175/`

## 验证

```bash
npm test
npm run build
```
