/**
 * AmCharts 5 — Universal React Wrappers
 * 
 * Reusable components:
 *  - AmBarChart     (vertical / horizontal bar charts)
 *  - AmAreaChart    (area / line charts)
 *  - AmPieChart     (pie / donut charts)
 *  - AmLineChart    (line charts)
 *  - AmComposedChart (bar + line combined)
 */
import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import ErrorBoundary from './ErrorBoundary';

// ─── Helpers ───
const isDarkMode = () => document.documentElement.getAttribute('data-theme') === 'dark';

/** Convert literal \\n sequences to real newlines for amCharts tooltips */
const fixNL = (str) => str ? str.replace(/\\n/g, '\n') : str;

const setupRoot = (el) => {
    const root = am5.Root.new(el);
    const themes = [am5themes_Animated.new(root)];
    if (isDarkMode()) themes.push(am5themes_Dark.new(root));
    root.setThemes(themes);
    root.numberFormatter.setAll({
        numberFormat: "#,###",
        numericFields: ["valueY", "valueX"]
    });
    return root;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f472b6'];

// ════════════════════════════════════════════════
//  AmBarChart
// ════════════════════════════════════════════════
/**
 * Props:
 *  data       - array of objects
 *  xField     - category field name (string)
 *  yField     - value field name (string) or array for stacked
 *  height     - px (default 300)
 *  horizontal - if true, uses horizontal layout (default false)
 *  color      - bar fill color (default '#6366f1')
 *  colors     - array of colors for stacked bars
 *  seriesNames- array of names for stacked series
 *  yFormatter - optional value formatter fn(value) => string
 *  tooltipFormatter - optional tooltip text (amcharts format)
 *  barRadius  - corner radius (default 4)
 *  unit       - suffix for Y axis (e.g. '%')
 */
export const AmBarChart = ({
    data = [], xField, yField, height = 300,
    horizontal = false, color = '#6366f1', colors,
    seriesNames, tooltipFormatter,
    barRadius = 4, unit = ''
}) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        if (!ref.current || !data.length) return;
        const root = setupRoot(ref.current);
        const chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false, panY: false,
            wheelY: 'none',
            layout: root.verticalLayout,
            paddingLeft: 0, paddingRight: 10,
        }));

        // Axes
        let categoryAxis, valueAxis;
        if (horizontal) {
            categoryAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, {
                categoryField: xField,
                renderer: am5xy.AxisRendererY.new(root, {
                    minGridDistance: 20,
                    cellStartLocation: 0.1,
                    cellEndLocation: 0.9,
                }),
            }));
            valueAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {}),
                numberFormat: unit === '%' ? "#'%'" : "#,###",
            }));
        } else {
            categoryAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
                categoryField: xField,
                renderer: am5xy.AxisRendererX.new(root, {
                    minGridDistance: 40,
                    cellStartLocation: 0.2,
                    cellEndLocation: 0.8,
                }),
            }));
            valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {}),
                numberFormat: unit === '%' ? "#'%'" : "#,###",
            }));
        }

        // Style axes
        categoryAxis.get('renderer').labels.template.setAll({
            fontSize: 11, oversizedBehavior: 'truncate', maxWidth: 100,
        });
        categoryAxis.get('renderer').grid.template.setAll({ visible: false });
        valueAxis.get('renderer').labels.template.setAll({ fontSize: 11 });
        valueAxis.get('renderer').grid.template.setAll({ strokeDasharray: [3, 3], strokeOpacity: 0.3 });

        categoryAxis.data.setAll(data);

        // Create series
        const fields = Array.isArray(yField) ? yField : [yField];
        const barColors = colors || [color];
        const names = seriesNames || fields;

        fields.forEach((field, i) => {
            const seriesConfig = horizontal
                ? {
                    valueXField: field, categoryYField: xField,
                    xAxis: valueAxis, yAxis: categoryAxis,
                    name: names[i],
                    stacked: fields.length > 1,
                    tooltip: am5.Tooltip.new(root, {
                        labelText: fixNL(tooltipFormatter) || `{categoryY}: {valueX}${unit}`,
                    }),
                }
                : {
                    valueYField: field, categoryXField: xField,
                    xAxis: categoryAxis, yAxis: valueAxis,
                    name: names[i],
                    stacked: fields.length > 1,
                    tooltip: am5.Tooltip.new(root, {
                        labelText: fixNL(tooltipFormatter) || `{categoryX}: {valueY}${unit}`,
                    }),
                };

            const series = chart.series.push(am5xy.ColumnSeries.new(root, seriesConfig));
            series.columns.template.setAll({
                cornerRadiusTL: horizontal ? 0 : barRadius,
                cornerRadiusTR: barRadius,
                cornerRadiusBL: horizontal ? 0 : 0,
                cornerRadiusBR: horizontal ? barRadius : 0,
                strokeOpacity: 0,
                fillOpacity: 0.9,
                maxWidth: 40,
            });
            series.columns.template.states.create('hover', { fillOpacity: 1 });
            series.set('fill', am5.color(barColors[i % barColors.length]));
            series.set('stroke', am5.color(barColors[i % barColors.length]));
            series.data.setAll(data);
            series.appear(800);
        });

        // Legend for stacked
        if (fields.length > 1) {
            const legend = chart.children.push(am5.Legend.new(root, {
                centerX: am5.p50, x: am5.p50, marginTop: 10,
            }));
            legend.labels.template.setAll({ fontSize: 11 });
            legend.data.setAll(chart.series.values);
        }

        // Cursor
        chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none' }));
        chart.appear(800, 100);
        return () => root.dispose();
    }, [data, xField, yField, horizontal, color, colors, seriesNames, tooltipFormatter, unit, barRadius]);

    return (
        <ErrorBoundary height={`${height}px`}>
            {(!data || data.length === 0) ? (
                <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', color: 'var(--text-secondary, #64748b)', fontSize: '14px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                    Ma'lumot topilmadi
                </div>
            ) : (
                <div ref={ref} style={{ width: '100%', height: `${height}px` }} />
            )}
        </ErrorBoundary>
    );
};


