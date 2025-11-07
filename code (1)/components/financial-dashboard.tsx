"use client"

import { useMemo, useState, useEffect } from "react"
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, BarChart3, Download, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface FinancialDashboardProps {
  data: any[]
  onCalculate?: (result: any) => void
}

export default function FinancialDashboard({ data, onCalculate }: FinancialDashboardProps) {
  const [showLowMargin, setShowLowMargin] = useState(false)
  const [showBreakEven, setShowBreakEven] = useState(false)
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCharts, setShowCharts] = useState(false)

  const financialMetrics = useMemo(() => {
    // FR-4.2: [总销售额] = 所有有效订单的 [商家实收金额] 的总和
    const totalRevenue = data.reduce((sum, d) => sum + (d.sellingPrice || 0), 0)
    
    // FR-4.2: [总成本额] = 所有有效订单的 [总成本] (FR-4.1) 的总和
    const totalCost = data.reduce((sum, d) => sum + (d.totalCost || d.cost || 0), 0)
    
    // FR-4.2: [总毛利] = [总销售额] - [总成本额]
    const totalProfit = totalRevenue - totalCost
    
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const avgOrderValue = data.length > 0 ? totalRevenue / data.length : 0
    const avgProfit = data.length > 0 ? totalProfit / data.length : 0

    const matchedCount = data.filter((d) => d.matchStatus === "matched").length
    const unmatchedCount = data.length - matchedCount
    const matchRate = data.length > 0 ? (matchedCount / data.length) * 100 : 0
    
    // 控制台输出FR-4汇总核算
    console.log(`[财务核算 FR-4.2] 总销售额: ¥${totalRevenue.toFixed(2)}`)
    console.log(`[财务核算 FR-4.2] 总成本额: ¥${totalCost.toFixed(2)}`)
    console.log(`[财务核算 FR-4.2] 总毛利: ¥${totalProfit.toFixed(2)}`)
    console.log(`[财务核算 FR-4.2] 利润率: ${profitMargin.toFixed(2)}%`)

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      avgOrderValue,
      avgProfit,
      orderCount: data.length,
      matchedCount,
      unmatchedCount,
      matchRate,
    }
  }, [data])

  const productBreakdown = useMemo(() => {
    console.log("[报告生成] 开始计算商品排行...")
    const productMap = new Map<string, { name: string; revenue: number; cost: number; profit: number; count: number }>()

    data.forEach((order) => {
      // 简化商品名称，截断过长的名称
      const fullName = order["商品名称"] || "未知商品"
      const productName = fullName.length > 20 ? fullName.substring(0, 20) + "..." : fullName
      
      if (!productMap.has(productName)) {
        productMap.set(productName, { name: productName, revenue: 0, cost: 0, profit: 0, count: 0 })
      }
      const product = productMap.get(productName)!
      product.revenue += order.sellingPrice || 0
      product.cost += order.totalCost || order.cost || 0 // 使用FR-4.1的总成本
      product.profit += order.profit || 0
      product.count += 1
    })

    const result = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
    
    console.log("[报告生成] 商品排行计算完成，Top 8")
    return result
  }, [data])

  const profitAnalysis = useMemo(() => {
    console.log("[报告生成] 开始分析利润分布...")
    const lowMargin: any[] = []
    const breakEven: any[] = []
    const highMargin: any[] = []
    const midMargin: any[] = []
    
    // 一次遍历完成所有分类，避免多次过滤
    data.forEach((d) => {
      if (d.profit <= 0) {
        breakEven.push(d)
      } else if (d.profit >= d.sellingPrice * 0.25) {
        highMargin.push(d)
      } else if (d.profit >= d.sellingPrice * 0.15) {
        midMargin.push(d)
      } else {
        lowMargin.push(d)
      }
    })

    console.log(`[报告生成] 利润分布: 高=${highMargin.length}, 中=${midMargin.length}, 低=${lowMargin.length}, 亏=${breakEven.length}`)

    return {
      lowMarginOrders: lowMargin,
      lowMarginCount: lowMargin.length,
      lowMarginRevenue: lowMargin.reduce((sum, d) => sum + (d.sellingPrice || 0), 0),
      breakEvenOrders: breakEven,
      breakEvenCount: breakEven.length,
      breakEvenRevenue: breakEven.reduce((sum, d) => sum + (d.sellingPrice || 0), 0),
      highMarginCount: highMargin.length,
      highMarginRevenue: highMargin.reduce((sum, d) => sum + (d.sellingPrice || 0), 0),
      midMarginCount: midMargin.length,
    }
  }, [data])

  const profitDistribution = useMemo(() => {
    return [
      { name: "高利润 (>25%)", value: profitAnalysis.highMarginCount, revenue: profitAnalysis.highMarginRevenue },
      { name: "中等利润 (15-25%)", value: profitAnalysis.midMarginCount, revenue: 0 },
      { name: "低利润 (0-15%)", value: profitAnalysis.lowMarginCount, revenue: profitAnalysis.lowMarginRevenue },
      { name: "亏损", value: profitAnalysis.breakEvenCount, revenue: profitAnalysis.breakEvenRevenue },
    ].filter((item) => item.value > 0)
  }, [profitAnalysis])

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"]

  // Notify parent component of calculations
  useMemo(() => {
    if (onCalculate) {
      onCalculate({
        metrics: financialMetrics,
        productBreakdown,
        profitAnalysis,
      })
    }
  }, [financialMetrics, productBreakdown, profitAnalysis, onCalculate])

  // 异步加载，避免阻塞 UI
  useEffect(() => {
    console.log("[报告生成] 开始生成报告，数据量:", data.length)
    setIsLoading(true)
    setShowCharts(false)
    
    // 分阶段渲染，避免一次性加载所有内容导致卡顿
    const timer1 = setTimeout(() => {
      setIsLoading(false)
      console.log("[报告生成] 基础数据加载完成")
    }, 100)
    
    // 大数据量时禁用图表，避免卡顿
    if (data.length <= 1000) {
      const timer2 = setTimeout(() => {
        setShowCharts(true)
        console.log("[报告生成] 图表加载完成")
      }, 1500)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    } else {
      console.log("[报告生成] 数据量过大 (>1000)，跳过图表渲染以优化性能")
    }
    
    return () => {
      clearTimeout(timer1)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-12 bg-card border border-border">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <div className="text-lg font-semibold text-foreground">正在生成财务报告...</div>
            <div className="text-sm text-muted-foreground">正在分析 {data.length} 条订单数据</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* FR-4 规则说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">FR-4 财务核算规则</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div><strong>FR-4.1 明细核算：</strong></div>
          <div className="ml-4">• [总成本] = [成本价] × [买家购买数量]</div>
          <div className="ml-4">• [单品利润] = [商家实收金额] - [总成本]</div>
          <div className="mt-2"><strong>FR-4.2 汇总核算：</strong></div>
          <div className="ml-4">• [总销售额] = 所有有效订单的 [商家实收金额] 总和</div>
          <div className="ml-4">• [总成本额] = 所有有效订单的 [总成本] 总和</div>
          <div className="ml-4">• [总毛利] = [总销售额] - [总成本额]</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">总销售额（FR-4.2）</div>
              <div className="text-2xl font-bold text-foreground">¥{financialMetrics.totalRevenue.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-2">{financialMetrics.orderCount} 个订单</div>
            </div>
            <DollarSign className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">总成本额（FR-4.2）</div>
              <div className="text-2xl font-bold text-foreground">¥{financialMetrics.totalCost.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-2">
                已匹配 {financialMetrics.matchedCount}/{financialMetrics.orderCount}
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">总毛利（FR-4.2）</div>
              <div className="text-2xl font-bold text-accent">¥{financialMetrics.totalProfit.toFixed(0)}</div>
              <div
                className={`text-xs font-semibold mt-2 ${financialMetrics.profitMargin >= 20 ? "text-green-500" : financialMetrics.profitMargin >= 10 ? "text-yellow-500" : "text-red-500"}`}
              >
                {financialMetrics.profitMargin.toFixed(2)}% 毛利率
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-accent/30" />
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">平均单价</div>
              <div className="text-2xl font-bold text-foreground">¥{financialMetrics.avgOrderValue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-2">
                平均利润 ¥{financialMetrics.avgProfit.toFixed(2)}
              </div>
            </div>
            <TrendingDown className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>
      </div>

      {/* Charts Section or Text Summary */}
      {data.length > 1000 ? (
        <Card className="p-6 bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">商品销售概览（文字版）</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              💡 由于订单数量较多（{data.length} 条），为保证性能，已切换至文字模式。
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Top 8 商品收入排行：</h4>
            {productBreakdown.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.count} 个订单</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">¥{product.revenue.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">
                    利润 ¥{product.profit.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : showCharts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Revenue Chart */}
          <Card className="p-6 bg-card border border-border">
            <h3 className="font-semibold text-foreground mb-4">商品收入排行 (Top 8)</h3>
            <ChartContainer
              config={{
                revenue: {
                  label: "收入",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-64"
            >
              <BarChart data={productBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" />
              </BarChart>
            </ChartContainer>
          </Card>

          {/* Profit Distribution Pie Chart */}
          {profitDistribution.length > 0 && (
            <Card className="p-6 bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-4">利润分布</h3>
              <ChartContainer
                config={{
                  highMargin: { label: "高利润", color: "#10b981" },
                  midMargin: { label: "中等利润", color: "#f59e0b" },
                  lowMargin: { label: "低利润", color: "#ef4444" },
                  loss: { label: "亏损", color: "#6366f1" },
                }}
                className="h-64"
              >
                <PieChart>
                  <Pie
                    data={profitDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {profitDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-12 bg-card border border-border">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <div className="text-sm text-muted-foreground">正在生成图表...</div>
          </div>
        </Card>
      )}

      {/* Risk Analysis */}
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            利润风险分析
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">高利润订单</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {profitAnalysis.highMarginCount}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-2">利润率 &gt; 25%</div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-2">低利润订单</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {profitAnalysis.lowMarginCount}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">利润率 0-15%</div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">亏损订单</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{profitAnalysis.breakEvenCount}</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-2">需要审查</div>
          </div>
        </div>
      </Card>

      {/* Low Margin Details */}
      {profitAnalysis.lowMarginCount > 0 && (
        <Card className="p-6 bg-card border border-border">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              console.log("[报告] 切换低利润订单详情:", !showLowMargin)
              setShowLowMargin(!showLowMargin)
            }}
            className="w-full flex items-center justify-between font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span>低利润订单详情 ({profitAnalysis.lowMarginCount})</span>
            <span className={`transition-transform ${showLowMargin ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showLowMargin && (
            <div className="mt-4 overflow-x-auto max-h-[60vh] overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-border sticky top-0 bg-card shadow-sm z-10">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground bg-card">订单号</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground bg-card">商品</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">售价</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">成本</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">利润</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">利润率</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAnalysis.lowMarginOrders.slice(0, 30).map((order, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 text-foreground text-xs">{order["订单号"] || "-"}</td>
                      <td className="py-2 px-3 text-foreground">{(order["商品名称"] || "-").substring(0, 40)}</td>
                      <td className="py-2 px-3 text-right text-foreground">¥{(order.sellingPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-foreground">¥{(order.totalCost || order.cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-yellow-600 dark:text-yellow-500 font-semibold">
                        ¥{(order.profit || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-yellow-600 dark:text-yellow-500">
                        {order.profitMargin || "0"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-center py-2 text-xs text-muted-foreground bg-muted/20">
                显示前 30 条低利润订单（共 {profitAnalysis.lowMarginCount} 条）
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 亏损订单详情 */}
      {profitAnalysis.breakEvenCount > 0 && (
        <Card className="p-6 bg-card border border-border">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              console.log("[报告] 切换亏损订单详情:", !showBreakEven)
              setShowBreakEven(!showBreakEven)
            }}
            className="w-full flex items-center justify-between font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span className="text-red-600">⚠️ 亏损订单详情 ({profitAnalysis.breakEvenCount})</span>
            <span className={`transition-transform ${showBreakEven ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showBreakEven && (
            <div className="mt-4 overflow-x-auto max-h-[60vh] overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-border sticky top-0 bg-card shadow-sm z-10">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground bg-card">订单号</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground bg-card">商品</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">售价</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">成本</th>
                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground bg-card">亏损额</th>
                    <th className="text-center py-3 px-3 font-semibold text-muted-foreground bg-card">匹配状态</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAnalysis.breakEvenOrders.slice(0, 30).map((order, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-red-50/50">
                      <td className="py-2 px-3 text-foreground text-xs">{order["订单号"] || "-"}</td>
                      <td className="py-2 px-3 text-foreground">{(order["商品名称"] || "-").substring(0, 40)}</td>
                      <td className="py-2 px-3 text-right text-foreground">¥{(order.sellingPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-foreground">¥{(order.totalCost || order.cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-red-600 font-semibold">
                        ¥{Math.abs(order.profit || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {order.matchStatus === "matched" ? (
                          <span className="text-xs text-green-600">✓ 已匹配</span>
                        ) : (
                          <span className="text-xs text-red-600">✗ 未匹配</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-center py-2 text-xs text-muted-foreground bg-muted/20">
                显示前 30 条亏损订单（共 {profitAnalysis.breakEvenCount} 条）
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 完整数据明细表 */}
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">完整订单明细（FR-4.1 计算结果）</h3>
          </div>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              console.log("[报告] 切换完整明细表:", !showDetailedReport)
              setShowDetailedReport(!showDetailedReport)
            }}
            variant="outline"
            size="sm"
          >
            {showDetailedReport ? "收起" : "展开查看"}
          </Button>
        </div>

        {showDetailedReport && (
          <div className="mt-4 overflow-x-auto max-h-[70vh] overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="border-b-2 border-border sticky top-0 bg-card shadow-sm z-10">
                <tr>
                  <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">订单号</th>
                  <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">商品名称</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">数量</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">商家实收金额</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">成本价</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">总成本<br/>（FR-4.1）</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">单品利润<br/>（FR-4.1）</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">利润率</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((order, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-border hover:bg-muted/30 ${
                      order.profit <= 0 ? "bg-red-50/30" : 
                      order.profit < order.sellingPrice * 0.15 ? "bg-yellow-50/30" : 
                      "bg-green-50/20"
                    }`}
                  >
                    <td className="py-2 px-2 text-foreground text-xs whitespace-nowrap">
                      {(order["订单号"] || "-").substring(0, 20)}
                    </td>
                    <td className="py-2 px-2 text-foreground" title={order["商品名称"]}>
                      {(order["商品名称"] || "-").substring(0, 30)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">{order.quantity || 1}</td>
                    <td className="py-2 px-2 text-right text-foreground font-semibold">
                      ¥{(order.sellingPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">
                      ¥{(order.unitCost || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-semibold">
                      ¥{(order.totalCost || order.cost || 0).toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${
                      order.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      ¥{(order.profit || 0).toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right text-xs ${
                      parseFloat(order.profitMargin || 0) >= 25 ? "text-green-600" :
                      parseFloat(order.profitMargin || 0) >= 15 ? "text-blue-600" :
                      parseFloat(order.profitMargin || 0) >= 0 ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {order.profitMargin || "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-center py-2 text-xs text-muted-foreground bg-muted/20">
              显示前 100 条订单明细（共 {data.length} 条）
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
