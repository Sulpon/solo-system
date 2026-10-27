This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Finance (statement import)

`/finance` imports bank statements, categorises transactions with deterministic rules, and tracks income, spending, balances, budgets and required monthly payments. No AI service is involved; PDFs are parsed on the server with `unpdf`.

Setup, once per Supabase project:

1. Apply `supabase/migrations/20261027120000_finance.sql` (SQL editor, or `supabase db push`). It creates the `finance_*` tables with row-level security and a private `finance-statements` storage bucket. It is additive and safe to re-run.
2. Sign in to Atlas. Finance needs a signed-in Supabase user; it uses no extra environment variables and no service-role key.

Supported PDF formats: Revolut account statements (English and Russian exports) and Alatau City Bank card statements. Kaspi Bank, Freedom Bank, Halyk Bank and ForteBank are recognised but not parsed yet; import those as CSV.

The parsers can be checked against your own statements without committing them:

```bash
FINANCE_REAL_STATEMENTS_DIR=/path/to/pdfs npx vitest run real-statements
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
