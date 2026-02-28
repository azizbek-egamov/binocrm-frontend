import React, { useEffect, useRef, useLayoutEffect } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';

/**
 * Premium Funnel Chart — amCharts 5
 *
 * Props:
 *   items    - Array of { name, count, color }
 *   title    - Optional card title
 *   icon     - Optional SVG icon element
 *   height   - Chart height in px (default: 400)
 */
const FunnelChart = ({ items = [], title, icon, height = 400 }) => {
    const chartRef = useRef(null);
    const rootRef = useRef(null);

    useLayoutEffect(() => {
        if (!chartRef.current || !items || items.length === 0) return;

        // Filter out 0-value items
        const validItems = items.filter(item => (item.count || 0) > 0);
        if (validItems.length === 0) return;

        // Create root
        const root = am5.Root.new(chartRef.current);
        rootRef.current = root;

        // Detect dark mode
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        // Set themes
        const themes = [am5themes_Animated.new(root)];
        if (isDark) {
            themes.push(am5themes_Dark.new(root));
        }
        root.setThemes(themes);

        // Create chart
        const chart = root.container.children.push(
            am5percent.SlicedChart.new(root, {
                layout: root.verticalLayout,
                paddingTop: 0,
                paddingBottom: 0,
            })
        );

        // Determine if data has huge value disparity
        const maxVal = Math.max(...validItems.map(i => i.count || 0));
        const minVal = Math.min(...validItems.map(i => i.count || 0));
        const hasDisparity = maxVal > 0 && (minVal / maxVal) < 0.05;

        // Create series with aligned (external) labels when disparity is large
        const series = chart.series.push(
            am5percent.FunnelSeries.new(root, {
                alignLabels: hasDisparity,
                orientation: 'vertical',
                valueField: 'value',
                categoryField: 'category',
                bottomRatio: 0.15,
            })
        );

        // Style the slices
        series.slices.template.setAll({
            strokeWidth: 0,
            strokeOpacity: 0,
            fillOpacity: 0.9,
            cornerRadius: 4,
            tooltipText: '{category}: {value} ta',
        });

        // Hover effect
        series.slices.template.states.create('hover', {
            fillOpacity: 1,
            scale: 1.02,
        });

        // Labels: external when disparity exists, inside when slices are balanced
        if (hasDisparity) {
            series.labels.template.setAll({
                fontSize: 12,
                fontWeight: '600',
                fill: am5.color(isDark ? 0xe2e8f0 : 0x334155),
                text: "{category}: {value} ta",
                populateText: true,
            });
            // Style tick lines connecting labels to slices
            series.ticks.template.setAll({
                stroke: am5.color(isDark ? 0x475569 : 0xcbd5e1),
                strokeWidth: 1,
                strokeDasharray: [3, 3],
            });
        } else {
            series.labels.template.setAll({
                fontSize: 13,
                fontWeight: '600',
                fill: am5.color(0xffffff),
                text: "{category}: {value} ta",
                textAlign: 'center',
                populateText: true,
            });
            series.ticks.template.setAll({ forceHidden: true });
        }

        // Map data – apply minimum value for visual balance if huge disparity
        const minVisual = hasDisparity ? Math.max(1, Math.round(maxVal * 0.04)) : 0;
        const chartData = validItems.map((item) => ({
            value: Math.max(item.count || 0, minVisual),
            realValue: item.count || 0,
            category: item.name,
            sliceSettings: {
                fill: am5.color(item.color),
            },
        }));

        // Use real value in labels and tooltips
        series.labels.template.adapters.add('text', (text, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.realValue !== undefined) {
                return `${d.dataContext.category}: ${d.dataContext.realValue} ta`;
            }
            return text;
        });

        series.slices.template.adapters.add('tooltipText', (text, target) => {
            const d = target.dataItem;
            if (d?.dataContext?.realValue !== undefined) {
                return `${d.dataContext.category}: ${d.dataContext.realValue} ta`;
            }
            return text;
        });

        // Apply custom colors per slice
        series.slices.template.adapters.add('fill', (fill, target) => {
            const dataItem = target.dataItem;
            if (dataItem?.dataContext?.sliceSettings) {
                return dataItem.dataContext.sliceSettings.fill;
            }
            return fill;
        });

        series.slices.template.adapters.add('stroke', (stroke, target) => {
            const dataItem = target.dataItem;
            if (dataItem?.dataContext?.sliceSettings) {
                return dataItem.dataContext.sliceSettings.fill;
            }
            return stroke;
        });

        // Set data
        series.data.setAll(chartData);

        // Legend - use real values
        const legend = chart.children.push(
            am5.Legend.new(root, {
                centerX: am5.p50,
                x: am5.p50,
                marginTop: 10,
                marginBottom: 5,
            })
        );

        legend.labels.template.setAll({
            fontSize: 12,
            fill: am5.color(isDark ? 0xcbd5e1 : 0x475569),
        });

        legend.valueLabels.template.setAll({
            fontSize: 12,
            fontWeight: '600',
            fill: am5.color(isDark ? 0xf1f5f9 : 0x0f172a),
        });

        // Override legend value text to show real values
        legend.valueLabels.template.adapters.add('text', (text, target) => {
            const d = target.dataItem?.dataContext;
            if (d?.dataContext?.realValue !== undefined) {
                return String(d.dataContext.realValue);
            }
            return text;
        });

        legend.data.setAll(series.dataItems);

        // Animate
        series.appear(1000, 100);
        chart.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, [items]);

    // Watch for theme changes and re-render
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
            // Force re-render by clearing and re-triggering
            const event = new Event('themechange');
            window.dispatchEvent(event);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    if (!items || items.length === 0) return null;

    return (
        <div style={{ width: '100%' }}>
            {title && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '8px', fontSize: '15px', fontWeight: '700',
                    color: 'var(--text-primary)',
                }}>
                    {icon}
                    {title}
                </div>
            )}
            <div
                ref={chartRef}
                style={{ width: '100%', height: `${height}px` }}
            />
        </div>
    );
};

export default FunnelChart;
