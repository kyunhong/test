import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# ── 한글 폰트 ──────────────────────────────────────────────────
plt.rcParams['font.family'] = 'Malgun Gothic'   # Windows
# plt.rcParams['font.family'] = 'AppleGothic'   # Mac
plt.rcParams['axes.unicode_minus'] = False

# ════════════════════════════════════════════════════════════════
# 📊 강백호 실제 데이터 (2018~2025) 최종 확정
# ════════════════════════════════════════════════════════════════
years = np.array([2018, 2019, 2020, 2021,
                  2022, 2023, 2024, 2025])

batting_avg = np.array([0.290, 0.336, 0.330, 0.347,
                        0.245, 0.265, 0.289, 0.265])
home_runs   = np.array([29,    13,    23,    16,
                         6,     8,    26,    15   ])
rbi         = np.array([84,    65,    89,   102,
                        29,    39,    96,    61   ])
ops         = np.array([0.880, 0.911, 0.955, 0.971,
                        0.683, 0.763, 0.840, 0.825])
woba        = np.array([0.389, 0.405, 0.413, 0.425,
                        0.299, 0.339, 0.372, 0.360])
war         = np.array([3.94,  5.14,  6.04,  5.85,
                        0.20,  1.16,  3.10,  1.82])

# 회귀용 X축
X          = np.arange(len(years))          # 0~7
X_pred     = np.array([8])                  # 2026
x_line     = np.linspace(0, 8.8, 300)
years_line = x_line + 2018

# ════════════════════════════════════════════════════════════════
# 📐 회귀 모델
# ════════════════════════════════════════════════════════════════

def lin_reg(x, y, x_pred, x_line):
    sl, ic, r, p, se = stats.linregress(x, y)
    y_line = sl * x_line + ic
    y_pred = sl * x_pred[0] + ic
    # 예측 신뢰구간
    n  = len(x)
    ci = se * 1.96 * np.sqrt(
             1 + 1/n + (x_pred[0]-np.mean(x))**2
             / np.sum((x-np.mean(x))**2))
    return sl, ic, r**2, p, y_line, y_pred, ci

def poly2_reg(x, y, x_pred, x_line):
    c      = np.polyfit(x, y, 2)
    pf     = np.poly1d(c)
    y_line = pf(x_line)
    y_pred = pf(x_pred[0])
    yhat   = pf(x)
    ss_res = np.sum((y - yhat)**2)
    ss_tot = np.sum((y - np.mean(y))**2)
    r2     = 1 - ss_res / ss_tot
    return c, r2, y_line, y_pred

def moving_avg(y, w=3):
    return float(np.mean(y[-w:]))

def ensemble(yl, r2l, yp, r2p, yma, w_ma=0.4):
    w = r2l + r2p + w_ma
    return (yl * r2l + yp * r2p + yma * w_ma) / w

def run_all(y):
    sl, ic, r2l, pv, yl_line, yl_pred, ci = \
        lin_reg(X, y, X_pred, x_line)
    c, r2p, yp_line, yp_pred = \
        poly2_reg(X, y, X_pred, x_line)
    yma  = moving_avg(y, 3)
    ens  = ensemble(yl_pred, r2l, yp_pred, r2p, yma)
    return dict(sl=sl, ic=ic, r2l=r2l, r2p=r2p, pv=pv,
                yl_line=yl_line, yp_line=yp_line,
                yl_pred=yl_pred, yp_pred=yp_pred,
                yma=yma, ens=ens, ci=ci)

R_ops  = run_all(ops)
R_avg  = run_all(batting_avg)
R_hr   = run_all(home_runs)
R_rbi  = run_all(rbi)
R_woba = run_all(woba)
R_war  = run_all(war)

# ════════════════════════════════════════════════════════════════
# 🎨 레이아웃
# ════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(22, 19))
fig.patch.set_facecolor('#0d1117')
gs  = gridspec.GridSpec(3, 3, figure=fig,
                        hspace=0.52, wspace=0.36)

ax_main = fig.add_subplot(gs[0, :])
ax_avg  = fig.add_subplot(gs[1, 0])
ax_hr   = fig.add_subplot(gs[1, 1])
ax_war  = fig.add_subplot(gs[1, 2])
ax_rbi  = fig.add_subplot(gs[2, 0])
ax_woba = fig.add_subplot(gs[2, 1])
ax_tbl  = fig.add_subplot(gs[2, 2])

all_axes = [ax_main, ax_avg, ax_hr, ax_war,
            ax_rbi,  ax_woba, ax_tbl]