// ════════════════════════════════════════════════
//  AmAreaChart
// ════════════════════════════════════════════════
/**
 * Props:
 *  data       - array of objects
 *  xField     - date/category field
 *  yField     - value field
 *  height     - px (default 300)
 *  color      - line/fill color (default '#6366f1')
 *  yFormatter - optional value formatter fn
 *  tooltipText- custom tooltip format
 *  showLine   - show as line only (no fill) default false
 */
export const AmAreaChart = ({
    data = [], xField, yField, height = 300,
    color = '#6366f1', tooltipText, showLine = false,
}) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        if (!ref.current || !data.length) return;
        const root = setupRoot(ref.current);
        const chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false, panY: false, wheelY: 'none',
            paddingLeft: 0, paddingRight: 10,
        }));

        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: xField,
            renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 50 }),
        }));
        xAxis.get('renderer').labels.template.setAll({ fontSize: 11, rotation: 0 });
        xAxis.get('renderer').grid.template.setAll({ visible: false });
        xAxis.data.setAll(data);

        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            numberFormat: '#,###',
        }));
        yAxis.get('renderer').labels.template.setAll({ fontSize: 11 });
        yAxis.get('renderer').grid.template.setAll({ strokeDasharray: [3, 3], strokeOpacity: 0.3 });

        const series = chart.series.push(am5xy.LineSeries.new(root, {
            valueYField: yField,
            categoryXField: xField,
            xAxis, yAxis,
            tooltip: am5.Tooltip.new(root, {
                labelText: fixNL(tooltipText) || `{categoryX}: {valueY}`,
            }),
        }));
        series.strokes.template.setAll({ strokeWidth: 3, stroke: am5.color(color) });
        series.set('stroke', am5.color(color));
        series.set('fill', am5.color(color));

        if (!showLine) {
            series.fills.template.setAll({
                visible: true,
                fillOpacity: 0.15,
                fillGradient: am5.LinearGradient.new(root, {
                    stops: [
                        { color: am5.color(color), opacity: 0.3 },
                        { color: am5.color(color), opacity: 0.01 },
                    ],
                    rotation: 90,
                }),
            });
        }

        // Bullets (dots)
        series.bullets.push(() =>
            am5.Bullet.new(root, {
                sprite: am5.Circle.new(root, {
                    radius: 4, fill: am5.color(color),
                    stroke: root.interfaceColors.get('background'),
                    strokeWidth: 2,
                }),
            })
        );

        series.data.setAll(data);
        series.appear(800);

        chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none' }));
        chart.appear(800, 100);
        return () => root.dispose();
    }, [data, xField, yField, color, showLine, tooltipText]);

    return (
        <ErrorBoundary height={`${height}px`}>
            {(!data || data.length === 0) ? (
                <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', color: 'var(--text-secondary, #64748b)', fontSize: '14px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                    Ma'lumot topilmadi
                </div>
            ) : (
                <div ref={ref} style={{ width: '100%', height: `${height}px` }} />
            )}
        </ErrorBoundary>
    );
};


