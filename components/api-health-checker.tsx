"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RequestDetails {
  userAgent: string
  referrerPolicy: string
  platform: string
  language: string
  secChUaPlatform: string | null
  responseHeaders: Record<string, string>
  ip: string | null
  server: string | null
  contentType: string | null
  responseTime: number
}

export default function ApiHealthChecker() {
  const [url, setUrl] = useState("https://blog.nemati.ai/api/v1/health/")
  const [curlCommand, setCurlCommand] = useState("")
  const [data, setData] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null)

  const parseCurlCommand = (
    curl: string,
  ): { url: string; method: string; headers: Record<string, string>; body: string | null } => {
    const result = { url: "", method: "GET", headers: {} as Record<string, string>, body: null as string | null }

    // Extract URL
    const urlMatch = curl.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/)
    if (urlMatch) result.url = urlMatch[1]

    // Extract method
    const methodMatch = curl.match(/-X\s+['"]?(\w+)['"]?/)
    if (methodMatch) result.method = methodMatch[1]

    // Extract headers
    const headerMatches = curl.matchAll(/-H\s+['"]([^'"]+)['"]/g)
    for (const match of headerMatches) {
      const [key, ...valueParts] = match[1].split(":")
      if (key && valueParts.length) {
        result.headers[key.trim()] = valueParts.join(":").trim()
      }
    }

    // Extract body
    const bodyMatch = curl.match(/-d\s+['"](.+?)['"](?:\s|$)/s) || curl.match(/--data\s+['"](.+?)['"](?:\s|$)/s)
    if (bodyMatch) {
      result.body = bodyMatch[1].replace(/\.\.\./g, "").replace(/\n/g, "")
    }

    return result
  }

  const handleFetch = async (
    testUrl?: string,
    method = "GET",
    headers: Record<string, string> = {},
    body: string | null = null,
  ) => {
    const targetUrl = testUrl || url
    if (!targetUrl) {
      setData("Please enter a valid URL.")
      setIsError(true)
      return
    }

    setLoading(true)
    setData("")
    setIsError(false)
    setStatusCode(null)
    setRequestDetails(null)

    const startTime = performance.now()
    const xhr = new XMLHttpRequest()
    xhr.open(method, targetUrl, true)

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })

    xhr.onload = () => {
      const endTime = performance.now()
      let formattedData = xhr.responseText
      try {
        const json = JSON.parse(xhr.responseText)
        formattedData = JSON.stringify(json, null, 2)
      } catch {
        // Not JSON, keep as text
      }
      setStatusCode(xhr.status)
      setData(formattedData)
      setIsError(xhr.status < 200 || xhr.status >= 300)

      const responseHeaders: Record<string, string> = {}
      const headerString = xhr.getAllResponseHeaders()
      headerString.split("\r\n").forEach((line) => {
        const [key, value] = line.split(": ")
        if (key && value) responseHeaders[key] = value
      })

      setRequestDetails({
        userAgent: navigator.userAgent,
        referrerPolicy: document.referrerPolicy || "no-referrer-when-downgrade",
        platform: navigator.platform,
        language: navigator.language,
        secChUaPlatform: (navigator as any).userAgentData?.platform || null,
        responseHeaders,
        ip: null, // Can't get from browser
        server: xhr.getResponseHeader("server"),
        contentType: xhr.getResponseHeader("content-type"),
        responseTime: endTime - startTime,
      })

      setLoading(false)
    }

    xhr.onerror = () => {
      const endTime = performance.now()
      let errorMsg = "Network error"
      if (xhr.status === 0) {
        errorMsg = "CORS error: Unable to access the resource. The server may not have proper CORS headers configured."
      } else {
        errorMsg = `Error: ${xhr.status} ${xhr.statusText}`
      }
      setData(errorMsg)
      setIsError(true)
      setStatusCode(xhr.status || 0)

      setRequestDetails({
        userAgent: navigator.userAgent,
        referrerPolicy: document.referrerPolicy || "no-referrer-when-downgrade",
        platform: navigator.platform,
        language: navigator.language,
        secChUaPlatform: (navigator as any).userAgentData?.platform || null,
        responseHeaders: {},
        ip: null,
        server: null,
        contentType: null,
        responseTime: endTime - startTime,
      })

      setLoading(false)
    }

    xhr.send(body)
  }

  const handleCurlExecute = () => {
    if (!curlCommand.trim()) {
      setData("Please enter a cURL command.")
      setIsError(true)
      return
    }

    const parsed = parseCurlCommand(curlCommand)
    if (!parsed.url) {
      setData("Could not parse URL from cURL command.")
      setIsError(true)
      return
    }

    handleFetch(parsed.url, parsed.method, parsed.headers, parsed.body)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleFetch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-balance">NJ Health Check</h1>
          </div>
          <p className="text-muted-foreground text-lg">API Health Check & CORS Testing Tool</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Testing</CardTitle>
            <CardDescription>Test APIs using URL or paste cURL commands</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">URL Test</TabsTrigger>
                <TabsTrigger value="curl">cURL Test</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="https://dev-api.pencilly.us/api/v1/health"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={() => handleFetch()} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Health"
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="curl" className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Paste your cURL command here...&#10;&#10;Example:&#10;curl -X 'POST' \&#10;  'https://blog.nemati.ai/api/v1/feedback/feedback/' \&#10;  -H 'accept: application/json' \&#10;  -H 'Content-Type: application/json' \&#10;  -d '{...}'"
                    value={curlCommand}
                    onChange={(e) => setCurlCommand(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <Button onClick={handleCurlExecute} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      "Execute cURL"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {statusCode !== null && (
              <Alert variant={isError ? "destructive" : "default"} className="mt-4">
                <div className="flex items-center gap-2">
                  {isError ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <AlertDescription>Status: {statusCode === 0 ? "CORS Error" : `${statusCode}`}</AlertDescription>
                </div>
              </Alert>
            )}

            {data && (
              <Card className="bg-slate-50 dark:bg-slate-900 mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre
                    className={`text-sm whitespace-pre-wrap overflow-x-auto ${
                      isError ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {data}
                  </pre>
                </CardContent>
              </Card>
            )}

            {!data && !loading && (
              <div className="text-center text-muted-foreground py-8">Response will appear here...</div>
            )}
          </CardContent>
        </Card>

        {requestDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Information about the request and response</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Property</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">User Agent</TableCell>
                    <TableCell className="font-mono text-sm break-all">{requestDetails.userAgent}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Platform</TableCell>
                    <TableCell className="font-mono text-sm">{requestDetails.platform}</TableCell>
                  </TableRow>
                  {requestDetails.secChUaPlatform && (
                    <TableRow>
                      <TableCell className="font-medium">sec-ch-ua-platform</TableCell>
                      <TableCell className="font-mono text-sm">{requestDetails.secChUaPlatform}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Language</TableCell>
                    <TableCell className="font-mono text-sm">{requestDetails.language}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Referrer Policy</TableCell>
                    <TableCell className="font-mono text-sm">{requestDetails.referrerPolicy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Response Time</TableCell>
                    <TableCell className="font-mono text-sm">{requestDetails.responseTime.toFixed(2)} ms</TableCell>
                  </TableRow>
                  {requestDetails.server && (
                    <TableRow>
                      <TableCell className="font-medium">Server</TableCell>
                      <TableCell className="font-mono text-sm">{requestDetails.server}</TableCell>
                    </TableRow>
                  )}
                  {requestDetails.contentType && (
                    <TableRow>
                      <TableCell className="font-medium">Content-Type</TableCell>
                      <TableCell className="font-mono text-sm">{requestDetails.contentType}</TableCell>
                    </TableRow>
                  )}
                  {Object.keys(requestDetails.responseHeaders).length > 0 && (
                    <TableRow>
                      <TableCell className="font-medium align-top">Response Headers</TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="space-y-1">
                          {Object.entries(requestDetails.responseHeaders).map(([key, value]) => (
                            <div key={key} className="break-all">
                              <span className="text-blue-600 dark:text-blue-400">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Client IP</TableCell>
                    <TableCell className="text-muted-foreground text-sm italic">Not available from browser</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-base">About CORS Errors</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              If you see a CORS error, it means the API server needs to include proper CORS headers like{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Access-Control-Allow-Origin</code>.
            </p>
            <p>This tool uses XMLHttpRequest to detect CORS issues that would affect browser-based applications.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