for ax in all_axes:
    ax.set_facecolor('#161b22')
    ax.tick_params(colors='#c9d1d9', labelsize=9)
    for sp in ax.spines.values():
        sp.set_edgecolor('#30363d')
    ax.xaxis.label.set_color('#c9d1d9')
    ax.yaxis.label.set_color('#c9d1d9')
    ax.title.set_color('#e6edf3')

# 색상
C_DATA = '#58a6ff'
C_LIN  = '#f85149'
C_POLY = '#ffa657'
C_ENS  = '#3fb950'
C_PT   = '#ffa657'
C_MEAN = '#3fb950'
C_CI   = '#1f6feb'

# X축 레이블
xtick_pos    = list(years) + [2026]
xtick_labels = [f"'{str(y)[2:]}" for y in years] + ["'26\n예측"]

# ── 구간 배경 ────────────────────────────────────────────────
def add_bg(ax):
    # 전성기
    ax.axvspan(2017.5, 2021.5, alpha=0.06, color='#3fb950', zorder=0)
    # 부진기
    ax.axvspan(2021.5, 2023.5, alpha=0.08, color='#f85149', zorder=0)
    # 반등기
    ax.axvspan(2023.5, 2025.5, alpha=0.06, color='#58a6ff', zorder=0)
    # 예측 구간
    ax.axvspan(2025.5, 2027.0, alpha=0.08, color='#3fb950', zorder=0)
    ax.axvline(2025.5, color='#484f58', lw=1.2,
               linestyle='--', alpha=0.8, zorder=1)

# ════════════════════════════════════════════════════════════════
# [1] 메인 - OPS
# ════════════════════════════════════════════════════════════════
add_bg(ax_main)
mean_ops = np.mean(ops)

# 신뢰구간 띠
ax_main.fill_between(
    years_line,
    R_ops['yl_line'] - R_ops['ci'],
    R_ops['yl_line'] + R_ops['ci'],
    alpha=0.10, color=C_CI, label='선형 95% 신뢰구간', zorder=2)

# 평균 기준 색 채우기
ax_main.fill_between(years, ops, mean_ops,
                     where=(ops >= mean_ops),
                     alpha=0.22, color='#3fb950', zorder=2)
ax_main.fill_between(years, ops, mean_ops,
                     where=(ops <  mean_ops),
                     alpha=0.22, color='#f85149', zorder=2)

# 실제 데이터 선
ax_main.plot(years, ops, 'o-',
             color=C_DATA, lw=2.8, markersize=11,
             markerfacecolor=C_PT, markeredgecolor='white',
             markeredgewidth=1.6, label='실제 OPS', zorder=6)

# 회귀선
ax_main.plot(years_line, R_ops['yl_line'], '--',
             color=C_LIN, lw=2.0,
             label=f'선형 회귀  R²={R_ops["r2l"]:.3f}', zorder=4)
ax_main.plot(years_line, R_ops['yp_line'], '-.',
             color=C_POLY, lw=2.0,
             label=f'2차 다항   R²={R_ops["r2p"]:.3f}', zorder=4)

# 평균선
ax_main.axhline(mean_ops, color=C_MEAN, lw=1.4,
                linestyle=':', alpha=0.9,
                label=f'8시즌 평균 OPS = {mean_ops:.3f}', zorder=3)

# 2026 예측
ens_ops = R_ops['ens']
p_min   = min(R_ops['yl_pred'], R_ops['yp_pred'], R_ops['yma'])
p_max   = max(R_ops['yl_pred'], R_ops['yp_pred'], R_ops['yma'])

ax_main.fill_between([2025.5, 2026.8],
                     [p_min - R_ops['ci']]*2,
                     [p_max + R_ops['ci']]*2,
                     alpha=0.18, color=C_ENS, label='예측 범위', zorder=3)

ax_main.plot(2026, R_ops['yl_pred'], 'v',
             color=C_LIN,  markersize=10, zorder=8,
             label=f'선형 예측: {R_ops["yl_pred"]:.3f}')
ax_main.plot(2026, R_ops['yp_pred'], 's',
             color=C_POLY, markersize=10, zorder=8,
             label=f'다항 예측: {R_ops["yp_pred"]:.3f}')
ax_main.plot(2026, ens_ops, '*',
             color=C_ENS,  markersize=20, zorder=9,
             label=f'앙상블 예측: {ens_ops:.3f}')