// ════════════════════════════════════════════════
//  AmLineChart
// ════════════════════════════════════════════════
export const AmLineChart = (props) => <AmAreaChart {...props} showLine={true} />;


// ════════════════════════════════════════════════
//  AmPieChart
// ════════════════════════════════════════════════
/**
 * Props:
 *  data        - array of { name, value, ... }
 *  nameField   - category field (default 'name')
 *  valueField  - value field (default 'value')
 *  height      - px (default 280)
 *  innerRadius - donut hole %, 0-100 (default 55)
 *  colors      - custom color array
 *  legendPosition - 'bottom' | 'right' (default 'bottom')
 */
export const AmPieChart = ({
    data = [], nameField = 'name', valueField = 'value',
    height = 280, innerRadius = 55, colors,
    legendPosition = 'bottom',
}) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        if (!ref.current || !data.length) return;
        const root = setupRoot(ref.current);
        const chart = root.container.children.push(am5percent.PieChart.new(root, {
            layout: legendPosition === 'right' ? root.horizontalLayout : root.verticalLayout,
            innerRadius: am5.percent(innerRadius),
        }));

        const series = chart.series.push(am5percent.PieSeries.new(root, {
            valueField,
            categoryField: nameField,
            alignLabels: false,
        }));

        series.labels.template.setAll({
            forceHidden: true,
        });
        series.ticks.template.setAll({ forceHidden: true });

        // Custom colors
        const colorList = colors || COLORS;
        series.slices.template.adapters.add('fill', (fill, target) => {
            const index = series.slices.indexOf(target);
            return am5.color(colorList[index % colorList.length]);
        });
        series.slices.template.adapters.add('stroke', () => {
            return am5.color(isDarkMode() ? 0x1e293b : 0xffffff);
        });

        series.slices.template.setAll({
            strokeWidth: 2, strokeOpacity: 1,
            cornerRadius: 4,
            tooltipText: '{category}: {value}',
        });
        series.slices.template.states.create('hover', { scale: 1.05 });

        series.data.setAll(data);

        // Legend
        const legend = chart.children.push(am5.Legend.new(root, {
            centerX: legendPosition === 'right' ? undefined : am5.p50,
            x: legendPosition === 'right' ? undefined : am5.p50,
            marginTop: legendPosition === 'right' ? 0 : 10,
            layout: legendPosition === 'right' ? root.verticalLayout : root.gridLayout,
        }));
        legend.labels.template.setAll({ fontSize: 11 });
        legend.valueLabels.template.setAll({ fontSize: 11, fontWeight: '600' });
        legend.data.setAll(series.dataItems);

        series.appear(800, 100);
        chart.appear(800, 100);
        return () => root.dispose();
    }, [data, nameField, valueField, innerRadius, colors, legendPosition]);

    return (
        <ErrorBoundary height={`${height}px`}>
            {(!data || data.length === 0) ? (
                <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', color: 'var(--text-secondary, #64748b)', fontSize: '14px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                    Ma'lumot topilmadi
                </div>
            ) : (
                <div ref={ref} style={{ width: '100%', height: `${height}px` }} />
            )}
        </ErrorBoundary>
    );
};


