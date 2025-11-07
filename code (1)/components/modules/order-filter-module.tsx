"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Filter, CheckCircle2 } from "lucide-react"

interface OrderFilterModuleProps {
  orders: any[]
  onComplete: (filtered: any[]) => void
  onBack: () => void
}

export function OrderFilterModule({ orders, onComplete, onBack }: OrderFilterModuleProps) {
  const [filters, setFilters] = useState({
    excludeRefunds: true,
    excludeVIP: false,
    minAmount: 0,
  })

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.excludeRefunds && order["退款"] === "是") return false
      if (filters.excludeVIP && order["备注"]?.includes("VIP")) return false
      if (order["金额"] < filters.minAmount) return false
      return true
    })
  }, [orders, filters])

  const stats = {
    total: orders.length,
    filtered: filteredOrders.length,
    excluded: orders.length - filteredOrders.length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">订单筛选</h1>
            <p className="text-sm text-gray-600">配置筛选规则移除无效订单</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <p className="text-gray-600 text-sm">原始订单数</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-gray-600 text-sm">有效订单</p>
            <p className="text-2xl font-bold text-green-600">{stats.filtered}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100">
            <p className="text-gray-600 text-sm">已排除</p>
            <p className="text-2xl font-bold text-red-600">{stats.excluded}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            筛选规则
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeRefunds}
                onChange={(e) => setFilters({ ...filters, excludeRefunds: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">排除退款订单</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeVIP}
                onChange={(e) => setFilters({ ...filters, excludeVIP: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">排除VIP订单</span>
            </label>

            <div>
              <label className="block text-gray-700 mb-2">最小订单金额: ¥{filters.minAmount}</label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: Number.parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Preview Table */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">筛选结果预览</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">订单号</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">商品</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">金额</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 10).map((order, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-900">{order["订单号"]}</td>
                    <td className="py-2 px-2 text-gray-600">{order["商品名称"]}</td>
                    <td className="py-2 px-2 text-gray-900 font-semibold">¥{order["金额"]}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        有效
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 10 && (
              <p className="text-center text-gray-600 mt-4 text-sm">还有 {filteredOrders.length - 10} 条订单未显示</p>
            )}
          </div>
        </Card>

        {/* Action Button */}
        <Button
          onClick={() => onComplete(filteredOrders)}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg"
        >
          下一步: 成本匹配 ({filteredOrders.length} 条订单)
        </Button>
      </div>
    </div>
  )
}
