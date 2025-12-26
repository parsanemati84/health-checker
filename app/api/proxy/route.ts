import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url, method, headers, body } = await request.json()

    const startTime = Date.now()

    const response = await fetch(url, {
      method: method || "GET",
      headers: headers || {},
      body: body ? body : undefined,
    })

    const endTime = Date.now()
    const responseTime = endTime - startTime

    const responseText = await response.text()

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      responseTime,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch",
        status: 500,
        statusText: "Proxy Error",
      },
      { status: 500 },
    )
  }
}
