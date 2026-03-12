import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Building,
  Filter,
  Phone,
  UserCheck,
  User,
} from "lucide-react";
import {
  AmBarChart,
  AmAreaChart,
  AmPieChart,
  AmLineChart,
  AmComposedChart,
} from "../../components/AmCharts";
import { analyticsService } from "../../services/analytics";
import { getAllCities } from "../../services/cities";
import { getAllBuildings } from "../../services/buildings";
import { leadService } from "../../services/leads";
import { toast } from "sonner";
import FunnelChart from "../../components/FunnelChart";
import {
  OperatorFunnel,
  useThemeColors,
} from "../../components/OperatorFunnelChart";
import "./Analytics.css";
import AnalyticsFilterDrawer from "./components/AnalyticsFilterDrawer";

// Premium Chart Colors - Gradient inspired
// Premium Chart Colors - Modern & Accessible
const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#f472b6",
];

const GRADIENT_COLORS = {
  indigo: ["#6366f1", "#818cf8"],
  green: ["#10b981", "#34d399"],
  orange: ["#f59e0b", "#fbbf24"],
  red: ["#ef4444", "#f87171"],
  cyan: ["#06b6d4", "#22d3ee"],
  purple: ["#8b5cf6", "#a78bfa"],
  pink: ["#ec4899", "#f472b6"],
};

