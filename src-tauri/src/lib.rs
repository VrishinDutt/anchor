use serde::Serialize;
use serde_json::{json, Value};

#[derive(Debug, Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    instructions: &'a str,
    input: &'a str,
    max_output_tokens: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderStatus {
    provider: String,
    anthropic_key_present: bool,
    openai_key_present: bool,
    gemini_key_present: bool,
    tauri_runtime: bool,
    message: String,
}

#[tauri::command]
fn get_provider_status() -> ProviderStatus {
    let provider = env_config_value("ANCHOR_LLM_PROVIDER").unwrap_or_else(|| "not set".to_string());
    let normalized_provider = provider.to_lowercase();
    let anthropic_key_present = env_config_value("ANTHROPIC_API_KEY").is_some();
    let openai_key_present = env_config_value("OPENAI_API_KEY").is_some();
    let gemini_key_present = env_config_value("GEMINI_API_KEY").is_some();

    ProviderStatus {
        message: provider_status_message(
            &provider,
            &normalized_provider,
            anthropic_key_present,
            openai_key_present,
            gemini_key_present,
        ),
        provider,
        anthropic_key_present,
        openai_key_present,
        gemini_key_present,
        tauri_runtime: true,
    }
}

#[tauri::command]
async fn run_anchor_llm(
    system_instruction: String,
    user_prompt: String,
    permission: String,
) -> Result<String, String> {
    if permission == "blocked" {
        return Err("LLM call blocked by Anchor policy.".to_string());
    }

    let provider = std::env::var("ANCHOR_LLM_PROVIDER")
        .unwrap_or_else(|_| "claude".to_string())
        .to_lowercase();

    match provider.as_str() {
        "claude" | "anthropic" => run_claude(system_instruction, user_prompt).await,
        "openai" => run_openai(system_instruction, user_prompt).await,
        other => Err(format!(
            "Unsupported ANCHOR_LLM_PROVIDER '{other}'. Use 'claude' or 'openai'."
        )),
    }
}

async fn run_claude(system_instruction: String, user_prompt: String) -> Result<String, String> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| "ANTHROPIC_API_KEY is not set in the app environment.".to_string())?;

    let body = json!({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 700,
        "system": system_instruction,
        "messages": [
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    });

    let client = reqwest::Client::new();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Claude request failed before response: {error}"))?;

    let status = response.status();
    let raw_body = response
        .text()
        .await
        .map_err(|error| format!("Could not read Claude response body: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "Claude API error {status}\n\nRaw response body:\n{raw_body}"
        ));
    }

    let parsed: Value = serde_json::from_str(&raw_body).map_err(|error| {
        format!("Could not parse Claude response JSON: {error}. Raw body: {raw_body}")
    })?;

    extract_claude_text(&parsed).ok_or_else(|| {
        format!("Claude response succeeded but no text could be extracted. Raw body: {raw_body}")
    })
}

async fn run_openai(system_instruction: String, user_prompt: String) -> Result<String, String> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY is not set in the app environment.".to_string())?;

    let request = OpenAiRequest {
        model: "gpt-4.1-mini",
        instructions: &system_instruction,
        input: &user_prompt,
        max_output_tokens: 900,
    };

    let client = reqwest::Client::new();

    let response = client
        .post("https://api.openai.com/v1/responses")
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("OpenAI request failed before response: {error}"))?;

    let status = response.status();
    let raw_body = response
        .text()
        .await
        .map_err(|error| format!("Could not read OpenAI response body: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "OpenAI API error {status}\n\nRaw response body:\n{raw_body}"
        ));
    }

    let parsed: Value = serde_json::from_str(&raw_body).map_err(|error| {
        format!("Could not parse OpenAI response JSON: {error}. Raw body: {raw_body}")
    })?;

    if let Some(output_text) = parsed.get("output_text").and_then(Value::as_str) {
        if !output_text.trim().is_empty() {
            return Ok(output_text.to_string());
        }
    }

    if let Some(output) = parsed.get("output").and_then(Value::as_array) {
        let extracted = extract_openai_text_from_output(output);
        if !extracted.trim().is_empty() {
            return Ok(extracted);
        }
    }

    Err(format!(
        "OpenAI response succeeded but no text could be extracted. Raw body: {raw_body}"
    ))
}

fn env_config_value(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn provider_status_message(
    provider: &str,
    normalized_provider: &str,
    anthropic_key_present: bool,
    openai_key_present: bool,
    gemini_key_present: bool,
) -> String {
    match normalized_provider {
        "not set" => {
            if anthropic_key_present {
                "Provider is not set; Claude default has a local key.".to_string()
            } else {
                "Provider is not set; ANTHROPIC_API_KEY is missing.".to_string()
            }
        }
        "claude" | "anthropic" => {
            if anthropic_key_present {
                "Claude provider has a local key.".to_string()
            } else {
                "Claude provider is selected but ANTHROPIC_API_KEY is missing.".to_string()
            }
        }
        "openai" => {
            if openai_key_present {
                "OpenAI provider has a local key.".to_string()
            } else {
                "OpenAI provider is selected but OPENAI_API_KEY is missing.".to_string()
            }
        }
        "gemini" | "google" => {
            if gemini_key_present {
                "Gemini key is present, but Gemini is not wired in this build.".to_string()
            } else {
                "Gemini provider is selected but GEMINI_API_KEY is missing.".to_string()
            }
        }
        _ => format!("Provider '{provider}' is not supported by this build."),
    }
}

fn extract_claude_text(parsed: &Value) -> Option<String> {
    let mut texts: Vec<String> = Vec::new();

    let content = parsed.get("content")?.as_array()?;

    for block in content {
        let block_type = block.get("type").and_then(Value::as_str);
        if block_type == Some("text") {
            if let Some(text) = block.get("text").and_then(Value::as_str) {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    texts.push(trimmed.to_string());
                }
            }
        }
    }

    if texts.is_empty() {
        None
    } else {
        Some(texts.join("\n\n"))
    }
}

fn extract_openai_text_from_output(output: &[Value]) -> String {
    let mut texts: Vec<String> = Vec::new();

    for item in output {
        if let Some(content) = item.get("content").and_then(Value::as_array) {
            for part in content {
                push_text_if_present(&mut texts, part.get("text").and_then(Value::as_str));
            }
        }

        push_text_if_present(&mut texts, item.get("text").and_then(Value::as_str));
    }

    texts.join("\n\n")
}

fn push_text_if_present(texts: &mut Vec<String>, text: Option<&str>) {
    if let Some(text) = text {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            texts.push(trimmed.to_string());
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_provider_status,
            run_anchor_llm
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
