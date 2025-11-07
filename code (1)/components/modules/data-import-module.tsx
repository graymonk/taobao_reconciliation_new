"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface DataImportModuleProps {
  onComplete: (data: { orders: any[]; products: any[] }) => void
}

export function DataImportModule({ onComplete }: DataImportModuleProps) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    orders?: string
    products?: string
  }>({})
  const [parsedData, setParsedData] = useState<{
    orders: any[]
    products: any[]
  }>({ orders: [], products: [] })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const fileInputRefs = {
    orders: useRef<HTMLInputElement>(null),
    products: useRef<HTMLInputElement>(null),
  }

  const parseExcelFile = async (file: File, type: "orders" | "products"): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: "orders" | "products") => {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus("loading")
    try {
      const data = await parseExcelFile(file, type)
      const fileName = file.name

      setUploadedFiles((prev) => ({
        ...prev,
        [type]: fileName,
      }))

      setParsedData((prev) => ({
        ...prev,
        [type]: data,
      }))

      setStatus("success")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (error) {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }

  const isReady = uploadedFiles.orders && uploadedFiles.products

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">销售报告生成器</h1>
          <p className="text-gray-600">导入淘宝订单和聚水潭商品库数据开始分析</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Orders Upload */}
          <Card
            className="p-6 border-2 border-dashed border-blue-300 hover:border-blue-500 transition cursor-pointer"
            onClick={() => fileInputRefs.orders.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="w-8 h-8 text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">淘宝订单</p>
                <p className="text-sm text-gray-600">上传Excel文件</p>
              </div>
              {uploadedFiles.orders && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">{uploadedFiles.orders}</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRefs.orders}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileChange(e, "orders")}
              hidden
            />
          </Card>

          {/* Products Upload */}
          <Card
            className="p-6 border-2 border-dashed border-green-300 hover:border-green-500 transition cursor-pointer"
            onClick={() => fileInputRefs.products.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="w-8 h-8 text-green-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">商品库</p>
                <p className="text-sm text-gray-600">上传Excel文件</p>
              </div>
              {uploadedFiles.products && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">{uploadedFiles.products}</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRefs.products}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileChange(e, "products")}
              hidden
            />
          </Card>
        </div>

        {/* Status Messages */}
        {status === "error" && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700">文件解析失败，请检查文件格式</span>
          </div>
        )}

        {/* Data Summary */}
        {Object.keys(uploadedFiles).length > 0 && (
          <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
            <div className="space-y-2 text-sm">
              {uploadedFiles.orders && (
                <p className="text-gray-700">
                  订单数据: <span className="font-semibold text-blue-600">{parsedData.orders.length}</span> 条
                </p>
              )}
              {uploadedFiles.products && (
                <p className="text-gray-700">
                  商品数据: <span className="font-semibold text-green-600">{parsedData.products.length}</span> 条
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Action Button */}
        <div className="mt-8">
          <Button
            onClick={() => onComplete(parsedData)}
            disabled={!isReady}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReady ? "下一步: 数据筛选" : "请上传两个文件"}
          </Button>
        </div>

        {/* Sample Data Loader */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              // Load sample data for demo
              const sampleOrders = [
                {
                  订单号: "T001",
                  商品编码: "SKU001",
                  商品名称: "蓝色T恤",
                  数量: 2,
                  单价: 50,
                  金额: 100,
                  退款: "否",
                  备注: "",
                  订单状态: "已完成",
                },
                {
                  订单号: "T002",
                  商品编码: "SKU002",
                  商品名称: "红色帽子",
                  数量: 1,
                  单价: 30,
                  金额: 30,
                  退款: "否",
                  备注: "VIP订单",
                  订单状态: "已完成",
                },
                {
                  订单号: "T003",
                  商品编码: "SKU001",
                  商品名称: "蓝色T恤",
                  数量: 3,
                  单价: 50,
                  金额: 150,
                  退款: "是",
                  备注: "质量问题",
                  订单状态: "已退款",
                },
              ]

              const sampleProducts = [
                {
                  商品编码: "SKU001",
                  商品名称: "蓝色T恤",
                  成本: 25,
                  进价: 28,
                  分类: "服装",
                },
                {
                  商品编码: "SKU002",
                  商品名称: "红色帽子",
                  成本: 12,
                  进价: 15,
                  分类: "配饰",
                },
              ]

              setUploadedFiles({
                orders: "sample_orders.xlsx",
                products: "sample_products.xlsx",
              })
              setParsedData({
                orders: sampleOrders,
                products: sampleProducts,
              })
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            或使用示例数据
          </button>
        </div>
      </div>
    </div>
  )
}