// ════════════════════════════════════════════════
//  AmComposedChart (Bar + Line)
// ════════════════════════════════════════════════
/**
 * Props:
 *  data       - array of objects
 *  xField     - category field
 *  barFields  - array of { field, name, color } for bar series (stacked)
 *  lineField  - { field, name, color } for line overlay
 *  height     - px (default 300)
 *  lineYAxisFormat - format for secondary Y axis (e.g. "#'%'")
 */
export const AmComposedChart = ({
    data = [], xField, barFields = [], lineField,
    height = 300, lineYAxisFormat = "#'%'",
}) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        if (!ref.current || !data.length) return;
        const root = setupRoot(ref.current);
        const chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false, panY: false, wheelY: 'none',
            layout: root.verticalLayout,
            paddingLeft: 0, paddingRight: 10,
        }));

        // Category axis
        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: xField,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 40,
                cellStartLocation: 0.15,
                cellEndLocation: 0.85,
            }),
        }));
        xAxis.get('renderer').labels.template.setAll({ fontSize: 10, oversizedBehavior: 'truncate', maxWidth: 80 });
        xAxis.get('renderer').grid.template.setAll({ visible: false });
        xAxis.data.setAll(data);

        // Primary Y axis (for bars)
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            numberFormat: '#,###',
        }));
        yAxis.get('renderer').labels.template.setAll({ fontSize: 11 });
        yAxis.get('renderer').grid.template.setAll({ strokeDasharray: [3, 3], strokeOpacity: 0.3 });

        // Bar series (stacked)
        barFields.forEach((bf, i) => {
            const series = chart.series.push(am5xy.ColumnSeries.new(root, {
                valueYField: bf.field,
                categoryXField: xField,
                xAxis, yAxis,
                name: bf.name,
                stacked: true,
                tooltip: am5.Tooltip.new(root, {
                    labelText: `{name}: {valueY}`,
                }),
            }));
            series.columns.template.setAll({
                cornerRadiusTL: i === barFields.length - 1 ? 4 : 0,
                cornerRadiusTR: i === barFields.length - 1 ? 4 : 0,
                strokeOpacity: 0,
                fillOpacity: 0.9,
            });
            series.set('fill', am5.color(bf.color));
            series.set('stroke', am5.color(bf.color));
            series.data.setAll(data);
            series.appear(800);
        });

        // Line series (secondary axis)
        if (lineField) {
            const yAxis2 = chart.yAxes.push(am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, { opposite: true }),
                numberFormat: lineYAxisFormat,
                syncWithAxis: yAxis,
            }));
            yAxis2.get('renderer').labels.template.setAll({ fontSize: 11 });
            yAxis2.get('renderer').grid.template.setAll({ visible: false });

            const lineSeries = chart.series.push(am5xy.LineSeries.new(root, {
                valueYField: lineField.field,
                categoryXField: xField,
                xAxis,
                yAxis: yAxis2,
                name: lineField.name,
                tooltip: am5.Tooltip.new(root, {
                    labelText: `{name}: {valueY}%`,
                }),
            }));
            lineSeries.strokes.template.setAll({ strokeWidth: 3 });
            lineSeries.set('stroke', am5.color(lineField.color));
            lineSeries.bullets.push(() =>
                am5.Bullet.new(root, {
                    sprite: am5.Circle.new(root, {
                        radius: 4, fill: am5.color(lineField.color),
                        stroke: root.interfaceColors.get('background'),
                        strokeWidth: 2,
                    }),
                })
            );
            lineSeries.data.setAll(data);
            lineSeries.appear(800);
        }

        // Legend
        const legend = chart.children.push(am5.Legend.new(root, {
            centerX: am5.p50, x: am5.p50, marginTop: 10,
        }));
        legend.labels.template.setAll({ fontSize: 11 });
        legend.data.setAll(chart.series.values);

        chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none' }));
        chart.appear(800, 100);
        return () => root.dispose();
    }, [data, xField, barFields, lineField, lineYAxisFormat]);

    return (
        <ErrorBoundary height={`${height}px`}>
            {(!data || data.length === 0) ? (
                <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', color: 'var(--text-secondary, #64748b)', fontSize: '14px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                    Ma'lumot topilmadi
                </div>
            ) : (
                <div ref={ref} style={{ width: '100%', height: `${height}px` }} />
            )}
        </ErrorBoundary>
    );
};
