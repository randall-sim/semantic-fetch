# 🧠 Semantic API Wrapper

A next-generation AI API wrapper that converts strict backend endpoints into a resilient, Natural Language API. 

By placing an LLM-powered Rust agent between your frontend and backend, frontend developers can request data using natural language (`"Get the 10 latest tasks"`), while the backend remains a standard, highly-optimized REST API.

**Key Benefits:**
* **No More Breaking Changes:** Backend API updates no longer break frontend clients. The LLM bridges the semantic gap and routes requests to the updated endpoints.
* **Rapid Frontend Development:** Request exactly the data you need in natural language.
* **End-to-End Type Safety:** Includes a TypeScript CLI that analyzes your natural language queries at build-time and generates strict TypeScript interfaces for your IDE.

---

## 🏗️ Architecture

This repository is a polyglot monorepo containing three main components:

1. **The Target (`apps/backend`):** A standard, highly-optimized REST API written in Go. It represents the "legacy" or standard backend (e.g., a Task Tracker). It is completely unaware of the AI layer.
2. **The Brain (`services/agent`):** A high-performance proxy server written in Rust. It intercepts natural language requests, uses Anthropic's Claude to map the request to the exact Go endpoint/payload, and forwards the HTTP request.
3. **The Interface (`packages/client`):** A TypeScript SDK and CLI. The CLI scans the frontend code for natural language queries, pings the Rust agent to resolve their schemas, and generates local `.d.ts` files for instant IDE autocomplete.

---

## 📂 Repository Structure

```text
nl-api-wrapper/
├── apps/
│   ├── backend-go/         # The Example Go Task Tracker API
│   └── frontend/           # Example Next.js app using the TS client
├── services/
│   └── agent/         # The Core AI Proxy & Schema Generator
└── packages/
    └── client/          # The Frontend TypeScript Library & CLI