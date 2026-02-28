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
  PENDING: "Kutilmoqda",
  ACTIVE: "Faol",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
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
  const [extraLeadsStats, setExtraLeadsStats] = useState(null);
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
        const [res, extraRes] = await Promise.all([
          analyticsService.getLeadsStats(filters),
          leadService.getStatistics().catch(() => ({ data: null })),
        ]);
        currentData = res.data;
        setStats(res.data);
        setExtraLeadsStats(extraRes?.data);
      }

      // Extract operators from leads stats
      if (activeTab === "leads" && currentData?.leads_by_operator) {
        setOperators(
          currentData.leads_by_operator
            .map((o) => o.operator_name)
            .filter(Boolean),
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

  const renderSalesDashboard = () => {
    if (!stats) return null;

    return (
      <div className="analytics-dashboard">
        <div className="charts-grid">
          {/* 1. Kunlik shartnoma tuzish */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">1. Kunlik shartnoma tuzish</span>
              <h4>Kunlik shartnoma tuzish</h4>
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

          {/* 2. Shartnomalar holati bo'yicha */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                2. Shartnomalar holati bo'yicha
              </span>
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

          {/* 3. Vaqt o'tishi bilan umumiy daromad */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                3. Vaqt o'tishi bilan umumiy daromad
              </span>
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

          {/* 4. Shaharlar bo'yicha daromad */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                4. Shaharlar bo'yicha daromad
              </span>
              <h4>Shaharlar bo'yicha daromad</h4>
            </div>
            <div className="chart-body">
              <AmBarChart
                data={stats.revenue_by_city || []}
                xField="city_name"
                yField="revenue"
                height={250}
                horizontal={true}
                color="#f59e0b"
                tooltipFormatter="{categoryY}: {valueX}"
              />
            </div>
          </div>

          {/* 5. Binolar bo'yicha daromad */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">5. Binolar bo'yicha daromad</span>
              <h4>Binolar bo'yicha daromad</h4>
            </div>
            <div className="chart-body">
              <AmBarChart
                data={(stats.revenue_by_building || []).slice(0, 6)}
                xField="building_name"
                yField="revenue"
                height={250}
                color="#ef4444"
                tooltipFormatter="{categoryX}: {valueY}"
              />
            </div>
          </div>

          {/* 6. Qarzdorlik holati */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">6. Qarzdorlik holati</span>
              <h4>Qarzdorlik holati</h4>
            </div>
            <div className="chart-body">
              <AmPieChart
                data={[
                  {
                    name: "Qarzdor emas",
                    value: stats.debt_stats?.non_debtors_count || 0,
                  },
                  {
                    name: "Qarzdor",
                    value: stats.debt_stats?.debtors_count || 0,
                  },
                ]}
                nameField="name"
                valueField="value"
                height={250}
                innerRadius={55}
                colors={["#06b6d4", "#8b5cf6"]}
              />
            </div>
          </div>

          {/* 7. Binolar bo'yicha sotilgan uylar (batafsil) */}
          <div className="chart-card wide">
            <div className="chart-card-header">
              <span className="chart-number">
                7. Binolar bo'yicha sotilgan uylar (batafsil)
              </span>
              <h4>Binolar bo'yicha sotilgan uylar</h4>
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
        </div>
      </div>
    );
  };

  // ============== LEADS DASHBOARD ==============

  const renderLeadsDashboard = () => {
    if (!stats) return null;

    return (
      <div className="analytics-dashboard">
        <div className="charts-grid">
          {/* 1. Lead konversiya varonkasi */}
          {extraLeadsStats?.conversion_funnel &&
            extraLeadsStats.conversion_funnel.some((d) => d.count > 0) && (
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-number">
                    1. Lead konversiya varonkasi
                  </span>
                  <h4>Umumiy konversiya holati</h4>
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
                    items={extraLeadsStats.conversion_funnel}
                    height={350}
                  />
                </div>
              </div>
            )}

          {/* 2. Lead bosqichlari varonkasi (Hozirgi holat) */}
          {stats.current_stage_counts &&
            stats.current_stage_counts.filter((d) => d.stage_name).length >
            0 && (
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-number">
                    2. Lead bosqich xolati varonkasi
                  </span>
                  <h4>Lead bosqichlari varonkasi</h4>
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
                    items={(stats.current_stage_counts || [])
                      .filter((d) => d.stage_name)
                      .map((d, i) => ({
                        name: d.stage_name,
                        count: d.count,
                        color:
                          d.stage_color ||
                          [
                            "#6366f1",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#06b6d4",
                            "#8b5cf6",
                            "#ec4899",
                            "#3b82f6",
                          ][i % 8],
                      }))}
                    height={350}
                  />
                </div>
              </div>
            )}

          {/* 3. Operatorlar bo'yicha Funnel (Batafsil) */}
          {extraLeadsStats?.by_operator &&
            extraLeadsStats.by_operator.length > 0 && (
              <div className="chart-card wide">
                <div className="chart-card-header">
                  <span className="chart-number">
                    3. Operatorlar bo'yicha bosqichlar (Funnel)
                  </span>
                  <h4>Operatorlar bo'yicha Leadlar bosqichi</h4>
                </div>
                <div className="chart-body" style={{ padding: "20px 0" }}>
                  <OperatorFunnel
                    operators={extraLeadsStats.by_operator}
                    operatorFunnel={extraLeadsStats.operator_funnel}
                    stages={extraLeadsStats.stages}
                    themeColors={themeColors}
                  />
                </div>
              </div>
            )}

          {/* 4. Kunlik qo'shilgan Leadlar soni */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                4. Kunlik qo'shilgan Leadlar soni
              </span>
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

          {/* 5. Operatorlar bo'yicha Leadlar soni */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                5. Operatorlar bo'yicha Leadlar soni
              </span>
              <h4>Operatorlar bo'yicha Leadlar soni</h4>
            </div>
            <div className="chart-body">
              <AmBarChart
                data={stats.leads_by_operator || []}
                xField="operator_name"
                yField="count"
                height={250}
                horizontal={true}
                color="#8b5cf6"
                tooltipFormatter="{categoryY}: {valueX} ta"
              />
            </div>
          </div>

          {/* 6. Leadlar bosqichlar bo'yicha taqsimoti */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                6. Leadlar bosqichlar bo'yicha taqsimoti
              </span>
              <h4>Leadlar bosqichlar bo'yicha taqsimoti</h4>
            </div>
            <div className="chart-body">
              <AmPieChart
                data={(stats.stage_distribution || []).filter(
                  (d) => d.stage_name,
                )}
                nameField="stage_name"
                valueField="count"
                height={250}
                innerRadius={55}
              />
            </div>
          </div>

          {/* 7. Qo'ng'iroq holati bo'yicha Leadlar */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                7. Qo'ng'iroq holati bo'yicha Leadlar
              </span>
              <h4>Qo'ng'iroq holati bo'yicha Leadlar</h4>
            </div>
            <div className="chart-body">
              <AmPieChart
                data={(stats.call_status_distribution || []).map((d) => ({
                  ...d,
                  name:
                    STATUS_LABELS[d.call_status] || d.call_status || "Noma'lum",
                }))}
                nameField="name"
                valueField="count"
                height={250}
                innerRadius={55}
              />
            </div>
          </div>

          {/* 8. O'rtacha qo'ng'iroq davomiyligi */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                8. Leaddagi o'rtacha qo'ng'iroq davomiyligi (kunlar bo'yicha)
              </span>
              <h4>O'rtacha qo'ng'iroq davomiyligi (sekundda)</h4>
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

          {/* 9. Har bir operator bo'yicha qo'ng'iroq holati */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                9. Har bir operator bo'yicha qo'ng'iroq holati
              </span>
              <h4>Har bir operator bo'yicha qo'ng'iroq holati</h4>
            </div>
            <div className="chart-body">
              <AmBarChart
                data={stats.operator_call_status || []}
                xField="operator_name"
                yField={["answered", "not_answered"]}
                seriesNames={["Javob berilgan", "Javob berilmagan"]}
                height={250}
                horizontal={true}
                colors={["#10b981", "#ef4444"]}
              />
            </div>
          </div>

          {/* 10. Bosqichlar bo'yicha joriy Leadlar soni */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                10. Bosqichlar bo'yicha joriy Leadlar soni
              </span>
              <h4>Bosqichlar bo'yicha joriy Leadlar soni</h4>
            </div>
            <div className="chart-body">
              <AmBarChart
                data={(stats.current_stage_counts || []).filter(
                  (d) => d.stage_name,
                )}
                xField="stage_name"
                yField="count"
                height={250}
                horizontal={true}
                color="#8b5cf6"
                tooltipFormatter="{categoryY}: {valueX} ta"
              />
            </div>
          </div>

          {/* 11. Leadlar oylik tahlili (faoliyat trendi) */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-number">
                11. Leadlar oylik tahlili (faoliyat trendi)
              </span>
              <h4>Leadlar oylik tahlili (faoliyat trendi)</h4>
            </div>
            <div className="chart-body">
              <AmAreaChart
                data={stats.monthly_trend || []}
                xField="month"
                yField="count"
                height={250}
                color="#6366f1"
                tooltipText="{categoryX}\nLeadlar: {valueY}"
              />
            </div>
          </div>

          {/* 12. Manbalar samaradorligi */}
          {extraLeadsStats?.by_source && extraLeadsStats.by_source.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <span className="chart-number">12. Manbalar samaradorligi</span>
                <h4>Leadlar manba turi bo'yicha</h4>
              </div>
              <div className="chart-body">
                <AmPieChart
                  data={extraLeadsStats.by_source}
                  nameField="name"
                  valueField="count"
                  height={250}
                  innerRadius={55}
                />
              </div>
            </div>
          )}

          {/* 13. Operator konversiya reytingi */}
          {extraLeadsStats?.operator_conversion && extraLeadsStats.operator_conversion.length > 0 && (
            <div className="chart-card wide">
              <div className="chart-card-header">
                <span className="chart-number">13. Operator konversiya reytingi</span>
                <h4>Kim ko'proq mijozga aylantiryapti?</h4>
              </div>
              <div className="chart-body">
                <AmComposedChart
                  data={extraLeadsStats.operator_conversion}
                  xField="name"
                  barFields={[
                    { field: "total", name: "Jami leadlar", color: "#6366f1" },
                    { field: "converted", name: "Mijozga aylangan", color: "#10b981" },
                  ]}
                  lineField={{ field: "rate", name: "Konversiya %", color: "#f59e0b" }}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* 14. Haftalik lead trend */}
          {extraLeadsStats?.weekly_trend && extraLeadsStats.weekly_trend.length > 0 && (
            <div className="chart-card wide">
              <div className="chart-card-header">
                <span className="chart-number">14. Haftalik lead trend</span>
                <h4>Oxirgi 12 hafta bo'yicha leadlar soni</h4>
              </div>
              <div className="chart-body">
                <AmAreaChart
                  data={extraLeadsStats.weekly_trend}
                  xField="date"
                  yField="count"
                  height={250}
                  color="#6366f1"
                  tooltipText="Sana: {categoryX}\nLeadlar: {valueY}"
                />
              </div>
            </div>
          )}
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
