"use client"

import type React from "react"
import { useState } from "react"
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import * as XLSX from "xlsx"

interface DataImportModuleProps {
  onImport: (data: { orders: any[]; products: any[] }) => void
}

  // 文件大小限制
  const MAX_CSV_SIZE_API = 50 * 1024 * 1024 // 50MB
  const MAX_EXCEL_SIZE_API = 50 * 1024 * 1024 // 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  const MAX_EXCEL_SIZE = 15 * 1024 * 1024

export default function DataImportModule({ onImport }: DataImportModuleProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<string>("")
  const [uploadedFiles, setUploadedFiles] = useState<{ orders: boolean; products: boolean }>({
    orders: false,
    products: false,
  })
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")

  // 改进的 CSV 解析函数，正确处理包含逗号的字段
  const parseCSV = (text: string) => {
    const lines: string[] = []
    let currentLine = ""
    let inQuotes = false

    // 逐字符解析，正确处理引号内的逗号
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 双引号转义
          currentLine += '"'
          i++ // 跳过下一个引号
        } else {
          // 切换引号状态
          inQuotes = !inQuotes
          currentLine += char
        }
      } else if (char === "\n" && !inQuotes) {
        // 行结束
        if (currentLine.trim()) {
          lines.push(currentLine)
        }
        currentLine = ""
      } else {
        currentLine += char
      }
    }
    // 添加最后一行
    if (currentLine.trim()) {
      lines.push(currentLine)
    }

    if (lines.length < 1) return []

    // 解析第一行作为表头
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = []
      let currentValue = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === "," && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ""
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim())
      return values
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim())

    // 解析数据行
    const data = lines
      .slice(1)
      .map((line) => {
        const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, "").trim())
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ""
        })
        return obj
      })
      .filter((obj) => Object.values(obj).some((val) => val !== ""))

    return data
  }

  // 使用后端 API 解析文件
  const parseFileViaAPI = async (file: File): Promise<any[]> => {
    setLoadingProgress("正在上传文件到服务器...")
    
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/parse-file", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "服务器错误" }))
      throw new Error(errorData.error || `服务器错误: ${response.status}`)
    }

    setLoadingProgress("正在解析数据...")
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || "文件解析失败")
    }

    return result.data
  }

  // Excel 文件解析函数
  const parseExcelFile = async (file: File): Promise<any[]> => {
    // 先检查文件大小
    if (file.size > MAX_EXCEL_SIZE) {
      throw new Error(
        `Excel 文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，超过限制 (${MAX_EXCEL_SIZE / 1024 / 1024}MB)。\n\n` +
        `解决方案：\n` +
        `1. 将 Excel 文件另存为 CSV 格式（推荐，可处理更大文件）\n` +
        `2. 或者将文件拆分为多个较小的 Excel 文件分批导入\n` +
        `3. CSV 格式支持最大 ${MAX_FILE_SIZE / 1024 / 1024}MB 的文件`
      )
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            reject(new Error("无法读取文件"))
            return
          }

          // 统一使用 binary string，避免内存分配问题
          const workbook = XLSX.read(data, { 
            type: "binary",
            cellDates: true,
            cellNF: false,
            cellText: false,
            dense: false // 不使用密集模式，节省内存
          })

          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // 使用优化的选项解析 JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: "",
            raw: false, // 不保留原始值，节省内存
            dateNF: "yyyy-mm-dd",
            blankrows: false // 跳过空行
          })
          
          resolve(jsonData as any[])
        } catch (error) {
          console.error("Excel 解析错误:", error)
          
          // 检查是否是内存分配错误
          if (error instanceof Error && 
              (error.message.includes("allocation") || 
               error.message.includes("Array buffer") ||
               error.stack?.includes("Array buffer"))) {
            reject(new Error(
              `Excel 文件解析失败：浏览器内存不足。\n\n` +
              `建议解决方案：\n` +
              `1. 将 Excel 文件转换为 CSV 格式（CSV 格式更节省内存，推荐）\n` +
              `2. 关闭其他浏览器标签页释放内存后重试\n` +
              `3. 使用 Chrome 浏览器（内存限制更大）\n` +
              `4. 将文件拆分为多个较小的文件`
            ))
          } else {
            reject(new Error(`Excel 文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`))
          }
        }
      }
      
      reader.onerror = (error) => {
        console.error("文件读取错误:", error)
        reject(new Error("文件读取失败，可能是文件过大或格式不正确"))
      }

      // 统一使用 readAsBinaryString，避免 ArrayBuffer 内存分配问题
      reader.readAsBinaryString(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "orders" | "products") => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setSuccessMessage("")
    setLoading(true)
    setLoadingProgress("正在读取文件...")

    let currentFile = file // 保存 file 引用，以便在 catch 中使用

    try {
      let data: any[] = []
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
      const isCSV = file.name.endsWith(".csv")

      if (!isCSV && !isExcel) {
        throw new Error("请上传 CSV 或 Excel 文件 (.csv, .xlsx, .xls)")
      }

      // 判断是否使用后端 API
      // Excel 文件统一使用后端 API（因为解压需要大量内存）
      // CSV 文件超过 30MB 使用后端 API
      const shouldUseAPI = 
        isExcel || // 所有 Excel 文件都使用后端 API
        (isCSV && file.size > 30 * 1024 * 1024)

      if (shouldUseAPI) {
        // 使用后端 API 解析
        setLoadingProgress(`文件较大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，使用服务器解析...`)
        data = await parseFileViaAPI(file)
        setLoadingProgress("正在处理数据...")
      } else {
        // 使用前端解析（小文件）
        if (isExcel && file.size > MAX_EXCEL_SIZE) {
          throw new Error(
            `Excel 文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，超过限制 (${MAX_EXCEL_SIZE / 1024 / 1024}MB)。\n\n` +
            `解决方案：\n` +
            `1. 将 Excel 文件另存为 CSV 格式（推荐，可处理更大文件）\n` +
            `2. 或者将文件拆分为多个较小的 Excel 文件分批导入\n` +
            `3. CSV 格式支持最大 ${MAX_FILE_SIZE / 1024 / 1024}MB 的文件`
          )
        }

        if (isCSV && file.size > MAX_FILE_SIZE) {
          throw new Error(`CSV 文件过大 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        }

        // 对于超大文件，给出提示
        if (file.size > 20 * 1024 * 1024) {
          setLoadingProgress(`文件较大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，解析可能需要一些时间，请耐心等待...`)
        }

        if (isCSV) {
          setLoadingProgress("正在解析 CSV 文件...")
          // CSV 文件使用流式读取
          try {
            const text = await file.text()
            setLoadingProgress("正在处理数据...")
            data = parseCSV(text)
          } catch (error) {
            // 如果 file.text() 失败（内存不足），尝试使用 API
            if (error instanceof Error && 
                (error.message.includes("allocation") || 
                 error.message.includes("Array buffer"))) {
              setLoadingProgress("浏览器内存不足，切换到服务器解析...")
              data = await parseFileViaAPI(file)
            } else {
              throw error
            }
          }
        } else if (isExcel) {
          // Excel 文件应该不会走到这里（因为 shouldUseAPI 应该为 true）
          // 但为了安全，仍然尝试使用 API
          setLoadingProgress("正在解析 Excel 文件...")
          try {
            data = await parseExcelFile(file)
            setLoadingProgress("正在处理数据...")
          } catch (error) {
            // 如果解析失败（内存不足），切换到 API
            console.warn("前端解析失败，切换到服务器解析:", error)
            setLoadingProgress("浏览器内存不足，切换到服务器解析...")
            data = await parseFileViaAPI(file)
          }
        }
      }

      if (data.length === 0) {
        throw new Error("文件为空或格式错误，请检查文件内容")
      }

      setLoadingProgress(`成功解析 ${data.length} 条记录`)
      console.log(`成功解析 ${data.length} 条记录`)

      if (type === "orders") {
        setOrders(data)
        setUploadedFiles((prev) => ({ ...prev, orders: true }))
      } else {
        setProducts(data)
        setUploadedFiles((prev) => ({ ...prev, products: true }))
      }
    } catch (error) {
      let errorMessage = "文件解析失败"
      
      if (error instanceof Error) {
        // 如果是内存错误，尝试最后一次使用 API
        const isMemoryError = 
          error.message.includes("allocation") || 
          error.message.includes("Array buffer") ||
          error.stack?.includes("Array buffer") ||
          error.name === "RangeError" ||
          error.message.includes("string longer than")
        
        if (isMemoryError && currentFile) {
          try {
            console.warn("检测到内存错误，尝试使用服务器解析:", error.name)
            setLoadingProgress("浏览器内存不足，切换到服务器解析...")
            const data = await parseFileViaAPI(currentFile)
            // 如果成功，继续处理
            if (data.length > 0) {
              if (type === "orders") {
                setOrders(data)
                setUploadedFiles((prev) => ({ ...prev, orders: true }))
              } else {
                setProducts(data)
                setUploadedFiles((prev) => ({ ...prev, products: true }))
              }
              setLoading(false)
              setLoadingProgress("")
              return
            }
          } catch (apiError) {
            console.error("API 解析也失败:", apiError)
            errorMessage = `文件解析失败：浏览器和服务器都无法处理此文件。\n\n建议：\n1. 将 Excel 文件转换为 CSV 格式\n2. 或者将文件拆分为多个较小的文件`
          }
        } else {
          // 限制错误消息长度
          const msg = error.message
          errorMessage = msg.length > 500 ? msg.substring(0, 500) + "..." : msg
        }
      }
      
      console.error("[数据导入] 文件解析错误:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      setLoadingProgress("")
    }
  }

  const handleImport = () => {
    if (orders.length === 0 || products.length === 0) {
      setError("请上传两个文件")
      return
    }
    setError("")
    // 移除 localStorage 存储，避免大数据导致配额超限
    // 数据已通过 React 状态和 props 传递，无需持久化
    onImport({ orders, products })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 bg-card border border-border">
        <h2 className="text-xl font-bold text-foreground mb-6">导入数据文件</h2>

        <div className="space-y-6">
          {/* Loading Progress */}
          {loading && loadingProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">{loadingProgress}</div>
            </div>
          )}

          {/* Success Display */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-700 whitespace-pre-line">{successMessage}</div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
            </div>
          )}

          {/* Orders Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">淘宝订单数据 (CSV / Excel)</label>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileUpload(e, "orders")}
                className="hidden"
                id="orders-upload"
                disabled={loading}
              />
              <label
                htmlFor="orders-upload"
                className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground">
                  {uploadedFiles.orders ? "已上传" : "点击上传或拖放文件"}
                </span>
                <span className="text-xs text-muted-foreground mt-2 block">
                  支持 CSV、XLS、XLSX 格式<br />
                  <span className="text-xs">
                    CSV 最大 {Math.round(MAX_CSV_SIZE_API / 1024 / 1024)}MB | Excel 最大 {Math.round(MAX_EXCEL_SIZE_API / 1024 / 1024)}MB
                  </span>
                </span>
                {uploadedFiles.orders && (
                  <span className="text-xs text-primary mt-2 font-semibold">{orders.length} 条记录</span>
                )}
              </label>
            </div>
          </div>

          {/* Products Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">聚水潭商品库 (CSV / Excel)</label>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileUpload(e, "products")}
                className="hidden"
                id="products-upload"
                disabled={loading}
              />
              <label
                htmlFor="products-upload"
                className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground">
                  {uploadedFiles.products ? "已上传" : "点击上传或拖放文件"}
                </span>
                <span className="text-xs text-muted-foreground mt-2 block">
                  支持 CSV、XLS、XLSX 格式<br />
                  <span className="text-xs">
                    CSV 最大 {Math.round(MAX_CSV_SIZE_API / 1024 / 1024)}MB | Excel 最大 {Math.round(MAX_EXCEL_SIZE_API / 1024 / 1024)}MB
                  </span>
                </span>
                {uploadedFiles.products && (
                  <span className="text-xs text-primary mt-2 font-semibold">{products.length} 条记录</span>
                )}
              </label>
            </div>
          </div>

          {/* Status */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              {uploadedFiles.orders ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">淘宝订单数据</span>
            </div>
            <div className="flex items-center gap-2">
              {uploadedFiles.products ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">聚水潭商品库</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleImport}
              disabled={!uploadedFiles.orders || !uploadedFiles.products || loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (loadingProgress || "处理中...") : "导入数据"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
