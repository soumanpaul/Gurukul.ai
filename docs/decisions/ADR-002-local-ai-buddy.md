# ADR-002: Explicit local general-chat mode

Date: 2026-10-06. Status: accepted user-authorized extension; quality acceptance remains evidence-dependent.

AI Buddy is a separate tab after Home, using the installed pinned GGUF through llama.rn on the phone. Reuse verified-file loading, tokenizer, context and native work lease, with separate `buddy-v1` general-conversation policy and `{answer}` schema. Notebook Study remains lexical/source-exact/citation-validated; its prohibition on model-memory fallback is unchanged. No cloud/laptop fallback, new model, dependency or service.

General replies are explicitly not based on notes or verified citations. Render structurally validated plain text only, never execute output or use it to write SQL/grade quizzes. Small-model chat is not ChatGPT-equivalent; important claims need verification.

Migration 9 adds `buddy_chats` and `buddy_turns` without modifying existing tables. Store question, validated answer, terminal status, model/revision/hash/runtime, prompt version, token count and omitted-context count. Atomic start/finish and a unique active-turn index protect persistence. Recovery marks unfinished Buddy replies interrupted. Confirmed deletion cascades only the chosen chat; no notebook references or implicit source access.

Context consists of fixed system policy, newest contiguous completed conversation pairs that fit the actual 1,450-token budget, then the current message; 400 output + 198 reserve fit the existing 2,048-token context. Failed/interrupted turns and other chats are excluded. Older turns remain saved. Backgrounding, Stop and a 60-second generation timer request cancellation; discard late output and release the native lease. Logout/storage guards account for Buddy work.

Manage Buddy history in its own modal; notebook deletion does not delete chats. English text only initially, no implicit voice/image/web capabilities. Host tests cannot prove inference or fluent review; physical conversation and offline/network gates require separately recorded evidence.
