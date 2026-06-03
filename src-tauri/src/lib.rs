use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    output_text: Option<String>,
}

#[derive(Debug, Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    instructions: &'a str,
    input: &'a str,
    max_output_tokens: u32,
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

    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY is not set in the app environment.".to_string())?;

    let request = OpenAiRequest {
        model: "gpt-5.2-mini",
        instructions: &system_instruction,
        input: &user_prompt,
        max_output_tokens: 700,
    };

    let client = reqwest::Client::new();

    let response = client
        .post("https://api.openai.com/v1/responses")
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("OpenAI request failed: {error}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Could not read OpenAI response: {error}"))?;

    if !status.is_success() {
        return Err(format!("OpenAI API error {status}: {body}"));
    }

    let parsed: OpenAiResponse = serde_json::from_str(&body)
        .map_err(|error| format!("Could not parse OpenAI response: {error}. Raw body: {body}"))?;

    parsed
        .output_text
        .ok_or_else(|| format!("OpenAI response did not include output_text. Raw body: {body}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![run_anchor_llm])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