ax_main.plot([2025, 2026], [ops[-1], ens_ops],
             color=C_ENS, lw=2.0, linestyle='--',
             alpha=0.85, zorder=7)

# 데이터 레이블
for yr, val in zip(years, ops):
    off = 0.025 if val >= mean_ops else -0.035
    ax_main.text(yr, val + off, f'{val:.3f}',
                 ha='center', fontsize=9.5,
                 fontweight='bold', color='#e6edf3')

# 앙상블 레이블
ax_main.annotate(f'2026 예측\n★ {ens_ops:.3f}',
                 xy=(2026, ens_ops),
                 xytext=(2024.8, ens_ops + 0.07),
                 arrowprops=dict(arrowstyle='->', color=C_ENS, lw=1.8),
                 fontsize=10, color=C_ENS, fontweight='bold')

# 구간 레이블
ax_main.text(2019.0, 0.638, '🔥 전성기', fontsize=9,
             color='#3fb950', fontweight='bold')
ax_main.text(2022.0, 0.638, '📉 부진기', fontsize=9,
             color='#f85149', fontweight='bold')
ax_main.text(2024.0, 0.638, '📈 반등기', fontsize=9,
             color='#58a6ff', fontweight='bold')
ax_main.text(2025.7, 0.638, '🔮 예측', fontsize=9,
             color='#3fb950', fontweight='bold')

# 주요 포인트 주석
ax_main.annotate('커리어하이\n.971',
                 xy=(2021, 0.971), xytext=(2020.0, 1.022),
                 arrowprops=dict(arrowstyle='->', color=C_PT, lw=1.5),
                 fontsize=9, color=C_PT, fontweight='bold')
ax_main.annotate('최저점\n.683',
                 xy=(2022, 0.683), xytext=(2022.3, 0.648),
                 arrowprops=dict(arrowstyle='->', color='#f85149', lw=1.5),
                 fontsize=9, color='#f85149', fontweight='bold')

ax_main.set_title(
    '강백호 OPS 추이 및 2026 시즌 예측  (2018~2025 실제 기록 기반)',
    fontsize=14, fontweight='bold', pad=14)
ax_main.set_xlim(2017.2, 2027.2)
ax_main.set_ylim(0.62, 1.06)
ax_main.set_xticks(xtick_pos)
ax_main.set_xticklabels(xtick_labels, fontsize=9.5)
ax_main.set_ylabel('OPS', fontsize=11)
ax_main.legend(loc='upper left', fontsize=8.0,
               facecolor='#21262d', edgecolor='#30363d',
               labelcolor='#c9d1d9', ncol=3)
ax_main.grid(True, alpha=0.12, color='#30363d')

ax_main.text(0.76, 0.07,
             f'p-value = {R_ops["pv"]:.3f}',
             transform=ax_main.transAxes,
             fontsize=9, color='#e6edf3',
             bbox=dict(boxstyle='round', facecolor='#21262d',
                       edgecolor='#f85149', alpha=0.85))

