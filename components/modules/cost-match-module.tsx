"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"

interface CostMatchModuleProps {
  orders: any[]
  products: any[]
  onComplete: (enriched: any[]) => void
  onBack: () => void
}

export function CostMatchModule({ orders, products, onComplete, onBack }: CostMatchModuleProps) {
  const [matchStrategy, setMatchStrategy] = useState<"cost" | "purchase">("cost")

  const enrichedOrders = useMemo(() => {
    const productMap = new Map(products.map((p) => [p["商品编码"], p]))

    return orders.map((order) => {
      const product = productMap.get(order["商品编码"])
      const costPerUnit = product ? (matchStrategy === "cost" ? product["成本"] : product["进价"]) : 0
      const totalCost = costPerUnit * order["数量"]
      const profit = order["金额"] - totalCost

      return {
        ...order,
        成本单价: costPerUnit,
        总成本: totalCost,
        利润: profit,
        利润率: order["金额"] > 0 ? ((profit / order["金额"]) * 100).toFixed(2) + "%" : "0%",
        匹配状态: product ? "已匹配" : "未找到",
      }
    })
  }, [orders, products, matchStrategy])

  const stats = useMemo(() => {
    const matched = enrichedOrders.filter((o) => o.匹配状态 === "已匹配").length
    const totalRevenue = enrichedOrders.reduce((sum, o) => sum + o["金额"], 0)
    const totalCost = enrichedOrders.reduce((sum, o) => sum + o.总成本, 0)
    const totalProfit = totalRevenue - totalCost

    return {
      matched,
      unmatched: enrichedOrders.length - matched,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: ((totalProfit / totalRevenue) * 100).toFixed(2),
    }
  }, [enrichedOrders])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">成本匹配</h1>
            <p className="text-sm text-gray-600">关联商品库成本信息</p>
          </div>
        </div>

        {/* Strategy Selector */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">选择成本类型</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={matchStrategy === "cost"}
                onChange={() => setMatchStrategy("cost")}
                className="w-4 h-4"
              />
              <span className="text-gray-700">实际成本</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={matchStrategy === "purchase"}
                onChange={() => setMatchStrategy("purchase")}
                className="w-4 h-4"
              />
              <span className="text-gray-700">进价</span>
            </label>
          </div>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <p className="text-gray-600 text-sm">已匹配</p>
            <p className="text-2xl font-bold text-blue-600">{stats.matched}</p>
            <p className="text-xs text-gray-600 mt-1">未匹配: {stats.unmatched}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
            <p className="text-gray-600 text-sm">总销售额</p>
            <p className="text-2xl font-bold text-purple-600">¥{stats.totalRevenue.toFixed(0)}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
            <p className="text-gray-600 text-sm">总成本</p>
            <p className="text-2xl font-bold text-orange-600">¥{stats.totalCost.toFixed(0)}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-gray-600 text-sm">总利润</p>
            <p className="text-2xl font-bold text-green-600">¥{stats.totalProfit.toFixed(0)}</p>
            <p className="text-xs text-gray-600 mt-1">{stats.profitMargin}% 利润率</p>
          </Card>
        </div>

        {/* Details Table */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">成本匹配详情</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">订单号</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">商品</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-700">销售额</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-700">成本</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-700">利润</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-700">状态</th>
                </tr>
              </thead>
              <tbody>
                {enrichedOrders.slice(0, 15).map((order, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-semibold text-gray-900">{order["订单号"]}</td>
                    <td className="py-2 px-2 text-gray-600">{order["商品名称"]}</td>
                    <td className="py-2 px-2 text-right text-gray-900">¥{order["金额"]}</td>
                    <td className="py-2 px-2 text-right text-gray-900">¥{order.总成本.toFixed(2)}</td>
                    <td
                      className={`py-2 px-2 text-right font-semibold ${
                        order.利润 >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ¥{order.利润.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {order.匹配状态 === "已匹配" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Button
          onClick={() => onComplete(enrichedOrders)}
          className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg"
        >
          下一步: 查看报告
        </Button>
      </div>
    </div>
  )
}
