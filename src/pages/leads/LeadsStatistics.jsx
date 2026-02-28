import React, { useState, useEffect, useMemo } from 'react';
import { leadService } from '../../services/leads';
import { AmBarChart, AmPieChart, AmAreaChart, AmComposedChart } from '../../components/AmCharts';
import FunnelChart from '../../components/FunnelChart';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

// ── Theme hook ──
const useThemeColors = () => {
    const [colors, setColors] = useState({});
    useEffect(() => {
        const update = () => {
            const s = getComputedStyle(document.documentElement);
            setColors({
                textPrimary: s.getPropertyValue('--text-primary').trim() || '#0f172a',
                textSecondary: s.getPropertyValue('--text-secondary').trim() || '#64748b',
                bgSecondary: s.getPropertyValue('--bg-secondary').trim() || '#ffffff',
                borderColor: s.getPropertyValue('--border-color').trim() || '#e2e8f0',
            });
        };
        update();
        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);
    return colors;
};

// ── Themed Tooltip ──
const ThemedTooltip = ({ active, payload, label, themeColors }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{
            background: themeColors.bgSecondary, border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: themeColors.textPrimary,
        }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>{label}</div>
            {payload.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: entry.color, display: 'inline-block' }}></span>
                    <span style={{ color: themeColors.textSecondary }}>{entry.name}:</span>
                    <span style={{ fontWeight: '600' }}>{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// ── amCharts Funnel Renderer ──

// Mini amCharts funnel (used inside the interactive drill-down)
const AmFunnel = ({ items, chartId, height = 380, onSliceClick }) => {
    const chartRef = React.useRef(null);
    const rootRef = React.useRef(null);

    React.useLayoutEffect(() => {
        if (!chartRef.current || !items || items.length === 0) return;

        // Filter out 0-value items
        const validItems = items.filter(item => (item.count || 0) > 0);
        if (validItems.length === 0) return;

        const root = am5.Root.new(chartRef.current);
        rootRef.current = root;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themes = [am5themes_Animated.new(root)];
        if (isDark) themes.push(am5themes_Dark.new(root));
        root.setThemes(themes);

        const chart = root.container.children.push(
            am5percent.SlicedChart.new(root, {
                layout: root.verticalLayout,
                paddingTop: 0,
                paddingBottom: 0,
            })
        );

        // Detect disparity
        const maxVal = Math.max(...validItems.map(i => i.count || 0));
        const minVal = Math.min(...validItems.map(i => i.count || 0));
        const hasDisparity = maxVal > 0 && (minVal / maxVal) < 0.05;

        const series = chart.series.push(
            am5percent.FunnelSeries.new(root, {
                alignLabels: hasDisparity,
                orientation: 'vertical',
                valueField: 'value',
                categoryField: 'category',
                bottomRatio: 0.15,
            })
        );

        series.slices.template.setAll({
            strokeWidth: 0,
            strokeOpacity: 0,
            fillOpacity: 0.9,
            cornerRadius: 4,
            tooltipText: '{category}: {value}',
        });

        series.slices.template.states.create('hover', {
            fillOpacity: 1,
            scale: 1.02,
        });

        if (onSliceClick) {
            series.slices.template.setAll({ cursorOverStyle: 'pointer' });
            series.slices.template.events.on('click', (ev) => {
                const idx = series.dataItems.indexOf(ev.target.dataItem);
                onSliceClick(idx);
            });
        }

        // Labels: external when disparity, inside when balanced
        if (hasDisparity) {
            series.labels.template.setAll({
                fontSize: 11,
                fontWeight: '600',
                fill: am5.color(isDark ? 0xe2e8f0 : 0x334155),
                text: '{category}: {value}',
                populateText: true,
            });
            series.ticks.template.setAll({
                stroke: am5.color(isDark ? 0x475569 : 0xcbd5e1),
                strokeWidth: 1,
                strokeDasharray: [3, 3],
            });
        } else {
            series.labels.template.setAll({
                fontSize: 12,
                fontWeight: '600',
                fill: am5.color(0xffffff),
                text: '{category}: {value}',
                textAlign: 'center',
                populateText: true,
            });
            series.ticks.template.setAll({ forceHidden: true });
        }

        // Minimum visual value for thin slices
        const minVisual = hasDisparity ? Math.max(1, Math.round(maxVal * 0.04)) : 0;
        const chartData = validItems.map((item) => ({
            value: Math.max(item.count || 0, minVisual),
            realValue: item.count || 0,
            category: item.name,
            sliceSettings: { fill: am5.color(item.color) },
        }));

        // Show real values in labels and tooltips
        series.labels.template.adapters.add('text', (text, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.realValue !== undefined) {
                return `${d.dataContext.category}: ${d.dataContext.realValue}`;
            }
            return text;
        });

        series.slices.template.adapters.add('tooltipText', (text, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.realValue !== undefined) {
                return `${d.dataContext.category}: ${d.dataContext.realValue}`;
            }
            return text;
        });

        series.slices.template.adapters.add('fill', (fill, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.sliceSettings) return d.dataContext.sliceSettings.fill;
            return fill;
        });
        series.slices.template.adapters.add('stroke', (stroke, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.sliceSettings) return d.dataContext.sliceSettings.fill;
            return stroke;
        });

        series.data.setAll(chartData);

        const legend = chart.children.push(
            am5.Legend.new(root, {
                centerX: am5.p50,
                x: am5.p50,
                marginTop: 8,
            })
        );
        legend.labels.template.setAll({
            fontSize: 11,
            fill: am5.color(isDark ? 0xcbd5e1 : 0x475569),
        });
        legend.valueLabels.template.setAll({
            fontSize: 11,
            fontWeight: '600',
            fill: am5.color(isDark ? 0xf1f5f9 : 0x0f172a),
        });
        legend.data.setAll(series.dataItems);

        series.appear(800, 100);
        chart.appear(800, 100);

        return () => root.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, chartId]);

    if (!items || items.length === 0) return null;

    return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
};