# ════════════════════════════════════════════════════════════════
# 서브 그래프 공통 드로우
# ════════════════════════════════════════════════════════════════
def draw_sub(ax, y_data, R, title, ylabel, ylim,
             color, is_bar=False, fmt_float=True):
    add_bg(ax)
    mean_v = np.mean(y_data)
    rng    = ylim[1] - ylim[0]

    if is_bar:
        # 실제 데이터 막대
        ax.bar(years, y_data, color=color, alpha=0.70,
               width=0.55, edgecolor='#8b949e', lw=0.9,
               label='실제', zorder=3)
        for yr, v in zip(years, y_data):
            ax.text(yr, v + rng*0.02, f'{v:.0f}',
                    ha='center', fontsize=8.5,
                    color='#e6edf3', fontweight='bold')
    else:
        ax.fill_between(years, y_data, mean_v,
                        alpha=0.15, color=color, zorder=2)
        ax.plot(years, y_data, 'o-', color=color, lw=2,
                markersize=8, markerfacecolor=C_PT,
                markeredgecolor='white', markeredgewidth=1.2,
                label='실제', zorder=5)
        for yr, v in zip(years, y_data):
            lbl = f'{v:.3f}' if fmt_float else f'{v:.2f}'
            ax.text(yr, v + rng*0.04, lbl,
                    ha='center', fontsize=7.8, color='#c9d1d9')

    # 회귀선
    ax.plot(years_line, R['yl_line'], '--',
            color=C_LIN, lw=1.6,
            label=f'선형 R²={R["r2l"]:.2f}', zorder=4)
    ax.plot(years_line, R['yp_line'], '-.',
            color=C_POLY, lw=1.6,
            label=f'다항 R²={R["r2p"]:.2f}', zorder=4)
    ax.axhline(mean_v, color=C_MEAN, lw=1.2,
               linestyle=':', alpha=0.8,
               label=f'평균={mean_v:.2f}', zorder=3)

    # 2026 예측 포인트
    ax.plot(2026, R['yl_pred'], 'v', color=C_LIN,
            markersize=9, zorder=8)
    ax.plot(2026, R['yp_pred'], 's', color=C_POLY,
            markersize=9, zorder=8)
    ax.plot(2026, R['ens'],     '*', color=C_ENS,
            markersize=14, zorder=9)
    ax.plot([2025, 2026], [y_data[-1], R['ens']],
            color=C_ENS, lw=1.8, linestyle='--',
            alpha=0.85, zorder=7)

    # 앙상블 수치 레이블
    lbl_ens = (f'{R["ens"]:.3f}' if fmt_float and R['ens'] < 10
               else f'{R["ens"]:.1f}')
    ax.text(2026, R['ens'] + rng*0.06, lbl_ens,
            ha='center', fontsize=9,
            color=C_ENS, fontweight='bold')

    # 예측 범위 띠
    p_lo = min(R['yl_pred'], R['yp_pred'], R['yma']) - R['ci']*0.5
    p_hi = max(R['yl_pred'], R['yp_pred'], R['yma']) + R['ci']*0.5
    ax.fill_between([2025.5, 2026.8], [p_lo]*2, [p_hi]*2,
                    alpha=0.18, color=C_ENS, zorder=2)

    ax.set_title(title, fontsize=10.5, fontweight='bold')
    ax.set_ylabel(ylabel, fontsize=9)
    ax.set_xlim(2017.2, 2027.2)
    ax.set_ylim(ylim)
    ax.set_xticks(xtick_pos)
    ax.set_xticklabels(xtick_labels, fontsize=7.5)
    ax.legend(fontsize=7.2, facecolor='#21262d',
              edgecolor='#30363d', labelcolor='#c9d1d9',
              loc='upper right')
    ax.grid(True, alpha=0.12, color='#30363d')

    # 앙상블 배지
    badge = (f'2026 예측: {R["ens"]:.3f}'
             if fmt_float and R['ens'] < 10
             else f'2026 예측: {R["ens"]:.1f}')
    ax.text(0.04, 0.91, badge,
            transform=ax.transAxes, fontsize=8.2,
            color=C_ENS, fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='#0d3d0d',
                      edgecolor='#3fb950', alpha=0.9))

# ── 서브 그래프 그리기 ─────────────────────────────────────────
draw_sub(ax_avg,  batting_avg, R_avg,
         '타율  회귀분석 + 2026 예측', '타율',
         (0.20, 0.40), C_DATA, is_bar=False, fmt_float=True)

draw_sub(ax_hr,   home_runs,   R_hr,
         '홈런  회귀분석 + 2026 예측', '홈런 (개)',
         (-1,   36),  '#1f6feb', is_bar=True,  fmt_float=False)

draw_sub(ax_war,  war,         R_war,
         'WAR  회귀분석 + 2026 예측', 'WAR',
         (-0.5, 7.5), '#bc8cff', is_bar=False, fmt_float=False)

draw_sub(ax_rbi,  rbi,         R_rbi,
         '타점  회귀분석 + 2026 예측', '타점',
         (15,   118), '#1f6feb', is_bar=True,  fmt_float=False)

draw_sub(ax_woba, woba,        R_woba,
         'wOBA  회귀분석 + 2026 예측', 'wOBA',
         (0.26, 0.46), '#ffa657', is_bar=False, fmt_float=True)

# ════════════════════════════════════════════════════════════════
# [6] 예측 요약 테이블
# ════════════════════════════════════════════════════════════════
ax_tbl.axis('off')

headers = ['지표', '2024\n실제', '2025\n실제',
           '선형\n예측', '다항\n예측',
           '이동\n평균', '앙상블\n★최종']

def fmt(v, is_float):
    return f'{v:.3f}' if is_float else f'{v:.1f}'

