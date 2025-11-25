// Simple node-based API integration test runner. Uses global fetch (node 18+).
const baseUrl = process.env.API_BASEURL || 'https://agreeable-stone-0a4c73503.3.azurestaticapps.net/api'

function exitFailure(msg) {
  console.error(msg)
  process.exit(1)
}

async function run() {
  console.log('API base:', baseUrl)

  // Create
  const id = `${Date.now()}${Math.floor(Math.random()*1000)}`
  const createRes = await fetch(`${baseUrl}/issues`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, title: 'CI Test', description: 'Created by integration.test' })
  })
  if (createRes.status !== 201) exitFailure(`POST failed: ${createRes.status}`)
  const created = await createRes.json()
  if (!created || created.id !== id) exitFailure('POST returned unexpected body')
  console.log('Created OK', created.id)

  // Update via PUT (upsert)
  const putRes = await fetch(`${baseUrl}/issues/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'CI Test (updated)', status: 'closed' })
  })
  if (putRes.status !== 200) exitFailure(`PUT failed: ${putRes.status}`)
  const updated = await putRes.json()
  if (!updated || updated.status !== 'closed') exitFailure('PUT did not set status closed')
  console.log('PUT OK')

  // GET
  const getRes = await fetch(`${baseUrl}/issues/${id}`)
  if (getRes.status !== 200) exitFailure(`GET failed: ${getRes.status}`)
  const got = await getRes.json()
  if (!got || got.id !== id) exitFailure('GET returned wrong item')
  console.log('GET OK')

  // DELETE
  const delRes = await fetch(`${baseUrl}/issues/${id}`, { method: 'DELETE' })
  if (![200,204].includes(delRes.status)) exitFailure(`DELETE failed: ${delRes.status}`)
  console.log('DELETE OK')

  // Ensure it's gone
  const getAgain = await fetch(`${baseUrl}/issues/${id}`)
  if (getAgain.status !== 404) exitFailure(`Item still present after delete: ${getAgain.status}`)
  console.log('Verification OK — item removed')

  console.log('All integration tests passed')
}

run().catch(err => {
  console.error('Integration test error', err)
  process.exit(1)
})
