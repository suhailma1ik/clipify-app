use serde::{Deserialize, Serialize};
use std::env;

// Environment configuration
#[derive(Debug, Clone)]
pub struct EnvironmentConfig {
    pub environment: String,
    pub api_base_url: String,
    pub oauth_base_url: String,
    pub dev_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RephraseRequest {
    pub text: String,
    pub style: String,
    pub context: String,
    pub target_audience: String,
    pub preserve_length: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RephraseResponse {
    pub processing_time_ms: Option<u64>,
    pub rephrased_text: String,
}

impl EnvironmentConfig {
    pub fn from_env() -> Self {
        let environment = env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string());

        let (api_base_url, oauth_base_url, dev_url) = if environment == "production" {
            (
                env::var("VITE_PROD_API_BASE_URL")
                    .unwrap_or_else(|_| "https://clipify0.el.r.appspot.com".to_string()),
                env::var("VITE_PROD_OAUTH_BASE_URL").unwrap_or_else(|_| {
                    "https://clipify0.el.r.appspot.com/api/v1/auth/google/login".to_string()
                }),
                env::var("VITE_PROD_BASE_URL")
                    .unwrap_or_else(|_| "https://clipify0.el.r.appspot.com/".to_string()),
            )
        } else {
            (
                env::var("VITE_DEV_API_BASE_URL")
                    .unwrap_or_else(|_| "https://clipify0.el.r.appspot.com".to_string()),
                env::var("VITE_DEV_OAUTH_BASE_URL").unwrap_or_else(|_| {
                    "https://clipify0.el.r.appspot.com/api/v1/auth/google/login".to_string()
                }),
                env::var("VITE_DEV_BASE_URL")
                    .unwrap_or_else(|_| "http://localhost:1420".to_string()),
            )
        };

        EnvironmentConfig {
            environment,
            api_base_url,
            oauth_base_url,
            dev_url,
        }
    }
}