rows = [
    ['타율',  '.289', '.265',
     fmt(R_avg['yl_pred'],  True),
     fmt(R_avg['yp_pred'],  True),
     fmt(R_avg['yma'],      True),
     fmt(R_avg['ens'],      True)],

    ['홈런',  '26', '15',
     fmt(R_hr['yl_pred'],   False),
     fmt(R_hr['yp_pred'],   False),
     fmt(R_hr['yma'],       False),
     fmt(R_hr['ens'],       False)],

    ['타점',  '96', '61',
     fmt(R_rbi['yl_pred'],  False),
     fmt(R_rbi['yp_pred'],  False),
     fmt(R_rbi['yma'],      False),
     fmt(R_rbi['ens'],      False)],

    ['OPS',   '.840', '.825',
     fmt(R_ops['yl_pred'],  True),
     fmt(R_ops['yp_pred'],  True),
     fmt(R_ops['yma'],      True),
     fmt(R_ops['ens'],      True)],

    ['wOBA',  '.372', '.360',
     fmt(R_woba['yl_pred'], True),
     fmt(R_woba['yp_pred'], True),
     fmt(R_woba['yma'],     True),
     fmt(R_woba['ens'],     True)],

    ['WAR',   '3.10', '1.82',
     fmt(R_war['yl_pred'],  False),
     fmt(R_war['yp_pred'],  False),
     fmt(R_war['yma'],      False),
     fmt(R_war['ens'],      False)],
]

tbl = ax_tbl.table(
    cellText  = rows,
    colLabels = headers,
    cellLoc   = 'center',
    loc       = 'center',
    bbox      = [0, 0.30, 1, 0.66]
)
tbl.auto_set_font_size(False)
tbl.set_fontsize(8.8)

for j in range(7):
    tbl[0, j].set_facecolor('#21262d')
    tbl[0, j].set_text_props(color='#e6edf3', fontweight='bold')

for i in range(1, 7):
    for j in range(7):
        if j == 6:
            tbl[i, j].set_facecolor('#0d3d0d')
            tbl[i, j].set_text_props(color='#3fb950',
                                      fontweight='bold', fontsize=9.5)
        elif j in [3, 4, 5]:
            tbl[i, j].set_facecolor('#1c2128')
            tbl[i, j].set_text_props(color='#c9d1d9')
        else:
            tbl[i, j].set_facecolor('#161b22')
            tbl[i, j].set_text_props(color='#8b949e')

ax_tbl.set_title('⚾  2026 시즌 예측 요약',
                 fontsize=11, fontweight='bold',
                 color='#e6edf3', pad=8)

note = (
    "📌 앙상블 = 선형·다항·이동평균\n"
    "   R² 가중 평균으로 최종 산출\n\n"
    "📌 이동평균 = 최근 3시즌 기준\n"
    "   (2023·2024·2025)\n\n"
    "⚠  부상·팀전력·상대 전략 미반영\n"
    "⚠  통계적 추정치 (참고용)"
)
ax_tbl.text(0.5, 0.26, note,
            transform=ax_tbl.transAxes,
            fontsize=8.2, color='#8b949e',
            ha='center', va='top',
            bbox=dict(boxstyle='round', facecolor='#21262d',
                      edgecolor='#30363d', alpha=0.85))

# ── 전체 제목 ──────────────────────────────────────────────────
fig.suptitle(
    '⚾  강백호 KBO 실제 기록 기반 회귀분석 및 2026 시즌 예측  (2018~2025)',
    fontsize=16, fontweight='bold',
    color='#e6edf3', y=0.998)

plt.savefig('강백호_최종_회귀분석_2026예측.png',
            dpi=150, bbox_inches='tight',
            facecolor='#0d1117')
plt.show()

# ════════════════════════════════════════════════════════════════
# 📋 콘솔 출력
# ════════════════════════════════════════════════════════════════
print("\n" + "═"*68)
print("      강백호 2026 시즌 예측 결과  (실제 데이터 최종 확정판)")
print("═"*68)
print(f"{'지표':<6} │ {'선형':>8} │ {'다항':>8} │ "
      f"{'이동평균':>8} │ {'앙상블':>8}")
print("─"*68)
items = [('타율',  R_avg,  True ),
         ('홈런',  R_hr,   False),
         ('타점',  R_rbi,  False),
         ('OPS',   R_ops,  True ),
         ('wOBA',  R_woba, True ),
         ('WAR',   R_war,  False)]
for name, R, is_f in items:
    f = '.3f' if is_f else '.1f'
    print(f"{name:<6} │ {R['yl_pred']:>8{f}} │ "
          f"{R['yp_pred']:>8{f}} │ "
          f"{R['yma']:>8{f}} │ "
          f"{R['ens']:>8{f}}")
print("═"*68)