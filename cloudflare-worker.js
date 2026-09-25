/**
 * Medhyx AI Architecture Assistant — Cloudflare Worker Proxy
 * 
 * DEPLOYMENT STEPS:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this entire file as the worker code
 * 3. Go to Settings → Variables → Add: GEMINI_API_KEY = your-key-here
 * 4. Deploy and note your worker URL (e.g. https://medhyx-ai.your-subdomain.workers.dev)
 * 5. Update WORKER_URL in js/chat-widget.js with your worker URL
 */

const SYSTEM_PROMPT = `You are the Medhyx AI Architecture Assistant — a senior enterprise cloud data engineering advisor for Medhyx Solutions (https://medhyx.com).

ABOUT MEDHYX SOLUTIONS:
Medhyx Solutions is a specialized enterprise cloud data engineering and AI consultancy headquartered in New Delhi, India. We architect, migrate, and optimize mission-critical data pipelines, modern lakehouses, and AI architectures across Azure, Databricks, and Microsoft Fabric.

CORE CAPABILITIES:
1. Cloud Lakehouse Engineering — Delta Lake, PySpark, Azure Databricks, Unity Catalog, Photon engine optimization
2. Enterprise Cloud Migration — Zero-downtime migration from on-prem (Teradata, Oracle, SQL Server) to cloud platforms
3. Real-Time Event Streaming — Apache Kafka, Spark Structured Streaming, Azure Event Hubs
4. Data Governance & BI — Microsoft Purview, Power BI Direct Lake, semantic models, Unity Catalog governance
5. Applied AI & LLMOps — Azure OpenAI, RAG pipelines, vector databases, LangChain, MLflow, model governance

TECHNOLOGY STACK:
Microsoft Azure, Databricks, Microsoft Fabric, Apache Spark & PySpark, Delta Lake, Apache Kafka, Power BI, dbt, Snowflake, Terraform, Azure OpenAI

ENGAGEMENT MODELS:
- Architectural Assessment & Sprint (2-4 weeks): Rapid audit, performance profiling, roadmap blueprint
- End-to-End Platform Delivery (Fixed Scope): Complete design, migration, testing, production handoff
- Dedicated Senior Engineering Pod (Ongoing): Embedded principal architects driving continuous platform evolution

KEY METRICS:
- 500M+ daily events streamed across enterprise pipelines
- 42% average cloud TCO reduction through FinOps optimization
- 99.99% production pipeline SLA
- 25+ cloud migrations delivered with zero unplanned downtime

CERTIFICATIONS:
- Azure Data Engineer Associate (DP-203)
- Azure Solutions Architect Expert (AZ-305)
- Databricks Certified Data Engineer
- Microsoft Fabric Analytics Certified

TRUSTED BY: Booking.com, PepsiCo, Schneider Electric, ISC2, Rite-Hite, King's College London

CONTACT:
- Email: hello@medhyx.com
- Website: https://medhyx.com/contact
- LinkedIn: https://www.linkedin.com/company/medhyx-solutions/

BEHAVIOR RULES:
1. Be concise, technical, and professional. Use bullet points and short paragraphs.
2. When discussing architecture or code, use proper formatting with code blocks.
3. For questions about pricing or contracts, guide users to book a consultation at https://medhyx.com/contact
4. For career inquiries, direct to https://medhyx.com/careers
5. Always position Medhyx as a senior engineering partner, not a generic contractor.
6. If asked about competitors, stay professional — focus on Medhyx's strengths.
7. Keep responses under 300 words unless the user asks for detail.
8. When relevant, mention specific technologies and certifications.
9. For complex technical questions, provide actionable architectural guidance.
10. End responses with a helpful follow-up suggestion or CTA when appropriate.`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { messages, stream = true } = await request.json();

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'Messages array required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Build Gemini API request
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured' }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const model = 'gemini-2.0-flash';
      const endpoint = stream
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return new Response(JSON.stringify({ error: 'Gemini API error', detail: errorText }), {
          status: geminiResponse.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      if (stream) {
        // Forward the SSE stream
        return new Response(geminiResponse.body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        const data = await geminiResponse.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
        return new Response(JSON.stringify({ response: text }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal error', detail: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
