const httpTrigger = async function (context: any, req: any): Promise<void> {
  try {
    const now = new Date().toISOString()
    context.res = {
      status: 200,
      body: { status: 'ok', time: now }
    }
  } catch (err: any) {
    context.res = { status: 500, body: { error: 'server error', detail: err?.message ?? String(err) } }
  }
}

export default httpTrigger
