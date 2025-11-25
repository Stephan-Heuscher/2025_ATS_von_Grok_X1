// diag_live_test.js — run against deployed API to capture full responses
(async ()=>{
  const base = process.env.API_BASEURL || 'https://agreeable-stone-0a4c73503.3.azurestaticapps.net/api'
  const id = Date.now().toString() + Math.floor(Math.random()*1000)
  const logRes = async (label, res) => {
    const text = await res.text().catch(()=>'<no-body>')
    console.log(label, res.status, res.statusText, '\nHEADERS:', JSON.stringify(Object.fromEntries(res.headers.entries())), '\nBODY:', text)
  }
  try {
    console.log('Using base', base, 'id', id)
    let res = await fetch(`${base}/issues`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, title: 'diag CI test', description: 'created' }) })
    await logRes('POST', res)
    res = await fetch(`${base}/issues/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'diag CI test updated', status: 'closed' }) })
    await logRes('PUT', res)
    res = await fetch(`${base}/issues/${id}`)
    await logRes('GET', res)
    res = await fetch(`${base}/issues/${id}`, { method: 'DELETE' })
    await logRes('DELETE', res)
    res = await fetch(`${base}/issues/${id}`)
    await logRes('GET2', res)
  } catch (err) {
    console.error('Error during diag', err)
    process.exit(1)
  }
})()