const STATUS_LABELS = {
  // lowercase (from backend)
  pending: "Rasmiylashtirilmoqda",
  active: "Rasmiylashtirilgan",
  paid: "To'liq to'langan",
  completed: "Tugallangan",
  cancelled: "Bekor qilingan",
  // uppercase (for filter compatibility)
  PENDING: "Rasmiylashtirilmoqda",
  ACTIVE: "Rasmiylashtirilgan",
  COMPLETED: "Tugallangan",
  CANCELLED: "Bekor qilingan",
  // call status
  answered: "Javob berildi",
  not_answered: "Javob berilmadi",
  client_answered: "Mijoz javob berdi",
  client_not_answered: "Mijoz javob bermadi",
};

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-body">
          {payload.map((item, index) => (
            <div key={index} className="tooltip-row">
              <span
                className="tooltip-dot"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="tooltip-name">{item.name}:</span>
              <span className="tooltip-value">
                {formatter ? formatter(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const themeColors = useThemeColors();

  // Sales filters
  const [salesFilters, setSalesFilters] = useState({
    start_date: "",
    end_date: "",
    city: "",
    building: "",
    status: "",
  });

  // Leads filters
  const [leadsFilters, setLeadsFilters] = useState({
    start_date: "",
    end_date: "",
    operator: "",
    stage: "",
    call_status: "",
    include_archived: false,
  });

  const [cities, setCities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [stages, setStages] = useState([]);
  const [operators, setOperators] = useState([]);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadFilterData = async () => {
    try {
      const [citiesRes, buildingsRes, stagesRes] = await Promise.all([
        getAllCities(),
        getAllBuildings(),
        leadService.getStages().catch(() => []),
      ]);
      // Ensure we always set arrays
      setCities(
        Array.isArray(citiesRes)
          ? citiesRes
          : citiesRes?.data || citiesRes?.results || [],
      );
      setBuildings(
        Array.isArray(buildingsRes)
          ? buildingsRes
          : buildingsRes?.data || buildingsRes?.results || [],
      );
      const stagesData = stagesRes?.data || stagesRes?.results || stagesRes;
      setStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (error) {
      console.error("Filtrlarni yuklashda xatolik:", error);
      setCities([]);
      setBuildings([]);
      setStages([]);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const filters = activeTab === "sales" ? salesFilters : leadsFilters;
      let currentData = null;
      if (activeTab === "sales") {
        const res = await analyticsService.getContractsStats(filters);
        currentData = res.data;
        setStats(res.data);
      } else {
        const res = await analyticsService.getLeadsStats(filters);
        currentData = res.data;
        setStats(res.data);
      }

      // Extract operators from leads stats
      if (activeTab === "leads" && currentData?.leads_by_operator) {
        setOperators(
          currentData.leads_by_operator
            .map((o) => ({ id: o.operator_id, name: o.operator_name }))
            .filter((o) => o.id),
        );
      }
    } catch (error) {
      toast.error("Statistikalarni yuklashda xatolik yuz berdi");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============== SALES DASHBOARD ==============

  // Format large numbers for KPI cards
  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(1) + " mlrd";
    if (num >= 1e6) return (num / 1e6).toFixed(1) + " mln";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + " ming";
    return num.toLocaleString();
  };

  const renderSalesDashboard = () => {
    if (!stats) return null;

    const kpi = stats.kpi || {};

    return (
      <div className="analytics-dashboard">
        {/* ═══ 1-QATOR: KPI CARDS ═══ */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}><Building size={22} /></div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.total_sold_homes || 0}</span>
              <span className="kpi-label">Jami sotilgan uylar</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}><DollarSign size={22} /></div>
            <div className="kpi-info">
              <span className="kpi-value">{formatNumber(stats.debt_stats?.total_sum)}</span>
              <span className="kpi-label">Umumiy daromad</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}><TrendingUp size={22} /></div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.active_contracts || 0}</span>
              <span className="kpi-label">Faol shartnomalar</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}><Users size={22} /></div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.debtors_count || 0}</span>
              <span className="kpi-label">Qarzdor mijozlar</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}><Calendar size={22} /></div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.total_contracts || 0}</span>
              <span className="kpi-label">Jami shartnomalar</span>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          {/* ═══ 2-QATOR: TRENDLAR (Line Charts) ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Sotuvlar vaqt bo'yicha</span>
              <h4>Kunlik shartnoma tuzish trendi</h4>
            </div>
            <div className="chart-body">
              <AmAreaChart
                data={stats.daily_contracts || []}
                xField="date"
                yField="count"
                height={250}
                color="#6366f1"
                tooltipText="Sana: {categoryX}\nShartnomalar: {valueY}"
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Daromad vaqt bo'yicha</span>
              <h4>Vaqt o'tishi bilan umumiy daromad</h4>
            </div>
            <div className="chart-body">
              <AmAreaChart
                data={stats.revenue_over_time || []}
                xField="date"
                yField="revenue"
                height={250}
                color="#10b981"
                tooltipText="Sana: {categoryX}\nDaromad: {valueY}"
              />
            </div>
          </div>

          {/* ═══ 3-QATOR: JADVAL — Shaharlar va Binolar ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Shaharlar bo'yicha</span>
              <h4>Shaharlar bo'yicha daromad</h4>
            </div>
            <div className="chart-body" style={{ padding: 0 }}>
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Shahar</th>
                      <th>Daromad</th>
                      <th>Ulush</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.revenue_by_city || []).map((c, i) => {
                      const maxRev = Math.max(...(stats.revenue_by_city || []).map(x => x.revenue || 0), 1);
                      const pct = Math.round((c.revenue || 0) / maxRev * 100);
                      return (
                        <tr key={i}>
                          <td className="table-building-name">
                            <MapPin size={12} style={{ marginRight: 6, color: '#f59e0b', display: 'inline' }} />
                            {c.city_name || '—'}
                          </td>
                          <td><span className="debt-value" style={{ color: '#f59e0b' }}>{formatNumber(c.revenue)}</span></td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}></div>
                              </div>
                              <span>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer-note">
                <p><strong>Ulush</strong> — ushbu shaharning eng yuqori natija ko'rsatgan shaharga nisbatan foizdagi daromadi.</p>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Binolar bo'yicha</span>
              <h4>Binolar bo'yicha daromad</h4>
            </div>
            <div className="chart-body" style={{ padding: 0 }}>
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Bino</th>
                      <th>Daromad</th>
                      <th>Ulush</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.revenue_by_building || []).slice(0, 8).map((b, i) => {
                      const maxRev = Math.max(...(stats.revenue_by_building || []).map(x => x.revenue || 0), 1);
                      const pct = Math.round((b.revenue || 0) / maxRev * 100);
                      return (
                        <tr key={i}>
                          <td className="table-building-name">
                            <Building size={12} style={{ marginRight: 6, color: '#3b82f6', display: 'inline' }} />
                            {b.building_name || '—'}
                          </td>
                          <td><span className="debt-value" style={{ color: '#3b82f6' }}>{formatNumber(b.revenue)}</span></td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
                              </div>
                              <span>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer-note">
                <p><strong>Ulush</strong> — ushbu binoning eng yuqori natija ko'rsatgan binoga nisbatan foizdagi daromadi.</p>
              </div>
            </div>
          </div>

          {/* ═══ 4-QATOR: HOLAT (Pie) + QARZDORLIK ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Shartnoma holati</span>
              <h4>Shartnomalar holati bo'yicha</h4>
            </div>
            <div className="chart-body">
              <AmPieChart
                data={(stats.status_distribution || []).map((d) => ({
                  ...d,
                  name: STATUS_LABELS[d.status] || d.status,
                }))}
                nameField="name"
                valueField="count"
                height={250}
                innerRadius={55}
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Qarzdorlik holati</span>
              <h4>To'lov holati</h4>
            </div>
            <div className="chart-body">
              <div className="debt-summary">
                <div className="debt-item">
                  <span className="debt-dot" style={{ background: "#10b981" }}></span>
                  <span className="debt-label">Yig'ilgan mablag'</span>
                  <span className="debt-value" style={{ color: "#10b981" }}>{formatNumber(stats.debt_stats?.total_collected)}</span>
                </div>
                <div className="debt-item">
                  <span className="debt-dot" style={{ background: "#ef4444" }}></span>
                  <span className="debt-label">Qolgan qarz</span>
                  <span className="debt-value" style={{ color: "#ef4444" }}>{formatNumber(stats.debt_stats?.total_debt)}</span>
                </div>
                <div className="debt-item">
                  <span className="debt-dot" style={{ background: "#6366f1" }}></span>
                  <span className="debt-label">Umumiy summa</span>
                  <span className="debt-value" style={{ color: "#6366f1" }}>{formatNumber(stats.debt_stats?.total_sum)}</span>
                </div>
              </div>
              <AmPieChart
                data={[
                  { name: "Yig'ilgan", value: stats.debt_stats?.total_collected || 0 },
                  { name: "Qarz", value: stats.debt_stats?.total_debt || 0 },
                ]}
                nameField="name"
                valueField="value"
                height={180}
                innerRadius={60}
                colors={["#10b981", "#ef4444"]}
              />
            </div>
          </div>

          {/* ═══ 5-QATOR: STACKED BAR — sotilgan/sotilmagan ═══ */}
          <div className="chart-card wide">
            <div className="chart-card-header">
              <span className="chart-number">Binolar bo'yicha sotilgan uylar</span>
              <h4>Sotilgan / sotilmagan uylar (batafsil)</h4>
            </div>
            <div className="chart-body">
              <AmComposedChart
                data={stats.homes_by_building || []}
                xField="building_name"
                barFields={[
                  { field: "sold", name: "Sotilgan", color: "#6366f1" },
                  { field: "available", name: "Sotilmagan", color: "#10b981" },
                ]}
                lineField={{
                  field: "percentage",
                  name: "Sotilish foizi",
                  color: "#ef4444",
                }}
                height={300}
              />
            </div>
          </div>

          {/* ═══ 6-QATOR: JADVAL ═══ */}
          {stats.homes_by_building && stats.homes_by_building.length > 0 && (
            <div className="chart-card wide">
              <div className="chart-card-header">
                <span className="chart-number">Bino statistikasi jadvali</span>
                <h4>Binolar bo'yicha batafsil ma'lumot</h4>
              </div>
              <div className="chart-body" style={{ padding: 0 }}>
                <div className="analytics-table-wrapper">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Bino</th>
                        <th>Sotilgan</th>
                        <th>Sotilmagan</th>
                        <th>Jami</th>
                        <th>Foiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.homes_by_building.map((b, i) => (
                        <tr key={i}>
                          <td className="table-building-name">{b.building_name}</td>
                          <td><span className="table-badge sold">{b.sold}</span></td>
                          <td><span className="table-badge available">{b.available}</span></td>
                          <td><strong>{b.total}</strong></td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${b.percentage}%` }}></div>
                              </div>
                              <span>{b.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer-note">
                  <p><strong>Foiz</strong> — bino tarkibidagi jami uylarning necha foizi sotilganligini (bandligini) ko'rsatadi.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============== LEADS DASHBOARD ==============

  const renderLeadsDashboard = () => {
    if (!stats) return null;
    const { kpi } = stats;

    return (
      <div className="analytics-dashboard">
        {/* ═══ 1-QATOR: KPI CARDS ═══ */}
        {kpi && (
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}><Users size={22} /></div>
              <div className="kpi-info">
                <span className="kpi-value">{kpi.total_leads || 0}</span>
                <span className="kpi-label">Jami leadlar</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}><UserCheck size={22} /></div>
              <div className="kpi-info">
                <span className="kpi-value">{kpi.new_leads || 0}</span>
                <span className="kpi-label">Yangi leadlar (Bugun)</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}><TrendingUp size={22} /></div>
              <div className="kpi-info">
                <span className="kpi-value">{kpi.conversion_rate || 0}%</span>
                <span className="kpi-label">Konversiya (Sotuv)</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}><Phone size={22} /></div>
              <div className="kpi-info">
                <span className="kpi-value">{kpi.total_calls || 0}</span>
                <span className="kpi-label">Jami qo'ng'iroqlar</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}><DollarSign size={22} /></div>
              <div className="kpi-info">
                <span className="kpi-value">{kpi.converted_leads || 0}</span>
                <span className="kpi-label">Mijozga aylangan</span>
              </div>
            </div>
          </div>
        )}

        <div className="charts-grid">
          {/* ═══ 2-QATOR: ASOSIY LEAD FUNNEL ═══ */}
          {stats.lead_funnel && stats.lead_funnel.some((d) => d.count > 0) && (
            <div className="chart-card wide">
              <div className="chart-card-header">
                <span className="chart-number">Lead Funnel</span>
                <h4>Leadlar konversiyasi (Asosiy)</h4>
              </div>
              <div
                className="chart-body"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "20px 0",
                }}
              >
                <FunnelChart
                  items={stats.lead_funnel.map((d, i) => ({
                    name: d.stage,
                    count: d.count,
                    color: [
                      "#6366f1",
                      "#3b82f6",
                      "#10b981",
                      "#f59e0b",
                      "#8b5cf6",
                    ][i % 5],
                  }))}
                  height={350}
                />
              </div>
            </div>
          )}

          {/* ═══ 3-QATOR: TRENDLAR (Line Charts) ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Leadlar trendi</span>
              <h4>Kunlik qo'shilgan Leadlar soni</h4>
            </div>
            <div className="chart-body">
              <AmAreaChart
                data={stats.daily_leads || []}
                xField="date"
                yField="count"
                height={250}
                color="#6366f1"
                tooltipText="Sana: {categoryX}\nLeadlar: {valueY}"
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Qo'ng'iroq davomiyligi (Sekund)</span>
              <h4>O'rtacha qo'ng'iroq davomiyligi (kunlar)</h4>
            </div>
            <div className="chart-body">
              <AmLineChart
                data={stats.avg_duration_trend || []}
                xField="date"
                yField="avg_duration"
                height={250}
                color="#f59e0b"
                tooltipText="Sana: {categoryX}\nO'rtacha: {valueY} sek"
              />
            </div>
          </div>

          {/* ═══ 4-QATOR: OPERATORLAR (Jadval + Chart) ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Top operatorlar</span>
              <h4>Operatorlar bo'yicha jalb qilingan leadlar</h4>
            </div>
            <div className="chart-body" style={{ padding: 0 }}>
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Leadlar soni</th>
                      <th>Ulush</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.leads_by_operator || []).slice(0, 8).map((op, i) => {
                      const maxLeads = Math.max(...(stats.leads_by_operator || []).map(x => x.count || 0), 1);
                      const pct = Math.round((op.count || 0) / maxLeads * 100);
                      return (
                        <tr key={i}>
                          <td className="table-building-name">
                            <User size={12} style={{ marginRight: 6, color: '#8b5cf6', display: 'inline' }} />
                            {op.operator_name || '—'}
                          </td>
                          <td><span className="debt-value" style={{ color: '#8b5cf6' }}>{op.count}</span></td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}></div>
                              </div>
                              <span>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer-note">
                <p><strong>Ulush</strong> — ushbu operatorning eng ko'p lead olgan operatorga nisbatan foizi.</p>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Operator konversiyasi</span>
              <h4>Kim ko'proq mijozga aylantiryapti?</h4>
            </div>
            <div className="chart-body">
              {stats?.operator_conversion && stats.operator_conversion.length > 0 ? (
                <AmComposedChart
                  data={stats.operator_conversion}
                  xField="name"
                  barFields={[
                    { field: "total", name: "Jami leadlar", color: "#6366f1" },
                    { field: "converted", name: "Mijozga aylangan", color: "#10b981" },
                  ]}
                  lineField={{ field: "rate", name: "Konversiya %", color: "#f59e0b" }}
                  height={250}
                />
              ) : (
                <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
                  Ma'lumot topilmadi
                </div>
              )}
            </div>
          </div>

          {/* ═══ 5-QATOR: HOLAT (Donut & Pie) ═══ */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Qo'ng'iroq holati</span>
              <h4>Qo'ng'iroq natijalari</h4>
            </div>
            <div className="chart-body">
              <AmPieChart
                data={(stats.call_status_distribution || []).map((d) => ({
                  ...d,
                  name: STATUS_LABELS[d.call_status] || d.call_status || "Noma'lum",
                }))}
                nameField="name"
                valueField="count"
                height={250}
                innerRadius={55}
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">Manbalar samaradorligi</span>
              <h4>Leadlar manba turi bo'yicha</h4>
            </div>
            <div className="chart-body">
              {stats?.by_source && stats.by_source.length > 0 ? (
                <AmPieChart
                  data={stats.by_source}
                  nameField="name"
                  valueField="count"
                  height={250}
                  innerRadius={55}
                />
              ) : (
                <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
                  Ma'lumot topilmadi
                </div>
              )}
            </div>
          </div>

          {/* ═══ 6-QATOR: OPERATOR PERFORMANCE (Table) ═══ */}
          <div className="chart-card wide">
            <div className="chart-card-header">
              <span className="chart-number">Operator samaradorligi</span>
              <h4>Har bir operator bo'yicha qo'ng'iroq holati</h4>
            </div>
            <div className="chart-body" style={{ padding: 0 }}>
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Javob berilgan</th>
                      <th>Javob berilmagan</th>
                      <th>Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.operator_call_status || []).map((op, i) => (
                      <tr key={i}>
                        <td className="table-building-name">
                          <User size={12} style={{ marginRight: 6, color: '#6366f1', display: 'inline' }} />
                          {op.operator_name || '—'}
                        </td>
                        <td><span className="table-badge available">{op.answered}</span></td>
                        <td><span className="table-badge sold">{op.not_answered}</span></td>
                        <td><strong>{op.total}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="header-left">
          <h1>Analitika & Hisobotlar</h1>
          <p>Loyihangiz bo'yicha barcha asosiy ko'rsatkichlar</p>
        </div>

        <div className="header-actions">
          <div className="header-tabs">
            <button
              className={`tab-btn ${activeTab === "sales" ? "active" : ""}`}
              onClick={() => setActiveTab("sales")}
            >
              <DollarSign size={18} />
              Sotuvlar
            </button>
            <button
              className={`tab-btn ${activeTab === "leads" ? "active" : ""}`}
              onClick={() => setActiveTab("leads")}
            >
              <Users size={18} />
              Leadlar
            </button>
          </div>

          <div className="header-right">
            <button
              className={`btn-filter-trigger ${isFilterOpen ? "active" : ""}`}
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter size={18} />
              Filterlash
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Ma'lumotlar yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {activeTab === "sales"
              ? renderSalesDashboard()
              : renderLeadsDashboard()}
          </>
        )}
      </div>

      <AnalyticsFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeTab={activeTab}
        initialFilters={activeTab === "sales" ? salesFilters : leadsFilters}
        cities={cities}
        buildings={buildings}
        stages={stages}
        operators={operators}
        onFilter={(newFilters) => {
          if (activeTab === "sales") {
            setSalesFilters(newFilters);
          } else {
            setLeadsFilters(newFilters);
          }
          // fetchStats will be triggered by useEffect or manually called
          setTimeout(() => fetchStats(), 0);
        }}
      />
    </div>
  );
};

export default AnalyticsPage;
