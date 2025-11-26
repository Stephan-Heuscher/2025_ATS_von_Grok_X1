# Sleek Issue Tracking System

A modern, cost-optimized issue tracking system built on Azure.

## Project Structure

```
sleek-issue-tracker/
├── api/
│   ├── issues/
│   │   ├── function.json
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── badge.tsx
│   │   │   └── card.tsx
│   │   └── IssueCard.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   └── Dashboard.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .vscode/
│   └── extensions.json
├── index.html
├── main.bicep
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Infrastructure as Code

See `main.bicep` for the Bicep template to deploy Cosmos DB and Static Web App.

## Backend Code

The Azure Function in `api/issues/index.ts` handles GET and POST requests for issues, connecting to Cosmos DB.

## API (Issues)

The project includes a small Issues API (Azure Functions) that stores data in Cosmos DB. Here are the available endpoints and examples.

Base path: /api/issues

- GET /api/issues — list all issues (supports ?status=&limit=)
- GET /api/issues/{id} — fetch a single issue by id
 - POST /api/issues — create a new issue (body optionally contains id); server will add createdAt/updatedAt/status and initialize comments/history
 - POST /api/issues/{id}?action=comment — add a comment to an existing issue. Body: { author, message }
 - PUT /api/issues/{id} — update or upsert an issue (body must include at least title). Returns the updated document. PUT also supports changing assignee/status and will append change events to the issue's history.
- DELETE /api/issues/{id} — delete by id

Example: POST (curl)
```bash
curl -sS -X POST "https://<your-app>.azurestaticapps.net/api/issues" \
	-H "Content-Type: application/json" \
	-d '{"title":"New Issue","description":"Something broke"}'
```

Example: PUT / upsert (powershell)
```powershell
iwr -Uri "https://<your-app>.azurestaticapps.net/api/issues/12345" -Method PUT -ContentType 'application/json' -Body '{"title":"Updated title","status":"closed"}'
```

Example: Add a comment via POST
```bash
curl -X POST "https://<your-app>.azurestaticapps.net/api/issues/12345?action=comment" \
	-H "Content-Type: application/json" \
	-d '{"author":"tech_jane","message":"Investigating the spindle wobble."}'
```

Notes:
- The API supports a safe upsert flow using the Cosmos DB REST header `x-ms-documentdb-is-upsert` so POST/PUT operations with an existing id will be merged/updated rather than causing 409 conflicts.
- Environment configuration: Set `COSMOS_CONNECTION_STRING` (or `COSMOS_ACCOUNT_ENDPOINT` + `COSMOS_ACCOUNT_KEY`) and optionally `COSMOS_DB_NAME` and `COSMOS_CONTAINER_NAME` if you use different values.


## Frontend Code

The `IssueCard` component in `src/components/IssueCard.tsx` demonstrates the sleek design with Tailwind CSS and Shadcn/UI components.

New UI features added:
- Assignee: assign and change owner directly from the issue card (updates the server and records assignment in the issue history).
- Comments: add and view comments inline on each issue (server-side comments are stored on the document).
- Filters & Search: search title/description/assignee and filter by priority or assignee.
- Status history: status changes and assignment changes are recorded on the issue and visible in the activity history.
- Export: Export the currently-filtered issue list to CSV for reporting.

## Cost Analysis

This stack is the cheapest option because it leverages Azure's Free Tier for Static Web Apps and Cosmos DB (1000 RU/s + 25GB storage), and Consumption-based pricing for Functions, ensuring minimal operational costs for low-traffic applications.