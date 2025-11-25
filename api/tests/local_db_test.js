const cosmos = require('../dist/lib/cosmosRest')

async function run() {
  try {
    console.log('Running local DB test using COSMOS_CONNECTION_STRING from env')
    const id = `local-${Date.now()}${Math.floor(Math.random()*1000)}`
    console.log('Creating doc id=', id)
    const created = await cosmos.createIssue({ id, title: 'Local DB Test', description: 'test' })
    console.log('Created:', { id: created.id, _rid: created._rid, _self: created._self })

    console.log('Attempting delete via deleteIssueById')
    const deleted = await cosmos.deleteIssueById(id)
    console.log('Delete response:', deleted)

    const found = await cosmos.getIssueById(id)
    console.log('After delete, get returns:', found)
  } catch (err) {
    console.error('Error during local DB test:', err && err.message ? err.message : String(err))
    if (err && err.stack) console.error(err.stack)
    process.exitCode = 1
  }
}

run()
