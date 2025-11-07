"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface DashboardModuleProps {
  orders: any[]
  onExport: () => void
  onBack: () => void
  onReset: () => void
}

export function DashboardModule({ orders, onExport, onBack, onReset }: DashboardModuleProps) {
  const analytics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o["金额"], 0)
    const totalCost = orders.reduce((sum, o) => sum + o.总成本, 0)
    const totalProfit = totalRevenue - totalCost
    const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(2)

    const topProducts = Array.from(
      new Map(
        orders.map((o) => [
          o["商品名称"],
          {
            name: o["商品名称"],
            revenue: orders.filter((x) => x["商品名称"] === o["商品名称"]).reduce((sum, x) => sum + x["金额"], 0) || 0,
            count: orders.filter((x) => x["商品名称"] === o["商品名称"]).length,
          },
        ]),
      ).values(),
    )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const lowMarginOrders = orders.filter((o) => {
      const margin = Number.parseFloat(o.利润率) || 0
      return margin < 20 && margin > 0
    })

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      orderCount: orders.length,
      topProducts,
      lowMarginOrders,
      avgOrderValue: (totalRevenue / orders.length).toFixed(2),
    }
  }, [orders])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">财务报告</h1>
              <p className="text-sm text-gray-600">完整的销售分析仪表板</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onReset} className="text-gray-600 bg-transparent">
            新建分析
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">订单数</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.orderCount}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-300" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100">
            <div>
              <p className="text-gray-600 text-sm">总销售额</p>
              <p className="text-3xl font-bold text-purple-600">¥{analytics.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-gray-600 mt-2">平均: ¥{analytics.avgOrderValue}</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100">
            <div>
              <p className="text-gray-600 text-sm">总成本</p>
              <p className="text-3xl font-bold text-orange-600">¥{analytics.totalCost.toFixed(0)}</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">总利润</p>
                <p className="text-3xl font-bold text-green-600">¥{analytics.totalProfit.toFixed(0)}</p>
                <div className="flex items-center gap-1 mt-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">{analytics.profitMargin}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Products */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">畅销商品</h2>
            <div className="space-y-3">
              {analytics.topProducts.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {idx + 1}. {product.name}
                    </p>
                    <p className="text-sm text-gray-600">销量: {product.count}件</p>
                  </div>
                  <p className="font-semibold text-blue-600">¥{product.revenue.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Low Margin Alert */}
          <Card className="p-6 bg-yellow-50 border border-yellow-200">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
              低利润订单
            </h2>
            <p className="text-sm text-gray-600 mb-4">发现 {analytics.lowMarginOrders.length} 个利润率低于20%的订单</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analytics.lowMarginOrders.slice(0, 8).map((order, idx) => (
                <div key={idx} className="p-2 bg-white rounded text-sm flex justify-between">
                  <span className="text-gray-700">{order["订单号"]}</span>
                  <span className="text-yellow-600 font-semibold">{order.利润率}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onExport}
            className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg"
          >
            导出Excel报告
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="h-12 text-gray-700 font-semibold rounded-lg bg-transparent"
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
