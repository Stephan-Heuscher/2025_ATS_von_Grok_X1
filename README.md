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

## Frontend Code

The `IssueCard` component in `src/components/IssueCard.tsx` demonstrates the sleek design with Tailwind CSS and Shadcn/UI components.

## Cost Analysis

This stack is the cheapest option because it leverages Azure's Free Tier for Static Web Apps and Cosmos DB (1000 RU/s + 25GB storage), and Consumption-based pricing for Functions, ensuring minimal operational costs for low-traffic applications.