// ── Interactive Operator Funnel (amCharts 5) ──
const OperatorFunnel = ({ operators, operatorFunnel, stages, themeColors }) => {
    const [selectedIdx, setSelectedIdx] = useState(null);

    // Sort & colorize
    const mainItems = useMemo(() => {
        const sorted = [...operators].sort((a, b) => b.count - a.count);
        return sorted.map((op, i) => ({ ...op, color: COLORS[i % COLORS.length] }));
    }, [operators]);

    // Detail items for selected operator
    const detailItems = useMemo(() => {
        if (selectedIdx === null || !operatorFunnel || !stages) return [];
        const op = mainItems[selectedIdx];
        const d = operatorFunnel.find(f =>
            f.name.toLowerCase().trim() === op.name.toLowerCase().trim()
        );
        if (!d) return [];
        return stages
            .map((st, i) => ({ name: st.name, count: d[st.name] || 0, color: st.color || COLORS[i % COLORS.length] }))
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [selectedIdx, mainItems, operatorFunnel, stages]);

    const isExpanded = selectedIdx !== null;
    const selectedOp = isExpanded ? mainItems[selectedIdx] : null;

    const handleClick = (idx) => {
        setSelectedIdx(selectedIdx === idx ? null : idx);
    };

    return (
        <div>
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                width: '100%',
                gap: isExpanded ? '32px' : '0',
                transition: 'gap 0.5s ease',
            }}>
                {/* ═══ LEFT: Main Operator Funnel ═══ */}
                <div style={{
                    flex: isExpanded ? '1 1 50%' : '1 1 100%',
                    maxWidth: isExpanded ? '50%' : '100%',
                    transition: 'all 0.5s ease',
                }}>
                    <AmFunnel
                        items={mainItems}
                        chartId="main-operators"
                        height={isExpanded ? 360 : 420}
                        onSliceClick={handleClick}
                    />
                </div>

                {/* ═══ RIGHT: Detail Stage Funnel ═══ */}
                {isExpanded && (
                    <div style={{
                        flex: '1 1 50%',
                        maxWidth: '50%',
                        animation: 'fadeInSlide 0.5s ease',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '12px', fontSize: '14px', fontWeight: '700',
                            color: themeColors.textPrimary,
                        }}>
                            <span style={{
                                width: '12px', height: '12px', borderRadius: '4px',
                                background: selectedOp?.color, display: 'inline-block',
                            }}></span>
                            <span>{selectedOp?.name}</span>
                            <span style={{ fontWeight: '400', color: themeColors.textSecondary, fontSize: '11px' }}>
                                — bosqichlar
                            </span>
                            <button
                                onClick={() => setSelectedIdx(null)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${themeColors.borderColor}`,
                                    borderRadius: '8px', color: themeColors.textSecondary,
                                    cursor: 'pointer', fontSize: '14px',
                                    width: '28px', height: '28px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 0,
                                }}
                                title="Yopish"
                            >✕</button>
                        </div>

                        {detailItems.length > 0 ? (
                            <AmFunnel
                                items={detailItems}
                                chartId={`detail-${selectedIdx}`}
                                height={340}
                            />
                        ) : (
                            <div style={{
                                padding: '40px 20px', textAlign: 'center',
                                color: themeColors.textSecondary,
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px dashed ${themeColors.borderColor}`,
                                borderRadius: '12px', fontSize: '13px',
                            }}>
                                <div style={{ fontWeight: '500' }}>Ma'lumot mavjud emas</div>
                                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                                    Ushbu operator uchun bosqichlar bo'yicha leadlar topilmadi
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* HINT */}
            <div style={{
                textAlign: 'center', padding: '10px 16px',
                color: themeColors.textSecondary, fontSize: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', opacity: 0.65,
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                </svg>
                Operatorni ustiga bosing — bosqichlar bo'yicha taqsimotni ko'rasiz
            </div>

            <style>{`
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};


// ═══════════════════════════════════════════════
//  LeadsStatistics Main Component
// ═══════════════════════════════════════════════
const LeadsStatistics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const themeColors = useThemeColors();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await leadService.getStatistics();
            setData(res.data);
        } catch (error) {
            console.error('Statistics error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="leads-statistics">
                <div className="loading-state"><div className="spinner"></div></div>
            </div>
        );
    }

    if (!data) return null;


    return (
        <div className="leads-statistics">
            {/* Summary Cards */}
            <div className="stats-summary">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                    <div className="stat-info">
                        <span className="stat-title">Jami leadlar</span>
                        <span className="stat-value">{data.total || 0}</span>
                    </div>
                    <div className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <div className="stat-info">
                        <span className="stat-title">Bugun</span>
                        <span className="stat-value">{data.today || 0}</span>
                    </div>
                    <div className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <div className="stat-info">
                        <span className="stat-title">Aylangan</span>
                        <span className="stat-value">{data.converted || 0}</span>
                    </div>
                    <div className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 3h5v5"></path>
                            <path d="M8 21H3v-5"></path>
                            <path d="M21 3l-7 7"></path>
                            <path d="M3 21l7-7"></path>
                        </svg>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <div className="stat-info">
                        <span className="stat-title">Javob berdi</span>
                        <span className="stat-value">{data.answered || 0}</span>
                    </div>
                    <div className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"></path>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Conversion Funnel */}
            {data.conversion_funnel && data.conversion_funnel.some(d => d.count > 0) && (
                <div className="chart-card" style={{ marginBottom: '20px' }}>
                    <div className="chart-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3"></polygon>
                        </svg>
                        Lead konversiya varonkasi
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                        <FunnelChart
                            items={data.conversion_funnel}
                            height={350}
                        />
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="chart-grid">
                {/* By Stage */}
                {data.by_stage && data.by_stage.length > 0 && (
                    <div className="chart-card">
                        <div className="chart-card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            Bosqichlar bo'yicha
                        </div>
                        <div className="chart-wrapper">
                            <AmBarChart
                                data={data.by_stage}
                                xField="name"
                                yField="count"
                                height={300}
                                color="#6366f1"
                                tooltipFormatter="{categoryX}: {valueY} ta"
                            />
                        </div>
                    </div>
                )}

                {/* By Status */}
                {data.by_status && data.by_status.length > 0 && (
                    <div className="chart-card">
                        <div className="chart-card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6"></path>
                            </svg>
                            Holat bo'yicha
                        </div>
                        <div className="chart-wrapper">
                            <AmPieChart
                                data={data.by_status}
                                nameField="name"
                                valueField="count"
                                height={300}
                                innerRadius={45}
                            />
                        </div>
                    </div>
                )}

                {/* ═══ Operator Conversion Funnel ═══ */}
                {data.by_operator && data.by_operator.length > 0 && (
                    <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="chart-card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Operatorlar bo'yicha
                        </div>
                        <OperatorFunnel
                            operators={data.by_operator}
                            operatorFunnel={data.operator_funnel}
                            stages={data.stages}
                            themeColors={themeColors}
                        />
                    </div>
                )}
            </div>

            {/* ═══ NEW: Manbalar + Formalar ═══ */}
            <div className="chart-grid">
                {/* Manbalar Pie Chart */}
                {data.by_source && data.by_source.length > 0 && (
                    <div className="chart-card">
                        <div className="chart-card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"></path>
                            </svg>
                            Manbalar samaradorligi
                        </div>
                        <div className="chart-wrapper">
                            <AmPieChart
                                data={data.by_source}
                                nameField="name"
                                valueField="count"
                                height={300}
                                innerRadius={50}
                            />
                        </div>
                    </div>
                )}

                {/* Formalar bo'yicha */}
                {data.by_form && data.by_form.length > 0 && (
                    <div className="chart-card">
                        <div className="chart-card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            Formalar bo'yicha
                        </div>
                        <div className="chart-wrapper">
                            <AmBarChart
                                data={data.by_form}
                                xField="name"
                                yField="count"
                                height={300}
                                color="#8b5cf6"
                                tooltipFormatter="{categoryX}: {valueY} ta"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ Operator Konversiya Reytingi ═══ */}
            {data.operator_conversion && data.operator_conversion.length > 0 && (
                <div className="chart-card" style={{ marginBottom: '20px' }}>
                    <div className="chart-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <polyline points="17 11 19 13 23 9"></polyline>
                        </svg>
                        Operatorlar konversiya reytingi
                    </div>
                    <div className="chart-wrapper">
                        <AmComposedChart
                            data={data.operator_conversion}
                            xField="name"
                            barFields={[
                                { field: 'total', name: 'Jami leadlar', color: '#6366f1' },
                                { field: 'converted', name: 'Mijozga aylangan', color: '#10b981' },
                            ]}
                            lineField={{ field: 'rate', name: 'Konversiya %', color: '#f59e0b' }}
                            height={350}
                        />
                    </div>
                </div>
            )}

            {/* ═══ Haftalik Trend ═══ */}
            {data.weekly_trend && data.weekly_trend.length > 0 && (
                <div className="chart-card" style={{ marginBottom: '20px' }}>
                    <div className="chart-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        Lead trend (oxirgi 12 hafta)
                    </div>
                    <div className="chart-wrapper">
                        <AmAreaChart
                            data={data.weekly_trend}
                            xField="date"
                            yField="count"
                            height={320}
                            color="#6366f1"
                            tooltipText="{categoryX}: {valueY} ta lead"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadsStatistics;
