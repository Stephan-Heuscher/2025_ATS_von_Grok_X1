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

  // Update assignee using PUT (must include title per API)
  const assigneeRes = await fetch(`${baseUrl}/issues/${id}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, title: 'CI Test (updated)', assignee: 'Tech A' })
  })
  if (assigneeRes.status !== 200) exitFailure(`assignee PUT failed: ${assigneeRes.status}`)
  const assigneeUpdated = await assigneeRes.json()
  if (!assigneeUpdated || assigneeUpdated.assignee !== 'Tech A') exitFailure('PUT did not set assignee')
  console.log('Assignee update OK')

  // GET
  const getRes = await fetch(`${baseUrl}/issues/${id}`)
  if (getRes.status !== 200) exitFailure(`GET failed: ${getRes.status}`)
  const got = await getRes.json()
  if (!got || got.id !== id) exitFailure('GET returned wrong item')
  console.log('GET OK')

  // DELETE
  const delRes = await fetch(`${baseUrl}/issues/${id}`, { method: 'DELETE' })
  const delText = await delRes.text().catch(() => '')
  if (![200,204].includes(delRes.status)) exitFailure(`DELETE failed: ${delRes.status} - ${delText}`)
  console.log('DELETE OK')

  // comment flow testing
  // recreate a new item to test comments separately
  const id2 = `${Date.now()}${Math.floor(Math.random()*1000)}`
  const createRes2 = await fetch(`${baseUrl}/issues`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id2, title: 'CI Test 2', description: 'for comments' }) })
  if (createRes2.status !== 201) exitFailure(`POST for comments failed: ${createRes2.status}`)
  const created2 = await createRes2.json()
  // POST comment to issue
  const commentRes = await fetch(`${baseUrl}/issues/${id2}?action=comment`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ author: 'ci-runner', message: 'this is a comment' }) })
  if (commentRes.status !== 200) exitFailure(`comment POST failed: ${commentRes.status}`)
  const withComment = await commentRes.json()
  if (!withComment || !Array.isArray(withComment.comments) || withComment.comments.length < 1) exitFailure('Comment not recorded')
  console.log('Comment POST OK')

  // Ensure it's gone
  const getAgain = await fetch(`${baseUrl}/issues/${id}`)
  if (getAgain.status !== 404) exitFailure(`Item still present after delete: ${getAgain.status} - ${await getAgain.text().catch(()=>'')}`)
  console.log('Verification OK — item removed')

  console.log('All integration tests passed')
}

run().catch(err => {
  console.error('Integration test error', err)
  process.exit(1)
})
